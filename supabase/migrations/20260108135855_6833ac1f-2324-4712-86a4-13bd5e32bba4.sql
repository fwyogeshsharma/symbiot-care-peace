-- Add policy to allow authenticated users to manage device types
CREATE POLICY "Authenticated users can manage device types"
ON public.device_types
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);