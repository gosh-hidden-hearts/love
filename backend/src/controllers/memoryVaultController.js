import db from '../repositories/databaseRepository.js';
import megaStorageService from '../services/megaStorageService.js';

export const memoryVaultController = {
  async getMemories(req, res) {
    try {
      const memories = await db.getMemories(req.user.id);
      return res.json({ success: true, memories });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async uploadMemory(req, res) {
    try {
      const { uploaderName, caption, memoryDate, feelingsTag, album, fileType } = req.body;
      const file = req.file;
      const uploaderId = req.user.id;

      if (!file) {
        return res.status(400).json({ success: false, message: 'No file provided for upload.' });
      }

      let megaResult = null;
      try {
        megaResult = await megaStorageService.uploadFile(file.buffer, file.originalname, file.mimetype, 'GOSH_Memories');
      } catch (megaErr) {
        console.warn('Direct MEGA stream error, falling back to local proxy:', megaErr.message);
        megaResult = {
          nodeId: 'local-' + Date.now(),
          downloadUrl: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          publicUrl: '#'
        };
      }

      const saved = await db.saveMemory({
        fileName: file.originalname,
        fileType: fileType || 'document',
        fileSize: file.size,
        mimeType: file.mimetype,
        megaFileHandle: megaResult.nodeId,
        megaDownloadUrl: megaResult.streamUrl || megaResult.downloadUrl,
        megaPublicUrl: megaResult.publicUrl || megaResult.downloadUrl,
        caption,
        memoryDate: memoryDate || new Date().toISOString().split('T')[0],
        feelingsTag,
        album: album || 'All Memories',
        uploaderId,
        uploaderName: uploaderName || req.user.username || 'Soul Partner'
      });

      return res.json({ success: true, memory: saved });
    } catch (err) {
      console.error('Upload Memory Error:', err);
      return res.status(500).json({ success: false, message: 'Memory upload failed: ' + err.message });
    }
  },

  async deleteMemory(req, res) {
    try {
      const { memoryId } = req.params;
      const mem = await db.getMemoryById(memoryId);
      if (mem && mem.uploaderId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only delete your own memories.' });
      }
      if (mem?.megaFileHandle && typeof mem.megaFileHandle === 'string' && !mem.megaFileHandle.startsWith('local-')) {
        megaStorageService.deleteFile(mem.megaFileHandle).catch(console.warn);
      }
      await db.deleteMemory(memoryId, req.user.id);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default memoryVaultController;
