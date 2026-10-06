package com.mirex.body.voice

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Build
import android.os.IBinder
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import androidx.core.app.ActivityCompat
import com.mirex.body.accessibility.MirexAccessibilityService
import com.mirex.body.agent.AgentBus
import com.mirex.body.agent.ChatMessage
import com.mirex.body.agent.ChatRole
import com.mirex.body.data.SecureKeyStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import java.util.Locale
import java.util.concurrent.atomic.AtomicInteger

class VoiceControlService : Service(), RecognitionListener {

    companion object {
        const val ACTION_START = "com.veyra.body.voice.START"
        const val ACTION_STOP = "com.veyra.body.voice.STOP"

        val active = MutableStateFlow(false)
        val status = MutableStateFlow("Call mode off")

        private const val CHANNEL_ID = "veyra_voice"
        private const val NOTIFICATION_ID = 7102
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var recognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var listening = false
    private var speaking = false
    private var restartJob: Job? = null
    private val utteranceCounter = AtomicInteger(0)
    private var autoLanguageEnabled = Build.VERSION.SDK_INT >= 34
    private var detectedLanguageTag: String? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        setupSpeechRecognizer()
        setupTts()

        scope.launch {
            AgentBus.running.collect { isRunning ->
                if (!active.value) return@collect
                if (isRunning) {
                    pauseListening("Veyra is working…")
                } else if (!speaking) {
                    scheduleListening(700L)
                }
            }
        }

        scope.launch {
            AgentBus.voiceEvents.collect { text ->
                if (active.value) speak(text)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopSelf()
                return START_NOT_STICKY
            }
            else -> {
                startForeground(NOTIFICATION_ID, buildNotification("Listening for commands"))
                active.value = true
                status.value = "Listening…"
                speak("Veyra call mode চালু হয়েছে। বলুন, কী করতে হবে?")
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        restartJob?.cancel()
        runCatching { recognizer?.cancel() }
        runCatching { recognizer?.destroy() }
        recognizer = null
        runCatching { tts?.stop() }
        runCatching { tts?.shutdown() }
        tts = null
        listening = false
        speaking = false
        active.value = false
        status.value = "Call mode off"
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun setupSpeechRecognizer() {
        if (SpeechRecognizer.isRecognitionAvailable(this)) {
            recognizer = SpeechRecognizer.createSpeechRecognizer(this).also {
                it.setRecognitionListener(this)
            }
        } else {
            status.value = "Speech recognition unavailable"
        }
    }

    private fun setupTts() {
        tts = TextToSpeech(this) { initStatus ->
            if (initStatus == TextToSpeech.SUCCESS) {
                val engine = tts ?: return@TextToSpeech
                val bn = Locale("bn", "BD")
                val result = engine.setLanguage(bn)
                if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                    engine.language = Locale.getDefault()
                }
                engine.setSpeechRate(1.02f)
                engine.setPitch(1.0f)
                engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {
                        speaking = true
                        pauseListening("Veyra speaking…")
                    }

                    override fun onDone(utteranceId: String?) {
                        speaking = false
                        if (active.value && !AgentBus.running.value) scheduleListening(450L)
                    }

                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) {
                        speaking = false
                        if (active.value && !AgentBus.running.value) scheduleListening(450L)
                    }
                })
            }
        }
    }

    private fun speak(text: String) {
        val clean = text.trim().take(500)
        if (clean.isBlank()) return
        val engine = tts ?: return
        speaking = true
        pauseListening("Veyra speaking…")
        val id = "veyra-${utteranceCounter.incrementAndGet()}"
        engine.speak(clean, TextToSpeech.QUEUE_ADD, null, id)
        status.value = "Veyra speaking…"
        updateNotification(clean.take(55))
    }

    private fun scheduleListening(delayMs: Long) {
        if (!active.value || AgentBus.running.value || speaking) return
        restartJob?.cancel()
        restartJob = scope.launch {
            delay(delayMs)
            startListening()
        }
    }

    private fun startListening() {
        if (!active.value || AgentBus.running.value || speaking || listening) return
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            status.value = "Microphone permission required"
            updateNotification("Microphone permission required")
            return
        }

        val speech = recognizer ?: run {
            status.value = "Speech recognition unavailable"
            return
        }

        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, packageName)

            if (Build.VERSION.SDK_INT >= 34 && autoLanguageEnabled) {
                putExtra(RecognizerIntent.EXTRA_ENABLE_LANGUAGE_DETECTION, true)
                putExtra(
                    RecognizerIntent.EXTRA_ENABLE_LANGUAGE_SWITCH,
                    RecognizerIntent.LANGUAGE_SWITCH_BALANCED
                )
            } else {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag())
            }
        }

        runCatching {
            listening = true
            status.value = "Listening…"
            updateNotification("Listening for a command")
            speech.startListening(i)
        }.onFailure {
            listening = false
            status.value = "Voice retrying…"
            scheduleListening(900L)
        }
    }

    private fun pauseListening(message: String) {
        restartJob?.cancel()
        if (listening) runCatching { recognizer?.cancel() }
        listening = false
        status.value = message
        updateNotification(message)
    }

    private fun handleCommand(text: String) {
        val command = text.trim()
        if (command.length < 2) {
            scheduleListening(500L)
            return
        }

        val normalized = command.lowercase()
        if (normalized == "স্টপ" || normalized == "থামো" || normalized == "stop" || normalized.contains("কাজ বন্ধ")) {
            MirexAccessibilityService.instance?.stopAgentTask()
            AgentBus.speak("ঠিক আছে, থামিয়ে দিয়েছি। আর কিছু করতে হবে?")
            return
        }

        val body = MirexAccessibilityService.instance
        if (body == null) {
            AgentBus.add(ChatMessage(ChatRole.System, "Voice command heard: $command\nVeyra Accessibility is OFF."))
            AgentBus.speak("Veyra Accessibility বন্ধ আছে। আগে Accessibility চালু করুন।")
            return
        }

        val secure = SecureKeyStore(this)
        val key = secure.loadApiKey()
        val model = secure.loadModel().ifBlank { "gpt-6-astra" }
        val allowAiFallback = secure.loadAiFallback()

        status.value = "Command: $command"
        updateNotification("Executing: ${command.take(42)}")
        body.startSmartTask(command, key, model, allowAiFallback)
    }

    private fun createNotificationChannel() {
        val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "Veyra Call Mode", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Keeps Veyra listening while you use other apps."
                setShowBadge(false)
            }
        )
    }

    private fun buildNotification(text: String): Notification =
        Notification.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentTitle("Veyra Call Mode ON")
            .setContentText(text)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build()

    private fun updateNotification(text: String) {
        val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildNotification(text))
    }

    override fun onReadyForSpeech(params: Bundle?) {
        status.value = "Speak now…"
        updateNotification("Speak now")
    }

    override fun onBeginningOfSpeech() {
        status.value = "Hearing you…"
    }

    override fun onRmsChanged(rmsdB: Float) = Unit
    override fun onBufferReceived(buffer: ByteArray?) = Unit

    override fun onEndOfSpeech() {
        status.value = "Understanding…"
    }

    override fun onError(error: Int) {
        listening = false
        if (!active.value || AgentBus.running.value || speaking) return

        if (Build.VERSION.SDK_INT >= 34 &&
            (error == SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED ||
                error == SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE)
        ) {
            autoLanguageEnabled = false
            status.value = "Language auto-switch unavailable · using device language"
            scheduleListening(500L)
            return
        }

        val retry = when (error) {
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> 1200L
            SpeechRecognizer.ERROR_NO_MATCH,
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> 350L
            else -> 800L
        }
        scheduleListening(retry)
    }

    override fun onLanguageDetection(results: Bundle) {
        if (Build.VERSION.SDK_INT < 34) return
        val tag = results.getString(SpeechRecognizer.DETECTED_LANGUAGE).orEmpty()
        if (tag.isBlank()) return

        detectedLanguageTag = tag
        status.value = "Hearing · " + tag

        val engine = tts ?: return
        val locale = Locale.forLanguageTag(tag)
        val availability = engine.isLanguageAvailable(locale)
        if (availability >= TextToSpeech.LANG_AVAILABLE) {
            engine.language = locale
        }
    }

    override fun onResults(results: Bundle?) {
        listening = false
        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION).orEmpty()
        val command = matches.firstOrNull().orEmpty()
        if (command.isBlank()) scheduleListening(400L) else handleCommand(command)
    }

    override fun onPartialResults(partialResults: Bundle?) {
        val text = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            ?.firstOrNull()
            .orEmpty()
        if (text.isNotBlank()) status.value = "Hearing: ${text.take(45)}"
    }

    override fun onEvent(eventType: Int, params: Bundle?) = Unit
}
