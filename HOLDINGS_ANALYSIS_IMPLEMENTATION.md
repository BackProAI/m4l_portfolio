# Holdings Analysis Enhancement Implementation Plan

## Overview
Enhance the portfolio analysis to provide detailed analysis of holdings with company/fund descriptions, performance data, and volatility metrics. Holdings will be categorized into Direct Shares, Managed Funds, and Securities.

---

## Implementation Phases

### Phase 1: Type System Updates

#### 1.1 Add New TypeScript Interfaces
**File:** `src/types/index.ts`

Add new interfaces for holding performance and descriptions:

```typescript
export interface HoldingPerformance {
  name: string;
  type: 'direct-share' | 'managed-fund' | 'security';
  description: string; // Fetched from web or Claude's knowledge
  currentValue: number;
  percentage: number;
  performance: YearlyPerformance[];
  volatility: YearlyVolatility[];
}

export interface YearlyPerformance {
  year: number;
  return: number; // Annual return percentage
}

export interface YearlyVolatility {
  year: number;
  standardDeviation: number; // Annual standard deviation
}
```

#### 1.2 Update ChartData Interface
Add holdings performance data to the existing `ChartData` interface:

```typescript
export interface ChartData {
  assetAllocation: AllocationItem[];
  riskComparison: RiskComparison;
  fees: FeeBreakdown[];
  portfolioValue: number;
  holdingsPerformance?: HoldingPerformance[]; // NEW
}
```

---

### Phase 2: Web Search Tool Implementation

#### 2.1 Create Web Search Tool
**New File:** `src/lib/webSearchTool.ts`

Implement a web search tool that Claude can call via function/tool calling:

```typescript
// Options for implementation:
// Option A: Use Brave Search API (free tier: 2000 calls/month)
// Option B: Use DuckDuckGo API (unofficial but works)
// Option C: Use SerpAPI (paid but reliable)
// Option D: Simple web scraping for specific sources

export async function searchCompanyInfo(
  companyName: string,
  ticker?: string
): Promise<string> {
  // Implementation will fetch company description
  // Priority sources:
  // 1. ASX company website for Australian stocks
  // 2. Company official website
  // 3. Yahoo Finance / Google Finance
}

export async function searchFundInfo(
  fundName: string
): Promise<string> {
  // Implementation will fetch managed fund description
  // Priority sources:
  // 1. Fund provider website
  // 2. Morningstar Australia
  // 3. Financial product disclosure statements
}
```

#### 2.2 Tool Definition for Claude
Define the tools that Claude can call:

```typescript
const tools = [
  {
    name: "search_company_description",
    description: "Search for a company description and business overview. Use this for direct shares/stocks.",
    input_schema: {
      type: "object",
      properties: {
        company_name: {
          type: "string",
          description: "Full company name"
        },
        ticker: {
          type: "string",
          description: "Stock ticker symbol (e.g., CBA for Commonwealth Bank)"
        }
      },
      required: ["company_name"]
    }
  },
  {
    name: "search_fund_description",
    description: "Search for a managed fund description and investment strategy. Use this for managed funds.",
    input_schema: {
      type: "object",
      properties: {
        fund_name: {
          type: "string",
          description: "Full fund name"
        },
        fund_manager: {
          type: "string",
          description: "Fund management company (e.g., Vanguard, Colonial First Choice)"
        }
      },
      required: ["fund_name"]
    }
  }
];
```

---

### Phase 3: Claude Client Enhancement

#### 3.1 Update Claude Client for Tool Use
**File:** `src/lib/claudeClient.ts`

Modify the `analysePortfolio` function to support tool/function calling:

**Changes Required:**
1. Add `tools` parameter to the API call
2. Implement tool execution loop:
   - Send initial request with tools
   - If Claude requests a tool, execute it
   - Send results back to Claude
   - Continue until Claude provides final response
3. Handle multiple tool calls (Claude may need to look up multiple companies/funds)

