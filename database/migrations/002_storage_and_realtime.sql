-- =========================================================================
-- GOSH (Glimpse Of Soul Hearts) — Supabase Storage Bucket & Policies
-- Preserves all existing tables, schemas, and records.
-- Run this in Supabase SQL Editor after 001_initial_schema.sql and 002_rls_policies.sql:
-- https://supabase.com/dashboard/project/azwclorwxrzgofmribms/sql/new
-- =========================================================================

-- Create private media bucket for chat attachments, statuses, and Memory Vault
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gosh-media',
  'gosh-media',
  false,
  52428800, -- 50 MB per file (Supabase Free tier limit)
  ARRAY[
    'image/*',
    'video/*',
    'audio/*',
    'application/pdf',
    'text/plain',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Ensure RLS is enabled on storage.objects (already enabled by default in Supabase)
DROP POLICY IF EXISTS "Service role full access on gosh-media" ON storage.objects;
CREATE POLICY "Service role full access on gosh-media"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'gosh-media')
WITH CHECK (bucket_id = 'gosh-media');
