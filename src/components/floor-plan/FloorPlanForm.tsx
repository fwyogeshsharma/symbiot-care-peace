import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { Upload, X } from "lucide-react";

const floorPlanSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  width: z.number().positive("Width must be positive").max(100, "Width must be less than 100m"),
  height: z.number().positive("Length must be positive").max(100, "Length must be less than 100m"),
  grid_size: z.number().positive("Grid size must be positive").max(5, "Grid size must be less than 5m"),
  image: z.union([z.instanceof(FileList), z.undefined()]).optional(),
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
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FloorPlanFormData>({
    resolver: zodResolver(floorPlanSchema),
    defaultValues: {
      name: "",
      width: 10,
      height: 10,
      grid_size: 1.0,
    },
  });

  // Reset form when dialog opens or floorPlan changes
  useEffect(() => {
    if (open) {
      form.reset({
        name: floorPlan?.name || "",
        width: floorPlan?.width || 10,
        height: floorPlan?.height || 10,
        grid_size: floorPlan?.grid_size || 1.0,
        image: undefined,
      });
      setSelectedFileName(null);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open, floorPlan, form]);

  const onSubmit = async (data: FloorPlanFormData) => {
    console.log('Form submitted with data:', data);
    setIsSubmitting(true);
    try {
      let imageUrl = floorPlan?.image_url;

      // Upload image if provided
      if (data.image && data.image instanceof FileList && data.image.length > 0) {
        const file = data.image[0];
        console.log('Uploading file:', file.name);
        const fileExt = file.name.split('.').pop();
        const fileName = `${elderlyPersonId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('floor-plan-images')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('floor-plan-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
        console.log('Image uploaded successfully:', imageUrl);
      } else {
        console.log('No image to upload');
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

      console.log('Saving floor plan data:', floorPlanData);

      if (floorPlan?.id) {
        const { error } = await supabase
          .from('floor_plans')
          .update(floorPlanData)
          .eq('id', floorPlan.id);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        toast.success("Floor plan updated successfully");
      } else {
        const { error } = await supabase
          .from('floor_plans')
          .insert(floorPlanData);

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        toast.success("Floor plan created successfully");
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Form submission error:', error);
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
          <form
            onSubmit={(e) => {
              console.log('Form submit event triggered');
              console.log('Form state:', form.formState);
              console.log('Form errors:', form.formState.errors);
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
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
                    <FormLabel>Length (meters)</FormLabel>
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
              render={({ field: { onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Background Image (Optional)</FormLabel>

                  {/* Show current image if editing */}
                  {floorPlan?.image_url && (
                    <div className="mb-3 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-2">Current Image:</p>
                      <div className="flex items-start gap-3">
                        {/* Image preview */}
                        <img
                          src={floorPlan.image_url}
                          alt="Floor plan preview"
                          className="w-20 h-20 object-cover rounded border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground break-all">
                            {floorPlan.image_url.split('/').pop()?.split('?')[0] || 'Image file'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Click Upload Photo below to replace this image
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <FormControl>
                    <div className="space-y-2">
                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            setSelectedFileName(files[0].name);
                            onChange(files);
                          } else {
                            setSelectedFileName(null);
                            onChange(undefined);
                          }
                        }}
                        name={field.name}
                        onBlur={field.onBlur}
                      />

                      {/* Upload Photo Button */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photo
                      </Button>

                      {/* Show selected file name */}
                      {selectedFileName && (
                        <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <p className="text-sm text-muted-foreground truncate">
                            {selectedFileName}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedFileName(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                              onChange(undefined);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                  {!floorPlan?.image_url && !selectedFileName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload an image to use as background for the floor plan
                    </p>
                  )}
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
