# ILQ Historical Calculation Guide

## Overview

The ILQ Compute function now supports calculating historical ILQ scores for all past data. This feature allows you to backfill ILQ scores for elderly persons who have months or even years of historical health data.

## How It Works

### Regular ILQ Calculation
When you click "Compute ILQ" in the ILQ Analytics page, it calculates the ILQ score for the **last 24 hours** of data.

### Historical ILQ Calculation
When you click "Calculate Historical", the system:
1. **Fetches all device data** for the selected person (no time limit)
2. **Groups data by day** (creates daily snapshots)
3. **Calculates ILQ score for each day** using that day's health data
4. **Stores all scores** in the `ilq_scores` table
5. **Skips days that already have scores** (unless force recompute is enabled)

## Features

### Intelligent Deduplication
- The system automatically checks for existing scores
- Only calculates scores for days that don't already have them
- This prevents duplicate calculations and saves processing time

### Daily Granularity
- Each historical score represents a full day of health data
- Timestamp is set to end of day (23:59:59 UTC)
- This allows for clean daily trends in charts

### Batch Processing
- Scores are inserted in batches of 100
- This handles large datasets efficiently (even years of data)
- Failed batches don't stop the entire process

### Component Scores
Each historical score includes all 6 components:
- Health Vitals (30%)
- Physical Activity (25%)
- Cognitive Function (15%)
- Environmental Safety (15%)
- Emergency Response (10%)
- Social Engagement (5%)

## How to Use

### From ILQ Analytics Page

1. **Select a Person**
   - Choose the elderly person from the dropdown

2. **Click "Calculate Historical"**
   - Button is located in the top action bar
   - Only available when a person is selected

3. **Wait for Completion**
   - You'll see a loading toast notification
   - Process may take a few seconds for years of data

4. **View Results**
   - Success message shows how many scores were calculated
   - Chart automatically refreshes to show all historical data
   - Select "All Available Data" from the time range dropdown to see everything

### Programmatic Usage

You can also trigger historical calculation via the API:

```typescript
const { data, error } = await supabase.functions.invoke('ilq-compute', {
  body: {
    elderly_person_id: 'uuid-here',
    calculate_historical: true,
    force_recompute: false,  // Set to true to recalculate existing scores
  },
});
```

## Response Format

The API returns:

```json
{
  "success": true,
  "message": "Historical ILQ scores calculated",
  "scores_calculated": 365,
  "scores_inserted": 365,
  "date_range": {
    "from": "2024-01-01",
    "to": "2024-12-24"
  },
  "total_data_points": 8760
}
```

## Use Cases

### 1. **New User Onboarding**
When a new elderly person is added to the system and they already have historical health data:
- Import their device data
- Run historical calculation
- Instantly view trends over months or years

### 2. **System Migration**
When migrating from another system:
- Import all historical health records
- Calculate historical ILQ scores
- Maintain continuity of care analytics

### 3. **Backfilling Gaps**
If the automatic ILQ calculation was disabled or missed some days:
- Run historical calculation
- Fill in missing scores
- Get complete trend data

### 4. **Recalculating with New Weights**
If ILQ configuration weights are updated:
- Run historical calculation with `force_recompute: true`
- All scores are recalculated with new weights
- Allows for refined analysis

## Performance Considerations

### Data Volume
- **Small dataset (< 1 month):** ~1-2 seconds
- **Medium dataset (1-6 months):** ~5-10 seconds
- **Large dataset (1+ year):** ~15-30 seconds
- **Very large dataset (5+ years):** ~1-2 minutes

### Optimization Tips
1. Run during off-peak hours for very large datasets
2. Use `force_recompute: false` to skip existing scores
3. Monitor Supabase function logs for any errors
4. Consider running for one person at a time

## Data Requirements

For accurate historical scores, ensure you have:
- ✅ Device data (heart_rate, steps, etc.)
- ✅ Medication adherence logs (for cognitive scores)
- ✅ Environmental sensor data (if available)
- ✅ Activity tracking data (if available)

**Minimum Requirements:**
- At least a few data points per day
- Data from at least one of: heart_rate, steps, or medication logs

## Viewing Historical Data

### In ILQ Analytics
1. Select "All Available Data" from the time range dropdown
2. The chart will show all historical scores
3. Zoom in/out by changing the time range

### In Reports
1. Go to Reports page
2. Select "All Time" filter
3. Generate ILQ Score Trends report
4. Export as PDF for long-term records

## Technical Details

### Database Schema
Historical scores are stored in the `ilq_scores` table:
```sql
CREATE TABLE ilq_scores (
  id uuid PRIMARY KEY,
  elderly_person_id uuid REFERENCES elderly_persons(id),
  score numeric(5,2),
  health_vitals_score numeric(5,2),
  physical_activity_score numeric(5,2),
  cognitive_function_score numeric(5,2),
  environmental_safety_score numeric(5,2),
  emergency_response_score numeric(5,2),
  social_engagement_score numeric(5,2),
  data_points_analyzed integer,
  time_window_hours integer,
  confidence_level numeric(3,2),
  detailed_metrics jsonb,
  computation_timestamp timestamptz DEFAULT now()
);
```

### Function Location
`supabase/functions/ilq-compute/index.ts`

Key function: `calculateHistoricalScores()`

## Troubleshooting

### "No historical data found"
**Cause:** No device data exists for this person
**Solution:** Import or add health data first

### "Scores not showing in chart"
**Cause:** Time range filter is too narrow
**Solution:** Select "All Available Data" or wider date range

### Partial insertion (e.g., "50 of 100 inserted")
**Cause:** Some days may have had errors or conflicts
**Solution:** Check Supabase function logs for details

### Slow performance
**Cause:** Very large dataset
**Solution:** This is normal for years of data; be patient

## Best Practices

1. **Run Once Per Person**
   - Historical calculation only needs to run once
   - New scores will be calculated automatically going forward

2. **Verify Data Quality**
   - Check that imported data has correct timestamps
   - Ensure data types match expected formats

3. **Monitor Results**
   - Review success message for any discrepancies
   - Spot-check a few dates in the chart

4. **Keep Records**
   - Export historical reports after calculation
   - Maintain audit trail of when calculations were run

## FAQ

**Q: Will this overwrite existing scores?**
A: No, unless you set `force_recompute: true`

**Q: How often should I run this?**
A: Only once when setting up historical data. Daily scores are calculated automatically.

**Q: Can I calculate for multiple people at once?**
A: Not currently. Run separately for each person.

**Q: Does this affect real-time calculations?**
A: No, real-time ILQ calculations continue independently.

**Q: What if I have gaps in my data?**
A: Days without data will be skipped. The chart will show points for available days only.

---

## Summary

The Historical ILQ Calculation feature enables comprehensive long-term analysis by:
- ✅ Processing all past health data
- ✅ Calculating daily ILQ scores for entire history
- ✅ Storing results permanently in database
- ✅ Enabling "All Available Data" visualizations
- ✅ Supporting data migration and backfilling scenarios

This ensures that elderly persons with years of health data can have complete ILQ trend analysis from day one!
