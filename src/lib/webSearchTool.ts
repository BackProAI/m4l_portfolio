// ============================================================================
// Web Search Tool - Fetches company and fund descriptions from the web
// ============================================================================

import YahooFinanceClass from 'yahoo-finance2';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';
import { getAssetClassMetrics, getCorrelation, formatPercent } from './assetClassData';

// Instantiate Yahoo Finance (v3 API requires instantiation)
const yahooFinance = new YahooFinanceClass();

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

/**
 * Get all portfolio risk data in a single call (BATCH OPTIMIZATION)
 * Returns metrics and correlations for all asset classes in one response
 * Dramatically reduces tool call overhead from 40+ calls to 1 call
 *
 * @param assetClasses - Array of asset class names present in portfolio
 */
export async function getPortfolioRiskData(
  assetClasses: string[]
): Promise<SearchResult> {
  // Validate input
  if (!assetClasses || assetClasses.length === 0) {
    return {
      description: 'Error: No asset classes provided',
      sources: []
    };
  }

  // Collect metrics for all asset classes
  const metricsData: Record<string, { expectedReturn: number; standardDeviation: number; description: string }> = {};
  const missingClasses: string[] = [];

  for (const assetClass of assetClasses) {
    const metrics = getAssetClassMetrics(assetClass);
    if (metrics) {
      metricsData[assetClass] = {
        expectedReturn: metrics.expectedReturn,
        standardDeviation: metrics.standardDeviation,
        description: metrics.description
      };
    } else {
      missingClasses.push(assetClass);
    }
  }

  // Collect correlations for all unique pairs
  const correlationData: Record<string, number> = {};
  for (let i = 0; i < assetClasses.length; i++) {
    for (let j = i + 1; j < assetClasses.length; j++) {
      const classA = assetClasses[i];
      const classB = assetClasses[j];
      const correlation = getCorrelation(classA, classB);
      const key = `${classA}|${classB}`;
      correlationData[key] = correlation;
    }
  }

  // Build comprehensive response
  let description = `Portfolio Risk Data for ${assetClasses.length} asset classes:\n\n`;
  
  description += '=== EXPECTED RETURNS & VOLATILITY ===\n';
  for (const [className, data] of Object.entries(metricsData)) {
    const returnPct = formatPercent(data.expectedReturn, 1);
    const volPct = formatPercent(data.standardDeviation, 1);
    description += `${className}:\n`;
    description += `  - Expected Return: ${returnPct} (${data.expectedReturn} decimal)\n`;
    description += `  - Standard Deviation (Volatility): ${volPct} (${data.standardDeviation} decimal)\n`;
    description += `  - Description: ${data.description}\n\n`;
  }

  description += '=== CORRELATION MATRIX ===\n';
  description += `Total pairs: ${Object.keys(correlationData).length}\n\n`;
  for (const [pair, coefficient] of Object.entries(correlationData)) {
    const [classA, classB] = pair.split('|');
    description += `${classA} ↔ ${classB}: ${coefficient.toFixed(2)}\n`;
  }

  if (missingClasses.length > 0) {
    description += `\n⚠️ Warning: No data found for: ${missingClasses.join(', ')}\n`;
  }

  description += '\nBased on institutional correlation matrix and Vanguard Capital Market Assumptions methodology (February 2026).';

  return {
    description,
    sources: ['Static Asset Class Data - Vanguard Capital Market Assumptions methodology (February 2026)']
  };
}

/**
 * Parse date string in various formats and convert to YYYY-MM-DD
 * Handles formats like:
 * - "1 Jul 2024" or "01 July 2024"
 * - "01/07/2024"
 * - "2024-07-01"
 */
function parseFlexibleDate(dateStr: string): string {
  // Try standard ISO format first
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Try DD/MM/YYYY format
  const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try "1 Jul 2024" or "01 July 2024" format
  const monthNames: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
  };

  const textDateMatch = dateStr.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (textDateMatch) {
    const [, day, monthText, year] = textDateMatch;
    const month = monthNames[monthText.toLowerCase()];
    if (month) {
      return `${year}-${month}-${day.padStart(2, '0')}`;
    }
  }

  // Fallback: try native Date parsing
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  throw new Error(`Unable to parse date: ${dateStr}`);
}

/**
 * Search for holding return data using Yahoo Finance
 * FALLBACK ONLY - Use this when return data is not available in portfolio documents
 * 
 * @param holdingName - Name of the holding (e.g., "Commonwealth Bank")
 * @param ticker - Stock ticker symbol (e.g., "CBA.AX" for ASX stocks)
 * @param timeframePeriod - Period string like "1 Jul 2024 to 30 Jun 2025"
 * @returns Object with return data and sources
 */
export async function searchHoldingReturn(
  holdingName: string,
  ticker: string,
  timeframePeriod: string
): Promise<SearchResult> {
  try {
    // Parse the timeframe period
    // Expected format: "1 Jul 2024 to 30 Jun 2025" or "01/07/2024 to 30/06/2025"
    const periodMatch = timeframePeriod.match(/^(.+?)\s+to\s+(.+?)$/i);
    if (!periodMatch) {
      return {
        description: `Unable to parse time period: ${timeframePeriod}. Expected format like "1 Jul 2024 to 30 Jun 2025"`,
        sources: [],
      };
    }

    const [, startDateStr, endDateStr] = periodMatch;
    const startDate = parseFlexibleDate(startDateStr.trim());
    const endDate = parseFlexibleDate(endDateStr.trim());

    console.log(`[Yahoo Finance] Fetching return for ${ticker} from ${startDate} to ${endDate}`);

    // Fetch historical data from Yahoo Finance using v3 chart API (historical() is deprecated)
    // @ts-ignore - Yahoo Finance types may not be fully complete
    const queryResult = await yahooFinance.chart(ticker, {
      period1: startDate,
      period2: endDate,
      interval: '1d', // Daily data
    });

    console.log(`[Yahoo Finance] Response structure:`, {
      hasResult: !!queryResult,
      keys: queryResult ? Object.keys(queryResult) : [],
      hasQuotes: queryResult && 'quotes' in queryResult,
      quotesLength: queryResult?.quotes?.length
    });

    if (!queryResult || !queryResult.quotes || queryResult.quotes.length === 0) {
      console.error(`[Yahoo Finance] ❌ No data for ${ticker}`);
      return {
        description: `No historical data found for ${ticker} (${holdingName}) on Yahoo Finance for the period ${timeframePeriod}. This ticker may not be available or the date range may be invalid.`,
        sources: [],
      };
    }

    // Calculate total return from first and last quotes
    const quotes = queryResult.quotes;
    const startPrice = quotes[0].adjclose ?? quotes[0].close;
    const endPrice = quotes[quotes.length - 1].adjclose ?? quotes[quotes.length - 1].close;
    
    if (!startPrice || !endPrice) {
      return {
        description: `Incomplete price data for ${ticker} (${holdingName}). Start or end price missing.`,
        sources: [],
      };
    }

    const totalReturn = ((endPrice - startPrice) / startPrice) * 100;

    console.log(`[Yahoo Finance] ✅ Successfully calculated return for ${ticker}: ${totalReturn.toFixed(2)}%`);

    const description = `${holdingName} (${ticker}): Total return over the time period ${timeframePeriod} is ${totalReturn.toFixed(2)}%. Start price: $${startPrice.toFixed(2)}, End price: $${endPrice.toFixed(2)}. Data retrieved from Yahoo Finance historical prices.`;

    return {
      description,
      sources: [`Yahoo Finance - ${ticker}`],
    };
  } catch (error) {
    console.error(`[Yahoo Finance] Error fetching return for ${ticker}:`, error);
    return {
      description: `Failed to retrieve return data for ${holdingName} (${ticker}): ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure the ticker symbol is correct and has the appropriate suffix (e.g., .AX for ASX stocks).`,
      sources: [],
    };
  }
}

