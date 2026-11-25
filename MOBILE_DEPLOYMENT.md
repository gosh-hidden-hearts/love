# GOSH (Hidden Hearts) — Mobile & Cross-Platform Deployment Guide

This guide documents the procedures for packaging, compiling, and deploying **GOSH — Hidden Hearts** across **Android**, **iOS**, and **Desktop** using **Capacitor** and **PWA standards**.

---

## 1. Architecture Overview

- **Frontend Core:** React 18 + Vite (Responsive Mobile & Desktop layouts)
- **Mobile Container:** Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`)
- **PWA Support:** Web App Manifest (`manifest.json`), service worker, and mobile viewport meta headers
- **Desktop Packaging:** Progressive Web App (Installable via Chrome/Edge) or Electron / Tauri wrapper

---

## 2. Android Deployment (Capacitor)

### 2.1 Prerequisites
1. **Node.js** (v18 or higher)
2. **Android Studio** (Koala / Ladybug or newer)
3. **Android SDK Platform** (API Level 33+)
4. **Java Development Kit (JDK)**: OpenJDK 17 or 21 (bundled with Android Studio)

### 2.2 Installation & Build Steps
Inside the `frontend` directory:

```bash
cd frontend

# 1. Install Capacitor packages (if not already present)
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Compile production web assets
npm run build

# 3. Initialize / Add Android platform
npx cap add android

# 4. Synchronize web assets to native Android container
npx cap sync android

# 5. Open project in Android Studio
npx cap open android
```

### 2.3 Required Android Permissions (`AndroidManifest.xml`)
Located at: `frontend/android/app/src/main/AndroidManifest.xml`

Ensure the following permissions are present inside `<manifest>`:

```xml
<!-- Network & WebSockets -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- WebRTC Audio/Video Calls & Voice Notes -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

<!-- Media Uploads & Notifications -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### 2.4 Generating Release APK / AAB
In Android Studio:
1. Select **Build > Generate Signed Bundle / APK**.
2. Select **Android App Bundle** (for Google Play Store) or **APK** (for direct distribution).
3. Create or select your keystore file.
4. Build variant: `release`.

Alternatively, build from terminal:
```bash
cd frontend/android
./gradlew assembleRelease
```
The output APK is generated at:
`frontend/android/app/build/outputs/apk/release/app-release-unsigned.apk`

---

## 3. iOS Deployment (Capacitor)

### 3.1 Hardware & Software Requirements
- Apple macOS computer (MacBook, Mac Mini, or Mac Studio)
- Xcode (Version 15 or newer)
- Active Apple Developer Account (free tier for personal USB testing, paid tier for App Store distribution)

### 3.2 Build Steps
```bash
cd frontend

# 1. Add iOS platform
npm install @capacitor/ios
npx cap add ios

# 2. Build and sync assets
npm run build
npx cap sync ios

# 3. Open in Xcode
npx cap open ios
```

### 3.3 Required `Info.plist` Privacy Keys
In Xcode, add the following to `Info.plist`:
- `NSCameraUsageDescription`: *"GOSH requires camera access for peer-to-peer romantic video calling and sharing glimpses."*
- `NSMicrophoneUsageDescription`: *"GOSH requires microphone access for voice calling and recording soul voice notes."*
- `NSPhotoLibraryUsageDescription`: *"GOSH requires photo library access to upload memories to your shared Memory Vault."*

---

## 4. Desktop Packaging Architecture

### Option A: Progressive Web App (PWA) — Zero Overhead
GOSH is built with a Web App Manifest (`frontend/public/manifest.json`). Users can install it with a single click:
1. Visit the hosted web application URL in Google Chrome, Microsoft Edge, or Brave.
2. Click the **Install GOSH** icon in the address bar (or Menu > More Tools > Install GOSH).
3. GOSH runs in its own frameless window with native OS notification integration and taskbar pinning.

### Option B: Electron Wrapper (Native Windows/macOS/Linux)
To package GOSH into a standalone Windows `.exe` / installer:
```bash
# 1. Install Electron
npm install --save-dev electron electron-builder

# 2. Package into native Windows executable
npx electron-builder build --win
```

---

## 5. Deployment Verification Checklist
- [x] Responsive layout verified for mobile (<768px) and desktop (>=768px).
- [x] Native audio/video hardware requests handled gracefully with user permissions.
- [x] End-to-End Encryption active with native browser Web Crypto API.
- [x] Real-time signaling resilient over WebSocket connections.
- [x] Ephemeral 24-hour status system and MEGA Cloud Memory Vault operating seamlessly.
