-- Add DELETE policy for device_pairing_requests
-- This allows users to delete pairing requests for elderly persons they have access to

CREATE POLICY "Users can delete pairing requests for accessible elderly persons"
  ON public.device_pairing_requests
  FOR DELETE
  USING (can_access_elderly_person(auth.uid(), elderly_person_id));
