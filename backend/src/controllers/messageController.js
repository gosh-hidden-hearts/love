import db from '../repositories/databaseRepository.js';
import megaStorageService from '../services/megaStorageService.js';

export const messageController = {
  // Retrieve conversation messages
  async getMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const requestingUserId = req.user?.id || req.query.userId;

      // Privacy check: Only conversation members can read messages
      if (requestingUserId && conversationId && !conversationId.startsWith('partner-demo') && !conversationId.startsWith('conv-default')) {
        const isMember = await db.isConversationMember(requestingUserId, conversationId);
        if (!isMember) {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized: You are not a member of this conversation.'
          });
        }
      }

      const messages = await db.getMessages(conversationId);
      return res.json({ success: true, messages });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Save new message with contact-only enforcement
  async sendMessage(req, res) {
    try {
      const msg = req.body;
      const actualSenderId = req.user?.id || msg.senderId;

      if (!actualSenderId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Sender identity required.' });
      }

      // Prevent spoofing sender ID
      msg.senderId = actualSenderId;

      // Identify the recipient
      let recipientId = msg.targetUserId;
      let conv = null;

      if (msg.conversationId) {
        conv = await db.getConversationById(msg.conversationId);
      }

      if (!recipientId && conv && !conv.isGroup) {
        if (Array.isArray(conv.members)) {
          recipientId = conv.members.find((m) => m !== actualSenderId) || conv.partnerId;
        } else {
          recipientId = conv.partnerId === actualSenderId ? conv.creatorId : conv.partnerId;
        }
      }

      // Contact-only restriction for 1-to-1 conversations
      if (recipientId && recipientId !== actualSenderId && (!conv || !conv.isGroup)) {
        const isAllowed = await db.isContact(actualSenderId, recipientId);
        if (!isAllowed) {
          return res.status(403).json({
            success: false,
            code: 'NOT_A_CONTACT',
            message: 'Messaging restricted: You can only send messages to users who are saved in your contacts.'
          });
        }
      }

      // Verify conversation membership
      if (conv && conv.id && !conv.id.startsWith('conv-default') && !conv.id.startsWith('partner-demo')) {
        const isMember = await db.isConversationMember(actualSenderId, conv.id);
        if (!isMember) {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized: You are not a member of this conversation.'
          });
        }
      }

      const saved = await db.saveMessage(msg);
      return res.json({ success: true, message: saved });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Upload attachment (photo, video, voice note, document) directly to MEGA Cloud Storage
  async uploadAttachment(req, res) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, message: 'No attachment file provided.' });
      }

      let messageType = 'file';
      if (file.mimetype.startsWith('image/')) messageType = 'image';
      else if (file.mimetype.startsWith('video/')) messageType = 'video';
      else if (file.mimetype.startsWith('audio/')) messageType = 'audio';

      // Upload directly to MEGA under 'GOSH_Chat_Attachments' folder
      let megaResult = null;
      try {
        megaResult = await megaStorageService.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          'GOSH_Chat_Attachments'
        );
      } catch (megaErr) {
        console.warn('Direct MEGA stream error for attachment, using resilient fallback:', megaErr.message);
        const fallbackDataUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        megaResult = {
          nodeId: 'local-' + Date.now(),
          downloadUrl: fallbackDataUrl,
          streamUrl: fallbackDataUrl,
          publicUrl: '#'
        };
      }

      const fileUrl = megaResult.streamUrl || megaResult.downloadUrl;

      return res.json({
        success: true,
        fileUrl,
        megaDownloadUrl: megaResult.publicUrl || fileUrl,
        megaFileHandle: megaResult.nodeId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        messageType
      });
    } catch (err) {
      console.error('Attachment upload error:', err);
      return res.status(500).json({ success: false, message: 'Upload failed: ' + err.message });
    }
  },

  // React to message with emoji
  async reactToMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { reaction, userId } = req.body;
      await db.reactToMessage(messageId, userId, reaction);
      return res.json({ success: true, messageId, reaction });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Delete message
  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { deleteForEveryone } = req.body;
      await db.deleteMessage(messageId, Boolean(deleteForEveryone));
      return res.json({ success: true, messageId });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default messageController;