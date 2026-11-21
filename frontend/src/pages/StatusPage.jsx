import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  CircleDot, 
  Sparkles, 
  Camera, 
  Type, 
  Image as ImageIcon, 
  Eye, 
  Heart, 
  X, 
  Send, 
  Smile, 
  Clock, 
  ChevronRight,
  Shield,
  Palette,
  Trash2,
  Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const STATUS_GRADIENTS = [
  'from-purple-900 to-rose-900',
  'from-rose-950 to-slate-900',
  'from-emerald-950 to-slate-900',
  'from-indigo-950 to-purple-950',
  'from-amber-950 to-rose-950'
];

export default function StatusPage() {
  const { user } = useAuth();

  // State
  const [statuses, setStatuses] = useState([]);
  const [myStatuses, setMyStatuses] = useState([]);
  const [activeStoryViewer, setActiveStoryViewer] = useState(null); // Active story object
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Status Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusType, setStatusType] = useState('text'); // 'text' | 'media'
  const [textContent, setTextContent] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(STATUS_GRADIENTS[0]);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState('contacts'); // 'contacts' | 'everyone' | 'partner_only'
  const [uploading, setUploading] = useState(false);

  // Status Reply State
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  // Load Statuses
  useEffect(() => {
    loadStatuses();
  }, [user]);

  const loadStatuses = async () => {
    try {
      const res = await api.getStatuses(user?.id);
      if (res.statuses) {
        setStatuses(res.statuses);
        setMyStatuses(res.myStatuses || []);
      } else {
        // Romantic demo stories
        const demoStories = [
          {
            id: 'status-1',
            userId: 'partner-1',
            userName: 'Soul Connection ✨',
            userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            type: 'text',
            content: 'Under the same sky, forever thinking of you 🌌✨',
            gradient: 'from-purple-900 to-rose-900',
            createdAt: new Date().toISOString(),
            viewsCount: 4,
            viewers: ['Maya Ross', 'Alexander', 'Elena', 'Soul Connection']
          },
          {
            id: 'status-2',
            userId: 'partner-2',
            userName: 'Juliet 🌹',
            userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
            type: 'media',
            mediaUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&auto=format&fit=crop&q=80',
            caption: 'Our favorite coffee spot from our first walk ☕❤️',
            createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
            viewsCount: 9,
            viewers: ['You', 'Noah', 'Sophia']
          }
        ];
        setStatuses(demoStories);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Story progression timer
  useEffect(() => {
    if (!activeStoryViewer || isPaused) return;

    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + 2; // 50 ticks = 5 seconds
      });
    }, 100);

    return () => clearInterval(timer);
  }, [activeStoryViewer, isPaused, storyIndex]);

  const openStory = (storyList, index = 0) => {
    setActiveStoryViewer(storyList[index]);
    setStoryIndex(index);
    setStoryProgress(0);
    setReplyText('');
    // Mark as viewed in backend
    if (user && storyList[index]?.id) {
      api.markStatusViewed(storyList[index].id, user.id, user.displayName).catch(console.warn);
    }
  };

  const handleDeleteStatus = async (statusId) => {
    if (window.confirm('Delete this status update permanently?')) {
      try {
        await api.deleteStatus(statusId);
        setMyStatuses((prev) => prev.filter((s) => s.id !== statusId));
        setStatuses((prev) => prev.filter((s) => s.id !== statusId));
        setActiveStoryViewer(null);
      } catch (err) {
        console.error('Failed to delete status:', err);
      }
    }
  };

  const handleSendStatusReply = async () => {
    if (!replyText.trim() || !activeStoryViewer || isReplying) return;
    setIsReplying(true);
    try {
      const summary = activeStoryViewer.type === 'media'
        ? 'photo glimpse'
        : `"${activeStoryViewer.content?.slice(0, 35)}..."`;
      const replyMessage = `❤️ Replied to your status (${summary}):\n${replyText.trim()}`;

      await api.sendMessage({
        senderId: user?.id,
        receiverId: activeStoryViewer.userId,
        content: replyMessage,
        messageType: 'text'
      });

      setReplyText('');
      setActiveStoryViewer(null);
    } catch (e) {
      console.warn('Failed to send status reply:', e);
    } finally {
      setIsReplying(false);
    }
  };

  const handleNextStory = () => {
    if (storyIndex < statuses.length - 1) {
      setStoryIndex((prev) => prev + 1);
      setActiveStoryViewer(statuses[storyIndex + 1]);
      setStoryProgress(0);
    } else {
      setActiveStoryViewer(null);
    }
  };

  const handlePrevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      setActiveStoryViewer(statuses[storyIndex - 1]);
      setStoryProgress(0);
    }
  };

  // File selection for media status
  const handleMediaSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setStatusType('media');
    }
  };

  // Submit new status
  const handleCreateStatus = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('userId', user?.id || 'current-user');
      formData.append('userName', user?.displayName || 'Me');
      formData.append('userAvatar', user?.avatarUrl || '');
      formData.append('statusType', statusType);
      formData.append('privacy', privacy);

      if (statusType === 'text') {
        formData.append('content', textContent);
        formData.append('gradient', selectedGradient);
      } else {
        formData.append('caption', caption);
        if (mediaFile) {
          formData.append('media', mediaFile);
        }
      }

      await api.createStatus(formData);

      // Local optimistic update
      const newStatus = {
        id: 'status-' + Date.now(),
        userId: user?.id,
        userName: 'My Status',
        userAvatar: user?.avatarUrl,
        type: statusType,
        content: textContent,
        gradient: selectedGradient,
        mediaUrl: mediaPreview,
        caption,
        createdAt: new Date().toISOString(),
        viewsCount: 0,
        viewers: []
      };

      setMyStatuses((prev) => [newStatus, ...prev]);
      setShowCreateModal(false);
      setTextContent('');
      setMediaFile(null);
      setMediaPreview(null);
      setCaption('');
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#0c0d14] overflow-y-auto p-4 md:p-8 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-w-4xl mx-auto w-full">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            Status Updates <Sparkles className="w-5 h-5 text-rose-400" />
          </h1>
          <p className="text-xs text-slate-400">Ephemeral romantic glimpses expiring in 24 hours</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl btn-romantic-primary text-xs font-semibold flex items-center gap-2 shadow-glow-pink"
        >
          <Plus className="w-4 h-4" />
          <span>Add Status</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* =========================================================================
            MY STATUS ROW
           ========================================================================= */}
        <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.id}`}
                alt="My Status"
                className="w-14 h-14 rounded-full object-cover border-2 border-rose-500/40 p-0.5"
              />
              <button
                onClick={() => setShowCreateModal(true)}
                className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-[#151724]"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">My Status</h3>
              <p className="text-xs text-slate-400">
                {myStatuses.length > 0 
                  ? `${myStatuses.length} active updates • Tap to view` 
                  : 'Tap to share a romantic glimpse'}
              </p>
            </div>
          </div>

          {myStatuses.length > 0 && (
            <button
              onClick={() => openStory(myStatuses, 0)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-rose-300 font-medium transition"
            >
              View Mine
            </button>
          )}
        </div>

        {/* =========================================================================
            RECENT UPDATES (WhatsApp Inspired Stories Grid)
           ========================================================================= */}
        <div>
          <h2 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CircleDot className="w-3.5 h-3.5" /> Recent Partner Updates
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {statuses.map((status, idx) => (
              <div
                key={status.id}
                onClick={() => openStory(statuses, idx)}
                className="h-56 rounded-2xl relative overflow-hidden cursor-pointer group border border-white/10 shadow-lg transform transition duration-300 hover:scale-[1.02]"
              >
                {/* Background (Gradient or Image) */}
                {status.type === 'media' && status.mediaUrl ? (
                  <img
                    src={status.mediaUrl}
                    alt={status.userName}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${status.gradient || 'from-purple-900 to-rose-900'} p-4 flex items-center justify-center text-center text-xs font-medium text-white`}>
                    <p className="line-clamp-4 leading-relaxed">&ldquo;{status.content}&rdquo;</p>
                  </div>
                )}

                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                {/* Top: Avatar with romantic story ring */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <div className="p-0.5 rounded-full bg-gradient-to-tr from-rose-500 to-emerald-400">
                    <img
                      src={status.userAvatar}
                      alt={status.userName}
                      className="w-8 h-8 rounded-full object-cover border border-black"
                    />
                  </div>
                </div>

                {/* Bottom: User Name & Time */}
                <div className="absolute bottom-3 left-3 right-3">
                  <h4 className="text-xs font-semibold text-white truncate drop-shadow">{status.userName}</h4>
                  <p className="text-[10px] text-slate-300 flex items-center gap-1 drop-shadow">
                    <Clock className="w-3 h-3" />
                    {new Date(status.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          FULL SCREEN INTERACTIVE STATUS VIEWER (WhatsApp/Instagram Style)
         ========================================================================= */}
      {activeStoryViewer && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 md:p-8 animate-fadeIn"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Top Progress Bar */}
          <div className="w-full max-w-md mx-auto z-20">
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-rose-500 transition-all duration-100 linear"
                style={{ width: `${storyProgress}%` }}
              />
            </div>

            {/* Header info */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <img
                  src={activeStoryViewer.userAvatar}
                  alt={activeStoryViewer.userName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-rose-500"
                />
                <div>
                  <h4 className="text-sm font-semibold">{activeStoryViewer.userName}</h4>
                  <span className="text-[10px] text-slate-400">
                    {new Date(activeStoryViewer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeStoryViewer.userId === user?.id && (
                  <button
                    onClick={() => handleDeleteStatus(activeStoryViewer.id)}
                    className="p-2 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition"
                    title="Delete Status"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => setActiveStoryViewer(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Story Content Area */}
          <div className="flex-1 w-full max-w-md mx-auto my-auto flex items-center justify-center relative">
            {/* Click zones for navigation */}
            <div 
              onClick={handlePrevStory}
              className="absolute left-0 inset-y-0 w-1/3 z-10 cursor-pointer" 
              title="Previous Story"
            />
            <div 
              onClick={handleNextStory}
              className="absolute right-0 inset-y-0 w-1/3 z-10 cursor-pointer" 
              title="Next Story"
            />

            {/* Media or Text Display */}
            {activeStoryViewer.type === 'media' ? (
              <div className="relative max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={activeStoryViewer.mediaUrl}
                  alt="Story"
                  className="w-full h-full object-contain"
                />
                {activeStoryViewer.caption && (
                  <div className="absolute bottom-4 inset-x-4 bg-black/60 backdrop-blur-md p-3 rounded-xl text-center text-xs text-white">
                    {activeStoryViewer.caption}
                  </div>
                )}
              </div>
            ) : (
              <div className={`w-full max-w-sm h-96 rounded-3xl bg-gradient-to-br ${activeStoryViewer.gradient || 'from-purple-900 to-rose-900'} p-8 flex flex-col items-center justify-center text-center shadow-2xl`}>
                <Heart className="w-10 h-10 text-rose-400 fill-rose-400/40 mb-4 animate-pulse-slow" />
                <p className="text-lg md:text-xl font-romantic text-white leading-relaxed">
                  &ldquo;{activeStoryViewer.content}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Bottom Bar: Viewer count for author, Reply box for other users */}
          <div className="w-full max-w-md mx-auto z-20">
            {activeStoryViewer.userId === user?.id ? (
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>{activeStoryViewer.viewsCount || 0} Viewers</span>
                </div>
                <div className="flex -space-x-1.5 overflow-hidden">
                  {(activeStoryViewer.viewers || []).slice(0, 3).map((v, i) => (
                    <span key={i} className="inline-block w-5 h-5 rounded-full bg-rose-500/80 text-[9px] text-white font-bold flex items-center justify-center border border-black">
                      {v.charAt(0)}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendStatusReply();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Send a romantic reply to chat..."
                  className="flex-1 py-3 px-4 rounded-full glass-input text-xs text-white placeholder-slate-400 focus:outline-none"
                />
                <button 
                  type="submit"
                  disabled={!replyText.trim() || isReplying}
                  className="p-3 rounded-full btn-romantic-primary text-white disabled:opacity-50 transition"
                  title="Send Reply"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          STATUS CREATION MODAL
         ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-rose-500/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" /> Share Glimpse
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toggle Status Type: Text vs Photo */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-white/5 rounded-xl">
              <button
                type="button"
                onClick={() => setStatusType('text')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                  statusType === 'text' ? 'bg-rose-500 text-white' : 'text-slate-400'
                }`}
              >
                <Type className="w-4 h-4" /> Text Status
              </button>
              <button
                type="button"
                onClick={() => setStatusType('media')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                  statusType === 'media' ? 'bg-rose-500 text-white' : 'text-slate-400'
                }`}
              >
                <Camera className="w-4 h-4" /> Photo / Video
              </button>
            </div>

            <form onSubmit={handleCreateStatus} className="space-y-4">
              {statusType === 'text' ? (
                <>
                  {/* Text Status Area with Color Gradient preview */}
                  <div className={`w-full h-44 rounded-2xl bg-gradient-to-br ${selectedGradient} p-4 flex items-center justify-center relative shadow-inner`}>
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Write your soul message here..."
                      className="w-full bg-transparent text-center text-white placeholder-white/50 text-base font-romantic resize-none focus:outline-none"
                      rows={3}
                      required
                    />
                  </div>

                  {/* Gradient Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Palette className="w-3.5 h-3.5" /> Background:
                    </span>
                    <div className="flex gap-2">
                      {STATUS_GRADIENTS.map((grad, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedGradient(grad)}
                          className={`w-6 h-6 rounded-full bg-gradient-to-br ${grad} border ${selectedGradient === grad ? 'border-white scale-110' : 'border-transparent'}`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Photo / Video upload input */}
                  {mediaPreview ? (
                    <div className="relative rounded-2xl overflow-hidden max-h-52 border border-white/10">
                      <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setMediaFile(null);
                          setMediaPreview(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-40 rounded-2xl border-2 border-dashed border-white/20 hover:border-rose-500 flex flex-col items-center justify-center cursor-pointer transition">
                      <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-xs text-slate-300">Tap to upload Photo or Video</span>
                      <input type="file" accept="image/*,video/*" onChange={handleMediaSelect} className="hidden" />
                    </label>
                  )}

                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a sweet caption..."
                    className="w-full py-2.5 px-4 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </>
              )}

              {/* Status Privacy Selector */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-rose-400" /> Who can see this?
                </span>
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value)}
                  className="bg-transparent text-rose-300 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="contacts" className="bg-[#151724] text-white">Contacts Only</option>
                  <option value="partner_only" className="bg-[#151724] text-white">Soul Bond Only ❤️</option>
                  <option value="everyone" className="bg-[#151724] text-white">Everyone</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={uploading || (statusType === 'text' && !textContent.trim()) || (statusType === 'media' && !mediaFile)}
                className="w-full py-3 rounded-xl btn-romantic-primary font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {uploading ? 'Publishing Status...' : 'Post Status Update'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
