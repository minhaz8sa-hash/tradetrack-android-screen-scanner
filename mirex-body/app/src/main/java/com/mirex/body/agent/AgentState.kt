package com.mirex.body.agent

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

object AgentState {
    private val _stopRequested = MutableStateFlow(false)
    val stopRequested = _stopRequested.asStateFlow()

    fun requestStop() { _stopRequested.value = true }
    fun resetStop() { _stopRequested.value = false }
}
