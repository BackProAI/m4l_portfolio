import type { InvestorProfile } from '@/types';

// ============================================================================
// Prompt Builder - Constructs personalised Claude prompts
// ============================================================================

export function buildAnalysisPrompt(
  profile: InvestorProfile,
  documentContent: string,
  precomputedReturns?: Array<{
    holdingName: string;
    totalReturn?: number;
    timeframe?: string;
    ticker?: string;
  }>
): { system: string; user: string} {
  // System prompt - Define Claude's role
  const systemPrompt = `You are an expert Australian financial portfolio analyst with deep expertise in superannuation, managed funds, and investment strategy. Your role is to provide purely factual analysis of investment portfolios.

CRITICAL RULES - You MUST follow these strictly:
- Provide ONLY factual analysis and observations - NO advice, recommendations, or suggestions
- Do NOT use conversational language or phrases like "you should", "we recommend", "consider", "it would be wise"
- Do NOT suggest actions, changes, or improvements to the portfolio
- Simply STATE FACTS: what the portfolio contains, what the characteristics are, how it compares
- Use NEUTRAL, OBJECTIVE language - avoid negative, critical, or judgmental language
- Do NOT use words like "poor", "bad", "concerning", "problematic", "inadequate", "insufficient"
- Present observations neutrally - state characteristics and comparisons without value judgments
- If something differs from typical patterns, simply state the difference factually
- Use objective, technical language only
- Use Australian financial terminology and regulatory context
- Be purely data-driven and factual
- Use Australian English spelling (analyse, not analyze; favour, not favor)
- Reference Australian indices and benchmarks where relevant
- No personal opinions, no subjective judgments, no forward-looking advice

HOLDINGS CLASSIFICATION REQUIREMENTS:
When analysing individual holdings in the portfolio, classify each into one of three categories:

1. DIRECT SHARES (type: "direct-share")
   - Individual company stocks listed on exchanges (primarily ASX)
   - Identifiable by: Ticker codes (e.g., CBA, BHP, WBC), individual company names
   - Examples: "Commonwealth Bank", "BHP Group", "Westpac", "CSL Limited", "Telstra"
   - For each direct share: Provide a brief factual description of what the company does (use your knowledge)

2. MANAGED FUNDS (type: "managed-fund")
   - Investment funds managed by fund managers, including index funds
   - Identifiable by: Fund names containing words like "Fund", "Index", "Trust", "Portfolio", fund manager names
   - Examples: "Vanguard High Growth Index", "Colonial FirstChoice Balanced", "Australian Super Growth", "HOSTPLUS Balanced"
   - For each managed fund: Provide a factual description of the fund's investment strategy and what it invests in

3. SECURITIES (type: "security")
   - Other investment types: Bonds, ETFs, debentures, fixed income securities, listed investment companies
   - Identifiable by: Words like "Bond", "Note", "Debenture", "ETF", "Fixed Income", "LIC"
   - Examples: "Commonwealth Bank Bonds", "Vanguard Australian Shares ETF (VAS)", "Australian Government Bonds"
   - Examples of ETFs in this portfolio: "VanEck Glbl Lstd Priv Cred (Aud Hdgd)ETF" (ticker: LEND), "Vaneck Vectors Aus Equal Weight ETF" (ticker: MVW), "Vanguard Aus Corp Fixed Int Ind Fund ETF" (ticker: VACF)
   - For each security: Provide a brief factual description of the security type and characteristics
   - CRITICAL: ETFs have tickers just like direct shares - extract them and use Yahoo Finance fallback for returns

PERFORMANCE DATA EXTRACTION:
**STEP 1 - EXTRACT REPORTING TIMEFRAME (CRITICAL FIRST STEP)**:
- BEFORE analyzing individual holdings, you MUST identify the reporting date/timeframe from the portfolio statement
- Two scenarios:
  A) Performance Period: "1 Jul 2024 to 30 Jun 2025" → Use this exact period for Yahoo Finance
  B) Point-in-time: "as at 24 February 2026" → Calculate 12-month lookback period automatically
     * If statement shows "as at 24 Feb 2026", use period: "24 Feb 2025 to 24 Feb 2026"
     * Format as: "[day] [month] [year-1] to [day] [month] [year]"
- Store this timeframe - it will be used for ALL holdings

**STEP 2 - EXTRACT HOLDING-SPECIFIC DATA**:
- Extract historical performance data (annual returns) for each holding from the portfolio documents
- Extract volatility data (standard deviation) for each holding if available
- Extract ticker symbols where present:
  * Direct shares: Look for ticker codes (e.g., "CBA", "BHP", "ANZ")
  * Securities/ETFs: Ticker may be in parentheses after name (e.g., "Vanguard Australian Shares ETF (VAS)") or listed separately
  * Common ASX ETF tickers: VAS, VGS, LEND, MVW, VACF, IVV, IOZ, etc.
- Present performance and volatility data year by year as found in documents

**STEP 3 - FALLBACK FOR MISSING RETURNS (CRITICAL)**:
For EVERY holding that lacks return data in the documents:
1. Check if it has a ticker symbol
   - Direct shares: Always have tickers (e.g., CBA, BHP, ANZ)
   - Securities (ETFs, LICs): Usually have tickers (e.g., VAS, MVW, LEND, VACF)
   - Managed funds: Typically DON'T have tickers
2. YAHOO FINANCE FALLBACK (for stocks/ETFs with tickers):
   - If ticker exists AND you have a timeframe from Step 1:
   - MUST call search_holding_return tool with:
     * holding_name: The fund/company/security name
     * ticker: Add .AX suffix for Australian stocks/ETFs (e.g., "CBA.AX", "BHP.AX", "LEND.AX", "MVW.AX")
     * timeframe_period: From Step 1 (either the exact period from docs, OR the calculated 12-month lookback)
   - This applies to BOTH direct-share AND security types (treat ETFs exactly like stocks for this purpose)
   - Populate performanceTimeframe and totalReturnForTimeframe with the result
3. MORNINGSTAR FALLBACK (for managed funds without tickers):
   - If holding is a MANAGED FUND with NO ticker symbol AND you have a timeframe from Step 1:
   - MUST call search_fund_return_morningstar tool with:
     * fund_name: The full fund name (e.g., "Metrics Direct Income Fund")
     * fund_manager: The fund manager name (e.g., "Metrics Credit Partners")
     * timeframe_period: From Step 1 (exact period or calculated lookback)
   - CRITICAL: Extract BOTH values from the tool response:
     * totalReturnForTimeframe: Parse the return percentage from the response
     * performanceTimeframe: Parse the ACTUAL timeframe from the response (pattern: "for the period X to Y")
     * Example response: "Fund: 1-year Investor Return is 3.52% for the period 1 Feb 2025 to 31 Jan 2026"
     * Extract: totalReturnForTimeframe = 3.52, performanceTimeframe = "1 Feb 2025 to 31 Jan 2026"
   - DO NOT use the portfolio's timeframe for Morningstar data - use the actual period returned by Morningstar
   - Note: This tool is slower (3-5 seconds per fund) but provides data for managed funds not on Yahoo Finance
4. If no return data can be found via either fallback, set performanceTimeframe but omit totalReturnForTimeframe

**SPECIFIC EXAMPLES FOR THIS PORTFOLIO**:
- "VanEck Glbl Lstd Priv Cred (Aud Hdgd)ETF" → ticker: LEND → Call search_holding_return("VanEck Glbl Lstd Priv Cred (Aud Hdgd)ETF", "LEND.AX", "24 Feb 2025 to 24 Feb 2026")
- "Vaneck Vectors Aus Equal Weight ETF" → ticker: MVW → Call search_holding_return("Vaneck Vectors Aus Equal Weight ETF", "MVW.AX", "24 Feb 2025 to 24 Feb 2026")
- "Vanguard Aus Corp Fixed Int Ind Fund ETF" → ticker: VACF → Call search_holding_return("Vanguard Aus Corp Fixed Int Ind Fund ETF", "VACF.AX", "24 Feb 2025 to 24 Feb 2026")

**IMPORTANT**: In markdown, use pattern: "Total return over the time period [timeframe]"

ASSET CLASS & PORTFOLIO RISK REQUIREMENTS:
${profile.includeRiskSummary ? `- Map every holding into the investor-profile asset class taxonomy: Alternatives, Australian Fixed Interest, Australian Property, Australian Shares, Domestic Cash, International Cash, International Fixed Interest, International Property, International Shares. If a holding spans multiple classes, assign the dominant exposure.
- CRITICAL OPTIMIZATION: Use the get_portfolio_risk_data batch tool to retrieve ALL data in ONE call. Pass an array of all asset classes present in the portfolio (e.g., ['Australian Shares', 'International Shares', 'Australian Fixed Interest']). This single call returns:
  1. Expected annual returns for all classes
  2. Standard deviations (volatility) for all classes
  3. Complete correlation matrix for all pairs
- The batch tool is MUCH faster than individual calls (1 call vs 40+ calls). Only use individual search_asset_class_metrics or search_asset_class_correlation tools if you need to query a single specific value after getting the batch data.
- IMPORTANT: All tools return STATIC DATA from authoritative sources (Vanguard Capital Market Assumptions methodology). This ensures consistency - the same portfolio will always produce the same risk metrics.
- Extract the numerical values from the tool response (they will be clearly stated). Use these exact values in your calculations.
- Do NOT include an Asset-Class Metrics table or portfolio standard deviation calculations in the markdown Risk Profile section. These metrics are displayed separately in the Portfolio Risk Summary component.
- Use the following 4-step method for portfolio risk calculations. Step 1 (individual variance contributions): Σ(w_i² · σ_i²). Step 2 (pairwise covariance contributions): Σ_i Σ_j>i (2 · w_i · w_j · σ_i · σ_j · ρ_ij). Step 3 (portfolio variance): σ_p² = Step 1 + Step 2. Step 4 (portfolio standard deviation): σ_p = √σ_p².
- Definitions: n = number of asset classes, w_i = portfolio weight of asset class i (as decimal), σ_i = annualised standard deviation of asset class i (as decimal), ρ_ij = correlation coefficient between asset classes i and j (the specific pair).
- Weight handling rule: if allocations are expressed as percentages (for example 26), convert to decimals (0.26) before calculations.
- Keep portfolioVariance and riskContribution as variance-scale values, and portfolioStandardDeviation as a decimal standard deviation (for example 0.08 for 8%). Provide variance contributions per asset class.
- If you cannot obtain enough data to calculate the portfolio risk metrics, omit the portfolioRisk block entirely (do NOT fabricate values).
- Include "Static Asset Class Data - Vanguard Capital Market Assumptions methodology" in the sources array.` : `- Do NOT include a portfolioRisk block in the JSON output. Do NOT call get_portfolio_risk_data, search_asset_class_metrics or search_asset_class_correlation. The user has not requested a Portfolio Risk Summary.`}`

  const diversificationSectionNumber = 5;
  const stressTestSectionNumber = 6;

  // Build user prompt with investor context
  const userPrompt = `
<investor_profile>
<investor_type>${profile.investorType}</investor_type>
<phase>${profile.phase}</phase>
<age_range>${profile.ageRange}</age_range>
<fund_commentary_requested>${profile.fundCommentary ? 'yes' : 'no'}</fund_commentary_requested>
<include_risk_summary>${profile.includeRiskSummary ? 'yes' : 'no'}</include_risk_summary>
<is_industry_super_fund>${profile.isIndustrySuperFund ? 'yes' : 'no'}</is_industry_super_fund>
${profile.isIndustrySuperFund ? `<industry_super_fund_name>${profile.industrySuperFundName}</industry_super_fund_name>` : ''}
${profile.isIndustrySuperFund ? `<industry_super_fund_risk_profile>${profile.industrySuperFundRiskProfile}</industry_super_fund_risk_profile>` : ''}
</investor_profile>

<portfolio_documents>
${documentContent}
</portfolio_documents>
${precomputedReturns && precomputedReturns.length > 0 ? `
<precomputed_returns>
IMPORTANT: The following holdings already have return data fetched. DO NOT call search_holding_return or search_fund_return_morningstar tools for these holdings. Use this data directly:

${precomputedReturns.map(r => {
  if (r.totalReturn !== undefined && r.timeframe) {
    return `- ${r.holdingName}${r.ticker ? ` (${r.ticker})` : ''}: ${r.totalReturn}% for the period ${r.timeframe}`;
  } else {
    return `- ${r.holdingName}${r.ticker ? ` (${r.ticker})` : ''}: No return data available`;
  }
}).join('\n')}
</precomputed_returns>
` : ''}

<analysis_requirements>
Provide a purely factual, objective analysis. State only what IS, not what SHOULD BE. Do NOT provide advice, recommendations, or suggestions.
Use NEUTRAL language throughout - present characteristics and comparisons without negative judgments or critical tones.

1. **Executive Summary** - High-level factual overview of portfolio characteristics
2. **Portfolio Composition** - Total value, asset allocation breakdown, major holdings
3. **Risk Profile Analysis** - Current risk level characteristics compared to ${profile.investorType} profile characteristics
4. **Alignment Assessment** - Factual comparison of portfolio characteristics against investor profile
${diversificationSectionNumber}. **Diversification Analysis** - Geographic, sector, and asset class distribution facts
${stressTestSectionNumber}. **Stress Test Analysis** - Historical portfolio behaviour during past market scenarios

${profile.fundCommentary ? 'IMPORTANT: Do NOT include a "Fund Commentary" section or detailed descriptions of individual holdings in the markdown. The fund commentary and holding details are already displayed separately in the Holdings Performance component via the holdingsPerformance JSON data and should not be duplicated in the markdown text.' : ''}

REMEMBER: Present facts and data neutrally. Do not use negative, critical, or judgmental language. Do not suggest actions or changes.
</analysis_requirements>

<output_format>
CRITICAL: You must respond with ONLY valid JSON in this EXACT format (no markdown code blocks, no extra text):

{
  "markdown": "# Portfolio Analysis\\n\\n## Executive Summary\\n\\n[Your full analysis in markdown format with all sections above]\\n\\n## Portfolio Composition\\n\\n[etc...]",
  "chartData": {
    "portfolioValue": 500000,
    "assetAllocation": [
      {"name": "Australian Equities", "value": 200000, "percentage": 40},
      {"name": "International Equities", "value": 150000, "percentage": 30},
      {"name": "Fixed Income", "value": 100000, "percentage": 20},
      {"name": "Cash", "value": 50000, "percentage": 10}
    ],
    "riskComparison": {
      "currentRisk": "Growth",
      "targetRisk": "${profile.investorType}",
      "alignment": "Aligned"
    },
    "holdingsPerformance": [
      {
        "name": "Commonwealth Bank",
        "type": "direct-share",
        "description": "CBA is Australia's largest bank providing retail, business, and institutional banking services.",
        "ticker": "CBA",
        "currentValue": 50000,
        "percentage": 10,
        "performanceTimeframe": "1 Jul 2024 to 30 Jun 2025",
        "totalReturnForTimeframe": 12.5,
        "performance": [
          {"year": 2024, "return": 12.5},
          {"year": 2023, "return": 8.3},
          {"year": 2022, "return": -2.1}
        ],
        "volatility": [
          {"year": 2024, "standardDeviation": 15.2},
          {"year": 2023, "standardDeviation": 18.1},
          {"year": 2022, "standardDeviation": 22.3}
        ]
      },
      {
        "name": "Vanguard High Growth Index",
        "type": "managed-fund",
        "description": "Diversified fund investing approximately 90% in growth assets (shares and property) and 10% in defensive assets.",
        "currentValue": 100000,
        "percentage": 20,
        "performanceTimeframe": "1 Jul 2024 to 30 Jun 2025",
        "totalReturnForTimeframe": 15.2,
        "performance": [
          {"year": 2024, "return": 15.2},
          {"year": 2023, "return": 10.7}
        ],
        "volatility": [
          {"year": 2024, "standardDeviation": 12.5},
          {"year": 2023, "standardDeviation": 14.2}
        ]
      },
      {
        "name": "Vanguard Australian Shares ETF",
        "type": "security",
        "description": "Exchange-traded fund providing exposure to Australian shares via the ASX 300 index.",
        "ticker": "VAS",
        "currentValue": 75000,
        "percentage": 15,
        "performanceTimeframe": "1 Jul 2024 to 30 Jun 2025",
        "totalReturnForTimeframe": 11.8
      }
    ],
    "portfolioRisk": {
      "portfolioStandardDeviation": 0.08,
      "portfolioVariance": 0.0064,
      "notes": "Sources: https://example.com/volatility, https://example.com/correlation",
      "assetClasses": [
        {
          "name": "Australian Shares",
          "weightPercentage": 26,
          "value": 150000,
          "expectedReturn": 0.08,
          "standardDeviation": 0.15,
          "riskContribution": 0.0032
        },
        {
          "name": "International Shares",
          "weightPercentage": 36,
          "value": 200000,
          "expectedReturn": 0.09,
          "standardDeviation": 0.18,
          "riskContribution": 0.0041
        }
      ],
      "correlationMatrix": [
        {
          "assetClass": "Australian Shares",
          "correlations": [
            {"with": "Australian Shares", "coefficient": 1},
            {"with": "International Shares", "coefficient": 0.75},
            {"with": "Australian Fixed Interest", "coefficient": 0.35}
          ]
        },
        {
          "assetClass": "International Shares",
          "correlations": [
            {"with": "Australian Shares", "coefficient": 0.75},
            {"with": "International Shares", "coefficient": 1},
            {"with": "Australian Fixed Interest", "coefficient": 0.30}
          ]
        }
      ],
      "sources": [
        "https://example.com/volatility",
        "https://example.com/correlation"
      ]
    }
  }
}

Instructions:
- Extract portfolio value and asset allocation from documents
- Determine current risk profile based on asset allocation
- Extract ticker symbols for ALL holdings where available (direct shares and securities/ETFs especially)
- Do NOT include fees or costs in the output
- For riskComparison.alignment field, use ONLY these exact values based on risk level comparison:
  * "Aligned" - when currentRisk exactly matches targetRisk (e.g., Growth = Growth)
  * "Too Conservative" - when currentRisk is more conservative than targetRisk (e.g., Balanced when target is Growth)
  * "Too Aggressive" - when currentRisk is more aggressive than targetRisk (e.g., High Growth when target is Balanced)
  * Risk level order from conservative to aggressive: Defensive < Conservative < Balanced < Growth < High Growth
- Use only asset classes present in the actual portfolio
- Include holdingsPerformance array ONLY if fund commentary was requested (fundCommentary = yes)
- For each holding: classify type, provide description, extract performance/volatility data from documents
- CRITICAL: For EVERY holding in holdingsPerformance array:
  * performanceTimeframe: Populate based on source:
    - From portfolio documents → use the reporting timeframe extracted in Step 1 (e.g., "1 Jul 2024 to 30 Jun 2025")
    - From Yahoo Finance fallback → use the portfolio's timeframe (Step 1) since Yahoo returns data for exact dates requested
    - From Morningstar fallback → EXTRACT the actual timeframe from tool response (pattern: "for the period X to Y")
    - Example: If Morningstar returns "for the period 1 Feb 2025 to 31 Jan 2026", use "1 Feb 2025 to 31 Jan 2026" as performanceTimeframe
  * totalReturnForTimeframe: Populate from documents if available, OR use fallback tools per Step 3:
    - If holding has ticker → call search_holding_return (Yahoo Finance)
    - If holding is managed fund WITHOUT ticker → call search_fund_return_morningstar (Morningstar)
    - If neither tool can provide data, omit totalReturnForTimeframe
  * ALWAYS include performanceTimeframe even if totalReturnForTimeframe is omitted
- In markdown narrative, when mentioning total return, always write it as: "Total return over the time period [exact timeframe from the statement]".
- If performance or volatility data is not in documents, omit those arrays for that holding
- Populate portfolioRisk ONLY when includeRiskSummary = yes AND you have sufficient data from documents and/or Brave search tool calls. Include sources for any external metrics. If insufficient data exists, omit portfolioRisk entirely.
- For every portfolioRisk.assetClasses entry, always populate standardDeviation using the predicted volatility input for that asset class (expressed as decimal in JSON, rendered as % in UI/PDF).
- If includeRiskSummary = no, do NOT include portfolioRisk in the JSON at all and do NOT call any asset class search tools.
- Always use the Brave search tools \`search_asset_class_metrics\` and \`search_asset_class_correlation\` when the documents do not list the required volatility or correlation data — but ONLY when includeRiskSummary = yes.
- Your ENTIRE response must be valid JSON with no leading/trailing commentary, code fences, or explanations. If you cannot complete the analysis, respond with {"error": "<brief factual reason>"} and nothing else.
- Respond with pure JSON only (no markdown formatting around it)
- CRITICAL: Do NOT add ANY text before the opening brace { or after the closing brace }. Start your response immediately with { and end with }
- If you need to explain something about the analysis, put it in the markdown field within the JSON, NOT before or after the JSON
</output_format>
`;

  return {
    system: systemPrompt,
    user: userPrompt,
  };
}

// ============================================================================
// Helper: Combine multiple document contents
// ============================================================================

export function combineDocumentContents(files: Array<{ fileName: string; content: string }>): string {
  if (files.length === 0) {
    return 'No documents provided.';
  }

  if (files.length === 1) {
    return files[0].content;
  }

  // Multiple files - combine with clear delimiters
  return files
    .map(
      (file, index) => `
=== DOCUMENT ${index + 1}: ${file.fileName} ===

${file.content}

=== END DOCUMENT ${index + 1} ===
`
    )
    .join('\n\n');
}
