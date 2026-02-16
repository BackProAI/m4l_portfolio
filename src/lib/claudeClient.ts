import Anthropic from '@anthropic-ai/sdk';
import { executeSearchTool, SEARCH_TOOLS } from './webSearchTool';

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
 * Analyses portfolio using Claude Sonnet 4.5 with tool use support
 * Allows Claude to call web search tools to fetch company/fund descriptions
 */
export async function analysePortfolioWithTools({
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

    // Initialize message history
    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    let response: Anthropic.Message;
    let iterationCount = 0;
    const maxIterations = 20; // Prevent infinite loops
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Tool use loop - continue until Claude provides final answer
    while (iterationCount < maxIterations) {
      iterationCount++;

      // Call Claude API with tools
      response = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages,
        tools: SEARCH_TOOLS as any, // Cast to any for compatibility
      });

      // Track token usage
      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Check stop reason
      if (response.stop_reason === 'end_turn') {
        // Claude finished - extract text content
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
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
          },
          model: response.model,
        };
      }

      if (response.stop_reason === 'tool_use') {
        // Claude wants to use tools - extract tool requests
        const toolUseBlocks = response.content.filter(
          (block) => block.type === 'tool_use'
        ) as Anthropic.ToolUseBlock[];

        if (toolUseBlocks.length === 0) {
          return {
            success: false,
            error: 'Claude requested tool use but no tool blocks found',
          };
        }

        // Add Claude's response to message history
        messages.push({
          role: 'assistant',
          content: response.content,
        });

        // Execute all requested tools
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        
        for (const toolUse of toolUseBlocks) {
          console.log(`Executing tool: ${toolUse.name} with input:`, toolUse.input);
          
          const result = await executeSearchTool(
            toolUse.name,
            toolUse.input as Record<string, any>
          );
          
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          });
        }

        // Add tool results to message history
        messages.push({
          role: 'user',
          content: toolResults,
        });

        // Continue loop to get Claude's next response
        continue;
      }

      // Unexpected stop reason
      return {
        success: false,
        error: `Unexpected stop reason: ${response.stop_reason}`,
      };
    }

    // Max iterations reached
    return {
      success: false,
      error: `Max iterations (${maxIterations}) reached. Claude may be stuck in a loop.`,
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
