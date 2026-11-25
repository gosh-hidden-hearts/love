import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Plugin to serve public assets (manifest.json, sw.js, favicon.ico, icons) at root origin in dev
function publicAssetsFallbackPlugin() {
  return {
    name: 'public-assets-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const publicDir = path.resolve(__dirname, 'public');
        const cleanUrl = (req.url || '').split('?')[0];

        // 1. Root redirect to /love/ in dev mode
        if (cleanUrl === '/' && server.config.base !== '/') {
          res.writeHead(302, { Location: server.config.base });
          return res.end();
        }

        // 2. Serve static public files requested at root (e.g. Chrome PWA checking /manifest.json)
        // or prefixed with /love/ (e.g. /love/manifest.json), stripping duplicate base if any
        let relPath = cleanUrl.replace(/^\/+/, '');
        while (relPath.startsWith('love/')) {
          relPath = relPath.slice(5);
        }
        const candidateFile = path.join(publicDir, relPath);
        if (relPath && fs.existsSync(candidateFile) && fs.statSync(candidateFile).isFile()) {
          const ext = path.extname(candidateFile).toLowerCase();
          const mimeTypes = {
            '.json': 'application/manifest+json; charset=utf-8',
            '.webmanifest': 'application/manifest+json; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.png': 'image/png',
            '.ico': 'image/x-icon',
            '.svg': 'image/svg+xml',
            '.html': 'text/html; charset=utf-8'
          };
          res.writeHead(200, {
            'Content-Type': mimeTypes[ext] || 'application/octet-stream',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
          });
          return fs.createReadStream(candidateFile).pipe(res);
        }

        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const basePath = env.VITE_BASE_PATH || process.env.VITE_BASE_PATH || (mode === 'production' ? '/love/' : '/love/');

  return {
    base: basePath,
    plugins: [
      react(),
      publicAssetsFallbackPlugin()
    ],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true
        },
        '/socket.io': {
          target: 'http://localhost:5000',
          ws: true
        }
      }
    }
  };
});
