-- Create storage bucket for floor plan images
INSERT INTO storage.buckets (id, name, public)
VALUES ('floor-plan-images', 'floor-plan-images', true);

-- RLS policies for floor plan images
CREATE POLICY "Authenticated users can upload floor plan images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'floor-plan-images'
);

CREATE POLICY "Anyone can view floor plan images"
ON storage.objects FOR SELECT
USING (bucket_id = 'floor-plan-images');

CREATE POLICY "Authenticated users can update floor plan images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'floor-plan-images');

CREATE POLICY "Authenticated users can delete floor plan images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'floor-plan-images');