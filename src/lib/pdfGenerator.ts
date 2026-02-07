import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Color from 'colorjs.io';

interface GeneratePDFOptions {
  chartsElementId: string;
  analysisElementId: string;
  fileName?: string;
}

/**
 * Convert a color value (including lab/oklch/oklab) to RGB using colorjs.io
 */
function colorToRGB(colorValue: string): string | null {
  // Return early for special values that shouldn't be converted
  const normalizedValue = colorValue.trim().toLowerCase();
  if (normalizedValue === 'none' || normalizedValue === 'transparent' || normalizedValue === 'inherit' || normalizedValue === 'initial' || normalizedValue === 'unset' || normalizedValue === 'currentcolor') {
    return null;
  }
  
  // If already RGB, return as-is
  if (colorValue.startsWith('rgb')) {
    return colorValue;
  }
  
  try {
    // Parse the color using colorjs.io (supports lab, oklch, oklab, etc.)
    const color = new Color(colorValue);
    
    // Convert to sRGB color space
    const rgb = color.to('srgb');
    
    // Get RGB values (0-1 range) - handle null values
    const [r, g, b] = rgb.coords;
    
    // Check for null/undefined values
    if (r == null || g == null || b == null) {
      console.error('Color conversion returned null coords:', colorValue);
      return null;
    }
    
    // Convert to 0-255 range and round
    const r255 = Math.round(Math.max(0, Math.min(255, r * 255)));
    const g255 = Math.round(Math.max(0, Math.min(255, g * 255)));
    const b255 = Math.round(Math.max(0, Math.min(255, b * 255)));
    
    return `rgb(${r255}, ${g255}, ${b255})`;
  } catch (error) {
    console.error('Failed to convert color:', colorValue, error);
    return null;
  }
}

/**
 * Convert modern CSS color functions (lab, oklch) to RGB for html2canvas compatibility
 */
function convertModernColorsToRGB(element: HTMLElement): void {
  console.log('🔍 Starting color conversion for element:', element.id);
  
  // Get all elements including the root
  const allElements = [element, ...Array.from(element.querySelectorAll('*'))];
  
  console.log(`📊 Total elements to process: ${allElements.length}`);
  
  let labColorsFound = 0;
  let colorsConverted = 0;
  let conversionsFailed = 0;
  
  allElements.forEach((el, index) => {
    const htmlEl = el as HTMLElement;
    const computedStyle = window.getComputedStyle(htmlEl);
    
    // Convert color properties in CSS
    const colorProps = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'fill', 'stroke'];
    
    colorProps.forEach((prop) => {
      const value = computedStyle.getPropertyValue(prop);
      
      if (value && value.trim() !== '' && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent' && value !== 'none') {
        // Check if it's a lab/oklch/oklab color
        if (value.includes('lab') || value.includes('oklch')) {
          labColorsFound++;
          console.warn(`⚠️ Found ${value.split('(')[0]} color on element ${index}:`, {
            element: htmlEl.tagName,
            class: htmlEl.className,
            property: prop,
            value: value
          });
          
          // Convert using colorjs.io
          const rgbValue = colorToRGB(value);
          if (rgbValue) {
            htmlEl.style.setProperty(prop, rgbValue, 'important');
            colorsConverted++;
            console.log(`✓ Converted ${prop} from ${value} to ${rgbValue}`);
          } else {
            conversionsFailed++;
            console.error(`✗ Failed to convert ${prop}: ${value}`);
          }
        } else if (value.startsWith('rgb')) {
          // Already RGB, just set as inline style to ensure it's used
          htmlEl.style.setProperty(prop, value, 'important');
          colorsConverted++;
        }
      }
    });
    
    // CRITICAL: Also convert SVG attribute colors (Recharts uses these!)
    // SVG elements can have fill/stroke as attributes, not just CSS properties
    const svgColorAttrs = ['fill', 'stroke'];
    svgColorAttrs.forEach((attr) => {
      const attrValue = htmlEl.getAttribute(attr);
      
      if (attrValue && attrValue.trim() !== '' && attrValue !== 'none' && attrValue !== 'transparent') {
          // Check if it's a modern color function
          if (attrValue.includes('lab') || attrValue.includes('oklch')) {
            labColorsFound++;
            console.warn(`⚠️ Found ${attrValue.split('(')[0]} color in SVG ${attr} attribute on element ${index}:`, {
              element: htmlEl.tagName,
              value: attrValue
            });
            
            const rgbValue = colorToRGB(attrValue);
            if (rgbValue) {
              // Set as attribute AND as style for maximum compatibility
              htmlEl.setAttribute(attr, rgbValue);
              htmlEl.style.setProperty(attr, rgbValue, 'important');
              colorsConverted++;
              console.log(`✓ Converted SVG ${attr} from ${attrValue} to ${rgbValue}`);
            } else {
              conversionsFailed++;
              console.error(`✗ Failed to convert SVG ${attr}: ${attrValue}`);
            }
        }
      }
    });
  });
  
  console.log(`✅ Conversion complete. Lab colors found: ${labColorsFound}, Colors converted: ${colorsConverted}, Failed: ${conversionsFailed}`);
  
  if (conversionsFailed > 0) {
    console.error(`❌ WARNING: ${conversionsFailed} lab/oklch colors failed to convert!`);
  }
}

