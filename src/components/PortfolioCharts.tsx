'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { HoldingsPerformanceCharts } from '@/components/HoldingsPerformanceCharts';
import { PortfolioRiskSummary } from '@/components/PortfolioRiskSummary';
import type { ChartData, InvestorType, HoldingPerformance } from '@/types';

// ============================================================================
// Portfolio Charts - Visualizations for portfolio data
// ============================================================================

// mlfs.com.au color palette for charts
const CHART_COLORS = [
  '#1B4F7B', // Primary blue
  '#3B7FA7', // Lighter blue
  '#E67E22', // Accent orange
  '#2ECC71', // Success green
  '#6C757D', // Neutral gray
  '#5DADE2', // Light blue
  '#F39C12', // Gold
  '#E74C3C', // Red
];

interface PortfolioChartsProps {
  chartData: ChartData;
  holdingsPerformance?: HoldingPerformance[];
}

export function PortfolioCharts({ chartData, holdingsPerformance }: PortfolioChartsProps) {
  return (
    <div className="space-y-6">
      {/* Portfolio Value Summary */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-sm text-neutral-500 mb-1">Total Portfolio Value</p>
            <p className="text-4xl font-bold text-primary">
              ${chartData.portfolioValue.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Allocation Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={chartData.assetAllocation}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.percentage}%`}
                  outerRadius={110}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.assetAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => `$${Number(value || 0).toLocaleString('en-AU')}`}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Allocation Table */}
            <div className="mt-6 space-y-2.5 bg-neutral-50 rounded-lg p-4">
              {chartData.assetAllocation.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2.5 border-b border-neutral-200 last:border-0">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-sm flex-shrink-0" 
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    ></div>
                    <span className="text-sm font-medium text-neutral-800">{item.name}</span>
                  </div>
                  <span className="font-semibold text-neutral-900 text-sm">
                    ${item.value.toLocaleString('en-AU')} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Profile Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Risk Profile Badges */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-neutral-500 mb-2">Current Portfolio Risk</p>
                  <Badge 
                    variant={getRiskBadgeVariant(chartData.riskComparison.currentRisk)}
                    size="lg"
                  >
                    {chartData.riskComparison.currentRisk}
                  </Badge>
                </div>
                
                <div>
                  <p className="text-sm text-neutral-500 mb-2">Target Risk (Based on Your Profile)</p>
                  <Badge 
                    variant={getRiskBadgeVariant(chartData.riskComparison.targetRisk)}
                    size="lg"
                  >
                    {chartData.riskComparison.targetRisk}
                  </Badge>
                </div>
              </div>

              {/* Alignment Status */}
              <div className={`
                p-4 rounded-lg border-l-4
                ${chartData.riskComparison.alignment === 'Aligned' 
                  ? 'bg-success/10 border-success' 
                  : chartData.riskComparison.alignment === 'Too Conservative'
                  ? 'bg-warning/10 border-warning'
                  : 'bg-error/10 border-error'
                }
              `}>
                <p className="font-semibold text-neutral-800 mb-1">
                  Alignment Status
                </p>
                <p className={`text-sm ${
                  chartData.riskComparison.alignment === 'Aligned'
                    ? 'text-success'
                    : chartData.riskComparison.alignment === 'Too Conservative'
                    ? 'text-warning'
                    : 'text-error'
                }`}>
                  {chartData.riskComparison.alignment}
                </p>
              </div>

              {/* Risk Level Visualization */}
              <div>
                <p className="text-sm text-neutral-500 mb-3">Risk Profile Comparison</p>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Current</span>
                      <span>{chartData.riskComparison.currentRisk}</span>
                    </div>
                    <div className="h-3 bg-neutral-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${getRiskPercentage(chartData.riskComparison.currentRisk)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Target</span>
                      <span>{chartData.riskComparison.targetRisk}</span>
                    </div>
                    <div className="h-3 bg-neutral-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent transition-all duration-500"
                        style={{ width: `${getRiskPercentage(chartData.riskComparison.targetRisk)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Portfolio Risk Summary */}
      {chartData.portfolioRisk && (
        <div>
          <PortfolioRiskSummary data={chartData.portfolioRisk} />
        </div>
      )}

      {/* Holdings Performance Section */}
      {holdingsPerformance && holdingsPerformance.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">Holdings Analysis</h2>
          <HoldingsPerformanceCharts holdings={holdingsPerformance} />
        </div>
      )}
    </div>
  );
}

// Helper functions
function getRiskPercentage(riskLevel: InvestorType | string): number {
  const riskMap: Record<string, number> = {
    'Defensive': 20,
    'Conservative': 40,
    'Balanced': 60,
    'Growth': 80,
    'High Growth': 100,
  };
  return riskMap[riskLevel] || 50;
}

function getRiskBadgeVariant(riskLevel: InvestorType | string): 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' {
  const variantMap: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'> = {
    'Defensive': 'info',
    'Conservative': 'secondary',
    'Balanced': 'default',
    'Growth': 'warning',
    'High Growth': 'error',
  };
  return variantMap[riskLevel] || 'default';
}