/**
 * Search for managed fund return data using Morningstar website
 * FALLBACK ONLY - Use this when return data is not available for managed funds
 * Uses Brave Search API to find fund page, then Puppeteer to scrape performance data
 * 
 * @param fundName - Name of the fund (e.g., "Antipodes China Fund")
 * @param fundManager - Fund management company (e.g., "Antipodes Partners")
 * @param timeframePeriod - Period string like "1 Jul 2024 to 30 Jun 2025"
 * @returns Object with return data and sources
 */
async function launchBrowser() {
  const isServerless = !!process.env.VERCEL || process.env.NODE_ENV === 'production';

  if (isServerless) {
    // Download chromium binary from GitHub releases at runtime (cached in /tmp/chromium)
    const executablePath = await chromium.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar'
    );

    // Retry logic for ETXTBSY race condition + corrupted tar handling during concurrent chromium extraction
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await puppeteerCore.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath,
          headless: chromium.headless,
        });
      } catch (error: any) {
        const isETXTBSY = error?.code === 'ETXTBSY' || error?.syscall === 'spawn';
        const isCorruptedTar = error?.message?.includes?.('Invalid tar header') || error?.message?.includes?.('corrupted');
        
        if ((isETXTBSY || isCorruptedTar) && attempt < MAX_RETRIES) {
          const delay = 1000 * attempt; // Exponential backoff: 1s, 2s
          const reason = isCorruptedTar ? 'corrupted tar file' : 'ETXTBSY error';
          console.warn(`[Browser] ${reason} on attempt ${attempt}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error; // Re-throw if not recoverable or out of retries
      }
    }
    throw new Error('Failed to launch browser after retries');
  }

  // Local development: use system Chrome
  return puppeteerCore.launch({
    headless: true,
    channel: 'chrome', // Use system-installed Chrome
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

export async function searchFundReturnMorningstar(
  fundName: string,
  fundManager: string,
  timeframePeriod: string,
  apirCode?: string
): Promise<SearchResult> {
  const MAX_ATTEMPTS = 2;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  let browser;
  try {
    console.log(`[Morningstar] Fetching return for ${fundName} (${fundManager})${apirCode ? ` [APIR: ${apirCode}]` : ''}`);

    // Step 1: Use Brave Search to find the Morningstar fund page
    if (!process.env.BRAVE_SEARCH_API_KEY) {
      console.warn('Brave Search API key not configured');
      return {
        description: `${fundName} - Morningstar data not available (API key not configured)`,
        sources: [],
      };
    }

    // Also try to extract APIR code from fund name if not explicitly provided
    // APIR pattern: 3 uppercase letters + 4 digits + "AU" (e.g., RIM0031AU, EVO2608AU)
    if (!apirCode) {
      const apirMatch = fundName.match(/\b([A-Z]{3}\d{4}AU)\b/i);
      if (apirMatch) {
        apirCode = apirMatch[1].toUpperCase();
        console.log(`[Morningstar] Extracted APIR code from fund name: ${apirCode}`);
      }
    }

    // Clean the fund name for search: remove parenthetical codes, dollar signs
    const cleanedFundName = fundName
      .replace(/\([^)]*\)/g, '') // Remove all parenthetical codes
      .replace(/\$/g, '')       // Remove dollar signs  
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
    
    console.log(`[Morningstar] Cleaned fund name: "${cleanedFundName}"`);

    // Build search queries: primary by fund name, secondary by APIR code
    const searchQuery1 = `${cleanedFundName} ${fundManager} site:morningstar.com.au`;
    const searchPromises: Promise<Response>[] = [
      fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery1)}&count=5`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY!,
          },
        }
      )
    ];
    
    // If we have an APIR code, run a second search with it (much more precise)
    if (apirCode) {
      const searchQuery2 = `${apirCode} site:morningstar.com.au`;
      console.log(`[Morningstar] Running APIR search: "${searchQuery2}"`);
      searchPromises.push(
        fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery2)}&count=5`,
          {
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip',
              'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY!,
            },
          }
        )
      );
    }
    
    const searchResponses = await Promise.all(searchPromises);
    
    // Collect ALL candidate fund IDs from both searches (deduplicated, preserving order)
    // APIR search results are prioritized (added first if available)
    const candidateFundIds: { id: string; url: string; source: string }[] = [];
    const seenIds = new Set<string>();
    
    // Process APIR search results FIRST (index 1) if available, then name search (index 0)
    const processOrder = apirCode ? [1, 0] : [0];
    const sourceLabels = ['name-search', 'apir-search'];
    
    for (const idx of processOrder) {
      const searchResponse = searchResponses[idx];
      if (!searchResponse || !searchResponse.ok) {
        console.warn(`[Morningstar] Search ${sourceLabels[idx]} returned ${searchResponse?.status || 'no response'}, skipping`);
        continue;
      }
      const searchData = await searchResponse.json();
      const results = searchData.web?.results || [];
      
      for (const result of results) {
        const url = result.url || '';
        const fundIdMatch = url.match(/\/investments\/security\/fund\/(\d+)/);
        if (fundIdMatch && !seenIds.has(fundIdMatch[1])) {
          seenIds.add(fundIdMatch[1]);
          candidateFundIds.push({ id: fundIdMatch[1], url, source: sourceLabels[idx] });
        }
      }
    }
    
    console.log(`[Morningstar] Found ${candidateFundIds.length} candidate fund IDs: ${candidateFundIds.map(c => `${c.id} (${c.source})`).join(', ')}`);
    
    if (candidateFundIds.length === 0) {
      return {
        description: `No Morningstar listing found for ${fundName} (${fundManager}). Fund may not be available on Morningstar.com.au.`,
        sources: [],
      };
    }
    
    // Helper: generate keywords from a fund name for fuzzy matching
    const getKeywords = (name: string): Set<string> => {
      const expanded = name
        .replace(/\bInt(?:l)?\b/gi, 'International')
        .replace(/\bPr(?:op)?\b/gi, 'Property')
        .replace(/\bSec(?:s)?\b/gi, 'Securities')
        .replace(/\bHd(?:g(?:d|ed)?)?\b/gi, 'Hedged')
        .replace(/\bCl\b/gi, 'Class')
        .replace(/\bFd\b/gi, 'Fund')
        .replace(/\bIdx\b/gi, 'Index')
        .replace(/\bInfras\b/gi, 'Infrastructure')
        .replace(/\bAus\b/gi, 'Australian')
        .replace(/\bGlbl\b/gi, 'Global')
        .replace(/\bLstd\b/gi, 'Listed')
        .replace(/\bPriv\b/gi, 'Private')
        .replace(/\bCred\b/gi, 'Credit')
        .replace(/\bCorp\b/gi, 'Corporate')
        .replace(/\bInd\b/gi, 'Index')
        .replace(/\bFix(?:ed)?\b/gi, 'Fixed');
      return new Set(
        expanded.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2)
      );
    };
    
    // Verify candidates by checking the fund name on the Morningstar page
    let fundId: string | null = null;
    let foundUrl: string | null = null;
    const searchKeywords = getKeywords(cleanedFundName);
    console.log(`[Morningstar] Search keywords: ${[...searchKeywords].join(', ')}`);
    
    for (const candidate of candidateFundIds) {
      try {
        const overviewUrl = `https://www.morningstar.com.au/investments/security/fund/${candidate.id}/overview`;
        const verifyResponse = await fetch(overviewUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          redirect: 'follow',
        });
        
        if (!verifyResponse.ok) {
          console.warn(`[Morningstar] Could not fetch overview for candidate ${candidate.id}: ${verifyResponse.status}`);
          continue;
        }
        
        const html = await verifyResponse.text();
        
        // Check if APIR code appears on the page (most reliable match)
        if (apirCode) {
          const apirFoundOnPage = html.includes(apirCode);
          if (apirFoundOnPage) {
            fundId = candidate.id;
            foundUrl = candidate.url;
            console.log(`[Morningstar] ✅ APIR match! Fund ID ${candidate.id} has APIR ${apirCode} on page (source: ${candidate.source})`);
            break;
          }
        }
        
        // Fallback: fuzzy keyword matching on fund name
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        const pageFundName = h1Match?.[1]?.trim() || titleMatch?.[1]?.trim() || '';
        
        console.log(`[Morningstar] Candidate ${candidate.id} (${candidate.source}): page name = "${pageFundName}"`);
        
        if (pageFundName) {
          const pageKeywords = getKeywords(pageFundName);
          let matchCount = 0;
          for (const keyword of searchKeywords) {
            if (pageKeywords.has(keyword)) matchCount++;
          }
          const matchRatio = searchKeywords.size > 0 ? matchCount / searchKeywords.size : 0;
          console.log(`[Morningstar] Candidate ${candidate.id}: keyword match ${matchCount}/${searchKeywords.size} (${(matchRatio * 100).toFixed(0)}%)`);
          
          if (matchRatio >= 0.4) {
            fundId = candidate.id;
            foundUrl = candidate.url;
            console.log(`[Morningstar] ✅ Verified fund ID ${candidate.id}: "${pageFundName}" matches "${cleanedFundName}"`);
            break;
          } else {
            console.log(`[Morningstar] ❌ Rejected fund ID ${candidate.id}: "${pageFundName}" does not match "${cleanedFundName}"`);
          }
        }
      } catch (verifyError) {
        console.warn(`[Morningstar] Could not verify candidate ${candidate.id}:`, verifyError);
      }
    }
    
    // If no candidate passed verification, fall back to first result
    if (!fundId && candidateFundIds.length > 0) {
      fundId = candidateFundIds[0].id;
      foundUrl = candidateFundIds[0].url;
      console.log(`[Morningstar] ⚠️ No candidate verified, falling back to first result: ${fundId}`);
    }
    
    if (!fundId) {
      return {
        description: `No Morningstar listing found for ${fundName} (${fundManager}). Fund may not be available on Morningstar.com.au.`,
        sources: [],
      };
    }
    
    console.log(`[Morningstar] Using fund ID: ${fundId}`);

    // Step 3: Navigate to performance page and scrape data
    const performanceUrl = `https://www.morningstar.com.au/investments/security/fund/${fundId}/performance`;

    browser = await launchBrowser();

    const page = await browser.newPage();
    
    // Set desktop viewport (Morningstar likely serves different HTML for mobile vs desktop)
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate directly to performance page (modal will appear there)
    console.log(`[Morningstar] Navigating to performance page: ${performanceUrl}`);
    await page.goto(performanceUrl, { waitUntil: 'networkidle2', timeout: 45000 });

    // Handle Morningstar's user type selection modal
    // Need to click "Individual Investor" THEN click "Confirm"
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Give modal time to appear
      
      // Step 1: Click "Individual Investor" option
      const investorClicked = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h5, h4, h3'));
        for (const heading of headings) {
          if (heading.textContent?.includes('Individual Investor')) {
            const clickTarget = heading.closest('button') || heading.closest('div[role="button"]') || heading;
            (clickTarget as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      
      if (investorClicked) {
        console.log(`[Morningstar] Clicked Individual Investor option`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief wait before confirm
        
        // Step 2: Click "Confirm" button
        const confirmClicked = await page.evaluate(() => {
          const allButtons = Array.from(document.querySelectorAll('button'));
          const confirmButton = allButtons.find(btn => btn.textContent?.trim() === 'Confirm');
          if (confirmButton) {
            (confirmButton as HTMLButtonElement).click();
            return true;
          }
          return false;
        });
        
        if (confirmClicked) {
          console.log(`[Morningstar] Clicked Confirm button`);
          await new Promise(resolve => setTimeout(resolve, 4000)); // Wait for page to reload after confirmation
          
          // Verify we're still on the performance page
          const currentUrl = page.url();
          console.log(`[Morningstar] Current URL after confirm: ${currentUrl}`);
          
          if (!currentUrl.includes('/performance')) {
            console.log(`[Morningstar] ERROR: Page redirected away from performance after modal! URL: ${currentUrl}`);
            // Try clicking Performance tab on the page
            const perfTabClicked = await page.evaluate(() => {
              const links = Array.from(document.querySelectorAll('a[href*="/performance"]'));
              if (links.length > 0) {
                (links[0] as HTMLAnchorElement).click();
                return true;
              }
              return false;
            });
            
            if (perfTabClicked) {
              console.log(`[Morningstar] Clicked Performance tab link`);
              // Wait for navigation to complete (up to 5s for DOM to load)
              try {
                await page.waitForNavigation({ timeout: 5000, waitUntil: 'domcontentloaded' });
                console.log(`[Morningstar] Performance page navigation completed`);
              } catch (navError) {
                console.log(`[Morningstar] Navigation timeout, continuing anyway`);
              }
              // Additional wait for page to stabilize
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              console.log(`[Morningstar] ERROR: Could not find Performance tab link`);
              throw new Error('Performance tab not found after modal redirect');
            }
          }
        } else {
          console.log(`[Morningstar] Warning: Could not find Confirm button`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } else {
        console.log(`[Morningstar] No Individual Investor option found`);
        
        // Check if we're on the performance page anyway
        const currentUrl = page.url();
        console.log(`[Morningstar] Current URL (no modal): ${currentUrl}`);
        
        if (!currentUrl.includes('/performance')) {
          console.log(`[Morningstar] Not on performance page, trying to click Performance tab`);
          const perfTabClicked = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href*="/performance"]'));
            if (links.length > 0) {
              (links[0] as HTMLAnchorElement).click();
              return true;
            }
            return false;
          });
          
          if (perfTabClicked) {
            console.log(`[Morningstar] Clicked Performance tab link`);
            // Wait for navigation to complete (up to 5s for DOM to load)
            try {
              await page.waitForNavigation({ timeout: 5000, waitUntil: 'domcontentloaded' });
              console.log(`[Morningstar] Performance page navigation completed`);
            } catch (navError) {
              console.log(`[Morningstar] Navigation timeout, continuing anyway`);
            }
            // Additional wait for page to stabilize
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.log(`[Morningstar] ERROR: Could not find Performance tab link`);
            throw new Error('Performance tab not found - page structure may have changed');
          }
        }
      }
    } catch (e) {
      console.log(`[Morningstar] Error handling modal:`, e);
    }

    // STEP 1: Wait for initial performance table to load FIRST
    // Timeout reduced to 40s to fail faster on broken pages (Vercel 300s limit)
    // If table doesn't appear in 40s, page is likely broken anyway
    console.log(`[Morningstar] Waiting for initial performance table to load...`);
    try {
      await page.waitForSelector('[class*="mds-table"]', { timeout: 40000 });
      console.log(`[Morningstar] Initial performance table loaded`);
    } catch (err) {
      console.log(`[Morningstar] Table timeout after 40s - checking what exists...`);
      const pageState = await page.evaluate(() => {
        return {
          hasTables: document.querySelectorAll('table').length,
          hasMdsTables: document.querySelectorAll('[class*="mds-table"]').length,
          bodyText: document.body.innerText.substring(0, 500)
        };
      });
      console.log(`[Morningstar] Page state at timeout:`, JSON.stringify(pageState, null, 2));
      throw err;
    }

    // STEP 2: Now switch from "Annual" to "Trailing" returns view
    console.log(`[Morningstar] Switching from Annual to Trailing view...`);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief wait for page stabilization
      
      // First, try to find and click a direct "Trailing" button
      const directClick = await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button'));
        const trailingButton = allButtons.find(btn => btn.textContent?.includes('Trailing'));
        
        if (trailingButton) {
          (trailingButton as HTMLButtonElement).click();
          return true;
        }
        return false;
      });
      
      if (directClick) {
        console.log(`[Morningstar] Clicked Trailing button directly`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for table reload
      } else {
        // Try dropdown approach: click "Annual" dropdown first
        const dropdownOpened = await page.evaluate(() => {
          // Look for button with Morningstar button classes (either __sal or __mca-dfd suffix) that contains "Annual"
          const buttons = Array.from(document.querySelectorAll('button[class*="mds-button"]'));
          for (const button of buttons) {
            const buttonText = button.textContent?.trim() || '';
            // Check if button itself or any span contains "Annual"
            if (buttonText.includes('Annual')) {
              const spans = button.querySelectorAll('span');
              for (const span of spans) {
                if (span.textContent?.trim() === 'Annual') {
                  (button as HTMLButtonElement).click();
                  console.log('[Morningstar] Found and clicked Annual button:', button.className);
                  return true;
                }
              }
            }
          }
          return false;
        });
        
        if (dropdownOpened) {
          console.log(`[Morningstar] Opened Annual dropdown`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for popover menu to appear
          
          // Now click "Trailing" in the popover menu
          const menuItemClicked = await page.evaluate(() => {
            // Find visible popover (check both __sal and __mca-dfd variants)
            const popovers = Array.from(document.querySelectorAll('[class*="mds-popover"]'));
            for (const popover of popovers) {
              // Skip hidden popovers (check for any "hidden" class variant)
              if (popover.className.includes('hidden')) continue;
              
              // Find list items within this popover
              const listItems = popover.querySelectorAll('[class*="mds-list-group-item"]');
              for (const item of listItems) {
                const textSpan = item.querySelector('[class*="mds-list-group-item__text"]');
                if (textSpan?.textContent?.trim() === 'Trailing') {
                  // Click the link element
                  const link = item.querySelector('[class*="mds-list-group__link"]') as HTMLElement;
                  if (link) {
                    link.click();
                    return true;
                  }
                  // Fallback: click the item itself
                  (item as HTMLElement).click();
                  return true;
                }
              }
            }
            return false;
          });
          
          if (menuItemClicked) {
            console.log(`[Morningstar] Clicked Trailing from dropdown menu`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for table to reload with Trailing data
          } else {
            console.log(`[Morningstar] Warning: Could not find Trailing in dropdown menu`);
          }
        } else {
          console.log(`[Morningstar] Warning: Could not find dropdown button`);
        }
      }
    } catch (e) {
      console.log(`[Morningstar] Error switching to Trailing view:`, e);
    }

    // STEP 3: Wait for table to stabilize after switching to Trailing view
    console.log(`[Morningstar] Waiting for Trailing table to stabilize...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract the "as of" date from Morningstar to get the actual reporting period
    const asOfDate = await page.evaluate(() => {
      const dateSpan = document.querySelector('span.header-date');
      if (dateSpan) {
        const text = dateSpan.textContent?.trim();
        // Text format: "as of MM/DD/YYYY"
        const dateMatch = text?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dateMatch) {
          return dateMatch[0]; // Return "MM/DD/YYYY"
        }
      }
      return null;
    });
    
    let actualTimeframe = timeframePeriod; // Default to portfolio's timeframe
    
    if (asOfDate) {
      console.log(`[Morningstar] Found "as of" date: ${asOfDate}`);
      
      // Parse MM/DD/YYYY format
      const [month, day, year] = asOfDate.split('/').map(Number);
      const endDate = new Date(year, month - 1, day);
      
      // Calculate start date (1 year before)
      const startDate = new Date(endDate);
      startDate.setFullYear(startDate.getFullYear() - 1);
      
      // Format as "DD MMM YYYY to DD MMM YYYY"
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formatDate = (date: Date) => {
        return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      };
      
      actualTimeframe = `${formatDate(startDate)} to ${formatDate(endDate)}`;
      console.log(`[Morningstar] Calculated actual 1-year period: ${actualTimeframe}`);
    } else {
      console.log(`[Morningstar] No "as of" date found, using portfolio timeframe: ${timeframePeriod}`);
    }

    // Extract 1-year return from "Investment" row
    const investorReturn = await page.evaluate(() => {
      const tables = document.querySelectorAll('[class*="mds-table"]');
      console.log(`[Morningstar Extract] Found ${tables.length} tables`);

      for (const table of tables) {
        // First, find the header row to determine which column is "1-Year"
        const headerRow = table.querySelector('thead tr');
        let oneYearColumnIndex = -1;
        
        if (headerRow) {
          const headerCells = headerRow.querySelectorAll('th');
          headerCells.forEach((cell, index) => {
            const headerText = cell.textContent?.trim();
            // Match "1-Year", "1 Year", "1-Yr", "1 Yr" (case insensitive)
            if (headerText && /1[- ]?ye?a?r/i.test(headerText)) {
              oneYearColumnIndex = index;
              console.log(`[Morningstar Extract] Found "1-Year" column at index ${index}: ${headerText}`);
            }
          });
        }
        
        if (oneYearColumnIndex === -1) {
          console.log(`[Morningstar Extract] Could not find "1-Year" column header`);
          continue;
        }

        const rows = table.querySelectorAll('tbody tr');
        console.log(`[Morningstar Extract] Table has ${rows.length} rows`);

        for (const row of rows) {
          const headerCell = row.querySelector('th');
          const headerText = headerCell?.textContent?.trim();
          
          if (headerText?.includes('Investment')) {
            console.log(`[Morningstar Extract] Found "Investment" row: ${headerText}`);
            
            // Get all data cells and extract the one at oneYearColumnIndex
            // Note: th is column 0, so td index = header index - 1
            const cells = row.querySelectorAll('td');
            console.log(`[Morningstar Extract] Row has ${cells.length} cells`);
            
            const tdIndex = oneYearColumnIndex - 1; // Subtract 1 because first column is <th>
            if (tdIndex >= 0 && tdIndex < cells.length) {
              const oneYearValue = cells[tdIndex].textContent?.trim();
              console.log(`[Morningstar Extract] Extracted 1-year value from td[${tdIndex}]: ${oneYearValue}`);
              return oneYearValue;
            } else {
              console.log(`[Morningstar Extract] Column index ${tdIndex} out of range (${cells.length} cells)`);
            }
          }
        }
      }
      console.log(`[Morningstar Extract] No "Investment" row found`);
      return null;
    });
    
    console.log(`[Morningstar] Extracted return value: ${investorReturn}`);

    // Close browser with timeout protection
    try {
      const pages = await browser.pages();
      await Promise.all(pages.map(p => p.close().catch(() => {})));
      await Promise.race([
        browser.close(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Browser close timeout')), 5000))
      ]);
      console.log(`[Morningstar] Browser closed successfully`);
    } catch (e) {
      console.warn(`[Morningstar] Browser close warning:`, e);
      // Force kill if available
      try {
        const browserProcess = browser.process();
        if (browserProcess) {
          browserProcess.kill('SIGKILL');
        }
      } catch {}
    }

    if (!investorReturn || investorReturn === '—' || investorReturn === '') {
      console.log(`[Morningstar] No return data found in table`);
      return {
        description: `No 1-year return data available for ${fundName} on Morningstar.`,
        sources: [`Morningstar - Fund ID ${fundId}`],
      };
    }

    // Parse the return value
    const returnValue = parseFloat(investorReturn);
    if (isNaN(returnValue)) {
      console.log(`[Morningstar] Could not parse return value: ${investorReturn}`);
      return {
        description: `Unable to parse return data for ${fundName}. Found value: ${investorReturn}`,
        sources: [`Morningstar - Fund ID ${fundId}`],
      };
    }

    console.log(`[Morningstar] ✅ Successfully extracted return: ${returnValue.toFixed(2)}% for period: ${actualTimeframe}`);

    const description = `${fundName} (${fundManager}): 1-year Investor Return is ${returnValue.toFixed(2)}% for the period ${actualTimeframe}. Data retrieved from Morningstar performance table.`;

    return {
      description,
      sources: [`Morningstar - ${performanceUrl}`],
    };
  } catch (error) {
    // Robust browser cleanup with timeout
    if (browser) {
      try {
        const pages = await browser.pages();
        await Promise.all(pages.map(p => p.close().catch(() => {})));
        await Promise.race([
          browser.close(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Browser close timeout')), 5000))
        ]);
      } catch (e) {
        console.warn(`[Morningstar] Browser cleanup error:`, e);
        // Force kill if available
        try {
          const browserProcess = browser.process();
          if (browserProcess) {
            browserProcess.kill('SIGKILL');
          }
        } catch {}
      }
    }
    if (attempt < MAX_ATTEMPTS) {
      console.warn(`[Morningstar] Attempt ${attempt} failed for ${fundName}: ${error instanceof Error ? error.message : 'Unknown error'}. Retrying in 3s...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      continue;
    }
    console.error(`[Morningstar] Error fetching return for ${fundName}:`, error);
    return {
      description: `Failed to retrieve Morningstar data for ${fundName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sources: [],
    };
  }
  } // end retry loop
  return {
    description: `Failed to retrieve Morningstar data for ${fundName} after ${MAX_ATTEMPTS} attempts`,
    sources: [],
  };
}

/**
 * Scrape asset allocation from Morningstar.com.au portfolio tab.
 * Used as the final fallback when Yahoo Finance and Brave Search cannot provide
 * a geographic breakdown. Requires BRAVE_SEARCH_API_KEY to find the fund ID.
 */
async function searchFundAssetAllocationMorningstar(
  fundName: string,
  ticker?: string,
  fundManager?: string
): Promise<SearchResult> {
  const MAX_ATTEMPTS = 2;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  let browser;
  try {
    console.log(`[Morningstar Allocation] Fetching asset allocation for ${fundName}`);

    if (!process.env.BRAVE_SEARCH_API_KEY) {
      return {
        description: `${fundName} - Morningstar allocation data not available (Brave API key not configured). Cannot determine allocation — do NOT estimate or guess.`,
        sources: [],
      };
    }

    // Step 1: Find Morningstar fund page via Brave search.
    // Try up to two queries: (a) fund name, (b) ticker — so Vanguard ETFs that aren't indexed
    // by full name on Morningstar can be found via their ASX ticker.
    const baseTicker = ticker ? ticker.replace(/\.(AX|ASX)$/i, '') : null;

    const searchQueries: string[] = [];
    if (fundManager) {
      searchQueries.push(`${fundName} ${fundManager} site:morningstar.com.au`);
    } else {
      searchQueries.push(`${fundName} ${ticker ?? ''} site:morningstar.com.au`.trim());
    }
    if (baseTicker) {
      // Ticker-based query as fallback — catches ETFs indexed by ASX ticker rather than full name
      searchQueries.push(`${baseTicker} site:morningstar.com.au`);
    }

    // Helper to extract a Morningstar security URL from Brave results.
    // Matches /investments/security/{type}/{id} where type is fund, etf, ASX etc.
    // and id is numeric (fund/12345) or an ASX ticker (ASX/VDIF).
    const extractPortfolioUrl = (results: any[]): string | null => {
      for (const result of results) {
        const url = result.url || '';
        const match = url.match(/\/investments\/security\/(\w+)\/([A-Za-z0-9]+)/);
        if (match) {
          const [, secType, secId] = match;
          return `https://www.morningstar.com.au/investments/security/${secType}/${secId}/portfolio`;
        }
      }
      return null;
    };

    let portfolioUrl: string | null = null;

    for (const searchQuery of searchQueries) {
      if (portfolioUrl) break;
      console.log(`[Morningstar Allocation] Brave search: "${searchQuery}"`);
      const searchResponse = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=5`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY,
          },
        }
      );
      if (!searchResponse.ok) throw new Error(`Brave Search API error: ${searchResponse.status}`);
      const searchData = await searchResponse.json();
      portfolioUrl = extractPortfolioUrl(searchData.web?.results || []);
    }

    // Last resort for ETFs: construct the direct Morningstar ASX portfolio URL from the ticker.
    // Morningstar.com.au uses /investments/security/ASX/{TICKER}/portfolio for ASX-listed ETFs.
    if (!portfolioUrl && baseTicker) {
      portfolioUrl = `https://www.morningstar.com.au/investments/security/ASX/${baseTicker}/portfolio`;
      console.log(`[Morningstar Allocation] No Brave result found — trying direct ASX URL: ${portfolioUrl}`);
    }

    if (!portfolioUrl) {
      console.log(`[Morningstar Allocation] No Morningstar listing found for ${fundName}`);
      return {
        description: `${fundName} - No Morningstar listing found. Cannot determine asset allocation — do NOT estimate or guess.`,
        sources: [],
      };
    }
    console.log(`[Morningstar Allocation] Navigating to: ${portfolioUrl}`);

    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(portfolioUrl, { waitUntil: 'networkidle2', timeout: 45000 });

    // Handle Morningstar's user type selection modal (same robust pattern as returns scraper)
    // Need to click "Individual Investor" THEN click "Confirm"
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Give modal time to appear

      // Step 1: Click "Individual Investor" option
      const investorClicked = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h5, h4, h3'));
        for (const heading of headings) {
          if (heading.textContent?.includes('Individual Investor')) {
            const clickTarget = heading.closest('button') || heading.closest('div[role="button"]') || heading;
            (clickTarget as HTMLElement).click();
            return true;
          }
        }
        return false;
      });

      if (investorClicked) {
        console.log(`[Morningstar Allocation] Clicked Individual Investor option`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief wait before confirm

        // Step 2: Click "Confirm" button
        const confirmClicked = await page.evaluate(() => {
          const allButtons = Array.from(document.querySelectorAll('button'));
          const confirmButton = allButtons.find(btn => btn.textContent?.trim() === 'Confirm');
          if (confirmButton) {
            (confirmButton as HTMLButtonElement).click();
            return true;
          }
          return false;
        });

        if (confirmClicked) {
          console.log(`[Morningstar Allocation] Clicked Confirm button`);
          await new Promise(resolve => setTimeout(resolve, 4000)); // Wait for page to reload after confirmation

          // Verify we're still on the portfolio page
          const currentUrl = page.url();
          console.log(`[Morningstar Allocation] Current URL after confirm: ${currentUrl}`);

          if (!currentUrl.includes('/portfolio')) {
            console.log(`[Morningstar Allocation] Page redirected away from portfolio after modal! Navigating back...`);
            const portfolioTabClicked = await page.evaluate(() => {
              const links = Array.from(document.querySelectorAll('a'));
              for (const link of links) {
                if ((link as HTMLAnchorElement).href?.includes('/portfolio') ||
                    link.textContent?.trim().toLowerCase() === 'portfolio') {
                  (link as HTMLAnchorElement).click();
                  return true;
                }
              }
              return false;
            });

            if (portfolioTabClicked) {
              console.log(`[Morningstar Allocation] Clicked Portfolio tab link`);
              try {
                await page.waitForNavigation({ timeout: 5000, waitUntil: 'domcontentloaded' });
                console.log(`[Morningstar Allocation] Portfolio page navigation completed`);
              } catch (navError) {
                console.log(`[Morningstar Allocation] Navigation timeout, continuing anyway`);
              }
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              console.log(`[Morningstar Allocation] ERROR: Could not find Portfolio tab link`);
              throw new Error('Portfolio tab not found after modal redirect');
            }
          }
        } else {
          console.log(`[Morningstar Allocation] Warning: Could not find Confirm button`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } else {
        console.log(`[Morningstar Allocation] No Individual Investor option found`);

        // Check if we're on the portfolio page anyway
        const currentUrl = page.url();
        console.log(`[Morningstar Allocation] Current URL (no modal): ${currentUrl}`);

        if (!currentUrl.includes('/portfolio')) {
          console.log(`[Morningstar Allocation] Not on portfolio page, trying to click Portfolio tab`);
          const portfolioTabClicked = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            for (const link of links) {
              if ((link as HTMLAnchorElement).href?.includes('/portfolio') ||
                  link.textContent?.trim().toLowerCase() === 'portfolio') {
                (link as HTMLAnchorElement).click();
                return true;
              }
            }
            return false;
          });

          if (portfolioTabClicked) {
            console.log(`[Morningstar Allocation] Clicked Portfolio tab link`);
            try {
              await page.waitForNavigation({ timeout: 5000, waitUntil: 'domcontentloaded' });
              console.log(`[Morningstar Allocation] Portfolio page navigation completed`);
            } catch (navError) {
              console.log(`[Morningstar Allocation] Navigation timeout, continuing anyway`);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.log(`[Morningstar Allocation] ERROR: Could not find Portfolio tab link`);
            throw new Error('Portfolio tab not found - page structure may have changed');
          }
        }
      }
    } catch (e) {
      console.log(`[Morningstar Allocation] Error handling modal:`, e);
    }

    // Wait for the asset allocation table to load
    // Morningstar uses sal-mip-asset-allocation__assetTable class or generic mds-table
    console.log(`[Morningstar Allocation] Waiting for allocation table to load...`);
    try {
      await page.waitForSelector('.sal-mip-asset-allocation__assetTable, [class*="mds-table"], table[summary]', { timeout: 40000 });
      console.log(`[Morningstar Allocation] Allocation table loaded`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Let data stabilize
    } catch (err) {
      console.log(`[Morningstar Allocation] Table timeout after 40s - trying with available content`);
      const pageState = await page.evaluate(() => {
        return {
          hasTables: document.querySelectorAll('table').length,
          url: window.location.href,
          bodyText: document.body.innerText.substring(0, 500)
        };
      });
      console.log(`[Morningstar Allocation] Page state at timeout:`, JSON.stringify(pageState, null, 2));
      // Don't throw - try extraction with whatever is available
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Extract asset allocation from the portfolio page
    const allocation = await page.evaluate(() => {
      const result: Record<string, number> = {};

      // Helper: classify a label into an asset class
      // Morningstar uses "Domestic Equity" (not "Australian Shares"), "Listed Property" (not "Australian Property"), etc.
      // Handle both conventions so extraction works for both Morningstar and other data sources.
      const classify = (label: string): string | null => {
        if (/(?:australian|domestic).{0,15}(equit|share)/i.test(label)) return 'Australian Shares';
        if (/(?:international|global|non.aust).{0,15}(equit|share)/i.test(label)) return 'International Shares';
        if (/(?:australian|domestic).{0,15}(fixed|bond|credit)/i.test(label)) return 'Australian Fixed Interest';
        if (/(?:international|global).{0,15}(fixed|bond|credit)/i.test(label)) return 'International Fixed Interest';
        if (/(?:australian|domestic|listed|unlisted).{0,15}propert/i.test(label)) return 'Australian Property';
        if (/(?:international|global).{0,15}propert/i.test(label)) return 'International Property';
        if (/\bcash\b/i.test(label)) return 'Domestic Cash';
        if (/alternative|infrastructure/i.test(label)) return 'Alternatives';
        return null;
      };

      // Helper: extract the Investment column value (first <td>) from a row
      const extractValue = (row: Element): number | null => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length === 0) return null;
        // The Investment column is the first <td> (after the <th> label)
        const text = (cells[0].textContent || '').trim();
        const m = text.match(/^([\d.]+)\s*%?$/) || text.match(/([\d.]+)%/);
        if (m) {
          const v = parseFloat(m[1]);
          if (v >= 0 && v <= 100) return v;
        }
        return null;
      };

      // Helper: accumulate value into result (handles Listed + Unlisted Property both mapping
      // to "Australian Property" — their values should be summed, not overwritten)
      const addToResult = (assetClass: string, value: number) => {
        result[assetClass] = (result[assetClass] || 0) + value;
      };

      // Strategy 1: target the specific Morningstar asset allocation table rows
      // These have class "sal-mip-asset-allocation__assetTableRow" and contain the authoritative data.
      // This avoids accidentally picking up data from other tables (Region Weightings, Sector, etc.)
      const allocationRows = Array.from(document.querySelectorAll('.sal-mip-asset-allocation__assetTableRow'));
      if (allocationRows.length > 0) {
        for (const row of allocationRows) {
          const label = (row.querySelector('th')?.textContent || '').trim();
          const assetClass = classify(label);
          if (!assetClass) continue;
          const value = extractValue(row);
          if (value !== null) addToResult(assetClass, value);
        }
        if (Object.keys(result).length >= 2) return result;
      }

      // Strategy 2: target the table with summary attribute (the asset allocation table uses table[summary])
      const summaryTable = document.querySelector('table[summary]');
      if (summaryTable) {
        const rows = Array.from(summaryTable.querySelectorAll('tr'));
        for (const row of rows) {
          const th = row.querySelector('th[scope="row"]');
          if (!th) continue;
          const label = (th.textContent || '').trim();
          const assetClass = classify(label);
          if (!assetClass) continue;
          const value = extractValue(row);
          if (value !== null) addToResult(assetClass, value);
        }
        if (Object.keys(result).length >= 2) return result;
      }

      // Strategy 3: fallback — scan ALL table rows (for non-standard page layouts)
      const rows = Array.from(document.querySelectorAll('tr'));
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td, th'));
        if (cells.length < 2) continue;
        const label = (cells[0].textContent || '').trim();
        const assetClass = classify(label);
        if (!assetClass) continue;
        for (const cell of cells.slice(1)) {
          const text = (cell.textContent || '').trim();
          const m = text.match(/^([\d.]+)\s*%?$/) || text.match(/([\d.]+)%/);
          if (m) {
            const v = parseFloat(m[1]);
            if (v >= 0 && v <= 100) { addToResult(assetClass, v); break; }
          }
        }
      }

      if (Object.keys(result).length >= 2) return result;

      // Strategy 4: scan all elements whose visible text is "Label pct%" on a single element
      const allEls = Array.from(document.querySelectorAll('*'));
      for (const el of allEls) {
        if (el.children.length > 3) continue;
        const text = (el.textContent || '').trim();
        const m = text.match(/^(.+?)\s+([\d.]+)\s*%\s*$/);
        if (!m) continue;
        const assetClass = classify(m[1].trim());
        if (assetClass) addToResult(assetClass, parseFloat(m[2]));
      }

      return result;
    });

    // If extraction didn't find ≥2 asset classes, dump page content BEFORE closing the browser
    // so we can diagnose why the CSS selectors/text scan didn't match the page structure.
    if (Object.keys(allocation).length < 2) {
      try {
        const pageDebug = await page.evaluate(() => {
          const text = document.body.innerText || '';
          return {
            url: window.location.href,
            title: document.title,
            // Lines that contain a percentage — likely the allocation data we want
            percentageLines: text.split('\n')
              .map(l => l.trim())
              .filter(l => l.length > 0 && /\d+\.?\d*\s*%/.test(l))
              .slice(0, 25),
            bodyPreview: text.substring(0, 600),
          };
        });
        console.log(`[Morningstar Allocation] ⚠️ Extraction found ${Object.keys(allocation).length} classes for ${fundName}. Page debug:`, JSON.stringify(pageDebug));
      } catch (e) {
        console.log(`[Morningstar Allocation] Debug evaluate failed:`, e);
      }
    }

    // Close browser
    try {
      const pages = await browser.pages();
      await Promise.all(pages.map(p => p.close().catch(() => {})));
      await Promise.race([
        browser.close(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Browser close timeout')), 5000))
      ]);
      console.log(`[Morningstar Allocation] Browser closed`);
    } catch (e) {
      console.warn(`[Morningstar Allocation] Browser close warning:`, e);
      try { browser.process()?.kill('SIGKILL'); } catch {}
    }

    if (Object.keys(allocation).length >= 2) {
      const geoStr = Object.entries(allocation)
        .sort((a, b) => b[1] - a[1])
        .map(([cls, pct]) => `${cls}: ${pct.toFixed(1)}%`)
        .join(', ');
      console.log(`[Morningstar Allocation] ✅ Found allocation for ${fundName}: ${geoStr}`);
      return {
        description: `${fundName} geographic asset allocation from Morningstar: ${geoStr}. CRITICAL: Use these EXACT percentages to split this holding's dollar value across asset classes. Do NOT estimate or override these values.`,
        sources: [portfolioUrl],
      };
    }

    console.log(`[Morningstar Allocation] Could not extract sufficient data for ${fundName}`);
    return {
      description: `${fundName} - Morningstar portfolio page did not yield usable asset allocation data. Cannot determine allocation — do NOT estimate or guess.`,
      sources: [portfolioUrl],
    };
  } catch (error) {
    if (browser) {
      try {
        const pages = await browser.pages();
        await Promise.all(pages.map(p => p.close().catch(() => {})));
        await Promise.race([
          browser.close(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]);
      } catch (e) {
        try { browser.process()?.kill('SIGKILL'); } catch {}
      }
    }
    if (attempt < MAX_ATTEMPTS) {
      console.warn(`[Morningstar Allocation] Attempt ${attempt} failed for ${fundName}: ${error instanceof Error ? error.message : 'Unknown error'}. Retrying in 3s...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      continue;
    }
    console.error(`[Morningstar Allocation] Error for ${fundName}:`, error);
    return {
      description: `${fundName} - Morningstar allocation lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}. Cannot determine allocation — do NOT estimate or guess.`,
      sources: [],
    };
  }
  } // end retry loop
  return {
    description: `${fundName} - Morningstar allocation lookup failed after ${MAX_ATTEMPTS} attempts. Cannot determine allocation — do NOT estimate or guess.`,
    sources: [],
  };
}

/**
 * Search for a fund/ETF's underlying asset class allocation breakdown
 * Uses Yahoo Finance quoteSummary for ETFs with tickers (geographic classification from sub-holdings).
 * Falls back to Morningstar portfolio tab scraping for managed funds and any ETF where Yahoo Finance
 * cannot provide a geographic breakdown.
 *
 * @param fundName - Name of the fund/ETF
 * @param ticker - Optional ticker symbol (e.g., "VDIF.AX")
 * @param fundManager - Optional fund management company name
 * @returns Object with asset allocation breakdown and sources
 */
export async function searchFundAssetAllocation(
  fundName: string,
  ticker?: string,
  fundManager?: string
): Promise<SearchResult> {
  // Try Yahoo Finance first if ticker is available
  if (ticker) {
    // Normalise ticker: ASX ETFs are often passed without the .AX suffix (e.g. "VDIF" instead of "VDIF.AX").
    // If the ticker has no exchange suffix (no dot) treat it as an ASX ticker and append .AX.
    const normalisedTicker = ticker.includes('.') ? ticker : `${ticker}.AX`;
    if (normalisedTicker !== ticker) {
      console.log(`[Asset Allocation] Normalised ticker: ${ticker} → ${normalisedTicker}`);
    }
    try {
      console.log(`[Asset Allocation] Trying Yahoo Finance quoteSummary for ${normalisedTicker}`);
      // @ts-ignore - Yahoo Finance types may not be fully complete
      const result = await yahooFinance.quoteSummary(normalisedTicker, { modules: ['topHoldings', 'fundProfile'] });

      const topHoldings = result.topHoldings;
      if (topHoldings) {
        const cashPct = topHoldings.cashPosition != null ? (topHoldings.cashPosition * 100) : null;

        // Attempt geographic classification directly from sub-holding names.
        // This handles fund-of-funds (e.g. Vanguard diversified ETFs that hold VHY, VIF, VGB etc.)
        // where the top-level Stocks/Bonds split is insufficient to determine the Aus vs Int breakdown.
        const geoMap: Record<string, number> = {};
        let geoClassifiedPct = 0;
        for (const h of (topHoldings.holdings || []).slice(0, 10)) {
          const pct = (h.holdingPercent || 0) * 100;
          if (pct <= 0) continue;
          const name = (h.holdingName || h.symbol || '').toLowerCase();
          let assetClass: string | null = null;

          if ((name.includes('australian') || name.includes(' aus ') || name.includes('aus share') || name.includes('high yield')) &&
              (name.includes('share') || name.includes('equity') || name.includes('high yield'))) {
            assetClass = 'Australian Shares';
          } else if ((name.includes('international') || name.includes('global') || name.includes('msci') || name.includes('world')) &&
                     (name.includes('share') || name.includes('equity') || name.includes('stock'))) {
            assetClass = 'International Shares';
          } else if ((name.includes('australian') || name.includes(' aus ') || name.includes('government bond')) &&
                     (name.includes('bond') || name.includes('fixed') || name.includes('credit') || name.includes('government'))) {
            assetClass = 'Australian Fixed Interest';
          } else if ((name.includes('international') || name.includes('global') || name.includes('world')) &&
                     (name.includes('bond') || name.includes('fixed') || name.includes('credit') || name.includes('income'))) {
            assetClass = 'International Fixed Interest';
          } else if (name.includes('property') || name.includes('real estate') || name.includes('reit')) {
            assetClass = (name.includes('australian') || name.includes(' aus ')) ? 'Australian Property' : 'International Property';
          } else if (name.includes('cash') || name.includes('money market')) {
            assetClass = 'Domestic Cash';
          } else if (name.includes('alternative') || name.includes('infrastructure')) {
            assetClass = 'Alternatives';
          }

          // Ticker-based fallback for Vanguard building-block ETFs.
          // Yahoo Finance often returns bare ASX symbols (VHY, VIF, VGB etc.) as sub-holding
          // identifiers for fund-of-funds (VDIF, VDHG etc.), with no holdingName supplied.
          // These symbols are well-known and their asset classes cannot change without a fund
          // restructure, so a lookup table is safe and 200% accurate.
          if (!assetClass) {
            // Strip common exchange suffixes: .AX (ASX), .L (London), etc.
            const sym = (h.symbol || '').replace(/\.\w+$/i, '').toUpperCase();
            const KNOWN_ETF_CLASS: Record<string, string> = {
              'VHY':  'Australian Shares',          // Vanguard Australian Shares High Yield ETF
              'VAS':  'Australian Shares',          // Vanguard Australian Shares Index ETF
              'VGS':  'International Shares',       // Vanguard MSCI Index International Shares ETF
              'VGE':  'International Shares',       // Vanguard Emerging Markets Shares Index ETF
              'VHYD': 'International Shares',       // Vanguard FTSE All-World High Dividend Yield ETF (London-listed)
              'VIF':  'International Fixed Interest',// Vanguard International Fixed Interest Index ETF (Hedged)
              'VGB':  'Australian Fixed Interest',  // Vanguard Australian Government Bond Index ETF
              'VAF':  'Australian Fixed Interest',  // Vanguard Australian Fixed Interest Index ETF
              'VCF':  'International Fixed Interest',// Vanguard International Credit Securities ETF (Hedged)
              'VAP':  'Australian Property',        // Vanguard Australian Property Securities Index ETF
            };
            assetClass = KNOWN_ETF_CLASS[sym] ?? null;
            if (assetClass) {
              console.log(`[Asset Allocation] Ticker lookup: ${sym} → ${assetClass} (${pct.toFixed(1)}%)`);
            }
          }

          if (assetClass) {
            geoMap[assetClass] = (geoMap[assetClass] || 0) + pct;
            geoClassifiedPct += pct;
          }
        }
        // Include cash position if not already captured from a named cash holding
        if (cashPct && cashPct > 0 && !geoMap['Domestic Cash']) {
          geoMap['Domestic Cash'] = cashPct;
          geoClassifiedPct += cashPct;
        }

        // Log what Yahoo Finance returned so we can diagnose classification failures
        console.log(`[Asset Allocation] ${normalisedTicker} topHoldings:`, {
          count: (topHoldings.holdings || []).length,
          firstFew: (topHoldings.holdings || []).slice(0, 4).map((h: any) => ({
            name: h.holdingName || null, symbol: h.symbol, pct: ((h.holdingPercent || 0) * 100).toFixed(1) + '%'
          })),
          geoClassifiedPct: geoClassifiedPct.toFixed(1) + '%',
          geoMap: Object.keys(geoMap).length > 0 ? geoMap : 'none',
        });

        // If 100% of holdings were classified across >1 asset class, return an authoritative geographic breakdown.
        // Claude must use these exact percentages instead of estimating.
        // We require full coverage because partial data (e.g. 57% for VDIF) silently drops large
        // asset classes like Domestic Fixed Interest and Property, producing inaccurate pie charts.
        // Morningstar always has the complete breakdown so we fall back there for anything less.
        if (geoClassifiedPct >= 100 && Object.keys(geoMap).length > 1) {
          const geoStr = Object.entries(geoMap)
            .sort((a, b) => b[1] - a[1])
            .map(([cls, pct]) => `${cls}: ${pct.toFixed(1)}%`)
            .join(', ');
          let subHoldingsContext = '';
          if (topHoldings.holdings && topHoldings.holdings.length > 0) {
            const topNames = topHoldings.holdings
              .slice(0, 10)
              .map((h: any) => `${h.holdingName || h.symbol} (${((h.holdingPercent || 0) * 100).toFixed(1)}%)`)
              .join(', ');
            subHoldingsContext = ` Underlying holdings: ${topNames}.`;
          }
          console.log(`[Asset Allocation] ✅ Geographic classification for ${normalisedTicker}: ${geoStr}`);
          return {
            description: `${fundName} (${normalisedTicker}) geographic asset allocation derived from underlying holdings analysis: ${geoStr}. CRITICAL: Use these EXACT geographic percentages to split this holding's dollar value across asset classes. Do NOT estimate, adjust, or override these values.${subHoldingsContext}`,
            sources: [`Yahoo Finance - ${normalisedTicker}`]
          };
        }

        // Geo classification did not meet threshold (sub-holding names/tickers were not classifiable,
        // e.g. Yahoo Finance returned short tickers like "VHY", "VGB" without full fund names).
        // Fall through to Morningstar, which has structured geographic portfolio data directly.
      }

      console.log(`[Asset Allocation] Yahoo Finance had no usable geographic data for ${normalisedTicker}, falling back to Morningstar`);
    } catch (error) {
      console.log(`[Asset Allocation] Yahoo Finance quoteSummary failed for ${normalisedTicker}:`, error instanceof Error ? error.message : error);
    }
  }

  // Morningstar: scrape the portfolio tab for structured geographic asset allocation.
  // Used for managed funds (no ticker) and ETFs where Yahoo Finance couldn't provide a geographic breakdown.
  console.log(`[Asset Allocation] Using Morningstar for ${fundName}`);
  return searchFundAssetAllocationMorningstar(fundName, ticker, fundManager);
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
  },
  {
    name: "get_portfolio_risk_data",
    description: "BATCH TOOL - Get ALL portfolio risk data in a single call. Returns expected returns, standard deviations (volatility), and complete correlation matrix for all specified asset classes. This is MUCH faster than calling individual tools - use this FIRST whenever you need data for multiple asset classes. Only fall back to individual search_asset_class_metrics or search_asset_class_correlation tools if you need to query a single specific value.",
    input_schema: {
      type: "object",
      properties: {
        asset_classes: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Array of asset class names present in the portfolio (e.g., ['Australian Shares', 'International Shares', 'Australian Fixed Interest']). Include ALL asset classes you need data for.",
        },
      },
      required: ["asset_classes"],
    },
  },
  {
    name: "search_holding_return",
    description: "FALLBACK TOOL - Fetch historical return data for a specific holding using Yahoo Finance when return data is NOT available in the portfolio documents. Use this for ALL holdings with a ticker symbol — including ASX ETFs (e.g. VDIF.AX, VCF.AX, VAS.AX, VGS.AX), direct shares (e.g. CBA.AX, BHP.AX), and US stocks (e.g. AAPL). Always add .AX suffix for ASX-listed holdings. Do NOT use search_fund_return_morningstar for any holding that has a stock ticker.",
    input_schema: {
      type: "object",
      properties: {
        holding_name: {
          type: "string",
          description: "Name of the holding (e.g., 'Commonwealth Bank', 'BHP Group')",
        },
        ticker: {
          type: "string",
          description: "Stock ticker symbol. IMPORTANT: For ASX stocks, MUST include .AX suffix (e.g., 'CBA.AX', 'BHP.AX'). For US stocks, use standard symbol (e.g., 'AAPL', 'MSFT').",
        },
        timeframe_period: {
          type: "string",
          description: "Exact time period string from the portfolio statement (e.g., '1 Jul 2024 to 30 Jun 2025' or '01/07/2024 to 30/06/2025'). Must include 'to' separator.",
        },
      },
      required: ["holding_name", "ticker", "timeframe_period"],
    },
  },
  {
    name: "search_fund_return_morningstar",
    description: "FALLBACK TOOL for managed funds - Fetch 1-year return from Morningstar.com.au when return data is NOT available in portfolio documents. Use ONLY for managed funds that have NO stock ticker (e.g. 'IOF0145AU', 'ETL7377AU' style APIR codes). Do NOT use this for ETFs or any holding with an ASX ticker (e.g. VDIF, VCF, VAS, VGS) — use search_holding_return instead. This tool is slower (30-60 seconds per fund) as it uses web scraping.",
    input_schema: {
      type: "object",
      properties: {
        fund_name: {
          type: "string",
          description: "Full managed fund name (e.g., 'Antipodes China Fund', 'Metrics Direct Income Fund')",
        },
        fund_manager: {
          type: "string",
          description: "Fund management company name (e.g., 'Antipodes Partners', 'Metrics Credit Partners')",
        },
        timeframe_period: {
          type: "string",
          description: "Exact time period string from the portfolio statement (e.g., '1 Jul 2024 to 30 Jun 2025'). Used for context but Morningstar returns most recent 1-year data.",
        },
        apir_code: {
          type: "string",
          description: "Optional APIR/Morningstar identifier code (pattern: 3 letters + 4 digits + 'AU', e.g., 'EVO2608AU', 'RIM0031AU', 'SCH0038AU'). When provided, enables direct lookup on Morningstar for accurate fund matching. Found in parentheses in fund names or in dedicated APIR/code columns.",
        },
      },
      required: ["fund_name", "fund_manager", "timeframe_period"],
    },
  },
  {
    name: "search_fund_asset_allocation",
    description: "Look up the underlying asset class allocation breakdown for a fund or ETF. Returns the percentage split across asset classes (stocks/equities, bonds/fixed interest, cash, alternatives). For ETFs with tickers, uses Yahoo Finance fund data. For managed funds without tickers, uses web search. IMPORTANT: Call this for EVERY fund that is diversified, balanced, or multi-asset (invests across multiple asset classes). This data is essential for accurate portfolio-level asset allocation.",
    input_schema: {
      type: "object",
      properties: {
        fund_name: {
          type: "string",
          description: "Full fund/ETF name (e.g., 'Vanguard Diversified Index Fund', 'Colonial FirstChoice Balanced')",
        },
        ticker: {
          type: "string",
          description: "Optional ticker symbol with exchange suffix (e.g., 'VDIF.AX' for ASX). Enables faster Yahoo Finance lookup.",
        },
        fund_manager: {
          type: "string",
          description: "Optional fund management company name (e.g., 'Vanguard', 'Colonial First Choice')",
        },
      },
      required: ["fund_name"],
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
      
      case 'get_portfolio_risk_data':
        result = await getPortfolioRiskData(
          toolInput.asset_classes
        );
        return `${result.description}\n\nSources: ${result.sources.join(', ') || 'None'}`;
      
      case 'search_holding_return':
        result = await searchHoldingReturn(
          toolInput.holding_name,
          toolInput.ticker,
          toolInput.timeframe_period
        );
        return `${result.description}\n\nSources: ${result.sources.join(', ') || 'None'}`;
      
      case 'search_fund_return_morningstar':
        result = await searchFundReturnMorningstar(
          toolInput.fund_name,
          toolInput.fund_manager,
          toolInput.timeframe_period,
          toolInput.apir_code
        );
        return `${result.description}\n\nSources: ${result.sources.join(', ') || 'None'}`;

      case 'search_fund_asset_allocation':
        result = await searchFundAssetAllocation(
          toolInput.fund_name,
          toolInput.ticker,
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
