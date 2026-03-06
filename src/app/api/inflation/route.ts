import { NextRequest } from 'next/server';
import { fetchInflationRate } from '@/lib/inflationFetcher';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const inflationRate = await fetchInflationRate();
  return Response.json({ inflationRate });
}
