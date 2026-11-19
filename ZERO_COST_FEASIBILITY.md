# GOSH — ZERO-COST FEASIBILITY & LIMITATION REPORT

---

## 1. Verified Zero-Cost Services Audit

| Service | Tier | Quota Allocation | GOSH Target Usage (2 Users) | Margin / Feasibility |
|---|---|---|---|---|
| **GitHub Pages** | Free | 100 GB Bandwidth/mo | ~500 MB/mo (Static assets) | 99.5% Free Margin |
| **Firebase Auth** | Spark (Free) | 50,000 MAU | 2 Active Accounts | 99.99% Free Margin |
| **Supabase DB** | Free | 500 MB DB storage | ~25 MB (Metadata & text) | 95.0% Free Margin |
| **Supabase Realtime** | Free | 200 concurrent connections | 2–6 concurrent devices | 97.0% Free Margin |
| **Supabase Edge Functions** | Free | 500,000 invocations/mo | ~5,000 invocations/mo | 99.0% Free Margin |
| **MEGA Storage** | Free | 20 GB Permanent Storage | Dedicated private account | Genuinely Free 20GB |
| **Google STUN** | Free | Unlimited P2P | Calling & Screen Share | 100% Free |
| **Web Crypto API** | Free | Local Client Hardware | 100% On-device | Zero external cost |

---

## 2. Identified Limitations & Architectural Solutions

1. **SMS OTP Feasibility Limitation:**
   - *Issue:* Firebase SMS OTP requires billing enablement (Blaze plan) and incurs per-SMS carrier charges.
   - *Solution:* Implemented **Email OTP** (magic link or 6-digit email code), which is 100% free and has zero carrier restrictions.
2. **Static Web Server Secrets Limitation:**
   - *Issue:* GitHub Pages cannot hide server API secrets.
   - *Solution:* Routed MEGA credentials through a serverless Supabase Edge Function gateway.
3. **P2P NAT Traversal Limitation:**
   - *Issue:* Extreme symmetric NATs can occasionally block P2P UDP media streams.
   - *Solution:* Public STUN priority + zero-cost Metered.ca TURN fallback.
