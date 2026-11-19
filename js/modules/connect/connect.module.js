/**
 * GOSH WHATSAPP-INSPIRED CONNECT & USER DISCOVERY MODULE (PHASE 4 & PHASE 5)
 * Mobile-First Love-Themed Social Messaging, Contacts, Reactions, Voice Notes & E2EE.
 */

import { Icons } from '../../components/icons.js';
import { Auth } from '../../services/auth.service.js';
import { DB } from '../../services/db.service.js';
import { Crypto } from '../../services/crypto.service.js';
import { State } from '../../state.js';
import { Toast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';
import { WebRTC } from '../../services/webrtc.service.js';
import { AppRouter } from '../../router.js';

export const ConnectModule = {
  activeConversationId: 'c1-room-0000-0000-000000000001',
  selectedContact: null, // If null, renders Contacts / User Discovery view. If set, renders Active Chat.
  replyingTo: null,
  editingMessage: null,
  mediaRecorder: null,
  audioChunks: [],
  isRecordingVoice: false,
  recordingStartTime: null,
  recordingTimerInterval: null,
  disappearingTtlHours: 0, // 0 = Off
  searchQuery: '',
  contactSearchQuery: '',

  // Standard reaction emoji palette
  emojis: ['❤️', '👍', '😂', '😮', '😢', '🙏'],

  async render() {
    const currentUser = Auth.getCurrentUser() || {
      id: 'guest',
      displayName: 'GOSH User',
      fullName: 'GOSH User',
      username: 'user'
    };

    // If no contact is selected, render the WhatsApp-style Chats / Contacts / Discovery View
    if (!this.selectedContact) {
      return this.renderContactsView(currentUser);
    }

    // Otherwise, render the WhatsApp-style Active Conversation View
    return this.renderActiveChatView(currentUser);
  },

  // 1. WHATSAPP-STYLE CONTACTS & USER DISCOVERY VIEW (PHASE 4)
  async renderContactsView(currentUser) {
    const allUsers = Auth.getAllUsers ? Auth.getAllUsers() : [];
    const otherUsers = allUsers.filter(u => u.id !== currentUser.id);

    // Filter by contact search query if active
    let searchResults = [];
    if (this.contactSearchQuery.trim().length >= 2) {
      searchResults = Auth.searchUsers(this.contactSearchQuery, currentUser.id);
    }

    // Fetch recent messages to show last snippet & timestamps
    const rawMessages = await DB.query('messages', null, (a, b) => new Date(b.created_at) - new Date(a.created_at)).catch(() => []);
    const lastMessage = rawMessages[0];
    let lastSnippet = 'No messages yet';
    let lastTime = '';
    if (lastMessage) {
      try {
        lastSnippet = await Crypto.decrypt(lastMessage.content_encrypted, lastMessage.iv);
        lastTime = new Date(lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        lastSnippet = 'Encrypted message';
      }
    }

    return `
      <div class="view-container flex flex-col" style="height: calc(100vh - var(--header-height) - var(--bottom-nav-height));">
        
        <!-- Contacts Top Header -->
        <div class="flex justify-between items-center" style="padding: var(--space-3) var(--space-4); background: var(--bg-surface); border-bottom: 1px solid var(--border-subtle);">
          <div>
            <h1 style="font-size: 1.25rem; font-weight: 700; color: var(--ivory-50); margin: 0;">Chats & Discover</h1>
            <p style="font-size: 0.75rem; color: var(--rose-300); margin-top: 2px;">Your Space. Your Stories. • GOSH Secure Room</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-icon btn-ghost" id="refresh-contacts-btn" title="Refresh">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
            </button>
            <a href="#profile" class="btn btn-icon btn-ghost" title="My Profile">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </a>
          </div>
        </div>

        <!-- WhatsApp-Style User Search Bar -->
        <div style="padding: var(--space-3) var(--space-4); background: var(--bg-surface);">
          <div style="position: relative;">
            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--rose-400);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input 
              type="text" 
              id="contact-search-input" 
              class="input-field" 
              placeholder="Search by name, @username, email, or mobile..." 
              value="${this.escapeHtml(this.contactSearchQuery)}"
              style="padding-left: 36px; border-radius: var(--radius-full); background: var(--bg-primary); border-color: var(--border-subtle); font-size: 0.85rem;"
            />
          </div>
        </div>

        <!-- Search Results or Conversation Thread List -->
        <div id="contacts-scroll-container" style="flex: 1; overflow-y: auto; padding: var(--space-2) var(--space-4);">
          
          <!-- SEARCH RESULTS SECTION (If searching) -->
          ${this.contactSearchQuery.trim().length >= 2 ? `
            <div style="margin-bottom: var(--space-4);">
              <div class="text-xs font-semibold" style="color: var(--champagne-300); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-2);">
                Search Results (${searchResults.length})
              </div>
              ${searchResults.length === 0 ? `
                <div class="card text-center" style="padding: var(--space-4); background: var(--bg-surface); border: 1px dashed var(--border-subtle);">
                  <p class="text-xs text-muted" style="margin: 0;">No registered users found matching "${this.escapeHtml(this.contactSearchQuery)}".</p>
                </div>
              ` : `
                <div class="flex flex-col gap-2">
                  ${searchResults.map(u => `
                    <div class="card flex justify-between items-center contact-item-row" data-user-id="${u.id}" style="padding: 10px 14px; background: var(--bg-surface); border: 1px solid var(--border-subtle); cursor: pointer; border-radius: var(--radius-lg); transition: all 0.15s ease;">
                      <div class="flex items-center gap-3">
                        <div style="position: relative;">
                          <div class="love-glow" style="width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, var(--wine-700), var(--wine-500)); color: var(--ivory-50); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; border: 1.5px solid var(--rose-400);">
                            ${(u.displayName || 'U').substring(0, 2).toUpperCase()}
                          </div>
                          ${u.online ? `<span class="status-dot" style="position: absolute; bottom: 0; right: 0; border: 2px solid var(--bg-surface);"></span>` : ''}
                        </div>
                        <div>
                          <div class="text-sm font-semibold" style="color: var(--ivory-50);">${u.fullName || u.displayName}</div>
                          <div class="text-xs" style="color: var(--champagne-300);">@${(u.username || 'user').replace(/^@/, '')}</div>
                          <div class="text-xs text-muted truncate" style="max-width: 180px; margin-top: 2px;">${u.bio || 'Living life, telling stories.'}</div>
                        </div>
                      </div>
                      <button class="btn btn-primary btn-sm start-chat-btn" data-user-id="${u.id}" style="background: linear-gradient(135deg, var(--wine-600), var(--wine-500)); border: 1px solid var(--rose-400); padding: 6px 12px; font-size: 0.78rem;">
                        Chat
                      </button>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          ` : ''}

          <!-- RECENT CONVERSATIONS LIST -->
          <div>
            <div class="text-xs font-semibold" style="color: var(--rose-300); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-2);">
              Recent Conversations
            </div>

            ${otherUsers.length === 0 ? `
              <div class="card text-center" style="padding: 32px var(--space-4); background: var(--bg-surface); border: 1px dashed var(--border-subtle);">
                <div style="color: var(--rose-400); margin-bottom: 8px;">
                  ${Icons.connect}
                </div>
                <h4 style="font-size: 0.95rem; color: var(--ivory-50); font-weight: 600; margin: 0;">No Active Contacts Yet</h4>
                <p class="text-xs text-muted" style="margin-top: 4px;">Use the search bar above to discover other registered users by name, @username, or phone.</p>
              </div>
            ` : `
              <div class="flex flex-col gap-2">
                ${otherUsers.map(u => {
                  const initials = (u.fullName || u.displayName || 'U').substring(0, 2).toUpperCase();
                  return `
                    <div class="card flex justify-between items-center contact-item-row" data-user-id="${u.id}" style="padding: 12px 14px; background: var(--bg-surface); border: 1px solid var(--border-subtle); cursor: pointer; border-radius: var(--radius-lg); transition: all 0.15s ease;">
                      <div class="flex items-center gap-3">
                        <div style="position: relative;">
                          <div class="love-glow" style="width: 46px; height: 46px; border-radius: 50%; background: linear-gradient(135deg, var(--wine-700), var(--wine-500)); color: var(--ivory-50); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; border: 1.5px solid var(--rose-400);">
                            ${initials}
                          </div>
                          <span class="status-dot" style="position: absolute; bottom: 0; right: 0; border: 2px solid var(--bg-surface);"></span>
                        </div>
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="text-sm font-semibold" style="color: var(--ivory-50);">${u.fullName || u.displayName}</span>
                            <span class="text-xs" style="color: var(--champagne-300);">@${(u.username || 'user').replace(/^@/, '')}</span>
                          </div>
                          <div class="text-xs text-muted truncate" style="max-width: 200px; margin-top: 3px;">
                            ${lastSnippet}
                          </div>
                        </div>
                      </div>
                      <div class="flex flex-col items-end gap-1">
                        <span class="text-xs text-muted">${lastTime || 'Active'}</span>
                        <span class="status-dot"></span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>

        </div>

      </div>
    `;
  },

  // 2. WHATSAPP-STYLE ACTIVE CHAT VIEW (PHASE 5)
  async renderActiveChatView(currentUser) {
    const partner = this.selectedContact || {
      id: 'partner',
      displayName: 'Partner',
      fullName: 'Partner',
      username: 'partner'
    };

    const partnerInitials = (partner.fullName || partner.displayName || 'P').substring(0, 2).toUpperCase();

    // 1. Fetch & Filter Non-Expired Messages
    const nowIso = new Date().toISOString();
    let rawMessages = await DB.query('messages', m => {
      if (m.disappearing_at && m.disappearing_at < nowIso) return false;
      return m.conversation_id === this.activeConversationId;
    }, (a, b) => new Date(a.created_at) - new Date(b.created_at));

    // 2. Fetch Reactions
    const reactions = await DB.query('message_reactions').catch(() => []);

    // 3. Decrypt message contents
    const messages = await Promise.all(rawMessages.map(async m => {
      const decryptedContent = await Crypto.decrypt(m.content_encrypted, m.iv);
      const msgReactions = reactions.filter(r => r.message_id === m.id);
      return {
        ...m,
        decryptedContent,
        reactions: msgReactions
      };
    }));

    // Filter by search query if active
    const filteredMessages = this.searchQuery
      ? messages.filter(m => m.decryptedContent.toLowerCase().includes(this.searchQuery.toLowerCase()))
      : messages;

    return `
      <div class="view-container flex flex-col" style="height: calc(100vh - var(--header-height) - var(--bottom-nav-height));">
        
        <!-- WhatsApp-Style Romantic Header -->
        <div class="flex justify-between items-center" style="padding: 10px 14px; background: var(--bg-surface); border-bottom: 1px solid var(--border-subtle); backdrop-filter: blur(12px);">
          
          <div class="flex items-center gap-2">
            <!-- Back Button to Contacts -->
            <button class="btn btn-icon btn-ghost btn-sm" id="chat-back-to-contacts-btn" title="Back to Chats" style="color: var(--rose-300);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>

            <!-- Partner Avatar & Identity -->
            <div id="chat-header-profile-trigger" class="flex items-center gap-2" style="cursor: pointer;">
              <div style="position: relative;">
                <div class="love-glow" style="width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, var(--wine-700), var(--wine-500)); color: var(--ivory-50); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95rem; border: 1.5px solid var(--rose-400);">
                  ${partnerInitials}
                </div>
                <span class="status-dot" style="position: absolute; bottom: 0; right: 0; border: 2px solid var(--bg-surface);"></span>
              </div>
              <div>
                <div class="text-sm font-semibold" style="color: var(--ivory-50); line-height: 1.2;">${partner.fullName || partner.displayName}</div>
                <div class="text-xs" style="color: var(--color-success); font-weight: 500;">online</div>
              </div>
            </div>
          </div>

          <!-- Calling & Menu Action Buttons -->
          <div class="flex items-center gap-1">
            <button class="btn btn-icon btn-ghost" id="direct-voice-call-btn" title="Start Voice Call" style="color: var(--rose-300);">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </button>
            <button class="btn btn-icon btn-ghost" id="direct-video-call-btn" title="Start Video Call" style="color: var(--rose-300);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
            </button>
            <button class="btn btn-icon btn-ghost" id="chat-options-menu-btn" title="More Options" style="color: var(--rose-300);">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
          </div>

        </div>

        <!-- Scrollable Messages Container -->
        <div id="chat-thread-container" style="flex: 1; overflow-y: auto; padding: var(--space-3) var(--space-3); display: flex; flex-direction: column; gap: var(--space-2); background: radial-gradient(circle at center, rgba(139, 38, 75, 0.04) 0%, rgba(18, 9, 20, 0.8) 100%);">
          
          <!-- E2EE Pill Banner -->
          <div class="text-center" style="margin: 6px 0;">
            <span class="badge" style="background: rgba(26, 13, 29, 0.85); border: 1px solid var(--border-subtle); color: var(--rose-200); font-size: 0.72rem; padding: 4px 10px;">
              🔒 Messages are end-to-end encrypted with zero-knowledge AES-256-GCM
            </span>
          </div>

          <!-- Messages Thread -->
          ${filteredMessages.length === 0 ? `
            <div class="card text-center" style="padding: 40px var(--space-4); margin: auto; background: var(--bg-surface); border: 1px dashed var(--border-subtle); max-width: 320px; border-radius: var(--radius-xl);">
              <div style="color: var(--rose-400); margin-bottom: 8px;">
                ${Icons.connect}
              </div>
              <h4 style="font-size: 0.95rem; color: var(--ivory-50); font-weight: 600; margin: 0;">Say Hello to ${partner.fullName || partner.displayName}!</h4>
              <p class="text-xs text-muted" style="margin-top: 4px;">Start your story. Send text, voice notes, photos or call directly.</p>
            </div>
          ` : filteredMessages.map(msg => this.renderMessageBubble(msg, currentUser)).join('')}

        </div>

        <!-- Replying To Banner (If Active) -->
        <div id="reply-preview-bar" class="flex justify-between items-center" style="display: ${this.replyingTo ? 'flex' : 'none'}; padding: 6px 14px; background: var(--bg-elevated); border-left: 3px solid var(--rose-400); border-top: 1px solid var(--border-subtle);">
          <div class="truncate text-xs">
            <span class="font-semibold" style="color: var(--rose-300);">Replying to:</span> 
            <span class="text-muted" id="reply-text-preview">${this.replyingTo?.text || ''}</span>
          </div>
          <button class="btn btn-icon btn-ghost btn-sm" id="cancel-reply-btn" style="width: 22px; height: 22px;">${Icons.close}</button>
        </div>

        <!-- Live Voice Recording Banner (When Recording) -->
        <div id="voice-recording-banner" style="display: none; padding: 8px 14px; background: rgba(220, 38, 38, 0.15); border-top: 1px solid rgba(220, 38, 38, 0.3); align-items: center; justify-content: space-between;">
          <div class="flex items-center gap-2">
            <span class="status-dot" style="background: #ef4444; box-shadow: 0 0 8px #ef4444;"></span>
            <span class="text-xs font-semibold" style="color: #ef4444;">Recording Voice Note...</span>
            <span class="text-xs font-mono" id="voice-rec-timer" style="color: var(--ivory-50);">0:00</span>
          </div>
          <button id="cancel-voice-rec-btn" class="btn btn-ghost btn-sm text-xs" style="color: var(--text-muted); padding: 2px 6px;">
            Cancel
          </button>
        </div>

        <!-- WhatsApp-Style Bottom Composer Bar -->
        <div class="flex items-center gap-2" style="padding: 8px 12px; background: var(--bg-surface); border-top: 1px solid var(--border-subtle);">
          
          <!-- Emoji Picker Toggle -->
          <button class="btn btn-icon btn-ghost" id="chat-emoji-toggle-btn" title="Emoji reactions" style="color: var(--rose-300); padding: 6px;">
            😀
          </button>

          <!-- Attachment Sheet Trigger -->
          <input type="file" id="media-file-input" style="display: none;" accept="image/*,video/*,application/pdf" />
          <button class="btn btn-icon btn-ghost" id="attach-sheet-btn" title="Attach Media" style="color: var(--rose-300); padding: 6px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>

          <!-- Message Text Input Field -->
          <input 
            type="text" 
            id="chat-message-input" 
            class="input-field" 
            placeholder="Type a message..." 
            autocomplete="off"
            style="flex: 1; border-radius: var(--radius-full); padding: 8px 14px; background: var(--bg-primary); border-color: var(--border-subtle); color: var(--text-primary); font-size: 0.9rem;"
          />

          <!-- Voice Record Button -->
          <button class="btn btn-icon btn-ghost" id="voice-record-btn" title="Record Voice Note" style="color: var(--rose-300); padding: 6px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          </button>

          <!-- WhatsApp-Style Send Button -->
          <button class="btn btn-primary" id="chat-send-btn" title="Send" style="width: 40px; height: 40px; border-radius: 50%; padding: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--wine-600), var(--wine-500)); border: 1px solid var(--rose-400); flex-shrink: 0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>

        </div>

      </div>
    `;
  },

  // 3. RENDER INDIVIDUAL MESSAGE BUBBLE
  renderMessageBubble(msg, currentUser) {
    const isMine = msg.sender_id === currentUser.id;
    const timeFormatted = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Group reactions
    const reactionCounts = {};
    (msg.reactions || []).forEach(r => {
      reactionCounts[r.reaction] = (reactionCounts[r.reaction] || 0) + 1;
    });

    return `
      <div class="flex items-start ${isMine ? 'justify-end self-end' : 'justify-start'} gap-2" style="max-width: 82%; margin-bottom: 2px;" data-message-id="${msg.id}">
        
        <div class="flex flex-col ${isMine ? 'items-end' : 'items-start'}">
          <!-- Rounded Message Bubble Surface -->
          <div style="
            background: ${isMine ? 'linear-gradient(135deg, var(--wine-700), var(--wine-600))' : 'var(--bg-elevated)'};
            border: 1px solid ${isMine ? 'rgba(224, 141, 163, 0.35)' : 'var(--border-subtle)'};
            padding: 9px 13px;
            border-radius: ${isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};
            color: var(--ivory-50);
            position: relative;
            word-break: break-word;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          ">
            <!-- Quoted Reply (If Any) -->
            ${msg.reply_to_id ? `
              <div style="padding: 3px 8px; background: rgba(0,0,0,0.3); border-left: 2px solid var(--rose-400); border-radius: 4px; margin-bottom: 6px; font-size: 0.75rem; color: var(--champagne-200);">
                Quoted message
              </div>
            ` : ''}

            <!-- Message Body: Voice / Photo / Video / Text -->
            ${msg.message_type === 'voice' ? `
              <div class="flex items-center gap-2" style="min-width: 170px;">
                <audio controls src="${msg.decryptedContent}" style="max-width: 210px; height: 32px; filter: invert(0.9);"></audio>
              </div>
            ` : msg.message_type === 'photo' ? `
              <div>
                <img src="${msg.decryptedContent}" alt="Shared photo" style="border-radius: var(--radius-md); max-height: 220px; width: 100%; object-fit: cover; margin-bottom: 4px;" />
              </div>
            ` : msg.message_type === 'video' ? `
              <div>
                <video controls src="${msg.decryptedContent}" style="border-radius: var(--radius-md); max-height: 220px; max-width: 100%;"></video>
              </div>
            ` : `
              <p style="font-size: 0.88rem; margin: 0; line-height: 1.45; color: ${isMine ? 'var(--ivory-50)' : 'var(--text-primary)'};">${this.escapeHtml(msg.decryptedContent)}</p>
            `}
          </div>

          <!-- Message Metadata Bar (Timestamp, Read Checkmarks, Action Buttons) -->
          <div class="flex items-center gap-2" style="margin-top: 2px; font-size: 0.68rem; color: var(--rose-300); opacity: 0.85;">
            <span>${timeFormatted}</span>
            ${msg.is_edited ? '<span>• (edited)</span>' : ''}
            ${isMine ? '<span style="color: var(--champagne-300); font-weight: 700;">✓✓</span>' : ''}

            <!-- Quick Inline Actions -->
            <button class="msg-action-btn" data-action="react" data-id="${msg.id}" title="React" style="background: none; border: none; cursor: pointer; padding: 0 1px; font-size: 0.72rem;">❤️</button>
            <button class="msg-action-btn" data-action="reply" data-id="${msg.id}" title="Reply" style="background: none; border: none; cursor: pointer; padding: 0 1px; color: var(--rose-300);">↩</button>
            ${isMine ? `
              <button class="msg-action-btn" data-action="delete" data-id="${msg.id}" title="Delete" style="background: none; border: none; cursor: pointer; padding: 0 1px; color: var(--color-danger);">🗑</button>
            ` : ''}
          </div>

          <!-- Grouped Reactions Badge Row -->
          ${Object.keys(reactionCounts).length > 0 ? `
            <div class="flex gap-1" style="margin-top: 2px;">
              ${Object.entries(reactionCounts).map(([emoji, count]) => `
                <span class="badge" style="padding: 1px 6px; font-size: 0.7rem; background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--ivory-50); cursor: pointer;">
                  ${emoji} ${count > 1 ? count : ''}
                </span>
              `).join('')}
            </div>
          ` : ''}
        </div>

      </div>
    `;
  },

  mount(container) {
    const currentUser = Auth.getCurrentUser();

    // 1. If in Contacts View Mode
    if (!this.selectedContact) {
      const contactSearch = container.querySelector('#contact-search-input');
      const refreshBtn = container.querySelector('#refresh-contacts-btn');

      // Contact Search with auto-filter
      if (contactSearch) {
        contactSearch.addEventListener('input', (e) => {
          this.contactSearchQuery = e.target.value;
          clearTimeout(this.contactSearchTimer);
          this.contactSearchTimer = setTimeout(() => {
            window.AppRouter?.handleRouting();
          }, 250);
        });
      }

      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          window.AppRouter?.handleRouting();
        });
      }

      // Tapping a contact row or "Chat" button
      container.querySelectorAll('.contact-item-row, .start-chat-btn').forEach(el => {
        el.addEventListener('click', (e) => {
          const userId = el.getAttribute('data-user-id');
          const allUsers = Auth.getAllUsers ? Auth.getAllUsers() : [];
          const target = allUsers.find(u => u.id === userId);
          if (target) {
            this.selectedContact = target;
            window.AppRouter?.handleRouting();
          }
        });
      });

      return;
    }

    // 2. If in Active Chat View Mode
    const backBtn = container.querySelector('#chat-back-to-contacts-btn');
    const profileTrigger = container.querySelector('#chat-header-profile-trigger');
    const voiceCallBtn = container.querySelector('#direct-voice-call-btn');
    const videoCallBtn = container.querySelector('#direct-video-call-btn');
    const optionsBtn = container.querySelector('#chat-options-menu-btn');
    const messageInput = container.querySelector('#chat-message-input');
    const sendBtn = container.querySelector('#chat-send-btn');
    const attachBtn = container.querySelector('#attach-sheet-btn');
    const fileInput = container.querySelector('#media-file-input');
    const voiceBtn = container.querySelector('#voice-record-btn');
    const cancelVoiceBtn = container.querySelector('#cancel-voice-rec-btn');
    const voiceBanner = container.querySelector('#voice-recording-banner');
    const voiceTimerLabel = container.querySelector('#voice-rec-timer');
    const emojiToggleBtn = container.querySelector('#chat-emoji-toggle-btn');
    const threadContainer = container.querySelector('#chat-thread-container');
    const cancelReplyBtn = container.querySelector('#cancel-reply-btn');

    // Auto-scroll to bottom of thread
    if (threadContainer) {
      threadContainer.scrollTop = threadContainer.scrollHeight;
    }

    // Back to Contacts button
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.selectedContact = null;
        window.AppRouter?.handleRouting();
      });
    }

    // Partner Profile Popup Modal
    if (profileTrigger) {
      profileTrigger.addEventListener('click', () => {
        const p = this.selectedContact;
        if (!p) return;
        Modal.open({
          title: p.fullName || p.displayName,
          content: `
            <div class="text-center" style="padding: var(--space-4) 0;">
              <div class="love-glow" style="width: 72px; height: 72px; border-radius: 50%; margin: 0 auto var(--space-3); background: linear-gradient(135deg, var(--wine-700), var(--wine-500)); color: var(--ivory-50); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; font-weight: 700; border: 2px solid var(--rose-400);">
                ${(p.fullName || p.displayName).substring(0, 2).toUpperCase()}
              </div>
              <h3 style="font-size: 1.15rem; color: var(--ivory-50); margin: 0;">${p.fullName || p.displayName}</h3>
              <div style="font-size: 0.85rem; color: var(--champagne-300); margin-top: 2px;">@${(p.username || 'user').replace(/^@/, '')}</div>
              <p class="text-sm text-secondary" style="margin-top: var(--space-3); font-style: italic;">"${p.bio || 'Living life, telling stories.'}"</p>
              
              <div class="flex justify-center gap-3" style="margin-top: var(--space-4);">
                <button class="btn btn-secondary btn-sm" id="modal-voice-call-btn">
                  📞 Voice Call
                </button>
                <button class="btn btn-primary btn-sm" id="modal-video-call-btn">
                  🎥 Video Call
                </button>
              </div>
            </div>
          `,
          onOpen: (modalEl) => {
            const vBtn = modalEl.querySelector('#modal-voice-call-btn');
            const vidBtn = modalEl.querySelector('#modal-video-call-btn');
            if (vBtn) vBtn.addEventListener('click', async () => {
              Modal.close(modalEl.closest('.modal-backdrop'));
              await WebRTC.startCall('audio');
              AppRouter.navigate('calls');
            });
            if (vidBtn) vidBtn.addEventListener('click', async () => {
              Modal.close(modalEl.closest('.modal-backdrop'));
              await WebRTC.startCall('video');
              AppRouter.navigate('calls');
            });
          }
        });
      });
    }

    // Call Actions
    if (voiceCallBtn) {
      voiceCallBtn.addEventListener('click', async () => {
        await WebRTC.startCall('audio');
        AppRouter.navigate('calls');
      });
    }

    if (videoCallBtn) {
      videoCallBtn.addEventListener('click', async () => {
        await WebRTC.startCall('video');
        AppRouter.navigate('calls');
      });
    }

    // Options Menu (Disappearing Timer, Clear Room)
    if (optionsBtn) {
      optionsBtn.addEventListener('click', () => {
        Modal.open({
          title: 'Chat Settings',
          content: `
            <div class="flex flex-col gap-2">
              <button class="btn btn-secondary w-full text-left" id="modal-disappearing-opt">
                ⏱️ Disappearing Messages (${this.disappearingTtlHours > 0 ? `${this.disappearingTtlHours}h` : 'Off'})
              </button>
              <button class="btn btn-secondary w-full text-left" id="modal-view-profile-opt">
                👤 View Contact Info
              </button>
              <button class="btn btn-ghost w-full text-left text-danger" id="modal-clear-chat-opt">
                🗑️ Clear Message History
              </button>
            </div>
          `,
          onOpen: (modalEl) => {
            const dOpt = modalEl.querySelector('#modal-disappearing-opt');
            const pOpt = modalEl.querySelector('#modal-view-profile-opt');
            const cOpt = modalEl.querySelector('#modal-clear-chat-opt');

            if (dOpt) dOpt.addEventListener('click', () => {
              Modal.close(modalEl.closest('.modal-backdrop'));
              this.openDisappearingModal();
            });
            if (pOpt && profileTrigger) pOpt.addEventListener('click', () => {
              Modal.close(modalEl.closest('.modal-backdrop'));
              profileTrigger.click();
            });
            if (cOpt) cOpt.addEventListener('click', () => {
              Modal.confirm({
                title: 'Clear Conversation',
                message: 'Are you sure you want to clear your message history in this room?',
                confirmVariant: 'danger',
                onConfirm: async () => {
                  const msgs = await DB.query('messages', m => m.conversation_id === this.activeConversationId);
                  for (const m of msgs) {
                    await DB.delete('messages', m.id);
                  }
                  Modal.close(modalEl.closest('.modal-backdrop'));
                  Toast.info('Chat Cleared', 'Messages removed.');
                  window.AppRouter?.handleRouting();
                }
              });
            });
          }
        });
      });
    }

    // Emoji reaction bar toggle
    if (emojiToggleBtn) {
      emojiToggleBtn.addEventListener('click', () => {
        Modal.open({
          title: 'Quick Reaction',
          content: `
            <div class="flex justify-around items-center gap-2" style="font-size: 2rem; padding: 12px 0;">
              ${this.emojis.map(emo => `
                <span class="emoji-pick" data-emoji="${emo}" style="cursor: pointer; padding: 4px; transition: transform 0.1s;" onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'">${emo}</span>
              `).join('')}
            </div>
          `,
          onOpen: (modalEl) => {
            modalEl.querySelectorAll('.emoji-pick').forEach(emoEl => {
              emoEl.addEventListener('click', () => {
                const emo = emoEl.getAttribute('data-emoji');
                if (messageInput) {
                  messageInput.value += emo;
                  messageInput.focus();
                }
                Modal.close(modalEl.closest('.modal-backdrop'));
              });
            });
          }
        });
      });
    }

    // Send Message Handler
    const handleSend = async () => {
      const text = messageInput.value.trim();
      if (!text) return;

      const user = Auth.getCurrentUser();
      if (!user) {
        Toast.error('Session Error', 'Please log in to send messages.');
        return;
      }

      const encrypted = await Crypto.encrypt(text);
      let disappearingAt = null;
      if (this.disappearingTtlHours > 0) {
        disappearingAt = new Date(Date.now() + this.disappearingTtlHours * 3600 * 1000).toISOString();
      }

      await DB.insert('messages', {
        conversation_id: this.activeConversationId,
        sender_id: user.id,
        content_encrypted: encrypted.ciphertext,
        iv: encrypted.iv,
        message_type: 'text',
        reply_to_id: this.replyingTo ? this.replyingTo.id : null,
        disappearing_at: disappearingAt
      });

      messageInput.value = '';
      this.replyingTo = null;
      window.AppRouter?.handleRouting();
    };

    if (sendBtn) sendBtn.addEventListener('click', handleSend);
    if (messageInput) {
      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      });
    }

    // Attach File / Photo
    if (attachBtn && fileInput) {
      attachBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const user = Auth.getCurrentUser();
        Toast.info('Encrypting Media', `Securing ${file.name}...`);

        const reader = new FileReader();
        reader.onload = async () => {
          const base64Data = reader.result;
          const encrypted = await Crypto.encrypt(base64Data);

          let msgType = 'file';
          if (file.type.startsWith('image/')) msgType = 'photo';
          else if (file.type.startsWith('video/')) msgType = 'video';

          await DB.insert('messages', {
            conversation_id: this.activeConversationId,
            sender_id: user.id,
            content_encrypted: encrypted.ciphertext,
            iv: encrypted.iv,
            message_type: msgType
          });

          Toast.success('Media Dispatched', 'Encrypted file shared.');
          window.AppRouter?.handleRouting();
        };
        reader.readAsDataURL(file);
      });
    }

    // Voice Note Recording
    if (voiceBtn) {
      voiceBtn.addEventListener('click', async () => {
        if (!this.isRecordingVoice) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioChunks = [];
            this.mediaRecorder = new MediaRecorder(stream);
            this.mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
              if (this.voiceCancelled) {
                this.voiceCancelled = false;
                return;
              }
              const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
              const reader = new FileReader();
              reader.onload = async () => {
                const base64Audio = reader.result;
                const encrypted = await Crypto.encrypt(base64Audio);
                const user = Auth.getCurrentUser();

                await DB.insert('messages', {
                  conversation_id: this.activeConversationId,
                  sender_id: user.id,
                  content_encrypted: encrypted.ciphertext,
                  iv: encrypted.iv,
                  message_type: 'voice'
                });

                Toast.success('Voice Message Sent', 'Voice note delivered.');
                window.AppRouter?.handleRouting();
              };
              reader.readAsDataURL(audioBlob);
            };

            this.mediaRecorder.start();
            this.isRecordingVoice = true;
            this.voiceCancelled = false;
            this.recordingStartTime = Date.now();

            if (voiceBanner) voiceBanner.style.display = 'flex';

            this.recordingTimerInterval = setInterval(() => {
              const elapsedSec = Math.floor((Date.now() - this.recordingStartTime) / 1000);
              const mins = Math.floor(elapsedSec / 60);
              const secs = (elapsedSec % 60).toString().padStart(2, '0');
              if (voiceTimerLabel) voiceTimerLabel.textContent = `${mins}:${secs}`;
            }, 500);

            voiceBtn.style.color = '#ef4444';
            Toast.info('Recording Audio', 'Tap microphone again to stop and send.');
          } catch (err) {
            Toast.error('Mic Access Denied', 'Microphone permissions are required for voice notes.');
          }
        } else {
          // Stop recording and send
          clearInterval(this.recordingTimerInterval);
          if (voiceBanner) voiceBanner.style.display = 'none';
          this.isRecordingVoice = false;
          voiceBtn.style.color = 'var(--rose-300)';
          if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
          }
        }
      });
    }

    if (cancelVoiceBtn) {
      cancelVoiceBtn.addEventListener('click', () => {
        clearInterval(this.recordingTimerInterval);
        this.voiceCancelled = true;
        this.isRecordingVoice = false;
        if (voiceBanner) voiceBanner.style.display = 'none';
        if (voiceBtn) voiceBtn.style.color = 'var(--rose-300)';
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
        Toast.info('Recording Cancelled', 'Voice message discarded.');
      });
    }

    // Message Action Triggers (Reactions, Reply, Delete)
    container.querySelectorAll('.msg-action-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const msgId = btn.getAttribute('data-id');
        const user = Auth.getCurrentUser();
        const msgRecord = await DB.getById('messages', msgId);
        if (!msgRecord) return;

        if (action === 'react') {
          Modal.open({
            title: 'Add Reaction',
            content: `
              <div class="flex justify-around items-center gap-2" style="font-size: 2rem; padding: 12px 0;">
                ${this.emojis.map(emo => `
                  <span class="emoji-pick" data-emoji="${emo}" style="cursor: pointer; padding: 4px; transition: transform 0.1s;" onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'">${emo}</span>
                `).join('')}
              </div>
            `,
            onOpen: (modalEl) => {
              modalEl.querySelectorAll('.emoji-pick').forEach(emoEl => {
                emoEl.addEventListener('click', async () => {
                  const emoji = emoEl.getAttribute('data-emoji');
                  Modal.close(modalEl.closest('.modal-backdrop'));

                  const existing = await DB.query('message_reactions', r => r.message_id === msgId && r.user_id === user.id && r.reaction === emoji);
                  if (existing.length > 0) {
                    await DB.delete('message_reactions', existing[0].id);
                  } else {
                    await DB.insert('message_reactions', {
                      message_id: msgId,
                      user_id: user.id,
                      reaction: emoji
                    });
                  }
                  window.AppRouter?.handleRouting();
                });
              });
            }
          });
        } else if (action === 'reply') {
          const text = await Crypto.decrypt(msgRecord.content_encrypted, msgRecord.iv);
          this.replyingTo = { id: msgId, text: text.substring(0, 40) + '...' };
          window.AppRouter?.handleRouting();
        } else if (action === 'delete') {
          Modal.confirm({
            title: 'Delete Message',
            message: 'Permanently delete this message from the conversation?',
            confirmVariant: 'danger',
            onConfirm: async () => {
              await DB.delete('messages', msgId);
              Toast.info('Message Deleted', 'Removed from conversation.');
              window.AppRouter?.handleRouting();
            }
          });
        }
      });
    });

    if (cancelReplyBtn) {
      cancelReplyBtn.addEventListener('click', () => {
        this.replyingTo = null;
        window.AppRouter?.handleRouting();
      });
    }

    // Subscribe to Real-Time Updates
    this.unsubMessages = DB.subscribe('messages', () => {
      if (State.get('activeRoute') === 'connect') {
        window.AppRouter?.handleRouting();
      }
    });

    this.unsubReactions = DB.subscribe('message_reactions', () => {
      if (State.get('activeRoute') === 'connect') {
        window.AppRouter?.handleRouting();
      }
    });
  },

  openDisappearingModal() {
    Modal.open({
      title: 'Disappearing Messages',
      content: `
        <div class="flex flex-col gap-3">
          <p class="text-sm text-secondary">
            Messages sent after enabling will automatically vanish for all participants after the selected timer.
          </p>
          <div class="flex flex-col gap-2">
            <button class="btn btn-secondary text-left ttl-btn" data-ttl="0">
              ${this.disappearingTtlHours === 0 ? '✓ ' : ''}Off (Keep All Messages)
            </button>
            <button class="btn btn-secondary text-left ttl-btn" data-ttl="1">
              ${this.disappearingTtlHours === 1 ? '✓ ' : ''}1 Hour
            </button>
            <button class="btn btn-secondary text-left ttl-btn" data-ttl="24">
              ${this.disappearingTtlHours === 24 ? '✓ ' : ''}24 Hours
            </button>
            <button class="btn btn-secondary text-left ttl-btn" data-ttl="168">
              ${this.disappearingTtlHours === 168 ? '✓ ' : ''}7 Days
            </button>
          </div>
        </div>
      `,
      onOpen: (modalEl) => {
        modalEl.querySelectorAll('.ttl-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const ttl = parseInt(btn.getAttribute('data-ttl'), 10);
            this.disappearingTtlHours = ttl;
            Modal.close(modalEl.closest('.modal-backdrop'));
            Toast.info('Disappearing Timer Updated', ttl > 0 ? `Messages vanish after ${ttl} hour(s).` : 'Disappearing messages turned off.');
            window.AppRouter?.handleRouting();
          });
        });
      }
    });
  },

  unmount() {
    if (this.unsubMessages) this.unsubMessages();
    if (this.unsubReactions) this.unsubReactions();
    if (this.recordingTimerInterval) clearInterval(this.recordingTimerInterval);
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }
};
