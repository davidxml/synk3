package com.synk3.app.auth

import android.content.Context
import android.os.SystemClock

class LeaseGuard(private val context: Context) {

    // In a production scenario, the secret against which the pinHash is checked 
    // would be securely stored in the Android Keystore system.
    private val expectedHardwareHash = "YOUR_EXPECTED_HASH_HERE" 
    private val LEASE_DURATION_MS = 12 * 60 * 60 * 1000L // e.g., 12 hours

    /**
     * Executes the zero-trust hardware time check.
     * @return remaining milliseconds on the lease, or throws if invalid/expired.
     */
    @Throws(SecurityException::class)
    fun verifyHardwareLease(pinHash: String, elapsedAnchor: Long): Long {
        
        if (pinHash != expectedHardwareHash) {
            throw SecurityException("Cryptographic PIN mismatch")
        }

        val currentUptime = SystemClock.elapsedRealtime()
        val elapsedSinceLease = currentUptime - elapsedAnchor

        if (elapsedSinceLease < 0) {
            // Fatal: The device rebooted. The anchor is meaningless.
            // Strict security demands we force a re-auth.
            throw SecurityException("Device reboot detected. Anchor invalidated.")
        }

        val remainingMs = LEASE_DURATION_MS - elapsedSinceLease

        if (remainingMs <= 0) {
            throw SecurityException("Hardware lease expired")
        }

        return remainingMs
    }
}
