import { NextRequest } from 'next/server';
import { z } from 'zod';
import { analysePortfolioWithTools } from '@/lib/claudeClient';
import { buildAnalysisPrompt, combineDocumentContents } from '@/lib/promptBuilder';
import type { InvestorProfile, FileType } from '@/types';

// Tell Vercel to allow up to 300 seconds (max on Pro/Enterprise) for this route
export const maxDuration = 300;
// Force dynamic rendering to enable proper SSE streaming (required for ReadableStream)
export const dynamic = 'force-dynamic';

// ============================================================================
// API Route: /api/analyze - Portfolio Analysis Endpoint
// ============================================================================

// Validation schema
const AnalyseRequestSchema = z.object({
  profile: z.object({
    name: z.string().min(1, 'Name is required'),
    investorType: z.enum(['High Growth', 'Growth', 'Balanced', 'Conservative', 'Defensive']),
    phase: z.enum(['Accumulation', 'Investment', 'Non-super', 'Pension']),
    ageRange: z.enum(['Under 40', '40-60', '60-80', '80+']),
    fundCommentary: z.boolean(),
    includeRiskSummary: z.boolean(),
    isIndustrySuperFund: z.boolean(),
    industrySuperFundName: z.string().optional(),
    industrySuperFundRiskProfile: z.enum(['High Growth', 'Growth', 'Balanced', 'Conservative', 'Defensive', '']).optional(),
  }).refine(
    (data) => {
      // If industry super fund is true, name and risk profile are required
      if (data.isIndustrySuperFund) {
        return (
          data.industrySuperFundName &&
          data.industrySuperFundName.trim() !== '' &&
          data.industrySuperFundRiskProfile &&
          ['High Growth', 'Growth', 'Balanced', 'Conservative', 'Defensive'].includes(data.industrySuperFundRiskProfile)
        );
      }
      return true;
    },
    {
      message: 'Industry super fund name and risk profile are required when industry super fund is selected',
      path: ['industrySuperFundName'],
    }
  ),
  files: z.array(
    z.object({
      fileName: z.string(),
      content: z.string(),
      type: z.enum(['pdf', 'docx', 'xlsx', 'xls', 'csv']),
      // Optional fields for scanned PDF OCR support
      isScanned: z.boolean().optional(),
      base64Data: z.string().optional(),
    })
  ).min(1, 'At least one file is required'),
  // Optional precomputed returns from /api/fetch-returns
  precomputedReturns: z.array(
    z.object({
      holdingName: z.string(),
      totalReturn: z.number().optional(),
      timeframe: z.string().optional(),
      ticker: z.string().optional(),
    })
  ).optional(),
});

