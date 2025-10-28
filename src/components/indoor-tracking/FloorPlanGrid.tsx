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
  const [scale, setScale] = useState(40); // pixels per meter

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const width = floorPlan.width * scale;
    const height = floorPlan.height * scale;
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'hsl(var(--muted))';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= floorPlan.width; x += floorPlan.grid_size) {
        ctx.beginPath();
        ctx.moveTo(x * scale, 0);
        ctx.lineTo(x * scale, height);
        ctx.stroke();
      }
      for (let y = 0; y <= floorPlan.height; y += floorPlan.grid_size) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale);
        ctx.lineTo(width, y * scale);
        ctx.stroke();
      }
    }

    // Draw zones
    floorPlan.zones.forEach(zone => {
      ctx.fillStyle = zone.color + '20'; // 20 = alpha for transparency
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 2;

      ctx.beginPath();
      zone.coordinates.forEach((coord, index) => {
        const x = coord.x * scale;
        const y = coord.y * scale;
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
      const centerX = zone.coordinates.reduce((sum, c) => sum + c.x, 0) / zone.coordinates.length * scale;
      const centerY = zone.coordinates.reduce((sum, c) => sum + c.y, 0) / zone.coordinates.length * scale;
      ctx.fillStyle = 'hsl(var(--foreground))';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zone.name, centerX, centerY);
    });

    // Draw trail
    if (trail.length > 0) {
      const validTrail = trail.filter(pos => typeof pos.x === 'number' && typeof pos.y === 'number');
      
      if (validTrail.length > 0) {
        ctx.strokeStyle = 'hsl(var(--primary))';
        ctx.lineWidth = 2;
        ctx.beginPath();
        validTrail.forEach((pos, index) => {
          const x = pos.x * scale;
          const y = pos.y * scale;
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
          ctx.arc(pos.x * scale, pos.y * scale, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    // Draw current position
    if (currentPosition && typeof currentPosition.x === 'number' && typeof currentPosition.y === 'number') {
      const x = currentPosition.x * scale;
      const y = currentPosition.y * scale;

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
  }, [floorPlan, currentPosition, trail, showGrid, scale]);

  // Animation loop for pulsing effect
  useEffect(() => {
    if (!currentPosition) return;
    
    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Trigger redraw by forcing component update
      setScale(s => s);
    }, 50);

    return () => clearInterval(interval);
  }, [currentPosition]);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{floorPlan.name}</h3>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span>{floorPlan.width}m × {floorPlan.height}m</span>
          </div>
        </div>
        
        <div className="overflow-auto border rounded-lg bg-background">
          <canvas
            ref={canvasRef}
            className="max-w-full"
            style={{ imageRendering: 'crisp-edges' }}
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
