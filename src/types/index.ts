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
  valueForMoney: boolean | undefined;
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
