# Morningstar Dropdown Button Bug

## Issue Summary
The Puppeteer script successfully navigates to Morningstar fund pages and handles the modal popup, but **fails to click the dropdown button** to switch from "Annual" to "Trailing" returns view.

**Status**: INVESTIGATING - ROOT CAUSE IDENTIFIED (as of Feb 26, 2026)

---

## 🔴 BREAKTHROUGH: Root Cause Identified

### Diagnostic Output
```json
{
  "totalButtons": 11,
  "mdsButtonCount": 0,
  "mdsButtonDetails": []
}
```

**CRITICAL FINDING**: The page loaded by Puppeteer has **ZERO** elements with class `mds-button__sal`!

This means the HTML structure you inspected in your browser is completely different from what Puppeteer sees when it loads the page.

### Likely Causes
1. **Responsive Design Mismatch**: Puppeteer defaults to a mobile viewport (~800x600), while you inspected desktop viewport
   - Desktop version: Shows `.mds-button__sal` dropdown
   - Mobile version: Might show completely different UI (hidden tabs, different controls)
   
2. **JavaScript Loading Timing**: The `.mds-button__sal` elements are added by JavaScript that hasn't executed yet when we check

3. **Bot Detection**: Morningstar might serve different HTML to headless browsers

---

## Error Timeline

### What Works ✅
1. **Brave Search Integration**: Successfully finds fund URLs via `site:morningstar.com.au`
2. **Fund ID Extraction**: Correctly parses fund IDs from URLs (e.g., `43791` for Metrics Direct Income Fund)
3. **Page Navigation**: Puppeteer navigates to `https://www.morningstar.com.au/investments/security/fund/{id}/performance`
4. **Modal Handling**: Successfully clicks "Individual Investor" button to dismiss initial popup

### What Fails ❌
5. **Dropdown Button Detection**: Cannot find the dropdown button to switch from "Annual" to "Trailing" view
6. **Table Load**: `.mds-table__sal` selector times out after 10000ms because view never switches

---

## Console Output Pattern
```
[Morningstar] Fetching return for Metrics Direct Income Fund (Metrics Credit Partners)
[Morningstar] Found fund ID: 43791
[Morningstar] Clicked Individual Investor button ✓
[Morningstar] Warning: Could not find dropdown button ✗
Error [TimeoutError]: Waiting for selector `.mds-table__sal` failed (10000ms)
```

**Result**: All 14 managed funds return `N/A` for returns data

---

## HTML Evidence (Provided by User)

After clicking the modal's "Individual Investor" button, the page structure shows:

### Hidden Desktop Tabs
```html
<div class="segment-band__tabs" style="display: none;">
  <button id="returnstrailing" ...>Trailing</button>
  <button id="returnsannual" ...>Annual</button>
</div>
```
**Note**: These tab buttons are completely hidden and cannot be clicked programmatically.

### Active Dropdown UI
```html
<button class="mds-button__sal mds-button--secondary__sal mds-button--small__sal" ...>
  <span class="mds-button__text__sal">
    <span>Annual</span>
  </span>
  <span aria-hidden="true">...</span>
</button>
```

### Popover Menu Structure
```html
<div class="mds-popover__sal" role="menu">  <!-- NOT .mds-popover--hidden__sal when visible -->
  <div class="mds-list-group__sal">
    <a class="mds-list-group__link__sal mds-list-group-item__sal">
      <span class="mds-list-group-item__text__sal">Annual</span>
    </a>
    <a class="mds-list-group__link__sal mds-list-group-item__sal">
      <span class="mds-list-group-item__text__sal">Trailing</span>
    </a>
  </div>
</div>
```

---

## Attempted Solutions

### Attempt 1: Direct Button Click (FAILED)
```typescript
const buttonClicked = await page.evaluate(() => {
  const button = document.getElementById('returnstrailing');
  if (button) {
    (button as HTMLButtonElement).click();
    return true;
  }
  return false;
});
```
**Result**: `Could not find Trailing button`  
**Root Cause**: Button element has `style="display: none;"`

---

