import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import ElderlyList from "@/components/dashboard/ElderlyList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Map } from "lucide-react";
import { FloorPlanForm } from "@/components/floor-plan/FloorPlanForm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Footer } from "@/components/Footer";

export default function FloorPlanManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFloorPlan, setEditingFloorPlan] = useState<any>(null);
  const [deletingFloorPlanId, setDeletingFloorPlanId] = useState<string | null>(null);

  const { data: elderlyPersons } = useQuery({
    queryKey: ['accessible-elderly-persons', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_accessible_elderly_persons', {
        _user_id: user?.id,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Automatically select the first person if there's only one
  useEffect(() => {
    if (elderlyPersons && elderlyPersons.length === 1 && !selectedPersonId) {
      setSelectedPersonId(elderlyPersons[0].id);
    }
  }, [elderlyPersons, selectedPersonId]);

  const { data: floorPlans, isLoading } = useQuery({
    queryKey: ['floor-plans', selectedPersonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floor_plans')
        .select('*')
        .eq('elderly_person_id', selectedPersonId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPersonId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (floorPlanId: string) => {
      const { error } = await supabase
        .from('floor_plans')
        .delete()
        .eq('id', floorPlanId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-plans'] });
      toast.success("Floor plan deleted successfully");
      setDeletingFloorPlanId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete floor plan");
    },
  });

  const handleEdit = (floorPlan: any) => {
    navigate(`/floor-plan-editor/${floorPlan.elderly_person_id}/${floorPlan.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Floor Plan Management</h1>
          <p className="text-muted-foreground">
            Create and manage floor plans for indoor tracking
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <ElderlyList
              elderlyPersons={elderlyPersons || []}
              selectedPersonId={selectedPersonId}
              onSelectPerson={setSelectedPersonId}
              variant="list"
            />
          </div>

          <div className="lg:col-span-3">
            {!selectedPersonId ? (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <p className="text-muted-foreground">
                    Select a person to view their floor plans
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold">Floor Plans</h2>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Floor Plan
                  </Button>
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                      <Card key={i}>
                        <CardHeader>
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-32 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : floorPlans && floorPlans.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {floorPlans.map((floorPlan) => (
                      <Card key={floorPlan.id}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Map className="h-5 w-5" />
                            {floorPlan.name}
                          </CardTitle>
                          <CardDescription>
                            {floorPlan.width}m × {floorPlan.height}m
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              Grid Size: {floorPlan.grid_size}m
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Zones: {Array.isArray(floorPlan.zones) ? floorPlan.zones.length : 0}
                            </p>
                            
                            <div className="flex gap-2 mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => handleEdit(floorPlan)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Zones
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingFloorPlan(floorPlan)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingFloorPlanId(floorPlan.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
                      <Map className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Add a Floor Plan
                      </p>
                      <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Floor Plan
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {selectedPersonId && (
        <>
          <FloorPlanForm
            open={showCreateDialog || !!editingFloorPlan}
            onOpenChange={(open) => {
              setShowCreateDialog(open);
              if (!open) setEditingFloorPlan(null);
            }}
            elderlyPersonId={selectedPersonId}
            floorPlan={editingFloorPlan}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['floor-plans'] });
              setShowCreateDialog(false);
              setEditingFloorPlan(null);
            }}
          />

          <AlertDialog open={!!deletingFloorPlanId} onOpenChange={() => setDeletingFloorPlanId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Floor Plan?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the floor plan and all its zones. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deletingFloorPlanId && deleteMutation.mutate(deletingFloorPlanId)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      <Footer />
    </div>
  );
}
