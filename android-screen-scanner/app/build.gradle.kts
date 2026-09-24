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
        versionCode = 7
        versionName = "2.0.0-alpha1"

        val ttEngineEndpoint = providers.gradleProperty("TT_ENGINE_ENDPOINT")
            .orElse("")
            .get()
        buildConfigField("String", "TT_ENGINE_ENDPOINT", "\"${ttEngineEndpoint}\"")
    }

    buildFeatures {
        buildConfig = true
    }
}
