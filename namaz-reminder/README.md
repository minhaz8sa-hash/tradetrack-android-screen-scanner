# Namaz Orbit

Prayer reminder + Qaza tracker + Quran + Namaz Guide.

## Features
- GPS/device-time based offline prayer calculation
- Karachi, MWL, Egypt, ISNA methods
- Hanafi / Standard Asr selection
- Per-prayer completion and automatic Qaza queue after prayer window
- Monthly prayer calendar
- Android alarms with reboot rescheduling
- Arabic Uthmani Quran + Bengali meaning via AlQuran Cloud, with IndexedDB offline cache
- Namaz guides for five daily prayers, Jumu'ah and Witr
- Glassmorphism Prayer Orbit dashboard

## Android build
Run `gradle :app:assembleDebug` with Android SDK 35 and JDK 17. APK output:
`app/build/outputs/apk/debug/app-debug.apk`

The GitHub workflow in the repository root builds and uploads the APK artifact automatically.

## Web
Deploy `web/` as a static Vercel project.
