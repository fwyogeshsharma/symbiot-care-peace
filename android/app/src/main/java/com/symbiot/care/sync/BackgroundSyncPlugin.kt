package com.symbiot.care.sync

import androidx.activity.result.ActivityResult
import androidx.health.connect.client.PermissionController
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.concurrent.TimeUnit

/**
 * Bridges the periodic device sync to JavaScript.
 *
 * The web layer owns authentication and knows which devices belong to the selected
 * person, so it hands both to the native side; from then on WorkManager runs the sync
 * with no WebView involved.
 */
@CapacitorPlugin(name = "BackgroundSync")
class BackgroundSyncPlugin : Plugin() {

    private val store by lazy { SyncStore(context) }

    /**
     * Stores the Supabase session and the device list the worker should sync.
     * Must be called again whenever the session refreshes or the device list changes,
     * otherwise the worker keeps syncing a stale set.
     */
    @PluginMethod
    fun configure(call: PluginCall) {
        val url = call.getString("supabaseUrl")
        val anonKey = call.getString("anonKey")
        val accessToken = call.getString("accessToken")

        if (url.isNullOrEmpty() || anonKey.isNullOrEmpty() || accessToken.isNullOrEmpty()) {
            call.reject("supabaseUrl, anonKey and accessToken are required")
            return
        }

        store.supabaseUrl = url.trimEnd('/')
        store.anonKey = anonKey
        store.accessToken = accessToken
        call.getString("refreshToken")?.let { store.refreshToken = it }

        val devices = call.getArray("devices")
        if (devices != null) {
            val parsed = mutableListOf<SyncStore.Device>()
            for (i in 0 until devices.length()) {
                val item = devices.getJSONObject(i)
                val id = item.optString("id")
                val personId = item.optString("elderly_person_id")
                if (id.isEmpty() || personId.isEmpty()) continue
                parsed += SyncStore.Device(
                    id = id,
                    elderlyPersonId = personId,
                    name = item.optString("device_name"),
                    bleDeviceId = if (item.isNull("ble_device_id")) {
                        null
                    } else {
                        item.optString("ble_device_id").takeIf { it.isNotEmpty() }
                    },
                    healthSource = if (item.isNull("health_source")) {
                        null
                    } else {
                        item.optString("health_source").takeIf { it.isNotEmpty() }
                    }
                )
            }
            store.saveDevices(parsed)
        }

        call.resolve()
    }

    @PluginMethod
    fun enable(call: PluginCall) {
        if (!store.isConfigured) {
            call.reject("Call configure() before enabling background sync")
            return
        }

        // Android's floor for periodic work is 15 minutes; anything smaller is silently
        // raised, so clamp here to keep the reported interval honest.
        val requested = call.getInt("intervalMinutes") ?: 15
        val interval = maxOf(requested.toLong(), MIN_INTERVAL_MINUTES)
        store.intervalMinutes = interval

        val request = PeriodicWorkRequestBuilder<DeviceSyncWorker>(interval, TimeUnit.MINUTES)
            .setConstraints(
                Constraints.Builder()
                    // Every run ends in an HTTPS upsert, so without a network it can only fail.
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 5, TimeUnit.MINUTES)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            DeviceSyncWorker.WORK_NAME,
            // UPDATE keeps the existing schedule when only the interval changed, instead
            // of restarting the period and delaying the next run.
            ExistingPeriodicWorkPolicy.UPDATE,
            request
        )
        store.enabled = true

