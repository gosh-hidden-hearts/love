import { getMegaStorage } from '../config/mega.js';

export const megaStorageService = {
  // Upload a buffer to MEGA Cloud Storage
  async uploadFile(fileBuffer, originalFileName, mimeType) {
    try {
      console.log(`☁️ Uploading "${originalFileName}" (${fileBuffer.length} bytes) to MEGA Cloud Storage...`);
      const storage = await getMegaStorage();

      // Check if "GOSH_Memories" folder exists in root, or upload to root
      let targetFolder = storage.root;
      if (storage.root.children) {
        const existing = storage.root.children.find((c) => c.name === 'GOSH_Memories' && c.directory);
        if (existing) {
          targetFolder = existing;
        }
      }

      // Upload file stream to MEGA
      const uploadedFile = await targetFolder.upload({
        name: originalFileName,
        size: fileBuffer.length
      }, fileBuffer).complete;

      console.log('✅ File successfully stored in MEGA! Name:', uploadedFile.name, 'Node ID:', uploadedFile.nodeId);

      // Generate MEGA public link
      let downloadUrl = null;
      try {
        downloadUrl = await uploadedFile.link();
      } catch (linkErr) {
        console.warn('Could not generate public link, using direct handle:', linkErr.message);
        downloadUrl = `https://mega.nz/file/${uploadedFile.nodeId}`;
      }

      return {
        success: true,
        nodeId: uploadedFile.nodeId,
        fileName: uploadedFile.name,
        fileSize: fileBuffer.length,
        downloadUrl
      };
    } catch (err) {
      console.error('MEGA Upload Error:', err);
      throw err;
    }
  },

  // Delete file from MEGA
  async deleteFile(nodeId) {
    try {
      const storage = await getMegaStorage();
      const file = storage.find((f) => f.nodeId === nodeId);
      if (file) {
        await file.delete();
        return { success: true };
      }
      return { success: false, message: 'File not found on MEGA' };
    } catch (err) {
      console.error('MEGA Delete Error:', err);
      return { success: false, message: err.message };
    }
  }
};

export default megaStorageService;
