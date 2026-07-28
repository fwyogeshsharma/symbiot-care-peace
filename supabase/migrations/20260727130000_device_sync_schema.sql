-- Schema prerequisites for foreground and background device sync.
--
-- Everything here is idempotent: parts of it may already be applied depending on
-- whether 20260726090000_add_ble_device_id_to_devices.sql was pushed, so this file is
-- safe to run against a database that has had some, none, or all of it already.
--
-- Existing shape this builds on (from 20251007145703_...):
--   devices(id uuid pk, elderly_person_id uuid not null, device_id text unique not null,
--           device_name, last_sync timestamptz, battery_level int, ...)
--     RLS: SELECT for accessible persons; "Authorized users can manage devices" FOR ALL
--          (so UPDATE of last_sync/battery_level is already permitted)
--   device_data(id uuid pk, device_id uuid not null -> devices(id), elderly_person_id uuid
--           not null, data_type text not null CHECK(...), value jsonb not null, unit text,
--           recorded_at timestamptz not null, created_at timestamptz not null)
--     RLS: SELECT + INSERT only
--     Indexes: (elderly_person_id, recorded_at DESC), (data_type, recorded_at DESC)
--   data_type CHECK last set by 20251219_add_environmental_data_types.sql and already
--   permits heart_rate, steps and oxygen_saturation, so sync needs no change there.


-- 1. Bluetooth address of the paired peripheral.
--
-- Learned once by scanning during a foreground sync and reused afterwards. The
-- background worker relies on it specifically: Android restricts background BLE
-- scanning, so a stored address is what lets the worker connect directly instead.
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS ble_device_id TEXT;

COMMENT ON COLUMN public.devices.ble_device_id IS
  'Platform BLE identifier (MAC on Android) of the paired peripheral, learned during a foreground scan.';


-- 2. Collapse duplicate readings recorded before the unique index existed.
--
-- Health Connect syncs re-read an overlapping window on purpose so a day's totals keep
-- matching the source app, which without a conflict target appended a fresh row every
-- time. Of each group keep the most recently written row: the source app revises an
-- interval's value after first publishing it, so the newest copy is the corrected one.
-- id breaks ties so the ordering is total and exactly one row per group survives.
DELETE FROM public.device_data d
USING public.device_data keep
WHERE d.device_id = keep.device_id
  AND d.data_type = keep.data_type
  AND d.recorded_at = keep.recorded_at
  AND (d.created_at, d.id) < (keep.created_at, keep.id);


-- 3. The conflict target the sync upserts against.
--
-- Both the web hook and the native worker send
--   on_conflict=device_id,data_type,recorded_at with Prefer: resolution=merge-duplicates,
-- and Postgres can only resolve ON CONFLICT against a real unique index — without this
-- every sync fails with 42P10 "no unique or exclusion constraint matching the ON CONFLICT
-- specification". All three columns are NOT NULL, so there is no NULL-distinctness gap.
--
-- Note: this builds under a lock that blocks writes to device_data. That is fine for a
-- modest table; on a very large one, run the CONCURRENTLY variant separately instead,
-- since CREATE INDEX CONCURRENTLY cannot run inside a migration's transaction.
CREATE UNIQUE INDEX IF NOT EXISTS device_data_device_type_recorded_at_key
  ON public.device_data (device_id, data_type, recorded_at);


-- 4. Allow the update half of the upsert.
--
-- device_data was created with SELECT and INSERT policies only. An
-- INSERT ... ON CONFLICT DO UPDATE additionally requires UPDATE permission on the row it
-- resolves onto, so with RLS on and no UPDATE policy every repeat reading would be
-- rejected the moment it actually conflicted — which is precisely the case the unique
-- index above creates. Scoped identically to the existing INSERT policy.
DROP POLICY IF EXISTS "Authorized users can update device data" ON public.device_data;

CREATE POLICY "Authorized users can update device data"
  ON public.device_data FOR UPDATE
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id))
  WITH CHECK (public.can_access_elderly_person(auth.uid(), elderly_person_id));
