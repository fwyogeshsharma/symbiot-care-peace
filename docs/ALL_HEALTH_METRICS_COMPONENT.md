# "All health metrics" component — code & API reference

Reference for `AllHealthMetrics`, the dashboard card that lists every metric the sync can
record for a person (heart rate, steps, sleep, weight, …) as a grid of tiles with a
sparkline and a "not recorded" state. Use this doc if you want to reuse the same data and
logic somewhere else (a device detail page, a report, a caregiver view, etc).

Related: [`docs/HEALTH_CONNECT_FLOW.md`](./HEALTH_CONNECT_FLOW.md) covers how readings get
*into* `device_data` in the first place. This doc covers how the dashboard reads them back
out.

## Where it lives today

- Component: `src/components/dashboard/AllHealthMetrics.tsx`
- Mounted in: `src/pages/Dashboard.tsx:197` — `<AllHealthMetrics selectedPersonId={selectedPersonId} />`
- Only prop: `selectedPersonId: string | null` (the `elderly_persons.id` currently selected on the dashboard)

Unlike its neighbours (`VitalMetrics`, `HealthMetricsCharts`), it is **not** gated by
`isComponentEnabled('...')` / the Customize Dashboard toggle system in `Dashboard.tsx` —
it always renders once a person is selected. If you add it to a new page, decide
deliberately whether it needs a toggle id there too.

## The three API calls it makes

All three are independent `useQuery` calls (TanStack Query) and all three are scoped by
`selectedPersonId` — a `null` id short-circuits to empty/no-op rather than querying.

### 1. `supabase.rpc('device_metric_summary', { p_person_id, p_since })`

Exact per-metric rollup: one row per `data_type` with its reading count and latest value,
regardless of how much data exists. This is what the tiles' numbers and "N readings" badge
come from.

```ts
const { data, error } = await supabase.rpc('device_metric_summary', {
  p_person_id: selectedPersonId,
  p_since: since, // ISO timestamp, e.g. now - windowDays
});
```

Backing SQL function (`supabase/migrations/20260728140000_device_metric_summary.sql`):

```sql
CREATE OR REPLACE FUNCTION public.device_metric_summary(
  p_person_id uuid,
  p_since timestamptz
)
RETURNS TABLE (
  data_type text,
  reading_count bigint,
  latest_value jsonb,
  latest_unit text,
  latest_recorded_at timestamptz
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT DISTINCT ON (d.data_type)
    d.data_type,
    COUNT(*) OVER (PARTITION BY d.data_type) AS reading_count,
    d.value, d.unit, d.recorded_at
  FROM public.device_data d
  WHERE d.elderly_person_id = p_person_id
    AND d.recorded_at >= p_since
  ORDER BY d.data_type, d.recorded_at DESC;
$$;
```

`SECURITY INVOKER` means it runs under the caller's RLS on `device_data` — it can't expose
anything a direct `SELECT` couldn't. Granted to `authenticated`.

**Why a RPC instead of a plain `SELECT`:** the client also pulls raw rows (below) for
sparklines, capped at 4000 rows newest-first *across all metric types*. A once-a-minute
metric like heart rate can crowd a whole month of weight readings out of that cap, which
would make the card wrongly claim weight was "never recorded". The RPC is exact per type
because it's computed in Postgres, not from the capped client-side pull.

If the RPC is missing (migration not applied — Postgres error `42883` or PostgREST `PGRST202`),
the query resolves to `null` (not `[]`) and the component falls back to deriving counts/latest
from the raw rows instead — so an unmigrated environment degrades to "capped but present"
rather than "looks like zero data".

### 2. `supabase.from('device_data').select(...)`

Raw rows for the sparklines (recharts `LineChart`) and as the fallback source described above.

```ts
const { data, error } = await supabase
  .from('device_data')
  .select('data_type, value, unit, recorded_at')
  .eq('elderly_person_id', selectedPersonId)
  .gte('recorded_at', since)
  .order('recorded_at', { ascending: false })
  .limit(4000); // ROW_LIMIT in AllHealthMetrics.tsx
```

