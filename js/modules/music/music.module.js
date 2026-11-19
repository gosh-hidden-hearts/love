/**
 * GOSH MUSIC MODULE (PHASE 9)
 * Shared Curated Playlists, Streaming Links (Spotify, YouTube, SoundCloud),
 * and Built-in HTML5 Audio Playback Engine.
 */

import { Icons } from '../../components/icons.js';
import { DB } from '../../services/db.service.js';
import { Auth } from '../../services/auth.service.js';
import { Toast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';

export const MusicModule = {
  activePlaylistId: null,
  currentTrack: null,
  isPlaying: false,
  audioElement: null,
  unsubscribePlaylists: null,
  unsubscribeItems: null,

  initAudio() {
    if (!this.audioElement && typeof Audio !== 'undefined') {
      this.audioElement = new Audio();
      this.audioElement.addEventListener('ended', () => {
        this.isPlaying = false;
        this.updatePlayerUI();
      });
      this.audioElement.addEventListener('error', (e) => {
        console.warn('Audio playback notice:', e);
        this.isPlaying = false;
        this.updatePlayerUI();
      });
    }
  },

  async render() {
    this.initAudio();

    const playlists = await DB.query('music_playlists', null, (a, b) => new Date(a.created_at) - new Date(b.created_at)).catch(() => []);
    if (!this.activePlaylistId && playlists.length > 0) {
      this.activePlaylistId = playlists[0].id;
    }

    const currentPlaylist = playlists.find(p => p.id === this.activePlaylistId) || playlists[0] || null;
    const tracks = currentPlaylist ? 
      await DB.query('music_items', (t) => t.playlist_id === currentPlaylist.id, (a, b) => new Date(b.created_at) - new Date(a.created_at)).catch(() => []) : 
      [];

    return `
      <div class="view-container">
        <!-- Top Action & Title Header -->
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-4);">
          <div>
            <div class="badge badge-violet" style="margin-bottom: var(--space-2);">
              Shared Listening Room
            </div>
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Music</h1>
            <p class="text-muted">Curated playlists, joint streaming links, and private audio listening.</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-secondary" id="new-playlist-btn">
              <span>+ New Playlist</span>
            </button>
            <button class="btn btn-primary" id="add-track-btn">
              ${Icons.music}
              <span>+ Add Track</span>
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 280px 1fr; gap: var(--space-6);" class="music-layout-grid">
          <!-- Left: Playlists List -->
          <div class="card" style="padding: var(--space-4);">
            <div class="card-header" style="margin-bottom: var(--space-3);">
              <h2 class="card-title" style="font-size: var(--text-sm);">Our Playlists</h2>
              <span class="badge badge-champagne text-xs">${playlists.length}</span>
            </div>

            <div class="flex flex-col gap-2" id="playlists-sidebar">
              ${playlists.map(pl => {
                const isActive = pl.id === this.activePlaylistId;
                return `
                  <div class="card flex justify-between items-center playlist-item-select" data-id="${pl.id}" style="padding: 10px 14px; cursor: pointer; background: ${isActive ? 'var(--bg-surface-active)' : 'var(--bg-surface-hover)'}; border-color: ${isActive ? 'var(--accent-primary)' : 'var(--border-subtle)'};">
                    <div class="flex items-center gap-2">
                      <div style="color: ${isActive ? 'var(--accent-primary)' : 'var(--text-muted)'};">
                        ${Icons.music}
                      </div>
                      <div class="text-xs font-semibold" style="color: ${isActive ? 'var(--text-primary)' : 'var(--text-secondary)'};">
                        ${this.escapeHtml(pl.name)}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Right: Active Playlist Tracks -->
          <div class="flex flex-col gap-4">
            <!-- Playlist Banner -->
            ${currentPlaylist ? `
              <div class="card flex justify-between items-center" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(245, 224, 183, 0.08)); border-color: var(--border-medium);">
                <div>
                  <h2 style="font-size: var(--text-lg); font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
                    ${this.escapeHtml(currentPlaylist.name)}
                  </h2>
                  <p class="text-xs text-muted">${this.escapeHtml(currentPlaylist.description || 'Shared collection')} • ${tracks.length} ${tracks.length === 1 ? 'song' : 'songs'}</p>
                </div>
                <button class="btn btn-secondary btn-sm delete-playlist-btn" data-id="${currentPlaylist.id}">
                  Delete Playlist
                </button>
              </div>
            ` : ''}

            <!-- Tracks Table -->
            <div class="card" style="padding: 0; overflow: hidden;">
              ${tracks.length === 0 ? `
                <div class="empty-state" style="padding: var(--space-8);">
                  <div class="empty-state-icon">${Icons.music}</div>
                  <p class="text-sm font-semibold">Playlist is empty</p>
                  <p class="text-xs text-muted">Add YouTube, Spotify, SoundCloud, or direct audio links.</p>
                </div>
              ` : `
                <div class="flex flex-col">
                  ${tracks.map((track, idx) => {
                    const platformBadges = {
                      spotify: '<span class="badge text-xs" style="background: rgba(30,215,96,0.15); color: #1ed760; border: 1px solid #1ed76044;">Spotify</span>',
                      youtube: '<span class="badge text-xs" style="background: rgba(255,0,0,0.15); color: #ff4d4d; border: 1px solid #ff4d4d44;">YouTube</span>',
                      soundcloud: '<span class="badge text-xs" style="background: rgba(255,85,0,0.15); color: #ff7700; border: 1px solid #ff770044;">SoundCloud</span>',
                      apple_music: '<span class="badge text-xs" style="background: rgba(250,35,59,0.15); color: #fa233b; border: 1px solid #fa233b44;">Apple Music</span>',
                      other: '<span class="badge text-xs badge-champagne">Audio Stream</span>'
                    };

                    const isThisPlaying = this.currentTrack && this.currentTrack.id === track.id && this.isPlaying;

                    return `
                      <div class="flex justify-between items-center" style="padding: 12px 18px; border-bottom: 1px solid var(--border-subtle); background: ${isThisPlaying ? 'rgba(139, 92, 246, 0.08)' : 'transparent'};">
                        <div class="flex items-center gap-3">
                          <button class="btn btn-icon btn-sm play-track-btn" data-id="${track.id}" style="width: 32px; height: 32px; border-radius: var(--radius-full); background: ${isThisPlaying ? 'var(--accent-primary)' : 'var(--bg-surface-hover)'}; color: #ffffff;">
                            ${isThisPlaying ? '⏸' : '▶'}
                          </button>
                          <div>
                            <div class="text-sm font-semibold" style="color: var(--text-primary);">${this.escapeHtml(track.title)}</div>
                            <div class="text-xs text-muted">${this.escapeHtml(track.artist)}</div>
                          </div>
                        </div>

                        <div class="flex items-center gap-3">
                          ${platformBadges[track.platform] || platformBadges.other}
                          <a href="${this.escapeHtml(track.external_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 4px 8px;">
                            Launch ↗
                          </a>
                          <button class="btn btn-icon btn-sm delete-track-btn" data-id="${track.id}" title="Remove Track" style="color: var(--color-danger); opacity: 0.7;">
                            ${Icons.close}
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>

            <!-- Mini Player HUD (If track active) -->
            ${this.currentTrack ? `
              <div class="card flex justify-between items-center" style="background: #0f1016; border: 1px solid var(--accent-primary); border-radius: var(--radius-lg); padding: 12px 20px;">
                <div class="flex items-center gap-3">
                  <div class="brand-emblem" style="width: 36px; height: 36px; font-size: 1.1rem;">
                    ${Icons.music}
                  </div>
                  <div>
                    <div class="text-sm font-semibold" style="color: var(--text-primary);">${this.escapeHtml(this.currentTrack.title)}</div>
                    <div class="text-xs text-muted">${this.escapeHtml(this.currentTrack.artist)}</div>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <button class="btn btn-icon btn-primary" id="player-hud-toggle" style="width: 36px; height: 36px; border-radius: var(--radius-full);">
                    ${this.isPlaying ? '⏸' : '▶'}
                  </button>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  mount() {
    // Playlist Selection
    document.querySelectorAll('.playlist-item-select').forEach(el => {
      el.addEventListener('click', (e) => {
        this.activePlaylistId = e.currentTarget.dataset.id;
        this.refreshView();
      });
    });

    // Play Track
    document.querySelectorAll('.play-track-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const track = await DB.getById('music_items', id);
        if (track) {
          if (this.currentTrack && this.currentTrack.id === track.id) {
            this.togglePlayPause();
          } else {
            this.playTrack(track);
          }
        }
      });
    });

    // HUD Play/Pause Toggle
    const hudToggle = document.getElementById('player-hud-toggle');
    if (hudToggle) {
      hudToggle.addEventListener('click', () => this.togglePlayPause());
    }

    // Delete Playlist
    document.querySelectorAll('.delete-playlist-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        Modal.confirm('Delete Playlist', 'Are you sure you want to delete this playlist and its songs?', async () => {
          await DB.delete('music_playlists', id);
          const remainingTracks = await DB.query('music_items', t => t.playlist_id === id);
          for (const t of remainingTracks) {
            await DB.delete('music_items', t.id);
          }
          this.activePlaylistId = null;
          Toast.info('Playlist Deleted', 'Playlist and songs removed.');
          this.refreshView();
        });
      });
    });

    // Delete Track
    document.querySelectorAll('.delete-track-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        Modal.confirm('Remove Track', 'Remove this song from the playlist?', async () => {
          await DB.delete('music_items', id);
          Toast.info('Track Removed', 'Song removed from playlist.');
          this.refreshView();
        });
      });
    });

    // Add Track Modal
    const addTrackBtn = document.getElementById('add-track-btn');
    if (addTrackBtn) {
      addTrackBtn.addEventListener('click', async () => {
        const playlists = await DB.query('music_playlists').catch(() => []);
        const modalHtml = `
          <div class="flex flex-col gap-4">
            <div>
              <label class="form-label">Track Title</label>
              <input type="text" id="track-title" class="input-field" placeholder="e.g. Midnight City" />
            </div>
            <div>
              <label class="form-label">Artist</label>
              <input type="text" id="track-artist" class="input-field" placeholder="e.g. M83" />
            </div>
            <div class="flex gap-3">
              <div style="flex: 1;">
                <label class="form-label">Streaming Platform</label>
                <select id="track-platform" class="input-field">
                  <option value="spotify">Spotify</option>
                  <option value="youtube">YouTube</option>
                  <option value="soundcloud">SoundCloud</option>
                  <option value="apple_music">Apple Music</option>
                  <option value="other">Direct Audio Link</option>
                </select>
              </div>
              <div style="flex: 1;">
                <label class="form-label">Target Playlist</label>
                <select id="track-playlist" class="input-field">
                  ${playlists.map(p => `<option value="${p.id}" ${p.id === this.activePlaylistId ? 'selected' : ''}>${this.escapeHtml(p.name)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div>
              <label class="form-label">Song Link / Streaming URL</label>
              <input type="text" id="track-url" class="input-field" placeholder="https://open.spotify.com/... or https://youtube.com/watch?v=..." />
            </div>
            <div class="flex justify-end gap-2">
              <button class="btn btn-secondary" onclick="window.Modal.close()">Cancel</button>
              <button class="btn btn-primary" id="save-track-btn">Add Track</button>
            </div>
          </div>
        `;

        Modal.show('Add Song to Playlist', modalHtml);

        setTimeout(() => {
          const saveBtn = document.getElementById('save-track-btn');
          if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
              const title = document.getElementById('track-title').value.trim();
              const artist = document.getElementById('track-artist').value.trim();
              const platform = document.getElementById('track-platform').value;
              const playlistId = document.getElementById('track-playlist').value;
              const url = document.getElementById('track-url').value.trim();

              if (!title || !artist || !url) {
                Toast.error('Incomplete Fields', 'Please provide title, artist, and URL.');
                return;
              }

              const currentUser = Auth.getCurrentUser();
              await DB.insert('music_items', {
                playlist_id: playlistId,
                title,
                artist,
                external_url: url,
                platform,
                added_by: currentUser ? currentUser.id : 'u1-auth-0000-0000-000000000001'
              });

              Modal.close();
              Toast.success('Track Added', `"${title}" added to playlist.`);
              this.refreshView();
            });
          }
        }, 50);
      });
    }

    // New Playlist Modal
    const newPlaylistBtn = document.getElementById('new-playlist-btn');
    if (newPlaylistBtn) {
      newPlaylistBtn.addEventListener('click', () => {
        const modalHtml = `
          <div class="flex flex-col gap-4">
            <div>
              <label class="form-label">Playlist Name</label>
              <input type="text" id="playlist-name" class="input-field" placeholder="e.g. Chill Evening Beats" />
            </div>
            <div>
              <label class="form-label">Description (Optional)</label>
              <input type="text" id="playlist-desc" class="input-field" placeholder="e.g. Ambient & acoustic tracks" />
            </div>
            <div class="flex justify-end gap-2">
              <button class="btn btn-secondary" onclick="window.Modal.close()">Cancel</button>
              <button class="btn btn-primary" id="save-playlist-btn">Create Playlist</button>
            </div>
          </div>
        `;

        Modal.show('Create New Playlist', modalHtml);

        setTimeout(() => {
          const saveBtn = document.getElementById('save-playlist-btn');
          if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
              const name = document.getElementById('playlist-name').value.trim();
              const desc = document.getElementById('playlist-desc').value.trim();

              if (!name) {
                Toast.error('Name Required', 'Please enter a name for the playlist.');
                return;
              }

              const currentUser = Auth.getCurrentUser();
              const newPl = await DB.insert('music_playlists', {
                name,
                description: desc || '',
                created_by: currentUser ? currentUser.id : 'u1-auth-0000-0000-000000000001'
              });

              this.activePlaylistId = newPl.id;
              Modal.close();
              Toast.success('Playlist Created', `"${name}" ready for tracks.`);
              this.refreshView();
            });
          }
        }, 50);
      });
    }

    // Subscriptions
    if (!this.unsubscribePlaylists) {
      this.unsubscribePlaylists = DB.subscribe('music_playlists', () => this.refreshView());
    }
  },

  playTrack(track) {
    this.currentTrack = track;
    this.isPlaying = true;
    if (this.audioElement && (track.external_url.endsWith('.mp3') || track.external_url.endsWith('.m4a') || track.external_url.endsWith('.ogg'))) {
      try {
        this.audioElement.src = track.external_url;
        this.audioElement.play().catch(e => console.warn('Audio play notice:', e));
      } catch (e) {
        console.warn(e);
      }
    }
    Toast.info('Now Playing', `${track.title} • ${track.artist}`);
    this.refreshView();
  },

  togglePlayPause() {
    if (!this.currentTrack) return;
    this.isPlaying = !this.isPlaying;
    if (this.audioElement) {
      if (this.isPlaying) {
        this.audioElement.play().catch(() => {});
      } else {
        this.audioElement.pause();
      }
    }
    this.refreshView();
  },

  updatePlayerUI() {
    this.refreshView();
  },

  async refreshView() {
    if (typeof document === 'undefined') return;
    const main = document.getElementById('main-content');
    if (main && window.location.hash === '#music') {
      main.innerHTML = await this.render();
      this.mount();
    }
  },

  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  unmount() {
    if (this.unsubscribePlaylists) { this.unsubscribePlaylists(); this.unsubscribePlaylists = null; }
    if (this.unsubscribeItems) { this.unsubscribeItems(); this.unsubscribeItems = null; }
  }
};
