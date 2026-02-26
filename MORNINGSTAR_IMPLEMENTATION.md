# Morningstar Scraping Implementation Guide

## Overview
Implement web scraping to fetch 1-year returns for managed funds from Morningstar.com.au when data is not available in portfolio documents or via Yahoo Finance API.

---

## ✅ Completed Steps

### 1. Dependencies Installed
```bash
npm install puppeteer
```
- **Status**: ✅ Complete
- **Size**: ~300MB (includes Chromium)
- **Location**: `node_modules/puppeteer`

### 2. Import Added
- **File**: `src/lib/webSearchTool.ts`
- **Line**: 6
- **Code**: `import puppeteer from 'puppeteer';`
- **Status**: ✅ Complete

### 3. Data Validation
- **Confirmed**: HTML table data exists after JavaScript execution
- **Target Row**: "Investor Return %"
- **Target Column**: "1-Year" (4th column, index [3])
- **Example Value**: 14.84 for Antipodes China Fund
- **Table Class**: `.mds-table__sal`

---

## 🔨 Implementation Required

### Step 1: Add `searchFundReturnMorningstar()` Function

**File**: `src/lib/webSearchTool.ts`  
**Location**: After `searchHoldingReturn()` function (around line 430)

```typescript
/**
 * Search for managed fund return data using Morningstar website
 * FALLBACK ONLY - Use this when return data is not available for managed funds
 * Requires web scraping with Puppeteer since data is JavaScript-rendered
 * 
 * @param fundName - Name of the fund (e.g., "Antipodes China Fund")
 * @param fundManager - Fund management company (e.g., "Antipodes Partners")
 * @param timeframePeriod - Period string like "1 Jul 2024 to 30 Jun 2025"
 * @returns Object with return data and sources
 */
export async function searchFundReturnMorningstar(
  fundName: string,
  fundManager: string,
  timeframePeriod: string
): Promise<SearchResult> {
  let browser;
  try {
    console.log(`[Morningstar] Fetching return for ${fundName} (${fundManager})`);

    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Navigate to Morningstar search
    await page.goto('https://www.morningstar.com.au/', { waitUntil: 'networkidle2' });
    
    // Search for the fund
    const searchQuery = `${fundName} ${fundManager}`;
    await page.type('input[type="search"]', searchQuery);
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // Extract fund ID from first search result
    // Look for links matching /investments/security/fund/{id}
    const fundLink = await page.$eval(
      'a[href*="/investments/security/fund/"]', 
      (el) => el.getAttribute('href')
    );
    
    if (!fundLink) {
      await browser.close();
      return {
        description: `No Morningstar data found for ${fundName}. Fund may not be listed on Morningstar.`,
        sources: []
      };
    }
    
    // Extract fund ID from URL
    const fundIdMatch = fundLink.match(/\/fund\/(\d+)/);
    if (!fundIdMatch) {
      await browser.close();
      return {
        description: `Unable to extract fund ID for ${fundName} from Morningstar.`,
        sources: []
      };
    }
    
    const fundId = fundIdMatch[1];
    const performanceUrl = `https://www.morningstar.com.au/investments/security/fund/${fundId}/performance`;
    
    // Navigate to performance page
    await page.goto(performanceUrl, { waitUntil: 'networkidle2' });
    
    // Wait for performance table to load
    await page.waitForSelector('.mds-table__sal', { timeout: 10000 });
    
    // Extract 1-year return from "Investor Return %" row
    const investorReturn = await page.evaluate(() => {
      const tables = document.querySelectorAll('.mds-table__sal');
      
      for (const table of tables) {
        const rows = table.querySelectorAll('tbody tr');
        
        for (const row of rows) {
          const headerCell = row.querySelector('th');
          if (headerCell?.textContent?.includes('Investor Return %')) {
            // Get the 1-Year column (4th data cell)
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
              const oneYearValue = cells[3].textContent?.trim();
              return oneYearValue;
            }
          }
        }
      }
      return null;
    });
    
    await browser.close();
    
    if (!investorReturn || investorReturn === '—' || investorReturn === '') {
      return {
        description: `No 1-year return data available for ${fundName} on Morningstar.`,
        sources: [`Morningstar - Fund ID ${fundId}`]
      };
    }
    
    // Parse the return value
    const returnValue = parseFloat(investorReturn);
    if (isNaN(returnValue)) {
      return {
        description: `Unable to parse return data for ${fundName}. Found value: ${investorReturn}`,
        sources: [`Morningstar - Fund ID ${fundId}`]
      };
    }
    
    const description = `${fundName} (${fundManager}): 1-year Investor Return is ${returnValue.toFixed(2)}% for the period ending most recently reported. Data retrieved from Morningstar performance table.`;
    
    return {
      description,
      sources: [`Morningstar - ${performanceUrl}`]
    };
    
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error(`[Morningstar] Error fetching return for ${fundName}:`, error);
    return {
      description: `Failed to retrieve Morningstar data for ${fundName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sources: []
    };
  }
}
```

---

### Step 2: Add Tool Definition to `SEARCH_TOOLS` Array

**File**: `src/lib/webSearchTool.ts`  
**Location**: Inside `SEARCH_TOOLS` array (around line 600, after `search_holding_return`)

```typescript
{
  name: "search_fund_return_morningstar",
  description: "FALLBACK TOOL for managed funds - Fetch 1-year return from Morningstar.com.au when return data is NOT available in portfolio documents and the fund has no ticker symbol for Yahoo Finance. Use ONLY for managed funds without stock tickers. Requires web scraping so it's slower (3-5 seconds per fund).",
  input_schema: {
    type: "object",
    properties: {
      fund_name: {
        type: "string",
        description: "Full managed fund name (e.g., 'Antipodes China Fund', 'Metrics Direct Income Fund')"
      },
      fund_manager: {
        type: "string",
        description: "Fund management company name (e.g., 'Antipodes Partners', 'Metrics Credit Partners')"
      },
      timeframe_period: {
        type: "string",
        description: "Exact time period string from the portfolio statement (e.g., '1 Jul 2024 to 30 Jun 2025'). Used for context but Morningstar returns most recent 1-year data."
      }
    },
    required: ["fund_name", "fund_manager", "timeframe_period"]
  }
}
```

---

### Step 3: Add Case to `executeSearchTool()` Switch

**File**: `src/lib/webSearchTool.ts`  
**Location**: Inside `executeSearchTool()` function switch statement (around line 650, after `search_holding_return` case)

```typescript
case 'search_fund_return_morningstar':
  result = await searchFundReturnMorningstar(
    toolInput.fund_name,
    toolInput.fund_manager,
    toolInput.timeframe_period
  );
  return `${result.description}\n\nSources: ${result.sources.join(', ') || 'None'}`;
```

---

### Step 4: Update Claude System Prompt

**File**: `src/lib/promptBuilder.ts`  
**Location**: In STEP 3 prompt, after Yahoo Finance fallback instructions (around line 200)

**Find this section:**
```typescript
For stocks and ETFs with ticker symbols, use the search_holding_return tool to get actual returns from Yahoo Finance...
```

**Add after it:**
```typescript

MORNINGSTAR FALLBACK (for Managed Funds):
- If a holding is a MANAGED FUND without a ticker symbol (e.g., "Metrics Direct Income Fund", "Realm High Income Fund", "Antipodes China Fund")
- AND no return data is present in the portfolio documents
- Use the search_fund_return_morningstar tool
- Example: search_fund_return_morningstar("Antipodes China Fund", "Antipodes Partners", "24 Feb 2025 to 24 Feb 2026")
- This tool scrapes Morningstar.com.au and is slower (3-5 seconds) but covers managed funds not on Yahoo Finance
- ONLY use for managed funds - stocks/ETFs should use Yahoo Finance
```

---

## 📋 Technical Details

### URL Patterns
- **Search**: `https://www.morningstar.com.au/`
- **Fund Page**: `https://www.morningstar.com.au/investments/security/fund/{id}/performance`
- **Example**: `https://www.morningstar.com.au/investments/security/fund/13186/performance` (Antipodes China Fund)

### HTML Selectors
- **Table**: `.mds-table__sal`
- **Target Row**: `<th>` containing "Investor Return %"
- **Target Column**: 4th `<td>` element (index [3] = 1-Year column)
- **Value Format**: String like "14.84" or "—" (em dash for no data)

### Performance Characteristics
- **Time per fund**: 3-5 seconds
- **14 managed funds**: ~42-70 seconds total added to analysis
- **Memory**: ~100MB RAM per browser instance
- **Success rate**: Depends on fund availability on Morningstar

### Error Handling
- Fund not found in search → Return "No data found"
- Table doesn't load → Timeout error, return failure message
- Value is "—" → Return "No data available"
- Can't parse number → Return error with raw value

---

## 🎯 Expected Impact

### Funds That Will Show Returns (Currently N/A)
1. Metrics Direct Income Fund
2. Realm High Income Fund
3. Antipodes China Fund
4. ~11 other managed funds (14 total)

### User Experience
- Analysis time increases by ~1 minute for portfolios with managed funds
- Console will show: `[Morningstar] Fetching return for {fund name}`
- More complete performance data in final report

---

## 🚨 Important Notes

### Terms of Service
- Morningstar ToS Section 2(a): Prohibits "systematically copy substantial parts"
- **Our approach**: Single return value per fund for client portfolio analysis
- **User acceptance**: User confirmed this is minimal data extraction for legitimate use

### Browser Configuration
```typescript
headless: true,  // Run without UI
args: ['--no-sandbox', '--disable-setuid-sandbox']  // Docker/Linux compatibility
```

### Alternative Considered
- **PDF Extraction**: Check if portfolio PDFs already contain managed fund performance
- **Decision**: User wants Morningstar scraping despite complexity

---

## 🧪 Testing Steps

1. **Test with known fund**:
   - Fund: "Antipodes China Fund"
   - Manager: "Antipodes Partners"
   - Expected: ~14.84% return

2. **Test with non-existent fund**:
   - Should return "No data found" gracefully

3. **Test full integration**:
   - Upload portfolio with managed funds
   - Verify returns populate in UI
   - Check console logs for Morningstar calls

4. **Performance test**:
   - Time a full analysis with 14 managed funds
   - Should complete within 2-3 minutes total

---

## 📚 Files to Modify

| File | Lines to Add/Modify | Purpose |
|------|---------------------|---------|
| `src/lib/webSearchTool.ts` | ~100 lines | Add function, tool definition, switch case |
| `src/lib/promptBuilder.ts` | ~10 lines | Add Morningstar fallback instructions |

---

## ✅ Checklist for Next Session

- [ ] Add `searchFundReturnMorningstar()` function
- [ ] Add tool definition to `SEARCH_TOOLS`
- [ ] Add switch case to `executeSearchTool()`
- [ ] Update `promptBuilder.ts` STEP 3 prompt
- [ ] Test with Antipodes China Fund
- [ ] Verify all 14 managed funds get returns
- [ ] Check analysis completion time
- [ ] Review console logs for errors

---

**Last Updated**: February 26, 2026  
**Status**: Ready for implementation  
**Estimated Implementation Time**: 15-20 minutes
