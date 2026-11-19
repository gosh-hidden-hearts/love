# GOSH — ANDROID PACKAGING & CAPACITOR SETUP GUIDE

---

## 1. Overview

GOSH is packaged as a native Android application using **Capacitor**, wrapping the pure vanilla HTML5/CSS3/JavaScript web assets in an optimized Android WebView.

---

## 2. Configuration (`capacitor.config.json`)

```json
{
  "appId": "com.gosh.private",
  "appName": "GOSH",
  "webDir": ".",
  "bundledWebRuntime": false,
  "server": {
    "cleartext": false,
    "androidScheme": "https"
  },
  "android": {
    "allowMixedContent": false,
    "captureInput": true,
    "webContentsDebuggingEnabled": false
  }
}
```

---

## 3. Native Permissions (`AndroidManifest.xml`)

To support real-time calling, screen capture, camera memory uploads, and secure file downloads:
- `android.permission.INTERNET`
- `android.permission.RECORD_AUDIO`
- `android.permission.CAMERA`
- `android.permission.MODIFY_AUDIO_SETTINGS`
- `android.permission.ACCESS_NETWORK_STATE`
- `android.permission.POST_NOTIFICATIONS`

---

## 4. Build Commands

```powershell
# 1. Install Capacitor CLI (local dev dependency)
npm install --save-dev @capacitor/core @capacitor/cli @capacitor/android

# 2. Add Android Platform Shell
npx cap add android

# 3. Synchronize Web Assets to Android project
npx cap sync android

# 4. Open in Android Studio or Build Debug APK via Gradle
cd android
./gradlew assembleDebug
```
