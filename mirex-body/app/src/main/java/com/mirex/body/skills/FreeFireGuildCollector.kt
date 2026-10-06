package com.mirex.body.skills

import android.graphics.Rect
import com.mirex.body.accessibility.MirexAccessibilityService
import com.mirex.body.vision.VisualAnchorMatcher
import com.mirex.body.vision.VisualAnchorStore
import kotlinx.coroutines.delay
import kotlin.math.abs

class FreeFireGuildCollector(
    private val phone: MirexAccessibilityService
) {
    private val anchorStore = VisualAnchorStore(phone)
    private val anchorMatcher = VisualAnchorMatcher(phone, anchorStore)
    data class Member(
        val name: String,
        val activity: Int,
        val uid: String?
    )

    data class Result(
        val success: Boolean,
        val message: String,
        val members: List<Member> = emptyList(),
        val unreadableRows: Int = 0
    )

    private data class RowCandidate(
        val name: String,
        val activity: Int,
        val nameBounds: Rect
    )

    suspend fun run(): Result {
        if (!phone.openApp("Free Fire")) {
            return Result(false, "Free Fire installed app পাওয়া যায়নি।")
        }

        delay(5000)
        dismissSimplePopups()

        if (!clickAny("Guild", "GUILD", "Guilds") && !anchorMatcher.tap("guild_button")) {
            val teachHint = if (anchorStore.has("guild_button")) {
                "Learned Guild anchor match হয়নি। Teach Free Fire আবার চালান।"
            } else {
                "Guild icon text নয়। আগে Veyra-তে Teach Free Fire চালিয়ে Guild icon শেখান।"
            }
            return Result(false, teachHint)
        }

        delay(1800)
        dismissSimplePopups()

        if (!clickAny("Members", "MEMBERS", "Member", "Members List", "Member List") &&
            !anchorMatcher.tap("members_button")
        ) {
            val teachHint = if (anchorStore.has("members_button")) {
                "Learned Members anchor match হয়নি। Teach Free Fire আবার চালান।"
            } else {
                "Members button পাওয়া যায়নি। আগে Teach Free Fire দিয়ে Members শেখান।"
            }
            return Result(false, teachHint)
        }

        delay(1500)

        val members = linkedMapOf<String, Member>()
        var unreadable = 0
        var previousSignature = ""
        var repeatedPages = 0
        var finished = false

        repeat(18) {
            if (finished) return@repeat

            val page = phone.ocrItems()
            if (page.isEmpty()) {
                unreadable++
                if (!phone.swipePageUp()) finished = true
                delay(850)
                return@repeat
            }

            val signature = pageSignature(page)
            if (signature == previousSignature) repeatedPages++ else repeatedPages = 0
            if (repeatedPages >= 2) {
                finished = true
                return@repeat
            }
            previousSignature = signature

            val rows = parseRows(page)
            if (rows.isEmpty()) unreadable++

            for (row in rows) {
                val key = row.name.lowercase().replace(Regex("\\s+"), " ").trim()
                if (key.isBlank() || members.containsKey(key)) continue

                val uid = tryReadUidFromProfile(row, page)
                members[key] = Member(row.name, row.activity, uid)
            }

            if (!phone.swipePageUp()) {
                finished = true
            } else {
                delay(900)
            }
        }

        if (members.isEmpty()) {
            return Result(
                false,
                "Guild Members screen পর্যন্ত গেছি, কিন্তু Name + Activity Point row নির্ভরযোগ্যভাবে পড়তে পারিনি। কোনো value guess করা হয়নি।",
                unreadableRows = unreadable
            )
        }

        val list = members.values.toList()
        val lines = list.mapIndexed { index, member ->
            val uid = member.uid ?: "UID unreadable"
            "${index + 1}. ${member.name} — ${member.activity} AP — $uid"
        }

        val resultText = buildString {
            append("Free Fire Guild Activity scan complete.\n")
            append("Verified members: ${list.size}")
            if (unreadable > 0) append(" · Unreadable pages/rows: $unreadable")
            append("\n\n")
            append(lines.joinToString("\n"))
            append("\n\nOnly OCR-verified Name/Activity values are listed; unreadable values were not invented.")
        }

        return Result(true, resultText, list, unreadable)
    }

    private suspend fun tryReadUidFromProfile(
        row: RowCandidate,
        beforeItems: List<MirexAccessibilityService.OcrItem>
    ): String? {
        val beforeSignature = pageSignature(beforeItems)

        if (!phone.tap(row.nameBounds.exactCenterX(), row.nameBounds.exactCenterY())) {
            return null
        }

        delay(750)
        val profileItems = phone.ocrItems()
        if (profileItems.isEmpty()) return null

        val afterSignature = pageSignature(profileItems)
        val changed = beforeSignature != afterSignature
        val uid = extractUid(profileItems)

        if (changed) {
            phone.back()
            delay(550)
        }

        return uid
    }

    private fun extractUid(items: List<MirexAccessibilityService.OcrItem>): String? {
        val uidRegex = Regex("(?<!\\d)\\d{7,12}(?!\\d)")

        for (item in items) {
            if (item.text.contains("UID", ignoreCase = true)) {
                uidRegex.find(item.text)?.value?.let { return it }
            }
        }

        val learned = anchorStore.load("uid_field")
        if (learned != null) {
            val expectedX = learned.normX * learned.screenWidth
            val expectedY = learned.normY * learned.screenHeight
            val nearby = items
                .filter { uidRegex.containsMatchIn(it.text) }
                .sortedBy { item ->
                    abs(item.bounds.centerX() - expectedX) + abs(item.bounds.centerY() - expectedY)
                }
            for (item in nearby) {
                uidRegex.find(item.text)?.value?.let { return it }
            }
        }

        for (item in items) {
            uidRegex.find(item.text)?.value?.let { return it }
        }

        return null
    }

    private fun parseRows(items: List<MirexAccessibilityService.OcrItem>): List<RowCandidate> {
        if (items.isEmpty()) return emptyList()

        val width = items.maxOfOrNull { it.bounds.right }?.coerceAtLeast(1) ?: 1
        val height = items.maxOfOrNull { it.bounds.bottom }?.coerceAtLeast(1) ?: 1

        val numeric = items.mapNotNull { item ->
            val digits = item.text.replace(",", "").replace(" ", "")
            val value = digits.toIntOrNull() ?: return@mapNotNull null
            if (value < 0 || value > 999999) return@mapNotNull null
            if (item.bounds.centerX() < width * 0.42) return@mapNotNull null
            if (item.bounds.centerY() < height * 0.18 || item.bounds.centerY() > height * 0.93) return@mapNotNull null
            item to value
        }

        if (numeric.isEmpty()) return emptyList()

        val learnedActivity = anchorStore.load("activity_point")
        val activityColumnX = learnedActivity?.let {
            it.normX.toDouble() * it.screenWidth.toDouble()
        } ?: numeric
            .groupBy { (item, _) -> item.bounds.centerX() / 80 }
            .maxByOrNull { it.value.size }
            ?.value
            ?.map { it.first.bounds.centerX() }
            ?.average()
            ?: return emptyList()

        val tolerance = if (learnedActivity != null) 150.0 else 100.0
        val activityItems = numeric.filter { (item, _) ->
            abs(item.bounds.centerX().toDouble() - activityColumnX) <= tolerance
        }

        val ignored = listOf(
            "guild", "member", "members", "activity", "point", "points",
            "online", "offline", "level", "leader", "officer", "rank",
            "last online", "uid", "profile", "weekly", "today"
        )

        val rows = mutableListOf<RowCandidate>()

        for ((activityItem, activity) in activityItems) {
            val y = activityItem.bounds.centerY()
            val names = items.filter { item ->
                val text = item.text.trim()
                val hasNameChar = text.any { ch -> ch.isLetter() }
                val sameRow = abs(item.bounds.centerY() - y) <= 55
                val leftOfActivity = item.bounds.centerX() < activityItem.bounds.centerX() - 30
                val sensible = text.length in 2..32 && ignored.none { key -> text.equals(key, true) }
                hasNameChar && sameRow && leftOfActivity && sensible
            }

            val learnedMember = anchorStore.load("member_row")
            val nameItem = if (learnedMember != null) {
                val expectedX = learnedMember.normX * learnedMember.screenWidth
                names.minByOrNull { item -> abs(item.bounds.centerX() - expectedX) }
            } else {
                names.maxByOrNull { it.bounds.left }
            } ?: continue
            val name = nameItem.text.trim()
            if (ignored.any { key -> name.contains(key, true) }) continue

            rows += RowCandidate(name, activity, Rect(nameItem.bounds))
        }

        return rows.distinctBy { it.name.lowercase() to it.activity }
    }

    private suspend fun clickAny(vararg labels: String): Boolean {
        for (label in labels) {
            if (phone.clickTextSmart(label)) return true
        }
        return false
    }

    private suspend fun dismissSimplePopups() {
        val labels = listOf("Close", "CLOSE", "Later", "LATER", "Not now", "OK", "Got it")
        for (label in labels) {
            if (phone.clickTextSmart(label)) {
                delay(350)
                break
            }
        }
    }

    private fun pageSignature(items: List<MirexAccessibilityService.OcrItem>): String =
        items.asSequence()
            .map { it.text.lowercase().trim() }
            .filter { it.isNotBlank() }
            .take(40)
            .sorted()
            .joinToString("|")
            .take(2500)
}
