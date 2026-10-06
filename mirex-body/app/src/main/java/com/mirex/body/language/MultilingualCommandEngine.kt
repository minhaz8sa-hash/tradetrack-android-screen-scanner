package com.mirex.body.language

import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.languageid.LanguageIdentification
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

class MultilingualCommandEngine {
    data class Result(
        val original: String,
        val detectedLanguage: String,
        val english: String
    )

    suspend fun normalize(command: String): Result {
        val original = command.trim()
        if (original.isBlank()) return Result("", "und", "")

        val language = detectLanguage(original)
        if (language == "und" || language.startsWith("en", ignoreCase = true)) {
            return Result(original, language, original)
        }

        val source = TranslateLanguage.fromLanguageTag(language.substringBefore('-'))
            ?: return Result(original, language, original)

        val options = TranslatorOptions.Builder()
            .setSourceLanguage(source)
            .setTargetLanguage(TranslateLanguage.ENGLISH)
            .build()

        val translator = Translation.getClient(options)
        return try {
            val conditions = DownloadConditions.Builder().build()
            val downloaded = suspendCancellableCoroutine<Boolean> { cont ->
                translator.downloadModelIfNeeded(conditions)
                    .addOnSuccessListener { if (cont.isActive) cont.resume(true) }
                    .addOnFailureListener { if (cont.isActive) cont.resume(false) }
            }

            if (!downloaded) {
                Result(original, language, original)
            } else {
                val translated = suspendCancellableCoroutine<String?> { cont ->
                    translator.translate(original)
                        .addOnSuccessListener { text -> if (cont.isActive) cont.resume(text) }
                        .addOnFailureListener { if (cont.isActive) cont.resume(null) }
                }
                Result(original, language, translated?.takeIf { it.isNotBlank() } ?: original)
            }
        } finally {
            translator.close()
        }
    }

    private suspend fun detectLanguage(text: String): String {
        val identifier = LanguageIdentification.getClient()
        return try {
            suspendCancellableCoroutine { cont ->
                identifier.identifyLanguage(text)
                    .addOnSuccessListener { language ->
                        if (cont.isActive) cont.resume(language.ifBlank { "und" })
                    }
                    .addOnFailureListener {
                        if (cont.isActive) cont.resume("und")
                    }
            }
        } finally {
            identifier.close()
        }
    }
}
