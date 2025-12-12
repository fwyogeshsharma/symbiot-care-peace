import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { Camera, Upload, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  fullName: string | null;
  onAvatarChange: (url: string) => void;
}

export const AvatarUpload = ({ userId, currentAvatarUrl, fullName, onAvatarChange }: AvatarUploadProps) => {
  const [imgSrc, setImgSrc] = useState('');
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image under 5MB',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const img = new Image();
        img.onload = () => {
          imageRef.current = img;
          setImgSrc(reader.result?.toString() || '');
          setScale(1);
          setPosition({ x: 0, y: 0 });
          setIsDialogOpen(true);
        };
        img.src = reader.result?.toString() || '';
      });
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX - position.x, 
        y: e.touches[0].clientY - position.y 
      });
    }
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const getCroppedImage = async (): Promise<Blob> => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    
    if (!canvas || !img) {
      throw new Error('Canvas or image not available');
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    // Output size
    const outputSize = 256;
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Preview container size (matches the preview div)
    const previewSize = 200;
    
    // Calculate how the image is displayed in the preview
    const imgAspect = img.naturalWidth / img.naturalHeight;
    let displayWidth, displayHeight;
    
    if (imgAspect > 1) {
      displayHeight = previewSize * scale;
      displayWidth = displayHeight * imgAspect;
    } else {
      displayWidth = previewSize * scale;
      displayHeight = displayWidth / imgAspect;
    }

    // Calculate crop region in source image coordinates
    const scaleFactorX = img.naturalWidth / displayWidth;
    const scaleFactorY = img.naturalHeight / displayHeight;

    // Center of preview
    const centerX = previewSize / 2;
    const centerY = previewSize / 2;

    // Image position in preview (centered + user offset)
    const imgCenterX = centerX + position.x;
    const imgCenterY = centerY + position.y;

    // Crop area in preview coordinates
    const cropStartX = centerX - previewSize / 2;
    const cropStartY = centerY - previewSize / 2;

    // Source coordinates
    const srcX = (cropStartX - (imgCenterX - displayWidth / 2)) * scaleFactorX;
    const srcY = (cropStartY - (imgCenterY - displayHeight / 2)) * scaleFactorY;
    const srcWidth = previewSize * scaleFactorX;
    const srcHeight = previewSize * scaleFactorY;

    // Clear and draw
    ctx.clearRect(0, 0, outputSize, outputSize);
    ctx.drawImage(
      img,
      srcX, srcY, srcWidth, srcHeight,
      0, 0, outputSize, outputSize
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        },
        'image/jpeg',
        0.9
      );
    });
  };

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      const croppedBlob = await getCroppedImage();
      const fileName = `${userId}/avatar-${Date.now()}.jpg`;

      // Delete old avatar if exists
      if (currentAvatarUrl && currentAvatarUrl.includes('/avatars/')) {
        const oldPath = currentAvatarUrl.split('/avatars/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      onAvatarChange(publicUrl);
      setIsDialogOpen(false);
      setImgSrc('');
      
      toast({
        title: 'Avatar updated',
        description: 'Your profile photo has been updated successfully',
      });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload avatar',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <div className="relative group">
        <Avatar className="w-16 h-16 sm:w-20 sm:h-20 cursor-pointer ring-2 ring-background shadow-lg">
          <AvatarImage src={currentAvatarUrl || undefined} alt={fullName || 'User'} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg sm:text-xl font-semibold">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          aria-label="Change profile photo"
        >
          <Camera className="w-6 h-6 text-white" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onSelectFile}
          className="hidden"
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Profile Photo</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4">
            {/* Preview area with circular mask */}
            <div 
              ref={containerRef}
              className="relative w-[200px] h-[200px] rounded-full overflow-hidden bg-muted cursor-move select-none touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {imgSrc && (
                <img
                  src={imgSrc}
                  alt="Preview"
                  className="absolute pointer-events-none"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: 'center',
                    left: '50%',
                    top: '50%',
                    marginLeft: '-50%',
                    marginTop: '-50%',
                    maxWidth: 'none',
                    height: '100%',
                    width: 'auto',
                  }}
                  draggable={false}
                />
              )}
              {/* Circular overlay guide */}
              <div className="absolute inset-0 border-4 border-primary/30 rounded-full pointer-events-none" />
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-3 w-full max-w-[200px]">
              <ZoomOut className="w-4 h-4 text-muted-foreground" />
              <Slider
                value={[scale]}
                onValueChange={(value) => setScale(value[0])}
                min={0.5}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <ZoomIn className="w-4 h-4 text-muted-foreground" />
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Drag to reposition, use slider to zoom
            </p>
          </div>

          {/* Hidden canvas for cropping */}
          <canvas ref={canvasRef} className="hidden" />

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setImgSrc('');
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Save Photo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
