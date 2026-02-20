/**
 * Asset Class Capital Market Assumptions
 * 
 * Based on institutional correlation matrix and volatility data (February 2026).
 * These metrics provide consistent, authoritative data for portfolio risk calculations.
 * 
 * Data represents actual institutional assumptions for Australian market conditions.
 * Volatility values from Alternative Class Breakdown table (Predicted Volatility % column).
 * Correlation coefficients from institutional correlation matrix.
 * 
 * Last Updated: February 2026
 */

export interface AssetClassMetrics {
  expectedReturn: number;  // Annual expected return (as decimal, e.g., 0.085 = 8.5%)
  standardDeviation: number;  // Annualized volatility (as decimal, e.g., 0.16 = 16%)
  description: string;
}

/**
 * Standard asset class metrics for portfolio risk calculations
 * All values are expressed as decimals (e.g., 0.085 = 8.5%, 0.202 = 20.2%)
 * 
 * Based on provided institutional data (February 2026)
 */
export const ASSET_CLASS_METRICS: Record<string, AssetClassMetrics> = {
  'Australian Shares': {
    expectedReturn: 0.058,  // 5.8% annual return
    standardDeviation: 0.202,  // 20.2% volatility
    description: 'Australian equity market (ASX-listed securities)'
  },
  'International Shares': {
    expectedReturn: 0.057,  // 5.7% annual return
    standardDeviation: 0.162,  // 16.2% volatility
    description: 'Global equity markets (ex-Australia, diversified)'
  },
  'Australian Fixed Interest': {
    expectedReturn: 0.041,  // 4.1% annual return
    standardDeviation: 0.063,  // 6.3% volatility
    description: 'Australian bonds and fixed income securities'
  },
  'International Fixed Interest': {
    expectedReturn: 0.046,  // 4.6% annual return
    standardDeviation: 0.053,  // 5.3% volatility
    description: 'Global bonds and fixed income (ex-Australia, hedged)'
  },
  'Australian Property': {
    expectedReturn: 0.043,  // 4.3% annual return
    standardDeviation: 0.201,  // 20.1% volatility
    description: 'Australian listed property trusts (A-REITs)'
  },
  'International Property': {
    expectedReturn: 0.060,  // 6.0% annual return
    standardDeviation: 0.155,  // 15.5% volatility (Infrastructure proxy)
    description: 'Global listed property trusts (ex-Australia)'
  },
  'Domestic Cash': {
    expectedReturn: 0.034,  // 3.4% annual return
    standardDeviation: 0.011,  // 1.1% volatility
    description: 'Australian cash and cash equivalents'
  },
  'International Cash': {
    expectedReturn: 0.030,  // 3.0% annual return
    standardDeviation: 0.011,  // 1.1% volatility
    description: 'Global cash and cash equivalents (hedged)'
  },
  'Alternatives': {
    expectedReturn: 0.120,  // 12.0% annual return
    standardDeviation: 0.160,  // 16.0% volatility (Hedge Funds proxy)
    description: 'Alternative investments (hedge funds, commodities, infrastructure)'
  },
  // Aliases for common variations
  'Cash': {
    expectedReturn: 0.034,
    standardDeviation: 0.011,
    description: 'Cash and cash equivalents'
  },
  'Property': {
    expectedReturn: 0.043,
    standardDeviation: 0.201,
    description: 'Listed property trusts'
  },
  'Fixed Interest': {
    expectedReturn: 0.041,
    standardDeviation: 0.063,
    description: 'Bonds and fixed income securities'
  }
};

/**
 * Correlation matrix between asset classes
 * Values represent the correlation coefficient (ρ) between pairs, ranging from -1 to 1
 * Based on institutional correlation matrix (February 2026)
 * 
 * Correlation interpretation:
 * - 1.0: Perfect positive correlation
 * - 0.0: No correlation
 * - -1.0: Perfect negative correlation
 * 
 * Key: "Asset Class A|Asset Class B" (alphabetically sorted to avoid duplicates)
 */
export const CORRELATION_MATRIX: Record<string, number> = {
  // Australian Shares correlations
  'Australian Fixed Interest|Australian Shares': -0.04,
  'Australian Property|Australian Shares': 0.64,
  'Australian Shares|International Fixed Interest': -0.11,
  'Australian Shares|International Property': 0.58,
  'Australian Shares|International Shares': 0.73,
  'Alternatives|Australian Shares': 0.48,
  'Australian Shares|Cash': -0.01,
  'Australian Shares|Domestic Cash': -0.01,
  'Australian Shares|International Cash': 0.02,

  // International Shares correlations
  'International Fixed Interest|International Shares': 0.03,
  'International Property|International Shares': 0.68,
  'Alternatives|International Shares': 0.51,
  'Cash|International Shares': 0.01,
  'Domestic Cash|International Shares': 0.01,
  'International Cash|International Shares': 0.02,

  // Property correlations
  'Australian Property|International Property': 0.52,
  'Alternatives|Australian Property': 0.41,
  'Australian Property|Cash': 0.02,
  'Australian Property|Domestic Cash': 0.02,
  'Australian Property|International Cash': 0.03,
  'Alternatives|International Property': 0.46,
  'Cash|International Property': 0.01,
  'Domestic Cash|International Property': 0.01,
  'International Cash|International Property': 0.02,

  // Fixed Interest correlations
  'Australian Fixed Interest|Australian Property': 0.12,
  'Australian Fixed Interest|International Fixed Interest': 0.51,
  'Australian Fixed Interest|International Property': 0.08,
  'Alternatives|Australian Fixed Interest': 0.15,
  'Australian Fixed Interest|Cash': 0.25,
  'Australian Fixed Interest|Domestic Cash': 0.25,
  'Australian Fixed Interest|International Cash': 0.18,
  'International Fixed Interest|International Property': 0.11,
  'Alternatives|International Fixed Interest': 0.18,
  'Cash|International Fixed Interest': 0.15,
  'Domestic Cash|International Fixed Interest': 0.15,
  'International Cash|International Fixed Interest': 0.22,

  // Alternatives correlations
  'Alternatives|Cash': 0.08,
  'Alternatives|Domestic Cash': 0.08,
  'Alternatives|International Cash': 0.06,

  // Cash correlations (high correlation with other cash types)
  'Cash|Domestic Cash': 0.98,
  'Cash|International Cash': 0.85,
  'Domestic Cash|International Cash': 0.85,

  // Generic aliases
  'Cash|Fixed Interest': 0.25,
  'Cash|Property': 0.02,
  'Fixed Interest|Property': 0.12,
};

/**
 * Get correlation coefficient between two asset classes
 * Handles alphabetical ordering to avoid duplicate entries
 * 
 * @param assetClassA - First asset class name
 * @param assetClassB - Second asset class name
 * @returns Correlation coefficient (0.0 if not found)
 */
export function getCorrelation(assetClassA: string, assetClassB: string): number {
  if (assetClassA === assetClassB) {
    return 1.0; // Perfect correlation with itself
  }

  // Create sorted key to handle both orderings
  const key = [assetClassA, assetClassB].sort().join('|');
  
  // Return correlation or 0.0 if not found
  return CORRELATION_MATRIX[key] ?? 0.0;
}

/**
 * Get asset class metrics (expected return and standard deviation)
 * 
 * @param assetClass - Asset class name
 * @returns Metrics object or null if not found
 */
export function getAssetClassMetrics(assetClass: string): AssetClassMetrics | null {
  return ASSET_CLASS_METRICS[assetClass] ?? null;
}

/**
 * Format a percentage for display
 * @param value - Decimal value (e.g., 0.085)
 * @param decimals - Number of decimal places
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
