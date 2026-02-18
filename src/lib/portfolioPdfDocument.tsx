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
import type { ChartData } from '@/types';

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
    marginBottom: 24,
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
    padding: 16,
    marginBottom: 16,
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
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
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
  const riskLevels = ['Conservative', 'Moderate', 'Balanced', 'Growth', 'Aggressive'];
  const currentIndex = riskLevels.indexOf(data.currentRisk);
  const targetIndex = riskLevels.indexOf(data.targetRisk);

  const riskColors: Record<string, string> = {
    Conservative: COLORS.neutral,
    Moderate: COLORS.lightBlue,
    Balanced: COLORS.success,
    Growth: COLORS.accent,
    Aggressive: COLORS.red,
  };

  const alignmentColor =
    data.alignment === 'Aligned'
      ? COLORS.success // Green for aligned
      : data.alignment === 'Too Conservative'
      ? COLORS.gold // Yellow/gold for too conservative
      : COLORS.red; // Red for too aggressive

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Risk Profile Assessment</Text>

      {/* Risk Badges */}
      <View style={{ marginBottom: 16 }}>
        <View style={[styles.riskBadge, { backgroundColor: riskColors[data.currentRisk] + '20' }]}>
          <Text style={[styles.riskBadgeText, { color: riskColors[data.currentRisk] }]}>
            Current Risk: {data.currentRisk}
          </Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: riskColors[data.targetRisk] + '20' }]}>
          <Text style={[styles.riskBadgeText, { color: riskColors[data.targetRisk] }]}>
            Target Risk: {data.targetRisk}
          </Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: alignmentColor + '20' }]}>
          <Text style={[styles.riskBadgeText, { color: alignmentColor }]}>
            Alignment: {data.alignment}
          </Text>
        </View>
      </View>

      {/* Bar Chart */}
      <Svg width={480} height={120}>
        {riskLevels.map((level, index) => {
          const barHeight = index === currentIndex ? 60 : index === targetIndex ? 50 : 30;
          const barY = 90 - barHeight;
          const barX = 20 + index * 90;
          const barWidth = 70;

          let fillColor = COLORS.gray200;
          if (index === currentIndex) fillColor = riskColors[data.currentRisk];
          if (index === targetIndex) fillColor = riskColors[data.targetRisk];

          return (
            <React.Fragment key={index}>
              <Rect
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={fillColor}
                rx={4}
              />
              <Text
                x={barX + barWidth / 2}
                y={105}
                style={{
                  fontSize: 8,
                  fill: COLORS.gray600,
                  textAnchor: 'middle',
                }}
              >
                {level}
              </Text>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

const PortfolioRiskSection = ({ data }: { data: NonNullable<ChartData['portfolioRisk']> }) => {
  const formatPercent = (value?: number) =>
    value === undefined || value === null ? 'N/A' : `${(value * 100).toFixed(2)}%`;

  // Abbreviate long asset class names for the correlation matrix headers
  const abbrev = (name: string) => {
    const map: Record<string, string> = {
      'Australian Shares': 'AU Shares',
      'International Shares': 'Intl Shares',
      'Australian Fixed Interest': 'AU Fixed Int.',
      'International Fixed Interest': 'Intl Fixed Int.',
      'Australian Property': 'AU Property',
      'International Property': 'Intl Property',
      'Australian Fixed Income': 'AU Fixed Inc.',
      'International Fixed Income': 'Intl Fixed Inc.',
      'Domestic Cash': 'Cash',
      'International Cash': 'Intl Cash',
      'Alternatives': 'Alts',
    };
    return map[name] ?? name;
  };

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
            {data.assetClasses.length}
          </Text>
          <Text style={{ fontSize: 7, color: COLORS.gray400 }}>Mapped from holdings</Text>
        </View>
      </View>

      {/* Asset Class Table */}
      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontSize: 10, fontWeight: 'bold', color: COLORS.gray800, marginBottom: 6 }}>Asset-Class Metrics</Text>
        {/* Header */}
        <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 4 }}>
          <Text style={{ flex: 2.2, fontSize: 8, color: COLORS.white, fontWeight: 'bold' }}>Asset Class</Text>
          <Text style={{ flex: 0.9, fontSize: 8, color: COLORS.white, fontWeight: 'bold', textAlign: 'right' }}>Weight</Text>
          <Text style={{ flex: 1.1, fontSize: 8, color: COLORS.white, fontWeight: 'bold', textAlign: 'right' }}>Value</Text>
          <Text style={{ flex: 0.9, fontSize: 8, color: COLORS.white, fontWeight: 'bold', textAlign: 'right' }}>Exp. Return</Text>
          <Text style={{ flex: 0.8, fontSize: 8, color: COLORS.white, fontWeight: 'bold', textAlign: 'right' }}>Std Dev</Text>
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

      {/* Correlation Matrix */}
      {data.correlationMatrix.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: COLORS.gray800, marginBottom: 6 }}>Correlation Matrix</Text>
          {/* Header row */}
          <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 5, paddingHorizontal: 4, borderRadius: 4 }}>
            <Text style={{ flex: 1.6, fontSize: 8, color: COLORS.white, fontWeight: 'bold' }}>Asset Class</Text>
            {data.correlationMatrix.map((row, index) => (
              <Text key={index} style={{ flex: 1, fontSize: 7.5, color: COLORS.white, fontWeight: 'bold', textAlign: 'center' }}>
                {abbrev(row.assetClass)}
              </Text>
            ))}
          </View>
          {data.correlationMatrix.map((row, rowIndex) => (
            <View
              key={rowIndex}
              style={{
                flexDirection: 'row',
                paddingVertical: 5,
                paddingHorizontal: 4,
                backgroundColor: rowIndex % 2 === 0 ? COLORS.white : COLORS.gray50,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.gray200,
              }}
            >
              <Text style={{ flex: 1.6, fontSize: 8.5, color: COLORS.gray800 }}>{abbrev(row.assetClass)}</Text>
              {data.correlationMatrix.map((col, colIndex) => {
                const match = row.correlations.find((c) => c.with === col.assetClass);
                const val = match ? match.coefficient.toFixed(2) : '—';
                const isDiag = rowIndex === colIndex;
                return (
                  <Text
                    key={`${rowIndex}-${colIndex}`}
                    style={{
                      flex: 1,
                      fontSize: 8.5,
                      textAlign: 'center',
                      color: isDiag ? COLORS.primary : COLORS.gray800,
                      fontWeight: isDiag ? 'bold' : 'normal',
                    }}
                  >
                    {val}
                  </Text>
                );
              })}
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


// Component: Format Markdown Analysis
const AnalysisSection = ({ markdown }: { markdown: string }) => {
  // Simple markdown parser for PDF
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      // H3 heading
      elements.push(
        <Text key={index} style={styles.analysisHeading}>
          {trimmed.replace('### ', '')}
        </Text>
      );
    } else if (trimmed.startsWith('## ')) {
      // H2 heading
      elements.push(
        <Text key={index} style={[styles.analysisHeading, { fontSize: 16 }]}>
          {trimmed.replace('## ', '')}
        </Text>
      );
    } else if (trimmed.startsWith('# ')) {
      // H1 heading
      elements.push(
        <Text key={index} style={[styles.analysisHeading, { fontSize: 18 }]}>
          {trimmed.replace('# ', '')}
        </Text>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      // Bullet point
      elements.push(
        <Text key={index} style={[styles.analysisText, { paddingLeft: 12 }]}>
          • {trimmed.substring(2)}
        </Text>
      );
    } else if (trimmed.length > 0) {
      // Regular paragraph
      elements.push(
        <Text key={index} style={styles.analysisText}>
          {trimmed}
        </Text>
      );
    } else {
      // Empty line - add spacing
      elements.push(<View key={index} style={{ height: 4 }} />);
    }
  });

  return <View>{elements}</View>;
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

      {/* Page 2: Risk Overview */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={[styles.header, { marginBottom: 20 }]}>
          <Text style={styles.headerTitle}>Portfolio Analysis Report</Text>
          <Text style={styles.headerSubtitle}>Generated by mlfs.com.au • {dateStr}</Text>
        </View>

        {/* Risk Profile */}
        <RiskProfileChart data={chartData.riskComparison} />

        {/* Portfolio Risk Summary */}
        {chartData.portfolioRisk && (
          <PortfolioRiskSection data={chartData.portfolioRisk} />
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          This report is for informational purposes only and should not be considered financial advice. Page 2
        </Text>
      </Page>

      {/* Page 3+: Detailed Analysis */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={[styles.header, { marginBottom: 20 }]}>
          <Text style={styles.headerTitle}>Detailed Analysis</Text>
          <Text style={styles.headerSubtitle}>Generated by mlfs.com.au • {dateStr}</Text>
        </View>

        {/* Analysis Content */}
        <View style={styles.section}>
          <AnalysisSection markdown={analysisMarkdown} />
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          This report is for informational purposes only and should not be considered financial advice. Page 3
        </Text>
      </Page>
    </Document>
  );
};