### Attempt 2: XPath Expression (FAILED)
```typescript
const buttonClicked = await page.evaluate(() => {
  const xpath = "//button[contains(@id, 'returnstrailing') or contains(., 'Trailing')]";
  const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  const button = result.singleNodeValue as HTMLButtonElement;
  if (button) {
    button.click();
    return true;
  }
  return false;
});
```
**Result**: `Could not find Trailing button via XPath`  
**Root Cause**: Still targets hidden elements

---

### Attempt 3: Dropdown with `aria-haspopup` (FAILED)
```typescript
const dropdownOpened = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button'));
  const dropdownButton = buttons.find(btn => {
    return btn.textContent?.includes('Annual') && btn.getAttribute('aria-haspopup') === 'true';
  });
  
  if (dropdownButton) {
    dropdownButton.click();
    return true;
  }
  return false;
});
```
**Result**: `Could not find dropdown button`  
**Root Cause**: The actual dropdown button does NOT have `aria-haspopup="true"` attribute

---

### Attempt 4: Current Implementation (STILL FAILING)
**File**: `src/lib/webSearchTool.ts`, lines 545-595

```typescript
const dropdownOpened = await page.evaluate(() => {
  // Look for button with class mds-button__sal that contains "Annual" span
  const buttons = Array.from(document.querySelectorAll('button.mds-button__sal'));
  for (const button of buttons) {
    const spans = button.querySelectorAll('span');
    for (const span of spans) {
      if (span.textContent?.trim() === 'Annual') {
        (button as HTMLButtonElement).click();
        return true;
      }
    }
  }
  return false;
});

if (dropdownOpened) {
  console.log(`[Morningstar] Opened Annual dropdown`);
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Now click "Trailing" in the popover menu
  const menuItemClicked = await page.evaluate(() => {
    const popovers = Array.from(document.querySelectorAll('.mds-popover__sal'));
    for (const popover of popovers) {
      if (!popover.classList.contains('mds-popover--hidden__sal')) {
        const listItems = popover.querySelectorAll('.mds-list-group-item__sal');
        for (const item of listItems) {
          const textSpan = item.querySelector('.mds-list-group-item__text__sal');
          if (textSpan?.textContent?.trim() === 'Trailing') {
            const link = item.querySelector('.mds-list-group__link__sal') as HTMLElement;
            if (link) {
              link.click();
              return true;
            }
          }
        }
      }
    }
    return false;
  });
}
```

**Result**: `Could not find dropdown button` (never logs "Opened Annual dropdown")  
**Root Cause**: UNKNOWN - selector should match HTML structure but returns false

---

## Investigation Needed

### Hypothesis A: Timing Issue
**Theory**: JavaScript hasn't fully rendered the dropdown when we search for it  
**Test**: Increase wait time after modal click from current implicit timing to 2-3 seconds  
**Likelihood**: HIGH - modal animation might delay DOM updates

### Hypothesis B: Class Name Variations
**Theory**: Button might have additional/different classes than `mds-button__sal`  
**Test**: Log all button elements found and their classes/text content  
**Likelihood**: MEDIUM - user's HTML shows exact class, but might change dynamically

### Hypothesis C: Text Content Mismatch
**Theory**: "Annual" text might have hidden characters, whitespace, or Unicode issues  
**Test**: Log exact `textContent` of all spans within matching buttons  
**Likelihood**: MEDIUM - `trim()` should handle most whitespace

### Hypothesis D: Shadow DOM / iFrame
**Theory**: Dropdown might be in a shadow root or iframe after modal interaction  
**Test**: Check for shadow roots and iframe contexts  
**Likelihood**: LOW - user's HTML doesn't show shadow DOM structure

### Hypothesis E: Button Disabled State
**Theory**: Button exists but is disabled/unclickable when we try to interact  
**Test**: Check `disabled` attribute and computed styles  
**Likelihood**: LOW - would still return true from find operation

---

## Debugging Strategy

### Step 1: Add Diagnostic Logging
Modify the `page.evaluate()` to capture and return diagnostic information:

```typescript
const diagnostics = await page.evaluate(() => {
  const allButtons = Array.from(document.querySelectorAll('button'));
  const mdsButtons = Array.from(document.querySelectorAll('button.mds-button__sal'));
  
  return {
    totalButtons: allButtons.length,
    mdsButtons: mdsButtons.length,
    buttonDetails: mdsButtons.slice(0, 10).map(btn => ({
      classes: btn.className,
      text: btn.textContent?.substring(0, 100),
      spans: Array.from(btn.querySelectorAll('span')).map(s => s.textContent?.trim())
    }))
  };
});

console.log('[Morningstar] Button diagnostics:', JSON.stringify(diagnostics, null, 2));
```

