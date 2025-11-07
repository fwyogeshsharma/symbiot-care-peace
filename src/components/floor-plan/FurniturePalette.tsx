import { Button } from "@/components/ui/button";
import { Bed, Armchair, Coffee, Sofa, Lamp, Bath, Droplet, DoorOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface FurniturePaletteProps {
  selectedType: string | null;
  onSelectType: (type: 'bed' | 'chair' | 'table' | 'sofa' | 'desk' | 'toilet' | 'sink' | 'door') => void;
  isActive: boolean;
}

export function FurniturePalette({ selectedType, onSelectType, isActive }: FurniturePaletteProps) {
  const furnitureItems = [
    { type: 'bed' as const, icon: Bed, label: 'Bed', color: 'text-red-500' },
    { type: 'chair' as const, icon: Armchair, label: 'Chair', color: 'text-orange-500' },
    { type: 'table' as const, icon: Coffee, label: 'Table', color: 'text-lime-500' },
    { type: 'sofa' as const, icon: Sofa, label: 'Sofa', color: 'text-cyan-500' },
    { type: 'desk' as const, icon: Lamp, label: 'Desk', color: 'text-purple-500' },
    { type: 'toilet' as const, icon: Bath, label: 'Toilet', color: 'text-pink-500' },
    { type: 'sink' as const, icon: Droplet, label: 'Sink', color: 'text-teal-500' },
    { type: 'door' as const, icon: DoorOpen, label: 'Door', color: 'text-gray-500' },
  ];

  return (
    <div className="w-48 border-r bg-card flex flex-col">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm">Furniture</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Click to select, then click on canvas to place
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {furnitureItems.map((item) => (
            <Button
              key={item.type}
              variant={selectedType === item.type && isActive ? "default" : "ghost"}
              size="sm"
              className="w-full justify-start"
              onClick={() => onSelectType(item.type)}
            >
              <item.icon className={`h-4 w-4 mr-2 ${selectedType === item.type ? '' : item.color}`} />
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
        </div>
      </ScrollArea>

      <Separator />

      <div className="p-2">
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Tips:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Select to move/resize</li>
            <li>Rotate with corners</li>
            <li>Delete with delete tool</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
