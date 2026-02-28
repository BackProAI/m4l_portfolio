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

    // Retry logic for ETXTBSY race condition during concurrent chromium extraction
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
        if (isETXTBSY && attempt < MAX_RETRIES) {
          const delay = 1000 * attempt; // Exponential backoff: 1s, 2s
          console.warn(`[Browser] ETXTBSY error on attempt ${attempt}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error; // Re-throw if not ETXTBSY or out of retries
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
  timeframePeriod: string
): Promise<SearchResult> {
  let browser;
  try {
    console.log(`[Morningstar] Fetching return for ${fundName} (${fundManager})`);

    // Step 1: Use Brave Search to find the Morningstar fund page
    if (!process.env.BRAVE_SEARCH_API_KEY) {
      console.warn('Brave Search API key not configured');
      return {
        description: `${fundName} - Morningstar data not available (API key not configured)`,
        sources: [],
      };
    }

    const searchQuery = `${fundName} ${fundManager} site:morningstar.com.au`;
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

    if (!searchResponse.ok) {
      throw new Error(`Brave Search API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const results = searchData.web?.results || [];

    // Step 2: Extract fund ID from Morningstar URL
    let fundId: string | null = null;
    let foundUrl: string | null = null;

    for (const result of results) {
      const url = result.url || '';
      // Look for /investments/security/fund/{id} pattern
      const fundIdMatch = url.match(/\/investments\/security\/fund\/(\d+)/);
      if (fundIdMatch) {
        fundId = fundIdMatch[1];
        foundUrl = url;
        break;
      }
    }

    if (!fundId) {
      return {
        description: `No Morningstar listing found for ${fundName} (${fundManager}). Fund may not be available on Morningstar.com.au.`,
        sources: [],
      };
    }

    console.log(`[Morningstar] Found fund ID: ${fundId}`);

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
              await new Promise(resolve => setTimeout(resolve, 3000));
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
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
    } catch (e) {
      console.log(`[Morningstar] Error handling modal:`, e);
    }

    // DIAGNOSTIC: Log what content exists on the page
    const diagnostics = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const mcaButtons = Array.from(document.querySelectorAll('button.mds-button__mca-dfd'));
      const salButtons = Array.from(document.querySelectorAll('button.mds-button__sal'));
      
      return {
        url: window.location.href,
        totalButtons: allButtons.length,
        mcaButtonCount: mcaButtons.length,
        salButtonCount: salButtons.length,
        hasPerformanceContent: !!document.querySelector('.segment-band__tabs'),
        hasAnyTable: !!document.querySelector('table'),
        hasMdsTable: !!document.querySelector('.mds-table__sal') || !!document.querySelector('.mds-table__mca-dfd'),
        bodyClasses: document.body.className,
        buttonSample: allButtons.slice(0, 3).map(btn => ({
          text: btn.textContent?.trim().substring(0, 50),
          classes: btn.className
        }))
      };
    });
    console.log(`[Morningstar] PAGE STATE:`, JSON.stringify(diagnostics, null, 2));

    // Switch from "Annual" to "Trailing" returns view
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Additional wait for page elements to be ready
      
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
        await new Promise(resolve => setTimeout(resolve, 2500));
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
          await new Promise(resolve => setTimeout(resolve, 800)); // Wait for popover menu to appear
          
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
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for table to reload
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

    // Wait for performance table to load (check both class variants)
    // Increased timeout to 60s to handle slow page renders during cold start + concurrent scraping
    try {
      await page.waitForSelector('[class*="mds-table"]', { timeout: 60000 });
      console.log(`[Morningstar] Performance table loaded`);
    } catch (err) {
      console.log(`[Morningstar] Table timeout after 60s - checking what exists...`);
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

    // Extract 1-year return from "Investor Return %" row
    const investorReturn = await page.evaluate(() => {
      const tables = document.querySelectorAll('[class*="mds-table"]');
      console.log(`[Morningstar Extract] Found ${tables.length} tables`);

      for (const table of tables) {
        const rows = table.querySelectorAll('tbody tr');
        console.log(`[Morningstar Extract] Table has ${rows.length} rows`);

        for (const row of rows) {
          const headerCell = row.querySelector('th');
          const headerText = headerCell?.textContent?.trim();
          
          if (headerText?.includes('Investor Return')) {
            console.log(`[Morningstar Extract] Found "Investor Return" row: ${headerText}`);
            
            // Get the 1-Year column (4th data cell, index 3)
            const cells = row.querySelectorAll('td');
            console.log(`[Morningstar Extract] Row has ${cells.length} cells`);
            
            if (cells.length >= 4) {
              const oneYearValue = cells[3].textContent?.trim();
              console.log(`[Morningstar Extract] Extracted 1-year value: ${oneYearValue}`);
              return oneYearValue;
            } else {
              console.log(`[Morningstar Extract] Not enough cells in row`);
            }
          }
        }
      }
      console.log(`[Morningstar Extract] No "Investor Return" row found`);
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
    console.error(`[Morningstar] Error fetching return for ${fundName}:`, error);
    return {
      description: `Failed to retrieve Morningstar data for ${fundName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sources: [],
    };
  }
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
    description: "FALLBACK TOOL - Fetch historical return data for a specific holding using Yahoo Finance when return data is NOT available in the portfolio documents. Use this ONLY when the portfolio does not contain return/performance data for a holding. Requires ticker symbol (e.g., 'CBA.AX' for Australian stocks - always add .AX suffix for ASX stocks, 'AAPL' for US stocks) and the exact time period from the portfolio statement.",
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
    description: "FALLBACK TOOL for managed funds - Fetch 1-year return from Morningstar.com.au when return data is NOT available in portfolio documents and the fund has no ticker symbol for Yahoo Finance. Use ONLY for managed funds without stock tickers. This tool is slower (3-5 seconds per fund) as it uses web scraping.",
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
      },
      required: ["fund_name", "fund_manager", "timeframe_period"],
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
          toolInput.timeframe_period
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
