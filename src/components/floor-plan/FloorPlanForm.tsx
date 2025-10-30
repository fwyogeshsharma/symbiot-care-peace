import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const floorPlanSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  width: z.number().positive("Width must be positive").max(100, "Width must be less than 100m"),
  height: z.number().positive("Height must be positive").max(100, "Height must be less than 100m"),
  grid_size: z.number().positive("Grid size must be positive").max(5, "Grid size must be less than 5m"),
  image: z.instanceof(FileList).optional(),
});

type FloorPlanFormData = z.infer<typeof floorPlanSchema>;

interface FloorPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elderlyPersonId: string;
  floorPlan?: {
    id: string;
    name: string;
    width: number;
    height: number;
    grid_size: number;
    image_url?: string;
  };
  onSuccess: () => void;
}

export function FloorPlanForm({ open, onOpenChange, elderlyPersonId, floorPlan, onSuccess }: FloorPlanFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FloorPlanFormData>({
    resolver: zodResolver(floorPlanSchema),
    defaultValues: {
      name: floorPlan?.name || "",
      width: floorPlan?.width || 10,
      height: floorPlan?.height || 10,
      grid_size: floorPlan?.grid_size || 1.0,
    },
  });

  const onSubmit = async (data: FloorPlanFormData) => {
    setIsSubmitting(true);
    try {
      let imageUrl = floorPlan?.image_url;

      // Upload image if provided
      if (data.image && data.image.length > 0) {
        const file = data.image[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${elderlyPersonId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('floor-plan-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('floor-plan-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const floorPlanData = {
        elderly_person_id: elderlyPersonId,
        name: data.name,
        width: data.width,
        height: data.height,
        grid_size: data.grid_size,
        image_url: imageUrl,
        zones: floorPlan?.id ? undefined : [],
      };

      if (floorPlan?.id) {
        const { error } = await supabase
          .from('floor_plans')
          .update(floorPlanData)
          .eq('id', floorPlan.id);

        if (error) throw error;
        toast.success("Floor plan updated successfully");
      } else {
        const { error } = await supabase
          .from('floor_plans')
          .insert(floorPlanData);

        if (error) throw error;
        toast.success("Floor plan created successfully");
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to save floor plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{floorPlan ? "Edit Floor Plan" : "Create Floor Plan"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Living Room Floor Plan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width (meters)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1"
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (meters)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1"
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="grid_size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grid Size (meters)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1"
                      {...field} 
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Background Image (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => onChange(e.target.files)}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : floorPlan ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
