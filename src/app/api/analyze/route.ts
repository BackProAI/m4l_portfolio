import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { analysePortfolio } from '@/lib/claudeClient';
import { buildAnalysisPrompt, combineDocumentContents } from '@/lib/promptBuilder';
import type { InvestorProfile, FileType } from '@/types';

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
    valueForMoney: z.boolean(),
  }),
  files: z.array(
    z.object({
      fileName: z.string(),
      content: z.string(),
      type: z.enum(['pdf', 'docx', 'xlsx', 'xls']),
    })
  ).min(1, 'At least one file is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = AnalyseRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { profile, files } = validationResult.data;

    // Check API key configuration
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'API configuration error. Please contact support.',
        },
        { status: 500 }
      );
    }

    // Combine document contents
    const documentContent = combineDocumentContents(files);

    // Build Claude prompt
    const { system, user } = buildAnalysisPrompt(profile, documentContent);

    // Get token limits from environment or use defaults
    const maxTokens = process.env.CLAUDE_MAX_TOKENS
      ? parseInt(process.env.CLAUDE_MAX_TOKENS, 10)
      : 8000;

    const temperature = process.env.CLAUDE_TEMPERATURE
      ? parseFloat(process.env.CLAUDE_TEMPERATURE)
      : 0.3;

    // Call Claude API
    const result = await analysePortfolio({
      systemPrompt: system,
      userPrompt: user,
      maxTokens,
      temperature,
    });

    // Handle Claude API failure
    if (!result.success) {
      console.error('Claude API call failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to analyse portfolio',
        },
        { status: 500 }
      );
    }

    // Parse JSON response from Claude
    let analysisData;
    try {
      // Claude should return pure JSON, but let's handle potential markdown wrapping
      let jsonStr = result.content || '';
      
      // Remove markdown code blocks if present
      jsonStr = jsonStr.replace(/^```json\n?/i, '').replace(/\n?```$/,  '').trim();
      
      analysisData = JSON.parse(jsonStr);
      
      // Validate structure
      if (!analysisData.markdown || !analysisData.chartData) {
        throw new Error('Invalid response structure from Claude');
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse analysis results. Please try again.',
        },
        { status: 500 }
      );
    }

    // Return successful analysis
    return NextResponse.json({
      success: true,
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
  } catch (error: any) {
    console.error('Analyse API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred during analysis',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST.',
    },
    { status: 405 }
  );
}
