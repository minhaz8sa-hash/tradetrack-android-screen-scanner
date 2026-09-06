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
        versionCode = 6
        versionName = "1.4.1"
    }
}