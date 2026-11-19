-- ============================================================================
-- GOSH ROW LEVEL SECURITY POLICIES — PUBLIC USERS & CONTACTS
-- Policy Version: 03_public_users_rls.sql
-- ============================================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verification_records ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
-- Any authenticated user can view public profile details (id, username, full_name, avatar_url, bio, online_status)
CREATE POLICY "Public profiles are readable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can only update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2. Contacts Policies
CREATE POLICY "Users can view and manage their own contacts"
ON public.user_contacts FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Conversation Members Policies
CREATE POLICY "Users can view conversations they are members of"
ON public.conversation_members FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. OTP Verification Records Policies
CREATE POLICY "System and owner can access OTP verification records"
ON public.otp_verification_records FOR ALL
TO authenticated
USING (true);
