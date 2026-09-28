package com.mirex.body.agent

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow

sealed interface ChatRole { data object User : ChatRole; data object Assistant : ChatRole; data object System : ChatRole }
data class ChatMessage(val role: ChatRole, val text: String)

object AgentBus {
    private val _messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val messages = _messages.asStateFlow()

    private val _status = MutableStateFlow("Ready")
    val status = _status.asStateFlow()

    private val _running = MutableStateFlow(false)
    val running = _running.asStateFlow()

    private val _bodyConnected = MutableStateFlow(false)
    val bodyConnected = _bodyConnected.asStateFlow()

    private val _voiceEvents = MutableSharedFlow<String>(extraBufferCapacity = 16)
    val voiceEvents = _voiceEvents.asSharedFlow()

    fun add(message: ChatMessage) { _messages.value = _messages.value + message }
    fun status(value: String) { _status.value = value }
    fun running(value: Boolean) { _running.value = value }
    fun bodyConnected(value: Boolean) { _bodyConnected.value = value }

    fun speak(text: String) {
        val clean = text.trim()
        if (clean.isNotEmpty()) _voiceEvents.tryEmit(clean)
    }

    fun compactContext(limit: Int = 6): String =
        _messages.value.takeLast(limit).joinToString("\n") { msg ->
            val role = when (msg.role) {
                ChatRole.User -> "User"
                ChatRole.Assistant -> "Veyra"
                ChatRole.System -> "System"
            }
            "$role: ${msg.text.replace("\n", " ").take(360)}"
        }.take(2200)
}
