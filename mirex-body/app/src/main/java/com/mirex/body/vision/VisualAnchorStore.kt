package com.mirex.body.vision

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import com.mirex.body.accessibility.MirexAccessibilityService
import org.json.JSONObject
import java.io.ByteArrayOutputStream

class VisualAnchorStore(context: Context) {
    data class Anchor(
        val key: String,
        val templateBase64: String,
        val normX: Float,
        val normY: Float,
        val cropWidth: Int,
        val cropHeight: Int,
        val screenWidth: Int,
        val screenHeight: Int
    )

    private val prefs = context.getSharedPreferences("veyra_visual_anchors", Context.MODE_PRIVATE)

    fun has(key: String): Boolean = prefs.contains(key)

    fun clearFreeFire() {
        listOf("guild_button", "members_button", "activity_point", "member_row", "uid_field")
            .forEach { prefs.edit().remove(it).apply() }
    }

    fun saveFromFrame(
        key: String,
        frame: MirexAccessibilityService.ScreenFrame,
        x: Float,
        y: Float,
        cropSize: Int = 160
    ): Boolean {
        val bytes = runCatching {
            Base64.decode(frame.base64Jpeg, Base64.NO_WRAP)
        }.getOrNull() ?: return false

        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return false
        return try {
            val half = cropSize / 2
            val left = (x.toInt() - half).coerceIn(0, (bitmap.width - 1).coerceAtLeast(0))
            val top = (y.toInt() - half).coerceIn(0, (bitmap.height - 1).coerceAtLeast(0))
            val right = (x.toInt() + half).coerceIn(left + 1, bitmap.width)
            val bottom = (y.toInt() + half).coerceIn(top + 1, bitmap.height)
            val crop = Bitmap.createBitmap(bitmap, left, top, right - left, bottom - top)
            val out = ByteArrayOutputStream()
            crop.compress(Bitmap.CompressFormat.JPEG, 88, out)
            crop.recycle()

            val json = JSONObject().apply {
                put("key", key)
                put("template", Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP))
                put("normX", x / frame.width.toFloat())
                put("normY", y / frame.height.toFloat())
                put("cropWidth", right - left)
                put("cropHeight", bottom - top)
                put("screenWidth", frame.width)
                put("screenHeight", frame.height)
            }
            prefs.edit().putString(key, json.toString()).apply()
            true
        } finally {
            bitmap.recycle()
        }
    }

    fun load(key: String): Anchor? {
        val raw = prefs.getString(key, null) ?: return null
        return runCatching {
            val j = JSONObject(raw)
            Anchor(
                key = j.getString("key"),
                templateBase64 = j.getString("template"),
                normX = j.getDouble("normX").toFloat(),
                normY = j.getDouble("normY").toFloat(),
                cropWidth = j.getInt("cropWidth"),
                cropHeight = j.getInt("cropHeight"),
                screenWidth = j.getInt("screenWidth"),
                screenHeight = j.getInt("screenHeight")
            )
        }.getOrNull()
    }
}
