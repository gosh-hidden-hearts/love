-- ============================================================================
-- GOSH POSTGRESQL MIGRATION 02 — PUBLIC USERS, PROFILES & DISCOVERY
-- Migration Version: 02_public_users_and_profiles.sql
-- Description: Extends GOSH with public registration, profiles, user discovery,
--              contacts list, and multi-user conversation memberships.
-- ============================================================================

-- 1. Public User Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    avatar_url TEXT,
    bio TEXT DEFAULT 'Living life, telling stories.',
    online_status BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Indexes for rapid user discovery (Exact-match on username, email, phone)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(lower(username));
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 2. User Contacts Table
CREATE TABLE IF NOT EXISTS public.user_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    custom_nickname TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(user_id, contact_user_id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.user_contacts(user_id);

-- 3. Conversation Memberships Table (Multi-User Chats)
CREATE TABLE IF NOT EXISTS public.conversation_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_convo_members_convo ON public.conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_convo_members_user ON public.conversation_members(user_id);

-- 4. OTP Verification Records Table
CREATE TABLE IF NOT EXISTS public.otp_verification_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'login' CHECK (purpose IN ('login', 'register', 'reset_password')),
    attempts INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON public.otp_verification_records(lower(email));