**Example Flow:**
```typescript
// 1. Initial call with tools
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: maxTokens,
  tools: tools,
  messages: messages,
});

// 2. Handle tool use
while (response.stop_reason === 'tool_use') {
  // Extract tool requests
  const toolUse = response.content.find(block => block.type === 'tool_use');
  
  // Execute tool
  const toolResult = await executeWebSearch(toolUse);
  
  // Add to messages and continue
  messages.push({
    role: 'assistant',
    content: response.content
  });
  messages.push({
    role: 'user',
    content: [{
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: toolResult
    }]
  });
  
  // Get next response
  response = await anthropic.messages.create({...});
}
```

---

### Phase 4: Prompt Enhancement

#### 4.1 Update System Prompt
**File:** `src/lib/promptBuilder.ts`

Add instructions for Claude to:
1. Identify and classify holdings
2. Extract performance/volatility data from documents
3. Use web search tools when needed
4. Structure output appropriately

**New System Prompt Additions:**
```typescript
const systemPrompt = `You are an expert Australian financial portfolio analyst...

HOLDINGS ANALYSIS REQUIREMENTS:
- Identify all holdings in the portfolio documents
- Classify each holding as:
  * Direct Share: Individual company stocks (e.g., "CBA", "BHP", "Westpac")
  * Managed Fund: Investment funds managed by fund managers (e.g., "Vanguard High Growth Index", "Colonial FirstChoice")
  * Security: Other investment types (bonds, ETFs, debentures, fixed income securities)
  
CLASSIFICATION PATTERNS:
- Direct Shares: Usually have ticker codes, appear as individual company names
- Managed Funds: Often include words like "Fund", "Index", "Trust", "Portfolio", fund manager names
- Securities: Include words like "Bond", "Note", "Debenture", "ETF", "Fixed Income"

TOOLS AVAILABLE:
- You have access to web search tools to fetch company and fund descriptions
- Use search_company_description for direct shares to get business overview
- Use search_fund_description for managed funds to get investment strategy
- For securities, use your knowledge or available tools

PERFORMANCE DATA EXTRACTION:
- Extract historical performance (annual returns) for each holding from the documents
- Extract volatility (standard deviation) data if available in documents
- Present data year by year as found in documents
`;
```

#### 4.2 Update Analysis Requirements
Modify the analysis sections to split Fund-by-Fund into three categories:

```typescript
${profile.fundCommentary ? `5. **Holdings Analysis** - Split into three subsections:
   a. **Direct Shares Analysis** - For each company stock:
      - Company name and ticker
      - Brief description of what the company does (use web search tool)
      - Current holding value and percentage
      - Historical performance (annual returns by year)
      - Volatility (standard deviation by year)
   b. **Managed Funds Analysis** - For each managed fund:
      - Fund name and fund manager
      - Description of fund investment strategy (use web search tool)
      - Current holding value and percentage
      - Historical performance (annual returns by year)
      - Volatility (standard deviation by year)
   c. **Securities Analysis** - For each other security:
      - Security name and type
      - Brief description of the security
      - Current holding value and percentage
      - Historical performance data if available
      - Risk characteristics` : ''}
```

---

### Phase 5: Web Search Implementation

#### 5.1 Choose Web Search Provider
**Recommendation: Brave Search API**
- Free tier: 2,000 searches/month
- No credit card required for free tier
- Good coverage of Australian websites
- Simple REST API

**Alternative: Tavily Search API**
- Designed for AI applications
- Good summaries for LLM consumption
- Paid but affordable

**Fallback: Claude's Knowledge**
- For common companies/funds, Claude has built-in knowledge
- Only use web search when needed

