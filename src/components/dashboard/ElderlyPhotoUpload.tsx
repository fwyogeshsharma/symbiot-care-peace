import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { Camera, Upload, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface ElderlyPhotoUploadProps {
  elderlyPersonId: string;
  currentPhotoUrl: string | null;
  fullName: string;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
}

export const ElderlyPhotoUpload = ({ 
  elderlyPersonId, 
  currentPhotoUrl, 
  fullName, 
  size = 'md',
  editable = true 
}: ElderlyPhotoUploadProps) => {
  const [imgSrc, setImgSrc] = useState('');
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

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
    e.target.value = '';
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
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

    const outputSize = 256;
    canvas.width = outputSize;
    canvas.height = outputSize;

    const previewSize = 200;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    let displayWidth, displayHeight;
    
    if (imgAspect > 1) {
      displayHeight = previewSize * scale;
      displayWidth = displayHeight * imgAspect;
    } else {
      displayWidth = previewSize * scale;
      displayHeight = displayWidth / imgAspect;
    }

    const scaleFactorX = img.naturalWidth / displayWidth;
    const scaleFactorY = img.naturalHeight / displayHeight;

    const centerX = previewSize / 2;
    const centerY = previewSize / 2;

    const imgCenterX = centerX + position.x;
    const imgCenterY = centerY + position.y;

    const cropStartX = centerX - previewSize / 2;
    const cropStartY = centerY - previewSize / 2;

    const srcX = (cropStartX - (imgCenterX - displayWidth / 2)) * scaleFactorX;
    const srcY = (cropStartY - (imgCenterY - displayHeight / 2)) * scaleFactorY;
    const srcWidth = previewSize * scaleFactorX;
    const srcHeight = previewSize * scaleFactorY;

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
      const fileName = `${elderlyPersonId}/photo-${Date.now()}.jpg`;

      // Delete old photo if exists
      if (currentPhotoUrl && currentPhotoUrl.includes('/avatars/')) {
        const oldPath = currentPhotoUrl.split('/avatars/').pop();
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
        .from('elderly_persons')
        .update({ photo_url: publicUrl })
        .eq('id', elderlyPersonId);

      if (updateError) throw updateError;

      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['elderly-persons'] });
      queryClient.invalidateQueries({ queryKey: ['accessible-elderly-persons'] });
      
      setIsDialogOpen(false);
      setImgSrc('');
      
      toast({
        title: 'Photo updated',
        description: 'Profile photo has been updated successfully',
      });
    } catch (error: any) {
      console.error('Photo upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload photo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <div className="relative group">
        <Avatar className={`${sizeClasses[size]} flex-shrink-0`}>
          <AvatarImage src={currentPhotoUrl || undefined} alt={fullName} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>
        {editable && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Change photo"
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
        )}
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
            <DialogTitle>Adjust Photo for {fullName}</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4">
            <div 
              className="relative w-[200px] h-[200px] rounded-full overflow-hidden bg-muted cursor-move select-none touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {imgSrc && (
                <img
                  src={imgSrc}
                  alt="Preview"
                  className="absolute pointer-events-none"
                  style={{
                    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
                    transformOrigin: 'center',
                    left: '50%',
                    top: '50%',
                    maxWidth: 'none',
                    minWidth: '100%',
                    minHeight: '100%',
                    objectFit: 'cover',
                  }}
                  draggable={false}
                />
              )}
              <div className="absolute inset-0 border-4 border-primary/30 rounded-full pointer-events-none" />
            </div>

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