export async function POST(request: NextRequest) {
  // Parse and validate request body
  let profile: z.infer<typeof AnalyseRequestSchema>['profile'];
  let files: z.infer<typeof AnalyseRequestSchema>['files'];
  let precomputedReturns: z.infer<typeof AnalyseRequestSchema>['precomputedReturns'];

  try {
    const body = await request.json();
    const validationResult = AnalyseRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request data', details: validationResult.error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    profile = validationResult.data.profile;
    files = validationResult.data.files;
    precomputedReturns = validationResult.data.precomputedReturns;
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to parse request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: 'API configuration error. Please contact support.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Build prompt
  // For scanned PDFs, we'll pass them as document blocks to Claude
  const scannedPDFs = files.filter(f => f.isScanned && f.base64Data && f.type === 'pdf');
  const textFiles = files.filter(f => !f.isScanned || !f.base64Data);
  
  const documentContent = combineDocumentContents(textFiles);
  const { system, user } = buildAnalysisPrompt(profile, documentContent, precomputedReturns);
  const maxTokens = process.env.CLAUDE_MAX_TOKENS ? parseInt(process.env.CLAUDE_MAX_TOKENS, 10) : 16000;
  const temperature = process.env.CLAUDE_TEMPERATURE ? parseFloat(process.env.CLAUDE_TEMPERATURE) : 0.3;

  // Log if using precomputed returns
  if (precomputedReturns && precomputedReturns.length > 0) {
    console.log(`[API] Using ${precomputedReturns.length} precomputed returns (2-call flow)`);
  }

  // Return a Server-Sent Events stream
  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: object) => {
        const str = `data: ${JSON.stringify(data)}\n\n`;
        const bytes = new TextEncoder().encode(str);
        controller.enqueue(bytes);
      };

      let isClosed = false;
      const closeController = () => {
        if (!isClosed) {
          controller.close();
          isClosed = true;
        }
      };

      try {
        // Emit initial progress
        encode({ type: 'progress', step: 0, total: 10, label: 'Starting analysis...' });

        const result = await analysePortfolioWithTools({
          systemPrompt: system,
          userPrompt: user,
          maxTokens,
          temperature,
          includeRiskSummary: profile.includeRiskSummary === true,
          hasPrecomputedReturns: !!(precomputedReturns && precomputedReturns.length > 0),
          scannedPDFs: scannedPDFs.map(f => ({
            fileName: f.fileName,
            base64Data: f.base64Data!,
          })),
          onProgress(step, total, label) {
            encode({ type: 'progress', step, total, label });
          },
        });

        if (!result.success) {
          console.error('[API] Claude analysis failed:', result.error);
          
          // Special handling for TOO_MANY_HOLDINGS error - pass toolsToExecute to frontend
          if (result.error === 'TOO_MANY_HOLDINGS' && result.toolsToExecute) {
            console.log(`[API] Detected large portfolio: ${result.toolsToExecute.length} holdings need returns`);
            encode({ 
              type: 'error', 
              error: 'TOO_MANY_HOLDINGS',
              toolsToExecute: result.toolsToExecute,
              message: `Large portfolio detected (${result.toolsToExecute.length} holdings without returns). Switching to optimized 2-step analysis...`
            });
          } else {
            encode({ type: 'error', error: result.error || 'Failed to analyse portfolio' });
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
          closeController();
          return;
        }

        // Parse Claude's JSON response
        let analysisData;
        try {
          let jsonStr = result.content || '';
          
          // Remove any text before the first { and after the last }
          const firstBrace = jsonStr.indexOf('{');
          const lastBrace = jsonStr.lastIndexOf('}');
          
          if (firstBrace === -1 || lastBrace === -1) {
            // Log Claude's actual response for debugging
            console.error('[API] Claude returned non-JSON response:', {
              contentLength: jsonStr.length,
              contentPreview: jsonStr.substring(0, 500),
              model: result.model,
              usage: result.usage
            });
            
            // Check if Claude returned a plain text error/explanation
            if (jsonStr.toLowerCase().includes('cannot') || 
                jsonStr.toLowerCase().includes('unable') || 
                jsonStr.toLowerCase().includes('error') ||
                jsonStr.toLowerCase().includes('sorry')) {
              throw new Error(`Analysis failed: ${jsonStr.substring(0, 300).trim()}...`);
            }
            
            throw new Error('No JSON object found in response. The portfolio data may be empty, unreadable, or in an unsupported format. Please ensure your file contains a clear portfolio holdings table.');
          }
          
          // Extract only the JSON portion
          jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
          
          console.log('[API] Response size:', jsonStr.length, 'characters');

          analysisData = JSON.parse(jsonStr);
          
          // Check if Claude returned an error response
          if (analysisData.error) {
            console.error('[API] Claude returned error in response:', analysisData.error);
            encode({ type: 'error', error: analysisData.error });
            await new Promise(resolve => setTimeout(resolve, 500));
            closeController();
            return;
          }
          
          if (!analysisData.markdown || !analysisData.chartData) {
            console.error('[API] Invalid response structure:', {
              hasMarkdown: !!analysisData.markdown,
              hasChartData: !!analysisData.chartData,
              keys: Object.keys(analysisData)
            });
            throw new Error('Invalid response structure - missing markdown or chartData');
          }
          
          // Debug: Check holdings for missing returns
          if (analysisData.chartData?.holdingsPerformance) {
            const holdingsWithoutReturns = analysisData.chartData.holdingsPerformance.filter(
              (h: any) => h.totalReturnForTimeframe === undefined && (!h.performance || h.performance.length === 0)
            );
            if (holdingsWithoutReturns.length > 0) {
              console.log('[API] ⚠️ Holdings WITHOUT return data:', holdingsWithoutReturns.map((h: any) => ({
                name: h.name,
                type: h.type,
                ticker: h.ticker,
                hasTimeframe: !!h.performanceTimeframe
              })));
            }
          }
        } catch (parseError) {
          console.error('[API] Failed to parse response:', parseError);
          console.error('[API] Response length:', result.content?.length || 0, 'characters');
          console.error('[API] Model used:', result.model);
          console.error('[API] Token usage:', result.usage);
          console.error('[API] First 500 chars:', result.content?.substring(0, 500));
          console.error('[API] Last 500 chars:', result.content?.substring((result.content?.length || 0) - 500));
          
          let errorMsg = 'Failed to parse analysis results. ';
          if (parseError instanceof SyntaxError) {
            errorMsg += `Response appears truncated (${result.content?.length || 0} chars). `;
            if ((result.usage?.outputTokens ?? 0) >= (maxTokens * 0.95)) {
              errorMsg += 'The analysis was too long and was cut off. Please try with a smaller portfolio or disable risk summary. ';
            } else {
              errorMsg += 'This may be a network issue. Please try again. ';
            }
          } else if (parseError instanceof Error) {
            errorMsg += parseError.message;
          } else {
            errorMsg += 'Please try again.';
          }
          
          encode({ type: 'error', error: errorMsg });
          closeController();
          return;
        }

        // Emit the final result
        const resultData = {
          type: 'result',
          data: {
            analysis: analysisData,
            metadata: {
              analysedAt: new Date().toISOString(),
              model: result.model,
              usage: result.usage,
              investorProfile: {
                type: profile.investorType,
                phase: profile.phase,
                ageRange: profile.ageRange,
              },
            },
          },
        };
        
        encode(resultData);
        
        // Wait for buffer to flush before closing stream (prevents truncation)
        await new Promise(resolve => setTimeout(resolve, 500));
        closeController();
      } catch (err: any) {
        console.error('[API] Unexpected error:', err);
        encode({ type: 'error', error: err.message || 'An unexpected error occurred' });
        closeController();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Content-Encoding': 'none', // Prevent gzip buffering in Next.js (see: github.com/vercel/next.js/discussions/48427)
    },
  });
}

// Handle unsupported methods
export async function GET() {
  return new Response(
    JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
}
