-- Drop the existing "Authorized users can manage devices" policy
DROP POLICY IF EXISTS "Authorized users can manage devices" ON public.devices;

-- Create separate, more specific policies for devices

-- Policy for INSERT: Users can insert devices for elderly persons they have access to
CREATE POLICY "Users can insert devices for accessible elderly persons"
ON public.devices
FOR INSERT
WITH CHECK (
  -- Admins can insert for anyone
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR
  -- Users can insert for elderly persons they own
  EXISTS (
    SELECT 1 FROM public.elderly_persons
    WHERE elderly_persons.id = devices.elderly_person_id
    AND elderly_persons.user_id = auth.uid()
  )
  OR
  -- Caregivers can insert for assigned elderly persons
  EXISTS (
    SELECT 1 FROM public.caregiver_assignments
    WHERE caregiver_assignments.elderly_person_id = devices.elderly_person_id
    AND caregiver_assignments.caregiver_user_id = auth.uid()
  )
  OR
  -- Relatives can insert for assigned elderly persons
  EXISTS (
    SELECT 1 FROM public.relative_assignments
    WHERE relative_assignments.elderly_person_id = devices.elderly_person_id
    AND relative_assignments.relative_user_id = auth.uid()
  )
);

-- Policy for UPDATE: Users can update devices for accessible elderly persons
CREATE POLICY "Users can update devices for accessible elderly persons"
ON public.devices
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.can_access_elderly_person(auth.uid(), elderly_person_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.can_access_elderly_person(auth.uid(), elderly_person_id)
);

-- Policy for DELETE: Users can delete devices for accessible elderly persons
CREATE POLICY "Users can delete devices for accessible elderly persons"
ON public.devices
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.can_access_elderly_person(auth.uid(), elderly_person_id)
);