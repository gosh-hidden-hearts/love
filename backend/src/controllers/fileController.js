import megaStorageService, { getMimeType } from '../services/megaStorageService.js';

export const fileController = {
  // Stream file inline for images, audio, video playback, and documents
  async streamFile(req, res) {
    try {
      const { nodeId } = req.params;
      if (!nodeId) {
        return res.status(400).json({ success: false, message: 'Node ID required' });
      }

      const file = await megaStorageService.getFile(nodeId);
      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found on MEGA Cloud Storage' });
      }

      const mimeType = req.query.mime || getMimeType(file.name);
      const totalSize = file.size;

      // Check for Range header (critical for audio & video seeking in HTML5 players)
      const range = req.headers.range;

      if (range && totalSize > 0) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

        if (start >= totalSize || end >= totalSize) {
          res.setHeader('Content-Range', `bytes */${totalSize}`);
          return res.status(416).send('Requested range not satisfiable');
        }

        const chunkSize = end - start + 1;
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        });

        const stream = await megaStorageService.downloadStream(nodeId, { start, end });
        stream.pipe(res);

        res.on('close', () => {
          if (typeof stream.destroy === 'function') stream.destroy();
        });

        stream.on('error', (err) => {
          console.error(`Streaming error for file ${nodeId}:`, err.message);
          if (!res.headersSent) {
            res.status(500).send('Streaming error');
          }
        });
      } else {
        // Full file stream
        res.writeHead(200, {
          'Content-Length': totalSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"`,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        });

        const stream = await megaStorageService.downloadStream(nodeId);
        stream.pipe(res);

        res.on('close', () => {
          if (typeof stream.destroy === 'function') stream.destroy();
        });

        stream.on('error', (err) => {
          console.error(`Streaming error for file ${nodeId}:`, err.message);
          if (!res.headersSent) {
            res.status(500).send('Streaming error');
          }
        });
      }
    } catch (err) {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Could not stream file: ' + err.message });
      }
    }
  },

  // Direct download attachment
  async downloadFile(req, res) {
    try {
      const { nodeId } = req.params;
      const file = await megaStorageService.getFile(nodeId);
      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found on MEGA Cloud Storage' });
      }

      const mimeType = getMimeType(file.name);
      res.writeHead(200, {
        'Content-Length': file.size,
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      });

      const stream = await megaStorageService.downloadStream(nodeId);
      stream.pipe(res);

      res.on('close', () => {
        if (typeof stream.destroy === 'function') stream.destroy();
      });
    } catch (err) {
      console.error('File download error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Could not download file: ' + err.message });
      }
    }
  },

  // Retrieve metadata about a MEGA file
  async getFileInfo(req, res) {
    try {
      const { nodeId } = req.params;
      const file = await megaStorageService.getFile(nodeId);
      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found on MEGA' });
      }

      let publicLink = null;
      try {
        publicLink = await file.link();
      } catch (e) {
        publicLink = `https://mega.nz/file/${file.nodeId}`;
      }

      return res.json({
        success: true,
        nodeId: file.nodeId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: getMimeType(file.name),
        streamUrl: `/api/files/stream/${file.nodeId}`,
        downloadUrl: `/api/files/download/${file.nodeId}`,
        megaPublicUrl: publicLink
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // MEGA cloud connection health status
  async getStorageStatus(req, res) {
    try {
      const status = await megaStorageService.getStatus();
      return res.json({ success: true, ...status });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default fileController;
