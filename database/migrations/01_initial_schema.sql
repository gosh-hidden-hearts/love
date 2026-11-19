-- ============================================================================
-- GOSH POSTGRESQL INITIAL DATABASE SCHEMA MIGRATION
-- Migration Version: 01_initial_schema.sql
-- Description: Creates 21 normalized relational tables, constraints, & indexes
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. IDENTITY & DEVICE SECURITY TABLES
-- ----------------------------------------------------------------------------

-- Authorized Users Whitelist (Exactly 2 Users)
CREATE TABLE IF NOT EXISTS public.authorized_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Registered Hardware Devices
CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'Desktop',
    platform TEXT NOT NULL,
    user_agent TEXT,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(user_id, device_id)
);

-- Active Login Sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    ip_hash TEXT,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Security & Audit Events
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.authorized_users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ----------------------------------------------------------------------------
-- 2. COMMUNICATION & CALLING TABLES
-- ----------------------------------------------------------------------------

-- Conversation Rooms
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL DEFAULT 'GOSH Secure Room',
    is_direct BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Real-Time Messages (E2EE)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    content_encrypted TEXT NOT NULL,
    iv TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'photo', 'video', 'voice', 'file')),
    attachment_ref UUID,
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    disappearing_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Message Reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(message_id, user_id, reaction)
);

-- Call History (WebRTC Logs)
CREATE TABLE IF NOT EXISTS public.call_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caller_id UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('completed', 'missed', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ----------------------------------------------------------------------------
-- 3. STORAGE, FOLDERS & DOCUMENTS (MEGA INTEGRATION)
-- ----------------------------------------------------------------------------

-- Cloud Storage Folders
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#8b5cf6',
    created_by UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Cloud Files (Metadata pointing to MEGA handles)
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    mega_handle TEXT NOT NULL,
    is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    encryption_iv TEXT,
    thumbnail_url TEXT,
    category TEXT NOT NULL DEFAULT 'cloud' CHECK (category IN ('cloud', 'document', 'memory', 'attachment')),
    uploaded_by UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Document Locker Classification
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('identity', 'financial', 'medical', 'legal', 'personal')),
    notes TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_confidential BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ----------------------------------------------------------------------------
-- 4. VAULT & DISASTER RECOVERY (AES-256-GCM)
-- ----------------------------------------------------------------------------

-- Zero-Knowledge Password Vault Items
CREATE TABLE IF NOT EXISTS public.vault_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('login', 'card', 'note', 'identity')),
    data_encrypted TEXT NOT NULL,
    iv TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    favorite BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Disaster Recovery Key Bundles
CREATE TABLE IF NOT EXISTS public.recovery_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    encrypted_key_bundle TEXT NOT NULL,
    verification_hash TEXT NOT NULL,
    key_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ----------------------------------------------------------------------------
-- 5. MEMORIES, DIARY, TOGETHER & MUSIC
-- ----------------------------------------------------------------------------

-- Photo & Video Memory Albums
CREATE TABLE IF NOT EXISTS public.memory_albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    cover_file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Individual Memories
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    album_id UUID REFERENCES public.memory_albums(id) ON DELETE SET NULL,
    caption TEXT,
    memory_date DATE NOT NULL DEFAULT CURRENT_DATE,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Shared Encrypted Diary Entries
CREATE TABLE IF NOT EXISTS public.diary_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    mood TEXT DEFAULT 'peaceful',
    title_encrypted TEXT NOT NULL,
    content_encrypted TEXT NOT NULL,
    iv TEXT NOT NULL,
    attachment_file_ids UUID[] DEFAULT ARRAY[]::UUID[],
    created_by UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Shared Calendar Events
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
    category TEXT NOT NULL DEFAULT 'event' CHECK (category IN ('event', 'birthday', 'anniversary', 'travel', 'reminder')),
    reminder_minutes INTEGER DEFAULT 60,
    created_by UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Collaborative Checklist Tasks
CREATE TABLE IF NOT EXISTS public.shared_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_by UUID REFERENCES public.authorized_users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Shared Expense Tracking
CREATE TABLE IF NOT EXISTS public.shared_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    category TEXT NOT NULL DEFAULT 'general',
    paid_by UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    split_ratio TEXT NOT NULL DEFAULT '50/50',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Music Playlists
CREATE TABLE IF NOT EXISTS public.music_playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    created_by UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Music Links & Items
CREATE TABLE IF NOT EXISTS public.music_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID NOT NULL REFERENCES public.music_playlists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    external_url TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('youtube', 'spotify', 'soundcloud', 'apple_music', 'other')),
    added_by UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ----------------------------------------------------------------------------
-- PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_folder ON public.files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_category ON public.files(category);
CREATE INDEX IF NOT EXISTS idx_vault_category ON public.vault_items(category);
CREATE INDEX IF NOT EXISTS idx_memories_date ON public.memories(memory_date DESC);
CREATE INDEX IF NOT EXISTS idx_diary_date ON public.diary_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_start ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON public.shared_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.shared_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_music_playlist ON public.music_items(playlist_id);
