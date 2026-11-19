/**
 * GOSH PHASE 11 DEPLOYMENT & ANDROID PACKAGING TEST SUITE
 * Tests GitHub Actions Pages workflow, Capacitor configuration, PWA Web Manifest,
 * Offline Service Worker caching, and Android native permissions.
 */

import fs from 'node:fs';
import path from 'node:path';

async function runDeploymentTests() {
  console.log('--- GOSH PHASE 11 DEPLOYMENT & ANDROID PACKAGING TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    const rootDir = process.cwd();

    // =========================================================================
    // 1. GITHUB ACTIONS PAGES WORKFLOW TEST
    // =========================================================================
    const workflowPath = path.join(rootDir, '.github', 'workflows', 'deploy.yml');
    assert(fs.existsSync(workflowPath), 'GITHUB ACTIONS: .github/workflows/deploy.yml exists');

    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    assert(workflowContent.includes('pages: write'), 'GITHUB ACTIONS: Grants "pages: write" permission');
    assert(workflowContent.includes('id-token: write'), 'GITHUB ACTIONS: Grants "id-token: write" permission');
    assert(workflowContent.includes('actions/deploy-pages'), 'GITHUB ACTIONS: Configures actions/deploy-pages');
    assert(workflowContent.includes("path: '.'"), 'GITHUB ACTIONS: Uploads repository root directly (Zero Build Requirement)');

    // =========================================================================
    // 2. CAPACITOR CONFIGURATION TEST
    // =========================================================================
    const capConfigPath = path.join(rootDir, 'capacitor.config.json');
    assert(fs.existsSync(capConfigPath), 'CAPACITOR: capacitor.config.json exists');

    const capConfig = JSON.parse(fs.readFileSync(capConfigPath, 'utf8'));
    assert(capConfig.appId === 'com.gosh.private', 'CAPACITOR: Configures appId as "com.gosh.private"');
    assert(capConfig.appName === 'GOSH', 'CAPACITOR: Configures appName as "GOSH"');
    assert(capConfig.webDir === '.', 'CAPACITOR: Configures webDir as "." root static directory');
    assert(capConfig.server?.androidScheme === 'https', 'CAPACITOR: Configures server.androidScheme as https');
    assert(capConfig.android?.backgroundColor === '#0d0e12', 'CAPACITOR: Configures dark background palette #0d0e12');

    // =========================================================================
    // 3. PWA WEB MANIFEST TEST
    // =========================================================================
    const manifestPath = path.join(rootDir, 'manifest.json');
    assert(fs.existsSync(manifestPath), 'PWA: manifest.json exists');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert(manifest.display === 'standalone', 'PWA: Configures display mode as standalone');
    assert(manifest.start_url === './index.html', 'PWA: Configures start_url as ./index.html');
    assert(manifest.theme_color && manifest.background_color, 'PWA: Configures dark theme and background colors');

    // =========================================================================
    // 4. OFFLINE SERVICE WORKER TEST
    // =========================================================================
    const swPath = path.join(rootDir, 'sw.js');
    assert(fs.existsSync(swPath), 'SERVICE WORKER: sw.js exists in root');

    const swContent = fs.readFileSync(swPath, 'utf8');
    assert(swContent.includes('gosh-cache-v1'), 'SERVICE WORKER: Defines cache identifier');
    assert(swContent.includes('index.html') && swContent.includes('variables.css'), 'SERVICE WORKER: Pre-caches core application shell');
    assert(swContent.includes("self.addEventListener('fetch'"), 'SERVICE WORKER: Implements fetch interception with cache fallback');

    // Verify index.html registers sw.js and links manifest.json
    const indexPath = path.join(rootDir, 'index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    assert(indexContent.includes('rel="manifest"'), 'INDEX HTML: Links manifest.json');
    assert(indexContent.includes('serviceWorker.register'), 'INDEX HTML: Registers service worker');

    // =========================================================================
    // 5. ANDROID NATIVE MANIFEST & PERMISSIONS TEST
    // =========================================================================
    const androidManifestPath = path.join(rootDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
    assert(fs.existsSync(androidManifestPath), 'ANDROID: AndroidManifest.xml exists');

    const androidManifestContent = fs.readFileSync(androidManifestPath, 'utf8');
    assert(androidManifestContent.includes('package="com.gosh.private"'), 'ANDROID: Package matches com.gosh.private');
    assert(androidManifestContent.includes('android.permission.INTERNET'), 'ANDROID: Declares INTERNET permission');
    assert(androidManifestContent.includes('android.permission.CAMERA'), 'ANDROID: Declares CAMERA permission for video & memories');
    assert(androidManifestContent.includes('android.permission.RECORD_AUDIO'), 'ANDROID: Declares RECORD_AUDIO permission for calls');
    assert(androidManifestContent.includes('android.permission.MODIFY_AUDIO_SETTINGS'), 'ANDROID: Declares MODIFY_AUDIO_SETTINGS permission');
    assert(androidManifestContent.includes('android.permission.ACCESS_NETWORK_STATE'), 'ANDROID: Declares ACCESS_NETWORK_STATE permission');

    // =========================================================================
    // 6. ZERO-BUILD CONSTRAINT VERIFICATION
    // =========================================================================
    const packageJsonPath = path.join(rootDir, 'package.json');
    assert(fs.existsSync(packageJsonPath), 'PACKAGE: package.json exists');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const allDeps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
    const forbiddenBundlers = ['react', 'vue', 'angular', 'vite', 'webpack', 'next', 'rollup'];
    const hasForbidden = forbiddenBundlers.some(b => allDeps[b] !== undefined);
    assert(!hasForbidden, 'ZERO-BUILD: Strict compliance: Zero frontend frameworks or bundlers (pure HTML/CSS/Vanilla JS)');

    console.log(`\nPHASE 11 TESTS COMPLETED: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);

  } catch (err) {
    console.error('Test Suite Exception:', err);
    process.exit(1);
  }
}

runDeploymentTests();
