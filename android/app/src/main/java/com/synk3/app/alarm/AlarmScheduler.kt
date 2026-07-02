package com.synk3.app.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar

class AlarmEngine(private val context: Context) {

    private val alarmManager: AlarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    fun hasExactAlarmPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            alarmManager.canScheduleExactAlarms()
        } else {
            true // Granted by default via Manifest on API < 31
        }
    }

    @Throws(SecurityException::class)
    fun scheduleExact(timeString: String): Long {
        if (!hasExactAlarmPermission()) {
            throw SecurityException("Missing Exact Alarm Permission")
        }

        val (hours, minutes) = timeString.split(":").map { it.toInt() }
        
        val calendar = Calendar.getInstance().apply {
            timeInMillis = System.currentTimeMillis()
            set(Calendar.HOUR_OF_DAY, hours)
            set(Calendar.MINUTE, minutes)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            
            // If the time has already passed today, schedule for tomorrow
            if (timeInMillis <= System.currentTimeMillis()) {
                add(Calendar.DAY_OF_YEAR, 1)
            }
        }

        // We use a BroadcastReceiver (AlarmReceiver) to catch this intent when the system fires it.
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = "com.synk3.app.ALARM_WAKE"
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // The critical API call. This pierces Doze mode.
        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            calendar.timeInMillis,
            pendingIntent
        )

        return calendar.timeInMillis
    }
}
