import type { InvestorProfile } from '@/types';

// ============================================================================
// Prompt Builder - Constructs personalised Claude prompts
// ============================================================================

export function buildAnalysisPrompt(
  profile: InvestorProfile,
  documentContent: string
): { system: string; user: string } {
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
   - For each security: Provide a brief factual description of the security type and characteristics

PERFORMANCE DATA EXTRACTION:
- Extract historical performance data (annual returns) for each holding from the portfolio documents
- Extract volatility data (standard deviation) for each holding if available in the documents
- Present performance and volatility data year by year as found in the documents
- If performance/volatility data is not available for a holding, omit those fields from the output

ASSET CLASS & PORTFOLIO RISK REQUIREMENTS:
${profile.includeRiskSummary ? `- Map every holding into the investor-profile asset class taxonomy: Alternatives, Australian Fixed Interest, Australian Property, Australian Shares, Domestic Cash, International Cash, International Fixed Interest, International Property, International Shares. If a holding spans multiple classes, assign the dominant exposure.
- For each asset class represented in the portfolio, gather expected annual return and annualised standard deviation using the Brave Search tools \`search_asset_class_metrics\` (specify the asset class in the query). Cite credible Australian sources when possible.
- Build a complete correlation matrix between the asset classes that appear in the portfolio. Use the Brave Search tool \`search_asset_class_correlation\` for each pair that is not documented. If credible correlation data cannot be sourced, leave the matrix cell empty and explain in the notes.
- Using the asset-class weights, expected returns, standard deviations, and correlation matrix, calculate portfolio variance (σ² = wᵀΣw) and portfolio standard deviation (σ = √σ²). Provide variance contributions per asset class.
- If you cannot obtain enough data to calculate the portfolio risk metrics, omit the portfolioRisk block entirely (do NOT fabricate values).
- Whenever you use external data, include the source URL in the JSON response.` : `- Do NOT include a portfolioRisk block in the JSON output. Do NOT call search_asset_class_metrics or search_asset_class_correlation. The user has not requested a Portfolio Risk Summary.`}`

  const suitabilitySectionNumber = profile.fundCommentary ? 6 : 5;
  const diversificationSectionNumber = suitabilitySectionNumber + 1;
  const stressTestSectionNumber = suitabilitySectionNumber + 2;
  const benchmarkSectionNumber = suitabilitySectionNumber + 3;

  // Build user prompt with investor context
  const userPrompt = `
<investor_profile>
<investor_type>${profile.investorType}</investor_type>
<phase>${profile.phase}</phase>
<age_range>${profile.ageRange}</age_range>
<fund_commentary_requested>${profile.fundCommentary ? 'yes' : 'no'}</fund_commentary_requested>
<suitability_conclusion_requested>${profile.valueForMoney ? 'yes' : 'no'}</suitability_conclusion_requested>
<include_risk_summary>${profile.includeRiskSummary ? 'yes' : 'no'}</include_risk_summary>
<is_industry_super_fund>${profile.isIndustrySuperFund ? 'yes' : 'no'}</is_industry_super_fund>
${profile.isIndustrySuperFund ? `<industry_super_fund_name>${profile.industrySuperFundName}</industry_super_fund_name>` : ''}
${profile.isIndustrySuperFund ? `<industry_super_fund_risk_profile>${profile.industrySuperFundRiskProfile}</industry_super_fund_risk_profile>` : ''}
</investor_profile>

<portfolio_documents>
${documentContent}
</portfolio_documents>

<analysis_requirements>
Provide a purely factual, objective analysis. State only what IS, not what SHOULD BE. Do NOT provide advice, recommendations, or suggestions.
Use NEUTRAL language throughout - present characteristics and comparisons without negative judgments or critical tones.

1. **Executive Summary** - High-level factual overview of portfolio characteristics
2. **Portfolio Composition** - Total value, asset allocation breakdown, major holdings
3. **Risk Profile Analysis** - Current risk level characteristics compared to ${profile.investorType} profile characteristics
4. **Alignment Assessment** - Factual comparison of portfolio characteristics against investor profile
${profile.fundCommentary ? `5. **Holdings Analysis** - Split into three subsections based on holding types:
   
   **5a. Direct Shares Analysis**
   For each company stock, provide:
   - Company name and ticker symbol (if available)
   - Brief factual description of what the company does (1-2 sentences)
   - Current holding value and percentage of portfolio
   - Historical performance: Annual returns by year (extract from documents)
   - Volatility: Standard deviation by year (extract from documents if available)
   
   **5b. Managed Funds Analysis**
   For each managed fund, provide:
   - Fund name and fund manager
   - Factual description of the fund's investment strategy and asset allocation (1-2 sentences)
   - Current holding value and percentage of portfolio
   - Historical performance: Annual returns by year (extract from documents)
   - Volatility: Standard deviation by year (extract from documents if available)
   
   **5c. Securities Analysis**
   For each other security (bonds, ETFs, etc.), provide:
   - Security name and type
   - Brief factual description of the security and its characteristics (1-2 sentences)
   - Current holding value and percentage of portfolio
   - Historical performance data if available in documents
   - Risk characteristics` : ''}
${profile.valueForMoney
  ? `${suitabilitySectionNumber}. **Portfolio Suitability Conclusion** - Provide a brief factual determination of whether portfolio characteristics align with the investor's risk tolerance (${profile.investorType}), time horizon (based on ${profile.ageRange}), current phase (${profile.phase}), and objectives. State the conclusion factually (e.g., "characteristics align", "more aggressive than profile") without offering recommendations.`
  : `${suitabilitySectionNumber}. **Portfolio Profile Comparison** - Compare the portfolio's characteristics against the investor's risk tolerance (${profile.investorType}), time horizon (based on ${profile.ageRange}), current phase (${profile.phase}), and inferred objectives. Describe similarities or differences factually and neutrally without declaring suitability or suggesting changes.`}
${diversificationSectionNumber}. **Diversification Analysis** - Geographic, sector, and asset class distribution facts
${stressTestSectionNumber}. **Stress Test Analysis** - Historical portfolio behaviour during past market scenarios
${benchmarkSectionNumber}. **Benchmark Comparison** - Factual performance comparison vs. relevant Australian indices

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
    "fees": [
      {"category": "Management Fees", "amount": 3500, "percentage": 0.70},
      {"category": "Admin Fees", "amount": 500, "percentage": 0.10}
    ],
    "holdingsPerformance": [
      {
        "name": "Commonwealth Bank",
        "type": "direct-share",
        "description": "CBA is Australia's largest bank providing retail, business, and institutional banking services.",
        "ticker": "CBA",
        "currentValue": 50000,
        "percentage": 10,
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
        "performance": [
          {"year": 2024, "return": 15.2},
          {"year": 2023, "return": 10.7}
        ],
        "volatility": [
          {"year": 2024, "standardDeviation": 12.5},
          {"year": 2023, "standardDeviation": 14.2}
        ]
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
- Calculate total fees from document data
- Use only asset classes present in the actual portfolio
- Include holdingsPerformance array ONLY if fund commentary was requested (fundCommentary = yes)
- For each holding: classify type, provide description, extract performance/volatility data from documents
- If performance or volatility data is not in documents, omit those arrays for that holding
- Populate portfolioRisk ONLY when includeRiskSummary = yes AND you have sufficient data from documents and/or Brave search tool calls. Include sources for any external metrics. If insufficient data exists, omit portfolioRisk entirely.
- If includeRiskSummary = no, do NOT include portfolioRisk in the JSON at all and do NOT call any asset class search tools.
- Always use the Brave search tools \`search_asset_class_metrics\` and \`search_asset_class_correlation\` when the documents do not list the required volatility or correlation data — but ONLY when includeRiskSummary = yes.
- Your ENTIRE response must be valid JSON with no leading/trailing commentary, code fences, or explanations. If you cannot complete the analysis, respond with {"error": "<brief factual reason>"} and nothing else.
- Respond with pure JSON only (no markdown formatting around it)
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
