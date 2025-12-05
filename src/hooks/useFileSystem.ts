import { useCallback } from 'react';
import { Directory } from '@capacitor/filesystem';
import {
  writeTextFile,
  writeBase64File,
  readTextFile,
  readBase64File,
  deleteFile,
  fileExists,
  downloadCSV,
  downloadJSON,
  shareFile,
  shareText,
  canShare,
} from '@/lib/capacitor/filesystem';
import { takePhoto, pickImage, CapturedImage } from '@/lib/capacitor/camera';

export interface UseFileSystemReturn {
  writeFile: (filename: string, content: string, directory?: Directory) => Promise<string | null>;
  writeBase64: (filename: string, base64: string, directory?: Directory) => Promise<string | null>;
  readFile: (path: string, directory?: Directory) => Promise<string | null>;
  readBase64: (path: string, directory?: Directory) => Promise<string | null>;
  deleteFile: (path: string, directory?: Directory) => Promise<boolean>;
  fileExists: (path: string, directory?: Directory) => Promise<boolean>;
  downloadCSV: (filename: string, data: Record<string, any>[], headers?: string[]) => Promise<string | null>;
  downloadJSON: (filename: string, data: any) => Promise<string | null>;
  shareFile: (title: string, path: string) => Promise<boolean>;
  shareText: (title: string, text: string, url?: string) => Promise<boolean>;
  canShare: () => Promise<boolean>;
  takePhoto: () => Promise<CapturedImage | null>;
  pickImage: () => Promise<CapturedImage | null>;
}

export function useFileSystem(): UseFileSystemReturn {
  const writeFileHandler = useCallback(async (
    filename: string,
    content: string,
    directory: Directory = Directory.Documents
  ): Promise<string | null> => {
    return writeTextFile(filename, content, directory);
  }, []);

  const writeBase64Handler = useCallback(async (
    filename: string,
    base64: string,
    directory: Directory = Directory.Documents
  ): Promise<string | null> => {
    return writeBase64File(filename, base64, directory);
  }, []);

  const readFileHandler = useCallback(async (
    path: string,
    directory: Directory = Directory.Documents
  ): Promise<string | null> => {
    return readTextFile(path, directory);
  }, []);

  const readBase64Handler = useCallback(async (
    path: string,
    directory: Directory = Directory.Documents
  ): Promise<string | null> => {
    return readBase64File(path, directory);
  }, []);

  const deleteFileHandler = useCallback(async (
    path: string,
    directory: Directory = Directory.Documents
  ): Promise<boolean> => {
    return deleteFile(path, directory);
  }, []);

  const fileExistsHandler = useCallback(async (
    path: string,
    directory: Directory = Directory.Documents
  ): Promise<boolean> => {
    return fileExists(path, directory);
  }, []);

  const downloadCSVHandler = useCallback(async (
    filename: string,
    data: Record<string, any>[],
    headers?: string[]
  ): Promise<string | null> => {
    return downloadCSV(filename, data, headers);
  }, []);

  const downloadJSONHandler = useCallback(async (
    filename: string,
    data: any
  ): Promise<string | null> => {
    return downloadJSON(filename, data);
  }, []);

  const shareFileHandler = useCallback(async (
    title: string,
    path: string
  ): Promise<boolean> => {
    return shareFile(title, path);
  }, []);

  const shareTextHandler = useCallback(async (
    title: string,
    text: string,
    url?: string
  ): Promise<boolean> => {
    return shareText(title, text, url);
  }, []);

  const canShareHandler = useCallback(async (): Promise<boolean> => {
    return canShare();
  }, []);

  const takePhotoHandler = useCallback(async (): Promise<CapturedImage | null> => {
    return takePhoto();
  }, []);

  const pickImageHandler = useCallback(async (): Promise<CapturedImage | null> => {
    return pickImage();
  }, []);

  return {
    writeFile: writeFileHandler,
    writeBase64: writeBase64Handler,
    readFile: readFileHandler,
    readBase64: readBase64Handler,
    deleteFile: deleteFileHandler,
    fileExists: fileExistsHandler,
    downloadCSV: downloadCSVHandler,
    downloadJSON: downloadJSONHandler,
    shareFile: shareFileHandler,
    shareText: shareTextHandler,
    canShare: canShareHandler,
    takePhoto: takePhotoHandler,
    pickImage: pickImageHandler,
  };
}