#### 5.2 Implementation Strategy
**File:** `src/lib/webSearchTool.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

interface SearchResult {
  description: string;
  sources: string[];
}

export async function searchCompanyDescription(
  companyName: string,
  ticker?: string
): Promise<SearchResult> {
  const searchQuery = ticker 
    ? `${companyName} ${ticker} ASX company business description what does it do`
    : `${companyName} company business description what does it do`;
  
  try {
    // Option 1: Use Brave Search API
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY || ''
        }
      }
    );
    
    const data = await response.json();
    
    // Extract relevant snippets
    const description = data.web?.results
      ?.slice(0, 3)
      .map((r: any) => r.description)
      .join(' ');
    
    const sources = data.web?.results
      ?.slice(0, 3)
      .map((r: any) => r.url) || [];
    
    return { description, sources };
    
  } catch (error) {
    console.error('Search failed:', error);
    return {
      description: `${companyName} - Description not available`,
      sources: []
    };
  }
}

export async function searchFundDescription(
  fundName: string,
  fundManager?: string
): Promise<SearchResult> {
  const searchQuery = fundManager
    ? `${fundName} ${fundManager} managed fund investment strategy description`
    : `${fundName} managed fund investment strategy description`;
  
  // Similar implementation to searchCompanyDescription
  // Focus on fund manager websites, Morningstar, etc.
}
```

---

### Phase 6: Output Format Updates

#### 6.1 Update JSON Output Schema
**File:** `src/lib/promptBuilder.ts`

Add holdings performance data to the expected JSON output:

```typescript
{
  "markdown": "...",
  "chartData": {
    "portfolioValue": 500000,
    "assetAllocation": [...],
    "riskComparison": {...},
    "fees": [...],
    "holdingsPerformance": [
      {
        "name": "Commonwealth Bank",
        "type": "direct-share",
        "description": "CBA is Australia's largest bank providing retail, business and institutional banking services...",
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
      }
    ]
  }
}
```

---

### Phase 7: Chart Components ✅ COMPLETED

#### 7.1 Create Performance Chart Component ✅
**New File:** `src/components/HoldingsPerformanceCharts.tsx`

Create visualizations for:
1. Performance bar charts (by holding, by year)
2. Volatility comparison charts
3. Performance vs volatility scatter plot
4. Risk-adjusted return metrics

#### 7.2 Update PortfolioCharts Component ✅
**File:** `src/components/PortfolioCharts.tsx`

Add the new holdings performance charts to the existing charts display.

---

### Phase 8: Industry Super Fund Feature ✅ COMPLETED

#### 8.1 Update InvestorProfile Type ✅
**File:** `src/types/index.ts`

Add new fields to the InvestorProfile interface:

```typescript
export interface InvestorProfile {
  name: string;
  investorType: InvestorType | '';
  phase: Phase | '';
  ageRange: AgeRange | '';
  fundCommentary: boolean | undefined;
  valueForMoney: boolean | undefined;
  isIndustrySuperFund: boolean | undefined;  // NEW
  industrySuperFundName?: string;              // NEW - Required if isIndustrySuperFund = true
  industrySuperFundRiskProfile?: InvestorType | ''; // NEW - Required if isIndustrySuperFund = true
}
```

#### 8.2 Update QuestionnaireSection Component
**File:** `src/components/QuestionnaireSection.tsx`

Add Question 6 with conditional fields:

```typescript
{/* Question 6: Industry Super Fund - Full width span */}
<div className="md:col-span-2">
  <Select
    label="Is this an industry super fund?"
    required
    value={
      profile.isIndustrySuperFund === true
        ? 'yes'
        : profile.isIndustrySuperFund === false
        ? 'no'
        : ''
    }
    onChange={(e) =>
      handleChange(
        'isIndustrySuperFund',
        e.target.value === 'yes' ? true : e.target.value === 'no' ? false : undefined
      )
    }
  >
    <option value="">Select an option...</option>
    <option value="yes">Yes</option>
    <option value="no">No</option>
  </Select>
</div>

{/* Conditional fields shown when Industry Super Fund = Yes */}
{profile.isIndustrySuperFund === true && (
  <>
    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        Name of Industry Super Fund <span className="text-error">*</span>
      </label>
      <input
        type="text"
        placeholder="e.g., HOSTPLUS, Australian Super, Cbus"
        value={profile.industrySuperFundName || ''}
        onChange={(e) => handleChange('industrySuperFundName', e.target.value)}
        className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
      />
    </div>

    <div className="md:col-span-2">
      <Select
        label="Risk Profile of Your Industry Super Fund Investment"
        required
        value={profile.industrySuperFundRiskProfile || ''}
        onChange={(e) => handleChange('industrySuperFundRiskProfile', e.target.value)}
      >
        <option value="">Select a risk profile...</option>
        <option value="High Growth">High Growth</option>
        <option value="Growth">Growth</option>
        <option value="Balanced">Balanced</option>
        <option value="Conservative">Conservative</option>
        <option value="Defensive">Defensive</option>
      </Select>
    </div>
  </>
)}
```

