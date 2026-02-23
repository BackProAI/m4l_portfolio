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
  /** Called after each completed step (tool call or final answer). step is 1-based, total is the ceiling. */
  onProgress?: (step: number, total: number, label: string) => void;
  /** Whether the user requested a Portfolio Risk Summary — affects the progress curve. */
  includeRiskSummary?: boolean;
  /** Scanned PDFs to send as document blocks (uses Claude's native PDF support with OCR) */
  scannedPDFs?: Array<{
    fileName: string;
    base64Data: string;
  }>;
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
      model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
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
  onProgress,
  includeRiskSummary = false,
  scannedPDFs = [],
}: AnalysePortfolioParams): Promise<AnalysePortfolioResult> {
  try {
    // Validate API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        success: false,
        error: 'Anthropic API key not configured',
      };
    }

    // Build user message content
    // For scanned PDFs, use document blocks; otherwise use text
    const userContent: Anthropic.MessageParam['content'] = [];
    
    // Add text content if present
    if (userPrompt.trim()) {
      userContent.push({
        type: 'text',
        text: userPrompt,
      });
    }
    
    // Add scanned PDFs as document blocks (uses Claude's native PDF + OCR support)
    if (scannedPDFs.length > 0) {
      for (const pdf of scannedPDFs) {
        userContent.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: pdf.base64Data,
          },
        } as Anthropic.DocumentBlockParam);
      }
    }

    // Initialize message history
    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: userContent.length === 1 && typeof userContent[0] === 'object' && 'text' in userContent[0]
          ? userContent[0].text  // Single text block - use string format
          : userContent,          // Multiple blocks or documents - use array format
      },
    ];

    let response: Anthropic.Message;
    let iterationCount = 0;
    const maxIterations = 100; // Increased limit - tools are now instant static lookups (no web search delay)
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    // Track individual tool executions for smooth progress
    let toolsExecutedCount = 0;
    // With risk summary: many more tool calls so use wider buffer and higher cap (original working values)
    // Without risk summary: fewer calls so reach ceiling faster with a lower cap
    const PROGRESS_BUFFER = includeRiskSummary ? 4 : 1;
    const PROGRESS_CAP = includeRiskSummary ? 90 : 75;

    // Tool use loop - continue until Claude provides final answer
    while (iterationCount < maxIterations) {
      iterationCount++;

      // Call Claude API with tools
      response = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
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
      if (response.stop_reason === 'end_turn' || response.stop_reason === 'max_tokens') {
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

        // Report 100% completion
        onProgress?.(1, 1, 'Finalising analysis...');

        // Log warning if hit max tokens (response may be truncated)
        if (response.stop_reason === 'max_tokens') {
          console.warn('[Claude] Response hit max_tokens limit - response may be truncated');
          console.warn('[Claude] Token usage:', {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            maxTokens,
            utilizationPct: Math.round((totalOutputTokens / maxTokens) * 100)
          });
          console.warn('[Claude] Content length:', textContent.length, 'characters');
          console.warn('[Claude] Content preview (last 200 chars):', textContent.substring(textContent.length - 200));
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

        // Execute tools one at a time, emitting a progress label before each
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (let i = 0; i < toolUseBlocks.length; i++) {
          const toolUse = toolUseBlocks[i];
          const inp = toolUse.input as Record<string, any>;

          // Build a human-readable label for this single tool call
          let label: string;
          switch (toolUse.name) {
            case 'search_fund_description':
              label = `Searching for '${inp.fund_name ?? inp.fundName ?? 'fund'}'`;
              break;
            case 'search_company_description':
              label = `Searching for '${inp.company_name ?? inp.companyName ?? 'company'}'`;
              break;
            case 'search_asset_class_metrics': {
              const metric = inp.metric
                ? (inp.metric as string).charAt(0).toUpperCase() + (inp.metric as string).slice(1)
                : 'Metrics';
              label = `Searching ${metric} for '${inp.asset_class ?? inp.assetClass ?? 'asset class'}'`;
              break;
            }
            case 'search_asset_class_correlation':
              label = `Searching correlation for '${inp.asset_class_a}' and '${inp.asset_class_b}'`;
              break;
            default:
              label = toolUse.name;
          }

          // Emit progress for this individual tool before executing it
          toolsExecutedCount++;
          // step / (step + BUFFER) approaches 100% asymptotically, capped at PROGRESS_CAP
          const pct = Math.round((toolsExecutedCount / (toolsExecutedCount + PROGRESS_BUFFER)) * PROGRESS_CAP);
          onProgress?.(pct, 100, label);

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
