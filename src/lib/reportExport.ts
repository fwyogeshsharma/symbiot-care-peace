import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportOptions {
  filename?: string;
  format?: 'pdf' | 'png';
  quality?: number;
}

/**
 * Wait for element to be fully rendered and loaded
 * @param element - The HTML element to check
 * @param timeout - Maximum time to wait in milliseconds
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
      img.onerror = resolve; // Resolve even on error to not block
      // Add timeout for individual images
      setTimeout(resolve, 2000);
    });
  });

  await Promise.all(imagePromises);
  console.log('Images loaded');

  // Wait for charts and dynamic content (check for canvas elements)
  const checkContent = (): Promise<void> => {
    return new Promise((resolve) => {
      let checks = 0;
      const interval = setInterval(() => {
        checks++;
        // Check if there's actual content (not just loading states)
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

  // Additional delay to ensure all rendering is complete
  console.log('Final rendering delay...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('Element fully loaded and ready');
};

/**
 * Export a DOM element to PDF
 * @param element - The HTML element to export
 * @param options - Export options
 */
export const exportToPDF = async (
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> => {
  const {
    filename = `report-${new Date().toISOString().split('T')[0]}.pdf`,
    quality = 0.95,
  } = options;

  // Wait for element to be fully loaded
  await waitForElementToLoad(element);

  try {
    console.log('Creating canvas from HTML...');
    // Create canvas from HTML element
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: true, // Enable logging for debugging
      backgroundColor: '#ffffff',
      allowTaint: true,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    console.log(`Canvas created: ${canvas.width}x${canvas.height}`);

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas has zero dimensions - content may not be rendered');
    }

    const imgData = canvas.toDataURL('image/png', quality);
    console.log('Canvas converted to image data');

    // Calculate PDF dimensions
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    console.log(`PDF dimensions: ${imgWidth}x${imgHeight}mm`);

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if content is longer than one page
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    console.log(`Saving PDF as: ${filename}`);
    // Save PDF
    pdf.save(filename);
    console.log('PDF saved successfully');
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export report to PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};

/**
 * Export a DOM element to PNG image
 * @param element - The HTML element to export
 * @param options - Export options
 */
export const exportToPNG = async (
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> => {
  const {
    filename = `report-${new Date().toISOString().split('T')[0]}.png`,
    quality = 0.95,
  } = options;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Convert to blob and download
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
  }
};

/**
 * Export report content by element ID
 * @param elementId - The ID of the element to export
 * @param reportName - Name of the report for the filename
 * @param format - Export format (pdf or png)
 * @param waitTime - Additional time to wait before export (ms)
 */
export const exportReportById = async (
  elementId: string,
  reportName: string,
  format: 'pdf' | 'png' = 'pdf',
  waitTime: number = 0
): Promise<void> => {
  console.log(`exportReportById called for: ${reportName}, waitTime: ${waitTime}ms`);

  // Additional wait time if specified
  if (waitTime > 0) {
    console.log(`Waiting ${waitTime}ms before export...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  const element = document.getElementById(elementId);
  console.log('Element found:', element ? 'Yes' : 'No');

  if (!element) {
    throw new Error(`Element with ID "${elementId}" not found`);
  }

  // Check if element has content
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
 * @param reportName - The name of the report
 * @param extension - File extension (default: 'pdf')
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
