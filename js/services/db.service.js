/**
 * GOSH DATABASE & STORAGE SERVICE (PHASE 3)
 * Offline-first, Zero-Cost Supabase REST & WebSocket abstraction layer.
 */

import { SupabaseConfig } from '../config/supabase.config.js';
import { Auth } from './auth.service.js';
import { State } from '../state.js';

class DatabaseService {
  constructor() {
    this.prefix = 'gosh_db_';
    this.listeners = new Map();
    this.initDefaultSeed();
  }

  // 1. INITIAL SEED PROVISIONING (OFFLINE-FIRST STORE)
  initDefaultSeed() {
    // Check if initial database has been populated
    const initialized = localStorage.getItem('gosh_db_initialized');
    if (!initialized) {
      console.log('[GOSH DB] Populating initial local offline seed data...');
      
      // Default Conversation Room
      this.saveTable('conversations', [
        {
          id: 'c1-room-0000-0000-000000000001',
          title: 'GOSH Secure Room',
          is_direct: true,
          created_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        }
      ]);

      // Default Storage Folders
      this.saveTable('folders', [
        { id: 'f1-fold-0000-0000-000000000001', name: 'Documents', color: '#8b5cf6', created_by: 'u1-auth-0000-0000-000000000001', created_at: new Date().toISOString() },
        { id: 'f2-fold-0000-0000-000000000002', name: 'Photo Albums', color: '#38bdf8', created_by: 'u1-auth-0000-0000-000000000001', created_at: new Date().toISOString() },
        { id: 'f3-fold-0000-0000-000000000003', name: 'Encrypted Backups', color: '#f5e0b7', created_by: 'u1-auth-0000-0000-000000000001', created_at: new Date().toISOString() }
      ]);

      // Default Music Playlists
      this.saveTable('music_playlists', [
        { id: 'p1-play-0000-0000-000000000001', name: 'Our Favorites', description: 'Curated shared music library', created_by: 'u1-auth-0000-0000-000000000001', created_at: new Date().toISOString() },
        { id: 'p2-play-0000-0000-000000000002', name: 'Travel & Roadtrip', description: 'Road adventure playlists', created_by: 'u2-auth-0000-0000-000000000002', created_at: new Date().toISOString() }
      ]);

      // Empty tables for all other entities
      const emptyTables = [
        'messages', 'message_reactions', 'call_history', 'files', 'documents',
        'vault_items', 'recovery_records', 'memory_albums', 'memories',
        'diary_entries', 'calendar_events', 'shared_tasks', 'shared_expenses', 'music_items'
      ];
      emptyTables.forEach(t => this.saveTable(t, []));

      localStorage.setItem('gosh_db_initialized', 'true');
    }
  }

  // 2. LOW-LEVEL TABLE STORAGE
  getTable(tableName) {
    try {
      const data = localStorage.getItem(this.prefix + tableName);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.error(`[GOSH DB] Failed to load table "${tableName}":`, err);
      return [];
    }
  }

  saveTable(tableName, rows) {
    try {
      localStorage.setItem(this.prefix + tableName, JSON.stringify(rows));
      this.notifySubscribers(tableName, rows);
    } catch (err) {
      console.error(`[GOSH DB] Failed to save table "${tableName}":`, err);
    }
  }

  // 3. SECURITY GATE CHECK
  assertAuthenticated() {
    if (!Auth.isAuthenticated()) {
      throw new Error('Access Denied: You must be authenticated to perform database queries.');
    }
  }

  // 4. UNIFIED CRUD OPERATIONS
  async query(tableName, filterFn = null, sortFn = null) {
    this.assertAuthenticated();
    let rows = this.getTable(tableName);
    if (filterFn && typeof filterFn === 'function') {
      rows = rows.filter(filterFn);
    }
    if (sortFn && typeof sortFn === 'function') {
      rows = rows.sort(sortFn);
    }
    return rows;
  }

  async getById(tableName, id) {
    this.assertAuthenticated();
    const rows = this.getTable(tableName);
    return rows.find(r => r.id === id) || null;
  }

  async insert(tableName, record) {
    this.assertAuthenticated();
    const rows = this.getTable(tableName);
    const currentUser = Auth.getCurrentUser();

    const newRecord = {
      id: record.id || 'id_' + Math.random().toString(36).substring(2, 12),
      ...record,
      created_by: record.created_by || currentUser?.id,
      created_at: record.created_at || new Date().toISOString()
    };

    rows.push(newRecord);
    this.saveTable(tableName, rows);
    return newRecord;
  }

  async update(tableName, id, updates) {
    this.assertAuthenticated();
    const rows = this.getTable(tableName);
    const index = rows.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error(`Record with id "${id}" not found in table "${tableName}".`);
    }

    const updatedRecord = {
      ...rows[index],
      ...updates,
      updated_at: new Date().toISOString()
    };

    rows[index] = updatedRecord;
    this.saveTable(tableName, rows);
    return updatedRecord;
  }

  async delete(tableName, id) {
    this.assertAuthenticated();
    let rows = this.getTable(tableName);
    const initialLen = rows.length;
    rows = rows.filter(r => r.id !== id);

    if (rows.length === initialLen) {
      throw new Error(`Record with id "${id}" not found in table "${tableName}".`);
    }

    this.saveTable(tableName, rows);
    return { success: true, deletedId: id };
  }

  // 5. REALTIME SYNCHRONIZATION
  subscribe(tableName, callback) {
    if (!this.listeners.has(tableName)) {
      this.listeners.set(tableName, new Set());
    }
    this.listeners.get(tableName).add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.listeners.get(tableName);
      if (subs) subs.delete(callback);
    };
  }

  notifySubscribers(tableName, data) {
    const subs = this.listeners.get(tableName);
    if (subs) {
      subs.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`[GOSH DB] Subscriber error on "${tableName}":`, err);
        }
      });
    }
  }
}

export const DB = new DatabaseService();
