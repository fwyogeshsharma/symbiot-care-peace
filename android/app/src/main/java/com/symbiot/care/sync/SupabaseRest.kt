package com.symbiot.care.sync

import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.net.HttpURLConnection
import java.net.URL

/**
 * Minimal Supabase REST client for the background worker.
 *
 * supabase-js lives in the WebView and is unavailable here, so PostgREST is called
 * directly. Requests carry the user's access token rather than a service key, which
 * means row level security applies exactly as it does in the app.
 */
class SupabaseRest(private val store: SyncStore) {

    class AuthExpiredException : Exception("Supabase session could not be refreshed")

    /**
     * Upsert readings into device_data.
     *
     * on_conflict must name the same columns as the unique index the web app relies on;
     * with Prefer: resolution=merge-duplicates a repeated read corrects the stored row
     * instead of appending a duplicate.
     */
    fun upsertDeviceData(rows: JSONArray): Int {
        if (rows.length() == 0) return 0
        val path = "/rest/v1/device_data?on_conflict=device_id,data_type,recorded_at"
        val headers = mapOf("Prefer" to "resolution=merge-duplicates,return=minimal")
        request("POST", path, rows.toString(), headers)
        return rows.length()
    }

    fun updateDeviceSync(deviceId: String, syncedAtIso: String, batteryLevel: Int?) {
        val body = JSONObject().apply {
            put("last_sync", syncedAtIso)
            if (batteryLevel != null) put("battery_level", batteryLevel)
        }
        request(
            "PATCH",
            "/rest/v1/devices?id=eq.$deviceId",
            body.toString(),
            mapOf("Prefer" to "return=minimal")
        )
    }

    /**
     * Runs [block], and if Supabase rejects the token as expired, refreshes the session
     * once and retries. Access tokens last an hour while the worker may run for weeks.
     */
    private fun <T> withAuthRetry(block: () -> T): T {
        return try {
            block()
        } catch (e: UnauthorizedException) {
            refreshSession()
            block()
        }
    }

    private class UnauthorizedException : Exception("Token rejected")

    private fun refreshSession() {
        val refresh = store.refreshToken
        if (refresh.isEmpty()) throw AuthExpiredException()

        val url = URL("${store.supabaseUrl}/auth/v1/token?grant_type=refresh_token")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = TIMEOUT_MS
            readTimeout = TIMEOUT_MS
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("apikey", store.anonKey)
        }

        try {
            conn.outputStream.use {
                it.write(JSONObject().put("refresh_token", refresh).toString().toByteArray())
            }
            val code = conn.responseCode
            if (code !in 200..299) {
                // A rejected refresh token means the user signed out or the session was
                // revoked; there is nothing the worker can do until the app runs again.
                store.clearSession()
                throw AuthExpiredException()
            }
            val body = conn.inputStream.bufferedReader().use(BufferedReader::readText)
            val json = JSONObject(body)
            store.accessToken = json.getString("access_token")
            // Supabase rotates the refresh token on every use — persisting the new one is
            // what keeps background sync alive past the first refresh.
            json.optString("refresh_token").takeIf { it.isNotEmpty() }?.let {
                store.refreshToken = it
            }
        } finally {
            conn.disconnect()
        }
    }

    private fun request(
        method: String,
        path: String,
        body: String?,
        extraHeaders: Map<String, String> = emptyMap()
    ): String = withAuthRetry {
        val url = URL("${store.supabaseUrl}$path")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = TIMEOUT_MS
            readTimeout = TIMEOUT_MS
            setRequestProperty("apikey", store.anonKey)
            setRequestProperty("Authorization", "Bearer ${store.accessToken}")
            setRequestProperty("Content-Type", "application/json")
            extraHeaders.forEach { (k, v) -> setRequestProperty(k, v) }
            if (body != null) doOutput = true
        }

        try {
            if (body != null) {
                conn.outputStream.use { it.write(body.toByteArray()) }
            }
            val code = conn.responseCode
            if (code == 401 || code == 403) throw UnauthorizedException()
            if (code !in 200..299) {
                val error = conn.errorStream?.bufferedReader()?.use(BufferedReader::readText)
                Log.e(TAG, "$method $path failed ($code): $error")
                throw Exception("Supabase request failed ($code)")
            }
            conn.inputStream?.bufferedReader()?.use(BufferedReader::readText) ?: ""
        } finally {
            conn.disconnect()
        }
    }

    companion object {
        private const val TAG = "SupabaseRest"
        private const val TIMEOUT_MS = 20_000
    }
}
