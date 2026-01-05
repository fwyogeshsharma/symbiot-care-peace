import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportOptions {
  reportName: string;
  reportType: string;
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
  elderlyPersons: any[];
  elementId?: string; // Optional DOM element to convert to PDF
}

/**
 * Fetch report data from database
 */
const fetchReportData = async (options: ExportOptions): Promise<any[]> => {
  const { reportType, selectedPerson, dateRange } = options;

  // Build query based on report type
  let query = supabase
    .from('device_data')
    .select('*')
    .gte('recorded_at', dateRange.from.toISOString())
    .lte('recorded_at', dateRange.to.toISOString());

  // Filter by person if not "all"
  if (selectedPerson !== 'all') {
    query = query.eq('elderly_person_id', selectedPerson);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching report data:', error);
    throw error;
  }

  return data || [];
};

/**
 * Generate PDF from HTML element
 */
const generatePDFFromElement = async (elementId: string, reportName: string): Promise<Blob> => {
  const element = document.getElementById(elementId);

  if (!element) {
    throw new Error(`Element with ID "${elementId}" not found`);
  }

  // Capture the element as canvas
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  // Create PDF
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  // Add first page
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Add additional pages if needed
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  // Convert to blob
  return pdf.output('blob');
};

/**
 * Generate PDF from data
 */
const generatePDFFromData = async (data: any[], reportName: string): Promise<Blob> => {
  const pdf = new jsPDF();

  // Add title
  pdf.setFontSize(18);
  pdf.text(reportName, 20, 20);

  // Add date range
  pdf.setFontSize(10);
  pdf.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 20, 30);

  // Add data summary
  pdf.setFontSize(12);
  pdf.text(`Total Records: ${data.length}`, 20, 40);

  // Add sample data (first 20 rows)
  let yPos = 50;
  const maxRows = Math.min(20, data.length);

  pdf.setFontSize(10);
  for (let i = 0; i < maxRows; i++) {
    const row = data[i];
    const text = `${i + 1}. ${row.data_type || 'N/A'} - ${format(new Date(row.recorded_at), 'MMM dd, HH:mm')}`;
    pdf.text(text, 20, yPos);
    yPos += 7;

    // Add new page if needed
    if (yPos > 280) {
      pdf.addPage();
      yPos = 20;
    }
  }

  if (data.length > 20) {
    pdf.text(`... and ${data.length - 20} more records`, 20, yPos + 10);
  }

  return pdf.output('blob');
};

/**
 * Export report to PDF and save to Downloads folder on mobile
 */
export const exportReport = async (options: ExportOptions): Promise<void> => {
  try {
    const { reportName, elementId } = options;

    let pdfBlob: Blob;

    // Generate PDF from element if provided, otherwise from data
    if (elementId) {
      pdfBlob = await generatePDFFromElement(elementId, reportName);
    } else {
      // Fetch data and generate PDF from it
      const data = await fetchReportData(options);

      if (data.length === 0) {
        alert('No data available for this report');
        return;
      }

      pdfBlob = await generatePDFFromData(data, reportName);
    }

    // Create filename
    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
    const filename = `${reportName.replace(/\s+/g, '_')}_${timestamp}.pdf`;

    // Check if running on mobile
    if (Capacitor.isNativePlatform()) {
      // Convert blob to base64 for Capacitor Filesystem
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);

      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove data:application/pdf;base64, prefix
          const base64WithoutPrefix = base64.split(',')[1];
          resolve(base64WithoutPrefix);
        };
        reader.onerror = reject;
      });

      // Save to Documents directory on mobile
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
      });

      console.log('PDF saved:', result.uri);

      // Share the file so user can save to Downloads
      await Share.share({
        title: `Export: ${reportName}`,
        text: `Report exported as PDF: ${reportName}`,
        url: result.uri,
        dialogTitle: 'Save Report PDF',
      });

      alert(`Report exported: ${filename}`);
    } else {
      // Web: Download using blob
      const link = document.createElement('a');
      const url = URL.createObjectURL(pdfBlob);

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`Report downloaded: ${filename}`);
    }
  } catch (error: any) {
    console.error('Error exporting report:', error);
    alert(`Failed to export report: ${error.message}`);
  }
};

/**
 * Export all reports in a category
 */
export const exportAllReports = async (
  categoryId: string,
  reports: any[],
  selectedPerson: string,
  dateRange: { from: Date; to: Date },
  elderlyPersons: any[]
): Promise<void> => {
  try {
    for (const report of reports) {
      await exportReport({
        reportName: report.name,
        reportType: categoryId,
        selectedPerson,
        dateRange,
        elderlyPersons,
      });

      // Small delay between exports
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    alert(`All ${reports.length} reports exported successfully`);
  } catch (error) {
    console.error('Error exporting all reports:', error);
    alert(`Failed to export all reports: ${error.message}`);
  }
};