/**
 * Generates a PDF containing portfolio analysis results including charts and detailed analysis
 */
export async function generateAnalysisPDF({
  chartsElementId,
  analysisElementId,
  fileName = 'Portfolio-Analysis-Report.pdf',
}: GeneratePDFOptions): Promise<void> {
  console.log('🚀 Starting PDF generation...');
  console.log('Configuration:', { chartsElementId, analysisElementId, fileName });
  
  try {
    // Get the elements to capture
    const chartsElement = document.getElementById(chartsElementId);
    const analysisElement = document.getElementById(analysisElementId);

    if (!chartsElement || !analysisElement) {
      throw new Error('Required elements not found for PDF generation');
    }
    
    console.log('✅ Found required elements:', {
      charts: { id: chartsElement.id, tag: chartsElement.tagName },
      analysis: { id: analysisElement.id, tag: analysisElement.tagName }
    });

    // Show loading state (you can customize this)
    const originalCursor = document.body.style.cursor;
    document.body.style.cursor = 'wait';
    
    // Clone elements to avoid modifying the original DOM
    const chartsClone = chartsElement.cloneNode(true) as HTMLElement;
    const analysisClone = analysisElement.cloneNode(true) as HTMLElement;
    
    // Position clones off-screen but still rendered
    chartsClone.style.position = 'fixed';
    chartsClone.style.left = '-9999px';
    chartsClone.style.top = '0';
    chartsClone.style.width = chartsElement.offsetWidth + 'px';
    chartsClone.id = chartsElementId + '-clone';
    
    analysisClone.style.position = 'fixed';
    analysisClone.style.left = '-9999px';
    analysisClone.style.top = '0';
    analysisClone.style.width = analysisElement.offsetWidth + 'px';
    analysisClone.id = analysisElementId + '-clone';
    
    document.body.appendChild(chartsClone);
    document.body.appendChild(analysisClone);
    
    // Convert modern colors to RGB in clones
    console.log('🎨 Converting charts colors...');
    convertModernColorsToRGB(chartsClone);
    console.log('🎨 Converting analysis colors...');
    convertModernColorsToRGB(analysisClone);
    
    // Wait a bit for styles to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initialize PDF (A4 size)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let currentY = margin;

    // Add header with branding
    pdf.setFillColor(27, 79, 123); // mlfs.com.au primary color
    pdf.rect(0, 0, pageWidth, 25, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.text('Portfolio Analysis Report', margin, 15);
    pdf.setFontSize(10);
    pdf.text('Generated by mlfs.com.au', margin, 21);

    currentY = 30;

    // Add generation date
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(9);
    const dateStr = new Date().toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    pdf.text(`Report Date: ${dateStr}`, margin, currentY);
    currentY += 10;

    // Capture and add charts section
    pdf.setTextColor(27, 79, 123);
    pdf.setFontSize(14);
    pdf.text('Portfolio Overview', margin, currentY);
    currentY += 7;
    
    console.log('📸 Starting charts canvas capture...');
    console.log('Charts clone dimensions:', {
      width: chartsClone.offsetWidth,
      height: chartsClone.offsetHeight,
      position: chartsClone.style.position
    });
    
    const chartsCanvas = await html2canvas(chartsClone, {
      scale: 2,
      useCORS: true,
      logging: true, // Enable html2canvas logging
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        console.log('🔄 html2canvas onclone callback triggered - converting colors in html2canvas clone');
        const clonedCharts = clonedDoc.getElementById(chartsElementId + '-clone');
        if (clonedCharts) {
          // Convert colors in the html2canvas clone
          const allEls = [clonedCharts, ...Array.from(clonedCharts.querySelectorAll('*'))];
          let converted = 0;
          
          allEls.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const computedStyle = clonedDoc.defaultView?.getComputedStyle(htmlEl) || window.getComputedStyle(htmlEl);
            
            ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'fill', 'stroke'].forEach(prop => {
              const val = computedStyle.getPropertyValue(prop);
              
              if (val && val.trim() !== '' && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent' && val !== 'none') {
                if (val.includes('lab') || val.includes('oklch')) {
                  console.warn(`⚠️ Converting ${prop} in onclone: ${val}`);
                  const rgbVal = colorToRGB(val);
                  if (rgbVal) {
                    htmlEl.style.setProperty(prop, rgbVal, 'important');
                    converted++;
                  }
                } else if (!val.startsWith('rgb') && !val.startsWith('#') && val.includes('(')) {
                  // Only try to convert color functions (must contain parentheses)
                  const rgbVal = colorToRGB(val);
                  if (rgbVal) {
                    htmlEl.style.setProperty(prop, rgbVal, 'important');
                    converted++;
                  }
                }
              }
            });
            
            // Also convert SVG attribute colors (Recharts!)
            ['fill', 'stroke'].forEach(attr => {
              const attrVal = htmlEl.getAttribute(attr);
              if (attrVal && attrVal.trim() !== '' && attrVal !== 'none' && attrVal !== 'transparent') {
                if (attrVal.includes('lab') || attrVal.includes('oklch')) {
                  console.warn(`⚠️ Converting SVG ${attr} in onclone: ${attrVal}`);
                  const rgbVal = colorToRGB(attrVal);
                  if (rgbVal) {
                    htmlEl.setAttribute(attr, rgbVal);
                    htmlEl.style.setProperty(attr, rgbVal, 'important');
                    converted++;
                  }
                }
              }
            });
          });
          
          console.log(`✅ Converted ${converted} colors in html2canvas onclone`);
        }
      }
    }).catch(error => {
      console.error('❌ html2canvas error on charts:', error);
      throw error;
    });
    
    console.log('✅ Charts canvas captured successfully');

    const chartsImgData = chartsCanvas.toDataURL('image/png');
    const chartsImgWidth = contentWidth;
    const chartsImgHeight = (chartsCanvas.height * chartsImgWidth) / chartsCanvas.width;

    // Check if we need a new page for charts
    if (currentY + chartsImgHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
    }

    pdf.addImage(chartsImgData, 'PNG', margin, currentY, chartsImgWidth, chartsImgHeight);
    currentY += chartsImgHeight + 10;

    // Add detailed analysis section
    pdf.addPage();
    currentY = margin;

    pdf.setTextColor(27, 79, 123);
    pdf.setFontSize(14);
    pdf.text('Detailed Analysis', margin, currentY);
    currentY += 7;

    console.log('📸 Starting analysis canvas capture...');
    
    // Capture analysis content
    const analysisCanvas = await html2canvas(analysisClone, {
      scale: 2,
      useCORS: true,
      logging: true, // Enable html2canvas logging
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        console.log('🔄 html2canvas onclone callback triggered for analysis - converting colors');
        const clonedAnalysis = clonedDoc.getElementById(analysisElementId + '-clone');
        if (clonedAnalysis) {
          // Convert colors in the html2canvas clone
          const allEls = [clonedAnalysis, ...Array.from(clonedAnalysis.querySelectorAll('*'))];
          let converted = 0;
          
          allEls.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const computedStyle = clonedDoc.defaultView?.getComputedStyle(htmlEl) || window.getComputedStyle(htmlEl);
            
            ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'fill', 'stroke'].forEach(prop => {
              const val = computedStyle.getPropertyValue(prop);
              
              if (val && val.trim() !== '' && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent' && val !== 'none') {
                if (val.includes('lab') || val.includes('oklch')) {
                  console.warn(`⚠️ Converting ${prop} in onclone: ${val}`);
                  const rgbVal = colorToRGB(val);
                  if (rgbVal) {
                    htmlEl.style.setProperty(prop, rgbVal, 'important');
                    converted++;
                  }
                } else if (!val.startsWith('rgb') && !val.startsWith('#') && val.includes('(')) {
                  // Only try to convert color functions (must contain parentheses)
                  const rgbVal = colorToRGB(val);
                  if (rgbVal) {
                    htmlEl.style.setProperty(prop, rgbVal, 'important');
                    converted++;
                  }
                }
              }
            });
            
            // Also convert SVG attribute colors (Recharts!)
            ['fill', 'stroke'].forEach(attr => {
              const attrVal = htmlEl.getAttribute(attr);
              if (attrVal && attrVal.trim() !== '' && attrVal !== 'none' && attrVal !== 'transparent') {
                if (attrVal.includes('lab') || attrVal.includes('oklch')) {
                  console.warn(`⚠️ Converting SVG ${attr} in onclone: ${attrVal}`);
                  const rgbVal = colorToRGB(attrVal);
                  if (rgbVal) {
                    htmlEl.setAttribute(attr, rgbVal);
                    htmlEl.style.setProperty(attr, rgbVal, 'important');
                    converted++;
                  }
                }
              }
            });
          });
          
          console.log(`✅ Converted ${converted} colors in analysis html2canvas onclone`);
        }
      }
    }).catch(error => {
      console.error('❌ html2canvas error on analysis:', error);
      throw error;
    });
    
    console.log('✅ Analysis canvas captured successfully');

    const analysisImgData = analysisCanvas.toDataURL('image/png');
    const analysisImgWidth = contentWidth;
    const analysisImgHeight = (analysisCanvas.height * analysisImgWidth) / analysisCanvas.width;

    // Split analysis across multiple pages if needed
    let remainingHeight = analysisImgHeight;
    let sourceY = 0;

    while (remainingHeight > 0) {
      const availableHeight = pageHeight - currentY - margin;
      const heightToCopy = Math.min(remainingHeight, availableHeight);
      const sourceHeightInPixels = (heightToCopy / analysisImgWidth) * analysisCanvas.width;

      // Create a temporary canvas for the slice
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = analysisCanvas.width;
      tempCanvas.height = sourceHeightInPixels;
      const tempCtx = tempCanvas.getContext('2d');

      if (tempCtx) {
        tempCtx.drawImage(
          analysisCanvas,
          0,
          sourceY,
          analysisCanvas.width,
          sourceHeightInPixels,
          0,
          0,
          analysisCanvas.width,
          sourceHeightInPixels
        );

        const sliceImgData = tempCanvas.toDataURL('image/png');
        pdf.addImage(sliceImgData, 'PNG', margin, currentY, analysisImgWidth, heightToCopy);
      }

      sourceY += sourceHeightInPixels;
      remainingHeight -= heightToCopy;

      if (remainingHeight > 0) {
        pdf.addPage();
        currentY = margin;
      }
    }

    // Add footer on last page
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      pdf.text(
        'This analysis is for informational purposes only and does not constitute financial advice.',
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );
    }

    // Save the PDF
    pdf.save(fileName);
    
    console.log('💾 PDF saved successfully:', fileName);

    // Clean up clones
    document.body.removeChild(chartsClone);
    document.body.removeChild(analysisClone);
    
    console.log('🧹 Cleaned up cloned elements');

    // Reset cursor
    document.body.style.cursor = originalCursor;
    
    console.log('✅ PDF generation complete!');
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    document.body.style.cursor = 'default';
    
    // Clean up clones if they exist
    const chartsClone = document.getElementById(chartsElementId + '-clone');
    const analysisClone = document.getElementById(analysisElementId + '-clone');
    if (chartsClone) document.body.removeChild(chartsClone);
    if (analysisClone) document.body.removeChild(analysisClone);
    
    throw new Error('Failed to generate PDF. Please try again.');
  }
}