#### 8.3 Update Completion Count Logic
Update the completion count to include conditional fields:

```typescript
const completedCount = React.useMemo(() => {
  let count = 0;
  if (profile.name && profile.name.trim() !== '') count++;
  if (profile.investorType) count++;
  if (profile.phase) count++;
  if (profile.ageRange) count++;
  if (typeof profile.fundCommentary === 'boolean') count++;
  if (typeof profile.valueForMoney === 'boolean') count++;
  if (typeof profile.isIndustrySuperFund === 'boolean') {
    count++;
    // If industry super fund = yes, also require name and risk profile
    if (profile.isIndustrySuperFund === true) {
      if (profile.industrySuperFundName?.trim()) count++;
      if (profile.industrySuperFundRiskProfile) count++;
    }
  }
  return count;
}, [profile]);

const totalQuestions = profile.isIndustrySuperFund === true ? 9 : 7;
const isComplete = completedCount === totalQuestions;
```

#### 8.4 Update API Validation Schema
**File:** `src/app/api/analyze/route.ts`

```typescript
const AnalyseRequestSchema = z.object({
  profile: z.object({
    name: z.string().min(1, 'Name is required'),
    investorType: z.enum(['High Growth', 'Growth', 'Balanced', 'Conservative', 'Defensive']),
    phase: z.enum(['Accumulation', 'Investment', 'Non-super', 'Pension']),
    ageRange: z.enum(['Under 40', '40-60', '60-80', '80+']),
    fundCommentary: z.boolean(),
    valueForMoney: z.boolean(),
    isIndustrySuperFund: z.boolean(),
    industrySuperFundName: z.string().optional(),
    industrySuperFundRiskProfile: z.enum(['High Growth', 'Growth', 'Balanced', 'Conservative', 'Defensive', '']).optional(),
  }),
  // ... rest of schema
}).refine(
  (data) => {
    // If isIndustrySuperFund is true, require name and risk profile
    if (data.profile.isIndustrySuperFund) {
      return !!data.profile.industrySuperFundName && !!data.profile.industrySuperFundRiskProfile;
    }
    return true;
  },
  {
    message: "Industry super fund name and risk profile are required when 'Is this an industry super fund?' is Yes",
    path: ["profile"],
  }
);
```

#### 8.5 Update Prompt Builder
**File:** `src/lib/promptBuilder.ts`

Add industry super fund information to the prompt:

```typescript
<investor_profile>
<investor_type>${profile.investorType}</investor_type>
<phase>${profile.phase}</phase>
<age_range>${profile.ageRange}</age_range>
<fund_commentary_requested>${profile.fundCommentary ? 'yes' : 'no'}</fund_commentary_requested>
<suitability_conclusion_requested>${profile.valueForMoney ? 'yes' : 'no'}</suitability_conclusion_requested>
${profile.isIndustrySuperFund ? `<industry_super_fund>
<fund_name>${profile.industrySuperFundName}</fund_name>
<fund_risk_profile>${profile.industrySuperFundRiskProfile}</fund_risk_profile>
</industry_super_fund>` : ''}
</investor_profile>
```

Add to system prompt:

```typescript
INDUSTRY SUPER FUND ANALYSIS:
- If industry super fund information is provided, research the fund using available tools
- Provide a brief analysis of:
  * What the industry super fund invests in
  * Typical asset allocation of the specified risk profile
  * Key characteristics of that fund (fees, investment strategy)
  * How the user's current portfolio compares to the industry super fund's typical investment approach
- Use search tools to fetch current information about the industry super fund
```

Add to analysis requirements:

