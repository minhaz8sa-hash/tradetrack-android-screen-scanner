package com.mirex.body.cloud

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

class CloudSkillStore(context: Context) {
    private val prefs = context.getSharedPreferences("veyra_cloud", Context.MODE_PRIVATE)

    fun deviceId(): String {
        val existing = prefs.getString("device_id", null)
        if (!existing.isNullOrBlank()) return existing
        val created = UUID.randomUUID().toString()
        prefs.edit().putString("device_id", created).apply()
        return created
    }

    fun revision(): String = prefs.getString("skill_revision", "") ?: ""
    fun lastSyncMs(): Long = prefs.getLong("skill_sync_ms", 0L)

    fun shouldSync(now: Long = System.currentTimeMillis(), ttlMs: Long = 300_000L): Boolean =
        now - lastSyncMs() >= ttlMs

    fun saveSkills(payload: JSONObject) {
        val revision = payload.optString("revision")
        val skills = payload.optJSONArray("skills") ?: JSONArray()
        prefs.edit()
            .putString("skill_revision", revision)
            .putString("skills_json", skills.toString())
            .putLong("skill_sync_ms", System.currentTimeMillis())
            .apply()
    }

    fun skills(): JSONArray {
        val raw = prefs.getString("skills_json", "[]") ?: "[]"
        return runCatching { JSONArray(raw) }.getOrElse { JSONArray() }
    }
}
