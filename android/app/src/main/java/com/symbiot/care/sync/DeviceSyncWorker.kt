package com.symbiot.care.sync

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Periodic background sync: pulls Health Connect (and, where an address is already known,
 * BLE) readings for every registered device and upserts them into Supabase.
 *
 * Runs without a WebView, so it duplicates the logic in src/hooks/useDeviceSync.ts rather
 * than calling into it. The two must stay in step — in particular the row shape and the
 * conflict target, since both write the same table.
 */
class DeviceSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val store = SyncStore(applicationContext)

        if (!store.isConfigured) {
            store.lastResult = "not_configured"
            return Result.success()
        }

        val devices = store.devices()
        if (devices.isEmpty()) {
            store.lastResult = "no_devices"
            store.lastRunAt = System.currentTimeMillis()
            return Result.success()
        }

        val rest = SupabaseRest(store)
        val healthConnect = HealthConnectReader(applicationContext)
        val ble = BleReader(applicationContext)

        val canReadHealthConnect = healthConnect.hasPermissions()
        var written = 0
        var failed = false

        for (device in devices) {
            try {
                written += syncDevice(device, store, rest, healthConnect, ble, canReadHealthConnect)
            } catch (e: SupabaseRest.AuthExpiredException) {
                // The session is gone. Retrying on a timer would just burn battery until
                // the user opens the app and re-authenticates.
                Log.w(TAG, "Supabase session expired; stopping background sync")
                store.lastResult = "auth_expired"
                store.lastRunAt = System.currentTimeMillis()
                return Result.success()
            } catch (e: Exception) {
                Log.e(TAG, "Sync failed for ${device.name}", e)
                failed = true
            }
        }

        store.lastRunAt = System.currentTimeMillis()
        store.lastResult = when {
            failed && written == 0 -> "failed"
            !canReadHealthConnect && written == 0 -> "missing_permissions"
            // Distinguishable from missing_permissions on purpose: permission is granted
            // but no device is bound to a source, so the sync is correctly reading nothing.
            devices.none { it.healthSource != null } && written == 0 -> "no_health_source"
            else -> "ok:$written"
        }

        // Retry only on total failure; a partial sync is picked up by the next run anyway
        // because the watermark is not advanced for devices that failed.
        return if (failed && written == 0) Result.retry() else Result.success()
    }

    private suspend fun syncDevice(
        device: SyncStore.Device,
        store: SyncStore,
        rest: SupabaseRest,
        healthConnect: HealthConnectReader,
        ble: BleReader,
        canReadHealthConnect: Boolean
    ): Int {
        val readAt = Instant.now()
        val rows = JSONArray()
        // Keyed by data_type|recorded_at: Postgres rejects an ON CONFLICT batch that
        // touches the same key twice, and resting heart rate shares the heart_rate type.
        val seen = HashMap<String, JSONObject>()

        // Only a device bound to a Health Connect source may claim records from the shared
        // store; an unmapped one syncs over BLE alone. Without this every paired device
        // would pull the same readings and store them under its own id.
        val readHealthConnect = canReadHealthConnect && device.healthSource != null

        if (readHealthConnect) {
            val since = readWindowStart(store, device.id)
            healthConnect.read(since, readAt, setOf(device.healthSource!!)).forEach { reading ->
                val recordedAt = ISO.format(Instant.ofEpochMilli(reading.timeMillis))
                seen["${reading.dataType}|$recordedAt"] =
                    row(device, reading.dataType, reading.value, reading.unit, recordedAt)
            }
        }

        var batteryLevel: Int? = null
        if (device.bleDeviceId != null && ble.isUsable()) {
            val reading = ble.read(device.bleDeviceId)
            batteryLevel = reading.batteryLevel
            if (reading.heartRate != null) {
                val recordedAt = ISO.format(readAt)
                seen["heart_rate|$recordedAt"] = row(
                    device,
                    "heart_rate",
                    JSONObject().put("bpm", reading.heartRate),
                    "bpm",
                    recordedAt
                )
            }
        }

        seen.values.forEach { rows.put(it) }

        val written = rest.upsertDeviceData(rows)
        if (written > 0 || batteryLevel != null) {
            rest.updateDeviceSync(device.id, ISO.format(readAt), batteryLevel)
        }

        // Advance only after the rows are safely stored, and only to the instant actually
        // read up to, so anything written mid-read is picked up next run instead of skipped.
        // Not advanced for an unmapped device: nothing was read, and moving the watermark
        // would skip that window once a source is finally assigned.
        if (readHealthConnect) {
            store.setWatermark(device.id, readAt.toEpochMilli())
        }
        return written
    }

    private fun row(
        device: SyncStore.Device,
        dataType: String,
        value: JSONObject,
        unit: String,
        recordedAt: String
    ) = JSONObject().apply {
        put("device_id", device.id)
        put("elderly_person_id", device.elderlyPersonId)
        put("data_type", dataType)
        put("value", value)
        put("unit", unit)
        put("recorded_at", recordedAt)
    }

    /**
     * Always covers the whole of today so today's step total matches the source app even
     * though it back-fills and revises interval records. Re-reading is safe because the
     * write is an upsert on (device_id, data_type, recorded_at).
     */
    private fun readWindowStart(store: SyncStore, deviceId: String): Instant {
        val stored = store.watermark(deviceId)
        val watermark = if (stored > 0) {
            Instant.ofEpochMilli(stored)
        } else {
            Instant.now().minusSeconds(24 * 60 * 60)
        }
        val startOfToday = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant()
        return if (watermark.isBefore(startOfToday)) watermark else startOfToday
    }

    companion object {
        private const val TAG = "DeviceSyncWorker"
        const val WORK_NAME = "symbiot-device-background-sync"
        private val ISO: DateTimeFormatter =
            DateTimeFormatter.ISO_INSTANT.withZone(ZoneId.of("UTC"))
    }
}
