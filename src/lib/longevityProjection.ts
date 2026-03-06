import type { LongevityProjection, LongevityProjectionPoint } from '@/types';

export interface LongevityProjectionInput {
  portfolioValue: number;
  annualDrawdown: number;
  expectedReturn: number; // decimal, e.g. 0.058
  inflationRate: number; // decimal, e.g. 0.03
  currentAge: number;
  maxYears?: number;
}

/**
 * Year-by-year longevity projection using real-return drawdown modelling.
 *
 * Real return = nominal return − inflation (simplified Fisher approximation).
 * Both nominal and inflation-adjusted (real) balances are tracked so the chart
 * can show the eroding purchasing power of the portfolio over time.
 */
export function calculateLongevityProjection(
  input: LongevityProjectionInput
): LongevityProjection {
  const {
    portfolioValue,
    annualDrawdown,
    expectedReturn,
    inflationRate,
    currentAge,
    maxYears = 60,
  } = input;

  const realReturn = expectedReturn - inflationRate; // Fisher approximation

  const points: LongevityProjectionPoint[] = [];
  let nominalBalance = portfolioValue;
  let realBalance = portfolioValue;

  let yearsUntilDepletion: number | null = null;
  let depletionAge: number | null = null;

  // Year 0 — starting position
  points.push({ year: 0, age: currentAge, nominalBalance, realBalance });

  for (let year = 1; year <= maxYears; year++) {
    nominalBalance = nominalBalance * (1 + expectedReturn) - annualDrawdown;
    realBalance = realBalance * (1 + realReturn) - annualDrawdown;

    const age = currentAge + year;

    if (realBalance <= 0 && yearsUntilDepletion === null) {
      yearsUntilDepletion = year;
      depletionAge = age;
      points.push({
        year,
        age,
        nominalBalance: Math.max(0, nominalBalance),
        realBalance: 0,
      });
      break;
    }

    points.push({
      year,
      age,
      nominalBalance: Math.max(0, nominalBalance),
      realBalance: Math.max(0, realBalance),
    });
  }

  return {
    points,
    yearsUntilDepletion,
    depletionAge,
    inflationRate,
    annualDrawdown,
    expectedReturn,
  };
}

/** Map an AgeRange string to a representative midpoint age. */
export function ageRangeToMidpoint(ageRange: string): number {
  switch (ageRange) {
    case 'Under 40':
      return 35;
    case '40-60':
      return 50;
    case '60-80':
      return 70;
    case '80+':
      return 85;
    default:
      return 50;
  }
}
