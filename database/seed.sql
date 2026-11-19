-- ============================================================================
-- GOSH INITIAL SEED DATA
-- Version: seed.sql
-- Description: Pre-provisions the 2 authorized users, default folders, and initial rooms
-- ============================================================================

-- 1. Pre-provision the two authorized user identities
INSERT INTO public.authorized_users (id, email, display_name, role)
VALUES 
    ('u1-auth-0000-0000-000000000001', 'prasanthgokul736@gmail.com', 'Gokul', 'owner'),
    ('u2-auth-0000-0000-000000000002', 'sharanyasiva4@gmail.com', 'Sharanya', 'owner')
ON CONFLICT (email) DO UPDATE 
SET display_name = EXCLUDED.display_name, last_seen = timezone('utc', now());

-- 2. Create Default Shared Conversation Room
INSERT INTO public.conversations (id, title, is_direct)
VALUES 
    ('c1-room-0000-0000-000000000001', 'GOSH Secure Room', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Create Default Cloud Storage Folders
INSERT INTO public.folders (id, name, color, created_by)
VALUES 
    ('f1-fold-0000-0000-000000000001', 'Documents', '#8b5cf6', 'u1-auth-0000-0000-000000000001'),
    ('f2-fold-0000-0000-000000000002', 'Photo Albums', '#38bdf8', 'u1-auth-0000-0000-000000000001'),
    ('f3-fold-0000-0000-000000000003', 'Encrypted Backups', '#f5e0b7', 'u1-auth-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 4. Create Default Music Playlists
INSERT INTO public.music_playlists (id, name, description, created_by)
VALUES 
    ('p1-play-0000-0000-000000000001', 'Our Favorites', 'Curated shared music library', 'u1-auth-0000-0000-000000000001'),
    ('p2-play-0000-0000-000000000002', 'Travel & Roadtrip', 'Songs for upcoming trips and road adventures', 'u2-auth-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- 5. Record System Initialization Security Audit Event
INSERT INTO public.security_events (event_type, severity, details)
VALUES 
    ('SYSTEM_DATABASE_INITIALIZED', 'INFO', '{"status": "active", "version": "1.0.0", "rls_enabled": true}'::jsonb);
