# VCF Morningstar Allocation Page - Not Rendering Data

## Problem
The Morningstar portfolio page for VCF (Vanguard Intl Credit Secs Hdg ETF) loads the correct URL and page title, but the asset allocation table/component never renders in Puppeteer.

## What Works
- Managed funds using `/investments/security/fund/{numericId}/portfolio` work perfectly:
  - Janus Henderson → `/fund/17406/portfolio` → ✅ extracted allocation
  - GQG Partners → `/fund/43212/portfolio` → ✅ extracted allocation
  - Barrow Hanley → `/fund/40544/portfolio` → ✅ extracted allocation
- These all use **numeric IDs** found via Brave Search

## What Fails
- VCF uses `/investments/security/ASX/VCF/portfolio` (ticker-based URL, not numeric ID)
- Brave Search returns **no results** for VCF on Morningstar (both queries tried):
  1. `"Vanguard Intl Credit Secs (Hdg) ETF VCF.AX site:morningstar.com.au"` → nothing
  2. `"VCF site:morningstar.com.au"` → nothing
- The `/ASX/VCF/portfolio` page loads with correct title: `"Vanguard Intl Credit Secs (Hdg) ETF (ASX:VCF) Portfolio | Morningstar"`
- But after 40s wait, **page body is only navigation text** — no allocation component rendered
- Debug output:
  ```json
  {
    "hasTables": 2,
    "url": "https://www.morningstar.com.au/investments/security/ASX/VCF/portfolio",
    "bodyText": "Morningstar Investor clients please sign in here.\nSkip to Content\nSearch\nTry Morningstar Investor..."
  }
  ```
- `percentageLines: []` — zero percentage data visible
- The 2 tables present are likely nav/layout tables (don't match `sal-mip-asset-allocation__assetTable`, `[class*="mds-table"]`, or `table[summary]`)

## Key Observation
The `/fund/{numericId}/portfolio` URL pattern renders the allocation component.
The `/ASX/{ticker}/portfolio` URL pattern loads the page shell but the allocation component **does not render**.

## Hypothesis
ETFs accessed via the `/ASX/{ticker}` URL pattern use a different component set than `/fund/{numericId}` pages. The allocation widget (`sal-mip-asset-allocation`) may only be available on the numeric ID pages.

## Possible Solutions
1. **Find VCF's numeric Morningstar ID** — navigate to `/ASX/VCF` overview page first, extract a link containing `/fund/{numericId}` or `/etf/{numericId}`, then navigate to that page's `/portfolio` tab
2. **Use Morningstar's internal search** — navigate to `morningstar.com.au` search, type "VCF", find the fund page with numeric ID
3. **Better Brave Search queries** — try broader queries like `"Vanguard Credit Securities morningstar.com.au"` (without `site:` restriction or abbreviations)
4. **Wait for different selectors** — the ASX page might use different class names for its allocation table
5. **Check if the page requires scrolling** — the allocation component might be lazy-loaded below the fold

## Context
- VDIF (similar Vanguard ETF) is now resolved via Yahoo Finance ticker lookup (57.6% classified from sub-holdings VHY, VHYD, VCF, VIF)
- VCF on Yahoo Finance only returns 1 sub-holding (Euro Schatz Future, 0.2%) — useless for classification
- VCF is essentially 100% International Fixed Interest, but we need Morningstar to confirm this with actual data

## Tech Stack
- Puppeteer (puppeteer-core + @sparticuz/chromium-min on Vercel)
- Brave Search API for finding Morningstar URLs
- The scraper handles Morningstar's "Individual Investor" → "Confirm" modal flow
