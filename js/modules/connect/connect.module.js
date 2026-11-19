/**
 * GOSH CONNECT MODULE (PHASE 5)
 * Real-Time Private E2EE Messaging, Media Sharing, Voice Notes, Reactions & Disappearing Messages.
 */

import { Icons } from '../../components/icons.js';
import { Auth } from '../../services/auth.service.js';
import { DB } from '../../services/db.service.js';
import { Crypto } from '../../services/crypto.service.js';
import { State } from '../../state.js';
import { Toast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';

export const ConnectModule = {
  activeConversationId: 'c1-room-0000-0000-000000000001',
  replyingTo: null,
  editingMessage: null,
  mediaRecorder: null,
  audioChunks: [],
  isRecordingVoice: false,
  disappearingTtlHours: 0, // 0 = Off
  searchQuery: '',

  // Standard reaction emoji palette
  emojis: ['❤️', '👍', '😂', '😮', '😢', '🙏'],

  async render() {
    const user = Auth.getCurrentUser() || { displayName: 'Authorized User', id: 'u1-auth-0000-0000-000000000001' };

    // 1. Fetch & Filter Non-Expired Messages
    const nowIso = new Date().toISOString();
    let rawMessages = await DB.query('messages', m => {
      // Disappearing message TTL filter
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
      <div class="view-container flex flex-col" style="height: calc(100vh - var(--header-height) - 48px);">
        <!-- Top Chat Header Bar -->
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-3); padding: var(--space-3) var(--space-5);">
          <div class="flex items-center gap-3">
            <div class="user-avatar-badge" style="background: var(--accent-primary-muted); border-color: var(--accent-primary); color: var(--accent-primary);">
              G
            </div>
            <div>
              <div class="text-sm font-semibold flex items-center gap-2">
                <span>GOSH Secure Room</span>
                ${this.disappearingTtlHours > 0 ? `<span class="badge badge-champagne text-xs">${this.disappearingTtlHours}h Disappearing</span>` : ''}
              </div>
              <div class="text-xs text-muted flex items-center gap-2" id="chat-presence-status">
                <span class="status-dot"></span>
                <span>End-to-End Encrypted (AES-256-GCM)</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Search in Chat -->
            <div class="flex items-center" style="position: relative;">
              <input 
                type="text" 
                id="chat-search-input" 
                class="input-field" 
                placeholder="Search chat..." 
                value="${this.searchQuery}" 
                style="padding: 4px 10px; font-size: var(--text-xs); width: 140px;"
              />
            </div>

            <!-- Disappearing Messages Menu -->
            <button class="btn btn-icon btn-ghost" id="chat-disappearing-btn" title="Disappearing Messages Timer">
              ${Icons.lock}
            </button>

            <!-- Call Shortcut -->
            <a href="#calls" class="btn btn-icon btn-ghost" title="Start Audio/Video Call">
              ${Icons.calls}
            </a>
          </div>
        </div>

        <!-- Chat Messages Container -->
        <div class="card flex-1 flex flex-col justify-between" style="padding: var(--space-4); overflow: hidden; position: relative;">
          <!-- Messages Scrollable Thread -->
          <div id="chat-thread-container" style="flex: 1; overflow-y: auto; padding-right: var(--space-2); display: flex; flex-direction: column; gap: var(--space-3);">
            <div class="text-center" style="margin: var(--space-2) 0;">
              <span class="badge badge-champagne">Messages in this room are encrypted on-device before transmission</span>
            </div>

            ${filteredMessages.length === 0 ? `
              <div class="empty-state" style="padding: 40px 0;">
                <div class="empty-state-icon" style="width: 44px; height: 44px;">${Icons.connect}</div>
                <h4 class="card-title text-sm">No Messages Yet</h4>
                <p class="text-xs text-muted" style="margin-top: 4px;">Say hello! Everything shared between you two is completely private.</p>
              </div>
            ` : filteredMessages.map(msg => this.renderMessageBubble(msg, user)).join('')}
          </div>

          <!-- Typing Indicator -->
          <div id="typing-indicator-bar" style="display: none; padding: 4px 12px; font-size: var(--text-xs); color: var(--accent-secondary);">
            <em>Partner is typing...</em>
          </div>

          <!-- Replying To Banner (If Active) -->
          <div id="reply-preview-bar" class="flex justify-between items-center" style="display: ${this.replyingTo ? 'flex' : 'none'}; padding: 6px 12px; background: var(--bg-surface-hover); border-left: 3px solid var(--accent-primary); border-radius: var(--radius-sm); margin-bottom: var(--space-2);">
            <div class="truncate text-xs">
              <span class="font-semibold" style="color: var(--accent-primary);">Replying to:</span> 
              <span class="text-muted" id="reply-text-preview">${this.replyingTo?.text || ''}</span>
            </div>
            <button class="btn btn-icon btn-ghost btn-sm" id="cancel-reply-btn" style="width: 24px; height: 24px;">${Icons.close}</button>
          </div>

          <!-- Editing Message Banner (If Active) -->
          <div id="edit-preview-bar" class="flex justify-between items-center" style="display: ${this.editingMessage ? 'flex' : 'none'}; padding: 6px 12px; background: var(--bg-surface-hover); border-left: 3px solid var(--accent-secondary); border-radius: var(--radius-sm); margin-bottom: var(--space-2);">
            <div class="truncate text-xs">
              <span class="font-semibold" style="color: var(--accent-secondary);">Editing Message</span>
            </div>
            <button class="btn btn-icon btn-ghost btn-sm" id="cancel-edit-btn" style="width: 24px; height: 24px;">${Icons.close}</button>
          </div>

          <!-- Input Controls Area -->
          <div class="flex items-center gap-2" style="margin-top: var(--space-2); padding-top: var(--space-2); border-top: 1px solid var(--border-subtle);">
            <!-- Media Attachment Input -->
            <input type="file" id="media-file-input" style="display: none;" accept="image/*,video/*,application/pdf" />
            <button class="btn btn-icon btn-secondary" id="attach-btn" title="Attach Photo, Video or Document">
              ${Icons.cloud}
            </button>

            <!-- Voice Record Button -->
            <button class="btn btn-icon btn-secondary" id="voice-record-btn" title="Record Voice Note">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </button>

            <!-- Message Text Input -->
            <input 
              type="text" 
              id="message-input" 
              class="input-field" 
              placeholder="Type an encrypted message..." 
              style="flex: 1;" 
              autocomplete="off"
            />

            <!-- Send Button -->
            <button class="btn btn-primary" id="send-msg-btn">
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  renderMessageBubble(msg, currentUser) {
    const isMine = msg.sender_id === currentUser.id;
    const timeFormatted = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Group reactions
    const reactionCounts = {};
    (msg.reactions || []).forEach(r => {
      reactionCounts[r.reaction] = (reactionCounts[r.reaction] || 0) + 1;
    });

    return `
      <div class="flex items-start ${isMine ? 'justify-end self-end' : 'justify-start'} gap-2" style="max-width: 80%;" data-message-id="${msg.id}">
        ${!isMine ? `<div class="user-avatar-badge" style="width: 28px; height: 28px; font-size: 10px; flex-shrink: 0;">P2</div>` : ''}

        <div class="flex flex-col ${isMine ? 'items-end' : 'items-start'}">
          <!-- Bubble Content Surface -->
          <div style="
            background: ${isMine ? 'linear-gradient(135deg, var(--accent-primary-dark), #581c87)' : 'var(--bg-surface-hover)'};
            border: 1px solid ${isMine ? 'var(--accent-primary)' : 'var(--border-subtle)'};
            padding: 10px 14px;
            border-radius: ${isMine ? '14px 4px 14px 14px' : '4px 14px 14px 14px'};
            color: #ffffff;
            position: relative;
            word-break: break-word;
          ">
            <!-- Parent Reply Quoted Header -->
            ${msg.reply_to_id ? `
              <div style="padding: 4px 8px; background: rgba(0,0,0,0.25); border-left: 2px solid var(--accent-secondary); border-radius: 4px; margin-bottom: 6px; font-size: var(--text-xs); opacity: 0.85;">
                Quoted message
              </div>
            ` : ''}

            <!-- Message Body Rendering (Text, Voice, Media) -->
            ${msg.message_type === 'voice' ? `
              <div class="flex items-center gap-2" style="min-width: 180px;">
                <audio controls src="${msg.decryptedContent}" style="max-width: 220px; height: 32px; filter: invert(0.9);"></audio>
              </div>
            ` : msg.message_type === 'photo' ? `
              <div>
                <img src="${msg.decryptedContent}" alt="Shared photo" style="border-radius: var(--radius-md); max-height: 240px; object-fit: cover; margin-bottom: 4px;" />
              </div>
            ` : msg.message_type === 'video' ? `
              <div>
                <video controls src="${msg.decryptedContent}" style="border-radius: var(--radius-md); max-height: 240px; max-width: 100%;"></video>
              </div>
            ` : `
              <p style="font-size: var(--text-sm); margin: 0; line-height: 1.5; color: ${isMine ? '#ffffff' : 'var(--text-primary)'};">${this.escapeHtml(msg.decryptedContent)}</p>
            `}
          </div>

          <!-- Metadata & Inline Action Triggers -->
          <div class="flex items-center gap-2" style="margin-top: 3px; font-size: 0.688rem; color: var(--text-muted);">
            <span>${timeFormatted}</span>
            ${msg.is_edited ? '<span>• (edited)</span>' : ''}
            ${isMine ? '<span>• Read</span>' : ''}

            <!-- Message Action Triggers -->
            <button class="msg-action-btn" data-action="react" data-id="${msg.id}" title="Add Reaction" style="color: var(--text-muted); padding: 0 2px;">😀</button>
            <button class="msg-action-btn" data-action="reply" data-id="${msg.id}" title="Reply" style="color: var(--text-muted); padding: 0 2px;">↩</button>
            ${isMine ? `
              <button class="msg-action-btn" data-action="edit" data-id="${msg.id}" title="Edit" style="color: var(--text-muted); padding: 0 2px;">✎</button>
              <button class="msg-action-btn" data-action="delete" data-id="${msg.id}" title="Delete" style="color: var(--text-muted); padding: 0 2px;">🗑</button>
            ` : ''}
          </div>

          <!-- Reactions Display Bar -->
          ${Object.keys(reactionCounts).length > 0 ? `
            <div class="flex gap-1" style="margin-top: 3px;">
              ${Object.entries(reactionCounts).map(([emoji, count]) => `
                <span class="badge badge-champagne text-xs" style="padding: 1px 6px; cursor: pointer;" title="${count} reaction(s)">
                  ${emoji} ${count > 1 ? count : ''}
                </span>
              `).join('')}
            </div>
          ` : ''}
        </div>

        ${isMine ? `<div class="user-avatar-badge" style="width: 28px; height: 28px; font-size: 10px; background: var(--accent-primary); flex-shrink: 0;">Me</div>` : ''}
      </div>
    `;
  },

  mount(container) {
    const messageInput = container.querySelector('#message-input');
    const sendBtn = container.querySelector('#send-msg-btn');
    const attachBtn = container.querySelector('#attach-btn');
    const fileInput = container.querySelector('#media-file-input');
    const voiceBtn = container.querySelector('#voice-record-btn');
    const disappearingBtn = container.querySelector('#chat-disappearing-btn');
    const searchInput = container.querySelector('#chat-search-input');
    const cancelReplyBtn = container.querySelector('#cancel-reply-btn');
    const cancelEditBtn = container.querySelector('#cancel-edit-btn');
    const threadContainer = container.querySelector('#chat-thread-container');

    // Auto-scroll to bottom of thread
    if (threadContainer) {
      threadContainer.scrollTop = threadContainer.scrollHeight;
    }

    // 1. Send Text / Edited Message
    const handleSend = async () => {
      const text = messageInput.value.trim();
      if (!text) return;

      const user = Auth.getCurrentUser();
      if (!user) {
        Toast.error('Session Error', 'Please log in to send messages.');
        return;
      }

      if (this.editingMessage) {
        // Handle Edit Message
        const encrypted = await Crypto.encrypt(text);
        await DB.update('messages', this.editingMessage.id, {
          content_encrypted: encrypted.ciphertext,
          iv: encrypted.iv,
          is_edited: true
        });
        this.editingMessage = null;
        messageInput.value = '';
        Toast.success('Message Edited', 'Message updated securely.');
      } else {
        // Handle New Message
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
      }

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

    // 2. Search Messages
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        // Debounced refresh
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
          window.AppRouter?.handleRouting();
        }, 200);
      });
    }

    // 3. Attach Photo / Video / File
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

          // Insert file metadata into files table
          const fileRecord = await DB.insert('files', {
            name: file.name,
            file_size: file.size,
            mime_type: file.type,
            mega_handle: 'mega_' + Math.random().toString(36).substring(2, 10),
            category: 'attachment'
          });

          // Insert message referencing file
          await DB.insert('messages', {
            conversation_id: this.activeConversationId,
            sender_id: user.id,
            content_encrypted: encrypted.ciphertext,
            iv: encrypted.iv,
            message_type: msgType,
            attachment_ref: fileRecord.id
          });

          Toast.success('Media Dispatched', 'Encrypted file shared in room.');
          window.AppRouter?.handleRouting();
        };
        reader.readAsDataURL(file);
      });
    }

    // 4. Voice Recording via MediaRecorder
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

                Toast.success('Voice Message Sent', 'Audio note encrypted and stored.');
                window.AppRouter?.handleRouting();
              };
              reader.readAsDataURL(audioBlob);
            };

            this.mediaRecorder.start();
            this.isRecordingVoice = true;
            voiceBtn.classList.add('btn-danger');
            Toast.info('Recording Audio', 'Click microphone again to finish and dispatch.');
          } catch (err) {
            Toast.error('Mic Access Denied', 'Microphone permissions are required for voice notes.');
          }
        } else {
          // Stop recording
          if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
          }
          this.isRecordingVoice = false;
          voiceBtn.classList.remove('btn-danger');
        }
      });
    }

    // 5. Disappearing Messages Selector
    if (disappearingBtn) {
      disappearingBtn.addEventListener('click', () => {
        Modal.open({
          title: 'Disappearing Messages',
          content: `
            <div class="flex flex-col gap-3">
              <p class="text-sm text-secondary">
                When enabled, new messages sent in this room will automatically vanish for both authorized users after the chosen timer.
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
      });
    }

    // 6. Action Triggers: Reactions, Reply, Edit, Delete
    container.querySelectorAll('.msg-action-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const msgId = btn.getAttribute('data-id');
        const user = Auth.getCurrentUser();
        const msgRecord = await DB.getById('messages', msgId);

        if (!msgRecord) return;

        if (action === 'react') {
          // Open reaction picker
          Modal.open({
            title: 'Add Reaction',
            content: `
              <div class="flex justify-around items-center gap-2" style="font-size: 1.8rem; padding: 12px 0;">
                ${this.emojis.map(emo => `
                  <span class="emoji-pick" data-emoji="${emo}" style="cursor: pointer; padding: 4px; transition: transform 0.1s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">${emo}</span>
                `).join('')}
              </div>
            `,
            onOpen: (modalEl) => {
              modalEl.querySelectorAll('.emoji-pick').forEach(emoEl => {
                emoEl.addEventListener('click', async () => {
                  const emoji = emoEl.getAttribute('data-emoji');
                  Modal.close(modalEl.closest('.modal-backdrop'));

                  // Toggle reaction in DB
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
        } else if (action === 'edit') {
          const text = await Crypto.decrypt(msgRecord.content_encrypted, msgRecord.iv);
          this.editingMessage = { id: msgId, text };
          if (messageInput) {
            messageInput.value = text;
            messageInput.focus();
          }
          const editBar = container.querySelector('#edit-preview-bar');
          if (editBar) editBar.style.display = 'flex';
        } else if (action === 'delete') {
          Modal.confirm({
            title: 'Delete Message',
            message: 'Are you sure you want to permanently delete this message for both users?',
            isDanger: true,
            confirmText: 'Delete',
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

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => {
        this.editingMessage = null;
        messageInput.value = '';
        window.AppRouter?.handleRouting();
      });
    }

    // 7. Subscribe to Real-Time Updates
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

  unmount() {
    if (this.unsubMessages) this.unsubMessages();
    if (this.unsubReactions) this.unsubReactions();
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
