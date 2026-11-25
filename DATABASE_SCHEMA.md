# GOSH (Hidden Hearts) — Database Schema & Data Models

---

## 1. Overview

GOSH utilizes **PostgreSQL** hosted on **Supabase** with **Row Level Security (RLS)**, combined with a high-speed transactional JSON failover store (`backend/data/store.json`).

---

## 2. Table Definitions

### 2.1 Users (`users`)
Stores primary user account records.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / TEXT | PRIMARY KEY | Unique user identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Account email address |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | Unique romantic handle |
| `mobile_number` | VARCHAR(20) | UNIQUE | Phone number for OTP login |
| `password_hash` | TEXT | NULLABLE | Salted hash (Firebase/Bcrypt) |
| `is_verified` | BOOLEAN | DEFAULT FALSE | Email/Phone verification status |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last profile modification |

---

### 2.2 User Profiles (`user_profiles`)
Stores romantic social and display metadata.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / TEXT | PRIMARY KEY | Profile record ID |
| `user_id` | UUID / TEXT | REFERENCES users(id) ON DELETE CASCADE | Associated user account |
| `display_name` | VARCHAR(100) | NOT NULL | Public display name |
| `avatar_url` | TEXT | NULLABLE | Profile picture URL |
| `bio` | TEXT | NULLABLE | Romantic love bio |
| `relationship_status` | VARCHAR(50) | DEFAULT 'In a soul bond' | Relationship status string |
| `anniversary_date` | DATE | NULLABLE | Couple anniversary date |
| `online_status` | BOOLEAN | DEFAULT FALSE | Current presence indicator |
| `last_seen` | TIMESTAMPTZ | NULLABLE | Timestamp of last activity |

---

### 2.3 User Settings (`user_settings`)
Stores user privacy and notification configurations.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / TEXT | PRIMARY KEY | Settings ID |
| `user_id` | UUID / TEXT | REFERENCES users(id) ON DELETE CASCADE | Target user |
| `theme` | VARCHAR(30) | DEFAULT 'romantic-dark' | Selected visual theme |
| `sound_enabled` | BOOLEAN | DEFAULT TRUE | Message sound chimes |
| `notifications_enabled` | BOOLEAN | DEFAULT TRUE | Push/In-app notifications |
| `call_ringtone_enabled` | BOOLEAN | DEFAULT TRUE | Incoming call ringtones |
| `last_seen_privacy` | VARCHAR(20) | DEFAULT 'everyone' | 'everyone' \| 'contacts' \| 'nobody' |
| `profile_photo_privacy` | VARCHAR(20) | DEFAULT 'everyone' | Profile photo visibility |
| `about_privacy` | VARCHAR(20) | DEFAULT 'everyone' | Bio visibility |
| `status_privacy` | VARCHAR(20) | DEFAULT 'contacts' | 'contacts' \| 'partner_only' \| 'everyone' |
| `read_receipts` | BOOLEAN | DEFAULT TRUE | Blue tick delivery receipts |
| `passcode_hash` | VARCHAR(128) | NULLABLE | SHA-256 hash of 4-digit PIN |

---

### 2.4 End-to-End Encryption Keys (`encryption_keys`)
Stores public cryptographic keys for peer-to-peer key agreement.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / TEXT | PRIMARY KEY | Key record ID |
| `user_id` | UUID / TEXT | UNIQUE, REFERENCES users(id) | Key owner |
| `public_key` | JSONB / TEXT | NOT NULL | Exported ECDH P-256 public key (JWK) |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Key registration timestamp |

---

### 2.5 Contacts (`contacts`)
Stores user connection relationships.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / TEXT | PRIMARY KEY | Contact record ID |
| `user_id` | UUID / TEXT | REFERENCES users(id) ON DELETE CASCADE | Owner of the contact list |
| `contact_user_id` | UUID / TEXT | REFERENCES users(id) ON DELETE CASCADE | Connected partner / contact |
| `nickname` | VARCHAR(100) | NULLABLE | Custom intimate nickname |
| `is_favorite` | BOOLEAN | DEFAULT FALSE | Soul bond / starred contact |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Connection timestamp |

---

### 2.6 Blocked Users (`blocked_users`)
Stores privacy blocking relationships.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / TEXT | PRIMARY KEY | Record ID |
| `user_id` | UUID / TEXT | REFERENCES users(id) ON DELETE CASCADE | Blocking user |
| `blocked_user_id` | UUID / TEXT | REFERENCES users(id) ON DELETE CASCADE | Blocked user |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Block timestamp |

---

### 2.7 Conversations (`conversations`)
Stores 1-to-1 and group conversation headers.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / TEXT | PRIMARY KEY | Conversation ID |
| `title` | VARCHAR(100) | NULLABLE | Group title (if group chat) |
| `description` | TEXT | NULLABLE | Group description |
| `group_avatar` | TEXT | NULLABLE | Group photo URL |
| `is_group` | BOOLEAN | DEFAULT FALSE | Flag distinguishing groups |
| `created_by` | UUID / TEXT | REFERENCES users(id) | Creator / Group Admin |
| `last_message_text`| TEXT | NULLABLE | Summary of latest message |
| `last_message_at` | TIMESTAMPTZ | DEFAULT NOW() | Timestamp of latest activity |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

---

