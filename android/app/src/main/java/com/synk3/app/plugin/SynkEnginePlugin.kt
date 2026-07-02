package com.synk3.app.bridge

import android.content.Intent
import android.os.SystemClock
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.synk3.app.alarm.AlarmEngine
import com.synk3.app.auth.LeaseGuard

@CapacitorPlugin(name = "SynkBridge")
class SynkBridgePlugin : Plugin() {

    private lateinit var alarmEngine: AlarmEngine
    private lateinit var leaseGuard: LeaseGuard

    override fun load() {
        super.load()
        alarmEngine = AlarmEngine(context)
        leaseGuard = LeaseGuard(context)
    }

    /**
     * Standardizes all returns to match our TS BridgeResult<T> contract.
     */
    private fun resolveSuccess(call: PluginCall, data: JSObject? = null) {
        val result = JSObject()
        result.put("success", true)
        result.put("data", data ?: JSObject.NULL)
        result.put("error", JSObject.NULL)
        call.resolve(result)
    }

    private fun resolveError(call: PluginCall, message: String) {
        val result = JSObject()
        result.put("success", false)
        result.put("data", JSObject.NULL)
        result.put("error", message)
        call.resolve(result)
    }

    @PluginMethod
    fun getElapsedRealtime(call: PluginCall) {
        val data = JSObject()
        // The un-tamperable hardware clock (milliseconds since boot)
        data.put("elapsedMs", SystemClock.elapsedRealtime())
        resolveSuccess(call, data)
    }

    @PluginMethod
    fun validateLease(call: PluginCall) {
        val pinHash = call.getString("pinHash")
        val elapsedAnchor = call.getLong("elapsedAnchor")

        if (pinHash == null || elapsedAnchor == null) {
            resolveError(call, "Malformed ValidateLeasePayload: Missing required fields")
            return
        }

        try {
            val remainingMs = leaseGuard.verifyHardwareLease(pinHash, elapsedAnchor)
            val data = JSObject()
            data.put("remainingMs", remainingMs)
            resolveSuccess(call, data)
        } catch (e: Exception) {
            resolveError(call, e.message ?: "Native lease validation failed")
        }
    }

    @PluginMethod
    fun setAlarm(call: PluginCall) {
        val timeString = call.getString("time")
        
        if (timeString == null || !timeString.matches(Regex("^([01]\\d|2[0-3]):([0-5]\\d)$"))) {
            resolveError(call, "Invalid TimeString format passed to native layer")
            return
        }

        try {
            // Parses "HH:mm" into precise execution epoch
            val scheduledEpoch = alarmEngine.scheduleExact(timeString)
            
            val data = JSObject()
            data.put("scheduledEpoch", scheduledEpoch)
            resolveSuccess(call, data)
        } catch (e: SecurityException) {
            resolveError(call, "Missing SCHEDULE_EXACT_ALARM permission")
        } catch (e: Exception) {
            resolveError(call, "Failed to schedule native alarm: ${e.message}")
        }
    }

    @PluginMethod
    fun checkExactAlarmPermission(call: PluginCall) {
        val data = JSObject()
        data.put("granted", alarmEngine.hasExactAlarmPermission())
        resolveSuccess(call, data)
    }

    @PluginMethod
    fun requestExactAlarmPermission(call: PluginCall) {
        if (alarmEngine.hasExactAlarmPermission()) {
            val data = JSObject().apply { put("granted", true) }
            resolveSuccess(call, data)
            return
        }

        // On API 31+, we must bounce the user to the specific OS Settings page
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
            
            // Note: Android doesn't return a direct ActivityResult for this specific intent.
            // We tell TS it is false for now; the app lifecycle will re-check via onResume().
            val data = JSObject().apply { put("granted", false) }
            resolveSuccess(call, data)
        } else {
            // Auto-granted on older APIs
            val data = JSObject().apply { put("granted", true) }
            resolveSuccess(call, data)
        }
    }
}
