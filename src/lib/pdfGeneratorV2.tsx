import { pdf } from '@react-pdf/renderer';
import type { ChartData } from '@/types';
import { PortfolioPdfDocument } from '@/lib/portfolioPdfDocument';

interface GeneratePortfolioPDFInput {
  chartData: ChartData;
  analysisMarkdown: string;
  userName?: string;
}

function buildFileName(userName?: string): string {
  const safeName = (userName || 'Portfolio').trim() || 'Portfolio';
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `${safeName.replace(/\s+/g, '-')}-Analysis-${dateStamp}.pdf`;
}

export async function generatePortfolioPDF({
  chartData,
  analysisMarkdown,
  userName,
}: GeneratePortfolioPDFInput): Promise<void> {
  const doc = (
    <PortfolioPdfDocument
      chartData={chartData}
      analysisMarkdown={analysisMarkdown}
    />
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = buildFileName(userName);
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

