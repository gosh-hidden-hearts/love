import { getMegaStorage } from '../config/mega.js';

// Comprehensive MIME Type Dictionary
const MIME_TYPES = {
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  // Videos
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  // Audio
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  // Documents
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  tar: 'application/x-tar',
  gz: 'application/gzip'
};

export function getMimeType(fileName, fallback = 'application/octet-stream') {
  if (!fileName) return fallback;
  const ext = fileName.split('.').pop()?.toLowerCase();
  return MIME_TYPES[ext] || fallback;
}

export const megaStorageService = {
  // Get or lazily create a target folder (e.g. 'GOSH_Memories', 'GOSH_Chat_Attachments')
  async getOrCreateFolder(folderName) {
    const storage = await getMegaStorage();
    if (storage.root && storage.root.children) {
      const existing = storage.root.children.find((c) => c.name === folderName && c.directory);
      if (existing) return existing;
    }

    try {
      const newFolder = await storage.root.mkdir(folderName);
      console.log(`📁 Created MEGA folder "${folderName}" (Node ID: ${newFolder.nodeId})`);
      return newFolder;
    } catch (err) {
      // Concurrently created or fallback
      if (storage.root && storage.root.children) {
        const existing = storage.root.children.find((c) => c.name === folderName && c.directory);
        if (existing) return existing;
      }
      console.warn(`Could not create folder "${folderName}", using root:`, err.message);
      return storage.root;
    }
  },

  // Upload a file buffer to MEGA Cloud Storage
  async uploadFile(fileBuffer, originalFileName, mimeType, folderName = 'GOSH_Memories') {
    try {
      console.log(`☁️ Uploading "${originalFileName}" (${fileBuffer.length} bytes) to MEGA [${folderName}]...`);
      const targetFolder = await this.getOrCreateFolder(folderName);

      // Clean filename to prevent filesystem issues
      const cleanFileName = originalFileName.replace(/[<>:"/\\|?*]/g, '_');

      // Upload file stream to MEGA
      const uploadedFile = await targetFolder.upload({
        name: cleanFileName,
        size: fileBuffer.length
      }, fileBuffer).complete;

      console.log(`✅ File successfully stored in MEGA! Name: "${uploadedFile.name}" Node ID: ${uploadedFile.nodeId}`);

      // Generate public link on MEGA (https://mega.nz/file/...)
      let publicLink = null;
      try {
        publicLink = await uploadedFile.link();
      } catch (linkErr) {
        console.warn('Could not generate public link, using direct handle:', linkErr.message);
        publicLink = `https://mega.nz/file/${uploadedFile.nodeId}`;
      }

      const resolvedMime = mimeType || getMimeType(cleanFileName);
      const streamUrl = `/api/files/stream/${uploadedFile.nodeId}`;
      const downloadEndpoint = `/api/files/download/${uploadedFile.nodeId}`;

      return {
        success: true,
        nodeId: uploadedFile.nodeId,
        fileName: uploadedFile.name,
        fileSize: fileBuffer.length,
        mimeType: resolvedMime,
        downloadUrl: streamUrl,     // Used by browser for inline streaming/playback
        streamUrl,                   // Direct streaming endpoint
        directDownloadUrl: downloadEndpoint,
        publicUrl: publicLink,       // Official MEGA web link (https://mega.nz/file/...)
        megaPublicUrl: publicLink
      };
    } catch (err) {
      console.error('MEGA Upload Error:', err);
      throw err;
    }
  },

  // Retrieve file node by its nodeId
  async getFile(nodeId) {
    if (!nodeId) return null;
    const storage = await getMegaStorage();

    if (storage.files && storage.files[nodeId]) {
      return storage.files[nodeId];
    }

    if (typeof storage.find === 'function') {
      const found = storage.find((f) => f.nodeId === nodeId);
      if (found) return found;
    }

    return null;
  },

  // Create download stream for a file node with optional byte range
  async downloadStream(nodeId, options = {}) {
    const file = await this.getFile(nodeId);
    if (!file) {
      throw new Error(`MEGA File not found for Node ID: ${nodeId}`);
    }
    return file.download(options);
  },

  // Delete file from MEGA
  async deleteFile(nodeId) {
    try {
      const file = await this.getFile(nodeId);
      if (file) {
        await file.delete();
        console.log(`🗑️ Deleted file ${nodeId} from MEGA Cloud Storage`);
        return { success: true };
      }
      return { success: false, message: 'File not found on MEGA' };
    } catch (err) {
      console.error('MEGA Delete Error:', err);
      return { success: false, message: err.message };
    }
  },

  // Storage connection and health info
  async getStatus() {
    try {
      const storage = await getMegaStorage();
      const filesCount = storage.files ? Object.keys(storage.files).length : 0;
      return {
        connected: true,
        email: storage.email,
        rootNodeId: storage.root?.nodeId || 'pmRVmLJC',
        totalNodes: filesCount
      };
    } catch (err) {
      return {
        connected: false,
        error: err.message
      };
    }
  }
};

export default megaStorageService;
