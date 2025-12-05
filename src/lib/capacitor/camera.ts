import { Camera, CameraResultType, CameraSource, Photo, ImageOptions } from '@capacitor/camera';
import { isPluginAvailable, isNative } from './platform';

/**
 * Camera service for Capacitor
 * Handles camera access for floor plan photos and documentation
 */

export interface CapturedImage {
  dataUrl: string;
  path?: string;
  webPath?: string;
  format: string;
}

/**
 * Check if camera is available
 */
export const isCameraAvailable = (): boolean => {
  return isPluginAvailable('Camera');
};

/**
 * Request camera permissions
 */
export const requestCameraPermission = async (): Promise<'granted' | 'denied' | 'prompt'> => {
  if (!isCameraAvailable()) {
    return 'denied';
  }

  try {
    const result = await Camera.requestPermissions();
    return result.camera;
  } catch (error) {
    console.error('Failed to request camera permission:', error);
    return 'denied';
  }
};

/**
 * Check camera permission status
 */
export const checkCameraPermission = async (): Promise<'granted' | 'denied' | 'prompt'> => {
  if (!isCameraAvailable()) {
    return 'denied';
  }

  try {
    const result = await Camera.checkPermissions();
    return result.camera;
  } catch (error) {
    console.error('Failed to check camera permission:', error);
    return 'denied';
  }
};

/**
 * Take a photo with the camera
 */
export const takePhoto = async (options?: Partial<ImageOptions>): Promise<CapturedImage | null> => {
  if (!isCameraAvailable()) {
    console.warn('Camera not available');
    return null;
  }

  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      ...options,
    });

    return convertPhoto(photo);
  } catch (error) {
    console.error('Failed to take photo:', error);
    return null;
  }
};

/**
 * Pick an image from the gallery
 */
export const pickImage = async (options?: Partial<ImageOptions>): Promise<CapturedImage | null> => {
  if (!isCameraAvailable()) {
    // Fallback to file input for web
    return pickImageFromInput();
  }

  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      ...options,
    });

    return convertPhoto(photo);
  } catch (error) {
    console.error('Failed to pick image:', error);
    return null;
  }
};

/**
 * Pick multiple images from the gallery
 */
export const pickMultipleImages = async (limit = 10): Promise<CapturedImage[]> => {
  if (!isCameraAvailable()) {
    console.warn('Camera plugin not available');
    return [];
  }

  try {
    const result = await Camera.pickImages({
      quality: 90,
      limit,
    });

    return result.photos.map(photo => ({
      dataUrl: photo.webPath || '',
      path: photo.path,
      webPath: photo.webPath,
      format: photo.format,
    }));
  } catch (error) {
    console.error('Failed to pick multiple images:', error);
    return [];
  }
};

/**
 * Fallback for web - pick image from file input
 */
const pickImageFromInput = (): Promise<CapturedImage | null> => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];

      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            dataUrl: e.target?.result as string,
            format: file.type.split('/')[1] || 'jpeg',
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      } else {
        resolve(null);
      }
    };

    input.click();
  });
};

/**
 * Convert Capacitor Photo to CapturedImage
 */
const convertPhoto = (photo: Photo): CapturedImage => ({
  dataUrl: photo.dataUrl || '',
  path: photo.path,
  webPath: photo.webPath,
  format: photo.format,
});
