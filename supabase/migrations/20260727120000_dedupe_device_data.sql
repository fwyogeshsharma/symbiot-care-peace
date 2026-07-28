-- Health Connect syncs re-read an overlapping time range (so a day's totals always
-- match the source app, e.g. Zepp), which means the same reading can arrive more
-- than once. Collapse the duplicates that earlier syncs already inserted, then make
-- (device_id, data_type, recorded_at) unique so repeat syncs can upsert instead of
-- appending — a re-read of the same interval now corrects the value in place rather
-- than double counting it.

-- Of each duplicate group keep the most recently written row: the source app revises
-- an interval's value after first publishing it, so the newest copy is the corrected
-- one. id breaks ties so the comparison is total and exactly one row survives.
DELETE FROM public.device_data d
USING public.device_data keep
WHERE d.device_id = keep.device_id
  AND d.data_type = keep.data_type
  AND d.recorded_at = keep.recorded_at
  AND (d.created_at, d.id) < (keep.created_at, keep.id);

CREATE UNIQUE INDEX IF NOT EXISTS device_data_device_type_recorded_at_key
  ON public.device_data (device_id, data_type, recorded_at);
