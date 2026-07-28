package com.symbiot.care.sync

import android.content.Context
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.BasalBodyTemperatureRecord
import androidx.health.connect.client.records.BasalMetabolicRateRecord
import androidx.health.connect.client.records.BloodGlucoseRecord
import androidx.health.connect.client.records.BloodPressureRecord
import androidx.health.connect.client.records.BodyFatRecord
import androidx.health.connect.client.records.BodyTemperatureRecord
import androidx.health.connect.client.records.BodyWaterMassRecord
import androidx.health.connect.client.records.BoneMassRecord
import androidx.health.connect.client.records.CyclingPedalingCadenceRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ElevationGainedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.FloorsClimbedRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.HeightRecord
import androidx.health.connect.client.records.HydrationRecord
import androidx.health.connect.client.records.LeanBodyMassRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.PowerRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.RespiratoryRateRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.SpeedRecord
import androidx.health.connect.client.records.StepsCadenceRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.WheelchairPushesRecord
import androidx.health.connect.client.records.metadata.DataOrigin
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import org.json.JSONObject
import java.time.Instant
import kotlin.reflect.KClass

/**
 * Reads the full Health Connect metric catalogue a wearable can publish.
 *
 * Each record becomes one device_data row: a data_type, the reading itself as a JSONB
 * value, and a unit. Units are normalised on the way out (kilocalories, metres, celsius,
 * kilograms) so a value never has to be interpreted against the writing app's preference.
 *
 * Health Connect is a single shared store, so every read is narrowed to the writing apps
 * that publish a given device's data (Metadata.dataOrigin). Reading unfiltered and
 * attributing the result to whichever device is being synced stores the same readings
 * under every paired device — see `read`.
 *
 * Deliberately excluded: the reproductive health records (menstruation, cervical mucus,
 * ovulation, sexual activity) and Nutrition. They are irrelevant to elderly care
 * monitoring and would demand extra sensitive-data permissions for no benefit.
 */
class HealthConnectReader(private val context: Context) {

    /** One reading, already shaped for device_data. */
    data class Reading(
        val dataType: String,
        val value: JSONObject,
        val unit: String,
        val timeMillis: Long
    )

    private val recordTypes: List<KClass<out Record>> = listOf(
        ActiveCaloriesBurnedRecord::class,
        BasalBodyTemperatureRecord::class,
        BasalMetabolicRateRecord::class,
        BloodGlucoseRecord::class,
        BloodPressureRecord::class,
        BodyFatRecord::class,
        BodyTemperatureRecord::class,
        BodyWaterMassRecord::class,
        BoneMassRecord::class,
        CyclingPedalingCadenceRecord::class,
        DistanceRecord::class,
        ElevationGainedRecord::class,
        ExerciseSessionRecord::class,
        FloorsClimbedRecord::class,
        HeartRateRecord::class,
        HeartRateVariabilityRmssdRecord::class,
        HeightRecord::class,
        HydrationRecord::class,
        LeanBodyMassRecord::class,
        OxygenSaturationRecord::class,
        PowerRecord::class,
        RespiratoryRateRecord::class,
        RestingHeartRateRecord::class,
        SleepSessionRecord::class,
        SpeedRecord::class,
        StepsCadenceRecord::class,
        StepsRecord::class,
        TotalCaloriesBurnedRecord::class,
        WeightRecord::class,
        WheelchairPushesRecord::class
    )

    /** Read permission for every type in [recordTypes] — the full catalogue the sync stores. */
    val readPermissions: Set<String> =
        recordTypes.map { HealthPermission.getReadPermission(it) }.toSet()

    /**
     * What to ask the user for, in one prompt.
     *
     * Includes background read so the periodic worker is usable without a second trip to
     * Health Connect. Requested as a single set because Health Connect shows one screen per
     * request and asking twice reads as the app nagging.
     */
    val requestablePermissions: Set<String> = readPermissions + PERMISSION_BACKGROUND_READ

    fun isAvailable(): Boolean =
        HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE

    private suspend fun granted(): Set<String> = try {
        HealthConnectClient.getOrCreate(context).permissionController.getGrantedPermissions()
    } catch (e: Exception) {
        Log.e(TAG, "Failed to read granted permissions", e)
        emptySet()
    }

    /**
     * True when at least one metric is readable. Deliberately not "all": the user grants
     * Health Connect permissions individually, and refusing to sync anything because one
     * of thirty types was declined would be worse than syncing what was allowed.
     */
    suspend fun hasPermissions(): Boolean {
        if (!isAvailable()) return false
        return granted().any { it in readPermissions }
    }

    suspend fun hasBackgroundPermission(): Boolean =
        granted().contains(PERMISSION_BACKGROUND_READ)

    /**
     * Which of the catalogue's read permissions the user actually allowed.
     *
     * Lets an empty sync be reported as "you declined sleep" rather than "the watch wrote
     * nothing" — a declined type is skipped silently on read, so the two look identical.
     */
    suspend fun grantedReadPermissions(): Set<String> {
        if (!isAvailable()) return emptySet()
        return granted().intersect(readPermissions)
    }

