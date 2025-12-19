import { useEffect, useRef, useState } from 'react';
import { FloorPlan, Position } from '@/lib/positionUtils';
import { Card } from '@/components/ui/card';

interface FloorPlanGridProps {
  floorPlan: FloorPlan;
  currentPosition?: Position;
  trail?: Position[];
  showGrid?: boolean;
  showHeatmap?: boolean;
}

export const FloorPlanGrid = ({
  floorPlan,
  currentPosition,
  trail = [],
  showGrid = true,
  showHeatmap = false
}: FloorPlanGridProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);

  // Calculate canvas size based on floor plan dimensions and grid
  // Each grid cell = 60 pixels (square) - matches ZoneEditor
  const PIXELS_PER_CELL = 60;
  const gridCellsWidth = floorPlan.width / floorPlan.grid_size;
  const gridCellsHeight = floorPlan.height / floorPlan.grid_size;
  const CANVAS_WIDTH = gridCellsWidth * PIXELS_PER_CELL;
  const CANVAS_HEIGHT = gridCellsHeight * PIXELS_PER_CELL;
  const scale = PIXELS_PER_CELL / floorPlan.grid_size; // pixels per meter
  const scaleX = scale;
  const scaleY = scale;

  // Calculate actual floor plan dimensions on canvas
  const floorPlanPixelWidth = floorPlan.width * scale;
  const floorPlanPixelHeight = floorPlan.height * scale;

  // Load background image if available
  useEffect(() => {
    if (!floorPlan.image_url) {
      setBackgroundImage(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setBackgroundImage(img);
    };
    img.onerror = (error) => {
      console.error('Failed to load background image:', error);
      setBackgroundImage(null);
    };
    img.src = floorPlan.image_url;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [floorPlan.image_url]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match editor
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Clear canvas and set background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw background image if loaded
    if (backgroundImage) {
      const imgAspectRatio = backgroundImage.width / backgroundImage.height;
      const canvasAspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

      let imgScale;
      let left = 0;
      let top = 0;

      if (imgAspectRatio > canvasAspectRatio) {
        // Image is wider than canvas - scale to canvas width and center vertically
        imgScale = CANVAS_WIDTH / backgroundImage.width;
        const scaledHeight = backgroundImage.height * imgScale;
        top = (CANVAS_HEIGHT - scaledHeight) / 2;
      } else {
        // Image is taller than canvas - scale to canvas height and center horizontally
        imgScale = CANVAS_HEIGHT / backgroundImage.height;
        const scaledWidth = backgroundImage.width * imgScale;
        left = (CANVAS_WIDTH - scaledWidth) / 2;
      }

      const scaledWidth = backgroundImage.width * imgScale;
      const scaledHeight = backgroundImage.height * imgScale;

      ctx.globalAlpha = 0.7;
      ctx.drawImage(backgroundImage, left, top, scaledWidth, scaledHeight);
      ctx.globalAlpha = 1.0;
    }

    // Draw grid filling entire canvas with square cells
    if (showGrid) {
      const gridSpacing = floorPlan.grid_size * scale;
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;

      // Vertical lines - fill entire canvas width
      for (let x = 0; x <= CANVAS_WIDTH; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }

      // Horizontal lines - fill entire canvas height
      for (let y = 0; y <= CANVAS_HEIGHT; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
    }

    // Draw zones with separate X and Y scaling
    floorPlan.zones.forEach(zone => {
      ctx.fillStyle = zone.color + '20'; // 20 = alpha for transparency
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 2;

      ctx.beginPath();
      zone.coordinates.forEach((coord, index) => {
        const x = coord.x * scaleX;
        const y = coord.y * scaleY;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw zone label
      const centerX = zone.coordinates.reduce((sum, c) => sum + c.x, 0) / zone.coordinates.length * scaleX;
      const centerY = zone.coordinates.reduce((sum, c) => sum + c.y, 0) / zone.coordinates.length * scaleY;
      ctx.fillStyle = 'hsl(var(--foreground))';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zone.name, centerX, centerY);
    });

    // Draw furniture
    const furnitureColors: Record<string, string> = {
      bed: '#ef4444',
      chair: '#f59e0b',
      table: '#84cc16',
      sofa: '#06b6d4',
      desk: '#8b5cf6',
      toilet: '#ec4899',
      sink: '#14b8a6',
      door: '#6b7280',
    };

    if (floorPlan.furniture && floorPlan.furniture.length > 0) {
      floorPlan.furniture.forEach(item => {
        ctx.save();

        const x = item.x * scaleX;
        const y = item.y * scaleY;
        const width = item.width * scaleX;
        const height = item.height * scaleY;

        // Translate to the center of the furniture for rotation
        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate((item.rotation * Math.PI) / 180);
        ctx.translate(-(x + width / 2), -(y + height / 2));

        // Draw furniture rectangle
        ctx.fillStyle = furnitureColors[item.type] + '80';
        ctx.strokeStyle = furnitureColors[item.type];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 4);
        ctx.fill();
        ctx.stroke();

        // Draw furniture label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.type.toUpperCase(), x + width / 2, y + height / 2);

        ctx.restore();
      });
    }

    // Draw trail with separate X and Y scaling
    if (trail.length > 0) {
      const validTrail = trail.filter(pos => typeof pos.x === 'number' && typeof pos.y === 'number');

      if (validTrail.length > 0) {
        ctx.strokeStyle = 'hsl(var(--primary))';
        ctx.lineWidth = 2;
        ctx.beginPath();
        validTrail.forEach((pos, index) => {
          const x = pos.x * scaleX;
          const y = pos.y * scaleY;
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // Draw breadcrumb dots
        validTrail.forEach((pos, index) => {
          const opacity = 0.3 + (index / validTrail.length) * 0.7;
          ctx.fillStyle = `hsla(var(--primary) / ${opacity})`;
          ctx.beginPath();
          ctx.arc(pos.x * scaleX, pos.y * scaleY, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    // Draw current position with separate X and Y scaling
    if (currentPosition && typeof currentPosition.x === 'number' && typeof currentPosition.y === 'number') {
      const x = currentPosition.x * scaleX;
      const y = currentPosition.y * scaleY;

      // Pulsing circle animation
      const time = Date.now() / 500;
      const pulseRadius = 8 + Math.sin(time) * 3;

      // Outer pulse
      ctx.fillStyle = 'hsla(var(--primary) / 0.3)';
      ctx.beginPath();
      ctx.arc(x, y, pulseRadius + 5, 0, Math.PI * 2);
      ctx.fill();

      // Inner circle
      ctx.fillStyle = 'hsl(var(--primary))';
      ctx.beginPath();
      ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
      ctx.fill();

      // Center dot
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [floorPlan, currentPosition, trail, showGrid, scale, backgroundImage]);

  // Animation loop for pulsing effect
  useEffect(() => {
    if (!currentPosition) return;

    let animationFrameId: number;
    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Redraw everything to show the pulsing effect
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Redraw background image if loaded
      if (backgroundImage) {
        const imgAspectRatio = backgroundImage.width / backgroundImage.height;
        const canvasAspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

        let imgScale;
        if (imgAspectRatio > canvasAspectRatio) {
          imgScale = CANVAS_WIDTH / backgroundImage.width;
        } else {
          imgScale = CANVAS_HEIGHT / backgroundImage.height;
        }

        const scaledWidth = backgroundImage.width * imgScale;
        const scaledHeight = backgroundImage.height * imgScale;

        ctx.globalAlpha = 0.7;
        ctx.drawImage(backgroundImage, 0, 0, scaledWidth, scaledHeight);
        ctx.globalAlpha = 1.0;
      }

      // Redraw grid filling entire canvas with square cells
      if (showGrid) {
        const gridSpacing = floorPlan.grid_size * scale;
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;

        // Vertical lines - fill entire canvas width
        for (let x = 0; x <= CANVAS_WIDTH; x += gridSpacing) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, CANVAS_HEIGHT);
          ctx.stroke();
        }

        // Horizontal lines - fill entire canvas height
        for (let y = 0; y <= CANVAS_HEIGHT; y += gridSpacing) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(CANVAS_WIDTH, y);
          ctx.stroke();
        }
      }

      // Redraw zones with separate X and Y scaling
      floorPlan.zones.forEach(zone => {
        ctx.fillStyle = zone.color + '20';
        ctx.strokeStyle = zone.color;
        ctx.lineWidth = 2;

        ctx.beginPath();
        zone.coordinates.forEach((coord, index) => {
          const x = coord.x * scaleX;
          const y = coord.y * scaleY;
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const centerX = zone.coordinates.reduce((sum, c) => sum + c.x, 0) / zone.coordinates.length * scaleX;
        const centerY = zone.coordinates.reduce((sum, c) => sum + c.y, 0) / zone.coordinates.length * scaleY;
        ctx.fillStyle = 'hsl(var(--foreground))';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(zone.name, centerX, centerY);
      });

      // Redraw furniture with separate X and Y scaling
      const furnitureColors = {
        bed: '#ef4444',
        chair: '#f59e0b',
        table: '#84cc16',
        sofa: '#06b6d4',
        desk: '#8b5cf6',
        toilet: '#ec4899',
        sink: '#14b8a6',
        door: '#6b7280',
      };

      if (floorPlan.furniture && floorPlan.furniture.length > 0) {
        floorPlan.furniture.forEach(item => {
          ctx.save();

          const x = item.x * scaleX;
          const y = item.y * scaleY;
          const width = item.width * scaleX;
          const height = item.height * scaleY;

          ctx.translate(x + width / 2, y + height / 2);
          ctx.rotate((item.rotation * Math.PI) / 180);
          ctx.translate(-(x + width / 2), -(y + height / 2));

          ctx.fillStyle = furnitureColors[item.type] + '80';
          ctx.strokeStyle = furnitureColors[item.type];
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(x, y, width, height, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = 'white';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(item.type.toUpperCase(), x + width / 2, y + height / 2);

          ctx.restore();
        });
      }

      // Redraw trail with separate X and Y scaling
      if (trail.length > 0) {
        const validTrail = trail.filter(pos => typeof pos.x === 'number' && typeof pos.y === 'number');

        if (validTrail.length > 0) {
          ctx.strokeStyle = 'hsl(var(--primary))';
          ctx.lineWidth = 2;
          ctx.beginPath();
          validTrail.forEach((pos, index) => {
            const x = pos.x * scaleX;
            const y = pos.y * scaleY;
            if (index === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          ctx.stroke();

          validTrail.forEach((pos, index) => {
            const opacity = 0.3 + (index / validTrail.length) * 0.7;
            ctx.fillStyle = `hsla(var(--primary) / ${opacity})`;
            ctx.beginPath();
            ctx.arc(pos.x * scaleX, pos.y * scaleY, 3, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }

      // Draw current position with animation and separate X and Y scaling
      if (currentPosition && typeof currentPosition.x === 'number' && typeof currentPosition.y === 'number') {
        const x = currentPosition.x * scaleX;
        const y = currentPosition.y * scaleY;

        const time = Date.now() / 500;
        const pulseRadius = 8 + Math.sin(time) * 3;

        ctx.fillStyle = 'hsla(var(--primary) / 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius + 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'hsl(var(--primary))';
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [currentPosition, floorPlan, trail, showGrid, scale, backgroundImage, scaleX, scaleY]);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{floorPlan.name}</h3>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span>{floorPlan.width}m × {floorPlan.height}m</span>
          </div>
        </div>
        
        <div className="overflow-auto border rounded-lg bg-background flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="mx-auto"
            style={{ maxWidth: '100%', maxHeight: '70vh', width: 'auto', height: 'auto', display: 'block', imageRendering: 'crisp-edges' }}
          />
        </div>

        {currentPosition && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              <span className="font-medium">Current Zone:</span>
              <span className="text-muted-foreground">{currentPosition.zone}</span>
            </div>
            {typeof currentPosition.x === 'number' && typeof currentPosition.y === 'number' && (
              <div className="text-muted-foreground">
                Position: ({currentPosition.x.toFixed(1)}m, {currentPosition.y.toFixed(1)}m)
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