```typescript
${profile.isIndustrySuperFund ? `${calculateSectionNumber()}. **Industry Super Fund Analysis** - Research and analysis of ${profile.industrySuperFundName} ${profile.industrySuperFundRiskProfile} option:
   - What the fund invests in
   - Typical asset allocation for the ${profile.industrySuperFundRiskProfile} option
   - Fee structure and key features
   - Comparison with user's current portfolio` : ''}
```

---

### Phase 9: Copy/Paste Alternative Input ✅ COMPLETED

#### 9.1 Update FileUploadZone Component ✅
**File:** `src/components/FileUploadZone.tsx`

Add state for pasted content and validation:

```typescript
export interface FileUploadZoneProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  pastedContent: string;                    // NEW
  onPastedContentChange: (content: string) => void;  // NEW
  disabled?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
}

export function FileUploadZone({
  files,
  onFilesChange,
  pastedContent,
  onPastedContentChange,
  disabled = false,
  maxFiles = 1,
  maxSizeMB = 10,
}: FileUploadZoneProps) {
  const [error, setError] = React.useState<string>('');
  
  // Validation: Check if both methods are being used
  const hasFiles = files.length > 0;
  const hasPastedContent = pastedContent.trim().length > 0;
  const hasConflict = hasFiles && hasPastedContent;
  
  React.useEffect(() => {
    if (hasConflict) {
      setError('Please use either drag & drop OR copy & paste, not both. Clear one method before proceeding.');
    } else {
      setError('');
    }
  }, [hasConflict]);
```

#### 9.2 Add Copy/Paste UI Section
Add after the drag-drop section:

```tsx
return (
  <div className="space-y-6">
    {/* Drag & Drop Section */}
    <Card>
      <CardContent className="pt-6">
        <div {...getRootProps()} className={dropzoneClasses}>
          {/* Existing drag-drop UI */}
        </div>
        {/* Existing file list */}
      </CardContent>
    </Card>

    {/* OR Divider */}
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-neutral-300"></div>
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white px-4 text-2xl font-bold text-neutral-500">OR</span>
      </div>
    </div>

    {/* Copy & Paste Section */}
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-neutral-900">Copy & Paste Portfolio Data</h3>
              <p className="text-sm text-neutral-600">Paste your portfolio information directly from a PDF or document</p>
            </div>
          </div>
          
          <textarea
            value={pastedContent}
            onChange={(e) => onPastedContentChange(e.target.value)}
            disabled={disabled || hasFiles}
            placeholder="Paste your portfolio data here (copied from PDF, Word, Excel, etc.)..."
            className={`w-full min-h-[200px] px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-y ${
              hasFiles ? 'bg-neutral-100 cursor-not-allowed' : 'bg-white'
            }`}
          />
          
          {hasPastedContent && !hasConflict && (
            <div className="flex items-center gap-2 text-sm text-success">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Content ready for analysis ({pastedContent.length} characters)</span>
            </div>
          )}
          
          {hasPastedContent && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPastedContentChange('')}
              disabled={disabled}
            >
              Clear Pasted Content
            </Button>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Conflict Error Alert */}
    {hasConflict && (
      <Alert variant="error">
        <strong>Cannot use both methods:</strong> Please use either drag & drop OR copy & paste, not both. Clear one method before proceeding.
      </Alert>
    )}

    {/* General Error Alert */}
    {error && !hasConflict && (
      <Alert variant="error">{error}</Alert>
    )}
  </div>
);
```

#### 9.3 Update Parent Component State
**File:** `src/app/page.tsx`

Add state for pasted content:

```typescript
const [pastedContent, setPastedContent] = React.useState<string>('');

