// ============================================================================
// Web Search Tool - Fetches company and fund descriptions from the web
// ============================================================================

import { getAssetClassMetrics, getCorrelation, formatPercent } from './assetClassData';

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
 * Get asset class level metrics from static data
 * Returns consistent, authoritative metrics based on industry-standard assumptions
 * NO WEB SEARCH REQUIRED - uses pre-loaded Vanguard-methodology data
 *
 * @param assetClass - Asset class label (e.g., "Australian Shares")
 * @param metric - Metric focus (e.g., "volatility", "expected return")
 */
export async function searchAssetClassMetrics(
  assetClass: string,
  metric: string = 'volatility'
): Promise<SearchResult> {
  // Use static data for consistent results
  const metrics = getAssetClassMetrics(assetClass);
  
  if (!metrics) {
    return {
      description: `No data available for asset class: ${assetClass}. Please use one of the standard asset classes: Australian Shares, International Shares, Australian Fixed Interest, International Fixed Interest, Australian Property, International Property, Cash, Alternatives.`,
      sources: []
    };
  }

  if (metric === 'expected return') {
    const returnPercent = formatPercent(metrics.expectedReturn, 1);
    return {
      description: `${assetClass}: Expected annual return is ${returnPercent} (${metrics.expectedReturn} as decimal). ${metrics.description}. Based on 10-year forecast using Vanguard Capital Market Assumptions methodology and industry-standard institutional investment metrics.`,
      sources: ['Static Asset Class Data - Vanguard Capital Market Assumptions methodology (February 2026)']
    };
  } else {
    // volatility / standard deviation
    const volPercent = formatPercent(metrics.standardDeviation, 1);
    return {
      description: `${assetClass}: Standard deviation (volatility) is ${volPercent} (${metrics.standardDeviation} as decimal). ${metrics.description}. Based on 10-year forecast using Vanguard Capital Market Assumptions methodology and industry-standard institutional investment metrics.`,
      sources: ['Static Asset Class Data - Vanguard Capital Market Assumptions methodology (February 2026)']
    };
  }
}

/**
 * Get correlation between two asset classes from static data
 * Returns consistent correlation coefficients based on industry-standard assumptions
 * NO WEB SEARCH REQUIRED - uses pre-loaded Vanguard-methodology correlation matrix
 *
 * @param assetClassA - First asset class
 * @param assetClassB - Second asset class
 */
export async function searchAssetClassCorrelation(
  assetClassA: string,
  assetClassB: string
): Promise<SearchResult> {
  // Use static correlation matrix for consistent results
  const correlation = getCorrelation(assetClassA, assetClassB);
  
  return {
    description: `Correlation coefficient (ρ) between ${assetClassA} and ${assetClassB} is ${correlation.toFixed(2)}. This represents the strength of the linear relationship between these two asset classes. Values range from -1 (perfect negative correlation) to +1 (perfect positive correlation). Based on Vanguard Capital Market Assumptions methodology and industry-standard institutional correlation matrices.`,
    sources: ['Static Asset Class Data - Vanguard Capital Market Assumptions methodology (February 2026)']
  };
}

async function performGeneralSearch(query: string, fallbackDescription: string): Promise<SearchResult> {
  try {
    if (!process.env.BRAVE_SEARCH_API_KEY) {
      console.warn('Brave Search API key not configured, returning placeholder');
      return {
        description: fallbackDescription,
        sources: [],
      };
    }

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const descriptions = data.web?.results
      ?.slice(0, 3)
      .map((r: any) => r.description)
      .filter(Boolean) || [];

    const sources = data.web?.results
      ?.slice(0, 3)
      .map((r: any) => r.url)
      .filter(Boolean) || [];

    const description = descriptions.length > 0 ? descriptions.join(' ') : fallbackDescription;

    return {
      description: description.slice(0, 600),
      sources,
    };
  } catch (error) {
    console.error('Brave general search failed:', error);
    return {
      description: fallbackDescription,
      sources: [],
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
  },
  {
    name: "search_asset_class_metrics",
    description: "Get expected return or volatility (standard deviation) for a given asset class from authoritative static data. Returns instant, consistent results based on Vanguard Capital Market Assumptions methodology. NO web search required - data is pre-loaded. Use this to get expected annual return and annualised standard deviation for portfolio risk calculations. Call this TWICE per asset class: once for 'expected return' and once for 'volatility'.",
    input_schema: {
      type: "object",
      properties: {
        asset_class: {
          type: "string",
          description: "Asset class name, e.g., 'Australian Shares', 'International Shares', 'Australian Fixed Interest', 'International Fixed Interest', 'Australian Property', 'International Property', 'Cash', 'Alternatives'",
        },
        metric: {
          type: "string",
          description: "Metric to retrieve: 'expected return' or 'volatility'. Must specify one.",
          enum: ["expected return", "volatility"],
        },
      },
      required: ["asset_class", "metric"],
    },
  },
  {
    name: "search_asset_class_correlation",
    description: "Get the correlation coefficient between two specific asset classes from authoritative static data. Returns instant, consistent ρ_ij (correlation coefficient) based on Vanguard Capital Market Assumptions methodology. NO web search required - correlation matrix is pre-loaded. Values range from -1 to 1. Call this for EVERY unique pair of asset classes in the portfolio to build a complete correlation matrix.",
    input_schema: {
      type: "object",
      properties: {
        asset_class_a: {
          type: "string",
          description: "First asset class name (e.g., 'Australian Shares')",
        },
        asset_class_b: {
          type: "string",
          description: "Second asset class name (e.g., 'International Shares')",
        },
      },
      required: ["asset_class_a", "asset_class_b"],
    },
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
      case 'search_asset_class_metrics':
        result = await searchAssetClassMetrics(
          toolInput.asset_class,
          toolInput.metric
        );
        return `${result.description}\n\nSources: ${result.sources.join(', ') || 'None'}`;
      case 'search_asset_class_correlation':
        result = await searchAssetClassCorrelation(
          toolInput.asset_class_a,
          toolInput.asset_class_b
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
