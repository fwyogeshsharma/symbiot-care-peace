import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Polygon, Rect, FabricObject } from "fabric";
import { ZoneDrawingTools, DrawingTool } from "./ZoneDrawingTools";
import { ZonePropertiesPanel } from "./ZonePropertiesPanel";
import { toast } from "sonner";

interface Zone {
  id: string;
  name: string;
  color: string;
  coordinates: Array<{ x: number; y: number }>;
}

interface ZoneEditorProps {
  floorPlanWidth: number;
  floorPlanHeight: number;
  gridSize: number;
  imageUrl?: string;
  initialZones?: Zone[];
  onSave: (zones: Zone[]) => Promise<void>;
}

export function ZoneEditor({
  floorPlanWidth,
  floorPlanHeight,
  gridSize,
  imageUrl,
  initialZones = [],
  onSave,
}: ZoneEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool>("select");
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<Zone[][]>([initialZones]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [polygonPoints, setPolygonPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [tempLines, setTempLines] = useState<FabricObject[]>([]);

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const SCALE = Math.min(CANVAS_WIDTH / floorPlanWidth, CANVAS_HEIGHT / floorPlanHeight);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: "#f0f0f0",
      selection: activeTool === "select",
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Draw grid
  useEffect(() => {
    if (!fabricCanvas) return;

    const gridSpacing = gridSize * SCALE;
    const ctx = fabricCanvas.getContext();
    
    fabricCanvas.on('after:render', () => {
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;

      // Vertical lines
      for (let x = 0; x <= CANVAS_WIDTH; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= CANVAS_HEIGHT; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, gridSize]);

  // Render zones on canvas
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#f0f0f0";

    zones.forEach((zone) => {
      const points = zone.coordinates.map(coord => ({
        x: coord.x * SCALE,
        y: coord.y * SCALE,
      }));

      const polygon = new Polygon(points, {
        fill: zone.color + '40',
        stroke: zone.color,
        strokeWidth: 2,
        selectable: activeTool === "select",
        hasControls: true,
        hasBorders: true,
        objectCaching: false,
      });

      polygon.set('data', { zoneId: zone.id });
      fabricCanvas.add(polygon);
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, zones, activeTool]);

  // Handle canvas clicks
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleMouseDown = (e: any) => {
      if (activeTool === "rectangle") {
        const pointer = fabricCanvas.getPointer(e.e);
        const rect = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 100,
          height: 100,
          fill: '#3b82f6' + '40',
          stroke: '#3b82f6',
          strokeWidth: 2,
        });
        
        const newZone: Zone = {
          id: `zone_${Date.now()}`,
          name: `Zone ${zones.length + 1}`,
          color: '#3b82f6',
          coordinates: [
            { x: pointer.x / SCALE, y: pointer.y / SCALE },
            { x: (pointer.x + 100) / SCALE, y: pointer.y / SCALE },
            { x: (pointer.x + 100) / SCALE, y: (pointer.y + 100) / SCALE },
            { x: pointer.x / SCALE, y: (pointer.y + 100) / SCALE },
          ],
        };

        addToHistory([...zones, newZone]);
        setZones([...zones, newZone]);
        setActiveTool("select");
      } else if (activeTool === "polygon") {
        const pointer = fabricCanvas.getPointer(e.e);
        const newPoint = { x: pointer.x, y: pointer.y };
        
        const newPoints = [...polygonPoints, newPoint];
        setPolygonPoints(newPoints);

        // Draw temporary line
        if (newPoints.length > 1) {
          const lastPoint = newPoints[newPoints.length - 2];
          const line = new Rect({
            left: Math.min(lastPoint.x, newPoint.x),
            top: Math.min(lastPoint.y, newPoint.y),
            width: Math.abs(newPoint.x - lastPoint.x) || 1,
            height: Math.abs(newPoint.y - lastPoint.y) || 1,
            fill: 'transparent',
            stroke: '#3b82f6',
            strokeWidth: 2,
            selectable: false,
          });
          fabricCanvas.add(line);
          setTempLines([...tempLines, line]);
        }

        // Complete polygon on double click or when close to first point
        if (newPoints.length > 2) {
          const firstPoint = newPoints[0];
          const distance = Math.sqrt(
            Math.pow(newPoint.x - firstPoint.x, 2) + Math.pow(newPoint.y - firstPoint.y, 2)
          );
          
          if (distance < 10) {
            completePolygon(newPoints);
          }
        }
      }
    };

    const handleObjectClick = (e: any) => {
      const target = e.target;
      if (!target || !target.data) return;

      const zoneId = target.data.zoneId;
      
      if (activeTool === "delete") {
        handleZoneDelete(zoneId);
      } else if (activeTool === "select") {
        setSelectedZoneId(zoneId);
      }
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:down', handleObjectClick);

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:down', handleObjectClick);
    };
  }, [fabricCanvas, activeTool, zones, polygonPoints, tempLines]);

  const completePolygon = (points: Array<{ x: number; y: number }>) => {
    // Clear temp lines
    tempLines.forEach(line => fabricCanvas?.remove(line));
    setTempLines([]);

    const newZone: Zone = {
      id: `zone_${Date.now()}`,
      name: `Zone ${zones.length + 1}`,
      color: '#3b82f6',
      coordinates: points.map(p => ({ x: p.x / SCALE, y: p.y / SCALE })),
    };

    addToHistory([...zones, newZone]);
    setZones([...zones, newZone]);
    setPolygonPoints([]);
    setActiveTool("select");
    toast.success("Polygon zone created");
  };

  const addToHistory = (newZones: Zone[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newZones);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setZones(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setZones(history[historyIndex + 1]);
    }
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all zones?")) {
      addToHistory([]);
      setZones([]);
      setSelectedZoneId(null);
    }
  };

  const handleZoneUpdate = (zoneId: string, updates: Partial<Zone>) => {
    const newZones = zones.map(z => z.id === zoneId ? { ...z, ...updates } : z);
    addToHistory(newZones);
    setZones(newZones);
  };

  const handleZoneDelete = (zoneId: string) => {
    const newZones = zones.filter(z => z.id !== zoneId);
    addToHistory(newZones);
    setZones(newZones);
    if (selectedZoneId === zoneId) {
      setSelectedZoneId(null);
    }
    toast.success("Zone deleted");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(zones);
      toast.success("Floor plan saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save floor plan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ZoneDrawingTools
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onSave={handleSave}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        isSaving={isSaving}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <div className="border rounded-lg shadow-lg overflow-hidden">
            <canvas ref={canvasRef} />
          </div>
        </div>

        <ZonePropertiesPanel
          zones={zones}
          selectedZoneId={selectedZoneId}
          onZoneSelect={setSelectedZoneId}
          onZoneUpdate={handleZoneUpdate}
          onZoneDelete={handleZoneDelete}
        />
      </div>
    </div>
  );
}
