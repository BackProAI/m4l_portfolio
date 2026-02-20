import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
  Circle,
  Rect,
  Line,
} from '@react-pdf/renderer';
import type { ChartData, HoldingPerformance } from '@/types';

// ============================================================================
// Portfolio PDF Document Component
// Native PDF generation using @react-pdf/renderer (no html2canvas needed)
// ============================================================================

// mlfs.com.au brand colors
const COLORS = {
  primary: '#1B4F7B',
  primaryLight: '#3B7FA7',
  accent: '#E67E22',
  success: '#2ECC71',
  neutral: '#6C757D',
  lightBlue: '#5DADE2',
  gold: '#F39C12',
  red: '#E74C3C',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray600: '#4B5563',
  gray800: '#1F2937',
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.primaryLight,
  COLORS.accent,
  COLORS.success,
  COLORS.neutral,
  COLORS.lightBlue,
  COLORS.gold,
  COLORS.red,
];

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: COLORS.white,
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    marginBottom: 20,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: COLORS.white,
    fontSize: 12,
    opacity: 0.9,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 12,
  },
  portfolioValueBox: {
    backgroundColor: COLORS.gray50,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  portfolioValueLabel: {
    fontSize: 10,
    color: COLORS.gray600,
    marginBottom: 4,
  },
  portfolioValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  column: {
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.gray800,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.gray800,
  },
  legendValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.gray800,
    marginLeft: 'auto',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    paddingVertical: 8,
  },
  tableCell: {
    fontSize: 10,
    color: COLORS.gray800,
  },
  riskBadge: {
    backgroundColor: COLORS.gray50,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  analysisText: {
    fontSize: 10,
    color: COLORS.gray800,
    lineHeight: 1.6,
    marginBottom: 8,
  },
  analysisHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 12,
    marginBottom: 6,
  },
  footer: {
    marginTop: 20,
    fontSize: 8,
    color: COLORS.gray400,
    textAlign: 'center',
  },
});

interface PortfolioPdfDocumentProps {
  chartData: ChartData;
  analysisMarkdown: string;
  generatedDate?: string;
}

// Helper: Convert degrees to radians
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

