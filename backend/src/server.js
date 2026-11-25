import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';

// Config & Services
import config from './config/env.js';
import { checkSupabaseHealth } from './config/supabase.js';
import setupRealtimeService from './services/realtimeService.js';
import megaStorageService from './services/megaStorageService.js';

// Route Handlers
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import statusRoutes from './routes/statusRoutes.js';
import memoryVaultRoutes from './routes/memoryVaultRoutes.js';
import callRoutes from './routes/callRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import fileRoutes from './routes/fileRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Initialize Socket.io
const io = new Server(server, {
  cors: corsOptions
});

// Real-time Presence, Chat & WebRTC Calling Signaling
setupRealtimeService(io);

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
app.use('/uploads', express.static(uploadsDir));

// Health Check (verifies live Supabase & MEGA connectivity)
app.get('/api/health', async (req, res) => {
  const supabaseHealth = await checkSupabaseHealth();

  let megaCloudStatus = 'ready';
  let megaDetails = null;
  try {
    const status = await megaStorageService.getStatus();
    megaCloudStatus = status.connected ? 'ready' : 'disconnected';
    megaDetails = {
      connected: status.connected,
      email: status.email || null,
      rootFolderId: status.rootNodeId || 'pmRVmLJC'
    };
  } catch (e) {
    megaCloudStatus = 'disconnected';
  }

  res.json({
    status: 'online',
    app: 'GOSH (Glimpse Of Soul Hearts)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      supabase: supabaseHealth.connected ? 'connected' : 'error',
      supabaseServiceRole: supabaseHealth.usingServiceRole ? 'configured' : 'missing_or_anon_key',
      supabaseError: supabaseHealth.error,
      firebaseAuth: config.firebase.projectId ? 'configured' : 'missing',
      googleSmtp: config.smtp.user && config.smtp.pass ? 'ready' : 'not_configured',
      megaCloud: megaCloudStatus,
      webrtcSignaling: 'active'
    },
    mega: megaDetails
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/memory-vault', memoryVaultRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/files', fileRoutes);

// JSON 404 for unknown API endpoints
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `API route not found: ${req.method} ${req.originalUrl}` });
});

// In production, serve frontend build dist only if present
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Start Server
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🌹 GOSH — Glimpse Of Soul Hearts Server Started`);
  console.log(`📡 Port: ${PORT} | Environment: ${config.nodeEnv}`);
  console.log(`🚀 API: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Firebase Project: ${config.firebase.projectId}`);
  console.log(`🗄️ Supabase Key Mode: ${config.supabase.isPublishableKey ? '⚠️ Publishable Key (Set SUPABASE_SERVICE_ROLE_KEY!)' : 'Service Role'}`);
  console.log(`🎥 WebRTC Realtime Signaling: Active`);
  console.log(`=======================================================`);
});

export default server;
