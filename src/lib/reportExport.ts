import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportOptions {
  filename?: string;
  format?: 'pdf' | 'png';
  quality?: number;
}

/**
 * Apply PDF-optimized styles to the element before capture
 */
const applyPDFStyles = (element: HTMLElement): void => {
  // Create a style element for PDF export
  const styleId = 'pdf-export-styles';
  let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;
  
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }
  
  styleElement.textContent = `
    #report-content * {
      box-sizing: border-box !important;
    }
    #report-content {
      background: white !important;
      color: #1a1a1a !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      line-height: 1.5 !important;
      padding: 20px !important;
    }
    #report-content .grid {
      display: block !important;
    }
    #report-content .grid > * {
      margin-bottom: 16px !important;
      page-break-inside: avoid !important;
    }
    #report-content [class*="card"] {
      background: #ffffff !important;
      border: 1px solid #e5e7eb !important;
      border-radius: 8px !important;
      padding: 16px !important;
      margin-bottom: 12px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      box-shadow: none !important;
    }
    #report-content [class*="CardHeader"],
    #report-content [class*="card-header"] {
      padding-bottom: 8px !important;
      border-bottom: 1px solid #e5e7eb !important;
      margin-bottom: 12px !important;
    }
    #report-content [class*="CardTitle"],
    #report-content [class*="card-title"] {
      font-size: 16px !important;
      font-weight: 600 !important;
      color: #1a1a1a !important;
    }
    #report-content [class*="CardContent"],
    #report-content [class*="card-content"] {
      padding: 0 !important;
    }
    #report-content h1, #report-content h2, #report-content h3 {
      color: #1a1a1a !important;
      margin-bottom: 8px !important;
    }
    #report-content p, #report-content span, #report-content div {
      color: #374151 !important;
    }
    #report-content .text-muted-foreground {
      color: #6b7280 !important;
    }
    #report-content [class*="badge"] {
      display: inline-block !important;
      padding: 2px 8px !important;
      border-radius: 4px !important;
      font-size: 12px !important;
      font-weight: 500 !important;
    }
    #report-content table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 8px 0 !important;
    }
    #report-content th, #report-content td {
      padding: 8px !important;
      text-align: left !important;
      border-bottom: 1px solid #e5e7eb !important;
      font-size: 13px !important;
    }
    #report-content th {
      background: #f9fafb !important;
      font-weight: 600 !important;
    }
    #report-content svg {
      display: inline-block !important;
      vertical-align: middle !important;
    }
    #report-content .recharts-wrapper,
    #report-content [class*="chart"] {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    #report-content .flex {
      display: flex !important;
      flex-wrap: wrap !important;
    }
    #report-content .gap-2 { gap: 8px !important; }
    #report-content .gap-4 { gap: 16px !important; }
    #report-content .space-y-2 > * + * { margin-top: 8px !important; }
    #report-content .space-y-4 > * + * { margin-top: 16px !important; }
  `;
};

/**
 * Remove PDF-optimized styles after capture
 */
const removePDFStyles = (): void => {
  const styleElement = document.getElementById('pdf-export-styles');
  if (styleElement) {
    styleElement.remove();
  }
};

/**
 * Wait for element to be fully rendered and loaded
 */
const waitForElementToLoad = async (
  element: HTMLElement,
  timeout: number = 8000
): Promise<void> => {
  console.log('Waiting for element to load...');
  const startTime = Date.now();

  // Wait for images to load
  const images = element.querySelectorAll('img');
  const imagePromises = Array.from(images).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
      setTimeout(resolve, 2000);
    });
  });

  await Promise.all(imagePromises);
  console.log('Images loaded');

  // Wait for charts and dynamic content
  const checkContent = (): Promise<void> => {
    return new Promise((resolve) => {
      let checks = 0;
      const interval = setInterval(() => {
        checks++;
        const hasContent = element.textContent && element.textContent.trim().length > 100;
        const hasCharts = element.querySelectorAll('canvas, svg').length > 0;
        const hasCards = element.querySelectorAll('[class*="card"]').length > 0;

        console.log(`Content check ${checks}: hasContent=${hasContent}, hasCharts=${hasCharts}, hasCards=${hasCards}`);

        if (hasContent || hasCharts || hasCards || Date.now() - startTime > timeout) {
          clearInterval(interval);
          console.log('Content ready');
          resolve();
        }
      }, 200);
    });
  };

  await checkContent();
  console.log('Final rendering delay...');
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('Element fully loaded and ready');
};

/**
 * Export a DOM element to PDF with proper pagination
 */
