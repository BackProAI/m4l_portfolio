import { NextRequest } from 'next/server';
import { z } from 'zod';
import { executeSearchTool } from '@/lib/webSearchTool';

// Separate 300s budget so Morningstar scraping doesn't eat into the main analysis timeout
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// ============================================================================
// API Route: /api/fetch-allocations - Pre-fetch asset allocations for all holdings
// ============================================================================

const FetchAllocationsRequestSchema = z.object({
  tools: z.array(
    z.object({
      name: z.literal('search_fund_asset_allocation'),
      input: z.object({
        fund_name: z.string(),
        ticker: z.string().optional(),
        fund_manager: z.string().optional(),
      }),
    })
  ),
});

export async function POST(request: NextRequest) {
  let tools: z.infer<typeof FetchAllocationsRequestSchema>['tools'];

  try {
    const body = await request.json();
    const validation = FetchAllocationsRequestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request data', details: validation.error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    tools = validation.data.tools;
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to parse request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Run sequentially with concurrency=1 — Morningstar scraping is browser-heavy
  // and parallel browser instances are too resource-intensive on Vercel
  const CONCURRENCY = 1;
  const STAGGER_DELAY_MS = 1000;

  console.log(`[fetch-allocations] Executing ${tools.length} allocation lookups with concurrency ${CONCURRENCY}`);

  const results: Array<{
    holdingName: string;
    ticker?: string;
    description: string;
    sources: string[];
    error?: string;
  }> = [];

  for (let i = 0; i < tools.length; i += CONCURRENCY) {
    const batch = tools.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (tool, indexInBatch) => {
        if (indexInBatch > 0) {
          await new Promise(resolve => setTimeout(resolve, STAGGER_DELAY_MS));
        }
        try {
          console.log(`[fetch-allocations] Looking up allocation for: ${tool.input.fund_name}`);
          const raw = await executeSearchTool(tool.name, tool.input);

          // Split description from sources footer that executeSearchTool appends
          const sourcesMarker = '\n\nSources: ';
          const markerIdx = raw.lastIndexOf(sourcesMarker);
          const description = markerIdx !== -1 ? raw.slice(0, markerIdx) : raw;
          const sourcesStr = markerIdx !== -1 ? raw.slice(markerIdx + sourcesMarker.length) : '';
          const sources = sourcesStr && sourcesStr !== 'None'
            ? sourcesStr.split(', ').filter(Boolean)
            : [];

          console.log(`[fetch-allocations] ✅ ${tool.input.fund_name}: ${description.slice(0, 120)}`);

          return {
            holdingName: tool.input.fund_name,
            ticker: tool.input.ticker,
            description,
            sources,
          };
        } catch (error) {
          console.error(`[fetch-allocations] Failed for ${tool.input.fund_name}:`, error);
          return {
            holdingName: tool.input.fund_name,
            ticker: tool.input.ticker,
            description: `${tool.input.fund_name} - Allocation lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}. Cannot determine allocation — do NOT estimate or guess.`,
            sources: [],
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );
    results.push(...batchResults);
  }

  console.log(`[fetch-allocations] Completed ${results.length} lookups. Successful: ${results.filter(r => !r.error).length}`);

  return new Response(
    JSON.stringify({ success: true, allocations: results }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function GET() {
  return new Response(
    JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
}
