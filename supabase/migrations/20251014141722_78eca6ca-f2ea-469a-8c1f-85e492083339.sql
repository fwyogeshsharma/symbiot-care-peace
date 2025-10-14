-- Allow users to create relative assignments for elderly persons they own
CREATE POLICY "Users can create relative assignments for their elderly persons"
ON public.relative_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.elderly_persons 
    WHERE id = relative_assignments.elderly_person_id 
    AND user_id = auth.uid()
  )
);