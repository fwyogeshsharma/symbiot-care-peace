import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Polygon, Rect, FabricObject, util as fabricUtil, Image as FabricImage } from "fabric";
import { ZoneDrawingTools, DrawingTool } from "./ZoneDrawingTools";
import { ZonePropertiesPanel } from "./ZonePropertiesPanel";
import { FurniturePalette } from "./FurniturePalette";
import { toast } from "sonner";

interface Zone {
  id: string;
  name: string;
  color: string;
  coordinates: Array<{ x: number; y: number }>;
  fabricObject?: Polygon;
}

export interface FurnitureItem {
  id: string;
  type: 'bed' | 'chair' | 'table' | 'sofa' | 'desk' | 'toilet' | 'sink' | 'door';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fabricObject?: FabricObject;
}

interface ZoneEditorProps {
  floorPlanWidth: number;
  floorPlanHeight: number;
  gridSize: number;
  imageUrl?: string;
  initialZones?: Zone[];
  initialFurniture?: FurnitureItem[];
  onSave: (zones: Zone[], furniture: FurnitureItem[]) => Promise<void>;
}

export function ZoneEditor({
  floorPlanWidth,
  floorPlanHeight,
  gridSize,
  imageUrl,
  initialZones = [],
  initialFurniture = [],
  onSave,
}: ZoneEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool>("select");
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [furniture, setFurniture] = useState<FurnitureItem[]>(initialFurniture);
  const [selectedFurnitureType, setSelectedFurnitureType] = useState<FurnitureItem['type'] | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<{ zones: Zone[], furniture: FurnitureItem[] }[]>([{ zones: initialZones, furniture: initialFurniture }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [polygonPoints, setPolygonPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [tempLines, setTempLines] = useState<FabricObject[]>([]);
  const zoneObjectsRef = useRef<Map<string, Polygon>>(new Map());
  const furnitureObjectsRef = useRef<Map<string, FabricObject>>(new Map());

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

  // Render zones and furniture on canvas
  useEffect(() => {
    if (!fabricCanvas) return;

    // Get existing objects
    const existingZoneIds = new Set(Array.from(zoneObjectsRef.current.keys()));
    const existingFurnitureIds = new Set(Array.from(furnitureObjectsRef.current.keys()));
    const currentZoneIds = new Set(zones.map(z => z.id));
    const currentFurnitureIds = new Set(furniture.map(f => f.id));

    // Remove deleted zones
    existingZoneIds.forEach(id => {
      if (!currentZoneIds.has(id)) {
        const obj = zoneObjectsRef.current.get(id);
        if (obj) {
          fabricCanvas.remove(obj);
          zoneObjectsRef.current.delete(id);
        }
      }
    });

    // Remove deleted furniture
    existingFurnitureIds.forEach(id => {
      if (!currentFurnitureIds.has(id)) {
        const obj = furnitureObjectsRef.current.get(id);
        if (obj) {
          fabricCanvas.remove(obj);
          furnitureObjectsRef.current.delete(id);
        }
      }
    });

    // Add or update zones
    zones.forEach((zone) => {
      let polygon = zoneObjectsRef.current.get(zone.id);
      
      if (!polygon) {
        // Create new polygon
        const points = zone.coordinates.map(coord => ({
          x: coord.x * SCALE,
          y: coord.y * SCALE,
        }));

        polygon = new Polygon(points, {
          fill: zone.color + '40',
          stroke: zone.color,
          strokeWidth: 2,
          selectable: activeTool === "select" || activeTool === "delete",
          hasControls: activeTool === "select",
          hasBorders: true,
          objectCaching: false,
        });

        polygon.set('data', { zoneId: zone.id, type: 'zone' });
        fabricCanvas.add(polygon);
        zoneObjectsRef.current.set(zone.id, polygon);
      } else {
        // Update existing polygon properties
        polygon.set({
          fill: zone.color + '40',
          stroke: zone.color,
          selectable: activeTool === "select" || activeTool === "delete",
          hasControls: activeTool === "select",
        });
      }
    });

    // Add or update furniture
    furniture.forEach((item) => {
      let furnitureObj = furnitureObjectsRef.current.get(item.id);
      
      if (!furnitureObj) {
        // Create new furniture object
        const colors = {
          bed: '#ef4444',
          chair: '#f59e0b',
          table: '#84cc16',
          sofa: '#06b6d4',
          desk: '#8b5cf6',
          toilet: '#ec4899',
          sink: '#14b8a6',
          door: '#6b7280',
        };

        furnitureObj = new Rect({
          left: item.x * SCALE,
          top: item.y * SCALE,
          width: item.width * SCALE,
          height: item.height * SCALE,
          fill: colors[item.type] + '80',
          stroke: colors[item.type],
          strokeWidth: 2,
          angle: item.rotation,
          selectable: activeTool === "select" || activeTool === "furniture",
          hasControls: activeTool === "select" || activeTool === "furniture",
          hasBorders: true,
          rx: 4,
          ry: 4,
        });

        furnitureObj.set('data', { furnitureId: item.id, type: 'furniture', furnitureType: item.type });
        fabricCanvas.add(furnitureObj);
        furnitureObjectsRef.current.set(item.id, furnitureObj);
      } else {
        // Update existing furniture properties
        furnitureObj.set({
          selectable: activeTool === "select" || activeTool === "furniture",
          hasControls: activeTool === "select" || activeTool === "furniture",
        });
      }
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, zones, furniture, activeTool, SCALE]);

  // Handle canvas clicks
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleMouseDown = (e: any) => {
      if (activeTool === "furniture" && selectedFurnitureType) {
        const pointer = fabricCanvas.getPointer(e.e);
        
        const dimensions = {
          bed: { width: 2, height: 1.8 },
          chair: { width: 0.5, height: 0.5 },
          table: { width: 1.5, height: 1 },
          sofa: { width: 2, height: 0.9 },
          desk: { width: 1.2, height: 0.6 },
          toilet: { width: 0.7, height: 0.7 },
          sink: { width: 0.6, height: 0.5 },
          door: { width: 0.9, height: 0.1 },
        };

        const dim = dimensions[selectedFurnitureType];
        const newFurniture: FurnitureItem = {
          id: `furniture_${Date.now()}`,
          type: selectedFurnitureType,
          x: pointer.x / SCALE,
          y: pointer.y / SCALE,
          width: dim.width,
          height: dim.height,
          rotation: 0,
        };

        const newState = { zones, furniture: [...furniture, newFurniture] };
        addToHistory(newState);
        setFurniture(newState.furniture);
        toast.success(`${selectedFurnitureType} placed`);
      } else if (activeTool === "rectangle") {
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

        const newState = { zones: [...zones, newZone], furniture };
        addToHistory(newState);
        setZones(newState.zones);
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

      if (target.data.type === 'zone') {
        const zoneId = target.data.zoneId;
        
        if (activeTool === "delete") {
          handleZoneDelete(zoneId);
        } else if (activeTool === "select") {
          setSelectedZoneId(zoneId);
          setSelectedFurnitureId(null);
        }
      } else if (target.data.type === 'furniture') {
        const furnitureId = target.data.furnitureId;
        
        if (activeTool === "delete") {
          handleFurnitureDelete(furnitureId);
        } else if (activeTool === "select" || activeTool === "furniture") {
          setSelectedFurnitureId(furnitureId);
          setSelectedZoneId(null);
        }
      }
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:down', handleObjectClick);

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:down', handleObjectClick);
    };
  }, [fabricCanvas, activeTool, zones, furniture, polygonPoints, tempLines, selectedFurnitureType]);

  // Handle object modifications (zones and furniture)
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleObjectModified = (e: any) => {
      const target = e.target;
      if (!target || !target.data) return;

      if (target.data.type === 'zone' && target.data.zoneId) {
        const zoneId = target.data.zoneId;
        
        // Get the transformation matrix
        const matrix = target.calcTransformMatrix();
        const points = target.points;
        
        if (!points || points.length < 3) return;

        // Calculate absolute coordinates for each point
        const newCoordinates = points.map((point: any) => {
          const transformedPoint = fabricUtil.transformPoint(
            { x: point.x, y: point.y },
            matrix
          );
          return {
            x: transformedPoint.x / SCALE,
            y: transformedPoint.y / SCALE,
          };
        });

        // Update the zone with new coordinates
        const updatedZones = zones.map(zone => 
          zone.id === zoneId 
            ? { ...zone, coordinates: newCoordinates }
            : zone
        );
        
        // Reset the polygon's transform to prevent drift
        target.set({
          points: newCoordinates.map(coord => ({
            x: coord.x * SCALE,
            y: coord.y * SCALE
          })),
          left: 0,
          top: 0,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
        });
        target.setCoords();
        
        const newState = { zones: updatedZones, furniture };
        addToHistory(newState);
        setZones(updatedZones);
        
      } else if (target.data.type === 'furniture' && target.data.furnitureId) {
        const furnitureId = target.data.furnitureId;
        
        // Update furniture position and dimensions
        const updatedFurniture = furniture.map(item => 
          item.id === furnitureId 
            ? {
                ...item,
                x: target.left / SCALE,
                y: target.top / SCALE,
                width: (target.width * target.scaleX) / SCALE,
                height: (target.height * target.scaleY) / SCALE,
                rotation: target.angle || 0,
              }
            : item
        );
        
        // Reset scales to 1 to prevent drift
        target.set({
          scaleX: 1,
          scaleY: 1,
          width: target.width * target.scaleX,
          height: target.height * target.scaleY,
        });
        target.setCoords();
        
        const newState = { zones, furniture: updatedFurniture };
        addToHistory(newState);
        setFurniture(updatedFurniture);
      }
      
      fabricCanvas.renderAll();
    };

    fabricCanvas.on('object:modified', handleObjectModified);

    return () => {
      fabricCanvas.off('object:modified', handleObjectModified);
    };
  }, [fabricCanvas, zones, furniture, SCALE]);

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

    const newState = { zones: [...zones, newZone], furniture };
    addToHistory(newState);
    setZones(newState.zones);
    setPolygonPoints([]);
    setActiveTool("select");
    toast.success("Polygon zone created");
  };

  const addToHistory = (newState: { zones: Zone[], furniture: FurnitureItem[] }) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setZones(prevState.zones);
      setFurniture(prevState.furniture);
      // Clear object references to force recreation
      zoneObjectsRef.current.clear();
      furnitureObjectsRef.current.clear();
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setZones(nextState.zones);
      setFurniture(nextState.furniture);
      // Clear object references to force recreation
      zoneObjectsRef.current.clear();
      furnitureObjectsRef.current.clear();
    }
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all zones and furniture?")) {
      const newState = { zones: [], furniture: [] };
      addToHistory(newState);
      setZones([]);
      setFurniture([]);
      setSelectedZoneId(null);
      setSelectedFurnitureId(null);
      zoneObjectsRef.current.clear();
      furnitureObjectsRef.current.clear();
    }
  };

  const handleZoneUpdate = (zoneId: string, updates: Partial<Zone>) => {
    const newZones = zones.map(z => z.id === zoneId ? { ...z, ...updates } : z);
    const newState = { zones: newZones, furniture };
    addToHistory(newState);
    setZones(newZones);
  };

  const handleZoneDelete = (zoneId: string) => {
    const newZones = zones.filter(z => z.id !== zoneId);
    const newState = { zones: newZones, furniture };
    addToHistory(newState);
    setZones(newZones);
    if (selectedZoneId === zoneId) {
      setSelectedZoneId(null);
    }
    zoneObjectsRef.current.delete(zoneId);
    toast.success("Zone deleted");
  };

  const handleFurnitureDelete = (furnitureId: string) => {
    const newFurniture = furniture.filter(f => f.id !== furnitureId);
    const newState = { zones, furniture: newFurniture };
    addToHistory(newState);
    setFurniture(newFurniture);
    if (selectedFurnitureId === furnitureId) {
      setSelectedFurnitureId(null);
    }
    furnitureObjectsRef.current.delete(furnitureId);
    toast.success("Furniture deleted");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(zones, furniture);
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
        <FurniturePalette
          selectedType={selectedFurnitureType}
          onSelectType={(type) => {
            setSelectedFurnitureType(type);
            setActiveTool("furniture");
          }}
          isActive={activeTool === "furniture"}
        />

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
