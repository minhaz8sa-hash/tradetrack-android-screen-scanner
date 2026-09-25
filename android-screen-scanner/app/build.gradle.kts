plugins {
    id("com.android.application")
}

android {
    namespace = "com.tradetracklive.scanner"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.tradetracklive.scanner"
        minSdk = 26
        targetSdk = 35
        versionCode = 8
        versionName = "2.0.0-alpha2-fast"

        val ttEngineEndpoint = providers.gradleProperty("TT_ENGINE_ENDPOINT")
            .orElse("")
            .get()
        val ttClientToken = providers.gradleProperty("TT_CLIENT_TOKEN")
            .orElse("")
            .get()
        buildConfigField("String", "TT_ENGINE_ENDPOINT", "\"${ttEngineEndpoint}\"")
        buildConfigField("String", "TT_CLIENT_TOKEN", "\"${ttClientToken}\"")
    }

    buildFeatures {
        buildConfig = true
    }
}