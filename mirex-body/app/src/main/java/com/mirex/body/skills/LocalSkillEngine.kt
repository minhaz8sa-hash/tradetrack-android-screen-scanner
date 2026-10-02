package com.mirex.body.skills

import com.mirex.body.accessibility.MirexAccessibilityService
import com.mirex.body.cloud.CloudSkillStore
import kotlinx.coroutines.delay
import org.json.JSONArray
import org.json.JSONObject

class LocalSkillEngine(
    private val phone: MirexAccessibilityService,
    private val store: CloudSkillStore
) {
    data class Result(
        val handled: Boolean,
        val success: Boolean = false,
        val message: String = ""
    )

    suspend fun execute(command: String): Result {
        val clean = command.trim()
        if (clean.isBlank()) return Result(false)

        nativeNavigation(clean)?.let { return it }
        nativeUrl(clean)?.let { return it }
        nativeClick(clean)?.let { return it }
        nativeType(clean)?.let { return it }
        nativeOpenApp(clean)?.let { return it }

        val fromCloud = executeCloudSkill(clean)
        if (fromCloud.handled) return fromCloud

        return Result(false)
    }

    private fun nativeNavigation(command: String): Result? {
        val c = normalize(command)
        return when {
            containsAny(c, "home", "হোম", "home e jao", "home এ যাও") ->
                Result(true, phone.home(), "Home screen খুলে দিয়েছি।")

            containsAny(c, "recents", "recent apps", "রিসেন্ট", "সাম্প্রতিক app") ->
                Result(true, phone.recents(), "Recent apps খুলে দিয়েছি।")

            containsAny(c, "back", "go back", "পিছনে", "ব্যাক") ->
                Result(true, phone.back(), "এক ধাপ পিছনে গিয়েছি।")

            (c.contains("scroll") || c.contains("স্ক্রল")) &&
                containsAny(c, "up", "উপরে", "backward") ->
                Result(true, phone.scroll("backward"), "উপরে scroll করেছি।")

            c.contains("scroll") || c.contains("স্ক্রল") ->
                Result(true, phone.scroll("forward"), "নিচে scroll করেছি।")

            else -> null
        }
    }

    private fun nativeUrl(command: String): Result? {
        val url = extractUrl(command) ?: return null
        val ok = phone.openUrl(url)
        return Result(true, ok, if (ok) "Website খুলছি।" else "Website খুলতে পারিনি।")
    }

    private fun nativeClick(command: String): Result? {
        val c = command.trim()
        val marker = Regex("(?i)(click|tap|ক্লিক|চাপ)")
        val m = marker.find(c) ?: return null

        val before = c.substring(0, m.range.first).trim()
        val after = c.substring(m.range.last + 1).trim()
        val candidate = when {
            before.isNotBlank() -> before
            after.isNotBlank() -> after
            else -> return null
        }

        val target = candidate
            .replace(Regex("(?i)^(please|plz)\\s+"), "")
            .replace(Regex("(?i)\\s+(button|বাটন|e|এ|koro|করো|kore dew|করে দাও)$"), "")
            .trim()
        if (target.isBlank()) return null

        val ok = phone.clickText(target)
        return Result(true, ok, if (ok) target + " চাপেছি।" else target + " screen-এ পাইনি।")
    }

    private fun nativeType(command: String): Result? {
        val c = command.trim()
        val patterns = listOf(
            Regex("(?is)^type\\s+(.+)$"),
            Regex("(?is)^write\\s+(.+)$"),
            Regex("(?is)^লিখো\\s+(.+)$"),
            Regex("(?is)^টাইপ\\s+(.+)$")
        )
        val text = patterns.firstNotNullOfOrNull { it.find(c)?.groupValues?.getOrNull(1) }?.trim()
            ?: return null

        val ok = phone.typeText(text)
        return Result(true, ok, if (ok) "Text লিখেছি।" else "কোনো editable field focus করা নেই।")
    }

    private fun nativeOpenApp(command: String): Result? {
        val app = extractAppName(command) ?: return null
        if (app.contains(".") && extractUrl(command) != null) return null
        val ok = phone.openApp(app)
        return Result(
            handled = true,
            success = ok,
            message = if (ok) app + " খুলছি।" else app + " নামে installed app পাইনি।"
        )
    }

    private suspend fun executeCloudSkill(command: String): Result {
        val skills = store.skills()
        val normalized = normalize(" " + command + " ")

        for (i in 0 until skills.length()) {
            val skill = skills.optJSONObject(i) ?: continue
            if (skill.optString("status") != "active") continue
            if (!matches(skill, normalized)) continue

            when (skill.optString("handler")) {
                "open_app_from_command" -> nativeOpenApp(command)?.let { return it }
                "open_url_from_command" -> nativeUrl(command)?.let { return it }
                "modal_handler" -> return handleModal()
            }

            val actions = skill.optJSONArray("actions")
            if (actions != null && actions.length() > 0) {
                return runActions(skill.optString("name", "Cloud skill"), actions)
            }
        }

        return Result(false)
    }

    private fun matches(skill: JSONObject, command: String): Boolean {
        val any = skill.optJSONObject("match")?.optJSONArray("containsAny") ?: return false
        for (i in 0 until any.length()) {
            val token = normalize(any.optString(i))
            if (token.isNotBlank() && command.contains(token)) return true
        }
        return false
    }

    private suspend fun runActions(name: String, actions: JSONArray): Result {
        for (i in 0 until actions.length()) {
            val action = actions.optJSONObject(i) ?: continue
            val required = action.optBoolean("required", true)
            val ok = when (action.optString("op")) {
                "open_app" -> phone.openApp(action.optString("value"))
                "open_url" -> phone.openUrl(action.optString("value"))
                "click_text" -> phone.clickText(action.optString("value"))
                "click_text_any" -> clickAny(action.optJSONArray("values"))
                "type_text" -> phone.typeText(action.optString("value"))
                "scroll" -> phone.scroll(action.optString("direction", "forward"))
                "back" -> phone.back()
                "home" -> phone.home()
                "wait" -> {
                    delay(action.optLong("ms", 700L).coerceIn(100L, 5000L))
                    true
                }
                "say" -> true
                else -> false
            }

            if (!ok && required) {
                return Result(true, false, name + " এখানে আটকে গেছে। প্রয়োজনীয় screen element পাওয়া যায়নি।")
            }

            if (action.optString("op") != "wait") delay(450L)
        }

        return Result(true, true, name + " skill complete হয়েছে।")
    }

    private fun clickAny(values: JSONArray?): Boolean {
        if (values == null) return false
        for (i in 0 until values.length()) {
            val value = values.optString(i)
            if (value.isNotBlank() && phone.clickText(value)) return true
        }
        return false
    }

    private fun handleModal(): Result {
        val candidates = listOf("Close", "CLOSE", "Cancel", "CANCEL", "Later", "LATER", "Not now", "OK", "Got it")
        for (candidate in candidates) {
            if (phone.clickText(candidate)) {
                return Result(true, true, "Popup বন্ধ করেছি।")
            }
        }
        return Result(true, false, "পরিচিত popup button পাইনি।")
    }

    private fun extractUrl(command: String): String? {
        Regex("(?i)https?://[^\\s]+")
            .find(command)
            ?.value
            ?.trimEnd('.', ',', '।')
            ?.let { return it }

        val domain = Regex("(?i)(?:[a-z0-9-]+\\.)+(?:com|net|org|app|io|co|me|bd)(?:/[^\\s]*)?")
            .find(command)
            ?.value
            ?.trimEnd('.', ',', '।')
            ?: return null

        return "https://" + domain
    }

    private fun extractAppName(command: String): String? {
        val raw = command.trim()
        val patterns = listOf(
            Regex("(?is)^\\s*(?:open|ওপেন)\\s+(.+?)\\s*$"),
            Regex("(?is)^\\s*(.+?)\\s+(?:open|ওপেন)(?:\\s+(?:koro|করো|kore dew|করে দাও|please))?\\s*$"),
            Regex("(?is)^\\s*(.+?)\\s+(?:খুলো|খুলে দাও|চালু করো)\\s*$")
        )

        var value = patterns.firstNotNullOfOrNull { it.find(raw)?.groupValues?.getOrNull(1) } ?: return null
        value = value
            .replace(Regex("(?i)\\b(app|application)\\b"), " ")
            .replace(Regex("(?i)\\b(koro|please|plz)\\b"), " ")
            .replace("করো", " ")
            .replace("করে দাও", " ")
            .trim()
            .replace(Regex("\\s+"), " ")

        return value.takeIf { it.length in 2..80 }
    }

    private fun containsAny(value: String, vararg tokens: String): Boolean =
        tokens.any { value.contains(normalize(it)) }

    private fun normalize(value: String): String =
        value.lowercase().replace(Regex("\\s+"), " ").trim()
}