### 2.8 Conversation Members (`conversation_members`)
Associates participants with conversations.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / TEXT | PRIMARY KEY | Membership ID |
| `conversation_id` | UUID / TEXT | REFERENCES conversations(id) | Associated conversation |
| `user_id` | UUID / TEXT | REFERENCES users(id) | Member user |
| `role` | VARCHAR(20) | DEFAULT 'member' | 'admin' \| 'member' |
| `joined_at` | TIMESTAMPTZ | DEFAULT NOW() | Join timestamp |

---

### 2.9 Messages (`messages`)
Stores message records and E2EE encrypted payloads.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / TEXT | PRIMARY KEY | Message ID |
| `conversation_id` | UUID / TEXT | REFERENCES conversations(id) | Associated chat |
| `sender_id` | UUID / TEXT | REFERENCES users(id) | Sender |
| `reply_to_id` | UUID / TEXT | NULLABLE | Quoted parent message ID |
| `message_type` | VARCHAR(20) | DEFAULT 'text' | 'text' \| 'image' \| 'video' \| 'audio' \| 'document' |
| `content` | TEXT | NULLABLE | Plaintext or E2EE AES-GCM ciphertext |
| `media_url` | TEXT | NULLABLE | Persistent upload URL |
| `duration_seconds`| INTEGER | DEFAULT 0 | Audio duration (for voice notes) |
| `delivery_status` | VARCHAR(20) | DEFAULT 'sent' | 'sent' \| 'delivered' \| 'read' |
| `is_encrypted` | BOOLEAN | DEFAULT FALSE | Flag indicating E2EE ciphertext |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Timestamp of delivery |

---

### 2.10 Status Updates (`statuses`)
Stores 24-hour ephemeral romantic glimpses.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / TEXT | PRIMARY KEY | Status ID |
| `user_id` | UUID / TEXT | REFERENCES users(id) | Author |
| `type` | VARCHAR(20) | DEFAULT 'text' | 'text' \| 'media' |
| `content` | TEXT | NULLABLE | Soul quote or message text |
| `gradient` | VARCHAR(100) | NULLABLE | Tailwind gradient class |
| `media_url` | TEXT | NULLABLE | Photo / video URL |
| `caption` | TEXT | NULLABLE | Photo caption |
| `privacy` | VARCHAR(20) | DEFAULT 'contacts' | 'contacts' \| 'partner_only' \| 'everyone' |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Publication timestamp |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Automatic expiration timestamp (Now + 24h) |

---

### 2.11 Status Views (`status_views`)
Tracks viewers of status updates.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / TEXT | PRIMARY KEY | View record ID |
| `status_id` | UUID / TEXT | REFERENCES statuses(id) ON DELETE CASCADE | Viewed status |
| `viewer_id` | UUID / TEXT | REFERENCES users(id) | Viewer user ID |
| `viewed_at` | TIMESTAMPTZ | DEFAULT NOW() | View timestamp |

---

### 2.12 Memory Files (`memory_files`)
Stores metadata for files hosted on MEGA Cloud Storage.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / TEXT | PRIMARY KEY | Memory ID |
| `uploader_id` | UUID / TEXT | REFERENCES users(id) | Uploading partner |
| `file_name` | VARCHAR(255) | NOT NULL | Original filename |
| `file_type` | VARCHAR(20) | NOT NULL | 'photo' \| 'video' \| 'audio' \| 'document' |
| `file_size` | BIGINT | NOT NULL | File size in bytes |
| `mime_type` | VARCHAR(100) | NOT NULL | MIME content type |
| `mega_file_handle`| VARCHAR(100) | NOT NULL | MEGA storage node ID |
| `mega_download_url`| TEXT | NOT NULL | Direct / public MEGA stream URL |
| `caption` | TEXT | NULLABLE | Romantic caption |
| `memory_date` | DATE | NOT NULL | Date of memory |
| `feelings_tag` | VARCHAR(50) | NOT NULL | Intimate feeling tag |
| `album` | VARCHAR(100) | DEFAULT 'All Memories' | Target album collection |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Upload timestamp |

---

### 2.13 Calls (`calls`)
Logs WebRTC peer-to-peer audio and video calls.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / TEXT | PRIMARY KEY | Call record ID |
| `caller_id` | UUID / TEXT | REFERENCES users(id) | Initiator |
| `receiver_id` | UUID / TEXT | REFERENCES users(id) | Recipient |
| `call_type` | VARCHAR(20) | NOT NULL | 'audio' \| 'video' |
| `call_status` | VARCHAR(20) | NOT NULL | 'ended' \| 'missed' \| 'rejected' |
| `duration_seconds`| INTEGER | DEFAULT 0 | Call duration in seconds |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Call initiation timestamp |

---

## 3. Row Level Security (RLS) Policies

All tables in production Supabase enforce RLS to ensure private access:
- **Messages**: `auth.uid() = sender_id OR auth.uid() IN (SELECT user_id FROM conversation_members WHERE conversation_id = messages.conversation_id)`
- **Contacts**: `auth.uid() = user_id`
- **Settings**: `auth.uid() = user_id`
- **Memory Files**: `auth.uid() = uploader_id OR auth.uid() IN (SELECT contact_user_id FROM contacts WHERE user_id = memory_files.uploader_id)`