    /**
     * Readings written between [since] and [until] by the apps in [dataOrigins].
     *
     * [dataOrigins] holds the package names bound to one device. An empty set returns
     * nothing rather than everything: Health Connect reads an empty dataOriginFilter as
     * "all sources", and inheriting that is exactly how one watch's readings get stored
     * against another.
     */
    suspend fun read(since: Instant, until: Instant, dataOrigins: Set<String>): List<Reading> {
        if (!isAvailable()) return emptyList()
        if (dataOrigins.isEmpty()) {
            Log.w(TAG, "Read skipped: no data origin mapped for this device")
            return emptyList()
        }

        val client = HealthConnectClient.getOrCreate(context)
        val filter = TimeRangeFilter.between(since, until)
        val originFilter = dataOrigins.map { DataOrigin(it) }.toSet()
        val allowed = granted()
        val readings = mutableListOf<Reading>()

        for (type in recordTypes) {
            // Reading a type the user declined throws; skip rather than abort the batch.
            if (HealthPermission.getReadPermission(type) !in allowed) continue
            try {
                client.readRecords(
                    ReadRecordsRequest(type, filter, dataOriginFilter = originFilter)
                ).records.forEach { record -> readings += map(record) }
            } catch (e: Exception) {
                Log.w(TAG, "Skipping ${type.simpleName}: ${e.message}")
            }
        }

        return readings
    }

    /**
     * Package names that have written health data recently, with a record count each.
     *
     * Mirrors listHealthDataOrigins() in src/lib/capacitor/healthConnect.ts so the picker
     * and the worker agree on what a source is. This is the only device attribution Health
     * Connect exposes — there is no serial number, so two devices publishing through one
     * app are indistinguishable.
     */
    suspend fun dataOrigins(since: Instant, until: Instant): Map<String, Int> {
        if (!isAvailable()) return emptyMap()

        val client = HealthConnectClient.getOrCreate(context)
        val filter = TimeRangeFilter.between(since, until)
        val allowed = granted()
        val counts = mutableMapOf<String, Int>()

        for (type in recordTypes) {
            if (HealthPermission.getReadPermission(type) !in allowed) continue
            try {
                // Deliberately unfiltered — discovering the sources is the point.
                client.readRecords(ReadRecordsRequest(type, filter)).records.forEach { record ->
                    val origin = record.metadata.dataOrigin.packageName
                    if (origin.isNotEmpty()) counts[origin] = (counts[origin] ?: 0) + 1
                }
            } catch (e: Exception) {
                Log.w(TAG, "Skipping ${type.simpleName} during origin discovery: ${e.message}")
            }
        }

        return counts
    }