Table shape (`device_data`, from `src/integrations/supabase/types.ts`):

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | pk |
| `device_id` | uuid | fk → `devices.id` |
| `elderly_person_id` | uuid | fk → `elderly_persons.id` |
| `data_type` | text | e.g. `heart_rate`, `steps`, `blood_pressure` — see catalogue below |
| `value` | jsonb | shape depends on `data_type`, e.g. `{ bpm: 72 }`, `{ systolic: 120, diastolic: 80 }` |
| `unit` | text \| null | normalized unit string, e.g. `bpm`, `kg`, `%` |
| `recorded_at` | timestamptz | when the reading occurred (not when it was synced) |
| `created_at` | timestamptz | row insert time |

Indexes relevant to these queries (`supabase/migrations/20251007145703_...sql`,
`20260727130000_device_sync_schema.sql`):
- `idx_device_data_elderly_person (elderly_person_id, recorded_at DESC)`
- `idx_device_data_type (data_type, recorded_at DESC)`
- unique on `(device_id, data_type, recorded_at)` — the upsert key sync writes onto

RLS policies (`supabase/migrations/20251007145703_...sql:216-222`):
```sql
CREATE POLICY "Users can view device data for accessible elderly persons"
  ON public.device_data FOR SELECT
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Devices and authorized users can insert device data"
  ON public.device_data FOR INSERT
  WITH CHECK (public.can_access_elderly_person(auth.uid(), elderly_person_id));
```
So any reuse of this query automatically inherits "only rows for elderly persons this user
can access" — no extra filtering needed client-side beyond `elderly_person_id`.

### 3. `checkNativeHealthPermissions()`

```ts
import { checkNativeHealthPermissions } from '@/lib/capacitor/backgroundSync';

const { data: permissions } = useQuery({
  queryKey: ['health-connect-permissions'],
  staleTime: 60 * 1000,
  queryFn: () => checkNativeHealthPermissions(),
});
```

Calls the native Capacitor plugin `BackgroundSync.checkHealthPermissions()`
(`src/lib/capacitor/backgroundSync.ts:213`), which returns `null` on web (no Health Connect)
or a `HealthPermissionState`:

```ts
interface HealthPermissionState {
  granted: string[];   // e.g. ["android.permission.health.READ_STEPS", ...]
  all: string[];       // every permission the sync can use
  grantedCount: number;
  totalCount: number;
  backgroundRead: boolean;
}
```

Used only to distinguish, for a metric with zero readings, *"you haven't granted Health
Connect permission for this"* from *"your device just doesn't publish it"* — see `blocked`
below.

## The metric catalogue — `src/lib/healthMetrics.ts`

This is what makes the grid show a fixed, meaningful set of tiles instead of "whatever rows
happen to exist". Reuse this module as-is; it has no dependency on the component.

- `METRIC_REGISTRY: Record<string, MetricDescriptor>` — label, `valueKey` (which JSONB key
  holds the number), display unit, decimal precision, and `group` for ~30 known `data_type`s.
- `SYNCED_METRICS: string[]` — the 31 `data_type`s the Health Connect sync can ever write
  (30 record types, one of which — sleep — produces two: `sleep` and `sleep_stage`). This is
  the list the grid always shows, so an unrecorded metric renders as "Not recorded" rather
  than vanishing. Must stay in step with the `map()` cases in
  `android/app/src/main/java/com/symbiot/care/sync/HealthConnectReader.kt`.
- `METRIC_PERMISSIONS: Record<string, string>` — which Health Connect permission (28 distinct,
  for 31 metrics — a few permissions cover more than one metric) gates each `data_type`.
- `GROUP_LABELS` — display names for the six groups: `vitals`, `activity`, `body`, `sleep`,
  `environment`, `other`.
- `describeMetric(dataType)` — registry lookup with a humanized fallback (`oxygen_saturation`
  → "Oxygen saturation") for anything not in the registry (e.g. BLE peripherals or
  environment sensors that write into `device_data` outside the Health Connect catalogue).
- `metricNumber(dataType, value)` — pulls the chartable number out of the JSONB `value`,
  falling back to the first numeric field so an unregistered metric still plots.
- `formatMetricValue(dataType, value)` — display string; special-cases `blood_pressure`
  (`"120/80"`) and `sleep_stage` (`"REM · 45m"`) since those don't collapse to one number.

## Component internals (`AllHealthMetrics.tsx`)

- **Window control**: `windowDays` state, one of `1 | 7 | 30` (`WINDOW_OPTIONS`), drives
  `since = now - windowDays*24h` and is part of both query keys.
