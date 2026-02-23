import { NextRequest } from 'next/server';
import { z } from 'zod';
import { analysePortfolioWithTools } from '@/lib/claudeClient';
import { buildAnalysisPrompt, combineDocumentContents } from '@/lib/promptBuilder';
import type { InvestorProfile, FileType } from '@/types';

// Tell Vercel to allow up to 300 seconds (max on Pro/Enterprise) for this route
export const maxDuration = 300;

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
        controller.enqueue(new TextEncoder().encode(str));
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
          scannedPDFs: scannedPDFs.map(f => ({
            fileName: f.fileName,
            base64Data: f.base64Data!,
          })),
          onProgress(step, total, label) {
            encode({ type: 'progress', step, total, label });
          },
        });

        if (!result.success) {
          encode({ type: 'error', error: result.error || 'Failed to analyse portfolio' });
          closeController();
          return;
        }

        // Parse Claude's JSON response
        let analysisData;
        try {
          let jsonStr = result.content || '';
          jsonStr = jsonStr.replace(/^```json\n?/i, '').replace(/\n?```$/, '').trim();
          
          // Log the raw response for debugging truncation issues
          if (jsonStr.length > 100000) {
            console.warn('Very large response:', jsonStr.length, 'characters');
          }
          
          analysisData = JSON.parse(jsonStr);
          
          // Check if Claude returned an error response
          if (analysisData.error) {
            encode({ type: 'error', error: analysisData.error });
            closeController();
            return;
          }
          
          if (!analysisData.markdown || !analysisData.chartData) {
            throw new Error('Invalid response structure - missing markdown or chartData');
          }
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
          console.error('Response length:', result.content?.length || 0, 'characters');
          console.error('First 500 chars:', result.content?.substring(0, 500));
          console.error('Last 500 chars:', result.content?.substring((result.content?.length || 0) - 500));
          
          let errorMsg = 'Failed to parse analysis results. ';
          if (parseError instanceof SyntaxError) {
            errorMsg += 'The response may have been truncated. Please try again.';
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
        encode({
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
        });
      } catch (err: any) {
        encode({ type: 'error', error: err.message || 'An unexpected error occurred' });
      } finally {
        closeController();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
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
