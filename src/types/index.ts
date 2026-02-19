// ============================================================================
// TypeScript Type Definitions for Portfolio Analysis Application
// ============================================================================

// Investor Profile Types
// ============================================================================

export type InvestorType = 
  | 'High Growth' 
  | 'Growth' 
  | 'Balanced' 
  | 'Conservative' 
  | 'Defensive';

export type Phase = 
  | 'Accumulation' 
  | 'Investment' 
  | 'Non-super' 
  | 'Pension';

export type AgeRange = 
  | 'Under 40' 
  | '40-60' 
  | '60-80' 
  | '80+';

export interface InvestorProfile {
  name: string; // Full name of the portfolio owner
  investorType: InvestorType | '';
  phase: Phase | '';
  ageRange: AgeRange | '';
  fundCommentary: boolean | undefined;
  includeRiskSummary: boolean | undefined; // Question: Include Portfolio Risk Summary with Portfolio Volatility?
  isIndustrySuperFund: boolean | undefined; // Question 6: Is this an industry super fund?
  industrySuperFundName?: string; // Required if isIndustrySuperFund = true
  industrySuperFundRiskProfile?: InvestorType | ''; // Required if isIndustrySuperFund = true
}

// File Upload Types
// ============================================================================

export type FileType = 'pdf' | 'docx' | 'xlsx' | 'xls';

export type UploadStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface UploadedFile {
  id: string;
  file: File;
  type: FileType;
  status: UploadStatus;
  parsedContent?: string;
  error?: string;
  metadata?: {
    pageCount?: number;
    sheetNames?: string[];
    size: number;
  };
}

// Analysis Result Types
// ============================================================================

export interface AnalysisResult {
  markdown: string; // Full analysis in markdown format
  chartData: ChartData; // Structured data for visualizations
}

export interface ChartData {
  assetAllocation: AllocationItem[];
  riskComparison: RiskComparison;
  fees: FeeBreakdown[];
  portfolioValue: number;
  holdingsPerformance?: HoldingPerformance[]; // Optional: Detailed holdings analysis with performance data
  portfolioRisk?: PortfolioRiskSummary; // Optional: Asset-class level risk metrics
}

export interface AllocationItem {
  name: string; // Asset class name (e.g., "Australian Equities", "International Equities", "Fixed Income", "Cash")
  value: number; // Dollar value
  percentage: number; // Percentage of portfolio
}

export interface RiskComparison {
  currentRisk: InvestorType; // Current portfolio risk level
  targetRisk: InvestorType; // Target based on investor profile
  alignment: 'Aligned' | 'Too Conservative' | 'Too Aggressive';
}

export interface FeeBreakdown {
  category: string; // Fee category (e.g., "Management Fees", "Admin Fees", "Performance Fees")
  amount: number; // Annual dollar amount
  percentage: number; // Percentage of portfolio
}

// Holdings Performance Types
// ============================================================================

export type HoldingType = 'direct-share' | 'managed-fund' | 'security';

export interface YearlyPerformance {
  year: number; // Calendar year (e.g., 2024, 2023)
  return: number; // Annual return percentage (e.g., 12.5 for 12.5%)
}

export interface YearlyVolatility {
  year: number; // Calendar year (e.g., 2024, 2023)
  standardDeviation: number; // Annual standard deviation (e.g., 15.2 for 15.2%)
}

export interface HoldingPerformance {
  name: string; // Name of the holding (e.g., "Commonwealth Bank", "Vanguard High Growth Index")
  type: HoldingType; // Type of holding: direct share, managed fund, or other security
  description: string; // Business/investment description (fetched from web or Claude's knowledge)
  ticker?: string; // Optional ticker symbol for direct shares (e.g., "CBA.AX")
  currentValue: number; // Current dollar value of this holding
  percentage: number; // Percentage of total portfolio
  performanceTimeframe?: string; // Exact timeframe label from statement (e.g., "1 Jul 2024 to 30 Jun 2025")
  totalReturnForTimeframe?: number; // Total return (%) over the exact statement timeframe
  performance: YearlyPerformance[]; // Historical performance data by year
  volatility: YearlyVolatility[]; // Volatility metrics by year
}

// Portfolio Risk Summary Types
// ============================================================================

export interface PortfolioRiskSummary {
  portfolioStandardDeviation: number; // Annualised sigma for the whole portfolio (e.g., 0.08 for 8%)
  portfolioVariance: number; // Variance value (sigma squared)
  notes?: string; // Optional commentary or data coverage notes
  assetClasses: PortfolioRiskAssetClass[]; // Asset-class level metrics
  correlationMatrix: PortfolioCorrelationRow[]; // Correlation coefficients between asset classes
  sources?: string[]; // External references used to derive the metrics
}

export interface PortfolioRiskAssetClass {
  name: string;
  weightPercentage: number; // Weight as a percentage of portfolio (e.g., 26 for 26%)
  value: number; // Dollar exposure for the asset class
  expectedReturn?: number; // Expected long-term return (decimal, e.g., 0.07)
  standardDeviation?: number; // Annualised standard deviation (decimal)
  riskContribution?: number; // Portion of portfolio variance contributed by this asset class
}

export interface PortfolioCorrelationRow {
  assetClass: string;
  correlations: PortfolioCorrelationCell[];
}

export interface PortfolioCorrelationCell {
  with: string;
  coefficient: number; // Correlation coefficient between -1 and 1
}

// API Request/Response Types
// ============================================================================

export interface AnalysisRequest {
  profile: InvestorProfile;
  documents: {
    filename: string;
    content: string;
    type: FileType;
  }[];
}

export interface AnalysisResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: string;
}

export interface EmailRequest {
  email: string;
  profile: InvestorProfile;
  analysis: AnalysisResult;
}

export interface EmailResponse {
  success: boolean;
  message: string;
  error?: string;
}
