package com.mirex.body.accessibility

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.Rect
import android.net.Uri
import android.os.Bundle
import android.view.Display
import android.view.Gravity
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.TextView
import com.mirex.body.agent.AgentBus
import com.mirex.body.agent.AgentRunner
import com.mirex.body.agent.ChatMessage
import com.mirex.body.agent.ChatRole
import com.mirex.body.cloud.CloudSkillStore
import com.mirex.body.cloud.VeyraCloudClient
import com.mirex.body.skills.LocalSkillEngine
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.ByteArrayOutputStream
import kotlin.coroutines.resume

class MirexAccessibilityService : AccessibilityService() {

    data class ScreenFrame(val base64Jpeg: String, val width: Int, val height: Int)

    companion object {
        @Volatile var instance: MirexAccessibilityService? = null
            private set
    }

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var taskJob: Job? = null
    private var stopOverlay: TextView? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        AgentBus.bodyConnected(true)
        AgentBus.status("Phone body connected")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit
    override fun onInterrupt() = Unit

    override fun onDestroy() {
        taskJob?.cancel()
        hideStopOverlay()
        serviceScope.cancel()
        if (instance === this) instance = null
        AgentBus.bodyConnected(false)
        AgentBus.running(false)
        AgentBus.status("Accessibility disconnected")
        super.onDestroy()
    }

    fun startAgentTask(task: String, apiKey: String, model: String) {
        startSmartTask(task, apiKey, model, allowAiFallback = true)
    }

    fun startSmartTask(
        task: String,
        apiKey: String,
        model: String,
        allowAiFallback: Boolean
    ) {
        if (taskJob?.isActive == true) return
        AgentBus.add(ChatMessage(ChatRole.User, task))
        AgentBus.running(true)
        AgentBus.status("Local check…")
        showStopOverlay()

        taskJob = serviceScope.launch(Dispatchers.IO) {
            try {
                val store = CloudSkillStore(this@MirexAccessibilityService)
                VeyraCloudClient(this@MirexAccessibilityService).syncSkills(force = false)

                val local = LocalSkillEngine(this@MirexAccessibilityService, store).execute(task)
                if (local.handled) {
                    val reply = local.message.ifBlank {
                        if (local.success) "Local task complete হয়েছে।" else "Local task complete করা যায়নি।"
                    }
                    AgentBus.add(ChatMessage(ChatRole.Assistant, reply))
                    AgentBus.status(if (local.success) "Done · Local" else "Local blocked")
                    AgentBus.speak(reply)
                    if (local.success) AgentBus.speak("টাস্ক কমপ্লিট। আর কিছু করতে হবে?")
                    return@launch
                }

                if (allowAiFallback && apiKey.isNotBlank()) {
                    AgentBus.status("AI fallback…")
                    AgentRunner(this@MirexAccessibilityService, apiKey, model).run(task)
                } else {
                    val reply = if (allowAiFallback && apiKey.isBlank()) {
                        "এই command-এর local skill এখনো নেই। AI fallback চালাতে API key লাগবে।"
                    } else {
                        "এই command-এর local skill এখনো নেই। Veyra Cloud-এ skill add করলে OpenAI ছাড়াই চালানো যাবে।"
                    }
                    AgentBus.add(ChatMessage(ChatRole.Assistant, reply))
                    AgentBus.status("Local skill needed")
                    AgentBus.speak(reply)
                    AgentBus.speak("আর কিছু করতে হবে?")
                }
            } catch (t: Throwable) {
                AgentBus.add(ChatMessage(ChatRole.System, "Stopped: ${t.message ?: t.javaClass.simpleName}"))
                AgentBus.status("Stopped")
            } finally {
                AgentBus.running(false)
                serviceScope.launch { hideStopOverlay() }
            }
        }
    }

    fun stopAgentTask() {
        taskJob?.cancel()
        taskJob = null
        AgentBus.running(false)
        AgentBus.status("Stopped by user")
        AgentBus.add(ChatMessage(ChatRole.System, "Task stopped by user."))
        hideStopOverlay()
    }

    suspend fun tap(x: Float, y: Float, durationMs: Long = 70L): Boolean {
        val path = Path().apply { moveTo(x, y) }
        val stroke = GestureDescription.StrokeDescription(path, 0L, durationMs.coerceAtLeast(1L))
        return dispatch(GestureDescription.Builder().addStroke(stroke).build())
    }

    suspend fun longPress(x: Float, y: Float, durationMs: Long = 700L): Boolean {
        val path = Path().apply { moveTo(x, y) }
        val stroke = GestureDescription.StrokeDescription(path, 0L, durationMs.coerceIn(500L, 3000L))
        return dispatch(GestureDescription.Builder().addStroke(stroke).build())
    }

