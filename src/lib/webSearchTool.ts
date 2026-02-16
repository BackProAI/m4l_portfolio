// ============================================================================
// Web Search Tool - Fetches company and fund descriptions from the web
// ============================================================================

interface SearchResult {
  description: string;
  sources: string[];
}

/**
 * Search for company description and business overview
 * Uses Brave Search API for real-time web data
 * 
 * @param companyName - Full company name
 * @param ticker - Optional stock ticker symbol (e.g., "CBA")
 * @returns Object with description and source URLs
 */
export async function searchCompanyDescription(
  companyName: string,
  ticker?: string
): Promise<SearchResult> {
  // Build search query optimized for Australian companies
  const searchQuery = ticker 
    ? `${companyName} ${ticker} ASX company business description what does it do`
    : `${companyName} company business description what does it do`;
  
  try {
    // Check if API key is configured
    if (!process.env.BRAVE_SEARCH_API_KEY) {
      console.warn('Brave Search API key not configured, returning placeholder');
      return {
        description: `${companyName} - Description not available (API key not configured)`,
        sources: []
      };
    }

    // Call Brave Search API
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=3`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract relevant snippets from top results
    const descriptions = data.web?.results
      ?.slice(0, 3)
      .map((r: any) => r.description)
      .filter(Boolean) || [];
    
    const sources = data.web?.results
      ?.slice(0, 3)
      .map((r: any) => r.url)
      .filter(Boolean) || [];
    
    // Combine descriptions into a cohesive summary
    const description = descriptions.length > 0
      ? descriptions.join(' ')
      : `${companyName} - No description found`;
    
    return { 
      description: description.slice(0, 500), // Limit to 500 chars
      sources 
    };
    
  } catch (error) {
    console.error('Company search failed:', error);
    return {
      description: `${companyName} - Description unavailable`,
      sources: []
    };
  }
}

/**
 * Search for managed fund description and investment strategy
 * Uses Brave Search API for real-time web data
 * 
 * @param fundName - Full fund name
 * @param fundManager - Optional fund management company name
 * @returns Object with description and source URLs
 */
export async function searchFundDescription(
  fundName: string,
  fundManager?: string
): Promise<SearchResult> {
  // Build search query optimized for Australian managed funds
  const searchQuery = fundManager
    ? `${fundName} ${fundManager} managed fund investment strategy description Australia`
    : `${fundName} managed fund investment strategy description Australia`;
  
  try {
    // Check if API key is configured
    if (!process.env.BRAVE_SEARCH_API_KEY) {
      console.warn('Brave Search API key not configured, returning placeholder');
      return {
        description: `${fundName} - Description not available (API key not configured)`,
        sources: []
      };
    }

    // Call Brave Search API
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=3`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract relevant snippets from top results
    const descriptions = data.web?.results
      ?.slice(0, 3)
      .map((r: any) => r.description)
      .filter(Boolean) || [];
    
    const sources = data.web?.results
      ?.slice(0, 3)
      .map((r: any) => r.url)
      .filter(Boolean) || [];
    
    // Combine descriptions into a cohesive summary
    const description = descriptions.length > 0
      ? descriptions.join(' ')
      : `${fundName} - No description found`;
    
    return { 
      description: description.slice(0, 500), // Limit to 500 chars
      sources 
    };
    
  } catch (error) {
    console.error('Fund search failed:', error);
    return {
      description: `${fundName} - Description unavailable`,
      sources: []
    };
  }
}

/**
 * Tool definitions for Claude API
 * These define the functions that Claude can request to call
 */
export const SEARCH_TOOLS = [
  {
    name: "search_company_description",
    description: "Search the web for a company's business description and overview. Use this for direct shares/stocks to get information about what the company does, its business operations, and industry. Prioritizes Australian companies and ASX listings.",
    input_schema: {
      type: "object",
      properties: {
        company_name: {
          type: "string",
          description: "Full company name (e.g., 'Commonwealth Bank', 'BHP Group')"
        },
        ticker: {
          type: "string",
          description: "Optional stock ticker symbol (e.g., 'CBA', 'BHP')"
        }
      },
      required: ["company_name"]
    }
  },
  {
    name: "search_fund_description",
    description: "Search the web for a managed fund's investment strategy and description. Use this for managed funds, index funds, and superannuation investment options to get information about the fund's asset allocation, investment approach, and what it invests in.",
    input_schema: {
      type: "object",
      properties: {
        fund_name: {
          type: "string",
          description: "Full fund name (e.g., 'Vanguard High Growth Index', 'Colonial FirstChoice Balanced')"
        },
        fund_manager: {
          type: "string",
          description: "Optional fund management company name (e.g., 'Vanguard', 'Colonial First Choice')"
        }
      },
      required: ["fund_name"]
    }
  }
] as const;

/**
 * Execute a search tool based on tool name and input
 * Used by Claude client to execute requested tools
 * 
 * @param toolName - Name of the tool to execute
 * @param toolInput - Input parameters for the tool
 * @returns Search result as a string
 */
export async function executeSearchTool(
  toolName: string,
  toolInput: Record<string, any>
): Promise<string> {
  try {
    let result: SearchResult;
    
    switch (toolName) {
      case 'search_company_description':
        result = await searchCompanyDescription(
          toolInput.company_name,
          toolInput.ticker
        );
        return `${result.description}\n\nSources: ${result.sources.join(', ') || 'None'}`;
        
      case 'search_fund_description':
        result = await searchFundDescription(
          toolInput.fund_name,
          toolInput.fund_manager
        );
        return `${result.description}\n\nSources: ${result.sources.join(', ') || 'None'}`;
        
      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (error) {
    console.error(`Tool execution error for ${toolName}:`, error);
    return `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
