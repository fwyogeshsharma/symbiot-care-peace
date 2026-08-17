-- Add gait-speed and wheelchair-pushes normalization ranges to the default IRQ config.
--
-- irq-compute's computeActivityRoutine() now scores speed and wheelchair_pushes alongside
-- steps/distance/active_calories/floors_climbed/exercise_session — the same functional-mobility
-- signals the physical rehab progress score (_rehab_score_mobility) already uses. The edge
-- function falls back to sane inline defaults (speed_avg 0.3-2.0 m/s optimal 1.2,
-- wheelchair_pushes_daily 0-300 optimal 120) even without this row, but seeding it here keeps
-- the config table as the single source of truth an admin can tune later, consistent with every
-- other normalization range.

UPDATE public.irq_configurations
SET normalization_ranges = normalization_ranges || jsonb_build_object(
  'speed_avg', jsonb_build_object('min', 0.3, 'max', 2.0, 'optimal', 1.2),
  'wheelchair_pushes_daily', jsonb_build_object('min', 0, 'max', 300, 'optimal', 120)
),
updated_at = now()
WHERE is_global = true
  AND NOT (normalization_ranges ? 'speed_avg');
