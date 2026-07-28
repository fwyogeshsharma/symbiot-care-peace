package com.symbiot.care.sync

import android.Manifest
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Reads heart rate and battery level over the standard GATT services.
 *
 * Deliberately never scans. Android throttles background scans hard and they need
 * location permission, so the worker only talks to devices whose address the app
 * already learned during a foreground sync (devices.ble_device_id). Devices without a
 * stored address are skipped until the user syncs them once with the app open.
 */
class BleReader(private val context: Context) {

    data class Reading(val heartRate: Int?, val batteryLevel: Int?)

    fun isUsable(): Boolean {
        if (!hasConnectPermission()) return false
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        return manager?.adapter?.isEnabled == true
    }

    private fun hasConnectPermission(): Boolean {
        // BLUETOOTH_CONNECT only exists from Android 12; earlier versions rely on the
        // legacy BLUETOOTH permission, which is granted at install time.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.BLUETOOTH_CONNECT
        ) == PackageManager.PERMISSION_GRANTED
    }

    fun read(address: String): Reading {
        if (!isUsable()) return Reading(null, null)

        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val device = try {
            manager.adapter.getRemoteDevice(address)
        } catch (e: IllegalArgumentException) {
            Log.w(TAG, "Stored BLE address is not valid: $address")
            return Reading(null, null)
        }

        var heartRate: Int? = null
        var battery: Int? = null
        val done = CountDownLatch(1)
        var gatt: BluetoothGatt? = null

        val callback = object : BluetoothGattCallback() {
            override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    if (!safeDiscover(g)) done.countDown()
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    done.countDown()
                }
            }

            override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
                if (status != BluetoothGatt.GATT_SUCCESS) {
                    done.countDown()
                    return
                }
                // Battery is a plain read; heart rate only arrives via notification, so
                // read battery first and subscribe afterwards — one GATT operation at a time.
                val batteryChar = g.getService(BATTERY_SERVICE)
                    ?.getCharacteristic(BATTERY_LEVEL_CHAR)
                if (batteryChar != null) {
                    if (!safeRead(g, batteryChar)) subscribeHeartRate(g)
                } else {
                    subscribeHeartRate(g)
                }
            }

            override fun onCharacteristicRead(
                g: BluetoothGatt,
                characteristic: BluetoothGattCharacteristic,
                value: ByteArray,
                status: Int
            ) {
                if (status == BluetoothGatt.GATT_SUCCESS && value.isNotEmpty()) {
                    battery = value[0].toInt() and 0xFF
                }
                subscribeHeartRate(g)
            }

            @Deprecated("Kept for Android 12 and below, which do not call the value overload")
            override fun onCharacteristicRead(
                g: BluetoothGatt,
                characteristic: BluetoothGattCharacteristic,
                status: Int
            ) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) return
                @Suppress("DEPRECATION")
                val value = characteristic.value
                if (status == BluetoothGatt.GATT_SUCCESS && value != null && value.isNotEmpty()) {
                    battery = value[0].toInt() and 0xFF
                }
                subscribeHeartRate(g)
            }

            override fun onCharacteristicChanged(
                g: BluetoothGatt,
                characteristic: BluetoothGattCharacteristic,
                value: ByteArray
            ) {
                heartRate = parseHeartRate(value)
                done.countDown()
            }

            @Deprecated("Kept for Android 12 and below, which do not call the value overload")
            override fun onCharacteristicChanged(
                g: BluetoothGatt,
                characteristic: BluetoothGattCharacteristic
            ) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) return
                @Suppress("DEPRECATION")
                val value = characteristic.value ?: return
                heartRate = parseHeartRate(value)
                done.countDown()
            }

            private fun subscribeHeartRate(g: BluetoothGatt) {
                val hrChar = g.getService(HEART_RATE_SERVICE)
                    ?.getCharacteristic(HEART_RATE_MEASUREMENT_CHAR)
                if (hrChar == null) {
                    done.countDown()
                    return
                }
                if (!safeSubscribe(g, hrChar)) done.countDown()
            }
        }

        try {
            gatt = connect(device, callback)
            if (gatt == null) return Reading(null, null)
            // A watch that is busy talking to its own app simply never reports; give up
            // rather than holding the worker open.
            done.await(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        } catch (e: SecurityException) {
            Log.w(TAG, "Missing Bluetooth permission at connect time", e)
        } catch (e: Exception) {
            Log.e(TAG, "BLE read failed for $address", e)
        } finally {
            try {
                gatt?.disconnect()
                gatt?.close()
            } catch (e: SecurityException) {
                // Nothing useful to do; the connection is dropped when the worker ends.
            }
        }

        return Reading(heartRate, battery)
    }

    private fun connect(
        device: BluetoothDevice,
        callback: BluetoothGattCallback
    ): BluetoothGatt? = try {
        device.connectGatt(context, false, callback, BluetoothDevice.TRANSPORT_LE)
    } catch (e: SecurityException) {
        Log.w(TAG, "connectGatt denied", e)
        null
    }

    private fun safeDiscover(g: BluetoothGatt): Boolean = try {
        g.discoverServices()
    } catch (e: SecurityException) {
        false
    }

    private fun safeRead(g: BluetoothGatt, c: BluetoothGattCharacteristic): Boolean = try {
        g.readCharacteristic(c)
    } catch (e: SecurityException) {
        false
    }

    private fun safeSubscribe(g: BluetoothGatt, c: BluetoothGattCharacteristic): Boolean {
        return try {
            if (!g.setCharacteristicNotification(c, true)) return false
            val descriptor = c.getDescriptor(CLIENT_CONFIG_DESCRIPTOR) ?: return false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                g.writeDescriptor(descriptor, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
                true
            } else {
                @Suppress("DEPRECATION")
                run {
                    descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                    g.writeDescriptor(descriptor)
                }
            }
        } catch (e: SecurityException) {
            false
        }
    }

    /**
     * Heart Rate Measurement, Bluetooth GATT spec: bit 0 of the flags byte selects an
     * 8-bit or 16-bit little-endian value.
     */
    private fun parseHeartRate(value: ByteArray): Int? {
        if (value.isEmpty()) return null
        val isUint16 = (value[0].toInt() and 0x01) != 0
        return if (isUint16) {
            if (value.size < 3) null
            else ((value[2].toInt() and 0xFF) shl 8) or (value[1].toInt() and 0xFF)
        } else {
            if (value.size < 2) null else value[1].toInt() and 0xFF
        }
    }

    companion object {
        private const val TAG = "BleReader"
        private const val TIMEOUT_SECONDS = 20L
        private val HEART_RATE_SERVICE = UUID.fromString("0000180d-0000-1000-8000-00805f9b34fb")
        private val HEART_RATE_MEASUREMENT_CHAR =
            UUID.fromString("00002a37-0000-1000-8000-00805f9b34fb")
        private val BATTERY_SERVICE = UUID.fromString("0000180f-0000-1000-8000-00805f9b34fb")
        private val BATTERY_LEVEL_CHAR = UUID.fromString("00002a19-0000-1000-8000-00805f9b34fb")
        private val CLIENT_CONFIG_DESCRIPTOR =
            UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
    }
}