// Helper: Calculate pie chart path for a slice
const getPieSlicePath = (
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string => {
  const start = toRadians(startAngle - 90);
  const end = toRadians(endAngle - 90);

  const x1 = centerX + radius * Math.cos(start);
  const y1 = centerY + radius * Math.sin(start);
  const x2 = centerX + radius * Math.cos(end);
  const y2 = centerY + radius * Math.sin(end);

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
};

// Component: Pie Chart for Asset Allocation
const AssetAllocationChart = ({ data }: { data: ChartData['assetAllocation'] }) => {
  const centerX = 150;
  const centerY = 120;
  const radius = 80;

  let currentAngle = 0;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Asset Allocation</Text>
      
      <View style={{ flexDirection: 'row', gap: 16 }}>
        {/* Pie Chart */}
        <View style={{ width: 300 }}>
          <Svg width={300} height={240}>
            {data.map((item, index) => {
              const sliceAngle = (item.percentage / 100) * 360;
              const path = getPieSlicePath(
                centerX,
                centerY,
                radius,
                currentAngle,
                currentAngle + sliceAngle
              );
              currentAngle += sliceAngle;

              // Calculate label position
              const labelAngle = toRadians(currentAngle - sliceAngle / 2 - 90);
              const labelX = centerX + (radius * 0.7) * Math.cos(labelAngle);
              const labelY = centerY + (radius * 0.7) * Math.sin(labelAngle);

              return (
                <React.Fragment key={index}>
                  <Path
                    d={path}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                  {item.percentage >= 5 && (
                    <Text
                      x={labelX}
                      y={labelY}
                      style={{
                        fontSize: 10,
                        fill: COLORS.white,
                        fontWeight: 'bold',
                        textAnchor: 'middle',
                      }}
                    >
                      {item.percentage}%
                    </Text>
                  )}
                </React.Fragment>
              );
            })}
          </Svg>
        </View>

        {/* Legend */}
        <View style={{ flex: 1 }}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] },
                ]}
              />
              <Text style={styles.legendText}>{item.name}</Text>
              <Text style={styles.legendValue}>
                ${item.value.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// Component: Risk Profile Assessment
const RiskProfileChart = ({ data }: { data: ChartData['riskComparison'] }) => {
  const riskColors: Record<string, string> = {
    Conservative: COLORS.neutral,
    Moderate: COLORS.lightBlue,
    Balanced: COLORS.success,
    Growth: COLORS.accent,
    Aggressive: COLORS.red,
  };

  const alignmentColor =
    data.alignment === 'Aligned'
      ? COLORS.success
      : data.alignment === 'Too Conservative'
      ? COLORS.gold
      : COLORS.red;

  return (
    <View style={[styles.card, { marginBottom: 12 }]}>
      <Text style={[styles.cardTitle, { fontSize: 12, marginBottom: 10 }]}>Risk Profile Assessment</Text>

      {/* Risk Badges - Compact horizontal layout */}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <View style={[styles.riskBadge, { backgroundColor: riskColors[data.currentRisk] + '20', flex: 1, minWidth: 140 }]}>
          <Text style={[styles.riskBadgeText, { color: riskColors[data.currentRisk] }]}>
            Current Risk: {data.currentRisk}
          </Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: riskColors[data.targetRisk] + '20', flex: 1, minWidth: 140 }]}>
          <Text style={[styles.riskBadgeText, { color: riskColors[data.targetRisk] }]}>
            Target Risk: {data.targetRisk}
          </Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: alignmentColor + '20', flex: 1, minWidth: 140 }]}>
          <Text style={[styles.riskBadgeText, { color: alignmentColor }]}>
            Alignment: {data.alignment}
          </Text>
        </View>
      </View>
    </View>
  );
};

