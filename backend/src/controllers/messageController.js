import db from '../repositories/databaseRepository.js';
import megaStorageService from '../services/megaStorageService.js';

export const messageController = {
  // Retrieve conversation messages (membership strictly enforced)
  async getMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const requestingUserId = req.user.id;

      const isMember = await db.isConversationMember(requestingUserId, conversationId);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: You are not a member of this conversation.'
        });
      }

      const messages = await db.getMessages(conversationId);
      return res.json({ success: true, messages });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Save new message with membership & contact-only enforcement
  async sendMessage(req, res) {
    try {
      const msg = { ...req.body };
      const actualSenderId = req.user.id;
      msg.senderId = actualSenderId;

      if (!msg.conversationId && msg.targetUserId) {
        const directConv = await db.findDirectConversationBetween(actualSenderId, msg.targetUserId);
        if (directConv) {
          msg.conversationId = directConv.id;
        } else {
          const isContact = await db.isContact(actualSenderId, msg.targetUserId);
          if (!isContact) {
            return res.status(403).json({
              success: false,
              code: 'NOT_A_CONTACT',
              message: 'Messaging restricted: You can only send messages to users who are saved in your contacts.'
            });
          }
          const created = await db.createConversation({
            type: 'direct',
            creatorId: actualSenderId,
            partnerId: msg.targetUserId,
            members: [actualSenderId, msg.targetUserId]
          });
          msg.conversationId = created.id;
        }
      }

      if (!msg.conversationId) {
        return res.status(400).json({ success: false, message: 'conversationId is required.' });
      }

      const conv = await db.getConversationById(msg.conversationId, actualSenderId);
      if (!conv) {
        return res.status(404).json({ success: false, message: 'Conversation not found.' });
      }

      const isMember = await db.isConversationMember(actualSenderId, conv.id);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: You are not a member of this conversation.'
        });
      }

      if (!conv.isGroup) {
        const recipientId = conv.members.find((m) => m !== actualSenderId) || msg.targetUserId;
        if (recipientId && recipientId !== actualSenderId) {
          const blocked = await db.isUserBlocked(actualSenderId, recipientId);
          if (blocked) {
            return res.status(403).json({
              success: false,
              code: 'USER_BLOCKED',
              message: 'Messaging unavailable: User is blocked.'
            });
          }
          const isAllowed = await db.isContact(actualSenderId, recipientId);
          if (!isAllowed) {
            return res.status(403).json({
              success: false,
              code: 'NOT_A_CONTACT',
              message: 'Messaging restricted: You can only send messages to users who are saved in your contacts.'
            });
          }
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
      const { reaction } = req.body;
      await db.reactToMessage(messageId, req.user.id, reaction);
      return res.json({ success: true, messageId, reaction });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Delete own message
  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { deleteForEveryone } = req.body || {};
      await db.deleteMessage(messageId, req.user.id, Boolean(deleteForEveryone));
      return res.json({ success: true, messageId });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default messageController;
