-- =========================================================================
-- GOSH (Glimpse Of Soul Hearts) — Master PostgreSQL Database Schema
-- Compatible with Supabase PostgreSQL & PostgREST
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & CORE IDENTITIES
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(128) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    username VARCHAR(50) UNIQUE,
    mobile_number VARCHAR(20) UNIQUE,
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USER PROFILES
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    bio TEXT DEFAULT 'In a love story written by the stars ✨',
    relationship_status VARCHAR(50) DEFAULT 'In a soul bond',
    anniversary_date DATE,
    partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    online_status BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    custom_status_text VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. USER IDENTIFIERS (For fast lookup by email, username, phone)
CREATE TABLE IF NOT EXISTS user_identifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    identifier_type VARCHAR(20) NOT NULL, -- 'email', 'username', 'mobile'
    identifier_value VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (identifier_type, identifier_value)
);

-- 4. USER SETTINGS
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(30) DEFAULT 'romantic-dark',
    language VARCHAR(10) DEFAULT 'en',
    sound_enabled BOOLEAN DEFAULT TRUE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    last_seen_privacy VARCHAR(20) DEFAULT 'everyone', -- 'everyone', 'contacts', 'nobody'
    read_receipts_enabled BOOLEAN DEFAULT TRUE,
    online_visibility VARCHAR(20) DEFAULT 'everyone',
    profile_photo_visibility VARCHAR(20) DEFAULT 'everyone',
    status_privacy VARCHAR(20) DEFAULT 'contacts',
    passcode_vault_enabled BOOLEAN DEFAULT FALSE,
    passcode_hash VARCHAR(255),
    screen_sharing_allowed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. USER DEVICES & SESSIONS
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(100),
    browser VARCHAR(100),
    ip_address VARCHAR(45),
    push_token TEXT,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CONTACTS
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nickname VARCHAR(100),
    is_favorite BOOLEAN DEFAULT FALSE,
    is_connected BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, contact_user_id)
);

-- 7. CONNECTIONS (Soul bonds / Couple spaces)
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'couple',
    status VARCHAR(20) DEFAULT 'accepted', -- 'pending', 'accepted', 'paused'
    love_streak INTEGER DEFAULT 1,
    bond_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

-- 8. CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) DEFAULT 'direct', -- 'direct', 'vault_private', 'group'
    title VARCHAR(150),
    last_message_text TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CONVERSATION MEMBERS
CREATE TABLE IF NOT EXISTS conversation_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_muted BOOLEAN DEFAULT FALSE,
    unread_count INTEGER DEFAULT 0,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- 10. MESSAGES
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    message_type VARCHAR(30) DEFAULT 'text', -- 'text', 'image', 'video', 'audio', 'file'
    content TEXT,
    media_url TEXT,
    audio_url TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    mega_file_handle VARCHAR(100),
    mega_download_url TEXT,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted_for_all BOOLEAN DEFAULT FALSE,
    delivery_status VARCHAR(20) DEFAULT 'sent', -- 'sending', 'sent', 'delivered', 'read'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. MESSAGE ATTACHMENTS
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_type VARCHAR(30) NOT NULL,
    file_url TEXT NOT NULL,
    mega_file_handle VARCHAR(100),
    file_name VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(100),
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. MESSAGE RECEIPTS
CREATE TABLE IF NOT EXISTS message_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receipt_type VARCHAR(20) NOT NULL, -- 'delivered', 'read'
    receipt_timestamp TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, receipt_type)
);

-- 13. MESSAGE REACTIONS
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(10) NOT NULL, -- '❤️', '😍', '😘', '🔥', '🥺', '👍'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- 14. STATUSES (Stories expiring in 24h)
CREATE TABLE IF NOT EXISTS statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status_type VARCHAR(20) DEFAULT 'text', -- 'text', 'photo', 'video'
    content TEXT,
    media_url TEXT,
    mega_file_handle VARCHAR(100),
    caption TEXT,
    background_color VARCHAR(30) DEFAULT '#2e0854',
    font_family VARCHAR(50) DEFAULT 'default',
    views_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. STATUS VIEWS
CREATE TABLE IF NOT EXISTS status_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(status_id, viewer_id)
);

-- 16. STATUS REACTIONS
CREATE TABLE IF NOT EXISTS status_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(10) NOT NULL,
    reply_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. CALLS
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    call_type VARCHAR(20) DEFAULT 'audio', -- 'audio', 'video'
    call_status VARCHAR(20) DEFAULT 'ended', -- 'initiating', 'ringing', 'connected', 'missed', 'rejected', 'ended'
    started_at TIMESTAMPTZ DEFAULT NOW(),
    connected_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0
);

-- 18. CALL PARTICIPANTS
CREATE TABLE IF NOT EXISTS call_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'participant',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ
);

-- 19. MEMORY SPACES
CREATE TABLE IF NOT EXISTS memory_spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) DEFAULT 'Our Romantic Vault',
    description TEXT,
    couple_connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,
    cover_image_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. MEMORY MEMBERS
CREATE TABLE IF NOT EXISTS memory_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID NOT NULL REFERENCES memory_spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_level VARCHAR(20) DEFAULT 'admin', -- 'admin', 'member'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(space_id, user_id)
);

-- 21. MEMORY ALBUMS
CREATE TABLE IF NOT EXISTS memory_albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID NOT NULL REFERENCES memory_spaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cover_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. MEMORY FILES (Stored on MEGA Cloud)
CREATE TABLE IF NOT EXISTS memory_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID NOT NULL REFERENCES memory_spaces(id) ON DELETE CASCADE,
    album_id UUID REFERENCES memory_albums(id) ON DELETE SET NULL,
    uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(30) NOT NULL, -- 'photo', 'video', 'audio', 'document'
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    mega_file_handle VARCHAR(100),
    mega_download_url TEXT,
    thumbnail_url TEXT,
    caption TEXT,
    memory_date DATE DEFAULT CURRENT_DATE,
    feelings_tag VARCHAR(50), -- 'Heartfelt', 'Sweet', 'Special Day', 'Dreamy'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- 'message', 'call_missed', 'status_reaction', 'memory_upload', 'soul_heart'
    title VARCHAR(150) NOT NULL,
    body TEXT NOT NULL,
    action_link VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. BLOCKED USERS
CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, blocked_user_id)
);

-- 25. OTP VERIFICATIONS (For Google SMTP Email OTP)
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(30) NOT NULL, -- 'signup', 'forgot_password', 'mobile_verify'
    attempts_count INTEGER DEFAULT 0,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. LOGIN SESSIONS
CREATE TABLE IF NOT EXISTS login_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 27. SECURITY EVENTS
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'login_success', 'failed_attempt', 'password_changed', 'vault_unlocked'
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 28. TERMS ACCEPTANCE (For Agree & Continue audit)
CREATE TABLE IF NOT EXISTS terms_acceptance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    terms_version VARCHAR(20) DEFAULT 'v1.0.0',
    privacy_version VARCHAR(20) DEFAULT 'v1.0.0',
    accepted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 29. END-TO-END ENCRYPTION KEYS (Public key exchange)
CREATE TABLE IF NOT EXISTS encryption_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    public_key JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR MAXIMUM QUERY EFFICIENCY
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile_number);
CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_statuses_expires ON statuses(expires_at);
CREATE INDEX IF NOT EXISTS idx_memory_space_id ON memory_files(space_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_users ON calls(caller_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_user ON encryption_keys(user_id);
