-- =========================================================================
-- GOSH (Glimpse Of Soul Hearts) — Supabase Row Level Security (RLS) Policies
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/azwclorwxrzgofmribms/sql)
--
-- Security Model:
--   - Authentication is handled by Firebase Authentication.
--   - All application database reads and writes go through the Express backend
--     using SUPABASE_SERVICE_ROLE_KEY (which uses Postgres role `service_role`).
--   - RLS remains ENABLED on all 29 tables.
--   - Anonymous (`anon`) and unauthenticated PostgREST requests have ZERO
--     read or write access to user data, OTPs, messages, contacts, or vault metadata.
-- =========================================================================

-- Enable RLS on all core tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop legacy insecure public/anon policies
DROP POLICY IF EXISTS "Public users lookup" ON users;
DROP POLICY IF EXISTS "Allow user registration and sync" ON users;
DROP POLICY IF EXISTS "Allow user self update" ON users;
DROP POLICY IF EXISTS "Service role full access on users" ON users;

DROP POLICY IF EXISTS "Public profiles read" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile update" ON user_profiles;
DROP POLICY IF EXISTS "Service role full access on user_profiles" ON user_profiles;

DROP POLICY IF EXISTS "User settings access" ON user_settings;
DROP POLICY IF EXISTS "Service role full access on user_settings" ON user_settings;

DROP POLICY IF EXISTS "Identifiers lookup" ON user_identifiers;
DROP POLICY IF EXISTS "Service role full access on user_identifiers" ON user_identifiers;

DROP POLICY IF EXISTS "Service role full access on user_devices" ON user_devices;

DROP POLICY IF EXISTS "Contacts access" ON contacts;
DROP POLICY IF EXISTS "Contacts owner read" ON contacts;
DROP POLICY IF EXISTS "Contacts owner manage" ON contacts;
DROP POLICY IF EXISTS "Contacts owner insert" ON contacts;
DROP POLICY IF EXISTS "Contacts owner update" ON contacts;
DROP POLICY IF EXISTS "Contacts owner delete" ON contacts;
DROP POLICY IF EXISTS "Service role full access on contacts" ON contacts;

DROP POLICY IF EXISTS "Connections access" ON connections;
DROP POLICY IF EXISTS "Service role full access on connections" ON connections;

DROP POLICY IF EXISTS "Conversations access" ON conversations;
DROP POLICY IF EXISTS "Conversations member read" ON conversations;
DROP POLICY IF EXISTS "Conversations create" ON conversations;
DROP POLICY IF EXISTS "Service role full access on conversations" ON conversations;

DROP POLICY IF EXISTS "Conversation members access" ON conversation_members;
DROP POLICY IF EXISTS "Service role full access on conversation_members" ON conversation_members;

DROP POLICY IF EXISTS "Messages access" ON messages;
DROP POLICY IF EXISTS "Messages member read" ON messages;
DROP POLICY IF EXISTS "Messages contact-restricted insert" ON messages;
DROP POLICY IF EXISTS "Service role full access on messages" ON messages;

DROP POLICY IF EXISTS "Message attachments access" ON message_attachments;
DROP POLICY IF EXISTS "Service role full access on message_attachments" ON message_attachments;

DROP POLICY IF EXISTS "Message receipts access" ON message_receipts;
DROP POLICY IF EXISTS "Service role full access on message_receipts" ON message_receipts;

DROP POLICY IF EXISTS "Message reactions access" ON message_reactions;
DROP POLICY IF EXISTS "Service role full access on message_reactions" ON message_reactions;

DROP POLICY IF EXISTS "Statuses access" ON statuses;
DROP POLICY IF EXISTS "Service role full access on statuses" ON statuses;

DROP POLICY IF EXISTS "Status views access" ON status_views;
DROP POLICY IF EXISTS "Service role full access on status_views" ON status_views;

DROP POLICY IF EXISTS "Status reactions access" ON status_reactions;
DROP POLICY IF EXISTS "Service role full access on status_reactions" ON status_reactions;

DROP POLICY IF EXISTS "Calls log access" ON calls;
DROP POLICY IF EXISTS "Service role full access on calls" ON calls;

DROP POLICY IF EXISTS "Call participants access" ON call_participants;
DROP POLICY IF EXISTS "Service role full access on call_participants" ON call_participants;

DROP POLICY IF EXISTS "Memory spaces access" ON memory_spaces;
DROP POLICY IF EXISTS "Service role full access on memory_spaces" ON memory_spaces;

DROP POLICY IF EXISTS "Memory members access" ON memory_members;
DROP POLICY IF EXISTS "Service role full access on memory_members" ON memory_members;

DROP POLICY IF EXISTS "Memory albums access" ON memory_albums;
DROP POLICY IF EXISTS "Service role full access on memory_albums" ON memory_albums;

DROP POLICY IF EXISTS "Memory files access" ON memory_files;
DROP POLICY IF EXISTS "Service role full access on memory_files" ON memory_files;

DROP POLICY IF EXISTS "Public key exchange read" ON encryption_keys;
DROP POLICY IF EXISTS "Public key registration" ON encryption_keys;
DROP POLICY IF EXISTS "Service role full access on encryption_keys" ON encryption_keys;

DROP POLICY IF EXISTS "Blocked users access" ON blocked_users;
DROP POLICY IF EXISTS "Service role full access on blocked_users" ON blocked_users;

DROP POLICY IF EXISTS "OTP access" ON otp_verifications;
DROP POLICY IF EXISTS "Service role full access on otp_verifications" ON otp_verifications;

DROP POLICY IF EXISTS "Login sessions access" ON login_sessions;
DROP POLICY IF EXISTS "Service role full access on login_sessions" ON login_sessions;

DROP POLICY IF EXISTS "Security events access" ON security_events;
DROP POLICY IF EXISTS "Service role full access on security_events" ON security_events;

DROP POLICY IF EXISTS "Terms audit access" ON terms_acceptance;
DROP POLICY IF EXISTS "Service role full access on terms_acceptance" ON terms_acceptance;

DROP POLICY IF EXISTS "Notifications access" ON notifications;
DROP POLICY IF EXISTS "Service role full access on notifications" ON notifications;

-- Explicitly restrict access to the backend service_role only (zero anon/public access)
CREATE POLICY "Service role full access on users" ON users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on user_profiles" ON user_profiles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on user_settings" ON user_settings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on user_identifiers" ON user_identifiers
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on user_devices" ON user_devices
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on contacts" ON contacts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on connections" ON connections
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on conversations" ON conversations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on conversation_members" ON conversation_members
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on messages" ON messages
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on message_attachments" ON message_attachments
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on message_receipts" ON message_receipts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on message_reactions" ON message_reactions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on statuses" ON statuses
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on status_views" ON status_views
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on status_reactions" ON status_reactions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on calls" ON calls
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on call_participants" ON call_participants
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on memory_spaces" ON memory_spaces
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on memory_members" ON memory_members
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on memory_albums" ON memory_albums
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on memory_files" ON memory_files
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on encryption_keys" ON encryption_keys
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on blocked_users" ON blocked_users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on otp_verifications" ON otp_verifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on login_sessions" ON login_sessions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on security_events" ON security_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on terms_acceptance" ON terms_acceptance
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on notifications" ON notifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);