### Step 2: Screenshot Capture
Take a screenshot before attempting the dropdown click:

```typescript
await page.screenshot({ 
  path: `morningstar-debug-${fundId}.png`,
  fullPage: true 
});
```

### Step 3: Extended Wait
Try waiting longer after modal click:

```typescript
console.log(`[Morningstar] Clicked Individual Investor button`);
await new Promise(resolve => setTimeout(resolve, 3000)); // Increased from ~0ms
```

### Step 4: Alternative Selector
Try combining multiple attributes:

```typescript
const buttons = Array.from(document.querySelectorAll('button[class*="mds-button"]'));
const dropdownButton = buttons.find(btn => {
  const hasSecondaryClass = btn.classList.contains('mds-button--secondary__sal');
  const containsAnnual = btn.textContent?.includes('Annual');
  return hasSecondaryClass && containsAnnual;
});
```

---

## Impact

**Affected Holdings**: 14 managed funds (100% of managed fund portfolio)
- Metrics Direct Income Fund (ID: 43791)
- Realm High Income Fund (ID: 40003)
- AQR Style Premia Alternative Fund (ID: 19089)
- Fairlight Emerging Companies Fund (ID: 19166)
- Platinum International Fund (ID: 0P00000WQF)
- PM Capital Global Companies Fund (ID: 16806)
- Russell Investments Hedged US Bond IQ Fund (ID: 0P0001KFLR)
- Schroder Global Value Fund (ID: 0P0001MCPQ)
- Schroder Real Return Fund (ID: 10695)
- Western Asset Australian Bond Fund (ID: 40084)
- Vanguard Australian Fixed Interest Index Fund (ID: 10062)
- Vanguard Global Aggregate Bond Index Fund (Hedged) (ID: 40015)
- Perennial Value Australian Shares Trust (ID: 10668)
- Perennial Value Microcap Opportunities Trust (ID: 10667)

**Business Impact**: Portfolio analysis cannot calculate accurate risk metrics or return attribution for 14/37 holdings (~38% of portfolio)

---

## Next Steps

1. ✅ **Document current state** (this file)
2. ⏳ **Add diagnostic logging** to understand what buttons exist on the page
3. ⏳ **Capture screenshot** to visually verify page state
4. ⏳ **Test with extended wait times** after modal interaction
5. ⏳ **Consider alternative approaches**:
   - Direct API calls to Morningstar (if available)
   - OCR on rendered page screenshots
   - Headful browser mode to manually verify interaction flow
   - Check if Morningstar has bot detection blocking automation

---

## Technical Context

- **Framework**: Next.js 16.1.6 (Turbopack)
- **Browser Automation**: Puppeteer 23.11.0
- **Search API**: Brave Search (fund URL discovery)
- **Launch Args**: `['--no-sandbox', '--disable-setuid-sandbox']`
- **Headless Mode**: `true`
- **Timeout**: 10000ms for table selector
- **Target URL Pattern**: `https://www.morningstar.com.au/investments/security/fund/{id}/performance`

---

## Related Files

- `src/lib/webSearchTool.ts` (lines 442-630): `searchFundReturnMorningstar()` implementation
- `src/lib/promptBuilder.ts`: Claude system prompt with Morningstar tool instructions
- `package.json`: Puppeteer dependency declaration

---

## User's HTML Reference

Full page HTML was provided showing the exact DOM structure after modal interaction. Key findings:
- Desktop tabs are hidden with `style="display: none;"`
- Mobile/responsive UI uses dropdown pattern with `.mds-button__sal` classes
- Popover visibility controlled by `.mds-popover--hidden__sal` class presence
- Menu items structured as: `.mds-list-group-item__sal` → `.mds-list-group__link__sal` → `.mds-list-group-item__text__sal`

The HTML structure appears correct based on user evidence, suggesting the issue is likely **timing/JavaScript initialization** rather than incorrect selectors.
