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
  const containerRef = useRef<HTMLDivElement>(null);
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
  const [showFurniturePalette, setShowFurniturePalette] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [canvasSize, setCanvasSize] = useState(() => {
    // Calculate initial size based on window
    const isMobile = window.innerWidth < 768;
    const baseWidth = isMobile ? Math.min(window.innerWidth - 32, 400) : 800;
    const baseHeight = isMobile ? Math.min(window.innerHeight * 0.5, 400) : 600;
    return { width: baseWidth, height: baseHeight };
  });
  const zoneObjectsRef = useRef<Map<string, Polygon>>(new Map());
  const furnitureObjectsRef = useRef<Map<string, FabricObject>>(new Map());
  const isModifyingRef = useRef(false);
  const backgroundImageRef = useRef<FabricImage | null>(null);

  const CANVAS_WIDTH = canvasSize.width;
  const CANVAS_HEIGHT = canvasSize.height;
  const SCALE = Math.min(CANVAS_WIDTH / floorPlanWidth, CANVAS_HEIGHT / floorPlanHeight);

  // Sync state with initialZones/initialFurniture when they change (e.g., after save/reload)
  useEffect(() => {
    console.log('Loading zones from props:', JSON.stringify(initialZones, null, 2));
    console.log('Loading furniture from props:', JSON.stringify(initialFurniture, null, 2));
    setZones(initialZones);
    setFurniture(initialFurniture);
    setHistory([{ zones: initialZones, furniture: initialFurniture }]);
    setHistoryIndex(0);
  }, [JSON.stringify(initialZones), JSON.stringify(initialFurniture)]);

  // Handle responsive canvas sizing
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;

        // On mobile, use viewport dimensions if container is too small
        const isMobile = window.innerWidth < 768;
        const availableWidth = containerWidth > 0 ? containerWidth : window.innerWidth;
        const availableHeight = containerHeight > 0 ? containerHeight : window.innerHeight * 0.6;

        // Reserve space for padding
        const padding = isMobile ? 16 : 32;
        const maxWidth = Math.min(availableWidth - padding, isMobile ? 500 : 800);
        const maxHeight = Math.min(availableHeight - padding, isMobile ? 400 : 600);

        // Maintain aspect ratio based on floor plan
        const aspectRatio = floorPlanWidth / floorPlanHeight;
        let newWidth = maxWidth;
        let newHeight = newWidth / aspectRatio;

        if (newHeight > maxHeight) {
          newHeight = maxHeight;
          newWidth = newHeight * aspectRatio;
        }

        // Ensure minimum size
        newWidth = Math.max(newWidth, isMobile ? 280 : 400);
        newHeight = Math.max(newHeight, isMobile ? 200 : 300);

        setCanvasSize({ width: newWidth, height: newHeight });
      }
    };

    // Initial update with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(updateCanvasSize, 100);

    const resizeObserver = containerRef.current
      ? new ResizeObserver(updateCanvasSize)
      : null;

    if (containerRef.current && resizeObserver) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateCanvasSize);

    return () => {
      clearTimeout(timeoutId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [floorPlanWidth, floorPlanHeight]);

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

  // Update canvas dimensions when size changes
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.setDimensions({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, canvasSize, CANVAS_WIDTH, CANVAS_HEIGHT]);

  // Draw grid
  useEffect(() => {
    if (!fabricCanvas) return;

    try {
      const isMobile = window.innerWidth < 768;

      // Calculate grid spacing based on floor plan dimensions
      // This ensures correct number of divisions (e.g., 10m floor with 1m grid = 10 boxes)
      const gridSpacing = gridSize * SCALE;

      const ctx = fabricCanvas.getContext();

      if (!ctx) return;

      const renderGrid = () => {
        ctx.save();

        // Make grid more visible based on spacing size
        // Smaller grids get thicker lines for visibility
        if (gridSpacing < 20) {
          ctx.strokeStyle = '#c0c0c0'; // Darker for small grids
          ctx.lineWidth = isMobile ? 1 : 1.5;
        } else if (gridSpacing < 40) {
          ctx.strokeStyle = '#d0d0d0';
          ctx.lineWidth = isMobile ? 0.75 : 1;
        } else {
          ctx.strokeStyle = '#e0e0e0';
          ctx.lineWidth = isMobile ? 0.5 : 0.75;
        }

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

        ctx.restore();
      };

      fabricCanvas.on('after:render', renderGrid);

      fabricCanvas.renderAll();

      return () => {
        fabricCanvas.off('after:render', renderGrid);
      };
    } catch (error) {
      console.error('Error setting up grid:', error);
    }
  }, [fabricCanvas, gridSize, CANVAS_WIDTH, CANVAS_HEIGHT, SCALE]);

  // Load and display background image
  useEffect(() => {
    if (!fabricCanvas || !imageUrl) return;

    // Remove existing background image if any
    if (backgroundImageRef.current) {
      fabricCanvas.remove(backgroundImageRef.current);
      backgroundImageRef.current = null;
    }

    // Load the new background image
    FabricImage.fromURL(imageUrl, {
      crossOrigin: 'anonymous',
    })
      .then((img) => {
        if (!fabricCanvas || !img) return;

        // Scale the image to fit the canvas while maintaining aspect ratio
        const imgAspectRatio = (img.width || 1) / (img.height || 1);
        const canvasAspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

        let scale;
        if (imgAspectRatio > canvasAspectRatio) {
          // Image is wider than canvas
          scale = CANVAS_WIDTH / (img.width || 1);
        } else {
          // Image is taller than canvas
          scale = CANVAS_HEIGHT / (img.height || 1);
        }

        img.set({
          scaleX: scale,
          scaleY: scale,
          left: 0,
          top: 0,
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
        bed: '#ef4444',
        chair: '#f59e0b',
        table: '#84cc16',
        sofa: '#06b6d4',
        desk: '#8b5cf6',
        toilet: '#ec4899',
        sink: '#14b8a6',
        door: '#6b7280',
      };

      if (!existingFurniture) {
        // Create new furniture with exact coordinates
        const furnitureObj = new Rect({
          left: item.x * SCALE,
          top: item.y * SCALE,
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

        // Extract new position, dimensions, and rotation
        const updatedFurniture = furniture.map(item =>
          item.id === furnitureId
            ? {
                ...item,
                x: (target.left || 0) / SCALE,
                y: (target.top || 0) / SCALE,
                width: ((target.width || 0) * (target.scaleX || 1)) / SCALE,
                height: ((target.height || 0) * (target.scaleY || 1)) / SCALE,
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

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative">
        {/* Furniture Palette - Mobile: Overlay / Desktop: Sidebar */}
        <div className={`${showFurniturePalette ? 'fixed inset-x-0 bottom-0 z-20 lg:relative lg:inset-auto' : 'hidden'} lg:block bg-background lg:bg-transparent`}>
          <div className="lg:w-auto max-h-[60vh] lg:max-h-full overflow-y-auto lg:overflow-visible">
            <FurniturePalette
              selectedType={selectedFurnitureType}
              onSelectType={(type) => {
                setSelectedFurnitureType(type);
                setActiveTool("furniture");
                setShowFurniturePalette(false); // Auto-close on mobile after selection
              }}
              isActive={activeTool === "furniture"}
            />
          </div>
        </div>

        {/* Canvas Area */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-auto"
          style={{ minHeight: '400px' }}
        >
          <div className="border rounded-lg shadow-lg overflow-hidden touch-none">
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Properties Panel - Mobile: Overlay / Desktop: Sidebar */}
        <div className={`${showPropertiesPanel ? 'fixed inset-x-0 bottom-0 z-20 lg:relative lg:inset-auto' : 'hidden'} lg:block bg-background lg:bg-transparent`}>
          <div className="lg:w-auto max-h-[60vh] lg:max-h-full overflow-y-auto lg:overflow-visible">
            <ZonePropertiesPanel
              zones={zones}
              selectedZoneId={selectedZoneId}
              onZoneSelect={setSelectedZoneId}
              onZoneUpdate={handleZoneUpdate}
              onZoneDelete={handleZoneDelete}
            />
          </div>
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {(showFurniturePalette || showPropertiesPanel) && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-10"
          onClick={() => {
            setShowFurniturePalette(false);
            setShowPropertiesPanel(false);
          }}
        />
      )}

      {/* Mobile Panel Toggles */}
      <div className="lg:hidden fixed bottom-4 right-4 flex flex-col gap-2 z-30">
        <button
          onClick={() => {
            setShowFurniturePalette(!showFurniturePalette);
            setShowPropertiesPanel(false);
          }}
          className={`${showFurniturePalette ? 'bg-primary' : 'bg-secondary'} text-primary-foreground rounded-full p-3 shadow-lg hover:opacity-90 transition-all`}
          title="Toggle Furniture Palette"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        </button>
        <button
          onClick={() => {
            setShowPropertiesPanel(!showPropertiesPanel);
            setShowFurniturePalette(false);
          }}
          className={`${showPropertiesPanel ? 'bg-primary' : 'bg-secondary'} text-primary-foreground rounded-full p-3 shadow-lg hover:opacity-90 transition-all`}
          title="Toggle Properties Panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m7-7h-6m-6 0H1"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
