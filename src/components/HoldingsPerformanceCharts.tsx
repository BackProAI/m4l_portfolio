'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { HoldingPerformance } from '@/types';

// ============================================================================
// Holdings Performance Charts - Visualizations for individual holdings
// ============================================================================

// mlfs.com.au color palette
const CHART_COLORS = {
  primary: '#1B4F7B',
  secondary: '#3B7FA7',
  accent: '#E67E22',
  success: '#2ECC71',
  neutral: '#6C757D',
  lightBlue: '#5DADE2',
  gold: '#F39C12',
  red: '#E74C3C',
};

const COLOR_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.accent,
  CHART_COLORS.success,
  CHART_COLORS.gold,
  CHART_COLORS.lightBlue,
  CHART_COLORS.neutral,
  CHART_COLORS.red,
];

interface HoldingsPerformanceChartsProps {
  holdings: HoldingPerformance[];
}

export function HoldingsPerformanceCharts({ holdings }: HoldingsPerformanceChartsProps) {
  if (!holdings || holdings.length === 0) {
    return null;
  }

  // Categorize holdings by type
  const directShares = holdings.filter(h => h.type === 'direct-share');
  const managedFunds = holdings.filter(h => h.type === 'managed-fund');
  const securities = holdings.filter(h => h.type === 'security');

  // Transform data for performance comparison chart
  const performanceData = preparePerformanceComparisonData(holdings);
  
  // Transform data for volatility comparison chart
  const volatilityData = prepareVolatilityComparisonData(holdings);

  // Transform data for risk-return scatter plot
  const riskReturnData = prepareRiskReturnData(holdings);

  return (
    <div className="space-y-6">
      {/* Holdings Overview Table */}
      <Card>
        <CardHeader>
          <CardTitle>Holdings Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Direct Shares */}
            {directShares.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Direct Shares</h3>
                <HoldingsTable holdings={directShares} />
              </div>
            )}

            {/* Managed Funds */}
            {managedFunds.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Managed Funds</h3>
                <HoldingsTable holdings={managedFunds} />
              </div>
            )}

            {/* Securities */}
            {securities.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Securities</h3>
                <HoldingsTable holdings={securities} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Comparison Chart */}
      {performanceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historical Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis label={{ value: 'Return (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value: any) => `${Number(value).toFixed(2)}%`}
                />
                <Legend />
                {holdings.map((holding, index) => (
                  <Bar 
                    key={holding.name}
                    dataKey={holding.name}
                    fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                    name={holding.name}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Volatility Comparison Chart */}
      {volatilityData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Volatility Comparison (Standard Deviation)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={volatilityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis label={{ value: 'Std Dev (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value: any) => `${Number(value).toFixed(2)}%`}
                />
                <Legend />
                {holdings.map((holding, index) => (
                  <Line 
                    key={holding.name}
                    type="monotone"
                    dataKey={holding.name}
                    stroke={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                    strokeWidth={2}
                    name={holding.name}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Risk-Return Scatter Plot */}
      {riskReturnData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Risk vs Return Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="volatility" 
                  name="Volatility"
                  label={{ value: 'Volatility (Std Dev %)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="return" 
                  name="Return"
                  label={{ value: 'Avg Return (%)', angle: -90, position: 'insideLeft' }}
                />
                <ZAxis range={[100, 400]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={<CustomScatterTooltip />}
                />
                <Legend />
                {riskReturnData.map((item, index) => (
                  <Scatter
                    key={item.name}
                    name={item.name}
                    data={[item]}
                    fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-neutral-50 rounded-lg">
              <p className="text-sm text-neutral-600">
                <strong>Interpretation:</strong> Higher returns with lower volatility (top-left) indicate better risk-adjusted performance.
                Holdings in the bottom-right show higher risk with lower returns.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Holdings Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {holdings.map((holding, index) => (
          <HoldingDetailCard 
            key={holding.name}
            holding={holding}
            color={COLOR_PALETTE[index % COLOR_PALETTE.length]}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface HoldingsTableProps {
  holdings: HoldingPerformance[];
}

function HoldingsTable({ holdings }: HoldingsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-neutral-100 border-b-2 border-neutral-300">
          <tr>
            <th className="text-left p-3 font-semibold text-neutral-700">Name</th>
            <th className="text-left p-3 font-semibold text-neutral-700">Description</th>
            <th className="text-right p-3 font-semibold text-neutral-700">Value</th>
            <th className="text-right p-3 font-semibold text-neutral-700">% Portfolio</th>
            <th className="text-right p-3 font-semibold text-neutral-700">Avg Return</th>
            <th className="text-right p-3 font-semibold text-neutral-700">Avg Volatility</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => {
            const avgReturn = calculateAverage(holding.performance.map(p => p.return));
            const avgVolatility = calculateAverage(holding.volatility.map(v => v.standardDeviation));
            
            return (
              <tr key={holding.name} className="border-b border-neutral-200 hover:bg-neutral-50">
                <td className="p-3 font-medium text-neutral-900">
                  {holding.name}
                  {holding.ticker && (
                    <span className="ml-2 text-xs text-neutral-500">({holding.ticker})</span>
                  )}
                </td>
                <td className="p-3 text-neutral-600 max-w-xs truncate" title={holding.description}>
                  {holding.description}
                </td>
                <td className="p-3 text-right font-medium text-neutral-900">
                  ${holding.currentValue.toLocaleString('en-AU')}
                </td>
                <td className="p-3 text-right text-neutral-700">
                  {holding.percentage.toFixed(1)}%
                </td>
                <td className={`p-3 text-right font-medium ${avgReturn !== null && avgReturn >= 0 ? 'text-success' : 'text-error'}`}>
                  {avgReturn ? `${avgReturn.toFixed(2)}%` : 'N/A'}
                </td>
                <td className="p-3 text-right text-neutral-700">
                  {avgVolatility ? `${avgVolatility.toFixed(2)}%` : 'N/A'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface HoldingDetailCardProps {
  holding: HoldingPerformance;
  color: string;
}

function HoldingDetailCard({ holding, color }: HoldingDetailCardProps) {
  const avgReturn = calculateAverage(holding.performance.map(p => p.return));
  const avgVolatility = calculateAverage(holding.volatility.map(v => v.standardDeviation));

  return (
    <Card>
      <CardHeader style={{ borderLeftWidth: '4px', borderLeftColor: color }}>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{holding.name}</CardTitle>
            {holding.ticker && (
              <p className="text-sm text-neutral-500 mt-1">Ticker: {holding.ticker}</p>
            )}
          </div>
          <Badge variant={holding.type === 'direct-share' ? 'info' : holding.type === 'managed-fund' ? 'success' : 'default'}>
            {holding.type === 'direct-share' ? 'Direct Share' : holding.type === 'managed-fund' ? 'Managed Fund' : 'Security'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Description */}
          <p className="text-sm text-neutral-600">{holding.description}</p>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-lg">
            <div>
              <p className="text-xs text-neutral-500 mb-1">Current Value</p>
              <p className="text-lg font-semibold text-neutral-900">
                ${holding.currentValue.toLocaleString('en-AU')}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Portfolio Weight</p>
              <p className="text-lg font-semibold text-neutral-900">
                {holding.percentage.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Avg Return</p>
              <p className={`text-lg font-semibold ${avgReturn !== null && avgReturn >= 0 ? 'text-success' : 'text-error'}`}>
                {avgReturn ? `${avgReturn.toFixed(2)}%` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Avg Volatility</p>
              <p className="text-lg font-semibold text-neutral-900">
                {avgVolatility ? `${avgVolatility.toFixed(2)}%` : 'N/A'}
              </p>
            </div>
          </div>

          {/* Performance History */}
          {holding.performance.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-neutral-700 mb-2">Performance History</p>
              <div className="space-y-1">
                {holding.performance.map((perf) => (
                  <div key={perf.year} className="flex justify-between text-sm">
                    <span className="text-neutral-600">{perf.year}</span>
                    <span className={`font-medium ${perf.return >= 0 ? 'text-success' : 'text-error'}`}>
                      {perf.return.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Volatility History */}
          {holding.volatility.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-neutral-700 mb-2">Volatility History</p>
              <div className="space-y-1">
                {holding.volatility.map((vol) => (
                  <div key={vol.year} className="flex justify-between text-sm">
                    <span className="text-neutral-600">{vol.year}</span>
                    <span className="font-medium text-neutral-700">
                      {vol.standardDeviation.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CustomScatterTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-neutral-300 rounded shadow-lg">
        <p className="font-semibold text-neutral-900">{data.name}</p>
        <p className="text-sm text-neutral-600">Return: {data.return.toFixed(2)}%</p>
        <p className="text-sm text-neutral-600">Volatility: {data.volatility.toFixed(2)}%</p>
      </div>
    );
  }
  return null;
}

// ============================================================================
// Data Transformation Functions
// ============================================================================

function preparePerformanceComparisonData(holdings: HoldingPerformance[]) {
  const allYears = new Set<number>();
  holdings.forEach(holding => {
    holding.performance.forEach(perf => allYears.add(perf.year));
  });

  const sortedYears = Array.from(allYears).sort((a, b) => a - b);

  return sortedYears.map(year => {
    const dataPoint: any = { year };
    holdings.forEach(holding => {
      const perf = holding.performance.find(p => p.year === year);
      dataPoint[holding.name] = perf ? perf.return : null;
    });
    return dataPoint;
  });
}

function prepareVolatilityComparisonData(holdings: HoldingPerformance[]) {
  const allYears = new Set<number>();
  holdings.forEach(holding => {
    holding.volatility.forEach(vol => allYears.add(vol.year));
  });

  const sortedYears = Array.from(allYears).sort((a, b) => a - b);

  return sortedYears.map(year => {
    const dataPoint: any = { year };
    holdings.forEach(holding => {
      const vol = holding.volatility.find(v => v.year === year);
      dataPoint[holding.name] = vol ? vol.standardDeviation : null;
    });
    return dataPoint;
  });
}

function prepareRiskReturnData(holdings: HoldingPerformance[]) {
  return holdings
    .filter(holding => holding.performance.length > 0 && holding.volatility.length > 0)
    .map(holding => {
      const avgReturn = calculateAverage(holding.performance.map(p => p.return));
      const avgVolatility = calculateAverage(holding.volatility.map(v => v.standardDeviation));
      
      return {
        name: holding.name,
        return: avgReturn || 0,
        volatility: avgVolatility || 0,
      };
    });
}

function calculateAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}
