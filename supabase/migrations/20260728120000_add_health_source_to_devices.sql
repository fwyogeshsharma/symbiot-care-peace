-- Bind each device to the Health Connect source that publishes its readings.
--
-- Health Connect is a single shared store, not a per-device feed. Before this column both
-- sync paths read the whole store and stamped every reading with whichever device happened
-- to be syncing, so with two devices paired the same readings landed twice under two
-- different device_ids — doubling every total built on device_data.
--
-- The only source attribution Health Connect exposes is Metadata.dataOrigin: the package
-- name of the app that wrote the record (com.huami.watch.hmwatchmanager for Zepp,
-- com.sec.android.app.shealth for Samsung Health, and so on). There is no serial number or
-- MAC — two watches publishing through the *same* app are genuinely indistinguishable, which
-- is what the uniqueness constraint below makes explicit rather than silently duplicating.


-- 1. The writing app's package name, as reported by Health Connect.
--
-- NULL means "not mapped yet": such a device is skipped by Health Connect sync entirely
-- rather than falling back to reading everything, which is the bug being fixed here.
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS health_source TEXT;

COMMENT ON COLUMN public.devices.health_source IS
  'Health Connect Metadata.dataOrigin (writing app package name) whose records belong to this device. NULL = unmapped, so Health Connect sync skips the device.';


-- 2. One source may feed only one device per care recipient.
--
-- Scoped to elderly_person_id, not global: two people each wearing an Amazfit on their own
-- phone both report com.huami.watch.hmwatchmanager, and those are legitimately separate
-- device rows. Within one person, though, a second device claiming the same source would
-- recreate exactly the double-counting this migration exists to stop, so it is rejected —
-- the user picks which device owns the source and the other syncs over BLE only.
CREATE UNIQUE INDEX IF NOT EXISTS devices_person_health_source_key
  ON public.devices (elderly_person_id, health_source)
  WHERE health_source IS NOT NULL;
