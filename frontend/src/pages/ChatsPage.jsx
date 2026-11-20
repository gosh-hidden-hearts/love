import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Send, 
  Smile, 
  Paperclip, 
  Mic, 
  MicOff, 
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
  CornerDownRight, 
  Trash2, 
  Edit2, 
  Copy, 
  Reply, 
  Sparkles,
  ArrowLeft,
  Lock,
  Play,
  Pause,
  Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCall } from '../contexts/CallContext';
import socketService from '../services/socket';
import api from '../services/api';

const EMOJI_LIST = ['❤️', '💖', '💕', '🥰', '😍', '😘', '🌹', '✨', '🥺', '🔥', '💍', '🕊️', '💌', '🌸', '🧸', '🍫', '💫', '💏', '👍', '😊'];

export default function ChatsPage() {
  const { user } = useAuth();
  const { startCall } = useCall();

  // State
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [contextMenuMsg, setContextMenuMsg] = useState(null);
  const [activeMediaLightbox, setActiveMediaLightbox] = useState(null);

  // Contact Discovery Modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [userSearchInput, setUserSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Audio Recording (Voice Message)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecordTime, setVoiceRecordTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const voiceTimerRef = useRef(null);

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initial load
  useEffect(() => {
    if (!user) return;
    loadConversations();

    // Socket real-time listeners
    const handleReceiveMessage = (msg) => {
      console.log('💬 New real-time message received:', msg);
      if (activeConversation && (msg.conversationId === activeConversation.id || msg.senderId === activeConversation.partnerId)) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }
      // Update last message in conversation list
      setConversations((prev) => 
        prev.map((c) => 
          c.id === msg.conversationId || c.partnerId === msg.senderId 
            ? { ...c, lastMessageText: msg.content || 'Media message', lastMessageAt: msg.createdAt, unreadCount: c.id === activeConversation?.id ? 0 : (c.unreadCount || 0) + 1 }
            : c
        )
      );
    };

    const handlePartnerTyping = (data) => {
      if (activeConversation && data.userId === activeConversation.partnerId) {
        setPartnerTyping(true);
      }
    };

    const handlePartnerStopTyping = (data) => {
      if (activeConversation && data.userId === activeConversation.partnerId) {
        setPartnerTyping(false);
      }
    };

    socketService.on('receive_message', handleReceiveMessage);
    socketService.on('user_typing', handlePartnerTyping);
    socketService.on('user_stop_typing', handlePartnerStopTyping);

    return () => {
      socketService.off('receive_message', handleReceiveMessage);
      socketService.off('user_typing', handlePartnerTyping);
      socketService.off('user_stop_typing', handlePartnerStopTyping);
    };
  }, [user, activeConversation]);

  // Load conversations
  const loadConversations = async () => {
    try {
      const res = await api.getConversations(user?.id);
      if (res.conversations && res.conversations.length > 0) {
        setConversations(res.conversations);
        if (!activeConversation && window.innerWidth >= 768) {
          selectConversation(res.conversations[0]);
        }
      } else {
        // Provide romantic starter conversation if completely empty
        const defaultPartner = {
          id: 'partner-demo',
          partnerId: 'partner-demo',
          name: 'Soul Heart Partner ✨',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          online: true,
          lastSeen: 'Online',
          lastMessageText: 'Welcome to our private world on GOSH ❤️',
          lastMessageAt: new Date().toISOString(),
          unreadCount: 1
        };
        setConversations([defaultPartner]);
        if (!activeConversation && window.innerWidth >= 768) {
          selectConversation(defaultPartner);
        }
      }
    } catch (e) {
      console.warn('Error loading conversations:', e);
    }
  };

  // Select conversation
  const selectConversation = async (conv) => {
    setActiveConversation(conv);
    try {
      const res = await api.getMessages(conv.id);
      if (res.messages && res.messages.length > 0) {
        setMessages(res.messages);
      } else {
        // Default warm greeting
        setMessages([
          {
            id: 'init-msg-1',
            senderId: conv.partnerId || 'partner-demo',
            content: 'Welcome to GOSH! This is your safe, private sanctuary where every word is protected and every memory is cherished. 🌹',
            createdAt: new Date().toISOString(),
            deliveryStatus: 'read',
            messageType: 'text'
          }
        ]);
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

  // Send message
  const handleSendMessage = async (customPayload = null) => {
    const textToSend = customPayload ? customPayload.content : inputText.trim();
    if (!textToSend && !customPayload?.fileUrl && !customPayload?.audioUrl) return;

    const newMsg = {
      id: 'msg-' + Date.now(),
      conversationId: activeConversation?.id || 'conv-default',
      senderId: user?.id,
      senderName: user?.displayName,
      replyToId: replyingTo?.id || null,
      replyToText: replyingTo?.content || null,
      messageType: customPayload?.messageType || 'text',
      content: textToSend,
      mediaUrl: customPayload?.fileUrl || null,
      audioUrl: customPayload?.audioUrl || null,
      duration: customPayload?.duration || null,
      deliveryStatus: 'sent',
      createdAt: new Date().toISOString()
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setReplyingTo(null);
    setShowEmojiPicker(false);
    scrollToBottom();

    // Emit over WebSocket for instant delivery
    socketService.emit('send_message', {
      ...newMsg,
      targetUserId: activeConversation?.partnerId
    });

    // Persist via backend API
    try {
      await api.sendMessage(newMsg);
    } catch (err) {
      console.error('Failed to save message to database:', err);
    }
  };

  // Voice recording (MediaRecorder)
  const startVoiceRecording = async () => {
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

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        handleSendMessage({
          messageType: 'audio',
          content: 'Voice Message',
          audioUrl,
          duration: voiceRecordTime
        });
        stream.getTracks().forEach((track) => track.stop());
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

  // File Attachment Upload (Images, Videos, Docs)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    setShowAttachmentMenu(false);
  };

  // Message Reactions
  const handleReactToMessage = async (msgId, reaction) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, reaction } : m))
    );
    setContextMenuMsg(null);
    try {
      await api.reactToMessage(msgId, user?.id, reaction);
    } catch (e) {
      console.warn(e);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId, deleteForEveryone = false) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    setContextMenuMsg(null);
    try {
      await api.deleteMessage(msgId, user?.id, deleteForEveryone);
    } catch (e) {
      console.warn(e);
    }
  };

  // Contact Discovery: Search users
  const handleSearchUsers = async (e) => {
    e.preventDefault();
    if (!userSearchInput.trim()) return;
    setSearchLoading(true);
    try {
      const res = await api.searchUsers(userSearchInput.trim());
      setSearchResults(res.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleStartNewChatWithUser = (foundUser) => {
    const newConv = {
      id: 'conv-' + foundUser.id,
      partnerId: foundUser.id,
      name: foundUser.display_name || foundUser.username || foundUser.email,
      avatarUrl: foundUser.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${foundUser.id}`,
      online: Boolean(foundUser.online_status),
      lastSeen: foundUser.online_status ? 'Online' : 'Recently seen',
      lastMessageText: 'Say hi! 💕',
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0
    };

    setConversations((prev) => [newConv, ...prev.filter((c) => c.partnerId !== foundUser.id)]);
    setActiveConversation(newConv);
    setShowNewChatModal(false);
    setUserSearchInput('');
    setSearchResults([]);
    selectConversation(newConv);
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full w-full bg-[#0c0d14] overflow-hidden select-none">
      {/* =========================================================================
          LEFT PANE: CONVERSATION LIST (Responsive: hidden on mobile if chat is open)
         ========================================================================= */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-white/5 bg-[#12141f] ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-wide">Chats</h2>
            <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-medium">GOSH</span>
          </div>

          <div className="flex items-center gap-2">
            {/* New Chat Button */}
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition"
              title="Discover & Add Contact"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-white/5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Conversation List Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const isSelected = activeConversation?.id === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition ${
                    isSelected ? 'bg-rose-500/15 border-l-4 border-rose-500' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Avatar with glowing online status */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={conv.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${conv.id}`}
                      alt={conv.name}
                      className="w-12 h-12 rounded-full object-cover border border-white/10"
                    />
                    {conv.online && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#12141f] shadow-glow-green" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-white truncate">{conv.name}</h4>
                      <span className="text-[10px] text-slate-500">
                        {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400 truncate max-w-[180px]">
                        {conv.lastMessageText || 'No messages yet'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
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
              <p>No conversations found.</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-3 text-rose-400 font-medium hover:underline"
              >
                Find contacts by username or mobile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          RIGHT PANE: ACTIVE CHAT SCREEN
         ========================================================================= */}
      <div className={`flex-1 flex flex-col h-full bg-[#0c0d14] relative ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
        {activeConversation ? (
          <>
            {/* Chat Top Header */}
            <div className="h-16 px-4 border-b border-white/5 bg-[#12141f]/80 backdrop-blur-md flex items-center justify-between z-20">
              <div className="flex items-center gap-3">
                {/* Back button (Mobile only) */}
                <button
                  onClick={() => setActiveConversation(null)}
                  className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Avatar & Partner Info */}
                <div className="relative">
                  <img
                    src={activeConversation.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${activeConversation.id}`}
                    alt={activeConversation.name}
                    className="w-10 h-10 rounded-full object-cover border border-rose-500/40"
                  />
                  {activeConversation.online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#12141f]" />
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                    {activeConversation.name}
                  </h3>
                  <p className="text-[10px] text-rose-400 font-medium flex items-center gap-1">
                    {partnerTyping ? (
                      <span className="animate-pulse">typing...</span>
                    ) : activeConversation.online ? (
                      'Online'
                    ) : (
                      'Last seen recently'
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Audio Call, Video Call, More */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startCall({
                    receiverId: activeConversation.partnerId || 'partner-demo',
                    receiverName: activeConversation.name,
                    receiverAvatar: activeConversation.avatarUrl,
                    type: 'audio'
                  })}
                  className="p-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 transition"
                  title="Audio Call"
                >
                  <Phone className="w-4 h-4" />
                </button>

                <button
                  onClick={() => startCall({
                    receiverId: activeConversation.partnerId || 'partner-demo',
                    receiverName: activeConversation.name,
                    receiverAvatar: activeConversation.avatarUrl,
                    type: 'video'
                  })}
                  className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition"
                  title="Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message Feed Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
              {/* Romantic background watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                <Heart className="w-80 h-80 fill-rose-500" />
              </div>

              {/* Date Separator */}
              <div className="flex justify-center my-3">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] text-slate-400 font-medium">
                  Today
                </span>
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
                      className={`max-w-[85%] md:max-w-md rounded-2xl p-3 shadow-lg relative text-xs md:text-sm leading-relaxed ${
                        isMe
                          ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-tr-none'
                          : 'bg-[#1a1c2b] text-slate-100 rounded-tl-none border border-white/5'
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
                          onClick={() => setActiveMediaLightbox(msg.mediaUrl)}
                          className="mb-2 rounded-xl overflow-hidden cursor-pointer border border-white/10 max-h-60"
                        >
                          <img src={msg.mediaUrl} alt="Shared" className="w-full h-full object-cover hover:scale-105 transition" />
                        </div>
                      )}

                      {/* Video Attachment */}
                      {msg.messageType === 'video' && msg.mediaUrl && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-white/10 max-h-60">
                          <video src={msg.mediaUrl} controls className="w-full" />
                        </div>
                      )}

                      {/* Voice Message */}
                      {msg.messageType === 'audio' && msg.audioUrl && (
                        <div className="flex items-center gap-3 py-1">
                          <audio src={msg.audioUrl} controls className="h-8 max-w-[220px]" />
                        </div>
                      )}

                      {/* Text content */}
                      {msg.content && msg.messageType !== 'audio' && (
                        <p className="break-words select-text">{msg.content}</p>
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

            {/* Bottom Composer */}
            <div className="p-3 border-t border-white/5 bg-[#12141f] relative">
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

              {/* Voice Recording Active Bar */}
              {isRecordingVoice ? (
                <div className="flex items-center justify-between bg-rose-950/40 border border-rose-500/30 rounded-2xl px-4 py-2.5 animate-pulse">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-mono text-rose-300">
                      Recording: {Math.floor(voiceRecordTime / 60)}:{(voiceRecordTime % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={cancelVoiceRecording} className="text-xs text-slate-400 hover:text-white">
                      Cancel
                    </button>
                    <button
                      onClick={stopVoiceRecording}
                      className="p-2 rounded-full bg-rose-500 text-white shadow-glow-pink hover:bg-rose-600 transition"
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
                  className="flex items-center gap-2"
                >
                  {/* Emoji Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-slate-400 hover:text-yellow-400 transition"
                    title="Emojis"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  {/* Attachment Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                    className="p-2 text-slate-400 hover:text-rose-400 transition"
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
                    className="flex-1 py-2.5 px-4 rounded-xl glass-input text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none"
                  />

                  {/* Voice Record or Send Button */}
                  {inputText.trim() ? (
                    <button
                      type="submit"
                      className="p-2.5 rounded-xl btn-romantic-primary text-white transition transform hover:scale-105 active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition"
                      title="Hold to Record Voice Message"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                </form>
              )}
            </div>
          </>
        ) : (
          /* Empty State when no conversation selected on desktop */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4 shadow-glow-pink">
              <Heart className="w-10 h-10 fill-rose-500/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Your Romantic Sanctuary</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Select a conversation or find your soul connection using their mobile number, email, or username.
            </p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="mt-5 px-5 py-2.5 rounded-xl btn-romantic-primary text-xs font-medium"
            >
              Start New Chat
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          CONTACT DISCOVERY MODAL (Search by Username, Email, or Mobile)
         ========================================================================= */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-rose-500/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" /> Discover Soul Connections
              </h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSearchUsers} className="flex gap-2 mb-4">
              <input
                type="text"
                value={userSearchInput}
                onChange={(e) => setUserSearchInput(e.target.value)}
                placeholder="Search by @username, email, or mobile..."
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

            {/* Results list */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchResults.length > 0 ? (
                searchResults.map((usr) => (
                  <div
                    key={usr.id}
                    onClick={() => handleStartNewChatWithUser(usr)}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-rose-500/20 border border-white/5 flex items-center justify-between cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={usr.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${usr.id}`}
                        alt={usr.display_name}
                        className="w-10 h-10 rounded-full object-cover border border-rose-500/30"
                      />
                      <div>
                        <h4 className="text-xs font-semibold text-white">{usr.display_name}</h4>
                        <p className="text-[10px] text-slate-400">@{usr.username || 'user'} • {usr.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-rose-400 font-medium">Chat →</span>
                  </div>
                ))
              ) : userSearchInput && !searchLoading ? (
                <p className="text-center text-xs text-slate-500 py-4">No registered members found.</p>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  Enter a partner&apos;s username, email, or mobile number to connect.
                </div>
              )}
            </div>
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
