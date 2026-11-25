import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Video, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Sparkles, 
  Clock, 
  UserPlus, 
  X,
  Search,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCall } from '../contexts/CallContext';
import api from '../services/api';

export default function CallsPage() {
  const { user } = useAuth();
  const { startCall } = useCall();

  const [callLogs, setCallLogs] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'missed'
  const [showNewCallModal, setShowNewCallModal] = useState(false);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    loadCallHistory();
    loadContacts();
  }, [user]);

  const loadCallHistory = async () => {
    try {
      const res = await api.getCallHistory(user?.id);
      if (res.calls && res.calls.length > 0) {
        setCallLogs(res.calls);
      } else {
        // Romantic demo logs
        setCallLogs([
          {
            id: 'call-1',
            callerId: 'partner-1',
            partnerName: 'Soul Heart Partner ✨',
            partnerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            callType: 'video',
            direction: 'incoming',
            status: 'connected',
            durationSeconds: 1420, // 23 mins
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
          },
          {
            id: 'call-2',
            callerId: user?.id,
            partnerName: 'Soul Heart Partner ✨',
            partnerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            callType: 'audio',
            direction: 'outgoing',
            status: 'connected',
            durationSeconds: 310,
            createdAt: new Date(Date.now() - 3600000 * 26).toISOString()
          },
          {
            id: 'call-3',
            callerId: 'partner-1',
            partnerName: 'Soul Heart Partner ✨',
            partnerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            callType: 'video',
            direction: 'incoming',
            status: 'missed',
            durationSeconds: 0,
            createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
          }
        ]);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const loadContacts = async () => {
    try {
      const res = await api.searchUsers('');
      if (res.users) {
        setContacts(res.users);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const formatDuration = (secs) => {
    if (!secs) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const filteredLogs = callLogs.filter((log) => {
    if (filterType === 'missed') return log.status === 'missed';
    return true;
  });

  return (
    <div className="flex-1 h-full flex flex-col bg-[#0c0d14] overflow-y-auto overflow-x-hidden p-4 md:p-8 select-none max-w-full min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-w-4xl mx-auto w-full">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            Calls <Sparkles className="w-5 h-5 text-rose-400" />
          </h1>
          <p className="text-xs text-slate-400">Encrypted real-time WebRTC audio & video communication</p>
        </div>

        <button
          onClick={() => setShowNewCallModal(true)}
          className="px-4 py-2.5 rounded-xl btn-romantic-green text-xs font-semibold flex items-center gap-2 shadow-glow-green"
        >
          <Phone className="w-4 h-4" />
          <span>New Call</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl max-w-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
              filterType === 'all' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Calls
          </button>
          <button
            onClick={() => setFilterType('missed')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
              filterType === 'missed' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Missed Calls
          </button>
        </div>

        {/* Call Logs List */}
        <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-white/5">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => {
              const isMissed = log.status === 'missed';
              const isIncoming = log.direction === 'incoming';
              const targetPartnerId = log.partnerId || (log.callerId === user?.id ? log.receiverId : log.callerId);

              return (
                <div
                  key={log.id}
                  className="p-4 flex items-center justify-between hover:bg-white/[0.03] transition"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={log.partnerAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${log.id}`}
                      alt={log.partnerName}
                      className="w-12 h-12 rounded-full object-cover border border-rose-500/30"
                    />

                    <div>
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        {log.partnerName}
                      </h4>

                      <div className="flex items-center gap-2 text-xs mt-0.5">
                        {isMissed ? (
                          <span className="text-rose-400 flex items-center gap-1 font-medium">
                            <PhoneMissed className="w-3.5 h-3.5" /> Missed
                          </span>
                        ) : isIncoming ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-medium">
                            <PhoneIncoming className="w-3.5 h-3.5" /> Incoming
                          </span>
                        ) : (
                          <span className="text-sky-400 flex items-center gap-1 font-medium">
                            <PhoneOutgoing className="w-3.5 h-3.5" /> Outgoing
                          </span>
                        )}

                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {log.durationSeconds > 0 && (
                          <>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 text-[11px] font-mono">
                              {formatDuration(log.durationSeconds)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* One-click Call Back buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startCall({
                        receiverId: targetPartnerId,
                        receiverName: log.partnerName,
                        receiverAvatar: log.partnerAvatar,
                        type: 'audio'
                      })}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-emerald-400 transition"
                      title="Audio Call Back"
                    >
                      <Phone className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => startCall({
                        receiverId: targetPartnerId,
                        receiverName: log.partnerName,
                        receiverAvatar: log.partnerAvatar,
                        type: 'video'
                      })}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-rose-400 transition"
                      title="Video Call Back"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              <Phone className="w-8 h-8 text-rose-500/20 mx-auto mb-2" />
              <p>No call logs available.</p>
            </div>
          )}
        </div>
      </div>

      {/* Start New Call Modal */}
      {showNewCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-rose-500/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" /> Start WebRTC Call
              </h3>
              <button onClick={() => setShowNewCallModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Select a partner to launch an instant encrypted voice or video call.
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {contacts.length > 0 ? (
                contacts.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={c.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.id}`}
                        alt={c.display_name}
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                      />
                      <div>
                        <h4 className="text-xs font-semibold text-white">{c.display_name}</h4>
                        <p className="text-[10px] text-slate-400">@{c.username || 'user'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setShowNewCallModal(false);
                          startCall({
                            receiverId: c.id,
                            receiverName: c.display_name,
                            receiverAvatar: c.avatar_url,
                            type: 'audio'
                          });
                        }}
                        className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setShowNewCallModal(false);
                          startCall({
                            receiverId: c.id,
                            receiverName: c.display_name,
                            receiverAvatar: c.avatar_url,
                            type: 'video'
                          });
                        }}
                        className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  No other contacts registered yet. Use search in Chats to add them!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
