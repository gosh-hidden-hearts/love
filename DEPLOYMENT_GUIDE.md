# GOSH — DEPLOYMENT GUIDE (GITHUB PAGES & ANDROID)

---

## 1. GitHub Pages Static Website Deployment

Because GOSH uses pure HTML5, CSS3, and native ES Modules without a frontend build or bundler step, deployment to GitHub Pages is direct and instantaneous.

### Option A: Direct GitHub Repository Setting
1. Create a private or discreet repository on GitHub: `https://github.com/<username>/gosh`.
2. Push the codebase to the `main` branch.
3. In GitHub Repository Settings -> **Pages**:
   - Source: **Deploy from a branch**
   - Branch: `main` / Folder: `/ (root)`
4. The site will be published at `https://<username>.github.io/gosh/`.

### Option B: Automated GitHub Actions Workflow (`.github/workflows/deploy.yml`)
```yaml
name: Deploy GOSH to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Pages
        uses: actions/configure-pages@v4
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## 2. Capacitor Android Shell Deployment

1. Sync web assets:
   ```powershell
   npx cap sync android
   ```
2. Build unsigned release APK or debug APK:
   ```powershell
   cd android
   ./gradlew assembleRelease
   ```
3. Transfer `.apk` to the two authorized Android devices and install directly via sideloading.