- **Hide-empty toggle**: `hideEmpty` state filters out metrics with `count === 0` client-side
  (does not re-query).
- **Merge step** (the `useMemo` that builds `grouped`): for every `data_type` in
  `SYNCED_METRICS` plus any extra type found in the rollup or raw rows but not in the
  catalogue, build a `MetricSummary` combining:
  - `latest`/`count` from the RPC rollup when available, else derived from the raw rows
    (`fromRows`) — so an unmigrated backend still shows *something*, just capped;
  - `series`: raw rows for that type, reversed to oldest→newest, `{ t: epochMs, v: number }`
    points, for the sparkline;
  - `blocked`: true only when there's no data for that metric **and** its Health Connect
    permission is known and **not** in `permissions.granted` — i.e. "you declined this
    permission", distinct from "not recorded" (device doesn't measure it) or loading.
- **Sort/group**: metrics with data sort before empty ones (alphabetically within each
  bucket), then bucketed into the fixed group order `vitals → activity → sleep → body →
  environment → other`; only non-empty groups render.
- **Render**: one `<Card>` containing per-group `<h3>` + a responsive tile grid
  (1/2/3 columns). Each tile: label, latest formatted value + unit, reading-count `Badge`,
  a 40px-tall `recharts` `LineChart` sparkline (only shown when `series.length > 1`), and a
  relative timestamp (`date-fns formatDistanceToNow`) or a "Permission needed" / "Not
  recorded" caption.
- **Empty state**: if nothing is recorded and nothing is blocked, shows a "sync a device"
  prompt instead of 31 empty tiles; if anything is blocked, the full grid still renders so
  the user can see *why*.

## i18n

Translation keys live under `dashboard.allMetrics.*` in `src/i18n/locales/en.json:778` (and
the other locale files) — `title`, `description`, `empty`, `notRecorded`, `showAll`,
`hideEmpty`, `permissionNeeded`, `blockedCount`. Add the same keys to every locale file if
you copy the component to a new namespace, or reuse these keys as-is.

## Reusing this elsewhere — checklist

1. Import `AllHealthMetrics` directly if the target is just "the same card on another page"
   — it only needs `selectedPersonId`.
2. If you instead want a *variant* (different layout, subset of groups, a single metric's
   detail view, etc.), reuse `src/lib/healthMetrics.ts` untouched and re-implement the three
   queries above with the same `since`/`selectedPersonId` scoping. Do not hand-roll a new SQL
   rollup — call the existing `device_metric_summary` RPC.
3. Keep the **rollup-first, rows-as-fallback-and-sparkline** split. Don't try to derive exact
   counts from the capped raw-rows pull; that's the exact bug the RPC exists to avoid.
4. Keep `ROW_LIMIT` (4000) or something like it — a wearable can emit enough rows in a month
   to make an uncapped pull slow.
5. `checkNativeHealthPermissions()` returns `null` on web/desktop — treat that as "no
   permission info available", not "nothing granted"; the component only marks `blocked`
   when `permissions` is non-null.
6. If mounting on a page with a component-toggle system (Customize Dashboard), decide whether
   to wrap it in `isComponentEnabled('<id>')` — the original on `Dashboard.tsx` deliberately
   does not.

## File reference

| File | Role |
| --- | --- |
| `src/components/dashboard/AllHealthMetrics.tsx` | the component |
| `src/lib/healthMetrics.ts` | metric catalogue, formatting, grouping metadata |
| `src/pages/Dashboard.tsx:197` | current mount point |
| `supabase/migrations/20260728140000_device_metric_summary.sql` | the RPC |
| `supabase/migrations/20251007145703_9546fe6e-7125-4906-9f08-09198d1b1686.sql` | `device_data` table, indexes, RLS |
| `supabase/migrations/20260727130000_device_sync_schema.sql` | upsert unique index `(device_id, data_type, recorded_at)` |
| `src/integrations/supabase/types.ts` | generated `device_data` row type + RPC arg/return type |
| `src/integrations/supabase/client.ts` | Supabase client (project URL + anon key) used by every query above |
| `src/lib/capacitor/backgroundSync.ts` | `checkNativeHealthPermissions`, `HealthPermissionState` |
| `src/i18n/locales/en.json:778` | `dashboard.allMetrics.*` strings |
| `docs/HEALTH_CONNECT_FLOW.md` | how readings get into `device_data` before this component reads them |