const PortfolioRiskSection = ({ data }: { data: NonNullable<ChartData['portfolioRisk']> }) => {
  const formatPercent = (value?: number) =>
    value === undefined || value === null ? 'N/A' : `${(value * 100).toFixed(2)}%`;

  return (
    <View style={styles.card}>
      {/* Title */}
      <Text style={[styles.cardTitle, { fontSize: 13, marginBottom: 10 }]}>Portfolio Risk Summary</Text>

      {/* Summary tiles */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        <View style={{ flex: 1, backgroundColor: COLORS.gray50, padding: 10, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: COLORS.primary }}>
          <Text style={{ fontSize: 8, color: COLORS.gray600, marginBottom: 2 }}>Portfolio Volatility</Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginBottom: 1 }}>
            {formatPercent(data.portfolioStandardDeviation)}
          </Text>
          <Text style={{ fontSize: 7, color: COLORS.gray400 }}>Annualised std deviation (σ)</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: COLORS.gray50, padding: 10, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: COLORS.primaryLight }}>
          <Text style={{ fontSize: 8, color: COLORS.gray600, marginBottom: 2 }}>Portfolio Variance</Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginBottom: 1 }}>
            {data.portfolioVariance?.toFixed(4) ?? 'N/A'}
          </Text>
          <Text style={{ fontSize: 7, color: COLORS.gray400 }}>σ² from weights & correlations</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: COLORS.gray50, padding: 10, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: COLORS.accent }}>
          <Text style={{ fontSize: 8, color: COLORS.gray600, marginBottom: 2 }}>Asset Classes</Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginBottom: 1 }}>
            {data.assetClasses?.length ?? 0}
          </Text>
          <Text style={{ fontSize: 7, color: COLORS.gray400 }}>Mapped from holdings</Text>
        </View>
      </View>

      {/* Asset Class Table - Only show if data exists */}
      {data.assetClasses && data.assetClasses.length > 0 && (
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: COLORS.gray800, marginBottom: 6 }}>Asset-Class Metrics</Text>
          {/* Header */}
          <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 4 }}>
            <Text style={{ flex: 2.2, fontSize: 8, color: COLORS.white, fontWeight: 'bold' }}>Asset Class</Text>
            <Text style={{ flex: 0.9, fontSize: 8, color: COLORS.white, fontWeight: 'bold', textAlign: 'right' }}>Weight</Text>
            <Text style={{ flex: 1.1, fontSize: 8, color: COLORS.white, fontWeight: 'bold', textAlign: 'right' }}>Value</Text>
            <Text style={{ flex: 0.9, fontSize: 8, color: COLORS.white, fontWeight: 'bold', textAlign: 'right' }}>Exp. Return</Text>
            <Text style={{ flex: 0.8, fontSize: 8, color: COLORS.white, fontWeight: 'bold', textAlign: 'right' }}>Pred. Vol %</Text>
            <Text style={{ flex: 1.0, fontSize: 8, color: COLORS.white, fontWeight: 'bold', textAlign: 'right' }}>Var. Contrib.</Text>
          </View>
          {data.assetClasses.map((asset, index) => (
          <View
            key={index}
            style={{
              flexDirection: 'row',
              paddingVertical: 5,
              paddingHorizontal: 4,
              backgroundColor: index % 2 === 0 ? COLORS.white : COLORS.gray50,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.gray200,
            }}
          >
            <Text style={{ flex: 2.2, fontSize: 9, color: COLORS.gray800 }}>{asset.name}</Text>
            <Text style={{ flex: 0.9, fontSize: 9, color: COLORS.gray800, textAlign: 'right' }}>{asset.weightPercentage.toFixed(2)}%</Text>
            <Text style={{ flex: 1.1, fontSize: 9, color: COLORS.gray800, textAlign: 'right' }}>${asset.value.toLocaleString()}</Text>
            <Text style={{ flex: 0.9, fontSize: 9, color: COLORS.gray800, textAlign: 'right' }}>{formatPercent(asset.expectedReturn)}</Text>
            <Text style={{ flex: 0.8, fontSize: 9, color: COLORS.gray800, textAlign: 'right' }}>{formatPercent(asset.standardDeviation)}</Text>
            <Text style={{ flex: 1.0, fontSize: 9, color: COLORS.gray800, textAlign: 'right' }}>
              {asset.riskContribution !== undefined ? asset.riskContribution.toFixed(4) : 'N/A'}
            </Text>
          </View>
        ))}
      </View>
      )}

      {/* Notes & Sources */}
      {(data.notes || (data.sources && data.sources.length > 0)) && (
        <View style={{ borderTopWidth: 1, borderTopColor: COLORS.gray200, paddingTop: 8, marginTop: 4 }}>
          {data.notes && (
            <Text style={{ fontSize: 8, color: COLORS.gray600, marginBottom: 3 }}>{data.notes}</Text>
          )}
          {data.sources && data.sources.length > 0 && (
            <Text style={{ fontSize: 7.5, color: COLORS.gray400 }}>
              Sources: {data.sources.join('  |  ')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};


// Component: Holdings Performance Overview Table
const HoldingsOverviewTable = ({ holdings }: { holdings: HoldingPerformance[] }) => {
  if (!holdings || holdings.length === 0) {
    return null;
  }

  // Categorize holdings by type
  const directShares = holdings.filter(h => h.type === 'direct-share');
  const managedFunds = holdings.filter(h => h.type === 'managed-fund');
  const securities = holdings.filter(h => h.type === 'security');

  // Calculate portfolio total return
  const totalWeights = holdings.reduce((sum, h) => sum + (h.percentage || 0), 0);
  const weightedReturns = holdings
    .filter(h => h.totalReturnForTimeframe !== undefined)
    .reduce((sum, h) => sum + (h.totalReturnForTimeframe! * h.percentage) / 100, 0);
  const portfolioTotalReturn = totalWeights > 0 ? (weightedReturns / totalWeights) * 100 : null;
  const timeframeLabel = holdings.find(h => h.performanceTimeframe)?.performanceTimeframe;

  const renderTableHeader = () => (
    <View style={{ flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: COLORS.primary, paddingBottom: 6, marginBottom: 8 }}>
      <Text style={{ flex: 3, fontSize: 9, fontWeight: 'bold', color: COLORS.gray800 }}>Name</Text>
      <Text style={{ flex: 4, fontSize: 9, fontWeight: 'bold', color: COLORS.gray800 }}>Description</Text>
      <Text style={{ flex: 2, fontSize: 9, fontWeight: 'bold', color: COLORS.gray800, textAlign: 'right' }}>Value</Text>
      <Text style={{ flex: 1.5, fontSize: 9, fontWeight: 'bold', color: COLORS.gray800, textAlign: 'right' }}>% Portfolio</Text>
      <Text style={{ flex: 1.5, fontSize: 9, fontWeight: 'bold', color: COLORS.gray800, textAlign: 'right' }}>Return</Text>
    </View>
  );

  const renderTableRow = (holding: HoldingPerformance, index: number) => (
    <View key={index} style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.gray200 }}>
      <Text style={{ flex: 3, fontSize: 9, color: COLORS.primary }}>{holding.name}</Text>
      <Text style={{ flex: 4, fontSize: 8, color: COLORS.gray600 }}>
        {holding.description.length > 60 ? holding.description.substring(0, 57) + '...' : holding.description}
      </Text>
      <Text style={{ flex: 2, fontSize: 9, color: COLORS.gray800, textAlign: 'right' }}>
        ${holding.currentValue.toLocaleString('en-AU')}
      </Text>
      <Text style={{ flex: 1.5, fontSize: 9, color: COLORS.gray800, textAlign: 'right' }}>
        {holding.percentage.toFixed(1)}%
      </Text>
      <Text style={{ flex: 1.5, fontSize: 9, color: holding.totalReturnForTimeframe !== undefined ? (holding.totalReturnForTimeframe >= 0 ? COLORS.success : COLORS.red) : COLORS.gray400, textAlign: 'right', fontWeight: 'bold' }}>
        {holding.totalReturnForTimeframe !== undefined ? `${holding.totalReturnForTimeframe.toFixed(2)}%` : 'N/A'}
      </Text>
    </View>
  );

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Holdings Performance Overview</Text>

      {/* Managed Funds */}
      {managedFunds.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: COLORS.gray800, marginBottom: 6 }}>Managed Funds</Text>
          {renderTableHeader()}
          {managedFunds.map((holding, index) => renderTableRow(holding, index))}
        </View>
      )}

      {/* Direct Shares */}
      {directShares.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: COLORS.gray800, marginBottom: 6 }}>Direct Shares</Text>
          {renderTableHeader()}
          {directShares.map((holding, index) => renderTableRow(holding, index))}
        </View>
      )}

      {/* Securities */}
      {securities.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: COLORS.gray800, marginBottom: 6 }}>Securities</Text>
          {renderTableHeader()}
          {securities.map((holding, index) => renderTableRow(holding, index))}
        </View>
      )}

      {/* Total Return Summary */}
      {portfolioTotalReturn !== null && (
        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 2, borderTopColor: COLORS.primary }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: COLORS.gray600 }}>
              Total Return for All Holdings over the Time Period ({timeframeLabel || 'N/A'})
            </Text>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: portfolioTotalReturn >= 0 ? COLORS.success : COLORS.red }}>
              {portfolioTotalReturn.toFixed(2)}%
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

