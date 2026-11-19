# GOSH — DATABASE SCHEMA & RLS SPECIFICATION
**Engine:** Supabase PostgreSQL (v15+)  
**Security Model:** 100% Enforced Row Level Security (RLS)

---

## 1. Schema Overview

The database contains 21 normalized relational tables divided into 5 functional domains:

### Domain 1: Identity & Security
- `authorized_users`: Whitelisted user profiles.
- `user_devices`: Registered hardware devices, platforms, push tokens.
- `user_sessions`: Active login sessions, expiration timestamps, revocation flags.
- `security_events`: Audit trail for login, key rotation, device additions.

### Domain 2: Communication
- `conversations`: Primary shared room container.
- `messages`: E2EE chat messages, attachments, reaction pointers, disappearing TTL.
- `message_reactions`: Emoji reaction records.
- `call_history`: Audio/video call timestamps, duration, quality metrics.

### Domain 3: Storage & Files
- `folders`: Hierarchical folder structure for cloud storage.
- `files`: File metadata, MIME types, file sizes, MEGA storage node references.
- `documents`: Document category classification, confidential flags.

### Domain 4: Vault & Cryptography
- `vault_items`: AES-256-GCM encrypted passwords, notes, card data.
- `recovery_records`: Encrypted emergency key packages, version markers.

### Domain 5: Memories, Diary, Together & Music
- `memories`: Photo/video memory records, dates, tags, album foreign keys.
- `memory_albums`: Curated albums and covers.
- `diary_entries`: Encrypted daily journal entries, mood tags.
- `calendar_events`: Events, birthdays, reminders, travel dates.
- `shared_tasks`: Collaborative to-do checklists.
- `shared_expenses`: Expense records, split status, currency.
- `music_playlists`: Playlists and categories.
- `music_items`: Legitimate audio links (YouTube, Spotify, SoundCloud).

---

## 2. Row Level Security (RLS) Philosophy

Every table enables RLS:
```sql
ALTER TABLE authorized_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
-- (All 21 tables)
```

Access policy:
```sql
CREATE POLICY "Authorized users have full shared access"
ON public.messages
FOR ALL
TO authenticated
USING (
  auth.uid() IN (SELECT id FROM public.authorized_users)
);
```

No anonymous user, no unauthenticated user, and no unauthorized account can read or write any record in any table.
