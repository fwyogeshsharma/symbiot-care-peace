import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import { ZoneEditor } from "@/components/floor-plan/ZoneEditor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function FloorPlanEditor() {
  const { elderlyPersonId, floorPlanId } = useParams();
  const navigate = useNavigate();

  const { data: floorPlan, isLoading } = useQuery({
    queryKey: ['floor-plan', floorPlanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floor_plans')
        .select('*')
        .eq('id', floorPlanId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!floorPlanId,
  });

  const handleSave = async (zones: any[]) => {
    const { error } = await supabase
      .from('floor_plans')
      .update({ zones })
      .eq('id', floorPlanId);
    
    if (error) throw error;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="p-6">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  if (!floorPlan) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-6">
          <p>Floor plan not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex items-center gap-4 p-4 border-b">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/floor-plan-management')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{floorPlan.name}</h1>
          <p className="text-sm text-muted-foreground">
            {floorPlan.width}m × {floorPlan.height}m • Grid: {floorPlan.grid_size}m
          </p>
        </div>
      </div>

      <div className="flex-1">
        <ZoneEditor
          floorPlanWidth={floorPlan.width}
          floorPlanHeight={floorPlan.height}
          gridSize={floorPlan.grid_size}
          imageUrl={floorPlan.image_url}
          initialZones={Array.isArray(floorPlan.zones) ? floorPlan.zones as any : []}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
