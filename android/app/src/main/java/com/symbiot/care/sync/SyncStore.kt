package com.symbiot.care.sync

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONArray
import org.json.JSONObject

/**
 * Everything the background worker needs in order to sync without a running WebView:
 * the Supabase session, which devices to sync, and how far each one has already been read.
 *
 * Tokens are held in EncryptedSharedPreferences — the worker runs long after the user has
 * left the app, so a refresh token sits on disk indefinitely and must not be readable from
 * a plain prefs file on a rooted device.
 */
class SyncStore(context: Context) {

    private val prefs: SharedPreferences = try {
        val key = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            SECURE_PREFS,
            key,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (e: Exception) {
        // A corrupted keystore entry (restored backup, changed lock screen) makes the
        // encrypted file permanently unreadable. Drop it and start over rather than
        // crashing the worker on every run — the user just re-enables background sync.
        context.deleteSharedPreferences(SECURE_PREFS)
        val key = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            SECURE_PREFS,
            key,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    data class Device(
        val id: String,
        val elderlyPersonId: String,
        val name: String,
        val bleDeviceId: String?,
        /**
         * Health Connect dataOrigin (writing app package) whose records belong to this
         * device. Null means unmapped, and the worker then skips Health Connect for it
         * rather than reading every app's data and filing it under this device.
         */
        val healthSource: String?
    )

    var supabaseUrl: String
        get() = prefs.getString(KEY_URL, "") ?: ""
        set(value) = prefs.edit().putString(KEY_URL, value).apply()

    var anonKey: String
        get() = prefs.getString(KEY_ANON, "") ?: ""
        set(value) = prefs.edit().putString(KEY_ANON, value).apply()

    var accessToken: String
        get() = prefs.getString(KEY_ACCESS, "") ?: ""
        set(value) = prefs.edit().putString(KEY_ACCESS, value).apply()

    var refreshToken: String
        get() = prefs.getString(KEY_REFRESH, "") ?: ""
        set(value) = prefs.edit().putString(KEY_REFRESH, value).apply()

    var intervalMinutes: Long
        get() = prefs.getLong(KEY_INTERVAL, 15L)
        set(value) = prefs.edit().putLong(KEY_INTERVAL, value).apply()

    /**
     * Whether the user has background sync switched on. Tracked here rather than read
     * back from WorkManager, whose state query returns a ListenableFuture that would drag
     * Guava onto the app classpath. Periodic work is persistent, so this only drifts if
     * the OS cancels the job outright — the next enable() re-registers it either way.
     */
    var enabled: Boolean
        get() = prefs.getBoolean(KEY_ENABLED, false)
        set(value) = prefs.edit().putBoolean(KEY_ENABLED, value).apply()

    var lastResult: String
        get() = prefs.getString(KEY_LAST_RESULT, "") ?: ""
        set(value) = prefs.edit().putString(KEY_LAST_RESULT, value).apply()

    var lastRunAt: Long
        get() = prefs.getLong(KEY_LAST_RUN, 0L)
        set(value) = prefs.edit().putLong(KEY_LAST_RUN, value).apply()

    val isConfigured: Boolean
        get() = supabaseUrl.isNotEmpty() && anonKey.isNotEmpty() && accessToken.isNotEmpty()

    fun saveDevices(devices: List<Device>) {
        val array = JSONArray()
        devices.forEach { device ->
            array.put(
                JSONObject().apply {
                    put("id", device.id)
                    put("elderly_person_id", device.elderlyPersonId)
                    put("device_name", device.name)
                    put("ble_device_id", device.bleDeviceId ?: JSONObject.NULL)
                    put("health_source", device.healthSource ?: JSONObject.NULL)
                }
            )
        }
        prefs.edit().putString(KEY_DEVICES, array.toString()).apply()
    }

    fun devices(): List<Device> {
        val raw = prefs.getString(KEY_DEVICES, null) ?: return emptyList()
        return try {
            val array = JSONArray(raw)
            (0 until array.length()).map { i ->
                val o = array.getJSONObject(i)
                Device(
                    id = o.getString("id"),
                    elderlyPersonId = o.getString("elderly_person_id"),
                    name = o.optString("device_name", ""),
                    bleDeviceId = if (o.isNull("ble_device_id")) null else o.getString("ble_device_id"),
                    healthSource = if (o.isNull("health_source")) {
                        null
                    } else {
                        o.optString("health_source").takeIf { it.isNotEmpty() }
                    }
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Per-device high-water mark for Health Connect reads. Mirrors the web app: never
     * read past the start of today, so a day's totals still match the source app after
     * it back-fills and revises interval records.
     */
    fun watermark(deviceId: String): Long = prefs.getLong(KEY_WATERMARK + deviceId, 0L)

    fun setWatermark(deviceId: String, millis: Long) {
        prefs.edit().putLong(KEY_WATERMARK + deviceId, millis).apply()
    }

    fun clearSession() {
        prefs.edit()
            .remove(KEY_ACCESS)
            .remove(KEY_REFRESH)
            .remove(KEY_DEVICES)
            .apply()
    }

    companion object {
        private const val SECURE_PREFS = "symbiot_background_sync"
        private const val KEY_URL = "supabase_url"
        private const val KEY_ANON = "anon_key"
        private const val KEY_ACCESS = "access_token"
        private const val KEY_REFRESH = "refresh_token"
        private const val KEY_DEVICES = "devices"
        private const val KEY_INTERVAL = "interval_minutes"
        private const val KEY_ENABLED = "enabled"
        private const val KEY_LAST_RESULT = "last_result"
        private const val KEY_LAST_RUN = "last_run_at"
        private const val KEY_WATERMARK = "watermark_"
    }
}
