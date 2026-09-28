package com.mirex.body.agent

import com.mirex.body.accessibility.MirexAccessibilityService
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.ensureActive
import org.json.JSONObject

class AgentRunner(
    private val phone: MirexAccessibilityService,
    apiKey: String,
    model: String
) {
    private val ai = OpenAiResponsesClient(apiKey, model)

    suspend fun run(task: String) {
        val first = observe()
        AgentBus.status("Thinking…")
        AgentBus.speak("ঠিক আছে, কাজটা করছি।")

        val context = AgentBus.compactContext()
        val initialPrompt = buildString {
            if (context.isNotBlank()) {
                append("Recent conversation context:\n")
                append(context)
                append("\n\n")
            }
            append("Current user request:\n")
            append(task)
        }

        var response = ai.createInitial(initialPrompt, first)
        var steps = 0

        while (true) {
            currentCoroutineContext().ensureActive()
            if (++steps > 60) {
                val msg = "Action limit reached. I stopped to avoid an unintended loop."
                AgentBus.add(ChatMessage(ChatRole.System, msg))
                AgentBus.status("Action limit reached")
                AgentBus.speak("কাজটা নিরাপত্তার জন্য থামিয়েছি।")
                return
            }

            val call = response.call
            if (call == null) {
                val finalText = response.text?.ifBlank { null } ?: "Task finished."
                AgentBus.add(ChatMessage(ChatRole.Assistant, finalText))
                AgentBus.status("Done")
                AgentBus.speak(finalText.take(420))
                AgentBus.speak("টাস্ক কমপ্লিট। আর কিছু করতে হবে?")
                return
            }

            AgentBus.status(statusFor(call.name))
            voiceProgress(call.name, call.arguments)
            val result = execute(call.name, call.arguments)
            delay(settleDelay(call.name))
            val updated = observe()
            AgentBus.status("Verifying…")
            response = ai.continueWith(response.id, call.callId, result.toString(), updated)
        }
    }

    private fun voiceProgress(name: String, args: JSONObject) {
        when (name) {
            "open_app" -> {
                val app = args.optString("app").take(40)
                if (app.isNotBlank()) AgentBus.speak("$app খুলছি।")
            }
            "type_text" -> AgentBus.speak("লিখছি।")
            else -> Unit
        }
    }

    private suspend fun observe(): OpenAiResponsesClient.Observation {
        delay(220)
        val frame = phone.screenshot()
        return OpenAiResponsesClient.Observation(
            imageBase64 = frame?.base64Jpeg,
            width = frame?.width ?: 0,
            height = frame?.height ?: 0,
            uiTree = phone.uiTree()
        )
    }

    private suspend fun execute(name: String, a: JSONObject): JSONObject {
        fun ok(value: Boolean, extra: String? = null) = JSONObject().apply {
            put("ok", value)
            extra?.let { put("detail", it) }
        }

        return when (name) {
            "tap" -> ok(phone.tap(a.getDouble("x").toFloat(), a.getDouble("y").toFloat()))
            "long_press" -> ok(phone.longPress(a.getDouble("x").toFloat(), a.getDouble("y").toFloat(), a.getLong("duration_ms")))
            "swipe" -> ok(phone.swipe(
                a.getDouble("x1").toFloat(), a.getDouble("y1").toFloat(),
                a.getDouble("x2").toFloat(), a.getDouble("y2").toFloat(),
                a.getLong("duration_ms")
            ))
            "type_text" -> ok(phone.typeText(a.getString("text")))
            "click_text" -> ok(phone.clickText(a.getString("text")))
            "scroll" -> ok(phone.scroll(a.getString("direction")))
            "open_app" -> ok(phone.openApp(a.getString("app")))
            "back" -> ok(phone.back())
            "home" -> ok(phone.home())
            "recents" -> ok(phone.recents())
            "wait" -> {
                delay(a.getLong("milliseconds").coerceIn(100L, 5000L))
                ok(true)
            }
            else -> ok(false, "Unknown tool: $name")
        }
    }

    private fun statusFor(name: String): String = when (name) {
        "tap", "click_text", "long_press" -> "Tapping…"
        "swipe", "scroll" -> "Scrolling…"
        "type_text" -> "Typing…"
        "open_app" -> "Opening app…"
        "back", "home", "recents" -> "Navigating…"
        "wait" -> "Waiting…"
        else -> "Acting…"
    }

    private fun settleDelay(name: String): Long = when (name) {
        "open_app" -> 1400L
        "wait" -> 150L
        else -> 550L
    }
}
