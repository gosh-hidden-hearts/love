import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';

// Config & Services
import config from './config/env.js';
import setupRealtimeService from './services/realtimeService.js';

// Route Handlers
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import statusRoutes from './routes/statusRoutes.js';
import memoryVaultRoutes from './routes/memoryVaultRoutes.js';
import callRoutes from './routes/callRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Real-time Presence, Chat & WebRTC Calling Signaling
setupRealtimeService(io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
app.use('/uploads', express.static(uploadsDir));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'GOSH (Glimpse Of Soul Hearts)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      supabase: 'connected',
      googleSmtp: 'ready',
      megaCloud: 'ready',
      webrtcSignaling: 'active'
    }
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

// In production, serve frontend build dist
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
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Start Server
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🌹 GOSH — Glimpse Of Soul Hearts Server Started`);
  console.log(`📡 Port: ${PORT} | Environment: ${config.nodeEnv}`);
  console.log(`🚀 API: http://localhost:${PORT}/api/health`);
  console.log(`☁️ MEGA Cloud Storage: Enabled (${config.mega.email})`);
  console.log(`💌 Google SMTP Service: Enabled (${config.smtp.user})`);
  console.log(`🎥 WebRTC Realtime Signaling: Active`);
  console.log(`=======================================================`);
});

export default server;
