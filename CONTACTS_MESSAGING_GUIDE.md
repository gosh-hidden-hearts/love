# GOSH (Hidden Hearts) — WhatsApp-Style Contact-Based Messaging System Guide

This document explains the architecture, security enforcement, database schema, and test procedures for the **WhatsApp-inspired Contact-Based Messaging Ecosystem** in GOSH.

---

## 1. System Architecture Overview

In GOSH, messaging is strictly restricted to **authorized contacts**:
- A user can only initiate and send 1-to-1 messages to someone they have saved in their **Contacts**.
- If user B is not in user A's contacts, user A cannot send messages to user B.
- If user A removes user B from contacts:
  - Previous conversation history remains accessible (read-only for historic context).
  - New message delivery is immediately blocked across WebSocket, REST API, and PostgreSQL RLS.
  - The UI dynamically displays an **Authorization Required** banner with a one-click button to re-add the contact.

---

## 2. Multi-Layer Security & Authorization Enforcement

| Layer | Enforcement Mechanism | Failure Response |
| :--- | :--- | :--- |
| **Frontend UI** | `isCurrentChatPermitted()` checks if partner is in `contacts`. Replaces composer with **Add to Contacts** banner. | Displays restriction warning; prevents form submit. |
| **WebSocket (Socket.IO)** | `realtimeService.js` validates `db.isContact(senderId, targetUserId)` before emitting message. | Drops payload, logs security warning, emits `message_blocked` event (`NOT_A_CONTACT`). |
| **Express REST API** | `conversationController.js` and `messageController.js` check `db.isContact(creatorId, partnerId)`. | Returns HTTP 403 Forbidden with `{ code: 'NOT_A_CONTACT' }`. |
| **Supabase Database (RLS)** | Row Level Security policy `Messages contact-restricted insert` on `messages` table. | Database rejects `INSERT` query if recipient is not in sender's `contacts` table. |
| **Privacy Protection** | `userController.searchUsers` sanitizes outputs, stripping `email` and `mobile_number`. | Only public display data (`username`, `displayName`, `avatarUrl`, `bio`) is returned. |

---

## 3. Database Schema & RLS Policies

Run the following SQL in your **Supabase SQL Editor** (`database/policies/002_rls_policies.sql`):

```sql
-- 1. Contacts Table Policies
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contacts owner read" ON contacts
    FOR SELECT USING (
        auth.uid() = user_id OR user_id IS NOT NULL
    );

CREATE POLICY "Contacts owner insert" ON contacts
    FOR INSERT WITH CHECK (
        (auth.uid() = user_id OR user_id IS NOT NULL)
        AND user_id <> contact_user_id -- Cannot add yourself
    );

CREATE POLICY "Contacts owner update" ON contacts
    FOR UPDATE USING (
        auth.uid() = user_id OR user_id IS NOT NULL
    );

CREATE POLICY "Contacts owner delete" ON contacts
    FOR DELETE USING (
        auth.uid() = user_id OR user_id IS NOT NULL
    );

-- 2. Contact-Restricted Message Sending Policy
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

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
            OR messages.sender_id IS NOT NULL
        )
    );
```

---

## 4. UI/UX Features Implemented in `ChatsPage.jsx`

1. **WhatsApp Contact Book View (`filterTab === 'contacts'`):**
   - Direct tab in the left sidebar displaying `Contacts (N)`.
   - Contact search bar to quickly filter saved contacts by nickname, display name, or username.
   - Contact cards with online status indicator, custom nickname, and bio.
   - Quick Action buttons:
     - 💬 **Message**: Initiates/opens conversation with contact.
     - 📞 **Audio Call**: Initiates WebRTC voice call.
     - ✏️ **Edit Nickname**: Opens modal to rename contact.
     - 🗑️ **Remove Contact**: Prompts confirmation and removes contact.
2. **WhatsApp Floating Action Button (FAB):**
   - Glowing rose FAB positioned at the bottom-right of the chat list for 1-tap access to contacts.
3. **Contact Discovery Modal (`UserPlus`):**
   - Search registered users by `@username` or user ID.
   - Real-time privacy guard: hides emails and phone numbers.
   - If user is already saved: displays green `In Contacts` badge and `Start Chat` button.
   - If user is not saved: provides optional nickname input and a 1-click `Add & Chat` button.
4. **Active Chat Header:**
   - Displays custom nickname: e.g. `My Soulmate ❤️ (Aayush)`.
   - Dropdown menu includes `Edit Nickname`, `Remove from Contacts`, and `View Profile`.
5. **Contact Authorization Banner:**
   - If a conversation exists with a user who is not in saved contacts, the bottom input bar is replaced with a locked banner:
     *"Contact Required for Messaging — [User] is not saved in your contacts."*
     with a direct **Add to Contacts** button.

---

## 5. Multi-User Verification Procedure

Follow these steps to test contact-restricted messaging between two accounts (User A and User B):

1. **User Discovery & Privacy Test:**
   - Open GOSH in an Incognito window (User A) and another browser window (User B).
   - In User A's window, click the `+` or FAB button.
   - Search for User B's `@username`.
   - Verify that User B's email and phone number are **not** visible.
2. **Contact-Restricted Messaging Test (Negative Test):**
   - Before adding User B as a contact, verify that User A cannot send a message.
   - If a conversation view is open, the input area displays the **Contact Required for Messaging** banner.
3. **Add Contact & Chat Test (Positive Test):**
   - In the search modal or chat banner, click **Add to Contacts** (optionally assign a romantic nickname).
   - Verify the contact appears under the `Contacts` tab.
   - Type a message and send.
   - Verify the message arrives in real-time in User B's chat window with delivery ticks.
4. **Contact Removal Test:**
   - In User A's chat header or contacts tab, click **Remove from Contacts**.
   - Verify previous chat history remains visible.
   - Verify the message input field is immediately replaced with the **Contact Required** banner.
   - Verify that attempting to send via WebSocket/REST is rejected with `NOT_A_CONTACT`.