export const exportToPDF = async (
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> => {
  const {
    filename = `report-${new Date().toISOString().split('T')[0]}.pdf`,
    quality = 1,
  } = options;

  // Apply PDF-optimized styles
  applyPDFStyles(element);

  // Wait for styles to apply and element to be fully loaded
  await new Promise(resolve => setTimeout(resolve, 300));
  await waitForElementToLoad(element);

  try {
    console.log('Creating canvas from HTML...');
    
    // Get the actual dimensions
    const rect = element.getBoundingClientRect();
    const scrollWidth = Math.max(element.scrollWidth, rect.width);
    const scrollHeight = Math.max(element.scrollHeight, rect.height);
    
    console.log(`Element dimensions: ${scrollWidth}x${scrollHeight}`);
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      width: scrollWidth,
      height: scrollHeight,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      windowWidth: scrollWidth,
      windowHeight: scrollHeight,
      onclone: (clonedDoc: Document) => {
        const clonedElement = clonedDoc.getElementById('report-content');
        if (clonedElement) {
          // Ensure all content is visible in the clone
          clonedElement.style.overflow = 'visible';
          clonedElement.style.height = 'auto';
          clonedElement.style.maxHeight = 'none';
          
          // Force grid to single column for better PDF layout
          const grids = clonedElement.querySelectorAll('.grid');
          grids.forEach((grid: Element) => {
            (grid as HTMLElement).style.display = 'block';
          });
        }
      },
    });

    console.log(`Canvas created: ${canvas.width}x${canvas.height}`);

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas has zero dimensions - content may not be rendered');
    }

    // PDF dimensions in mm
    const pdfWidth = 210; // A4 width
    const pdfHeight = 297; // A4 height
    const margin = 10; // Margin in mm
    const contentWidth = pdfWidth - (margin * 2);
    const contentHeight = pdfHeight - (margin * 2);

    // Calculate the scale to fit width
    const scale = contentWidth / (canvas.width / 2); // Divide by 2 because of scale: 2 in html2canvas
    const scaledHeight = (canvas.height / 2) * scale;

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png', quality);

    // Calculate number of pages needed
    const totalPages = Math.ceil(scaledHeight / contentHeight);
    console.log(`Total pages needed: ${totalPages}`);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      // Calculate the portion of the image to show on this page
      const sourceY = (page * contentHeight / scale) * 2; // Scale back for source coordinates
      const sourceHeight = Math.min((contentHeight / scale) * 2, canvas.height - sourceY);
      
      // Create a temporary canvas for this page's content
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sourceHeight;
      
      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0, sourceY, canvas.width, sourceHeight,
          0, 0, pageCanvas.width, sourceHeight
        );
        
        const pageImgData = pageCanvas.toDataURL('image/png', quality);
        const pageScaledHeight = (sourceHeight / 2) * scale;
        
        pdf.addImage(pageImgData, 'PNG', margin, margin, contentWidth, pageScaledHeight);
      }
    }

    console.log(`Saving PDF as: ${filename}`);
    pdf.save(filename);
    console.log('PDF saved successfully');
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export report to PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    // Clean up PDF styles
    removePDFStyles();
  }
};

/**
 * Export a DOM element to PNG image
 */
export const exportToPNG = async (
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> => {
  const {
    filename = `report-${new Date().toISOString().split('T')[0]}.png`,
    quality = 0.95,
  } = options;

  // Apply PDF styles for consistent look
  applyPDFStyles(element);
  await new Promise(resolve => setTimeout(resolve, 300));

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png', quality);
  } catch (error) {
    console.error('Error exporting to PNG:', error);
    throw new Error('Failed to export report to PNG');
  } finally {
    removePDFStyles();
  }
};

/**
 * Export report content by element ID
 */
export const exportReportById = async (
  elementId: string,
  reportName: string,
  format: 'pdf' | 'png' = 'pdf',
  waitTime: number = 0
): Promise<void> => {
  console.log(`exportReportById called for: ${reportName}, waitTime: ${waitTime}ms`);

  if (waitTime > 0) {
    console.log(`Waiting ${waitTime}ms before export...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  const element = document.getElementById(elementId);
  console.log('Element found:', element ? 'Yes' : 'No');

  if (!element) {
    throw new Error(`Element with ID "${elementId}" not found`);
  }

  const textContent = element.textContent?.trim() || '';
  const hasContent = textContent.length > 50;
  console.log(`Content length: ${textContent.length}, has sufficient content: ${hasContent}`);

  if (!hasContent) {
    console.error('Element content:', textContent.substring(0, 200));
    throw new Error('Report content is empty or not loaded yet');
  }

  const sanitizedName = reportName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${sanitizedName}-${timestamp}.${format}`;
  console.log(`Export filename: ${filename}`);

  if (format === 'pdf') {
    await exportToPDF(element, { filename });
  } else {
    await exportToPNG(element, { filename });
  }
};

/**
 * Generate a sanitized filename from report name
 */
export const generateReportFilename = (
  reportName: string,
  extension: string = 'pdf'
): string => {
  const sanitized = reportName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const timestamp = new Date().toISOString().split('T')[0];
  return `${sanitized}-${timestamp}.${extension}`;
};
