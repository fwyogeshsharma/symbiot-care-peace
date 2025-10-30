import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Zone {
  id: string;
  name: string;
  color: string;
  coordinates: Array<{ x: number; y: number }>;
}

interface ZonePropertiesPanelProps {
  zones: Zone[];
  selectedZoneId: string | null;
  onZoneSelect: (zoneId: string) => void;
  onZoneUpdate: (zoneId: string, updates: Partial<Zone>) => void;
  onZoneDelete: (zoneId: string) => void;
}

export function ZonePropertiesPanel({
  zones,
  selectedZoneId,
  onZoneSelect,
  onZoneUpdate,
  onZoneDelete,
}: ZonePropertiesPanelProps) {
  const selectedZone = zones.find(z => z.id === selectedZoneId);

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Zones</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {zones.map((zone) => (
            <Card
              key={zone.id}
              className={`p-3 cursor-pointer transition-colors ${
                selectedZoneId === zone.id ? "border-primary" : ""
              }`}
              onClick={() => onZoneSelect(zone.id)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: zone.color }}
                />
                <span className="flex-1 text-sm font-medium">{zone.name}</span>
              </div>
            </Card>
          ))}
          
          {zones.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No zones yet. Use the drawing tools to create zones.
            </p>
          )}
        </div>
      </ScrollArea>

      {selectedZone && (
        <div className="p-4 border-t space-y-4">
          <h4 className="font-semibold text-sm">Zone Properties</h4>
          
          <div className="space-y-2">
            <Label htmlFor="zone-name">Name</Label>
            <Input
              id="zone-name"
              value={selectedZone.name}
              onChange={(e) => onZoneUpdate(selectedZone.id, { name: e.target.value })}
              placeholder="Zone name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zone-color">Color</Label>
            <div className="flex gap-2">
              <Input
                id="zone-color"
                type="color"
                value={selectedZone.color}
                onChange={(e) => onZoneUpdate(selectedZone.id, { color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                value={selectedZone.color}
                onChange={(e) => onZoneUpdate(selectedZone.id, { color: e.target.value })}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Coordinates</Label>
            <div className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
              {selectedZone.coordinates.map((coord, idx) => (
                <div key={idx}>
                  Point {idx + 1}: ({coord.x.toFixed(2)}, {coord.y.toFixed(2)})
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => onZoneDelete(selectedZone.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Zone
          </Button>
        </div>
      )}
    </div>
  );
}
