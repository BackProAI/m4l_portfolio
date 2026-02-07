import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// Claude API Client - Handles communication with Anthropic API
// ============================================================================

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface AnalysePortfolioParams {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AnalysePortfolioResult {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  model?: string;
}

/**
 * Analyses portfolio using Claude Sonnet 4.5
 */
export async function analysePortfolio({
  systemPrompt,
  userPrompt,
  maxTokens = 8000,
  temperature = 0.3,
}: AnalysePortfolioParams): Promise<AnalysePortfolioResult> {
  try {
    // Validate API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        success: false,
        error: 'Anthropic API key not configured',
      };
    }

    // Call Claude API
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract text content from response
    const textContent = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n');

    if (!textContent) {
      return {
        success: false,
        error: 'No text content in Claude response',
      };
    }

    return {
      success: true,
      content: textContent,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      model: response.model,
    };
  } catch (error: any) {
    console.error('Claude API error:', error);

    // Handle specific error types
    if (error.status === 401) {
      return {
        success: false,
        error: 'Invalid Anthropic API key',
      };
    }

    if (error.status === 429) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please try again in a few moments.',
      };
    }

    if (error.status === 529) {
      return {
        success: false,
        error: 'Anthropic API is temporarily overloaded. Please try again.',
      };
    }

    // Generic error
    return {
      success: false,
      error: error.message || 'Failed to analyse portfolio with Claude API',
    };
  }
}

/**
 * Test API connection
 */
export async function testClaudeConnection(): Promise<boolean> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return false;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: 'Reply with just "OK"',
        },
      ],
    });

    return response.content.length > 0;
  } catch (error) {
    console.error('Claude connection test failed:', error);
    return false;
  }
}
