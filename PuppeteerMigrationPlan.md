---
title: Puppeteer / Morningstar Migration Plan (Vercel-Compatible)
---

## 1. Problem Statement (200% Clarity)

- **Current behaviour**
  - `src/lib/webSearchTool.ts` uses `puppeteer` inside `searchFundReturnMorningstar` to:
    - Find a Morningstar fund page via Brave Search.
    - Launch a headless Chrome instance.
    - Navigate to the performance tab.
    - Handle the “Individual Investor” modal.
    - Extract 1‑year “Investor Return” for the fund and derive an actual timeframe.
  - This works **locally** because Puppeteer can download / find a Chrome binary.

- **Production issue on Vercel**
  - Error: `Could not find Chrome (ver. 145.0.7632.77)...`
  - Meaning: On Vercel’s serverless runtime, there is **no Chrome binary** at the default Puppeteer cache path, so `puppeteer.launch()` fails.
  - Scope of impact: Only the code paths that rely on `puppeteer` (specifically `searchFundReturnMorningstar` and anything that might share that `puppeteer` import).

- **What we are NOT changing**
  - The **user‑visible behaviour**: “If the portfolio has no returns for a managed fund, call Morningstar to fetch 1‑year return + timeframe”.
  - The **DOM-selection / scraping logic** in `searchFundReturnMorningstar`.
  - The overall API contract of `searchFundReturnMorningstar` and `executeSearchTool`.

## 2. Chosen Approach (with Alternatives Considered)

- **Chosen approach**
  - Replace direct `puppeteer` usage with:
    - `puppeteer-core` (browser‑control only, no bundled Chrome).
    - `@sparticuz/chromium-min` (prebuilt headless Chromium binary for serverless platforms).
  - Introduce a small `launchBrowser()` helper that:
    - In **Vercel / production**, launches Chromium using `chromium.executablePath`, `chromium.args`, `chromium.headless`, etc.
    - In **local dev**, uses a simpler `puppeteer-core.launch({ headless: true })`, assuming a local Chrome/Chromium installation.

- **Why this is correct**
  - Vercel officially supports this pattern for headless Chrome in serverless functions.
  - We control the **executable path**, so we are no longer dependent on Puppeteer’s cache.
  - Behaviour at the TypeScript / business‑logic level remains unchanged; only the Chrome bootstrap changes.

- **Alternatives (explicitly not chosen for now)**
  - **Alternative 1: Keep full `puppeteer` and pre‑install Chrome in Vercel build**
    - Would require non‑standard build hooks and is brittle against image/runtime changes.
  - **Alternative 2: External scraping microservice (VM / container / browserless / Playwright as a Service)**
    - Adds infra complexity, network latency, additional failure modes, and hosting cost.
  - **Alternative 3: Replace scraping with a commercial data API**
    - Requires contracts, credentials, and probably paid access; out of scope for this immediate fix.

Given the constraints, `puppeteer-core + @sparticuz/chromium-min` is the most direct, Vercel‑aligned solution with minimal surface area change.

## 3. Concrete Implementation Steps

### 3.1. Dependencies

1. **Add new runtime dependencies**
   - Install:
     - `puppeteer-core`
     - `@sparticuz/chromium-min`
   - Command (for reference, not yet executed here):
     - `npm install puppeteer-core @sparticuz/chromium-min`

2. **(Optional, later) Remove unused `puppeteer`**
   - Once the migration is complete and confirmed working in production, remove the original `puppeteer` dependency from `package.json` if nothing else uses it.

### 3.2. Code Changes in `src/lib/webSearchTool.ts`

**Location of changes**
- File: `src/lib/webSearchTool.ts`
- Existing import: `import puppeteer from 'puppeteer';`
- Existing launch site: inside `searchFundReturnMorningstar`, line with:
  - `browser = await puppeteer.launch({ ... });`

#### Step 3.2.1. Update imports

- Replace:
  - `import puppeteer from 'puppeteer';`
- With:
  - `import puppeteerCore from 'puppeteer-core';`
  - `import chromium from '@sparticuz/chromium-min';`

**Side‑effect analysis**
- No behavioural change yet; only the symbol references differ.
- All subsequent code using `puppeteer` must be updated to `puppeteerCore` or the new helper in the next step.

#### Step 3.2.2. Add a `launchBrowser()` helper

- Just **above** `export async function searchFundReturnMorningstar(...)`, add:
  - `async function launchBrowser() { ... }` that:
    - Detects serverless/production via `process.env.VERCEL` or `process.env.NODE_ENV === 'production'`.
    - In serverless:
      - `const executablePath = await chromium.executablePath;`
      - `return puppeteerCore.launch({ args: chromium.args, defaultViewport: chromium.defaultViewport, executablePath, headless: chromium.headless });`
    - In local dev:
      - `return puppeteerCore.launch({ headless: true });`

**Side‑effect analysis**
- No call sites altered yet; this is additive.
- In production, we gain an explicit, deterministic way to locate Chromium.
- In local dev, we continue to rely on a locally available Chrome/Chromium binary, which is equivalent to today’s setup.

