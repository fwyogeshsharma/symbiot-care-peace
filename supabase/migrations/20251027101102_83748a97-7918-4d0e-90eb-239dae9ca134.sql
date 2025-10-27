-- Add DELETE policy for relative_assignments
-- Allow users to delete relative assignments for their own elderly persons
CREATE POLICY "Users can delete relative assignments for their elderly persons"
ON public.relative_assignments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.elderly_persons
    WHERE elderly_persons.id = relative_assignments.elderly_person_id
      AND elderly_persons.user_id = auth.uid()
  )
);