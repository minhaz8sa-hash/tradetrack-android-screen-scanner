package com.mirex.body.cloud

import android.content.Context
import com.mirex.body.BuildConfig
import com.mirex.body.agent.AgentBus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class VeyraCloudClient(private val context: Context) {
    companion object {
        const val BASE_URL = "https://veyra-personal-agnet-lib-minhaz8sa-6039.vercel.app"
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .writeTimeout(12, TimeUnit.SECONDS)
        .build()

    suspend fun syncSkills(force: Boolean = false): Boolean = withContext(Dispatchers.IO) {
        val store = CloudSkillStore(context)
        if (!force && !store.shouldSync()) {
            val rev = store.revision().ifBlank { "cached" }
            AgentBus.cloudStatus("Cloud synced · " + rev)
            return@withContext true
        }

        AgentBus.cloudStatus("Syncing skills…")
        val request = Request.Builder()
            .url(BASE_URL + "/api/skills")
            .header("Accept", "application/json")
            .get()
            .build()

        runCatching {
            client.newCall(request).execute().use { response ->
                val raw = response.body?.string().orEmpty()
                if (!response.isSuccessful) error("HTTP " + response.code)
                val root = JSONObject(raw)
                if (!root.optBoolean("ok")) error("Cloud rejected skill sync")
                store.saveSkills(root)
                AgentBus.cloudStatus("Cloud synced · " + root.optString("revision", "latest"))
            }
            heartbeat(store.deviceId())
            true
        }.getOrElse {
            AgentBus.cloudStatus("Cloud offline · using cached skills")
            false
        }
    }

    private fun heartbeat(deviceId: String) {
        val body = JSONObject().apply {
            put("deviceId", deviceId)
            put("androidVersionCode", BuildConfig.VERSION_CODE)
            put("androidVersionName", BuildConfig.VERSION_NAME)
        }.toString().toRequestBody("application/json".toMediaType())

        val request = Request.Builder()
            .url(BASE_URL + "/api/device/heartbeat")
            .header("Content-Type", "application/json")
            .post(body)
            .build()

        runCatching {
            client.newCall(request).execute().close()
        }
    }
}
