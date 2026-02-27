import { NextRequest } from 'next/server';
import { z } from 'zod';
import { executeSearchTool } from '@/lib/webSearchTool';

// Tell Vercel to allow up to 300 seconds for this route (Morningstar scraping can take time)
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// ============================================================================
// API Route: /api/fetch-returns - Fetch returns for holdings (without Claude)
// ============================================================================

// Validation schema
const FetchReturnsRequestSchema = z.object({
  tools: z.array(
    z.object({
      name: z.string(),
      input: z.record(z.any()),
    })
  ),
});

export async function POST(request: NextRequest) {
  let tools: z.infer<typeof FetchReturnsRequestSchema>['tools'];

  try {
    const body = await request.json();
    const validationResult = FetchReturnsRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request data', details: validationResult.error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    tools = validationResult.data.tools;
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to parse request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Execute tools with controlled concurrency (same as main analysis)
  const results: Array<{
    holdingName: string;
    totalReturn?: number;
    timeframe?: string;
    ticker?: string;
    error?: string;
  }> = [];

  const CONCURRENCY = 2; // Same as claudeClient.ts

  console.log(`[fetch-returns] Executing ${tools.length} return-fetching tools with concurrency ${CONCURRENCY}`);

  // Helper to execute a batch of tools concurrently
  const executeBatch = async (batch: typeof tools) => {
    return Promise.all(
      batch.map(async (tool) => {
        try {
          console.log(`[fetch-returns] Executing ${tool.name}:`, tool.input);
          
          const result = await executeSearchTool(tool.name, tool.input);
          
          // Parse the result to extract return and timeframe
          // Format: "Fund: 1-year Investor Return is 3.52% for the period 1 Feb 2025 to 31 Jan 2026"
          // or: "Total return for CBA.AX from 24 Feb 2025 to 24 Feb 2026: 12.5%"
          
          let totalReturn: number | undefined;
          let timeframe: string | undefined;
          
          // Extract return percentage (look for pattern like "12.5%" or "is 3.52%")
          const returnMatch = result.match(/(?:is |: )([-]?\d+\.?\d*)%/);
          if (returnMatch) {
            totalReturn = parseFloat(returnMatch[1]);
          }
          
          // Extract timeframe (look for pattern like "for the period X to Y" or "from X to Y")
          const timeframeMatch = result.match(/(?:for the period|from) ([^.]+? to [^.]+?)(?:\.|$|Sources)/i);
          if (timeframeMatch) {
            timeframe = timeframeMatch[1].trim();
          }
          
          return {
            holdingName: tool.input.holding_name || tool.input.fund_name || '',
            ticker: tool.input.ticker,
            totalReturn,
            timeframe,
          };
        } catch (error) {
          console.error(`[fetch-returns] Tool ${tool.name} failed:`, error);
          return {
            holdingName: tool.input.holding_name || tool.input.fund_name || '',
            ticker: tool.input.ticker,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );
  };

  // Process tools in batches
  for (let i = 0; i < tools.length; i += CONCURRENCY) {
    const batch = tools.slice(i, i + CONCURRENCY);
    const batchResults = await executeBatch(batch);
    results.push(...batchResults);
  }

  console.log(`[fetch-returns] Completed ${results.length} tools. Successful: ${results.filter(r => r.totalReturn !== undefined).length}`);

  return new Response(
    JSON.stringify({
      success: true,
      returns: results,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export async function GET() {
  return new Response(
    JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
}
