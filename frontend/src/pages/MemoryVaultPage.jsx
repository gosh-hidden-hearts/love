import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  UploadCloud, 
  FolderHeart, 
  Sparkles, 
  Calendar, 
  Tag, 
  Trash2, 
  Download, 
  Eye, 
  X, 
  Plus, 
  Film, 
  Image as ImageIcon, 
  Mic, 
  FileText, 
  Lock,
  Search,
  Filter
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const FEELING_TAGS = ['Heartfelt ❤️', 'Sweet Moment 🌸', 'Anniversary 💍', 'Dreamy ✨', 'Secret Note 💌', 'First Date ☕'];
const ALBUM_PRESETS = ['All Memories', 'First Impressions', 'Adventures & Trips', 'Anniversary & Milestones', 'Secret Love Letters'];

export default function MemoryVaultPage() {
  const { user } = useAuth();

  // State
  const [memories, setMemories] = useState([]);
  const [albums, setAlbums] = useState(ALBUM_PRESETS);
  const [selectedAlbum, setSelectedAlbum] = useState('All Memories');
  const [activeTabFilter, setActiveTabFilter] = useState('all'); // 'all' | 'photo' | 'video' | 'audio' | 'document'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLightboxMemory, setActiveLightboxMemory] = useState(null);
  const [showAddAlbumModal, setShowAddAlbumModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState('');
  const [memoryDate, setMemoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTag, setSelectedTag] = useState(FEELING_TAGS[0]);
  const [targetAlbum, setTargetAlbum] = useState('All Memories');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    loadMemories();
  }, [user]);

  const loadMemories = async () => {
    try {
      const res = await api.getMemories(user?.id);
      if (res.memories && res.memories.length > 0) {
        setMemories(res.memories);
        // Collect custom albums from memories
        const loadedAlbums = new Set(ALBUM_PRESETS);
        res.memories.forEach(m => {
          if (m.album) loadedAlbums.add(m.album);
        });
        setAlbums(Array.from(loadedAlbums));
      } else {
        // Romantic demo vault items
        setMemories([
          {
            id: 'mem-1',
            fileName: 'Sunset_By_The_Harbor.jpg',
            fileType: 'photo',
            fileSize: 2450000,
            megaDownloadUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=1000&auto=format&fit=crop&q=80',
            caption: 'The moment we watched the sky turn gold together ✨',
            memoryDate: '2026-10-14',
            feelingsTag: 'Heartfelt ❤️',
            album: 'Adventures & Trips',
            uploaderName: 'Soul Heart Partner',
            createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
          },
          {
            id: 'mem-2',
            fileName: 'First_Coffee_Meeting.jpg',
            fileType: 'photo',
            fileSize: 1800000,
            megaDownloadUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1000&auto=format&fit=crop&q=80',
            caption: 'Our table by the window at Cafe Reverie ☕',
            memoryDate: '2026-08-20',
            feelingsTag: 'First Date ☕',
            album: 'First Impressions',
            uploaderName: 'You',
            createdAt: new Date(Date.now() - 3600000 * 120).toISOString()
          },
          {
            id: 'mem-3',
            fileName: 'A_Lover_Secret_Note.txt',
            fileType: 'document',
            fileSize: 4200,
            megaDownloadUrl: '#',
            caption: 'A letter written at 2:00 AM under the stars 💌',
            memoryDate: '2026-11-01',
            feelingsTag: 'Secret Note 💌',
            album: 'Secret Love Letters',
            uploaderName: 'Soul Heart Partner',
            createdAt: new Date(Date.now() - 3600000 * 240).toISOString()
          }
        ]);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUploadMemory = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress('Encrypting and streaming to MEGA Cloud Storage...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('uploaderId', user?.id || 'current-user');
      formData.append('uploaderName', user?.displayName || 'Me');
      formData.append('caption', caption);
      formData.append('memoryDate', memoryDate);
      formData.append('feelingsTag', selectedTag);
      formData.append('album', targetAlbum);

      let fileType = 'document';
      if (selectedFile.type.startsWith('image/')) fileType = 'photo';
      else if (selectedFile.type.startsWith('video/')) fileType = 'video';
      else if (selectedFile.type.startsWith('audio/')) fileType = 'audio';
      formData.append('fileType', fileType);

      const res = await api.uploadMemory(formData);

      // Local optimistic update
      const newMemory = {
        id: res.memory?.id || 'mem-' + Date.now(),
        fileName: selectedFile.name,
        fileType,
        fileSize: selectedFile.size,
        megaDownloadUrl: res.memory?.megaDownloadUrl || previewUrl,
        caption,
        memoryDate,
        feelingsTag: selectedTag,
        album: targetAlbum,
        uploaderName: user?.displayName || 'You',
        createdAt: new Date().toISOString()
      };

      setMemories((prev) => [newMemory, ...prev]);
      setShowUploadModal(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption('');
    } catch (err) {
      console.error('MEGA Upload failed:', err);
      alert('Upload error: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleCreateAlbum = (e) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;
    const trimmed = newAlbumName.trim();
    if (!albums.includes(trimmed)) {
      setAlbums((prev) => [...prev, trimmed]);
    }
    setSelectedAlbum(trimmed);
    setNewAlbumName('');
    setShowAddAlbumModal(false);
  };

  const handleDeleteMemory = async (memId) => {
    if (!confirm('Are you sure you want to remove this memory from your shared vault?')) return;
    setMemories((prev) => prev.filter((m) => m.id !== memId));
    try {
      await api.deleteMemory(memId, user?.id);
    } catch (e) {
      console.warn(e);
    }
  };

  // Filtered list
  const filteredMemories = memories.filter((m) => {
    if (selectedAlbum !== 'All Memories' && m.album !== selectedAlbum) return false;
    if (activeTabFilter !== 'all' && m.fileType !== activeTabFilter) return false;
    if (searchQuery && !m.caption?.toLowerCase().includes(searchQuery.toLowerCase()) && !m.fileName?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex-1 h-full flex flex-col bg-[#0c0d14] overflow-y-auto p-4 md:p-8 select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 max-w-6xl mx-auto w-full">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-white">Memory Vault</h1>
            <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full font-semibold border border-rose-500/30">
              MEGA Cloud Protected
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Our shared sanctuary of photos, videos, voice memos, and love letters</p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-5 py-2.5 rounded-xl btn-romantic-primary text-xs font-semibold flex items-center justify-center gap-2 shadow-glow-pink self-start md:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Memory</span>
        </button>
      </div>

      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Album Selector Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {albums.map((album) => (
            <button
              key={album}
              onClick={() => setSelectedAlbum(album)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition flex items-center gap-2 ${
                selectedAlbum === album
                  ? 'bg-rose-500 text-white shadow-glow-pink'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400'
              }`}
            >
              <FolderHeart className="w-3.5 h-3.5" />
              <span>{album}</span>
            </button>
          ))}
          <button
            onClick={() => setShowAddAlbumModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Album</span>
          </button>
        </div>

        {/* Media Type Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Media Types */}
          <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl self-start sm:self-auto">
            {[
              { id: 'all', label: 'All', icon: Sparkles },
              { id: 'photo', label: 'Photos', icon: ImageIcon },
              { id: 'video', label: 'Videos', icon: Film },
              { id: 'audio', label: 'Voice Notes', icon: Mic },
              { id: 'document', label: 'Notes & Docs', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                    activeTabFilter === tab.id ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Memories Grid Gallery */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredMemories.length > 0 ? (
            filteredMemories.map((mem) => (
              <div
                key={mem.id}
                className="glass-card rounded-2xl overflow-hidden border border-white/5 group hover:border-rose-500/40 transition duration-300 flex flex-col justify-between"
              >
                {/* Media preview area */}
                <div className="relative h-48 bg-black/40 overflow-hidden flex items-center justify-center">
                  {mem.fileType === 'photo' ? (
                    <img
                      src={mem.megaDownloadUrl}
                      alt={mem.caption}
                      onClick={() => setActiveLightboxMemory(mem)}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500 cursor-pointer"
                    />
                  ) : mem.fileType === 'video' ? (
                    <video src={mem.megaDownloadUrl} controls className="w-full h-full object-cover" />
                  ) : mem.fileType === 'audio' ? (
                    <div className="text-center p-4">
                      <Mic className="w-10 h-10 text-rose-400 mx-auto mb-2 animate-pulse" />
                      <audio src={mem.megaDownloadUrl} controls className="h-8 max-w-[180px]" />
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <FileText className="w-12 h-12 text-sky-400 mx-auto mb-1" />
                      <span className="text-xs text-slate-300 font-mono truncate block max-w-[180px]">{mem.fileName}</span>
                    </div>
                  )}

                  {/* Feeling badge */}
                  {mem.feelingsTag && (
                    <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-rose-300 font-medium border border-white/10">
                      {mem.feelingsTag}
                    </div>
                  )}
                </div>

                {/* Details Footer */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{mem.memoryDate}</span>
                      <span>•</span>
                      <span>By {mem.uploaderName}</span>
                    </div>

                    <p className="text-xs text-white font-medium line-clamp-2 leading-relaxed">
                      {mem.caption || mem.fileName}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5 text-xs text-slate-400">
                    <span className="text-[10px] text-slate-500">
                      {(mem.fileSize / (1024 * 1024)).toFixed(1)} MB • MEGA
                    </span>

                    <div className="flex items-center gap-1">
                      <a
                        href={mem.megaDownloadUrl}
                        download={mem.fileName}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center text-slate-500 text-xs">
              <FolderHeart className="w-12 h-12 text-rose-500/20 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-300">Your Memory Vault is awaiting moments.</p>
              <p className="mt-1">Upload photos, videos, or love notes to cherish together.</p>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          UPLOAD MEMORY MODAL (Direct to MEGA Cloud Storage)
         ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-rose-500/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" /> Upload to MEGA Cloud
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadMemory} className="space-y-4">
              {/* File selector or preview */}
              {previewUrl ? (
                <div className="relative rounded-2xl overflow-hidden max-h-48 border border-white/10">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : selectedFile ? (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                  <span className="truncate text-white font-medium">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-slate-400 hover:text-white ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-full h-36 rounded-2xl border-2 border-dashed border-white/20 hover:border-rose-500 flex flex-col items-center justify-center cursor-pointer transition">
                  <UploadCloud className="w-8 h-8 text-rose-400 mb-2" />
                  <span className="text-xs text-slate-300">Choose Photo, Video, Audio, or Document</span>
                  <span className="text-[10px] text-slate-500 mt-1">Uploaded securely to MEGA Storage</span>
                  <input type="file" onChange={handleFileChange} className="hidden" required />
                </label>
              )}

              {/* Caption */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Memory Caption or Love Note
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="What made this moment special? ❤️"
                  className="w-full py-2.5 px-4 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
                  required
                />
              </div>

              {/* Date & Feeling Tag */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Memory Date</label>
                  <input
                    type="date"
                    value={memoryDate}
                    onChange={(e) => setMemoryDate(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl glass-input text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Feeling Tag</label>
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl glass-input text-xs text-white focus:outline-none bg-[#151724]"
                  >
                    {FEELING_TAGS.map((tag) => (
                      <option key={tag} value={tag} className="bg-slate-900 text-white">
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Album selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Album</label>
                <select
                  value={targetAlbum}
                  onChange={(e) => setTargetAlbum(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl glass-input text-xs text-white focus:outline-none bg-[#151724]"
                >
                  {albums.map((album) => (
                    <option key={album} value={album} className="bg-slate-900 text-white">
                      {album}
                    </option>
                  ))}
                </select>
              </div>

              {/* Progress message */}
              {uploadProgress && (
                <p className="text-[11px] text-rose-300 text-center animate-pulse">{uploadProgress}</p>
              )}

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full py-3 rounded-xl btn-romantic-primary font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {uploading ? 'Streaming to MEGA...' : 'Save to Shared Vault'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* New Custom Album Modal */}
      {showAddAlbumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-sm p-6 rounded-3xl border border-rose-500/30 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <FolderHeart className="w-4 h-4 text-rose-400" /> Create Custom Album
              </h3>
              <button onClick={() => setShowAddAlbumModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAlbum} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Album Title</label>
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="e.g. Paris 2026, Our Cozy Nights..."
                  className="w-full py-2.5 px-4 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl btn-romantic-primary font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition"
              >
                Create Album
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox for photos */}
      {activeLightboxMemory && (
        <div
          onClick={() => setActiveLightboxMemory(null)}
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md cursor-pointer animate-fadeIn"
        >
          <img
            src={activeLightboxMemory.megaDownloadUrl}
            alt={activeLightboxMemory.caption}
            className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl mb-3"
          />
          <p className="text-white text-sm font-medium">{activeLightboxMemory.caption}</p>
          <span className="text-xs text-rose-300 mt-1">{activeLightboxMemory.feelingsTag} • {activeLightboxMemory.memoryDate}</span>
        </div>
      )}
    </div>
  );
}
