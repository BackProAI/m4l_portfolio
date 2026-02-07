import { pdf } from '@react-pdf/renderer';
import { PortfolioPdfDocument } from './portfolioPdfDocument';
import type { ChartData } from '@/types';

// ============================================================================
// PDF Generator using @react-pdf/renderer
// Native PDF generation without html2canvas - no color conversion issues!
// ============================================================================

interface GeneratePdfParams {
  chartData: ChartData;
  analysisMarkdown: string;
  userName?: string; // Full name of the portfolio owner
  fileName?: string;
}

/**
 * Extract last name from full name for filename
 */
function getLastName(fullName: string): string {
  const parts = fullName.trim().split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : fullName;
}

/**
 * Generate and download a portfolio analysis PDF
 * Uses @react-pdf/renderer for native PDF generation
 */
export async function generatePortfolioPDF({
  chartData,
  analysisMarkdown,
  userName,
  fileName,
}: GeneratePdfParams): Promise<void> {
  try {
    console.log('🚀 Generating PDF with @react-pdf/renderer');

    // Generate filename from last name if not provided
    if (!fileName && userName) {
      const lastName = getLastName(userName);
      fileName = `${lastName}-Portfolio-Analysis.pdf`;
    }
    if (!fileName) {
      fileName = 'Portfolio-Analysis-Report.pdf';
    }

    // Generate the PDF blob
    const blob = await pdf(
      <PortfolioPdfDocument
        chartData={chartData}
        analysisMarkdown={analysisMarkdown}
      />
    ).toBlob();

    console.log('✅ PDF generated successfully, size:', (blob.size / 1024).toFixed(2), 'KB');

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('💾 PDF downloaded:', fileName);
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    throw error;
  }
}
