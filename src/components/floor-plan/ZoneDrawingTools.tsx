import { Button } from "@/components/ui/button";
import { Square, Pentagon, MousePointer, Trash2, Undo2, Redo2, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export type DrawingTool = "select" | "rectangle" | "polygon" | "delete";

interface ZoneDrawingToolsProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSave: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
}

export function ZoneDrawingTools({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  onClear,
  onSave,
  canUndo,
  canRedo,
  isSaving,
}: ZoneDrawingToolsProps) {
  return (
    <div className="flex items-center gap-2 p-4 bg-card border-b">
      <div className="flex items-center gap-1">
        <Button
          variant={activeTool === "select" ? "default" : "outline"}
          size="sm"
          onClick={() => onToolChange("select")}
          title="Select and Move"
        >
          <MousePointer className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "rectangle" ? "default" : "outline"}
          size="sm"
          onClick={() => onToolChange("rectangle")}
          title="Draw Rectangle"
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "polygon" ? "default" : "outline"}
          size="sm"
          onClick={() => onToolChange("polygon")}
          title="Draw Polygon"
        >
          <Pentagon className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "delete" ? "destructive" : "outline"}
          size="sm"
          onClick={() => onToolChange("delete")}
          title="Delete Zone"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      <Button
        variant="outline"
        size="sm"
        onClick={onClear}
        title="Clear All Zones"
      >
        Clear All
      </Button>

      <div className="ml-auto">
        <Button
          onClick={onSave}
          disabled={isSaving}
          size="sm"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
