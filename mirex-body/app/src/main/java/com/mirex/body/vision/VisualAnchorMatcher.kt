package com.mirex.body.vision

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.PointF
import android.util.Base64
import com.mirex.body.accessibility.MirexAccessibilityService
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

class VisualAnchorMatcher(
    private val phone: MirexAccessibilityService,
    private val store: VisualAnchorStore
) {
    suspend fun find(key: String, maxScore: Double = 0.26): PointF? {
        val anchor = store.load(key) ?: return null
        val frame = phone.screenshot() ?: return null

        val screenBytes = runCatching {
            Base64.decode(frame.base64Jpeg, Base64.NO_WRAP)
        }.getOrNull() ?: return null
        val templateBytes = runCatching {
            Base64.decode(anchor.templateBase64, Base64.NO_WRAP)
        }.getOrNull() ?: return null

        val screen = BitmapFactory.decodeByteArray(screenBytes, 0, screenBytes.size) ?: return null
        val template = BitmapFactory.decodeByteArray(templateBytes, 0, templateBytes.size) ?: run {
            screen.recycle()
            return null
        }

        return try {
            val expectedX = (anchor.normX * screen.width).toInt()
            val expectedY = (anchor.normY * screen.height).toInt()
            val radiusX = max(90, (screen.width * 0.14f).toInt())
            val radiusY = max(90, (screen.height * 0.10f).toInt())
            val halfW = template.width / 2
            val halfH = template.height / 2

            val minX = max(halfW, expectedX - radiusX)
            val maxX = min(screen.width - halfW - 1, expectedX + radiusX)
            val minY = max(halfH, expectedY - radiusY)
            val maxY = min(screen.height - halfH - 1, expectedY + radiusY)

            if (minX >= maxX || minY >= maxY) {
                null
            } else {
                var bestScore = Double.MAX_VALUE
                var bestX = expectedX
                var bestY = expectedY

                val exact = scoreAt(screen, template, expectedX, expectedY)
                if (exact < bestScore) {
                    bestScore = exact
                    bestX = expectedX
                    bestY = expectedY
                }

                var y = minY
                while (y <= maxY) {
                    var x = minX
                    while (x <= maxX) {
                        val score = scoreAt(screen, template, x, y)
                        if (score < bestScore) {
                            bestScore = score
                            bestX = x
                            bestY = y
                        }
                        x += 8
                    }
                    y += 8
                }

                if (bestScore <= maxScore) PointF(bestX.toFloat(), bestY.toFloat()) else null
            }
        } finally {
            screen.recycle()
            template.recycle()
        }
    }

    suspend fun tap(key: String): Boolean {
        val point = find(key) ?: return false
        return phone.tap(point.x, point.y)
    }

    private fun scoreAt(screen: Bitmap, template: Bitmap, centerX: Int, centerY: Int): Double {
        val left = centerX - template.width / 2
        val top = centerY - template.height / 2
        if (left < 0 || top < 0 || left + template.width >= screen.width || top + template.height >= screen.height) {
            return Double.MAX_VALUE
        }

        val grid = 20
        var total = 0.0
        var count = 0

        for (gy in 0 until grid) {
            val ty = ((gy + 0.5f) * template.height / grid).toInt().coerceIn(0, template.height - 1)
            val sy = top + ty
            for (gx in 0 until grid) {
                val tx = ((gx + 0.5f) * template.width / grid).toInt().coerceIn(0, template.width - 1)
                val sx = left + tx

                val a = template.getPixel(tx, ty)
                val b = screen.getPixel(sx, sy)

                val ar = (a shr 16) and 0xff
                val ag = (a shr 8) and 0xff
                val ab = a and 0xff
                val br = (b shr 16) and 0xff
                val bg = (b shr 8) and 0xff
                val bb = b and 0xff

                total += (abs(ar - br) + abs(ag - bg) + abs(ab - bb)) / (255.0 * 3.0)
                count++
            }
        }

        return if (count == 0) Double.MAX_VALUE else total / count
    }
}