    suspend fun swipe(x1: Float, y1: Float, x2: Float, y2: Float, durationMs: Long = 450L): Boolean {
        val path = Path().apply { moveTo(x1, y1); lineTo(x2, y2) }
        val stroke = GestureDescription.StrokeDescription(path, 0L, durationMs.coerceIn(80L, 2000L))
        return dispatch(GestureDescription.Builder().addStroke(stroke).build())
    }

    private suspend fun dispatch(gesture: GestureDescription): Boolean = suspendCancellableCoroutine { cont ->
        val accepted = dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                if (cont.isActive) cont.resume(true)
            }
            override fun onCancelled(gestureDescription: GestureDescription?) {
                if (cont.isActive) cont.resume(false)
            }
        }, null)
        if (!accepted && cont.isActive) cont.resume(false)
    }

    fun back(): Boolean = performGlobalAction(GLOBAL_ACTION_BACK)
    fun home(): Boolean = performGlobalAction(GLOBAL_ACTION_HOME)
    fun recents(): Boolean = performGlobalAction(GLOBAL_ACTION_RECENTS)

    fun typeText(text: String): Boolean {
        val focused = findFocusedEditable(rootInActiveWindow) ?: return false
        val args = Bundle().apply {
            putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
        }
        return focused.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
    }

    fun clickText(query: String): Boolean {
        val root = rootInActiveWindow ?: return false
        val q = query.trim()
        if (q.isEmpty()) return false
        val exact = root.findAccessibilityNodeInfosByText(q)
            .firstOrNull { visibleText(it).equals(q, true) || it.contentDescription?.toString().equals(q, true) }
        val node = exact ?: root.findAccessibilityNodeInfosByText(q).firstOrNull()
            ?: breadthFirst(root).firstOrNull {
                visibleText(it).contains(q, true) || (it.contentDescription?.toString()?.contains(q, true) == true)
            }
            ?: return false
        return clickNodeOrParent(node)
    }

    suspend fun clickTextSmart(query: String): Boolean {
        if (clickText(query)) return true
        val bounds = findTextBoundsByOcr(query) ?: return false
        return tap(bounds.exactCenterX(), bounds.exactCenterY())
    }

    private suspend fun findTextBoundsByOcr(query: String): Rect? {
        val q = query.trim()
        if (q.isBlank()) return null
        val frame = screenshot() ?: return null
        val bytes = runCatching {
            android.util.Base64.decode(frame.base64Jpeg, android.util.Base64.NO_WRAP)
        }.getOrNull() ?: return null
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null
        val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        val image = InputImage.fromBitmap(bitmap, 0)

        return suspendCancellableCoroutine { cont ->
            recognizer.process(image)
                .addOnSuccessListener { result ->
                    var partial: Rect? = null
                    var exact: Rect? = null

                    outer@ for (block in result.textBlocks) {
                        for (line in block.lines) {
                            if (line.text.equals(q, ignoreCase = true)) {
                                exact = line.boundingBox
                                break@outer
                            }
                            if (partial == null && line.text.contains(q, ignoreCase = true)) {
                                partial = line.boundingBox
                            }
                            for (element in line.elements) {
                                if (element.text.equals(q, ignoreCase = true)) {
                                    exact = element.boundingBox
                                    break@outer
                                }
                                if (partial == null && element.text.contains(q, ignoreCase = true)) {
                                    partial = element.boundingBox
                                }
                            }
                        }
                    }

                    if (cont.isActive) cont.resume(exact ?: partial)
                }
                .addOnFailureListener {
                    if (cont.isActive) cont.resume(null)
                }
                .addOnCompleteListener {
                    bitmap.recycle()
                    recognizer.close()
                }
        }
    }

    fun scroll(direction: String): Boolean {
        val root = rootInActiveWindow ?: return false
        val scrollable = breadthFirst(root).firstOrNull { it.isScrollable } ?: return false
        val action = if (direction.equals("backward", true)) {
            AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
        } else {
            AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
        }
        return scrollable.performAction(action)
    }

    private fun visibleText(node: AccessibilityNodeInfo): String = node.text?.toString().orEmpty()

    private fun clickNodeOrParent(node: AccessibilityNodeInfo): Boolean {
        var current: AccessibilityNodeInfo? = node
        repeat(5) {
            val n = current ?: return false
            if (n.isClickable && n.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true
            current = n.parent
        }
        return false
    }

    private fun breadthFirst(root: AccessibilityNodeInfo): Sequence<AccessibilityNodeInfo> = sequence {
        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(root)
        var count = 0
        while (queue.isNotEmpty() && count < 500) {
            val node = queue.removeFirst()
            yield(node)
            count++
            for (i in 0 until node.childCount) node.getChild(i)?.let(queue::add)
        }
    }

    private fun findFocusedEditable(root: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (root == null) return null
        root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)?.let { if (it.isEditable) return it }
        return breadthFirst(root).firstOrNull { it.isFocused && it.isEditable }
    }

    fun openUrl(url: String): Boolean {
        val normalized = if (url.startsWith("http://", true) || url.startsWith("https://", true)) {
            url
        } else {
            "https://" + url
        }
        return runCatching {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(normalized)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
            true
        }.getOrDefault(false)
    }

    fun openApp(appNameOrPackage: String): Boolean {
        val pm = packageManager
        pm.getLaunchIntentForPackage(appNameOrPackage)?.let { direct ->
            direct.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(direct)
            return true
        }
        @Suppress("DEPRECATION")
        val apps = pm.getInstalledApplications(0)
        val match = apps.firstOrNull {
            pm.getApplicationLabel(it).toString().equals(appNameOrPackage, ignoreCase = true)
        } ?: apps.firstOrNull {
            pm.getApplicationLabel(it).toString().contains(appNameOrPackage, ignoreCase = true)
        } ?: return false
        val intent = pm.getLaunchIntentForPackage(match.packageName) ?: return false
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(intent)
        return true
    }

    suspend fun screenshot(): ScreenFrame? = suspendCancellableCoroutine { cont ->
        takeScreenshot(Display.DEFAULT_DISPLAY, mainExecutor, object : TakeScreenshotCallback {
            override fun onSuccess(screenshot: ScreenshotResult) {
                val buffer = screenshot.hardwareBuffer
                val bitmap = Bitmap.wrapHardwareBuffer(buffer, screenshot.colorSpace)
                if (bitmap == null) {
                    buffer.close()
                    if (cont.isActive) cont.resume(null)
                    return
                }
                val copy = bitmap.copy(Bitmap.Config.ARGB_8888, false)
                buffer.close()
                val out = ByteArrayOutputStream()
                copy.compress(Bitmap.CompressFormat.JPEG, 72, out)
                val frame = ScreenFrame(
                    android.util.Base64.encodeToString(out.toByteArray(), android.util.Base64.NO_WRAP),
                    copy.width,
                    copy.height
                )
                copy.recycle()
                if (cont.isActive) cont.resume(frame)
            }
            override fun onFailure(errorCode: Int) {
                if (cont.isActive) cont.resume(null)
            }
        })
    }

    fun uiTree(maxNodes: Int = 180): String {
        val root = rootInActiveWindow ?: return "<no-active-window>"
        val out = StringBuilder()
        val queue = ArrayDeque<Pair<AccessibilityNodeInfo, Int>>()
        queue.add(root to 0)
        var count = 0
        while (queue.isNotEmpty() && count < maxNodes) {
            val (node, depth) = queue.removeFirst()
            val text = node.text?.toString()?.replace('\n', ' ')?.take(100).orEmpty()
            val desc = node.contentDescription?.toString()?.replace('\n', ' ')?.take(100).orEmpty()
            val id = node.viewIdResourceName?.takeLast(80).orEmpty()
            val cls = node.className?.toString()?.substringAfterLast('.') ?: "Node"
            if (text.isNotBlank() || desc.isNotBlank() || node.isClickable || node.isEditable || node.isScrollable) {
                val r = Rect().also(node::getBoundsInScreen)
                out.append("  ".repeat(depth.coerceAtMost(5))).append(cls)
                    .append(" bounds=[${r.left},${r.top},${r.right},${r.bottom}]")
                if (text.isNotBlank()) out.append(" text=\"").append(text).append("\"")
                if (desc.isNotBlank()) out.append(" desc=\"").append(desc).append("\"")
                if (id.isNotBlank()) out.append(" id=").append(id)
                if (node.isClickable) out.append(" clickable")
                if (node.isEditable) out.append(" editable")
                if (node.isScrollable) out.append(" scrollable")
                out.append('\n')
            }
            count++
            for (i in 0 until node.childCount) node.getChild(i)?.let { queue.add(it to depth + 1) }
        }
        return out.toString().take(18_000)
    }

    private fun showStopOverlay() {
        if (stopOverlay != null) return
        val wm = getSystemService(WINDOW_SERVICE) as WindowManager
        val view = TextView(this).apply {
            text = "VEYRA STOP"
            textSize = 12f
            setTextColor(0xFFFFFFFF.toInt())
            setBackgroundColor(0xE6B3261E.toInt())
            setPadding(24, 14, 24, 14)
            setOnClickListener { stopAgentTask() }
        }
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            x = 20
            y = 80
        }
        runCatching { wm.addView(view, params); stopOverlay = view }
    }

    private fun hideStopOverlay() {
        val view = stopOverlay ?: return
        stopOverlay = null
        runCatching { (getSystemService(WINDOW_SERVICE) as WindowManager).removeView(view) }
    }
}
