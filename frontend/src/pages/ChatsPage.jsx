import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Send, 
  Smile, 
  Paperclip, 
  Mic, 
  Phone, 
  Video, 
  MoreVertical, 
  Check, 
  CheckCheck, 
  Heart, 
  Image as ImageIcon, 
  FileText, 
  Film, 
  X, 
  Trash2, 
  Edit2, 
  Reply, 
  Sparkles,
  ArrowLeft,
  Lock,
  UserPlus,
  Users,
  UserCheck,
  UserX,
  MessageSquare,
  AlertCircle,
  ShieldAlert,
  Info,
  User,
  Download,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCall } from '../contexts/CallContext';
import socketService from '../services/socket';
import api from '../services/api';
import encryptionService from '../services/encryptionService';

const EMOJI_LIST = ['❤️', '💖', '💕', '🥰', '😍', '😘', '🌹', '✨', '🥺', '🔥', '💍', '🕊️', '💌', '🌸', '🧸', '🍫', '💫', '💏', '👍', '😊'];

export default function ChatsPage() {
  const { user } = useAuth();
  const { startCall } = useCall();

  // Conversations & Active Chat State
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'contacts' | 'unread' | 'groups'
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [activeMediaLightbox, setActiveMediaLightbox] = useState(null);

  // WhatsApp Contact-Based Architecture State
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearchFilter, setContactSearchFilter] = useState('');
  const [editingContact, setEditingContact] = useState(null);
  const [editNicknameValue, setEditNicknameValue] = useState('');
  const [contactErrorNotice, setContactErrorNotice] = useState('');

  // Contact Discovery & Group Creation Modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [modalTab, setModalTab] = useState('direct'); // 'direct' | 'group'
  const [userSearchInput, setUserSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [directAddNickname, setDirectAddNickname] = useState({});
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Audio Recording (Voice Message)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecordTime, setVoiceRecordTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const voiceTimerRef = useRef(null);

  // Refs
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeConversationRef = useRef(activeConversation);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Initial load (runs once per authenticated user)
  useEffect(() => {
    if (!user?.id) return;
    loadConversations();
    loadContacts();
  }, [user?.id]);

  // Socket real-time listeners
  useEffect(() => {
    if (!user?.id) return;

    const handleReceiveMessage = async (msg) => {
      console.log('💬 New real-time message received:', msg);

      let processedMsg = msg;
      if (msg.content && typeof msg.content === 'string' && msg.content.includes('"isEncrypted":true')) {
        const decryptedText = await encryptionService.decrypt(msg.content, msg.senderId);
        processedMsg = { ...msg, content: decryptedText, isE2EE: true };
      }

      const activeConv = activeConversationRef.current;
      if (activeConv && (msg.conversationId === activeConv.id || msg.senderId === activeConv.partnerId)) {
        setMessages((prev) =>
          prev.some((m) => m.id === processedMsg.id) ? prev : [...prev, processedMsg]
        );
        scrollToBottom();
      }

      // Update last message in conversation list or reload if this is a brand new conversation
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === msg.conversationId || c.partnerId === msg.senderId);
        if (!exists) {
          loadConversations();
          return prev;
        }
        return prev.map((c) =>
          c.id === msg.conversationId || c.partnerId === msg.senderId
            ? {
                ...c,
                lastMessageText: processedMsg.content || 'Media message',
                lastMessageAt: msg.createdAt,
                unreadCount: c.id === activeConv?.id ? 0 : (c.unreadCount || 0) + 1
              }
            : c
        );
      });
    };

    const handlePartnerTyping = (data) => {
      const activeConv = activeConversationRef.current;
      if (activeConv && data.userId === activeConv.partnerId) {
        setPartnerTyping(true);
      }
    };

    const handlePartnerStopTyping = (data) => {
      const activeConv = activeConversationRef.current;
      if (activeConv && data.userId === activeConv.partnerId) {
        setPartnerTyping(false);
      }
    };

    const handlePresenceUpdate = ({ userId: targetUid, online, lastSeen }) => {
      if (!targetUid) return;
      setConversations((prev) =>
        prev.map((c) => (c.partnerId === targetUid ? { ...c, online, lastSeen } : c))
      );
      setContacts((prev) =>
        prev.map((c) => (c.userId === targetUid ? { ...c, onlineStatus: online, lastSeen } : c))
      );
      setActiveConversation((prev) =>
        prev && prev.partnerId === targetUid ? { ...prev, online, lastSeen } : prev
      );
    };

    const handleMessageBlocked = (data) => {
      setContactErrorNotice(data.message || 'Message blocked: You can only message users saved in your contacts.');
      setTimeout(() => setContactErrorNotice(''), 6000);
    };

    socketService.on('receive_message', handleReceiveMessage);
    socketService.on('user_typing', handlePartnerTyping);
    socketService.on('user_stop_typing', handlePartnerStopTyping);
    socketService.on('presence_update', handlePresenceUpdate);
    socketService.on('message_blocked', handleMessageBlocked);

    return () => {
      socketService.off('receive_message', handleReceiveMessage);
      socketService.off('user_typing', handlePartnerTyping);
      socketService.off('user_stop_typing', handlePartnerStopTyping);
      socketService.off('presence_update', handlePresenceUpdate);
      socketService.off('message_blocked', handleMessageBlocked);
    };
  }, [user?.id]);

  // Load Contacts from Backend & Supabase
  const loadContacts = async () => {
    if (!user?.id) return;
    setContactsLoading(true);
    try {
      const res = await api.getContacts(user.id);
      if (res && res.contacts) {
        setContacts(res.contacts);
      }
    } catch (err) {
      console.warn('Failed to load contacts:', err);
    } finally {
      setContactsLoading(false);
    }
  };

  // Helper: check if a target user is in user's saved contacts
  const isUserSavedContact = (targetUserId) => {
    if (!targetUserId) return false;
    if (targetUserId === user?.id) return true;
    return contacts.some((c) => c.userId === targetUserId);
  };

  // Helper: get saved contact record for a partner
  const getSavedContact = (partnerId) => {
    if (!partnerId) return null;
    return contacts.find((c) => c.userId === partnerId) || null;
  };

  // Check if active 1-to-1 conversation partner is permitted to receive messages
  const isCurrentChatPermitted = () => {
    if (!activeConversation) return false;
    if (activeConversation.isGroup || activeConversation.is_group) return true;
    if (!activeConversation.partnerId) return false;
    return isUserSavedContact(activeConversation.partnerId);
  };

  // Load conversations from Supabase via backend
  const loadConversations = async () => {
    try {
      const res = await api.getConversations();
      if (res.conversations && res.conversations.length > 0) {
        setConversations(res.conversations);
        if (!activeConversation && window.innerWidth >= 768) {
          selectConversation(res.conversations[0]);
        }
      } else {
        setConversations([]);
      }
    } catch (e) {
      console.warn('Error loading conversations:', e);
    }
  };

  // Select conversation
  const selectConversation = async (conv) => {
    setActiveConversation(conv);
    setShowChatOptions(false);
    try {
      const res = await api.getMessages(conv.id);
      if (res.messages && res.messages.length > 0) {
        const decryptedList = await Promise.all(
          res.messages.map(async (m) => {
            if (m.content && typeof m.content === 'string' && m.content.includes('"isEncrypted":true')) {
              const partnerId = m.senderId === user?.id ? conv.partnerId : m.senderId;
              const decrypted = await encryptionService.decrypt(m.content, partnerId);
              return { ...m, content: decrypted, isE2EE: true };
            }
            return m;
          })
        );
        setMessages(decryptedList);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
    }
    scrollToBottom();
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Typing emitter
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!isTyping && activeConversation) {
      setIsTyping(true);
      socketService.emit('typing', {
        conversationId: activeConversation.id,
        targetUserId: activeConversation.partnerId,
        userId: user.id
      });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (activeConversation) {
        socketService.emit('stop_typing', {
          conversationId: activeConversation.id,
          targetUserId: activeConversation.partnerId,
          userId: user.id
        });
      }
    }, 1500);
  };

  // Send message with Contact Authorization Verification
  const handleSendMessage = async (customPayload = null) => {
    const textToSend = customPayload ? customPayload.content : inputText.trim();
    if (!textToSend && !customPayload?.fileUrl && !customPayload?.audioUrl) return;

    // Contact Authorization Guard: In GOSH, users can only message saved contacts
    if (!isCurrentChatPermitted()) {
      setContactErrorNotice(
        `Cannot send message: "${activeConversation?.name}" is not saved in your contacts. Add them to contacts first to unlock messaging.`
      );
      setTimeout(() => setContactErrorNotice(''), 6000);
      return;
    }

    const clientMsgId =
      typeof window !== 'undefined' && window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : 'msg-' + Date.now();

    const optimisticMsg = {
      id: clientMsgId,
      conversationId: activeConversation?.id,
      senderId: user?.id,
      senderName: user?.displayName,
      replyToId: replyingTo?.id || null,
      replyToText: replyingTo?.content || null,
      messageType: customPayload?.messageType || 'text',
      content: textToSend,
      mediaUrl: customPayload?.previewUrl || customPayload?.fileUrl || null,
      audioUrl: customPayload?.messageType === 'audio'
        ? (customPayload?.previewUrl || customPayload?.audioUrl || null)
        : (customPayload?.audioUrl || null),
      duration: customPayload?.duration || null,
      fileName: customPayload?.fileName || null,
      fileSize: customPayload?.fileSize || null,
      megaFileHandle: customPayload?.megaFileHandle || null,
      megaDownloadUrl: customPayload?.megaDownloadUrl || null,
      deliveryStatus: 'sent',
      createdAt: new Date().toISOString()
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, { ...optimisticMsg, isE2EE: !activeConversation?.isGroup }]);
    setInputText('');
    setReplyingTo(null);
    setShowEmojiPicker(false);
    scrollToBottom();

    // Encrypt payload if 1-to-1 conversation
    let payloadContent = textToSend;
    if (!activeConversation?.isGroup && activeConversation?.partnerId && textToSend) {
      try {
        payloadContent = await encryptionService.encrypt(textToSend, activeConversation.partnerId);
      } catch (encErr) {
        console.warn('E2EE pre-send encryption error:', encErr);
      }
    }

    const wirePayload = {
      id: clientMsgId,
      conversationId: activeConversation?.id,
      senderId: user?.id,
      senderName: user?.displayName,
      replyToId: optimisticMsg.replyToId,
      replyToText: optimisticMsg.replyToText,
      messageType: optimisticMsg.messageType,
      content: payloadContent,
      mediaUrl: customPayload?.fileUrl || null,
      audioUrl: customPayload?.audioUrl || null,
      duration: optimisticMsg.duration,
      fileName: optimisticMsg.fileName,
      fileSize: optimisticMsg.fileSize,
      megaFileHandle: optimisticMsg.megaFileHandle,
      megaDownloadUrl: optimisticMsg.megaDownloadUrl,
      targetUserId: activeConversation?.partnerId
    };

    // Persist via Edge API first
    try {
      const res = await api.sendMessage(wirePayload);
      if (!res?.success) {
        setMessages((prev) => prev.filter((m) => m.id !== clientMsgId));
        setContactErrorNotice(res?.message || 'Could not send message. Please try again.');
        setTimeout(() => setContactErrorNotice(''), 6000);
        return;
      }

      if (res.message) {
        const persisted = {
          ...optimisticMsg,
          ...res.message,
          content: textToSend,
          mediaUrl: res.message.mediaUrl || optimisticMsg.mediaUrl,
          audioUrl: res.message.audioUrl || optimisticMsg.audioUrl,
          isE2EE: !activeConversation?.isGroup
        };
        setMessages((prev) => prev.map((m) => (m.id === clientMsgId ? persisted : m)));
      }

      // Emit over WebSocket after DB persistence succeeds
      socketService.emit('send_message', {
        ...wirePayload,
        id: res.message?.id || clientMsgId,
        createdAt: res.message?.createdAt || optimisticMsg.createdAt
      });

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation?.id
            ? { ...c, lastMessageText: textToSend || 'Media message', lastMessageAt: res.message?.createdAt || optimisticMsg.createdAt }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to save message:', err);
      setMessages((prev) => prev.filter((m) => m.id !== clientMsgId));
      setContactErrorNotice(err.message || 'Could not send message. Please try again.');
      setTimeout(() => setContactErrorNotice(''), 6000);
    }
  };

  // Add Contact Action
  const handleAddContact = async (targetUser, nickname = '') => {
    if (!targetUser?.id) return;
    try {
      const res = await api.addContact(targetUser.id, nickname || null, user.id);
      if (res.success) {
        await loadContacts();
        setContactErrorNotice('');
        return true;
      } else {
        alert(res.message || 'Could not add contact');
        return false;
      }
    } catch (err) {
      alert('Error adding contact: ' + err.message);
      return false;
    }
  };

  // Add Contact & Start Chat (one-click action)
  const handleAddContactAndChat = async (targetUser, nickname = '') => {
    const success = await handleAddContact(targetUser, nickname);
    if (success) {
      handleStartChatWithUser(targetUser, nickname);
      setShowNewChatModal(false);
    }
  };

  // Start chat with a saved contact (uses canonical Supabase conversation UUID)
  const handleStartChatWithContact = async (contact) => {
    const existingConv = conversations.find((c) => !c.isGroup && c.partnerId === contact.userId);
    if (existingConv) {
      selectConversation(existingConv);
      setFilterTab('all');
      return;
    }

    const displayName = contact.nickname || contact.displayName || contact.username;
    const avatarUrl = contact.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${contact.userId}`;

    try {
      const res = await api.createConversation({
        partnerId: contact.userId,
        name: displayName,
        avatarUrl
      });

      if (!res?.success || !res?.conversation) {
        setContactErrorNotice(res?.message || 'Unable to start conversation.');
        setTimeout(() => setContactErrorNotice(''), 6000);
        return;
      }

      const createdConv = {
        ...res.conversation,
        name: displayName,
        avatarUrl,
        online: Boolean(contact.onlineStatus),
        lastSeen: contact.onlineStatus ? 'Online' : contact.lastSeen || 'Recently active'
      };

      setConversations((prev) => [createdConv, ...prev.filter((c) => c.id !== createdConv.id)]);
      selectConversation(createdConv);
      setFilterTab('all');
    } catch (e) {
      console.warn('Backend create conversation note:', e);
      setContactErrorNotice(e.message || 'Could not create conversation.');
    }
  };

  // Start chat with user object (uses canonical Supabase conversation UUID)
  const handleStartChatWithUser = async (targetUser, nickname = '') => {
    const displayName = nickname || targetUser.displayName || targetUser.display_name || targetUser.username;
    const avatarUrl =
      targetUser.avatarUrl ||
      targetUser.avatar_url ||
      `https://api.dicebear.com/7.x/adventurer/svg?seed=${targetUser.id}`;

    try {
      const res = await api.createConversation({
        partnerId: targetUser.id,
        name: displayName,
        avatarUrl
      });

      if (!res?.success || !res?.conversation) {
        setContactErrorNotice(res?.message || 'Unable to create conversation.');
        setTimeout(() => setContactErrorNotice(''), 6000);
        return;
      }

      const createdConv = {
        ...res.conversation,
        name: displayName,
        avatarUrl,
        online: Boolean(targetUser.onlineStatus ?? targetUser.online_status),
        lastSeen: (targetUser.onlineStatus ?? targetUser.online_status) ? 'Online' : 'Recently seen'
      };

      setConversations((prev) => [createdConv, ...prev.filter((c) => c.id !== createdConv.id)]);
      selectConversation(createdConv);
      setShowNewChatModal(false);
    } catch (e) {
      console.warn('Backend create conversation note:', e);
      setContactErrorNotice(e.message || 'Could not create conversation.');
    }
  };

  // Rename contact nickname
  const handleSaveContactNickname = async (e) => {
    e.preventDefault();
    if (!editingContact) return;
    try {
      const res = await api.updateContact(editingContact.userId, editNicknameValue.trim() || null, user.id);
      if (res.success) {
        await loadContacts();
        // Update active conversation display name if currently chatting
        if (activeConversation?.partnerId === editingContact.userId) {
          setActiveConversation((prev) => ({
            ...prev,
            name: editNicknameValue.trim() || editingContact.displayName
          }));
        }
        setEditingContact(null);
      } else {
        alert(res.message || 'Could not update nickname');
      }
    } catch (err) {
      alert('Error updating nickname: ' + err.message);
    }
  };

  // Remove contact
  const handleRemoveContact = async (contactUserId) => {
    if (!confirm('Are you sure you want to remove this user from your contacts? You will not be able to send them new messages until you add them again.')) {
      return;
    }
    try {
      const res = await api.removeContact(contactUserId, user.id);
      if (res.success) {
        await loadContacts();
        setShowChatOptions(false);
      } else {
        alert(res.message || 'Could not remove contact');
      }
    } catch (err) {
      alert('Error removing contact: ' + err.message);
    }
  };

  // Voice recording (MediaRecorder)
  const startVoiceRecording = async () => {
    if (!isCurrentChatPermitted()) {
      setContactErrorNotice('You must add this user to your contacts to send voice messages.');
      setTimeout(() => setContactErrorNotice(''), 6000);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        try {
          const formData = new FormData();
          formData.append('file', audioBlob, `voice_${Date.now()}.webm`);
          const uploadRes = await api.uploadAttachment(formData);
          if (!uploadRes?.success || !uploadRes.fileUrl) {
            throw new Error(uploadRes?.message || 'Voice upload failed.');
          }
          const previewUrl = uploadRes.previewUrl || URL.createObjectURL(audioBlob);

          handleSendMessage({
            messageType: 'audio',
            content: 'Voice Message 🎙️',
            audioUrl: uploadRes.fileUrl,
            previewUrl,
            duration: voiceRecordTime,
            megaFileHandle: uploadRes.megaFileHandle || null,
            megaDownloadUrl: uploadRes.megaDownloadUrl || null
          });
        } catch (err) {
          console.warn('Voice note upload fallback:', err);
          const audioUrl = URL.createObjectURL(audioBlob);
          handleSendMessage({
            messageType: 'audio',
            content: 'Voice Message 🎙️',
            audioUrl,
            duration: voiceRecordTime
          });
        }
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setVoiceRecordTime(0);
      voiceTimerRef.current = setInterval(() => {
        setVoiceRecordTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access is required for voice messages: ' + err.message);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      clearInterval(voiceTimerRef.current);
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
      setIsRecordingVoice(false);
      clearInterval(voiceTimerRef.current);
    }
  };

  // File Attachment Upload (Images, Videos, Docs via Backend Upload Route)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isCurrentChatPermitted()) {
      setContactErrorNotice('You must add this user to your contacts to send attachments.');
      setTimeout(() => setContactErrorNotice(''), 6000);
      return;
    }

    setShowAttachmentMenu(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.uploadAttachment(formData);
      if (!uploadRes?.success || !uploadRes.fileUrl) {
        throw new Error(uploadRes?.message || 'Attachment upload failed.');
      }

      const fileUrl = uploadRes.fileUrl;
      const previewUrl = uploadRes.previewUrl || URL.createObjectURL(file);
      let messageType = 'file';
      if (file.type.startsWith('image/')) messageType = 'image';
      else if (file.type.startsWith('video/')) messageType = 'video';
      else if (file.type.startsWith('audio/')) messageType = 'audio';

      handleSendMessage({
        messageType,
        content: file.name,
        fileUrl,
        previewUrl,
        fileName: file.name,
        fileSize: file.size,
        megaFileHandle: uploadRes.megaFileHandle || null,
        megaDownloadUrl: uploadRes.megaDownloadUrl || null
      });
    } catch (err) {
      console.warn('File upload fallback:', err);
      const fileUrl = URL.createObjectURL(file);
      let messageType = 'file';
      if (file.type.startsWith('image/')) messageType = 'image';
      else if (file.type.startsWith('video/')) messageType = 'video';
      else if (file.type.startsWith('audio/')) messageType = 'audio';

      handleSendMessage({
        messageType,
        content: file.name,
        fileUrl,
        fileName: file.name,
        fileSize: file.size
      });
    }
  };

  // Message Reactions
  const handleReactToMessage = async (msgId, reaction) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, reaction } : m))
    );
    try {
      await api.reactToMessage(msgId, user?.id, reaction);
    } catch (e) {
      console.warn(e);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId, deleteForEveryone = false) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    try {
      await api.deleteMessage(msgId, user?.id, deleteForEveryone);
    } catch (e) {
      console.warn(e);
    }
  };

  // Contact Discovery: Search users (Never exposes email or phone)
  const handleSearchUsers = async (e) => {
    e.preventDefault();
    if (!userSearchInput.trim()) return;
    setSearchLoading(true);
    try {
      const res = await api.searchUsers(userSearchInput.trim());
      // Filter out self
      const list = (res.users || []).filter((u) => u.id !== user?.id);
      setSearchResults(list);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Group Creation
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setCreatingGroup(true);
    try {
      const allMembers = Array.from(new Set([user?.id, ...selectedGroupMembers]));
      const res = await api.createGroup({
        name: groupName.trim(),
        description: groupDesc.trim(),
        creatorId: user?.id,
        avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(groupName.trim())}`,
        members: allMembers
      });

      if (res.success && res.group) {
        const newGroupConv = {
          id: res.group.id,
          partnerId: null,
          name: res.group.name,
          avatarUrl: res.group.avatarUrl,
          isGroup: true,
          description: res.group.description,
          online: false,
          lastSeen: `${allMembers.length} members`,
          lastMessageText: 'Group created ✨',
          lastMessageAt: new Date().toISOString(),
          unreadCount: 0
        };

        setConversations((prev) => [newGroupConv, ...prev]);
        setActiveConversation(newGroupConv);
        setShowNewChatModal(false);
        setGroupName('');
        setGroupDesc('');
        setSelectedGroupMembers([]);
        selectConversation(newGroupConv);
      }
    } catch (err) {
      console.error('Group creation failed:', err);
      alert('Could not create group: ' + err.message);
    } finally {
      setCreatingGroup(false);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessageText?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterTab === 'unread') return (c.unreadCount || 0) > 0;
    if (filterTab === 'groups') return c.isGroup;
    return true;
  });

  // Filter contacts in Contacts view
  const filteredContacts = contacts.filter((c) => {
    const term = contactSearchFilter.toLowerCase();
    return (
      c.displayName?.toLowerCase().includes(term) ||
      c.nickname?.toLowerCase().includes(term) ||
      c.username?.toLowerCase().includes(term) ||
      c.bio?.toLowerCase().includes(term)
    );
  });

  // Resolved active partner contact details
  const activePartnerContact = activeConversation?.partnerId ? getSavedContact(activeConversation.partnerId) : null;
  const isChatRestricted = !isCurrentChatPermitted();

  return (
    <div className="flex h-full w-full max-w-full bg-[#08090e] overflow-hidden select-none">
      {/* =========================================================================
          LEFT PANE: CONVERSATION & CONTACTS LIST (Responsive: hidden on mobile if chat is open)
         ========================================================================= */}
      <div className={`w-full md:w-80 lg:w-96 md:shrink-0 flex flex-col border-r border-white/5 bg-[#0f111a] relative min-w-0 max-w-full ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-bold text-white tracking-wide truncate">
              {filterTab === 'contacts' ? 'Contacts' : 'Chats'}
            </h2>
            <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-semibold border border-rose-500/30 font-mono shrink-0">
              GOSH
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Add Contact / New Chat Button */}
            <button
              onClick={() => {
                setModalTab('direct');
                setShowNewChatModal(true);
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition"
              title="Add Contact / Find Users"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar with Clear Button */}
        <div className="p-3 border-b border-white/5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterTab === 'contacts' ? contactSearchFilter : searchQuery}
              onChange={(e) => {
                if (filterTab === 'contacts') setContactSearchFilter(e.target.value);
                else setSearchQuery(e.target.value);
              }}
              placeholder={filterTab === 'contacts' ? 'Search saved contacts...' : 'Search or start new chat...'}
              className="w-full pl-9 pr-8 py-2 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            {(filterTab === 'contacts' ? contactSearchFilter : searchQuery) && (
              <button 
                onClick={() => {
                  if (filterTab === 'contacts') setContactSearchFilter('');
                  else setSearchQuery('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Chips / Tabs (WhatsApp-style Contact Ecosystem) */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-0.5 scrollbar-none w-full max-w-full min-w-0">
            {[
              { id: 'all', label: 'Chats' },
              { id: 'contacts', label: `Contacts (${contacts.length})` },
              { id: 'unread', label: 'Unread' },
              { id: 'groups', label: 'Groups' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                  filterTab === tab.id
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold shadow-glow-pink'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* =====================================================================
            VIEW 1: CONTACTS LIST TAB (WhatsApp Contact Book)
           ===================================================================== */}
        {filterTab === 'contacts' ? (
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
            {/* Add New Contact Quick Action Tile */}
            <div
              onClick={() => {
                setModalTab('direct');
                setShowNewChatModal(true);
              }}
              className="p-3.5 flex items-center gap-3 cursor-pointer hover:bg-rose-500/10 transition border-b border-white/5 group"
            >
              <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center group-hover:scale-105 transition">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-white group-hover:text-rose-300 transition">
                  Add New Contact
                </h4>
                <p className="text-[10px] text-slate-400">Search by username or user ID to save</p>
              </div>
            </div>

            {/* Saved Contacts */}
            {contactsLoading ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <span className="inline-block w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mb-2" />
                <p>Loading your saved contacts...</p>
              </div>
            ) : filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <div
                  key={contact.contactId || contact.userId}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition group"
                >
                  {/* Avatar & Info */}
                  <div 
                    onClick={() => handleStartChatWithContact(contact)}
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={contact.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${contact.userId}`}
                        alt={contact.displayName}
                        className="w-11 h-11 rounded-full object-cover border border-white/10 bg-[#08090e]"
                      />
                      {contact.onlineStatus && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0f111a] shadow-glow-green" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                        {contact.nickname ? (
                          <>
                            <span className="text-rose-300 font-bold">{contact.nickname}</span>
                            <span className="text-slate-400 font-normal">({contact.displayName})</span>
                          </>
                        ) : (
                          contact.displayName
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        @{contact.username || 'user'} {contact.bio ? `• ${contact.bio}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Contact Action Buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleStartChatWithContact(contact)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition"
                      title="Send Message"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => startCall({
                        receiverId: contact.userId,
                        receiverName: contact.nickname || contact.displayName,
                        receiverAvatar: contact.avatarUrl,
                        type: 'audio'
                      })}
                      className="p-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 transition"
                      title="Audio Call"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingContact(contact);
                        setEditNicknameValue(contact.nickname || '');
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 transition"
                      title="Edit Nickname"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveContact(contact.userId)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition"
                      title="Remove Contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                <Users className="w-8 h-8 text-rose-500/30 mx-auto mb-2" />
                <p className="font-semibold text-slate-400">No saved contacts yet</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  GOSH allows messaging only between saved contacts.
                </p>
                <button
                  onClick={() => {
                    setModalTab('direct');
                    setShowNewChatModal(true);
                  }}
                  className="mt-3 px-4 py-2 rounded-xl btn-romantic-primary text-xs font-semibold inline-block"
                >
                  + Add First Contact
                </button>
              </div>
            )}
          </div>
        ) : (
          /* =====================================================================
              VIEW 2: CONVERSATION LIST (WhatsApp Chats)
             ===================================================================== */
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                const contactRecord = conv.partnerId ? getSavedContact(conv.partnerId) : null;
                const displayName = contactRecord?.nickname 
                  ? `${contactRecord.nickname} (${conv.name})` 
                  : conv.name;

                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`p-3.5 flex items-center gap-3 cursor-pointer transition ${
                      isSelected ? 'bg-rose-500/15 border-l-4 border-rose-500 shadow-glow-pink' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Avatar with glowing online status */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={conv.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${conv.id}`}
                        alt={conv.name}
                        className="w-12 h-12 rounded-full object-cover border border-white/10 bg-[#08090e]"
                      />
                      {conv.online && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0f111a] shadow-glow-green" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold text-white truncate">{displayName}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400 truncate max-w-[190px]">
                          {conv.lastMessageText || 'No messages yet'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                <Sparkles className="w-8 h-8 text-rose-500/30 mx-auto mb-2" />
                <p>No conversations in this view.</p>
                <button
                  onClick={() => setFilterTab('contacts')}
                  className="mt-3 text-rose-400 font-medium hover:underline block mx-auto"
                >
                  Open Contacts to Start Chat →
                </button>
              </div>
            )}
          </div>
        )}

        {/* WhatsApp-Style Floating Action Button (FAB) at Bottom-Right */}
        {filterTab !== 'contacts' && (
          <button
            onClick={() => setFilterTab('contacts')}
            className="absolute bottom-5 right-5 p-3.5 rounded-full bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-glow-pink hover:scale-105 active:scale-95 transition z-20 flex items-center justify-center"
            title="Open Contacts"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* =========================================================================
          RIGHT PANE: ACTIVE CHAT SCREEN
         ========================================================================= */}
      <div className={`flex-1 flex flex-col h-full bg-[#08090e] relative min-w-0 max-w-full overflow-hidden ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
        {activeConversation ? (
          <>
            {/* Chat Top Header */}
            <div className="h-16 px-3 sm:px-4 border-b border-white/5 bg-[#0f111a]/90 backdrop-blur-md flex items-center justify-between z-20 min-w-0 max-w-full">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
                {/* Back button (Mobile only) */}
                <button
                  onClick={() => setActiveConversation(null)}
                  className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Avatar & Partner Info */}
                <div className="relative shrink-0">
                  <img
                    src={activeConversation.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${activeConversation.id}`}
                    alt={activeConversation.name}
                    className="w-10 h-10 rounded-full object-cover border border-rose-500/40 bg-[#08090e]"
                  />
                  {activeConversation.online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0f111a] shadow-glow-green" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 truncate">
                    {activePartnerContact?.nickname ? (
                      <>
                        <span className="text-rose-300 font-bold truncate">{activePartnerContact.nickname}</span>
                        <span className="text-slate-400 font-normal text-xs truncate">({activeConversation.name})</span>
                      </>
                    ) : (
                      <span className="truncate">{activeConversation.name}</span>
                    )}
                  </h3>
                  <p className="text-[10px] text-rose-400 font-medium flex items-center gap-1 truncate">
                    {partnerTyping ? (
                      <span className="animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                        typing...
                      </span>
                    ) : activeConversation.online ? (
                      <span className="text-emerald-400">Online</span>
                    ) : (
                      <span className="text-slate-400">{activeConversation.lastSeen || 'Recently active'}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Audio Call, Video Call, More Options */}
              <div className="flex items-center gap-1.5 relative">
                <button
                  onClick={() => {
                    if (isChatRestricted) {
                      setContactErrorNotice('You can only call users who are saved in your contacts.');
                      setTimeout(() => setContactErrorNotice(''), 6000);
                      return;
                    }
                    startCall({
                      receiverId: activeConversation.partnerId,
                      receiverName: activeConversation.name,
                      receiverAvatar: activeConversation.avatarUrl,
                      type: 'audio'
                    });
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 transition"
                  title="Soul Audio Call"
                >
                  <Phone className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    if (isChatRestricted) {
                      setContactErrorNotice('You can only call users who are saved in your contacts.');
                      setTimeout(() => setContactErrorNotice(''), 6000);
                      return;
                    }
                    startCall({
                      receiverId: activeConversation.partnerId,
                      receiverName: activeConversation.name,
                      receiverAvatar: activeConversation.avatarUrl,
                      type: 'video'
                    });
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition"
                  title="Romantic Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>

                {/* More options toggle */}
                <button
                  onClick={() => setShowChatOptions(!showChatOptions)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                  title="Chat Options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Options Dropdown */}
                {showChatOptions && (
                  <div className="absolute right-0 top-12 w-52 bg-[#141724] border border-white/10 rounded-2xl p-2 shadow-2xl z-40 animate-fadeIn text-xs">
                    {/* Contact Management Actions */}
                    {activePartnerContact ? (
                      <>
                        <button
                          onClick={() => {
                            setShowChatOptions(false);
                            setEditingContact(activePartnerContact);
                            setEditNicknameValue(activePartnerContact.nickname || '');
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 text-slate-200 transition flex items-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Edit Nickname</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowChatOptions(false);
                            handleRemoveContact(activePartnerContact.userId);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 transition flex items-center gap-2"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Remove from Contacts</span>
                        </button>
                      </>
                    ) : !activeConversation.isGroup && activeConversation.partnerId ? (
                      <button
                        onClick={() => {
                          setShowChatOptions(false);
                          handleAddContact({ id: activeConversation.partnerId, displayName: activeConversation.name });
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-300 transition flex items-center gap-2"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-rose-400" />
                        <span>Add to Contacts</span>
                      </button>
                    ) : null}

                    <button
                      onClick={() => {
                        setShowChatOptions(false);
                        alert(`Soul profile details for ${activeConversation.name}`);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 text-slate-200 transition"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowChatOptions(false);
                        if (confirm('Clear chat history with this user?')) {
                          setMessages([]);
                        }
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 transition"
                    >
                      Clear Chat History
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Restriction / Error Floating Banner */}
            {contactErrorNotice && (
              <div className="mx-4 mt-2 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-lg z-30 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{contactErrorNotice}</span>
                </div>
                <button
                  onClick={() => setContactErrorNotice('')}
                  className="text-rose-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Message Feed Area with Romantic Wallpaper */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 space-y-3 relative chat-wallpaper-romantic w-full max-w-full">
              {/* Romantic background watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                <Heart className="w-80 h-80 fill-rose-500" />
              </div>

              {/* Date Separator Pill */}
              <div className="flex justify-center my-3 relative z-10">
                <span className="px-3.5 py-1 rounded-full bg-[#141724]/90 border border-white/5 text-[10px] text-rose-300 font-mono tracking-wider shadow-sm">
                  TODAY
                </span>
              </div>

              {/* End-to-End Encryption Security Notice */}
              <div className="flex justify-center my-2 relative z-10">
                <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 flex items-center gap-2 text-center max-w-sm shadow-sm">
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Messages and calls are end-to-end encrypted. You can only message users saved in your contacts.</span>
                </div>
              </div>

              {/* Messages list */}
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col group relative ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {/* Message Bubble Container */}
                    <div
                      className={`max-w-[85%] md:max-w-md p-3 sm:p-3.5 shadow-lg relative text-xs md:text-sm leading-relaxed ${
                        isMe ? 'chat-bubble-outgoing' : 'chat-bubble-incoming'
                      }`}
                    >
                      {/* Replying To preview */}
                      {msg.replyToText && (
                        <div className="mb-2 p-2 rounded-lg bg-black/20 border-l-2 border-white/40 text-[11px] text-slate-300 truncate">
                          <span className="font-semibold block text-[10px] text-rose-200">Replying:</span>
                          {msg.replyToText}
                        </div>
                      )}

                      {/* Image Attachment */}
                      {msg.messageType === 'image' && msg.mediaUrl && (
                        <div 
                          onClick={() => setActiveMediaLightbox(api.resolveFileUrl(msg.mediaUrl))}
                          className="mb-2 rounded-xl overflow-hidden cursor-pointer border border-white/10 max-h-60 relative group/img"
                        >
                          <img 
                            src={api.resolveFileUrl(msg.mediaUrl)} 
                            alt="Shared" 
                            className="w-full h-full object-cover hover:scale-105 transition"
                            loading="lazy" 
                          />
                          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-rose-300 font-medium border border-white/10 flex items-center gap-1 pointer-events-none">
                            <span>☁️ MEGA</span>
                          </div>
                        </div>
                      )}

                      {/* Video Attachment */}
                      {msg.messageType === 'video' && msg.mediaUrl && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-white/10 max-h-60 relative">
                          <video src={api.resolveFileUrl(msg.mediaUrl)} controls className="w-full" preload="metadata" />
                          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-purple-300 font-medium border border-white/10 flex items-center gap-1 pointer-events-none">
                            <span>☁️ MEGA</span>
                          </div>
                        </div>
                      )}

                      {/* Voice Message */}
                      {msg.messageType === 'audio' && msg.audioUrl && (
                        <div className="flex items-center gap-3 py-1">
                          <audio src={api.resolveFileUrl(msg.audioUrl)} controls className="h-8 max-w-[220px]" />
                        </div>
                      )}

                      {/* Document / File Attachment */}
                      {msg.messageType === 'file' && (msg.mediaUrl || msg.megaDownloadUrl) && (
                        <div className="mb-2 p-3 rounded-xl bg-white/10 border border-white/15 flex items-center justify-between gap-3 text-white">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate text-white">{msg.fileName || msg.content || 'Document'}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                                {msg.fileSize && <span>{(msg.fileSize / 1024).toFixed(1)} KB</span>}
                                <span>•</span>
                                <span className="text-rose-300 font-semibold">☁️ Private Vault</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={api.resolveFileUrl(msg.mediaUrl)}
                              download={msg.fileName || 'attachment'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/30 text-slate-200 hover:text-white transition"
                              title="Download Attachment"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            {msg.megaDownloadUrl && msg.megaDownloadUrl !== '#' && (
                              <a
                                href={msg.megaDownloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-purple-500/30 text-slate-300 hover:text-white transition"
                                title="Open on MEGA"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Text content */}
                      {msg.content && (msg.messageType !== 'audio' && (msg.messageType !== 'file' || (msg.fileName && msg.content !== msg.fileName))) && (
                        <p className="break-words [overflow-wrap:anywhere] select-text">{msg.content}</p>
                      )}

                      {/* Footer: Timestamp, ticks, reaction */}
                      <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-slate-300/80">
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMe && (
                          <span>
                            {msg.deliveryStatus === 'read' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                            ) : msg.deliveryStatus === 'delivered' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-slate-300" />
                            )}
                          </span>
                        )}
                      </div>

                      {/* Reaction badge */}
                      {msg.reaction && (
                        <div className="absolute -bottom-2 -right-2 bg-slate-900 border border-white/20 rounded-full px-1.5 py-0.5 text-[11px] shadow">
                          {msg.reaction}
                        </div>
                      )}
                    </div>

                    {/* Hover action menu trigger */}
                    <div className={`opacity-0 group-hover:opacity-100 transition flex items-center gap-1 mt-1 text-[11px] text-slate-400 ${isMe ? 'pr-1' : 'pl-1'}`}>
                      <button 
                        onClick={() => setReplyingTo(msg)}
                        className="p-1 hover:text-white rounded"
                        title="Reply"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleReactToMessage(msg.id, '❤️')}
                        className="p-1 hover:text-rose-400 rounded"
                        title="Heart Reaction"
                      >
                        ❤️
                      </button>
                      <button 
                        onClick={() => handleReactToMessage(msg.id, '😍')}
                        className="p-1 hover:text-yellow-400 rounded"
                      >
                        😍
                      </button>
                      <button 
                        onClick={() => handleDeleteMessage(msg.id, isMe)}
                        className="p-1 hover:text-rose-400 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Replying To Banner */}
            {replyingTo && (
              <div className="px-4 py-2 bg-slate-900/90 border-t border-white/5 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2 truncate">
                  <Reply className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span className="truncate">Replying to: <i>{replyingTo.content}</i></span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* =====================================================================
                BOTTOM AREA: COMPOSER OR CONTACT AUTHORIZATION BANNER
               ===================================================================== */}
            {isChatRestricted ? (
              /* WhatsApp-Style Contact Required Banner */
              <div className="p-4 bg-[#141724] border-t border-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Contact Required for Messaging</h4>
                    <p className="text-[11px] text-slate-400">
                      {activeConversation.name} is not saved in your contacts. Add them to start sending messages.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleAddContact({ id: activeConversation.partnerId, displayName: activeConversation.name })}
                  className="px-4 py-2 rounded-xl btn-romantic-primary text-xs font-semibold whitespace-nowrap flex items-center gap-2 shadow-glow-pink hover:scale-105 active:scale-95 transition"
                >
                  <UserPlus className="w-4 h-4" /> Add to Contacts
                </button>
              </div>
            ) : (
              /* Regular Message Composer */
              <div className="p-2.5 sm:p-3 border-t border-white/5 bg-[#12141f] relative w-full max-w-full">
                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div className="absolute bottom-16 left-4 bg-slate-900 border border-white/10 p-3 rounded-2xl shadow-2xl z-30 grid grid-cols-5 gap-2 max-w-xs animate-fadeIn">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setInputText((prev) => prev + emoji)}
                        className="text-xl p-1.5 hover:bg-white/10 rounded-xl transition transform hover:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Attachment Popup Menu */}
                {showAttachmentMenu && (
                  <div className="absolute bottom-16 left-12 bg-slate-900 border border-white/10 p-2 rounded-2xl shadow-2xl z-30 flex flex-col gap-1 w-44 animate-fadeIn">
                    <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 text-xs text-slate-300 cursor-pointer">
                      <ImageIcon className="w-4 h-4 text-rose-400" />
                      <span>Photo / Image</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 text-xs text-slate-300 cursor-pointer">
                      <Film className="w-4 h-4 text-purple-400" />
                      <span>Video Clip</span>
                      <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 text-xs text-slate-300 cursor-pointer">
                      <FileText className="w-4 h-4 text-sky-400" />
                      <span>Document</span>
                      <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                )}

                {/* Voice Recording Active Bar with Live Waveform Animation */}
                {isRecordingVoice ? (
                  <div className="flex items-center justify-between bg-gradient-to-r from-rose-950/60 to-purple-950/60 border border-rose-500/40 rounded-2xl px-4 py-2.5 shadow-glow-pink animate-fadeIn">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                      <span className="text-xs font-mono font-bold text-rose-300">
                        REC {Math.floor(voiceRecordTime / 60)}:{(voiceRecordTime % 60).toString().padStart(2, '0')}
                      </span>
                      {/* Animated audio waveform bars */}
                      <div className="flex items-center gap-1 h-4">
                        {[40, 75, 55, 90, 60, 80, 45, 95, 70, 50].map((h, i) => (
                          <span
                            key={i}
                            className="w-0.5 bg-rose-400 rounded-full animate-pulse"
                            style={{
                              height: `${Math.max(25, (h * (voiceRecordTime % 3 + 1)) % 100)}%`,
                              animationDelay: `${i * 80}ms`
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        type="button" 
                        onClick={cancelVoiceRecording} 
                        className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={stopVoiceRecording}
                        className="p-2 rounded-full bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-glow-pink hover:scale-105 active:scale-95 transition"
                        title="Send Voice Memo"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Regular Text Composer */
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-1.5 sm:gap-2 w-full min-w-0"
                  >
                    {/* Emoji Trigger */}
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 text-slate-400 hover:text-yellow-400 transition shrink-0"
                      title="Emojis"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    {/* Attachment Trigger */}
                    <button
                      type="button"
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      className="p-2 text-slate-400 hover:text-rose-400 transition shrink-0"
                      title="Attach File"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>

                    {/* Text Input */}
                    <input
                      type="text"
                      value={inputText}
                      onChange={handleInputChange}
                      placeholder="Type a loving message..."
                      className="flex-1 min-w-0 py-2.5 px-3 sm:px-4 rounded-xl glass-input text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none"
                    />

                    {/* Voice Record or Send Button */}
                    {inputText.trim() ? (
                      <button
                        type="submit"
                        className="p-2.5 rounded-xl btn-romantic-primary text-white transition transform hover:scale-105 active:scale-95 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startVoiceRecording}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition shrink-0"
                        title="Hold to Record Voice Message"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    )}
                  </form>
                )}
              </div>
            )}
          </>
        ) : (
          /* Empty State when no conversation selected on desktop */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4 shadow-glow-pink">
              <Heart className="w-10 h-10 fill-rose-500/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Your Romantic Sanctuary</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              In GOSH, you can connect securely with users saved in your contacts. Add a contact or select a chat to begin.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => setFilterTab('contacts')}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition"
              >
                View Contacts
              </button>
              <button
                onClick={() => {
                  setModalTab('direct');
                  setShowNewChatModal(true);
                }}
                className="px-5 py-2.5 rounded-xl btn-romantic-primary text-xs font-medium"
              >
                + Add Contact
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          CONTACT DISCOVERY & GROUP CREATION MODAL
         ========================================================================= */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-rose-500/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" />
                {modalTab === 'direct' ? 'Add Contact / Find User' : 'Create Romantic Group'}
              </h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs: Add Contact vs Create Group */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl mb-4 border border-white/5">
              <button
                type="button"
                onClick={() => setModalTab('direct')}
                className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                  modalTab === 'direct'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-glow-pink'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Find Contact
              </button>
              <button
                type="button"
                onClick={() => setModalTab('group')}
                className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                  modalTab === 'group'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-glow-pink'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Group
              </button>
            </div>

            {modalTab === 'direct' ? (
              <>
                <form onSubmit={handleSearchUsers} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={userSearchInput}
                    onChange={(e) => setUserSearchInput(e.target.value)}
                    placeholder="Search by @username or user ID..."
                    className="flex-1 px-4 py-2.5 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={searchLoading}
                    className="px-4 py-2.5 rounded-xl btn-romantic-primary text-xs font-medium"
                  >
                    {searchLoading ? 'Searching...' : 'Search'}
                  </button>
                </form>

                {/* Privacy note */}
                <p className="text-[10px] text-slate-400 mb-3 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>Privacy protected: Private emails and mobile numbers are never revealed.</span>
                </p>

                {/* Results list */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {searchResults.length > 0 ? (
                    searchResults.map((usr) => {
                      const alreadyContact = isUserSavedContact(usr.id);
                      return (
                        <div
                          key={usr.id}
                          className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2 transition"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img
                                src={usr.avatarUrl || usr.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${usr.id}`}
                                alt={usr.displayName || usr.display_name || usr.username}
                                className="w-10 h-10 rounded-full object-cover border border-rose-500/30 bg-[#08090e]"
                              />
                              <div>
                                <h4 className="text-xs font-semibold text-white">{usr.displayName || usr.display_name || usr.username}</h4>
                                <p className="text-[10px] text-slate-400">@{usr.username || 'user'}</p>
                              </div>
                            </div>

                            {alreadyContact ? (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 font-semibold">
                                <UserCheck className="w-3 h-3" /> In Contacts
                              </span>
                            ) : (
                              <span className="text-[10px] bg-white/10 text-slate-400 px-2 py-0.5 rounded-full">
                                Not in Contacts
                              </span>
                            )}
                          </div>

                          {/* Action row */}
                          <div className="flex items-center gap-2 mt-1">
                            {alreadyContact ? (
                              <button
                                onClick={() => handleStartChatWithUser(usr)}
                                className="w-full py-2 rounded-xl btn-romantic-primary text-xs font-semibold flex items-center justify-center gap-1.5"
                              >
                                <MessageSquare className="w-3.5 h-3.5" /> Start Chat
                              </button>
                            ) : (
                              <div className="w-full flex items-center gap-2">
                                <input
                                  type="text"
                                  value={directAddNickname[usr.id] || ''}
                                  onChange={(e) => setDirectAddNickname({ ...directAddNickname, [usr.id]: e.target.value })}
                                  placeholder="Nickname (optional)"
                                  className="flex-1 px-3 py-1.5 rounded-xl glass-input text-[11px] text-white placeholder-slate-500 focus:outline-none"
                                />
                                <button
                                  onClick={() => handleAddContactAndChat(usr, directAddNickname[usr.id] || '')}
                                  className="px-3 py-1.5 rounded-xl btn-romantic-primary text-xs font-semibold whitespace-nowrap flex items-center gap-1"
                                >
                                  <UserPlus className="w-3.5 h-3.5" /> Add & Chat
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : userSearchInput && !searchLoading ? (
                    <p className="text-center text-xs text-slate-500 py-4">No registered members found.</p>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Enter a user&apos;s username or user ID to find and save them as a contact.
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Create Group Form */
              <form onSubmit={handleCreateGroup} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Group Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Soul Circle ✨, Friday Night Lovers 💕"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Group Description</label>
                  <input
                    type="text"
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    placeholder="What is this romantic space about?"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                {/* Add Group Members from Saved Contacts */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Select Members from Saved Contacts ({selectedGroupMembers.length} selected)
                  </label>
                  {contacts.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-black/30 rounded-xl border border-white/5">
                      {contacts.map((c) => {
                        const isSelected = selectedGroupMembers.includes(c.userId);
                        return (
                          <div
                            key={c.userId}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedGroupMembers((prev) => prev.filter((id) => id !== c.userId));
                              } else {
                                setSelectedGroupMembers((prev) => [...prev, c.userId]);
                              }
                            }}
                            className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition ${
                              isSelected ? 'bg-rose-500/20 border border-rose-500/30' : 'hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={c.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.userId}`}
                                alt={c.displayName}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                              <span className="text-xs text-white font-medium">
                                {c.nickname ? `${c.nickname} (${c.displayName})` : c.displayName}
                              </span>
                            </div>
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              isSelected ? 'bg-rose-500 border-rose-500 text-white' : 'border-white/20'
                            }`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No saved contacts yet. Add contacts to invite them into groups.</p>
                  )}
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewChatModal(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingGroup || !groupName.trim()}
                    className="px-5 py-2 rounded-xl btn-romantic-primary text-xs font-semibold disabled:opacity-50"
                  >
                    {creatingGroup ? 'Creating...' : 'Create Romantic Group'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          EDIT CONTACT NICKNAME MODAL
         ========================================================================= */}
      {editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-sm p-6 rounded-3xl border border-rose-500/20 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-rose-400" />
              Edit Contact Nickname
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Set a romantic nickname for <strong className="text-rose-300">{editingContact.displayName}</strong>.
            </p>

            <form onSubmit={handleSaveContactNickname} className="space-y-4">
              <input
                type="text"
                value={editNicknameValue}
                onChange={(e) => setEditNicknameValue(e.target.value)}
                placeholder="e.g. My Soulmate ❤️, Honeybee 🍯"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
                autoFocus
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingContact(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl btn-romantic-primary text-xs font-semibold"
                >
                  Save Nickname
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Lightbox Viewer */}
      {activeMediaLightbox && (
        <div 
          onClick={() => setActiveMediaLightbox(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md cursor-pointer animate-fadeIn"
        >
          <img src={activeMediaLightbox} alt="Full View" className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}
