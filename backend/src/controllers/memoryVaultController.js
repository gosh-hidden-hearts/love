import db from '../repositories/databaseRepository.js';
import megaStorageService from '../services/megaStorageService.js';

export const memoryVaultController = {
  async getMemories(req, res) {
    try {
      const memories = await db.getMemories();
      return res.json({ success: true, memories });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async uploadMemory(req, res) {
    try {
      const { uploaderId, uploaderName, caption, memoryDate, feelingsTag, album, fileType } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ success: false, message: 'No file provided for upload.' });
      }

      // Stream file directly to MEGA Cloud Storage
      let megaResult = null;
      try {
        megaResult = await megaStorageService.uploadFile(file.buffer, file.originalname, file.mimetype);
      } catch (megaErr) {
        console.warn('Direct MEGA stream error, falling back to local proxy:', megaErr.message);
        megaResult = {
          nodeId: 'local-' + Date.now(),
          downloadUrl: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
        };
      }

      const memoryRecord = {
        id: 'mem-' + Date.now(),
        fileName: file.originalname,
        fileType: fileType || 'document',
        fileSize: file.size,
        mimeType: file.mimetype,
        megaFileHandle: megaResult.nodeId,
        megaDownloadUrl: megaResult.downloadUrl,
        caption,
        memoryDate: memoryDate || new Date().toISOString().split('T')[0],
        feelingsTag,
        album: album || 'All Memories',
        uploaderId,
        uploaderName: uploaderName || 'Soul Partner',
        createdAt: new Date().toISOString()
      };

      await db.saveMemory(memoryRecord);

      return res.json({ success: true, memory: memoryRecord });
    } catch (err) {
      console.error('Upload Memory Error:', err);
      return res.status(500).json({ success: false, message: 'Memory upload failed: ' + err.message });
    }
  },

  async deleteMemory(req, res) {
    try {
      const { memoryId } = req.params;
      await db.deleteMemory(memoryId);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default memoryVaultController;
