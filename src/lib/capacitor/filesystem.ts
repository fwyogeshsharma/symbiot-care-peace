import { Filesystem, Directory, Encoding, WriteFileResult, ReadFileResult } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isPluginAvailable, isNative } from './platform';

/**
 * Filesystem service for Capacitor
 * Handles file operations for reports, exports, and downloads
 */

export interface FileInfo {
  name: string;
  path: string;
  size?: number;
  mimeType?: string;
}

/**
 * Check if filesystem is available
 */
export const isFilesystemAvailable = (): boolean => {
  return isPluginAvailable('Filesystem');
};

/**
 * Write a text file
 */
export const writeTextFile = async (
  filename: string,
  content: string,
  directory: Directory = Directory.Documents
): Promise<string | null> => {
  if (!isFilesystemAvailable()) {
    // Fallback to browser download
    downloadAsFile(filename, content, 'text/plain');
    return null;
  }

  try {
    const result = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory,
      encoding: Encoding.UTF8,
    });
    return result.uri;
  } catch (error) {
    console.error('Failed to write file:', error);
    return null;
  }
};

/**
 * Write a binary file (base64 encoded)
 */
export const writeBase64File = async (
  filename: string,
  base64Data: string,
  directory: Directory = Directory.Documents
): Promise<string | null> => {
  if (!isFilesystemAvailable()) {
    // Fallback to browser download
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = filename;
    link.click();
    return null;
  }

  try {
    const result = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory,
    });
    return result.uri;
  } catch (error) {
    console.error('Failed to write base64 file:', error);
    return null;
  }
};

/**
 * Read a text file
 */
export const readTextFile = async (
  path: string,
  directory: Directory = Directory.Documents
): Promise<string | null> => {
  if (!isFilesystemAvailable()) {
    console.warn('Filesystem not available');
    return null;
  }

  try {
    const result = await Filesystem.readFile({
      path,
      directory,
      encoding: Encoding.UTF8,
    });
    return result.data as string;
  } catch (error) {
    console.error('Failed to read file:', error);
    return null;
  }
};

/**
 * Read a binary file as base64
 */
export const readBase64File = async (
  path: string,
  directory: Directory = Directory.Documents
): Promise<string | null> => {
  if (!isFilesystemAvailable()) {
    console.warn('Filesystem not available');
    return null;
  }

  try {
    const result = await Filesystem.readFile({
      path,
      directory,
    });
    return result.data as string;
  } catch (error) {
    console.error('Failed to read file:', error);
    return null;
  }
};

/**
 * Delete a file
 */
export const deleteFile = async (
  path: string,
  directory: Directory = Directory.Documents
): Promise<boolean> => {
  if (!isFilesystemAvailable()) {
    console.warn('Filesystem not available');
    return false;
  }

  try {
    await Filesystem.deleteFile({ path, directory });
    return true;
  } catch (error) {
    console.error('Failed to delete file:', error);
    return false;
  }
};

/**
 * Check if a file exists
 */
export const fileExists = async (
  path: string,
  directory: Directory = Directory.Documents
): Promise<boolean> => {
  if (!isFilesystemAvailable()) {
    return false;
  }

  try {
    await Filesystem.stat({ path, directory });
    return true;
  } catch {
    return false;
  }
};

/**
 * Create a directory
 */
export const createDirectory = async (
  path: string,
  directory: Directory = Directory.Documents
): Promise<boolean> => {
  if (!isFilesystemAvailable()) {
    return false;
  }

  try {
    await Filesystem.mkdir({
      path,
      directory,
      recursive: true,
    });
    return true;
  } catch (error) {
    console.error('Failed to create directory:', error);
    return false;
  }
};

/**
 * List files in a directory
 */
export const listFiles = async (
  path: string,
  directory: Directory = Directory.Documents
): Promise<string[]> => {
  if (!isFilesystemAvailable()) {
    return [];
  }

  try {
    const result = await Filesystem.readdir({ path, directory });
    return result.files.map(f => f.name);
  } catch (error) {
    console.error('Failed to list files:', error);
    return [];
  }
};

/**
 * Download content as a file (web fallback)
 */
export const downloadAsFile = (
  filename: string,
  content: string,
  mimeType: string = 'text/plain'
): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Download a CSV file
 */
export const downloadCSV = async (
  filename: string,
  data: Record<string, any>[],
  headers?: string[]
): Promise<string | null> => {
  if (data.length === 0) return null;

  const csvHeaders = headers || Object.keys(data[0]);
  const csvRows = data.map(row =>
    csvHeaders.map(header => {
      const value = row[header];
      const stringValue = value === null || value === undefined ? '' : String(value);
      // Escape quotes and wrap in quotes if contains comma
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );

  const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

  if (!isFilesystemAvailable()) {
    downloadAsFile(filename, csvContent, 'text/csv');
    return null;
  }

  return writeTextFile(filename, csvContent);
};

/**
 * Download a JSON file
 */
export const downloadJSON = async (
  filename: string,
  data: any
): Promise<string | null> => {
  const jsonContent = JSON.stringify(data, null, 2);

  if (!isFilesystemAvailable()) {
    downloadAsFile(filename, jsonContent, 'application/json');
    return null;
  }

  return writeTextFile(filename, jsonContent);
};

/**
 * Share a file
 */
export const shareFile = async (
  title: string,
  path: string,
  dialogTitle?: string
): Promise<boolean> => {
  if (!isPluginAvailable('Share')) {
    console.warn('Share not available');
    return false;
  }

  try {
    await Share.share({
      title,
      url: path,
      dialogTitle: dialogTitle || title,
    });
    return true;
  } catch (error) {
    console.error('Failed to share file:', error);
    return false;
  }
};

/**
 * Share text content
 */
export const shareText = async (
  title: string,
  text: string,
  url?: string
): Promise<boolean> => {
  if (!isPluginAvailable('Share')) {
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  try {
    await Share.share({
      title,
      text,
      url,
      dialogTitle: title,
    });
    return true;
  } catch (error) {
    console.error('Failed to share text:', error);
    return false;
  }
};

/**
 * Check if sharing is available
 */
export const canShare = async (): Promise<boolean> => {
  if (!isPluginAvailable('Share')) {
    return 'share' in navigator;
  }
  return true;
};
