package com.mirex.body

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.mirex.body.accessibility.MirexAccessibilityService
import com.mirex.body.agent.AgentBus
import com.mirex.body.agent.ChatRole
import com.mirex.body.data.SecureKeyStore
import com.mirex.body.voice.VoiceControlService

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val secure = SecureKeyStore(this)
        setContent {
            VeyraTheme {
                VeyraScreen(
                    loadKey = secure::loadApiKey,
                    saveKey = secure::saveApiKey,
                    loadModel = secure::loadModel,
                    saveModel = secure::saveModel,
                    openAccessibility = {
                        startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                    }
                )
            }
        }
    }
}

@Composable
private fun VeyraTheme(content: @Composable () -> Unit) {
    val scheme = darkColorScheme(
        primary = Color(0xFF8AB4F8),
        background = Color(0xFF0D0F12),
        surface = Color(0xFF15181D),
        surfaceVariant = Color(0xFF20242B),
        onBackground = Color(0xFFE9EDF2),
        onSurface = Color(0xFFE9EDF2)
    )
    MaterialTheme(colorScheme = scheme, typography = Typography(), content = content)
}

@Composable
private fun VeyraScreen(
    loadKey: () -> String,
    saveKey: (String) -> Unit,
    loadModel: () -> String,
    saveModel: (String) -> Unit,
    openAccessibility: () -> Unit
) {
    val context = LocalContext.current
    val messages by AgentBus.messages.collectAsState()
    val status by AgentBus.status.collectAsState()
    val running by AgentBus.running.collectAsState()
    val connected by AgentBus.bodyConnected.collectAsState()
    val callActive by VoiceControlService.active.collectAsState()
    val callStatus by VoiceControlService.status.collectAsState()

    var task by remember { mutableStateOf("") }
    var apiKey by remember { mutableStateOf(loadKey()) }
    var model by remember { mutableStateOf(loadModel()) }
    var showSetup by remember { mutableStateOf(apiKey.isBlank()) }
    val listState = rememberLazyListState()

    fun startCallMode() {
        ContextCompat.startForegroundService(
            context,
            Intent(context, VoiceControlService::class.java).setAction(VoiceControlService.ACTION_START)
        )
    }

    val micPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) startCallMode()
    }

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.lastIndex)
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            Surface(color = MaterialTheme.colorScheme.surface) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("Veyra", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                        Text(
                            if (callActive) callStatus else status,
                            fontSize = 12.sp,
                            color = Color(0xFF9FA7B2)
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            if (connected) "BODY ON" else "BODY OFF",
                            fontSize = 11.sp,
                            color = if (connected) Color(0xFF80CBC4) else Color(0xFFFFAB91)
                        )
                        TextButton(onClick = { showSetup = !showSetup }) { Text("Setup") }
                    }
                }
            }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            if (!connected) {
                Surface(color = Color(0xFF2A2114), modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("Veyra Accessibility is disabled.", modifier = Modifier.weight(1f), fontSize = 13.sp)
                        Button(onClick = openAccessibility) { Text("Enable") }
                    }
                }
            }

            if (showSetup) {
                SetupPanel(
                    apiKey = apiKey,
                    onApiKey = { apiKey = it },
                    model = model,
                    onModel = { model = it },
                    onSave = {
                        saveKey(apiKey.trim())
                        saveModel(model.trim())
                        showSetup = false
                    }
                )
            }

            Surface(
                color = if (callActive) Color(0xFF13352B) else Color(0xFF171B21),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            if (callActive) "Veyra Call is ON" else "Veyra Call",
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            if (callActive) callStatus else "Talk continuously, like a voice assistant.",
                            fontSize = 12.sp,
                            color = Color(0xFFB8C0CA)
                        )
                    }
                    Button(
                        onClick = {
                            if (callActive) {
                                context.stopService(Intent(context, VoiceControlService::class.java))
                            } else {
                                val granted = ContextCompat.checkSelfPermission(
                                    context, Manifest.permission.RECORD_AUDIO
                                ) == PackageManager.PERMISSION_GRANTED
                                if (granted) startCallMode()
                                else micPermission.launch(Manifest.permission.RECORD_AUDIO)
                            }
                        },
                        colors = if (callActive) {
                            ButtonDefaults.buttonColors(containerColor = Color(0xFFB3261E))
                        } else ButtonDefaults.buttonColors()
                    ) {
                        Text(if (callActive) "End Call" else "Start Call")
                    }
                }
            }

            LazyColumn(
                state = listState,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding = PaddingValues(14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                if (messages.isEmpty()) item { WelcomeCard() }
                items(messages) { msg ->
                    val isUser = msg.role is ChatRole.User
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
                    ) {
                        Surface(
                            shape = RoundedCornerShape(18.dp),
                            color = when (msg.role) {
                                ChatRole.User -> Color(0xFF24466D)
                                ChatRole.Assistant -> MaterialTheme.colorScheme.surfaceVariant
                                ChatRole.System -> Color(0xFF33282A)
                            },
                            modifier = Modifier.widthIn(max = 330.dp)
                        ) {
                            Text(msg.text, Modifier.padding(12.dp), fontSize = 14.sp, lineHeight = 20.sp)
                        }
                    }
                }
            }

            Surface(color = MaterialTheme.colorScheme.surface) {
                Column(Modifier.fillMaxWidth().padding(12.dp)) {
                    OutlinedTextField(
                        value = task,
                        onValueChange = { task = it },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 1,
                        maxLines = 4,
                        placeholder = { Text("Tell Veyra what to do on this phone…") }
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (running) {
                            Button(
                                onClick = { MirexAccessibilityService.instance?.stopAgentTask() },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFB3261E)),
                                modifier = Modifier.weight(1f)
                            ) { Text("STOP") }
                        } else {
                            Button(
                                onClick = {
                                    val service = MirexAccessibilityService.instance
                                    val cleanTask = task.trim()
                                    if (service != null && cleanTask.isNotEmpty() && apiKey.isNotBlank()) {
                                        saveKey(apiKey.trim())
                                        saveModel(model.trim())
                                        task = ""
                                        service.startAgentTask(cleanTask, apiKey.trim(), model.trim().ifBlank { "gpt-6-astra" })
                                    } else if (apiKey.isBlank()) {
                                        showSetup = true
                                    }
                                },
                                enabled = connected && task.isNotBlank() && apiKey.isNotBlank(),
                                modifier = Modifier.weight(1f)
                            ) { Text("Run on phone") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SetupPanel(
    apiKey: String,
    onApiKey: (String) -> Unit,
    model: String,
    onModel: (String) -> Unit,
    onSave: () -> Unit
) {
    Surface(color = Color(0xFF171B21), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Connection", fontWeight = FontWeight.SemiBold)
            OutlinedTextField(
                value = apiKey,
                onValueChange = onApiKey,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("OpenAI API key") },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                singleLine = true
            )
            OutlinedTextField(
                value = model,
                onValueChange = onModel,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Model") },
                supportingText = { Text("Default: gpt-6-astra") },
                singleLine = true
            )
            Text(
                "The key is encrypted with Android Keystore on this device.",
                fontSize = 11.sp,
                color = Color(0xFF9FA7B2)
            )
            Button(onClick = onSave, modifier = Modifier.align(Alignment.End)) { Text("Save") }
        }
    }
}

@Composable
private fun WelcomeCard() {
    Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Veyra phone agent", fontWeight = FontWeight.Bold)
            Text(
                "Start Call, then say: “Free Fire open করো”, “Chrome open করো”, or another phone command.",
                fontSize = 13.sp,
                color = Color(0xFFB8C0CA)
            )
            Text(
                "Veyra speaks progress, completes the task, asks what to do next, then listens again.",
                fontSize = 12.sp,
                color = Color(0xFF9FA7B2)
            )
        }
    }
}
