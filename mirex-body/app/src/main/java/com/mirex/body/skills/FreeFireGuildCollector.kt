package com.mirex.body.skills

import android.graphics.Rect
import com.mirex.body.accessibility.MirexAccessibilityService
import com.mirex.body.agent.AgentBus
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
        val nameBounds: Rect,
        val activityBounds: Rect
    )

    suspend fun run(): Result {
        AgentBus.status("Free Fire · opening")
        if (!phone.openApp("Free Fire")) {
            return Result(false, "Free Fire installed app পাওয়া যায়নি।")
        }

        delay(4800)
        dismissSimplePopups()

        if (!ensureMembersScreen()) {
            return Result(
                false,
                "Free Fire Members screen পর্যন্ত যেতে পারিনি। Guild/Member UI বদলে গেলে Teach Free Fire একবার চালান।"
            )
        }

        delay(900)

        val firstPage = phone.ocrItems()
        val expectedCount = extractMemberCount(firstPage)
        val members = linkedMapOf<String, Member>()
        var unreadable = 0
        var previousSignature = ""
        var repeatedPages = 0
        var pageNo = 0

        while (pageNo < 24) {
            pageNo++
            AgentBus.status(
                if (expectedCount != null) {
                    "Free Fire · ${members.size}/$expectedCount members"
                } else {
                    "Free Fire · scanning page $pageNo"
                }
            )

            val page = phone.ocrItems()
            if (!isMembersScreen(page)) {
                unreadable++
                if (!recoverMembersScreen()) break
                delay(650)
                continue
            }

            val rows = parseRows(page)
            if (rows.isEmpty()) unreadable++

            val signature = rows.joinToString("|") {
                normalizeName(it.name) + ":" + it.activity
            }

            if (signature.isNotBlank() && signature == previousSignature) {
                repeatedPages++
            } else {
                repeatedPages = 0
            }
            previousSignature = signature

            for (row in rows) {
                val nameKey = normalizeName(row.name)
                if (nameKey.isBlank() || members.containsKey(nameKey)) continue

                AgentBus.status("Free Fire · ${row.name} · ${row.activity} AP")
                val uid = readUidViaRecordedProfileFlow(row)
                members[nameKey] = Member(row.name, row.activity, uid)

                if (expectedCount != null && members.size >= expectedCount) break
            }

            if (expectedCount != null && members.size >= expectedCount) break
            if (repeatedPages >= 2) break

            val moved = phone.swipeGameRelative(
                nx1 = 0.50f,
                ny1 = 0.80f,
                nx2 = 0.50f,
                ny2 = 0.36f,
                durationMs = 500L
            )

            if (!moved) break
            delay(800)
        }

        if (members.isEmpty()) {
            return Result(
                false,
                "Members screen পেয়েছি, কিন্তু Name + Activity Point row reliable ভাবে পড়তে পারিনি। কোনো value guess করা হয়নি।",
                unreadableRows = unreadable
            )
        }

        val list = members.values.toList()
        val uidVerified = list.count { !it.uid.isNullOrBlank() }

        val lines = list.mapIndexed { index, member ->
            val uid = member.uid ?: "UID unreadable"
            "${index + 1}. ${member.name} — ${member.activity} AP — $uid"
        }

        val resultText = buildString {
            append("Free Fire Guild Activity scan complete.\n")
            append("Members noted: ${list.size}")
            if (expectedCount != null) append("/$expectedCount")
            append(" · UID verified: $uidVerified")
            if (unreadable > 0) append(" · Unreadable: $unreadable")
            append("\n\n")
            append(lines.joinToString("\n"))
            append("\n\nUnverified values were not invented.")
        }

        return Result(true, resultText, list, unreadable)
    }

    private suspend fun ensureMembersScreen(): Boolean {
        var items = phone.ocrItems()
        if (isMembersScreen(items)) return true

        if (!isGuildOverview(items)) {
            AgentBus.status("Free Fire · opening Guild")

            val openedGuild =
                clickAny("Guild", "GUILD", "Guilds") ||
                anchorMatcher.tap("guild_button") ||
                phone.tapGameRelative(0.91f, 0.72f)

            if (!openedGuild) return false
            delay(1400)
            items = phone.ocrItems()

            if (!isGuildOverview(items) && !isMembersScreen(items)) {
                return false
            }
        }

        if (isMembersScreen(items)) return true

        AgentBus.status("Free Fire · opening Members")
        val openedMembers =
            clickAny("Members", "MEMBERS", "MEMBERS ONLINE", "Member") ||
            anchorMatcher.tap("members_button") ||
            phone.tapGameRelative(0.10f, 0.22f)

        if (!openedMembers) return false
        delay(1000)

        items = phone.ocrItems()
        return isMembersScreen(items)
    }

    private suspend fun recoverMembersScreen(): Boolean {
        val items = phone.ocrItems()
        if (isMembersScreen(items)) return true

        if (isProfileScreen(items)) {
            phone.back()
            delay(700)
            return isMembersScreen(phone.ocrItems())
        }

        return false
    }

    private suspend fun readUidViaRecordedProfileFlow(row: RowCandidate): String? {
        if (!phone.tap(row.nameBounds.exactCenterX(), row.nameBounds.exactCenterY())) {
            return null
        }
        delay(380)

        var profileOpened = anchorMatcher.tap("profile_button")
        if (!profileOpened) {
            profileOpened = phone.tapGameRelative(0.94f, 0.78f)
        }
        if (!profileOpened) return null

        delay(900)
        var profileItems = phone.ocrItems()

        if (!isProfileScreen(profileItems)) {
            phone.tapGameRelative(0.94f, 0.72f)
            delay(750)
            profileItems = phone.ocrItems()
        }

        if (!isProfileScreen(profileItems)) return null

        val uid = extractUid(profileItems)

        phone.back()
        delay(650)

        if (!isMembersScreen(phone.ocrItems())) {
            phone.back()
            delay(500)
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
                    abs(item.bounds.centerX() - expectedX) +
                        abs(item.bounds.centerY() - expectedY)
                }

            nearby.firstOrNull()?.let { item ->
                uidRegex.find(item.text)?.value?.let { return it }
            }
        }

        return null
    }

    private fun parseRows(items: List<MirexAccessibilityService.OcrItem>): List<RowCandidate> {
        if (items.isEmpty()) return emptyList()

        val thisWeek = items.firstOrNull {
            it.text.contains("THIS WEEK", ignoreCase = true)
        }

        val statusHeader = items.firstOrNull {
            it.text.equals("STATUS", ignoreCase = true) ||
                it.text.startsWith("STATUS", ignoreCase = true)
        }

        val headerY = listOfNotNull(thisWeek, statusHeader)
            .map { it.bounds.bottom }
            .maxOrNull()
            ?: items.firstOrNull {
                it.text.contains("MEMBERS", ignoreCase = true)
            }?.bounds?.bottom
            ?: 0

        val width = items.maxOfOrNull { it.bounds.right }?.coerceAtLeast(1) ?: 1
        val height = items.maxOfOrNull { it.bounds.bottom }?.coerceAtLeast(1) ?: 1

        val learnedActivity = anchorStore.load("activity_point")
        val activityX = when {
            thisWeek != null -> thisWeek.bounds.centerX().toDouble()
            learnedActivity != null -> learnedActivity.normX.toDouble() * learnedActivity.screenWidth
            else -> width * 0.46
        }

        val statusX = statusHeader?.bounds?.centerX()?.toDouble() ?: width * 0.62
        val activityTolerance = (width * 0.075).coerceIn(55.0, 150.0)

        val numeric = items.mapNotNull { item ->
            val cleaned = item.text
                .replace(",", "")
                .replace(" ", "")
                .replace("O", "0", ignoreCase = true)

            val value = cleaned.toIntOrNull() ?: return@mapNotNull null
            if (value !in 0..999999) return@mapNotNull null

            val y = item.bounds.centerY()
            val x = item.bounds.centerX().toDouble()

            if (y <= headerY + 12) return@mapNotNull null
            if (y >= height * 0.93) return@mapNotNull null
            if (abs(x - activityX) > activityTolerance) return@mapNotNull null
            if (x >= statusX - 15) return@mapNotNull null

            item to value
        }

        if (numeric.isEmpty()) return emptyList()

        val ignored = listOf(
            "guild", "member", "members", "activity", "point", "points",
            "online", "offline", "level", "leader", "officer", "rank",
            "last online", "uid", "profile", "weekly", "today", "manage",
            "this week", "status", "leaderboard"
        )

        val rows = mutableListOf<RowCandidate>()

        for ((activityItem, activity) in numeric) {
            val y = activityItem.bounds.centerY()

            val names = items.filter { item ->
                val text = item.text.trim()
                if (text.length !in 2..32) return@filter false
                if (!text.any { ch -> ch.isLetter() }) return@filter false
                if (ignored.any { key -> text.contains(key, ignoreCase = true) }) return@filter false

                val sameRow = abs(item.bounds.centerY() - y) <= 48
                val leftOfActivity = item.bounds.right < activityItem.bounds.left - 18
                val insideList = item.bounds.centerY() > headerY + 12 &&
                    item.bounds.centerY() < height * 0.93

                sameRow && leftOfActivity && insideList
            }

            val learnedMember = anchorStore.load("member_row")
            val nameItem = if (learnedMember != null) {
                val expectedX = learnedMember.normX * learnedMember.screenWidth
                names.minByOrNull { item -> abs(item.bounds.centerX() - expectedX) }
            } else {
                names.maxByOrNull { it.bounds.right }
            } ?: continue

            rows += RowCandidate(
                name = nameItem.text.trim(),
                activity = activity,
                nameBounds = Rect(nameItem.bounds),
                activityBounds = Rect(activityItem.bounds)
            )
        }

        return rows
            .distinctBy { normalizeName(it.name) to it.activity }
            .sortedBy { it.nameBounds.top }
    }

    private fun extractMemberCount(items: List<MirexAccessibilityService.OcrItem>): Int? {
        val regex = Regex("(?<!\\d)(\\d{1,2})\\s*/\\s*(\\d{1,2})(?!\\d)")
        for (item in items) {
            val match = regex.find(item.text) ?: continue
            val current = match.groupValues.getOrNull(1)?.toIntOrNull() ?: continue
            val capacity = match.groupValues.getOrNull(2)?.toIntOrNull() ?: continue
            if (current in 1..capacity && capacity <= 100) return current
        }
        return null
    }

    private fun isGuildOverview(items: List<MirexAccessibilityService.OcrItem>): Boolean {
        val text = items.joinToString(" ") { it.text.lowercase() }
        return text.contains("overview") &&
            (text.contains("members") || text.contains("activity rewards"))
    }

    private fun isMembersScreen(items: List<MirexAccessibilityService.OcrItem>): Boolean {
        val text = items.joinToString(" ") { it.text.lowercase() }
        return text.contains("members") &&
            (text.contains("this week") || text.contains("status"))
    }

    private fun isProfileScreen(items: List<MirexAccessibilityService.OcrItem>): Boolean {
        val text = items.joinToString(" ") { it.text.lowercase() }
        return text.contains("profile") || text.contains("uid")
    }

    private suspend fun clickAny(vararg labels: String): Boolean {
        for (label in labels) {
            if (phone.clickTextSmart(label)) return true
        }
        return false
    }

    private suspend fun dismissSimplePopups() {
        val labels = listOf(
            "Close", "CLOSE", "Later", "LATER", "Not now", "OK", "Got it"
        )
        for (label in labels) {
            if (phone.clickTextSmart(label)) {
                delay(300)
                break
            }
        }
    }

    private fun normalizeName(value: String): String =
        value.lowercase().replace(Regex("\\s+"), " ").trim()
}
