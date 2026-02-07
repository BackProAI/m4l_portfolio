import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import type { FileType } from '@/types';

// ============================================================================
// PDF Parser
// ============================================================================

export async function parsePDF(file: File): Promise<string> {
  // Dynamically import PDF.js only on client side when needed
  if (typeof window === 'undefined') {
    throw new Error('PDF parsing is only available in the browser');
  }

  try {
    // Dynamic import using legacy build for better Next.js compatibility
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // Configure worker using legacy worker - use string path for bundler
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.mjs',
        import.meta.url
      ).toString();
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Word Document Parser (.docx)
// ============================================================================

export async function parseDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (result.messages.length > 0) {
      console.warn('Word parsing warnings:', result.messages);
    }
    
    return result.value.trim();
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error(`Failed to parse Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Excel Parser (.xlsx, .xls)
// ============================================================================

export async function parseExcel(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    let fullText = '';
    
    // Process each sheet
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      
      // Add sheet name as header
      fullText += `\n=== ${sheetName} ===\n\n`;
      
      // Convert sheet to CSV format (preserves structure)
      const csv = XLSX.utils.sheet_to_csv(sheet, { FS: '\t' });
      fullText += csv + '\n';
    });
    
    return fullText.trim();
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Main Parser Function - Routes to appropriate parser
// ============================================================================

export async function parseFile(file: File, type: FileType): Promise<string> {
  switch (type) {
    case 'pdf':
      return parsePDF(file);
    case 'docx':
      return parseDocx(file);
    case 'xlsx':
    case 'xls':
      return parseExcel(file);
    default:
      throw new Error(`Unsupported file type: ${type}`);
  }
}

// ============================================================================
// File Validation
// ============================================================================

export function validateFile(file: File, maxSizeMB: number = 10): { valid: boolean; error?: string } {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }
  
  // Check file type
  const validExtensions = ['.pdf', '.docx', '.xlsx', '.xls'];
  const fileName = file.name.toLowerCase();
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
  
  if (!hasValidExtension) {
    return {
      valid: false,
      error: 'File must be PDF, Word (.docx), or Excel (.xlsx/.xls)',
    };
  }
  
  return { valid: true };
}

// ============================================================================
// Extract file metadata
// ============================================================================

export function getFileMetadata(file: File) {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    lastModifiedDate: new Date(file.lastModified),
  };
}