        call.resolve(JSObject().put("intervalMinutes", interval.toDouble()))
    }

    @PluginMethod
    fun disable(call: PluginCall) {
        WorkManager.getInstance(context).cancelUniqueWork(DeviceSyncWorker.WORK_NAME)
        store.enabled = false
        call.resolve()
    }

    /** Runs the sync once, immediately — used to prove the wiring works without waiting. */
    @PluginMethod
    fun syncNow(call: PluginCall) {
        if (!store.isConfigured) {
            call.reject("Call configure() before syncing")
            return
        }
        val request = OneTimeWorkRequestBuilder<DeviceSyncWorker>()
            .setConstraints(
                Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
            )
            .build()
        WorkManager.getInstance(context).enqueue(request)
        call.resolve()
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        CoroutineScope(Dispatchers.Main).launch {
            val reader = HealthConnectReader(context)
            val hasHealthPermissions = withContext(Dispatchers.IO) { reader.hasPermissions() }
            val hasBackgroundRead = withContext(Dispatchers.IO) { reader.hasBackgroundPermission() }

            call.resolve(
                JSObject()
                    .put("enabled", store.enabled)
                    .put("configured", store.isConfigured)
                    .put("intervalMinutes", store.intervalMinutes.toDouble())
                    .put("deviceCount", store.devices().size)
                    .put("healthConnectPermissions", hasHealthPermissions)
                    .put("backgroundReadPermission", hasBackgroundRead)
                    .put("lastRunAt", store.lastRunAt.toDouble())
                    .put("lastResult", store.lastResult)
            )
        }
    }

    /**
     * Which apps have written health data, so each device can be bound to exactly one.
     *
     * Native rather than reusing the web Health Connect plugin because that plugin exposes
     * only 14 record types — a device publishing solely sleep or distance would be invisible
     * in the picker. The reader here covers the full catalogue the worker actually syncs.
     */
    @PluginMethod
    fun listHealthSources(call: PluginCall) {
        CoroutineScope(Dispatchers.Main).launch {
            val reader = HealthConnectReader(context)
            val until = Instant.now()
            val since = until.minus(Duration.ofDays(ORIGIN_DISCOVERY_DAYS))
            val counts = withContext(Dispatchers.IO) { reader.dataOrigins(since, until) }

            val sources = JSArray()
            counts.entries
                .sortedByDescending { it.value }
                .forEach { (packageName, recordCount) ->
                    sources.put(
                        JSObject().put("packageName", packageName).put("recordCount", recordCount)
                    )
                }

            call.resolve(JSObject().put("sources", sources))
        }
    }

    /**
     * Asks for every health permission the sync can use, in one Health Connect screen.
     *
     * The web Health Connect plugin can only request the 14 record types it models, so on
     * its own the user is never asked about sleep, distance, HRV, total calories, exercise
     * and the rest — the worker then skips them for lack of permission and those metrics
     * silently never appear. This requests the full catalogue instead.
     */
    @PluginMethod
    fun requestHealthPermissions(call: PluginCall) {
        val reader = HealthConnectReader(context)
        if (!reader.isAvailable()) {
            call.reject("Health Connect is not available on this device")
            return
        }

        val intent = PermissionController.createRequestPermissionResultContract()
            .createIntent(context, reader.requestablePermissions)
        startActivityForResult(call, intent, "healthPermissionsResult")
    }

    /**
     * Health Connect returns no usable result payload when the user backs out, so the
     * granted set is re-read from the controller rather than trusted from the ActivityResult.
     */
    @ActivityCallback
    private fun healthPermissionsResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        CoroutineScope(Dispatchers.Main).launch {
            val reader = HealthConnectReader(context)
            val granted = withContext(Dispatchers.IO) { reader.grantedReadPermissions() }
            val background = withContext(Dispatchers.IO) { reader.hasBackgroundPermission() }
            call.resolve(grantedPayload(granted, background, reader.readPermissions))
        }
    }

    /** The granted set as it stands, without prompting. */
    @PluginMethod
    fun checkHealthPermissions(call: PluginCall) {
        CoroutineScope(Dispatchers.Main).launch {
            val reader = HealthConnectReader(context)
            val granted = withContext(Dispatchers.IO) { reader.grantedReadPermissions() }
            val background = withContext(Dispatchers.IO) { reader.hasBackgroundPermission() }
            call.resolve(grantedPayload(granted, background, reader.readPermissions))
        }
    }

    private fun grantedPayload(granted: Set<String>, background: Boolean, all: Set<String>): JSObject {
        val grantedArray = JSArray()
        granted.sorted().forEach { grantedArray.put(it) }

        // The full set travels with the response so the UI can name what is still missing
        // rather than only counting it — "Sleep and Distance are blocked" is actionable in
        // a way that "24 of 30" is not.
        val allArray = JSArray()
        all.sorted().forEach { allArray.put(it) }

        return JSObject()
            .put("granted", grantedArray)
            .put("all", allArray)
            .put("grantedCount", granted.size)
            .put("totalCount", all.size)
            .put("backgroundRead", background)
    }

    /**
     * A foreground read over the full record catalogue, returned to JavaScript to store.
     *
     * The web plugin caps at 14 record types, so a foreground "sync now" through it can
     * never see sleep, distance, HRV, exercise sessions and the rest no matter what the
     * user granted. Reading here uses the same reader as the worker, so both paths produce
     * the same rows and upsert onto each other instead of diverging.
     */
    @PluginMethod
    fun readHealthConnect(call: PluginCall) {
        val since = call.getString("since")
        if (since.isNullOrEmpty()) {
            call.reject("since (ISO-8601) is required")
            return
        }

        // Package names, not a device id — Health Connect exposes no per-unit identifier.
        // Empty would mean "every app" to Health Connect, which is how one device's
        // readings end up filed under another, so it is rejected outright.
        val origins = mutableSetOf<String>()
        call.getArray("dataOrigins")?.let { array ->
            for (i in 0 until array.length()) {
                array.optString(i)?.takeIf { it.isNotEmpty() }?.let { origins.add(it) }
            }
        }
        if (origins.isEmpty()) {
            call.reject("dataOrigins must name at least one source app")
            return
        }

        val start = try {
            Instant.parse(since)
        } catch (e: Exception) {
            call.reject("since must be an ISO-8601 instant")
            return
        }

        CoroutineScope(Dispatchers.Main).launch {
            val reader = HealthConnectReader(context)
            val until = Instant.now()
            val readings = withContext(Dispatchers.IO) { reader.read(start, until, origins) }

            val array = JSArray()
            readings.forEach { reading ->
                array.put(
                    JSObject()
                        .put("dataType", reading.dataType)
                        .put("value", reading.value)
                        .put("unit", reading.unit)
                        .put("recordedAt", ISO.format(Instant.ofEpochMilli(reading.timeMillis)))
                )
            }

            call.resolve(
                JSObject().put("readings", array).put("readAt", ISO.format(until))
            )
        }
    }

    /** Clears the stored session, e.g. on sign-out, and stops any scheduled work. */
    @PluginMethod
    fun clear(call: PluginCall) {
        WorkManager.getInstance(context).cancelUniqueWork(DeviceSyncWorker.WORK_NAME)
        store.enabled = false
        store.clearSession()
        call.resolve()
    }

    companion object {
        private const val MIN_INTERVAL_MINUTES = 15L

        /** Matches ORIGIN_DISCOVERY_DAYS in src/lib/capacitor/healthConnect.ts: long enough
         *  that an occasionally worn device still appears, short of a full history scan. */
        private const val ORIGIN_DISCOVERY_DAYS = 30L

        private val ISO: DateTimeFormatter =
            DateTimeFormatter.ISO_INSTANT.withZone(ZoneId.of("UTC"))
    }
}
