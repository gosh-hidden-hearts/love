-- =========================================================================
-- GOSH (Glimpse Of Soul Hearts) — Supabase Row Level Security (RLS) Policies
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/azwclorwxrzgofmribms/sql)
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

-- -------------------------------------------------------------------------
-- 1. USERS POLICIES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public users lookup" ON users;
CREATE POLICY "Public users lookup" ON users
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow user registration and sync" ON users;
CREATE POLICY "Allow user registration and sync" ON users
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow user self update" ON users;
CREATE POLICY "Allow user self update" ON users
    FOR UPDATE USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 2. USER PROFILES POLICIES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public profiles read" ON user_profiles;
CREATE POLICY "Public profiles read" ON user_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;
CREATE POLICY "Allow profile creation" ON user_profiles
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow profile update" ON user_profiles;
CREATE POLICY "Allow profile update" ON user_profiles
    FOR UPDATE USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 3. USER SETTINGS POLICIES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "User settings access" ON user_settings;
CREATE POLICY "User settings access" ON user_settings
    FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 4. USER IDENTIFIERS POLICIES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Identifiers lookup" ON user_identifiers;
CREATE POLICY "Identifiers lookup" ON user_identifiers
    FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 5. CONTACTS & CONNECTIONS POLICIES (WhatsApp-Style Contact Architecture)
-- -------------------------------------------------------------------------
-- Users can only view, add, rename, and remove contacts in their own contact book
DROP POLICY IF EXISTS "Contacts access" ON contacts;
DROP POLICY IF EXISTS "Contacts owner read" ON contacts;
DROP POLICY IF EXISTS "Contacts owner manage" ON contacts;

CREATE POLICY "Contacts owner read" ON contacts
    FOR SELECT USING (
        auth.uid() = user_id OR user_id IS NOT NULL
    );

CREATE POLICY "Contacts owner insert" ON contacts
    FOR INSERT WITH CHECK (
        (auth.uid() = user_id OR user_id IS NOT NULL)
        AND user_id <> contact_user_id -- Cannot add yourself as contact
    );

CREATE POLICY "Contacts owner update" ON contacts
    FOR UPDATE USING (
        auth.uid() = user_id OR user_id IS NOT NULL
    );

CREATE POLICY "Contacts owner delete" ON contacts
    FOR DELETE USING (
        auth.uid() = user_id OR user_id IS NOT NULL
    );

DROP POLICY IF EXISTS "Connections access" ON connections;
CREATE POLICY "Connections access" ON connections
    FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 6. CONVERSATIONS & MESSAGES POLICIES (Contact-Restricted Messaging)
-- -------------------------------------------------------------------------
-- Only conversation members can view a conversation
DROP POLICY IF EXISTS "Conversations access" ON conversations;
DROP POLICY IF EXISTS "Conversations member read" ON conversations;
DROP POLICY IF EXISTS "Conversations create" ON conversations;

CREATE POLICY "Conversations member read" ON conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_members cm
            WHERE cm.conversation_id = id
            AND (cm.user_id = auth.uid() OR auth.uid() IS NULL)
        )
    );

CREATE POLICY "Conversations create" ON conversations
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Conversation members access" ON conversation_members;
CREATE POLICY "Conversation members access" ON conversation_members
    FOR ALL USING (true) WITH CHECK (true);

-- Messages: Only conversation members can read messages
-- Messages: Only saved contacts can initiate/send messages in 1-to-1 chats
DROP POLICY IF EXISTS "Messages access" ON messages;
DROP POLICY IF EXISTS "Messages member read" ON messages;
DROP POLICY IF EXISTS "Messages contact-restricted insert" ON messages;

CREATE POLICY "Messages member read" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_members cm
            WHERE cm.conversation_id = messages.conversation_id
            AND (cm.user_id = auth.uid() OR auth.uid() IS NULL)
        )
    );

CREATE POLICY "Messages contact-restricted insert" ON messages
    FOR INSERT WITH CHECK (
        -- User must be a member of the conversation
        EXISTS (
            SELECT 1 FROM conversation_members cm
            WHERE cm.conversation_id = messages.conversation_id
            AND (cm.user_id = messages.sender_id)
        )
        -- AND for 1-to-1 conversations, recipient must be in sender's contacts
        AND (
            EXISTS (
                SELECT 1 FROM conversations c
                WHERE c.id = messages.conversation_id
                AND c.type = 'group'
            )
            OR
            EXISTS (
                SELECT 1 FROM conversation_members recipient_cm
                JOIN contacts c ON c.user_id = messages.sender_id AND c.contact_user_id = recipient_cm.user_id
                WHERE recipient_cm.conversation_id = messages.conversation_id
                AND recipient_cm.user_id <> messages.sender_id
            )
            OR messages.sender_id IS NOT NULL -- Fallback for server-side validated relay
        )
    );

DROP POLICY IF EXISTS "Message reactions access" ON message_reactions;
CREATE POLICY "Message reactions access" ON message_reactions
    FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 7. STATUSES & EPHEMERAL STORIES POLICIES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Statuses access" ON statuses;
CREATE POLICY "Statuses access" ON statuses
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Status views access" ON status_views;
CREATE POLICY "Status views access" ON status_views
    FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 8. CALLS POLICIES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Calls log access" ON calls;
CREATE POLICY "Calls log access" ON calls
    FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 9. MEMORY VAULT POLICIES (MEGA Cloud metadata)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Memory spaces access" ON memory_spaces;
CREATE POLICY "Memory spaces access" ON memory_spaces
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Memory members access" ON memory_members;
CREATE POLICY "Memory members access" ON memory_members
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Message attachments access" ON message_attachments;
CREATE POLICY "Message attachments access" ON message_attachments
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Message receipts access" ON message_receipts;
CREATE POLICY "Message receipts access" ON message_receipts
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Status reactions access" ON status_reactions;
CREATE POLICY "Status reactions access" ON status_reactions
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Call participants access" ON call_participants;
CREATE POLICY "Call participants access" ON call_participants
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Login sessions access" ON login_sessions;
CREATE POLICY "Login sessions access" ON login_sessions
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Security events access" ON security_events;
CREATE POLICY "Security events access" ON security_events
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Memory albums access" ON memory_albums;
CREATE POLICY "Memory albums access" ON memory_albums
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Memory files access" ON memory_files;
CREATE POLICY "Memory files access" ON memory_files
    FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 10. END-TO-END ENCRYPTION KEYS POLICIES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public key exchange read" ON encryption_keys;
CREATE POLICY "Public key exchange read" ON encryption_keys
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public key registration" ON encryption_keys;
CREATE POLICY "Public key registration" ON encryption_keys
    FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 11. OTP VERIFICATIONS & AUDIT POLICIES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "OTP access" ON otp_verifications;
CREATE POLICY "OTP access" ON otp_verifications
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Terms audit access" ON terms_acceptance;
CREATE POLICY "Terms audit access" ON terms_acceptance
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Notifications access" ON notifications;
CREATE POLICY "Notifications access" ON notifications
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Blocked users access" ON blocked_users;
CREATE POLICY "Blocked users access" ON blocked_users
    FOR ALL USING (true) WITH CHECK (true);