    private fun map(record: Record): List<Reading> = when (record) {
        is HeartRateRecord -> record.samples.map {
            Reading("heart_rate", json("bpm", it.beatsPerMinute), "bpm", it.time.toEpochMilli())
        }

        is RestingHeartRateRecord -> one(
            "resting_heart_rate", json("bpm", record.beatsPerMinute), "bpm", record.time
        )

        is HeartRateVariabilityRmssdRecord -> one(
            "heart_rate_variability",
            json("rmssd_ms", record.heartRateVariabilityMillis),
            "ms",
            record.time
        )

        is StepsRecord -> one("steps", json("count", record.count), "steps", record.endTime)

        is StepsCadenceRecord -> record.samples.map {
            Reading("steps_cadence", json("rpm", it.rate), "rpm", it.time.toEpochMilli())
        }

        is CyclingPedalingCadenceRecord -> record.samples.map {
            Reading(
                "cycling_pedaling_cadence",
                json("rpm", it.revolutionsPerMinute),
                "rpm",
                it.time.toEpochMilli()
            )
        }

        is OxygenSaturationRecord -> one(
            "oxygen_saturation", json("percentage", record.percentage.value), "%", record.time
        )

        is RespiratoryRateRecord -> one(
            "respiratory_rate",
            json("breaths_per_minute", record.rate),
            "breaths/min",
            record.time
        )

        is BloodGlucoseRecord -> one(
            "blood_glucose",
            JSONObject()
                .put("value", record.level.inMillimolesPerLiter)
                .put("unit", "mmol/L")
                .put("meal_type", record.mealType)
                .put("specimen_source", record.specimenSource)
                .put("relation_to_meal", record.relationToMeal),
            "mmol/L",
            record.time
        )

        is BloodPressureRecord -> one(
            "blood_pressure",
            JSONObject()
                .put("systolic", record.systolic.inMillimetersOfMercury)
                .put("diastolic", record.diastolic.inMillimetersOfMercury)
                .put("body_position", record.bodyPosition)
                .put("measurement_location", record.measurementLocation),
            "mmHg",
            record.time
        )

        is BodyTemperatureRecord -> one(
            "body_temperature", json("celsius", record.temperature.inCelsius), "°C", record.time
        )

        is BasalBodyTemperatureRecord -> one(
            "basal_body_temperature",
            json("celsius", record.temperature.inCelsius),
            "°C",
            record.time
        )

        is BasalMetabolicRateRecord -> one(
            "basal_metabolic_rate",
            json("kcal_per_day", record.basalMetabolicRate.inKilocaloriesPerDay),
            "kcal/day",
            record.time
        )

        is BodyFatRecord -> one(
            "body_fat", json("percentage", record.percentage.value), "%", record.time
        )

        is WeightRecord -> one("weight", json("kg", record.weight.inKilograms), "kg", record.time)

        is LeanBodyMassRecord -> one(
            "lean_body_mass", json("kg", record.mass.inKilograms), "kg", record.time
        )

        is BoneMassRecord -> one("bone_mass", json("kg", record.mass.inKilograms), "kg", record.time)

        is BodyWaterMassRecord -> one(
            "body_water_mass", json("kg", record.mass.inKilograms), "kg", record.time
        )

        is HeightRecord -> one("height", json("meters", record.height.inMeters), "m", record.time)

        is ActiveCaloriesBurnedRecord -> one(
            "active_calories", json("kcal", record.energy.inKilocalories), "kcal", record.endTime
        )

        is TotalCaloriesBurnedRecord -> one(
            "total_calories", json("kcal", record.energy.inKilocalories), "kcal", record.endTime
        )

        is DistanceRecord -> one(
            "distance", json("meters", record.distance.inMeters), "m", record.endTime
        )

        is ElevationGainedRecord -> one(
            "elevation_gained", json("meters", record.elevation.inMeters), "m", record.endTime
        )

        is FloorsClimbedRecord -> one(
            "floors_climbed", json("floors", record.floors), "floors", record.endTime
        )

        is HydrationRecord -> one(
            "hydration", json("liters", record.volume.inLiters), "L", record.endTime
        )

        is WheelchairPushesRecord -> one(
            "wheelchair_pushes", json("count", record.count), "pushes", record.endTime
        )

        is SpeedRecord -> record.samples.map {
            Reading(
                "speed",
                json("meters_per_second", it.speed.inMetersPerSecond),
                "m/s",
                it.time.toEpochMilli()
            )
        }

        is PowerRecord -> record.samples.map {
            Reading("power", json("watts", it.power.inWatts), "W", it.time.toEpochMilli())
        }

        is ExerciseSessionRecord -> one(
            "exercise_session",
            JSONObject()
                .put("exercise_type", record.exerciseType)
                .put("title", record.title ?: JSONObject.NULL)
                .put("duration_minutes", minutesBetween(record.startTime, record.endTime)),
            "minutes",
            record.endTime
        )

        // A session becomes one summary row plus a row per stage, so a caller can chart
        // total sleep without unpacking stages, or break it down when it wants to.
        is SleepSessionRecord -> buildList {
            add(
                Reading(
                    "sleep",
                    JSONObject()
                        .put("duration_minutes", minutesBetween(record.startTime, record.endTime))
                        .put("start", record.startTime.toString())
                        .put("end", record.endTime.toString())
                        .put("title", record.title ?: JSONObject.NULL),
                    "minutes",
                    record.endTime.toEpochMilli()
                )
            )
            record.stages.forEach { stage ->
                add(
                    Reading(
                        "sleep_stage",
                        JSONObject()
                            .put("stage", sleepStageName(stage.stage))
                            .put("duration_minutes", minutesBetween(stage.startTime, stage.endTime)),
                        "minutes",
                        stage.endTime.toEpochMilli()
                    )
                )
            }
        }

        else -> emptyList()
    }

    private fun one(dataType: String, value: JSONObject, unit: String, time: Instant) =
        listOf(Reading(dataType, value, unit, time.toEpochMilli()))

    private fun json(key: String, value: Any) = JSONObject().put(key, value)

    private fun minutesBetween(start: Instant, end: Instant) =
        java.time.Duration.between(start, end).toMinutes()

    private fun sleepStageName(stage: Int): String = when (stage) {
        SleepSessionRecord.STAGE_TYPE_AWAKE -> "awake"
        SleepSessionRecord.STAGE_TYPE_AWAKE_IN_BED -> "awake_in_bed"
        SleepSessionRecord.STAGE_TYPE_OUT_OF_BED -> "out_of_bed"
        SleepSessionRecord.STAGE_TYPE_LIGHT -> "light"
        SleepSessionRecord.STAGE_TYPE_DEEP -> "deep"
        SleepSessionRecord.STAGE_TYPE_REM -> "rem"
        SleepSessionRecord.STAGE_TYPE_SLEEPING -> "sleeping"
        else -> "unknown"
    }

    companion object {
        private const val TAG = "HealthConnectReader"
        const val PERMISSION_BACKGROUND_READ =
            "android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND"
    }
}
