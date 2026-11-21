# Tigers 71 Android test APK
A WebView Android test wrapper for the existing Base44-hosted Tigers 71 app.

- Web URL: https://tiger-squad-pro.base44.app
- App ID: 6aaaa720024524127efd3778
- Test package: com.tigers71.esports.debug
- Android 7+ (minSdk 24); target SDK 35
- JavaScript, local storage, session cookies, file picker and camera capture via external camera app
- Internet permission only; HTTP cleartext and mixed-content blocked
- The website's real login and authorization apply. This does NOT bypass them.
- Internet required. Push notifications/background workers native behavior not provided.
- Debug APK signed with CI debug signing key: suitable for testing, not store publishing.

**Distribution:** Install this APK manually on Android. For Google Play production prefer Base44's official signed AAB and a persistent app-signing strategy.

**Build:** `gradle :app:assembleDebug` from this directory with Android SDK 35 and Gradle 8.9 (JDK 17). In this monorepo, use the `Build Tigers71 APK` GitHub Actions job.