#### Step 3.2.3. Replace direct `puppeteer.launch` usage

- Inside `searchFundReturnMorningstar`, change:
  - `browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'], });`
- To:
  - `browser = await launchBrowser();`

**Notes / optional considerations**
- If we want to keep the `--no-sandbox` flags in production (which is often recommended in container/serverless contexts), we can:
  - Either rely on `chromium.args` (which already includes safe defaults).
  - Or, in the local branch, add `args: ['--no-sandbox', '--disable-setuid-sandbox']` for consistency.

**Side‑effect analysis**
- This is the only functional switch:
  - Before: Puppeteer tries to find/download its own Chrome.
  - After: We explicitly tell Puppeteer where Chromium lives on Vercel, eliminating the “Could not find Chrome” issue.
- All scraping logic (navigation, selectors, parsing, logging) remains untouched.

### 3.3. Environment & Runtime Considerations

1. **Ensure Node.js runtime (not edge)**
   - Confirm the `/api/analyze` route (and any other route calling `searchFundReturnMorningstar`) is:
     - Using the Node.js runtime, **not** `edge`.
   - This is already effectively true (Puppeteer was running before), but we should avoid any future refactor to edge for these routes.

2. **Vercel build & deploy**
   - No additional Vercel build hooks are required; `@sparticuz/chromium-min` ships its own binary and is compatible with serverless.
   - After code changes, trigger a new deployment and verify logs.

## 4. Testing Plan (Local & Vercel)

### 4.1. Local Testing

1. **Unit / smoke test for `searchFundReturnMorningstar`**
   - Run a local API call or a small script that:
     - Invokes `searchFundReturnMorningstar` with a known fund + manager + timeframe.
     - Verifies we still get a numeric return and a sensible timeframe string.
   - Confirm:
     - No regression in behaviour compared to pre‑change.
     - Logs show successful navigation + extraction.

2. **Portfolio flow test**
   - Run the full local flow:
     - Upload a portfolio where at least one managed fund has no returns in the document.
     - Ensure:
       - The system falls back to Morningstar.
       - The client sees the enriched performance in the analysis output.

### 4.2. Vercel Testing

1. **Deploy to a preview environment**
   - Push branch with changes and let Vercel create a preview deployment.

2. **Repeat the same portfolio flow**
   - Use the same test document(s) that triggered Morningstar locally.
   - Verify:
     - No `Could not find Chrome` errors in logs.
     - `searchFundReturnMorningstar` logs show successful scraping.
     - Analysis output includes the fetched 1‑year return and correct timeframe.

3. **Monitor cold‑start / latency**
   - Observe whether the additional binary size / startup time is acceptable.
   - If latency is high, consider caching or timeouts as a follow‑up task (not part of this initial fix).

## 5. Risk Assessment & Rollback

### 5.1. Risks

- **Risk 1: Local environment lacks a Chrome/Chromium binary**
  - Symptom: `puppeteer-core.launch()` fails locally after migration.
  - Mitigation:
    - Either install Chrome/Chromium locally.
    - Or enhance the local branch of `launchBrowser()` to use `chromium.executablePath` as well.

- **Risk 2: Chromium flags or executablePath differ on Vercel**
  - Symptom: Launch fails despite using `@sparticuz/chromium-min`.
  - Mitigation:
    - Log the resolved `executablePath` and args in non‑production environments to confirm.
    - Adjust flags only if necessary, following `@sparticuz/chromium-min` docs.

- **Risk 3: Increased function duration**
  - Morningstar scraping is inherently slower (3–5 seconds per fund).
  - Mitigation:
    - Ensure Vercel function timeout is sufficient (current `maxDuration` in `/api/analyze` is already high).
    - Optionally limit the number of funds we scrape per request as a future optimisation.

### 5.2. Rollback Plan

If any unforeseen production issue appears after deployment:

1. **Immediate rollback**
   - Revert:
     - The import change in `src/lib/webSearchTool.ts`.
     - The `launchBrowser()` helper.
     - The `puppeteer.launch` call back to the original version.
   - Deploy the revert to restore the previous (locally working) semantics.

2. **Post‑mortem**
   - Capture:
     - Exact error messages from Vercel logs.
     - Whether the failure was at launch, navigation, or DOM parsing.
   - Re‑evaluate whether to:
     - Refine the `chromium` configuration, or
     - Move Morningstar scraping to an external service as a more robust long‑term solution.

## 6. Next Steps / Review Checklist

Before making code changes, confirm:

- [ ] You agree that using `puppeteer-core + @sparticuz/chromium-min` in `searchFundReturnMorningstar` is the right immediate fix.
- [ ] No other file besides `src/lib/webSearchTool.ts` currently imports and depends on `puppeteer` in a way that would conflict with this change.
- [ ] You’re comfortable with the local‑vs‑production logic in `launchBrowser()` (we can tweak the environment detection rule if desired).

After agreement, we can implement the exact diff described in Section 3, then follow the test plan in Section 4.

