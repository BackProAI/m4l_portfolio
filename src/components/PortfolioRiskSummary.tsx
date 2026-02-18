import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { PortfolioRiskSummary } from '@/types';

interface PortfolioRiskSummaryProps {
  data: PortfolioRiskSummary;
}

// ============================================================================
// Portfolio Risk Summary - Displays asset-class volatility and correlation data
// ============================================================================

function formatPercent(value?: number, digits: number = 2): string {
  if (value === undefined || value === null) return 'N/A';
  return `${(value * 100).toFixed(digits)}%`;
}

function formatReturn(value?: number): string {
  if (value === undefined || value === null) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
}

export function PortfolioRiskSummary({ data }: PortfolioRiskSummaryProps) {
  const { portfolioStandardDeviation, portfolioVariance, assetClasses, correlationMatrix, notes, sources } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Risk Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
            <p className="text-sm text-neutral-500">Portfolio Volatility</p>
            <p className="text-2xl font-bold text-primary">{formatPercent(portfolioStandardDeviation)}</p>
            <p className="text-xs text-neutral-500 mt-1">Measured as annualised standard deviation (σ)</p>
          </div>
          <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
            <p className="text-sm text-neutral-500">Portfolio Variance</p>
            <p className="text-2xl font-bold text-primary">{portfolioVariance?.toFixed(4) ?? 'N/A'}</p>
            <p className="text-xs text-neutral-500 mt-1">σ² derived from weights and correlations</p>
          </div>
          <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
            <p className="text-sm text-neutral-500">Asset Classes Covered</p>
            <p className="text-2xl font-bold text-primary">{assetClasses.length}</p>
            <p className="text-xs text-neutral-500 mt-1">Mapped from current holdings</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-neutral-700 mb-3">Asset-Class Metrics</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="text-left p-3 font-semibold text-neutral-700">Asset Class</th>
                  <th className="text-right p-3 font-semibold text-neutral-700">Weight</th>
                  <th className="text-right p-3 font-semibold text-neutral-700">Value</th>
                  <th className="text-right p-3 font-semibold text-neutral-700">Expected Return</th>
                  <th className="text-right p-3 font-semibold text-neutral-700">Std Dev</th>
                  <th className="text-right p-3 font-semibold text-neutral-700">Variance Contribution</th>
                </tr>
              </thead>
              <tbody>
                {assetClasses.map((asset) => (
                  <tr key={asset.name} className="border-b border-neutral-200">
                    <td className="p-3 text-neutral-800 font-medium">{asset.name}</td>
                    <td className="p-3 text-right text-neutral-700">{asset.weightPercentage.toFixed(2)}%</td>
                    <td className="p-3 text-right text-neutral-700">${asset.value.toLocaleString('en-AU')}</td>
                    <td className="p-3 text-right text-neutral-700">{formatReturn(asset.expectedReturn)}</td>
                    <td className="p-3 text-right text-neutral-700">{formatPercent(asset.standardDeviation)}</td>
                    <td className="p-3 text-right text-neutral-700">{asset.riskContribution !== undefined ? asset.riskContribution.toFixed(4) : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {correlationMatrix.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-neutral-700 mb-3">Correlation Matrix</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="text-left p-3 font-semibold text-neutral-700">Asset Class</th>
                    {correlationMatrix.map((row) => (
                      <th key={`col-${row.assetClass}`} className="text-right p-3 font-semibold text-neutral-700">
                        {row.assetClass}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {correlationMatrix.map((row) => (
                    <tr key={row.assetClass} className="border-b border-neutral-200">
                      <td className="p-3 text-neutral-800 font-medium">{row.assetClass}</td>
                      {correlationMatrix.map((col) => {
                        const match = row.correlations.find((c) => c.with === col.assetClass);
                        return (
                          <td key={`${row.assetClass}-${col.assetClass}`} className="p-3 text-right text-neutral-700">
                            {match ? match.coefficient.toFixed(2) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(notes || (sources && sources.length > 0)) && (
          <div className="text-xs text-neutral-500 space-y-1">
            {notes && <p>{notes}</p>}
            {sources && sources.length > 0 && (
              <p>
                Sources: {sources.join(', ')}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
