package com.mirex.body.vision

import android.graphics.Color
import android.graphics.PixelFormat
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import com.mirex.body.accessibility.MirexAccessibilityService
import com.mirex.body.agent.AgentBus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class FreeFireTeachSession(
    private val phone: MirexAccessibilityService,
    private val scope: CoroutineScope
) {
    private data class Step(
        val key: String,
        val prompt: String,
        val forwardTap: Boolean
    )

    private val steps = listOf(
        Step("guild_button", "1/5 · Free Fire lobby-তে Guild icon-এ tap করুন", true),
        Step("members_button", "2/5 · Guild screen-এ Members button/tab-এ tap করুন", true),
        Step("activity_point", "3/5 · Member list-এ যেকোনো member-এর Activity Point number-এ tap করুন", false),
        Step("member_row", "4/5 · একই member-এর Name/row-এ tap করুন — profile open হবে", true),
        Step("uid_field", "5/5 · Profile-এ UID number/UID area-তে tap করুন", false)
    )

    private val store = VisualAnchorStore(phone)
    private val wm = phone.getSystemService(android.content.Context.WINDOW_SERVICE) as WindowManager
    private var overlay: FrameLayout? = null
    private var index = 0
    private var active = false

    fun start() {
        if (active) return
        active = true
        index = 0
        store.clearFreeFire()
        AgentBus.status("Teach Free Fire · starting")
        AgentBus.speak("Free Fire skill শেখানো শুরু করছি। নির্দেশনা দেখে tap করুন।")

        scope.launch {
            phone.openApp("Free Fire")
            delay(4200)
            showStep()
        }
    }

    fun cancel() {
        active = false
        removeOverlay()
        AgentBus.status("Teach cancelled")
        AgentBus.speak("Teach mode বন্ধ করেছি।")
    }

    private fun showStep() {
        if (!active || index !in steps.indices) return
        removeOverlay()

        val root = FrameLayout(phone).apply {
            setBackgroundColor(Color.TRANSPARENT)
        }

        val instruction = TextView(phone).apply {
            text = steps[index].prompt
            textSize = 16f
            setTextColor(Color.WHITE)
            setBackgroundColor(0xE61A1D23.toInt())
            setPadding(24, 18, 24, 18)
        }
        val topParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.TOP
            topMargin = 70
            leftMargin = 24
            rightMargin = 24
        }
        root.addView(instruction, topParams)

        val controls = LinearLayout(phone).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
        }

        val pause = TextView(phone).apply {
            text = "PAUSE 15s"
            textSize = 13f
            setTextColor(Color.WHITE)
            setBackgroundColor(0xDD3A3F49.toInt())
            setPadding(28, 18, 28, 18)
            setOnClickListener {
                removeOverlay()
                scope.launch {
                    delay(15_000)
                    showStep()
                }
            }
        }

        val cancel = TextView(phone).apply {
            text = "CANCEL"
            textSize = 13f
            setTextColor(Color.WHITE)
            setBackgroundColor(0xDDB3261E.toInt())
            setPadding(28, 18, 28, 18)
            setOnClickListener { cancel() }
        }

        controls.addView(pause)
        controls.addView(cancel)

        val bottomParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            bottomMargin = 70
        }
        root.addView(controls, bottomParams)

        root.setOnTouchListener { _, event ->
            if (event.action == MotionEvent.ACTION_UP) {
                val x = event.rawX
                val y = event.rawY
                onTeachTap(x, y)
            }
            true
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )

        runCatching {
            wm.addView(root, params)
            overlay = root
            AgentBus.status(steps[index].prompt)
        }
    }

    private fun onTeachTap(x: Float, y: Float) {
        if (!active || index !in steps.indices) return
        val step = steps[index]
        removeOverlay()

        scope.launch {
            delay(120)
            val frame = phone.screenshot()
            val saved = frame?.let { store.saveFromFrame(step.key, it, x, y) } == true

            if (!saved) {
                AgentBus.status("Teach capture failed · retry")
                AgentBus.speak("Screen capture হয়নি। আবার tap করুন।")
                delay(500)
                showStep()
                return@launch
            }

            if (step.forwardTap) {
                phone.tap(x, y)
                delay(850)
            } else {
                delay(250)
            }

            index++
            if (index >= steps.size) {
                active = false
                AgentBus.status("Free Fire taught ✓")
                AgentBus.speak("Free Fire skill শেখানো complete হয়েছে। এখন Guild Activity scan চালাতে পারবেন।")
                return@launch
            }

            showStep()
        }
    }

    private fun removeOverlay() {
        val view = overlay ?: return
        overlay = null
        runCatching { wm.removeView(view) }
    }
}