// Validation before analysis
const canAnalyze = React.useMemo(() => {
  const hasFiles = uploadedFiles.length > 0;
  const hasPastedContent = pastedContent.trim().length > 0;
  const hasConflict = hasFiles && hasPastedContent;
  
  return (
    profileComplete &&
    (hasFiles || hasPastedContent) &&
    !hasConflict &&
    !isAnalysing
  );
}, [profileComplete, uploadedFiles, pastedContent, isAnalysing]);
```

#### 9.4 Update Analysis Handler
Process pasted content as a "file":

```typescript
const handleAnalyse = async () => {
  try {
    setIsAnalysing(true);
    setError('');

    let documentsToSend: any[];

    if (pastedContent.trim().length > 0) {
      // Use pasted content
      documentsToSend = [
        {
          fileName: 'pasted-content.txt',
          content: pastedContent,
          type: 'text' as const,
        },
      ];
    } else {
      // Use uploaded files
      documentsToSend = uploadedFiles.map((uf) => ({
        fileName: uf.file.name,
        content: uf.parsedContent || '',
        type: uf.type,
      }));
    }

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: investorProfile,
        files: documentsToSend,
      }),
    });

    // ... rest of handling
  } catch (err) {
    // ... error handling
  }
};
```

---

## Implementation Order

### Week 1: Foundation
1. ✅ Phase 1: Update TypeScript types
2. ✅ Phase 4: Update prompts (without tool use first)
3. ✅ Test with Claude using built-in knowledge only

### Week 2: Tool Integration
4. ✅ Phase 5: Implement web search tool
5. ✅ Phase 3: Integrate tool use into Claude client
6. ✅ Test tool calling flow

### Week 3: Visualization & New Features
7. ✅ Phase 6: Update output format handling
8. ✅ Phase 7: Create chart components
9. ✅ Phase 8: Industry super fund feature
10. ✅ Phase 9: Copy/paste alternative input
11. ✅ Integration testing

---

## Testing Strategy

### Test Cases
1. **Direct Shares**: Portfolio with ASX stocks (CBA, BHP, WBC)
2. **Managed Funds**: Portfolio with Vanguard/Colonial funds
3. **Mixed Portfolio**: Combination of all three types
4. **Missing Data**: Portfolio documents without performance data
5. **Web Search Failure**: Verify graceful degradation
6. **Industry Super Fund**: Test with HOSTPLUS, Australian Super, Cbus
7. **Copy/Paste Input**: Test pasting from PDF, Word, Excel
8. **Conflict Validation**: Verify error when using both upload methods
9. **Conditional Fields**: Test industry super fund conditional logic

### Validation Checklist
- [ ] Holdings correctly classified
- [ ] Descriptions fetched and displayed
- [ ] Performance data extracted from documents
- [ ] Volatility data extracted and displayed
- [ ] Charts render correctly
- [ ] Tool use doesn't timeout
- [ ] Fallback to Claude knowledge when search fails
- [ ] Industry super fund question shows/hides conditional fields
- [ ] Industry super fund name and risk profile required when Yes selected
- [ ] Industry super fund analysis appears in output
- [ ] Copy/paste textarea accepts content  
- [ ] Pasted content processed same as uploaded files
- [ ] Error shown when both upload methods used simultaneously
- [ ] Clear buttons work for both upload methods
- [ ] Analyze button disabled when conflict exists

---

## Risks & Mitigation

### Risk 1: Web Search Rate Limits
**Mitigation**: 
- Cache search results
- Implement exponential backoff
- Use Claude's knowledge as fallback

### Risk 2: Claude Tool Use Complexity
**Mitigation**:
- Start with simple implementation
- Test thoroughly in development
- Add comprehensive error handling

### Risk 3: Performance Degradation
**Mitigation**:
- Limit number of holdings analyzed
- Implement timeout handling
- Consider async processing for large portfolios

### Risk 4: Incorrect Classification
**Mitigation**:
- Provide clear classification guidelines
- Add manual override option
- Test with diverse portfolio types

---

## Environment Variables Needed

```env
# Existing
ANTHROPIC_API_KEY=your_key_here
CLAUDE_MODEL=claude-sonnet-4-20250514

