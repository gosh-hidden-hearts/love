-- ============================================================================
-- GOSH ROW LEVEL SECURITY (RLS) POLICIES
-- Policy Version: 02_rls_policies.sql
-- Description: Enforces 100% zero-trust access control for the 2 authorized users
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENABLE RLS ON ALL 21 TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_items ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. HELPER FUNCTION: Verify if caller is an authorized GOSH owner
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_authorized_gosh_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.authorized_users 
    WHERE id = auth.uid() 
       OR email = current_setting('request.jwt.claims', true)::json->>'email'
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. PERMISSION POLICIES (Full Shared Access for the 2 Authorized Users)
-- ----------------------------------------------------------------------------

-- Authorized Users Table (Read own/peer profile, update own last_seen/avatar)
CREATE POLICY "Authorized users can view profiles"
ON public.authorized_users FOR SELECT
TO authenticated
USING (public.is_authorized_gosh_user());

CREATE POLICY "Authorized users can update own profile"
ON public.authorized_users FOR UPDATE
TO authenticated
USING (auth.uid() = id OR email = current_setting('request.jwt.claims', true)::json->>'email');

-- User Devices (Both users can inspect devices and revoke sessions)
CREATE POLICY "Authorized users have full device management access"
ON public.user_devices FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- User Sessions
CREATE POLICY "Authorized users can view and revoke sessions"
ON public.user_sessions FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Security Events
CREATE POLICY "Authorized users can view and append security events"
ON public.security_events FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Conversations
CREATE POLICY "Authorized users have full access to conversations"
ON public.conversations FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Messages
CREATE POLICY "Authorized users have full access to messages"
ON public.messages FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Message Reactions
CREATE POLICY "Authorized users have full access to reactions"
ON public.message_reactions FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Call History
CREATE POLICY "Authorized users have full access to call logs"
ON public.call_history FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Folders
CREATE POLICY "Authorized users have full access to folders"
ON public.folders FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Files
CREATE POLICY "Authorized users have full access to files"
ON public.files FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Documents
CREATE POLICY "Authorized users have full access to documents"
ON public.documents FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Vault Items (Passwords & Secure Notes)
CREATE POLICY "Authorized users have full access to vault items"
ON public.vault_items FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Recovery Records
CREATE POLICY "Authorized users have full access to recovery records"
ON public.recovery_records FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Memory Albums
CREATE POLICY "Authorized users have full access to albums"
ON public.memory_albums FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Memories
CREATE POLICY "Authorized users have full access to memories"
ON public.memories FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Diary Entries
CREATE POLICY "Authorized users have full access to diary"
ON public.diary_entries FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Calendar Events
CREATE POLICY "Authorized users have full access to calendar"
ON public.calendar_events FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Shared Tasks
CREATE POLICY "Authorized users have full access to tasks"
ON public.shared_tasks FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Shared Expenses
CREATE POLICY "Authorized users have full access to expenses"
ON public.shared_expenses FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Music Playlists
CREATE POLICY "Authorized users have full access to playlists"
ON public.music_playlists FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- Music Items
CREATE POLICY "Authorized users have full access to music items"
ON public.music_items FOR ALL
TO authenticated
USING (public.is_authorized_gosh_user())
WITH CHECK (public.is_authorized_gosh_user());

-- ----------------------------------------------------------------------------
-- 4. EXPLICIT DENIAL FOR ANONYMOUS CLIENTS
-- ----------------------------------------------------------------------------
-- Note: Anonymous role has zero granted permissions and zero matching RLS policies.
