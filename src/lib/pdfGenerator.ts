import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface LegacyPdfOptions {
  fileName?: string;
  targetId?: string;
}

export async function generateLegacyPortfolioPDF({
  fileName = 'portfolio-analysis.pdf',
  targetId = 'results',
}: LegacyPdfOptions = {}): Promise<void> {
  const target = document.getElementById(targetId);
  if (!target) {
    throw new Error(`PDF export target not found: ${targetId}`);
  }

  const canvas = await html2canvas(target, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgProps = pdf.getImageProperties(imgData);
  const imgHeight = (imgProps.height * pageWidth) / imgProps.width;

  let position = 0;
  pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);

  let heightLeft = imgHeight - pageHeight;
  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(fileName);
}