# New - Choose one search provider
BRAVE_SEARCH_API_KEY=your_brave_key_here
# OR
TAVILY_API_KEY=your_tavily_key_here
```

**Getting a Brave Search API Key (FREE):**
1. Visit https://brave.com/search/api/
2. Sign up for a free account (no credit card required)
3. Free tier includes 2,000 searches per month
4. Copy your API key to .env.local file

---

## API Cost Estimates

### Claude API
- ~50,000 tokens per analysis with tool use
- ~10 tool calls per portfolio (average)
- Estimated: $0.50-$1.00 per analysis

### Brave Search API
- Free tier: 2,000 searches/month
- ~5-10 searches per portfolio
- 200-400 portfolio analyses per month on free tier

---

## Success Criteria

1. ✅ Holdings are correctly identified and classified
2. ✅ Company/fund descriptions are accurate and relevant
3. ✅ Performance data is correctly extracted from documents
4. ✅ Volatility data is correctly displayed
5. ✅ Charts are clear and informative
6. ✅ Analysis completes within 60 seconds
7. ✅ System gracefully handles missing data
8. ✅ Total cost per analysis stays under $1.50
9. ✅ Industry super fund feature works correctly
10. ✅ Industry super fund analysis provides valuable insights
11. ✅ Copy/paste alternative is intuitive and functional
12. ✅ Validation prevents conflicting input methods
13. ✅ Both upload methods produce equivalent results

---

## Future Enhancements

1. **Real-time Price Updates**: Integrate live market data
2. **Historical Data Enrichment**: Fetch missing historical data from APIs
3. **Peer Comparison**: Compare holdings against sector averages
4. **ESG Scoring**: Add environmental/social/governance ratings
5. **Alert System**: Notify when holdings underperform
6. **Portfolio Rebalancing Suggestions**: Based on performance metrics

---

## Notes

- **Critical**: The system must handle cases where performance data is not in documents
- **Critical**: Web search must have fallbacks to prevent failures
- **Critical**: Tool use increases API costs - monitor usage
- **Critical**: Mutual exclusivity validation for upload methods is essential
- **Important**: Australian securities naming can be inconsistent - need robust parsing
- **Important**: Some managed funds have complex names - improve classification logic
- **Important**: Industry super fund conditional fields must be properly validated
- **Important**: Pasted content should strip formatting and handle line breaks correctly
- **UI/UX**: Large "OR" divider makes it clear users must choose one input method
- **UI/UX**: Disable textarea when files are uploaded and vice versa for clarity

---

## UI Flow Diagrams

### Questionnaire Flow with Industry Super Fund

```
Question 1-5: Standard questions
       ↓
Question 6: Is this an industry super fund?
       ↓
    [Yes] → Show two additional required fields:
            - Industry Super Fund Name (text input)
            - Risk Profile (dropdown: High Growth, Growth, Balanced, Conservative, Defensive)
            Total questions: 9 (7 base + 2 conditional)
       ↓
    [No] → Proceed with 7 questions total
       ↓
All required fields completed → Enable file upload section
```

### Upload Method Flow

```
┌─────────────────────────────────────┐
│     DRAG & DROP SECTION             │
│  [Drop zone for files]              │
│  Supported: PDF, DOCX, XLSX, XLS    │
└─────────────────────────────────────┘
                 ↓
         ┌──────────────┐
         │      OR      │  ← Large visual divider
         └──────────────┘
                 ↓
┌─────────────────────────────────────┐
│     COPY & PASTE SECTION            │
│  [Large textarea]                   │
│  Paste portfolio data from any doc  │
└─────────────────────────────────────┘
                 ↓
         ┌──────────────┐
         │  Validation  │
         └──────────────┘
                 ↓
    ┌────────────┴────────────┐
    │                         │
[Files Only]          [Pasted Content Only]
    │                         │
    └────────────┬────────────┘
                 ↓
         [Single Analyze Button]
                 ↓
    Process with Claude API
    (same handling for both methods)

ERROR STATE:
If both methods have content:
→ Show alert: "Cannot use both methods"
→ Disable Analyze button
→ User must clear one method
```

### Industry Super Fund Analysis Output

When industry super fund info is provided, Claude will add a section:

```markdown
## Industry Super Fund Analysis

### HOSTPLUS Balanced Option

**Fund Investment Strategy:**
- Description of what HOSTPLUS invests in
- Asset allocation for Balanced option (e.g., 70% growth, 30% defensive)
- Key features and fees

**Comparison with Your Portfolio:**
- How your current holdings compare to HOSTPLUS Balanced
- Similarities and differences in asset allocation
- Risk profile alignment
```