// Component: Holdings Performance Cards for PDF
const HoldingsPerformanceSection = ({ holdings }: { holdings: HoldingPerformance[] }) => {
  if (!holdings || holdings.length === 0) {
    return null;
  }

  return (
    <View wrap>
      <Text style={styles.sectionTitle}>Fund Commentary</Text>
      
      {holdings.map((holding, index) => (
        <View key={index} style={styles.card}>
          {/* Holding Header */}
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 }}>
              {holding.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View style={[styles.riskBadge, { backgroundColor: '#EBF5FB' }]}>
                <Text style={[styles.riskBadgeText, { color: COLORS.primary }]}>
                  {holding.type === 'direct-share' ? 'Direct Share' : holding.type === 'managed-fund' ? 'Managed Fund' : 'Security'}
                </Text>
              </View>
              {holding.ticker && (
                <Text style={{ fontSize: 9, color: COLORS.gray600 }}>
                  Ticker: {holding.ticker}
                </Text>
              )}
            </View>
          </View>

          {/* Description */}
          <Text style={{ fontSize: 10, color: COLORS.gray800, lineHeight: 1.5, marginBottom: 8 }}>
            {holding.description}
          </Text>

          {/* Key Metrics */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1, backgroundColor: COLORS.gray50, padding: 8, borderRadius: 4 }}>
              <Text style={{ fontSize: 8, color: COLORS.gray600, marginBottom: 2 }}>Current Value</Text>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.gray800 }}>
                ${holding.currentValue.toLocaleString('en-AU')}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: COLORS.gray50, padding: 8, borderRadius: 4 }}>
              <Text style={{ fontSize: 8, color: COLORS.gray600, marginBottom: 2 }}>Portfolio Weight</Text>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.gray800 }}>
                {holding.percentage.toFixed(1)}%
              </Text>
            </View>
            {holding.totalReturnForTimeframe !== undefined && (
              <View style={{ flex: 1, backgroundColor: COLORS.gray50, padding: 8, borderRadius: 4 }}>
                <Text style={{ fontSize: 8, color: COLORS.gray600, marginBottom: 2 }}>Return</Text>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: holding.totalReturnForTimeframe >= 0 ? COLORS.success : COLORS.red }}>
                  {holding.totalReturnForTimeframe.toFixed(2)}%
                </Text>
              </View>
            )}
          </View>

          {/* Timeframe */}
          {holding.performanceTimeframe && (
            <Text style={{ fontSize: 8, color: COLORS.gray600, marginTop: 4 }}>
              Period: {holding.performanceTimeframe}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
};

// Helper function to prepare historical performance chart data
const prepareHistoricalPerformanceData = (holdings: HoldingPerformance[]): { year: number; [key: string]: number | null }[] => {
  const allYears = new Set<number>();
  holdings.forEach(holding => {
    const performanceEntries = holding.performance ?? [];
    performanceEntries.forEach(perf => allYears.add(perf.year));
  });

  const sortedYears = Array.from(allYears).sort((a, b) => a - b);

  return sortedYears.map(year => {
    const dataPoint: any = { year };
    holdings.forEach(holding => {
      const performanceEntries = holding.performance ?? [];
      const perf = performanceEntries.find(p => p.year === year);
      dataPoint[holding.name] = perf ? perf.return : null;
    });
    return dataPoint;
  });
};

// Component: Historical Performance Comparison Bar Chart
const HistoricalPerformanceChart = ({ holdings }: { holdings: HoldingPerformance[] }) => {
  const data = prepareHistoricalPerformanceData(holdings);
  
  if (data.length === 0) {
    return null;
  }

  const chartWidth = 500;
  const chartHeight = 280;
  const marginTop = 30;
  const marginRight = 20;
  const marginBottom = 50;
  const marginLeft = 50;
  const plotWidth = chartWidth - marginLeft - marginRight;
  const plotHeight = chartHeight - marginTop - marginBottom;

  // Find min and max values for Y-axis scaling
  const allValues = data.flatMap(d => 
    holdings.map(h => d[h.name] as number | null).filter(v => v !== null)
  );
  const maxValue = Math.max(...allValues, 0);
  const minValue = Math.min(...allValues, 0);
  const yMax = Math.ceil(maxValue / 5) * 5 + 5;
  const yMin = Math.floor(minValue / 5) * 5 - 5;
  const yRange = yMax - yMin;

  // Bar width calculation
  const barGroupWidth = plotWidth / data.length;
  const barWidth = Math.min(barGroupWidth / holdings.length - 2, 30);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Historical Performance Comparison</Text>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Y-Axis Grid Lines and Labels */}
        {[0, 1, 2, 3, 4, 5].map(i => {
          const value = yMin + (yRange / 5) * i;
          const y = marginTop + plotHeight - ((value - yMin) / yRange) * plotHeight;
          return (
            <React.Fragment key={i}>
              <Line
                x1={marginLeft}
                y1={y}
                x2={marginLeft + plotWidth}
                y2={y}
                stroke={COLORS.gray200}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <Text
                x={marginLeft - 8}
                y={y + 3}
                style={{ fontSize: 8 }}
                fill={COLORS.gray600}
                textAnchor="end"
              >
                {value.toFixed(0)}%
              </Text>
            </React.Fragment>
          );
        })}

        {/* X-Axis */}
        <Line
          x1={marginLeft}
          y1={marginTop + plotHeight}
          x2={marginLeft + plotWidth}
          y2={marginTop + plotHeight}
          stroke={COLORS.gray800}
          strokeWidth={2}
        />

        {/* Y-Axis */}
        <Line
          x1={marginLeft}
          y1={marginTop}
          x2={marginLeft}
          y2={marginTop + plotHeight}
          stroke={COLORS.gray800}
          strokeWidth={2}
        />

        {/* Bars */}
        {data.map((yearData, yearIndex) => {
          const xBase = marginLeft + yearIndex * barGroupWidth;
          return holdings.map((holding, holdingIndex) => {
            const value = yearData[holding.name] as number | null;
            if (value === null) return null;

            const barHeight = Math.abs((value - 0) / yRange) * plotHeight;
            const zeroY = marginTop + plotHeight - ((0 - yMin) / yRange) * plotHeight;
            const barX = xBase + holdingIndex * (barWidth + 2) + barGroupWidth / 2 - (holdings.length * (barWidth + 2)) / 2;
            const barY = value >= 0 ? zeroY - barHeight : zeroY;

            return (
              <Rect
                key={`${yearIndex}-${holdingIndex}`}
                x={barX}
                y={barY}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                fill={CHART_COLORS[holdingIndex % CHART_COLORS.length]}
              />
            );
          });
        })}

        {/* X-Axis Labels (Years) */}
        {data.map((yearData, index) => {
          const x = marginLeft + index * barGroupWidth + barGroupWidth / 2;
          return (
            <Text
              key={index}
              x={x}
              y={marginTop + plotHeight + 15}
              style={{ fontSize: 9 }}
              fill={COLORS.gray800}
              textAnchor="middle"
            >
              {yearData.year}
            </Text>
          );
        })}

        {/* Y-Axis Label */}
        <Text
          x={15}
          y={marginTop + plotHeight / 2}
          style={{ fontSize: 10 }}
          fill={COLORS.gray800}
          textAnchor="middle"
          transform={`rotate(-90, 15, ${marginTop + plotHeight / 2})`}
        >
          Return (%)
        </Text>

        {/* Legend */}
        {holdings.map((holding, index) => {
          const legendX = marginLeft;
          const legendY = chartHeight - 30 + Math.floor(index / 2) * 12;
          const legendOffset = (index % 2) * 250;
          return (
            <React.Fragment key={index}>
              <Rect
                x={legendX + legendOffset}
                y={legendY}
                width={10}
                height={10}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
              <Text
                x={legendX + legendOffset + 14}
                y={legendY + 8}
                style={{ fontSize: 8 }}
                fill={COLORS.gray800}
              >
                {holding.name.length > 30 ? holding.name.substring(0, 27) + '...' : holding.name}
              </Text>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};


// Component: Format Markdown Analysis
const AnalysisSection = ({ markdown }: { markdown: string }) => {
  // Handle empty or missing markdown
  if (!markdown || markdown.trim().length === 0) {
    return (
      <View>
        <Text style={styles.analysisText}>
          No detailed analysis available.
        </Text>
      </View>
    );
  }

  // Simple markdown parser for PDF
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      // H3 heading
      elements.push(
        <Text key={index} style={styles.analysisHeading} wrap>
          {trimmed.replace('### ', '')}
        </Text>
      );
    } else if (trimmed.startsWith('## ')) {
      // H2 heading
      elements.push(
        <Text key={index} style={[styles.analysisHeading, { fontSize: 16 }]} wrap>
          {trimmed.replace('## ', '')}
        </Text>
      );
    } else if (trimmed.startsWith('# ')) {
      // H1 heading
      elements.push(
        <Text key={index} style={[styles.analysisHeading, { fontSize: 18 }]} wrap>
          {trimmed.replace('# ', '')}
        </Text>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      // Bullet point
      elements.push(
        <Text key={index} style={[styles.analysisText, { paddingLeft: 12 }]} wrap>
          • {trimmed.substring(2)}
        </Text>
      );
    } else if (trimmed.length > 0) {
      // Regular paragraph
      elements.push(
        <Text key={index} style={styles.analysisText} wrap>
          {trimmed}
        </Text>
      );
    } else {
      // Empty line - add spacing
      elements.push(<View key={index} style={{ height: 4 }} />);
    }
  });

  return <View wrap>{elements}</View>;
};

// Main PDF Document Component
export const PortfolioPdfDocument = ({
  chartData,
  analysisMarkdown,
  generatedDate,
}: PortfolioPdfDocumentProps) => {
  const dateStr = generatedDate || new Date().toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document>
      {/* Page 1: Header and Charts */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Portfolio Analysis Report</Text>
          <Text style={styles.headerSubtitle}>Generated by mlfs.com.au • {dateStr}</Text>
        </View>

        {/* Portfolio Value */}
        <View style={styles.portfolioValueBox}>
          <Text style={styles.portfolioValueLabel}>Total Portfolio Value</Text>
          <Text style={styles.portfolioValue}>
            ${chartData.portfolioValue.toLocaleString()}
          </Text>
        </View>

        {/* Asset Allocation */}
        <AssetAllocationChart data={chartData.assetAllocation} />

        {/* Footer */}
        <Text style={styles.footer}>
          This report is for informational purposes only and should not be considered financial advice. Page 1
        </Text>
      </Page>

      {/* Page 2+: Risk Overview, Holdings Performance, and Detailed Analysis (continuous flow) */}
      <Page size="A4" style={styles.page} wrap>

        {/* Risk Profile */}
        <RiskProfileChart data={chartData.riskComparison} />

        {/* Portfolio Risk Summary */}
        {chartData.portfolioRisk && (
          <PortfolioRiskSection data={chartData.portfolioRisk} />
        )}

        {/* Holdings Performance Section */}
        {chartData.holdingsPerformance && chartData.holdingsPerformance.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.sectionTitle, { fontSize: 20, marginBottom: 16 }]}>Holdings Performance</Text>

            {/* Holdings Overview Table */}
            <HoldingsOverviewTable holdings={chartData.holdingsPerformance} />

            {/* Fund Commentary Cards */}
            <HoldingsPerformanceSection holdings={chartData.holdingsPerformance} />
            
            {/* Historical Performance Chart */}
            <HistoricalPerformanceChart holdings={chartData.holdingsPerformance} />
          </View>
        )}

        {/* Detailed Analysis Section */}
        {analysisMarkdown && analysisMarkdown.trim().length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.sectionTitle, { fontSize: 20, marginBottom: 16 }]}>Detailed Analysis</Text>

            <AnalysisSection markdown={analysisMarkdown} />
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer} render={({ pageNumber }) => (
          `This report is for informational purposes only and should not be considered financial advice. Page ${pageNumber}`
        )} fixed />
      </Page>
    </Document>
  );
};