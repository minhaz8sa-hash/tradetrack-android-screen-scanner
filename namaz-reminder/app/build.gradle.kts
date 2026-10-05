plugins {
    id("com.android.application")
}

android {
    namespace = "com.mirex.namazorbit"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.mirex.namazorbit"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "1.1.0"
    }

    sourceSets {
        getByName("main") {
            assets.srcDir("../web")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
