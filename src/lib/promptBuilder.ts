import type { InvestorProfile } from '@/types';

// ============================================================================
// Prompt Builder - Constructs personalised Claude prompts
// ============================================================================

export function buildAnalysisPrompt(
  profile: InvestorProfile,
  documentContent: string
): { system: string; user: string } {
  // System prompt - Define Claude's role
  const systemPrompt = `You are an expert Australian financial portfolio analyst with deep expertise in superannuation, managed funds, and investment strategy. Your role is to provide comprehensive, factual analysis of investment portfolios.

Key Guidelines:
- Focus on ANALYSIS, not advice or recommendations
- Use Australian financial terminology and regulatory context
- Be objective and data-driven in your analysis
- Use Australian English spelling (analyse, not analyze; favour, not favor)
- Reference Australian indices and benchmarks where relevant
- Provide factual assessment without personal opinions`;

  // Build user prompt with investor context
  const userPrompt = `
<investor_profile>
<investor_type>${profile.investorType}</investor_type>
<phase>${profile.phase}</phase>
<age_range>${profile.ageRange}</age_range>
<fund_commentary_requested>${profile.fundCommentary ? 'yes' : 'no'}</fund_commentary_requested>
<value_for_money_requested>${profile.valueForMoney ? 'yes' : 'no'}</value_for_money_requested>
</investor_profile>

<portfolio_documents>
${documentContent}
</portfolio_documents>

<analysis_requirements>
Provide a comprehensive factual analysis (NOT advice or recommendations) covering:

1. **Executive Summary** - High-level overview and key observations
2. **Portfolio Composition** - Total value, asset allocation breakdown, major holdings
3. **Risk Profile Analysis** - Current risk level vs. stated investor type (${profile.investorType})
4. **Alignment Assessment** - How portfolio characteristics align with investor profile
${profile.fundCommentary ? `5. **Fund-by-Fund Analysis** - Detailed breakdown of each fund's characteristics, performance, and costs` : ''}
${profile.valueForMoney ? `${profile.fundCommentary ? '6' : '5'}. **Fee Analysis** - Comprehensive cost breakdown and industry comparison` : ''}
${profile.fundCommentary && profile.valueForMoney ? '7' : profile.fundCommentary || profile.valueForMoney ? '6' : '5'}. **Diversification Analysis** - Geographic, sector, and asset class distribution
${profile.fundCommentary && profile.valueForMoney ? '8' : profile.fundCommentary || profile.valueForMoney ? '7' : '6'}. **Stress Test Analysis** - Portfolio behaviour in various market scenarios
${profile.fundCommentary && profile.valueForMoney ? '9' : profile.fundCommentary || profile.valueForMoney ? '8' : '7'}. **Benchmark Comparison** - Performance vs. relevant Australian indices

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
    ]
  }
}

Instructions:
- Extract portfolio value and asset allocation from documents
- Determine current risk profile based on asset allocation
- Calculate total fees from document data
- Use only asset classes present in the actual portfolio
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
