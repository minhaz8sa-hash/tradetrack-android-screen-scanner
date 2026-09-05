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
        versionCode = 3
        versionName = "1.2.0"
    }
}