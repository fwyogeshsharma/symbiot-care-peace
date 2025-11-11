import { Button } from "@/components/ui/button";
import { Square, MousePointer, Trash2, Undo2, Redo2, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export type DrawingTool = "select" | "rectangle" | "delete" | "furniture";

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
    <div className="flex flex-wrap items-center gap-2 p-2 sm:p-4 bg-card border-b">
      {/* Drawing Tools */}
      <div className="flex items-center gap-1">
        <Button
          variant={activeTool === "select" ? "default" : "outline"}
          size="sm"
          onClick={() => onToolChange("select")}
          title="Select and Move"
          className="px-2 sm:px-3"
        >
          <MousePointer className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline text-xs">Select</span>
        </Button>
        <Button
          variant={activeTool === "rectangle" ? "default" : "outline"}
          size="sm"
          onClick={() => onToolChange("rectangle")}
          title="Draw Rectangle"
          className="px-2 sm:px-3"
        >
          <Square className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline text-xs">Zone</span>
        </Button>
        <Button
          variant={activeTool === "delete" ? "destructive" : "outline"}
          size="sm"
          onClick={() => onToolChange("delete")}
          title="Delete Zone"
          className="px-2 sm:px-3"
        >
          <Trash2 className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline text-xs">Delete</span>
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8 hidden sm:block" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
          className="px-2 sm:px-3"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
          className="px-2 sm:px-3"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8 hidden sm:block" />

      {/* Clear Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onClear}
        title="Clear All Zones"
        className="px-2 sm:px-3"
      >
        <span className="text-xs">Clear</span>
      </Button>

      {/* Save Button */}
      <div className="ml-auto">
        <Button
          onClick={onSave}
          disabled={isSaving}
          size="sm"
          className="px-2 sm:px-3"
        >
          <Save className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{isSaving ? "Saving..." : "Save Changes"}</span>
          <span className="sm:hidden ml-1">{isSaving ? "..." : "Save"}</span>
        </Button>
      </div>
    </div>
  );
}
