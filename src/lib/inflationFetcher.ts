/**
 * Australian inflation rate fetcher
 * Fetches CPI data from the World Bank API and caches it for the process lifetime.
 * Falls back to 3% if the API is unavailable.
 */

const WORLD_BANK_URL =
  'https://api.worldbank.org/v2/country/AU/indicator/FP.CPI.TOTL.ZG?format=json&per_page=5&date=2020:2025';

const FALLBACK_RATE = 0.03; // 3%

let cachedInflationRate: number | null = null;

export async function fetchInflationRate(): Promise<number> {
  if (cachedInflationRate !== null) return cachedInflationRate;

  try {
    const response = await fetch(WORLD_BANK_URL, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`World Bank API returned ${response.status}`);

    const data = await response.json();
    // World Bank API returns [metadata, dataArray]
    const entries: Array<{ value: number | null; date: string }> = data[1];

    if (!Array.isArray(entries)) throw new Error('Unexpected response shape');

    // Find the most recent year with a non-null value (entries are newest-first)
    const recent = entries.find((e) => e.value !== null);
    if (recent?.value != null) {
      cachedInflationRate = recent.value / 100;
      return cachedInflationRate;
    }
  } catch {
    // Fall through to fallback
  }

  cachedInflationRate = FALLBACK_RATE;
  return cachedInflationRate;
}
