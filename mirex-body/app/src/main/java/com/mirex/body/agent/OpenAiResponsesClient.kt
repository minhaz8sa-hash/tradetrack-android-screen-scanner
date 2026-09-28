package com.mirex.body.agent

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class OpenAiResponsesClient(private val apiKey: String, private val model: String) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    data class FunctionCall(val callId: String, val name: String, val arguments: JSONObject)
    data class Response(val id: String, val text: String?, val call: FunctionCall?)

    suspend fun createInitial(task: String, observation: Observation): Response = request(
        previousResponseId = null,
        input = JSONArray().put(userObservation(task, observation))
    )

    suspend fun continueWith(
        previousResponseId: String,
        callId: String,
        toolOutput: String,
        observation: Observation
    ): Response {
        val input = JSONArray()
            .put(JSONObject().apply {
                put("type", "function_call_output")
                put("call_id", callId)
                put("output", toolOutput)
            })
            .put(userObservation("Continue the task using the updated phone state.", observation))
        return request(previousResponseId, input)
    }

    data class Observation(val imageBase64: String?, val width: Int, val height: Int, val uiTree: String)

    private fun userObservation(text: String, observation: Observation): JSONObject {
        val content = JSONArray().put(JSONObject().apply {
            put("type", "input_text")
            put("text", buildString {
                append(text)
                append("\n\nPHONE STATE\n")
                append("Screen size: ${observation.width}x${observation.height} pixels. Coordinates use this screenshot space.\n")
                append("Visible accessibility UI tree:\n")
                append(observation.uiTree.ifBlank { "<empty>" })
            })
        })
        observation.imageBase64?.let { b64 ->
            content.put(JSONObject().apply {
                put("type", "input_image")
                put("image_url", "data:image/jpeg;base64,$b64")
                put("detail", "original")
            })
        }
        return JSONObject().apply {
            put("role", "user")
            put("content", content)
        }
    }

    private suspend fun request(previousResponseId: String?, input: JSONArray): Response = withContext(Dispatchers.IO) {
        val body = JSONObject().apply {
            put("model", model)
            put("instructions", AGENT_INSTRUCTIONS)
            put("input", input)
            put("tools", tools())
            put("parallel_tool_calls", false)
            put("max_output_tokens", 1200)
            if (previousResponseId != null) put("previous_response_id", previousResponseId)
        }
        val req = Request.Builder()
            .url("https://api.openai.com/v1/responses")
            .header("Authorization", "Bearer $apiKey")
            .header("Content-Type", "application/json")
            .post(body.toString().toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(req).execute().use { http ->
            val raw = http.body?.string().orEmpty()
            if (!http.isSuccessful) {
                throw IllegalStateException("OpenAI ${http.code}: ${extractError(raw)}")
            }
            parse(JSONObject(raw))
        }
    }

    private fun parse(root: JSONObject): Response {
        val id = root.optString("id")
        val out = root.optJSONArray("output") ?: JSONArray()
        var text: String? = null
        var call: FunctionCall? = null
        for (i in 0 until out.length()) {
            val item = out.optJSONObject(i) ?: continue
            when (item.optString("type")) {
                "function_call" -> if (call == null) {
                    val argsString = item.optString("arguments", "{}")
                    call = FunctionCall(
                        callId = item.optString("call_id"),
                        name = item.optString("name"),
                        arguments = runCatching { JSONObject(argsString) }.getOrElse { JSONObject() }
                    )
                }
                "message" -> {
                    val c = item.optJSONArray("content") ?: continue
                    for (j in 0 until c.length()) {
                        val part = c.optJSONObject(j) ?: continue
                        if (part.optString("type") == "output_text") {
                            text = (text.orEmpty() + part.optString("text")).trim()
                        }
                    }
                }
            }
        }
        return Response(id, text, call)
    }

    private fun extractError(raw: String): String = runCatching {
        JSONObject(raw).optJSONObject("error")?.optString("message") ?: raw.take(500)
    }.getOrElse { raw.take(500) }

    private fun tool(name: String, description: String, properties: JSONObject, required: List<String>): JSONObject =
        JSONObject().apply {
            put("type", "function")
            put("name", name)
            put("description", description)
            put("strict", true)
            put("parameters", JSONObject().apply {
                put("type", "object")
                put("properties", properties)
                put("required", JSONArray(required))
                put("additionalProperties", false)
            })
        }

    private fun num(desc: String) = JSONObject().put("type", "number").put("description", desc)
    private fun int(desc: String) = JSONObject().put("type", "integer").put("description", desc)
    private fun str(desc: String) = JSONObject().put("type", "string").put("description", desc)

    private fun tools(): JSONArray = JSONArray().apply {
        put(tool("tap", "Tap one screen coordinate.", JSONObject().put("x", num("X pixel")).put("y", num("Y pixel")), listOf("x", "y")))
        put(tool("long_press", "Long-press one screen coordinate.", JSONObject().put("x", num("X pixel")).put("y", num("Y pixel")).put("duration_ms", int("500-3000 ms")), listOf("x", "y", "duration_ms")))
        put(tool("swipe", "Swipe between two screen coordinates.", JSONObject().put("x1", num("Start X")).put("y1", num("Start Y")).put("x2", num("End X")).put("y2", num("End Y")).put("duration_ms", int("80-2000 ms")), listOf("x1", "y1", "x2", "y2", "duration_ms")))
        put(tool("type_text", "Replace text in the currently focused editable field.", JSONObject().put("text", str("Text to enter")), listOf("text")))
        put(tool("click_text", "Click a visible accessibility element by exact or partial text/content description. Prefer this over coordinates when possible.", JSONObject().put("text", str("Visible text or accessibility description")), listOf("text")))
        put(tool("scroll", "Scroll the most relevant scrollable view.", JSONObject().put("direction", JSONObject().put("type", "string").put("enum", JSONArray(listOf("forward", "backward")))), listOf("direction")))
        put(tool("open_app", "Open an installed Android app by app label or package name.", JSONObject().put("app", str("App label such as CapCut, Chrome, Free Fire, or package name")), listOf("app")))
        put(tool("back", "Press Android Back.", JSONObject(), emptyList()))
        put(tool("home", "Press Android Home.", JSONObject(), emptyList()))
        put(tool("recents", "Open Android Recents.", JSONObject(), emptyList()))
        put(tool("wait", "Wait briefly for UI/app loading.", JSONObject().put("milliseconds", int("100-5000 milliseconds")), listOf("milliseconds")))
    }

    companion object {
        private const val AGENT_INSTRUCTIONS = """
You are Veyra, an Android phone-control assistant. You receive a screenshot plus an accessibility UI tree after every action. Choose the smallest safe next action using the available tools, then inspect the updated state before continuing.

Rules:
- Prefer click_text when a reliable visible label exists; otherwise use screenshot coordinates.
- Never assume an action succeeded. Verify on the next observation.
- Do not repeatedly tap the same place when the UI did not change; recover with Back, wait, or a different target.
- Keep actions deliberate and avoid opening unrelated private content.
- Never interact with the floating red VEYRA STOP control.
- Do not initiate or execute financial transactions, deposits, withdrawals, purchases, wagers, or real-money trades. You may navigate to information, analyze, or prepare non-transactional steps, but tell the user to complete the final financial action manually.
- Before destructive or externally consequential actions that are not already explicitly requested (deleting data, posting/publishing, sending a message, changing an account setting), ask the user in text instead of taking the action.
- Reply in the user's language. If the user speaks Bangla or Banglish, reply naturally in Bangla/Banglish.
- Keep completion replies concise and suitable for speaking aloud.
- Use recent conversation context to understand short follow-ups such as “হ্যাঁ এটা করো” or “এটা হয়েছে?”.
- If the requested task is complete, return a concise completion message and do not call another tool.
- If blocked by login, OTP, CAPTCHA, Android permission, or missing user choice, explain exactly what input is needed and stop tool calls.
"""
    }
}
