'use client';

import * as React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import type { LongevityProjection } from '@/types';

interface LongevityProjectionChartProps {
  projection: LongevityProjection;
}

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value.toFixed(0)}`;
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any[];
  label?: number;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-neutral-800 mb-1">Age {label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: ${entry.value?.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
        </p>
      ))}
    </div>
  );
};

export function LongevityProjectionChart({ projection }: LongevityProjectionChartProps) {
  const { points, yearsUntilDepletion, depletionAge, inflationRate, annualDrawdown, expectedReturn } =
    projection;

  const headline = depletionAge
    ? `Your portfolio is projected to last until age ${depletionAge}`
    : `Your portfolio is projected to last ${points[points.length - 1].year}+ years`;

  const headlineColor = depletionAge
    ? depletionAge < 75
      ? 'text-error'
      : 'text-warning'
    : 'text-success';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Longevity Projection</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Headline stat */}
        <div className="mb-6 p-4 rounded-lg bg-neutral-50 border border-neutral-200">
          <p className={`text-lg font-bold ${headlineColor}`}>{headline}</p>
          <p className="text-sm text-neutral-500 mt-1">
            Based on a {(expectedReturn * 100).toFixed(1)}% expected return,{' '}
            {(inflationRate * 100).toFixed(1)}% inflation, and a{' '}
            ${annualDrawdown.toLocaleString('en-AU')} annual drawdown.
          </p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-neutral-50 rounded-lg p-3 text-center border border-neutral-200">
            <p className="text-xs text-neutral-500 mb-1">Annual Drawdown</p>
            <p className="text-base font-bold text-neutral-800">
              ${annualDrawdown.toLocaleString('en-AU')}
            </p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-3 text-center border border-neutral-200">
            <p className="text-xs text-neutral-500 mb-1">Expected Return</p>
            <p className="text-base font-bold text-neutral-800">
              {(expectedReturn * 100).toFixed(1)}% p.a.
            </p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-3 text-center border border-neutral-200">
            <p className="text-xs text-neutral-500 mb-1">Inflation Rate</p>
            <p className="text-base font-bold text-neutral-800">
              {(inflationRate * 100).toFixed(1)}% p.a.
            </p>
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
              <defs>
                <linearGradient id="realBalanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B4F7B" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#1B4F7B" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="nominalBalanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E67E22" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#E67E22" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="age"
                label={{ value: 'Age', position: 'insideBottom', offset: -5, fontSize: 12 }}
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span style={{ fontSize: 12, color: '#4B5563' }}>{value}</span>
                )}
              />
              {/* Nominal balance — dashed accent line, minimal fill */}
              <Area
                type="monotone"
                dataKey="nominalBalance"
                name="Nominal Balance"
                stroke="#E67E22"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="url(#nominalBalanceGradient)"
                dot={false}
                activeDot={{ r: 4 }}
              />
              {/* Real balance — solid primary fill */}
              <Area
                type="monotone"
                dataKey="realBalance"
                name="Real Balance (inflation-adjusted)"
                stroke="#1B4F7B"
                strokeWidth={2.5}
                fill="url(#realBalanceGradient)"
                dot={false}
                activeDot={{ r: 5 }}
              />
              {/* Depletion marker */}
              {depletionAge && (
                <ReferenceLine
                  x={depletionAge}
                  stroke="#E74C3C"
                  strokeDasharray="5 5"
                  label={{
                    value: `Depleted age ${depletionAge}`,
                    position: 'top',
                    fontSize: 11,
                    fill: '#E74C3C',
                  }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Years summary — real value only */}
        <div className="mt-4 flex items-center justify-center gap-3 p-4 rounded-lg border border-neutral-200 bg-neutral-50">
          <div className="text-center">
            <p className="text-xs text-neutral-500 mb-0.5">Portfolio lasts (real value)</p>
            <p className={`text-3xl font-bold ${yearsUntilDepletion ? (yearsUntilDepletion < 20 ? 'text-error' : 'text-warning') : 'text-success'}`}>
              {yearsUntilDepletion ? `${yearsUntilDepletion} years` : `${points[points.length - 1].year}+ years`}
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {yearsUntilDepletion
                ? `Purchasing power exhausted at age ${depletionAge}`
                : 'Portfolio survives the full projection period'}
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs text-neutral-400">
          Projection uses the Fisher approximation (real return = nominal return − inflation). Real balance
          reflects purchasing power in today&apos;s dollars. This is a mathematical projection, not financial
          advice.
        </p>
      </CardContent>
    </Card>
  );
}
