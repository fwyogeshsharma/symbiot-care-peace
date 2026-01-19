import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Polygon, Rect, FabricObject, util as fabricUtil, Image as FabricImage } from "fabric";
import { ZoneDrawingTools, DrawingTool } from "./ZoneDrawingTools";
import { ZonePropertiesPanel } from "./ZonePropertiesPanel";
import { FurniturePalette } from "./FurniturePalette";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Zone {
  id: string;
  name: string;
  color: string;
  coordinates: Array<{ x: number; y: number }>;
}

export interface FurnitureItem {
  id: string;
  type: 'bed' | 'chair' | 'table' | 'sofa' | 'desk' | 'toilet' | 'sink' | 'door';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface ZoneEditorProps {
  floorPlanWidth: number;
  floorPlanHeight: number;
  gridSize: number;
  imageUrl?: string;
  initialZones?: Zone[];
  initialFurniture?: FurnitureItem[];
  onSave: (zones: Zone[], furniture: FurnitureItem[]) => Promise<void>;
  onUploadImage?: (file: File) => Promise<void>;
  onRemoveImage?: () => Promise<void>;
  isUploadingImage?: boolean;
}

export function ZoneEditor({
  floorPlanWidth,
  floorPlanHeight,
  gridSize,
  imageUrl,
  initialZones = [],
  initialFurniture = [],
  onSave,
  onUploadImage,
  onRemoveImage,
  isUploadingImage = false,
}: ZoneEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const zoneObjectsRef = useRef<Map<string, Polygon>>(new Map());
  const furnitureObjectsRef = useRef<Map<string, FabricObject>>(new Map());
  const isModifyingRef = useRef(false);
  const backgroundImageRef = useRef<FabricImage | null>(null);

  // Calculate canvas size based on floor plan dimensions and grid
  // Each grid cell = 60 pixels (square)
  const PIXELS_PER_CELL = 60;
  const gridCellsWidth = floorPlanWidth / gridSize;
  const gridCellsHeight = floorPlanHeight / gridSize;
  const CANVAS_WIDTH = gridCellsWidth * PIXELS_PER_CELL;
  const CANVAS_HEIGHT = gridCellsHeight * PIXELS_PER_CELL;
  const SCALE = PIXELS_PER_CELL / gridSize; // pixels per meter

  // Sync state with initialZones/initialFurniture when they change (e.g., after save/reload)
  useEffect(() => {
    console.log('Loading zones from props:', JSON.stringify(initialZones, null, 2));
    console.log('Loading furniture from props:', JSON.stringify(initialFurniture, null, 2));
    setZones(initialZones);
    setFurniture(initialFurniture);
    setHistory([{ zones: initialZones, furniture: initialFurniture }]);
    setHistoryIndex(0);
  }, [JSON.stringify(initialZones), JSON.stringify(initialFurniture)]);

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

  // Load background image
  useEffect(() => {
    if (!fabricCanvas || !imageUrl) {
      // Remove existing background image if imageUrl is cleared
      if (backgroundImageRef.current && fabricCanvas) {
        fabricCanvas.remove(backgroundImageRef.current);
        backgroundImageRef.current = null;
        fabricCanvas.renderAll();
      }
      return;
    }

    // Remove existing background image before loading new one
    if (backgroundImageRef.current) {
      fabricCanvas.remove(backgroundImageRef.current);
      backgroundImageRef.current = null;
    }

    FabricImage.fromURL(imageUrl, {
      crossOrigin: 'anonymous',
    })
      .then((img) => {
        if (!fabricCanvas || !img) return;

        // Scale image to cover the entire canvas (fill) while maintaining aspect ratio
        const imgAspectRatio = (img.width || 1) / (img.height || 1);
        const canvasAspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

        let imgScale;
        let left = 0;
        let top = 0;

        if (imgAspectRatio > canvasAspectRatio) {
          // Image is wider than canvas - scale to canvas width and center vertically
          imgScale = CANVAS_WIDTH / (img.width || 1);
          const scaledHeight = (img.height || 1) * imgScale;
          top = (CANVAS_HEIGHT - scaledHeight) / 2;
        } else {
          // Image is taller than canvas - scale to canvas height and center horizontally
          imgScale = CANVAS_HEIGHT / (img.height || 1);
          const scaledWidth = (img.width || 1) * imgScale;
          left = (CANVAS_WIDTH - scaledWidth) / 2;
        }

        // Set image properties
        img.set({
          scaleX: imgScale,
          scaleY: imgScale,
          left: left,
          top: top,
          selectable: false,
          evented: false,
          opacity: 0.7,
        });

        backgroundImageRef.current = img;
        fabricCanvas.add(img);
        fabricCanvas.sendObjectToBack(img);
        fabricCanvas.renderAll();

        toast.success("Background image loaded");
      })
      .catch((error) => {
        console.error('Error loading background image:', error);
        toast.error("Failed to load background image");
      });

    return () => {
      if (backgroundImageRef.current && fabricCanvas) {
        fabricCanvas.remove(backgroundImageRef.current);
        backgroundImageRef.current = null;
      }
    };
  }, [fabricCanvas, imageUrl, CANVAS_WIDTH, CANVAS_HEIGHT]);

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

  // Render zones and furniture on canvas - smart update instead of full recreate
  useEffect(() => {
    if (!fabricCanvas) return;

    // Don't update while user is actively dragging/modifying
    if (isModifyingRef.current) return;

    const existingZoneIds = new Set(zoneObjectsRef.current.keys());
    const currentZoneIds = new Set(zones.map(z => z.id));

    const existingFurnitureIds = new Set(furnitureObjectsRef.current.keys());
    const currentFurnitureIds = new Set(furniture.map(f => f.id));

    // Remove zones that no longer exist in state
    existingZoneIds.forEach(id => {
      if (!currentZoneIds.has(id)) {
        const obj = zoneObjectsRef.current.get(id);
        if (obj) {
          fabricCanvas.remove(obj);
          zoneObjectsRef.current.delete(id);
        }
      }
    });

    // Remove furniture that no longer exists in state
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
      const existingPolygon = zoneObjectsRef.current.get(zone.id);

      if (!existingPolygon) {
        // Create new zone with exact absolute coordinates
        console.log(`Creating zone ${zone.name} with coordinates:`, zone.coordinates);

        const points = zone.coordinates.map(coord => ({
          x: coord.x * SCALE,
          y: coord.y * SCALE,
        }));

        console.log(`Zone ${zone.name} - Points in pixels:`, points);

        // Calculate centroid for proper positioning
        const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

        console.log(`Zone ${zone.name} - Center at:`, { centerX, centerY });

        // Create points relative to center (Fabric.js polygon coordinate system)
        const relativePoints = points.map(p => ({
          x: p.x - centerX,
          y: p.y - centerY,
        }));

        const polygon = new Polygon(relativePoints, {
          fill: zone.color + '40',
          stroke: zone.color,
          strokeWidth: 2,
          selectable: activeTool === "select" || activeTool === "delete",
          hasControls: activeTool === "select",
          hasBorders: true,
          objectCaching: false,
          left: centerX,
          top: centerY,
          originX: 'center',
          originY: 'center',
        });

        polygon.set('data', { zoneId: zone.id, type: 'zone' });
        fabricCanvas.add(polygon);
        zoneObjectsRef.current.set(zone.id, polygon);
      } else {
        // Update existing zone properties (color, name) only - don't touch coordinates
        existingPolygon.set({
          fill: zone.color + '40',
          stroke: zone.color,
          selectable: activeTool === "select" || activeTool === "delete",
          hasControls: activeTool === "select",
        });
      }
    });

    // Add or update furniture
    furniture.forEach((item) => {
      const existingFurniture = furnitureObjectsRef.current.get(item.id);

      const colors = {
        bed: '#F4A6A6',
        chair: '#F2C94C',
        table: '#9CCC65',
        sofa: '#6ED3CF',
        desk: '#B39DDB',
        toilet: '#FFB6B6',
        sink: '#81D4FA',
        door: '#6B7280',
      };

      if (!existingFurniture) {
        // Create new furniture with exact coordinates
        // Use center origin for consistent rotation handling (like zones)
        const furnitureObj = new Rect({
          left: (item.x + item.width / 2) * SCALE,
          top: (item.y + item.height / 2) * SCALE,
          width: item.width * SCALE,
          height: item.height * SCALE,
          fill: colors[item.type] + '80',
          stroke: colors[item.type],
          strokeWidth: 2,
          angle: item.rotation || 0,
          selectable: activeTool === "select" || activeTool === "furniture",
          hasControls: activeTool === "select" || activeTool === "furniture",
          hasBorders: true,
          rx: 4,
          ry: 4,
          scaleX: 1,
          scaleY: 1,
          originX: 'center',
          originY: 'center',
        });

        furnitureObj.set('data', { furnitureId: item.id, type: 'furniture', furnitureType: item.type });
        fabricCanvas.add(furnitureObj);
        furnitureObjectsRef.current.set(item.id, furnitureObj);
      } else {
        // Update tool-specific properties only - don't touch position
        existingFurniture.set({
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
        // Store as top-left coordinates, but place centered at click position
        const newFurniture: FurnitureItem = {
          id: `furniture_${Date.now()}`,
          type: selectedFurnitureType,
          x: pointer.x / SCALE - dim.width / 2,
          y: pointer.y / SCALE - dim.height / 2,
          width: dim.width,
          height: dim.height,
          rotation: 0,
        };

        const newState = { zones, furniture: [...furniture, newFurniture] };
        addToHistory(newState);
        setFurniture(newState.furniture);
        setActiveTool("select");
        setSelectedFurnitureType(null);
        toast.success(`${selectedFurnitureType} placed`);
      } else if (activeTool === "rectangle") {
        const pointer = fabricCanvas.getPointer(e.e);

        // Create zone with absolute coordinates in meters
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
        toast.success("Rectangle zone created");
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
  }, [fabricCanvas, activeTool, zones, furniture, selectedFurnitureType]);

  // Handle object modifications (zones and furniture)
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleObjectMoving = (e: any) => {
      isModifyingRef.current = true;
    };

    const handleObjectModified = (e: any) => {
      const target = e.target;
      if (!target || !target.data) return;

      // Mark modification as complete
      isModifyingRef.current = false;

      if (target.data.type === 'zone' && target.data.zoneId) {
        const zoneId = target.data.zoneId;

        // Get the absolute bounding box of the polygon
        const aCoords = target.aCoords;
        const points = target.points;

        if (!points || points.length < 3 || !aCoords) return;

        // Calculate absolute coordinates using the actual position on canvas
        const matrix = target.calcTransformMatrix();
        console.log('Zone modification - Matrix:', matrix);
        console.log('Zone modification - Target left/top:', target.left, target.top);
        console.log('Zone modification - Points:', points);

        const newCoordinates = points.map((point: any) => {
          // Transform point using the matrix to get absolute canvas position
          const absPoint = fabricUtil.transformPoint(
            { x: point.x, y: point.y },
            matrix
          );

          // Convert from canvas pixels to meters
          return {
            x: absPoint.x / SCALE,
            y: absPoint.y / SCALE,
          };
        });

        console.log('Zone modification - New coordinates:', newCoordinates);

        // Verify coordinates are valid (not all zeros)
        const hasValidCoords = newCoordinates.some(c => c.x !== 0 || c.y !== 0);
        if (!hasValidCoords) {
          console.error('Invalid coordinates detected, skipping save. Coords:', newCoordinates);
          return;
        }

        // Update state only after modification is complete
        const updatedZones = zones.map(zone =>
          zone.id === zoneId
            ? { ...zone, coordinates: newCoordinates }
            : zone
        );

        const newState = { zones: updatedZones, furniture };
        addToHistory(newState);
        setZones(updatedZones);

      } else if (target.data.type === 'furniture' && target.data.furnitureId) {
        const furnitureId = target.data.furnitureId;

        // Calculate width and height accounting for scaling
        const actualWidth = ((target.width || 0) * (target.scaleX || 1)) / SCALE;
        const actualHeight = ((target.height || 0) * (target.scaleY || 1)) / SCALE;

        // Extract new position, dimensions, and rotation
        // Convert from center origin (Fabric.js) to top-left origin (database storage)
        const updatedFurniture = furniture.map(item =>
          item.id === furnitureId
            ? {
                ...item,
                x: (target.left || 0) / SCALE - actualWidth / 2,
                y: (target.top || 0) / SCALE - actualHeight / 2,
                width: actualWidth,
                height: actualHeight,
                rotation: target.angle || 0,
              }
            : item
        );

        const newState = { zones, furniture: updatedFurniture };
        addToHistory(newState);
        setFurniture(updatedFurniture);
      }
    };

    fabricCanvas.on('object:moving', handleObjectMoving);
    fabricCanvas.on('object:scaling', handleObjectMoving);
    fabricCanvas.on('object:rotating', handleObjectMoving);
    fabricCanvas.on('object:modified', handleObjectModified);

    return () => {
      fabricCanvas.off('object:moving', handleObjectMoving);
      fabricCanvas.off('object:scaling', handleObjectMoving);
      fabricCanvas.off('object:rotating', handleObjectMoving);
      fabricCanvas.off('object:modified', handleObjectModified);
    };
  }, [fabricCanvas, zones, furniture, SCALE]);

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
      // Render effect will automatically clear and recreate
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setZones(nextState.zones);
      setFurniture(nextState.furniture);
      // Render effect will automatically clear and recreate
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
      // Render effect will automatically clear everything
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
    // Render effect will handle removal
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
    // Render effect will handle removal
    toast.success("Furniture deleted");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validate zones before saving
      const validZones = zones.filter(zone => {
        // Check if zone has valid coordinates (not all zeros)
        const hasValidCoords = zone.coordinates.some(c => c.x !== 0 || c.y !== 0);
        if (!hasValidCoords) {
          console.error('Invalid zone detected:', zone);
          toast.error(`Zone "${zone.name}" has invalid coordinates and will not be saved`);
          return false;
        }
        return true;
      });

      if (validZones.length !== zones.length) {
        toast.error("Some zones have invalid coordinates and were not saved");
        return;
      }

      console.log('Saving zones:', JSON.stringify(zones, null, 2));
      await onSave(zones, furniture);
      toast.success("Floor plan saved successfully");
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || "Failed to save floor plan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadImage) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select a valid image file");
        return;
      }
      onUploadImage(file);
    }
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveClick = () => {
    if (onRemoveImage && confirm("Are you sure you want to remove the background image?")) {
      onRemoveImage();
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
          <div className="relative max-w-full">
            <div className="border rounded-lg shadow-lg overflow-hidden" style={{ maxWidth: '100%', maxHeight: '70vh' }}>
              <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '70vh', width: 'auto', height: 'auto', display: 'block' }} />
            </div>

            {/* Image controls */}
            <div className="absolute top-4 right-4 flex gap-2">
              {imageUrl ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRemoveClick}
                  disabled={isUploadingImage}
                  title="Remove background image"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove Image
                </Button>
              ) : (
                <>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    title="Add background image"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    {isUploadingImage ? "Uploading..." : "Add Image"}
                  </Button>
                </>
              )}
            </div>
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
