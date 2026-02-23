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
      type: z.enum(['pdf', 'docx', 'xlsx', 'xls']),
      // Optional fields for scanned PDF OCR support
      isScanned: z.boolean().optional(),
      base64Data: z.string().optional(),
    })
  ).min(1, 'At least one file is required'),
});

export async function POST(request: NextRequest) {
  // Parse and validate request body
  let profile: z.infer<typeof AnalyseRequestSchema>['profile'];
  let files: z.infer<typeof AnalyseRequestSchema>['files'];

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
  const { system, user } = buildAnalysisPrompt(profile, documentContent);
  const maxTokens = process.env.CLAUDE_MAX_TOKENS ? parseInt(process.env.CLAUDE_MAX_TOKENS, 10) : 16000;
  const temperature = process.env.CLAUDE_TEMPERATURE ? parseFloat(process.env.CLAUDE_TEMPERATURE) : 0.3;

  // Return a Server-Sent Events stream
  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: object) => {
        const str = `data: ${JSON.stringify(data)}\n\n`;
        const bytes = new TextEncoder().encode(str);
        console.log('[API] 📝 ENCODE: Enqueueing data:', {
          dataType: (data as any).type,
          byteLength: bytes.length,
          controllerClosed: isClosed,
          timestamp: Date.now()
        });
        controller.enqueue(bytes);
        console.log('[API] ✓ ENQUEUED: Data added to controller queue');
      };

      let isClosed = false;
      const closeController = () => {
        if (!isClosed) {
          console.log('[API] 🔐 CLOSE CONTROLLER: Attempting to close stream...');
          controller.close();
          isClosed = true;
          console.log('[API] ✅ CONTROLLER CLOSED: Stream is now closed');
        } else {
          console.warn('[API] ⚠️ CLOSE CALLED ON ALREADY CLOSED CONTROLLER');
        }
      };

      try {
        console.log('[API] 🚀 STREAM START:', {
          timestamp: Date.now(),
          profileType: profile.investorType,
          fileCount: files.length
        });
        
        // Emit initial progress
        encode({ type: 'progress', step: 0, total: 10, label: 'Starting analysis...' });

        const result = await analysePortfolioWithTools({
          systemPrompt: system,
          userPrompt: user,
          maxTokens,
          temperature,
          includeRiskSummary: profile.includeRiskSummary === true,
          scannedPDFs: scannedPDFs.map(f => ({
            fileName: f.fileName,
            base64Data: f.base64Data!,
          })),
          onProgress(step, total, label) {
            encode({ type: 'progress', step, total, label });
          },
        });

        if (!result.success) {
          console.error('[API] ❌ Claude analysis failed:', result.error);
          encode({ type: 'error', error: result.error || 'Failed to analyse portfolio' });
          console.log('[API] ⏳ ERROR PATH: Waiting 500ms before close...');
          await new Promise(resolve => setTimeout(resolve, 500));
          closeController();
          return;
        }

        // Parse Claude's JSON response
        let analysisData;
        try {
          let jsonStr = result.content || '';
          
          // Extract JSON from between markdown code fences if present
          const jsonMatch = jsonStr.match(/```json\s*\n([\s\S]*?)\n```/i);
          if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
          } else {
            // Fallback: just strip the fences if no match (old behavior)
            jsonStr = jsonStr.replace(/^```json\n?/i, '').replace(/\n?```$/, '').trim();
          }
          
          // Log the raw response for debugging
          console.log('[API] Response size:', jsonStr.length, 'characters');
          console.log('[API] Response preview (first 200 chars):', jsonStr.substring(0, 200));
          console.log('[API] Response preview (last 200 chars):', jsonStr.substring(Math.max(0, jsonStr.length - 200)));
          
          if (jsonStr.length > 100000) {
            console.warn('[API] Very large response:', jsonStr.length, 'characters');
          }
          
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
          
          console.log('[API] Successfully parsed response:', {
            markdownLength: analysisData.markdown?.length,
            chartDataKeys: Object.keys(analysisData.chartData || {}),
            hasHoldings: !!analysisData.chartData?.holdingsPerformance,
            hasRiskSummary: !!analysisData.chartData?.portfolioRisk
          });
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
            // Check if we hit max tokens (fix TypeScript error with nullish coalescing)
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
          
          console.log('[API] ⚠️ PARSE ERROR PATH: Closing immediately (NO DELAY)');
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
        
        const resultJson = JSON.stringify(resultData);
        console.log('[API] 📤 BEFORE ENCODE: Preparing to send result:', {
          timestamp: Date.now(),
          resultSize: resultJson.length,
          resultSizeKB: (resultJson.length / 1024).toFixed(2),
          controllerClosed: isClosed,
        });
        
        encode(resultData);
        
        console.log('[API] ✅ AFTER ENCODE: Data enqueued to stream:', {
          timestamp: Date.now(),
          controllerClosed: isClosed,
          message: 'Data written to controller queue, waiting for flush...'
        });
        
        // Wait for buffer to flush before closing stream (prevents truncation)
        console.log('[API] ⏳ FLUSH DELAY START: Waiting 500ms for buffers to flush...');
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('[API] ⏳ FLUSH DELAY END: 500ms elapsed, closing stream now');
        
        closeController();
        console.log('[API] 🔒 STREAM CLOSED:', {
          timestamp: Date.now(),
          controllerClosed: isClosed
        });
      } catch (err: any) {
        console.error('[API] 💥 UNEXPECTED ERROR in stream handler:', err);
        encode({ type: 'error', error: err.message || 'An unexpected error occurred' });
        console.log('[API] ⚠️ UNEXPECTED ERROR PATH: Closing immediately (NO DELAY)');
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
