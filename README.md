<p align="center">
  <img src="static/assets/logo.png" width="200" alt="CampusWeb Logo">
</p>

<h1 align="center">CampusWeb</h1>

<p align="center">
  <strong>An unofficial, privacy-focused university portal template.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Unofficial-red?style=for-the-badge" alt="Unofficial Project">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" alt="License"></a>
  <br>
  <img src="https://img.shields.io/badge/SvelteKit-FF3E00?style=for-the-badge&logo=svelte&logoColor=white" alt="SvelteKit">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=Cloudflare&logoColor=white" alt="Cloudflare">
  <br>
  <img src="https://img.shields.io/badge/AI%20Agent-Assisted-111827?style=for-the-badge&logo=openai&logoColor=white" alt="AI Agent Assisted">
  <img src="https://img.shields.io/badge/Vibe%20Coded-CampusWeb-7C3AED?style=for-the-badge" alt="Vibe Coded">
  <br>
  <img src="https://img.shields.io/badge/Email%20Verification-Zero--Knowledge%20%26%20Secure-059669?style=for-the-badge" alt="Zero-Knowledge Secure Email Verification">
</p>

---

CampusWeb is a modern Progressive Web App (PWA) for university communities. It combines a calendar workspace, campus stories, public and verified-only directories, curated links, and lightweight contribution workflows into a single mobile-first interface.

## 🚀 Key Features

- 📱 **Mobile-First PWA** — Installable on iOS/Android with full offline support.
- 📅 **Smart Calendar** — Combines public holidays, personal iCal feeds, and verified-only academic calendars.
- 📰 **Campus Stories** — Student-submitted stories reviewed and published through Telegram moderation.
- 🔍 **Directory Access** — Public contacts stay open, while university-only directories are protected by institutional email verification.
- ⭐ **Favorite Links** — Pin, search, edit, and reorder your most-used resources locally on your device.
- 🤝 **Club Suggestions** — Students can suggest clubs, upload custom logos, and receive email status updates.
- 📊 **Anonymous Link Stats** — Aggregate link popularity is counted without fingerprints, profiles, or user-level logs.
- 🌙 **Adaptive Design** — Dark mode, accessibility preferences, screen reader hints, and touch-friendly controls.
- 🔒 **Privacy-First Auth** — Stateless PIN verification with anonymous sessions and no stored user profiles.

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [SvelteKit 2.x](https://kit.svelte.dev/) + TypeScript |
| **State Management** | Svelte Stores (Persistent LocalStorage) |
| **Styling** | Vanilla CSS (Modern CSS Variables & Grid) |
| **Infrastructure** | [Cloudflare Pages](https://pages.cloudflare.com/) |
| **Serverless Storage** | Cloudflare KV + R2 |
| **Email** | Cloudflare Email Sending REST API |
| **Moderation** | Telegram Bot API |
| **Calendar Engine** | [@event-calendar](https://github.com/vkurko/calendar) |
| **PWA Engine** | Custom Service Worker (Cache-first Strategy) |

## 📂 Project Structure

```bash
campusweb/
├── src/
│   ├── routes/             # SvelteKit App Router (Calendar, Feed, Search)
│   ├── lib/
│   │   ├── components/     # UI Design System
│   │   ├── server/         # Auth, email, stats, calendar helpers
│   │   ├── stores/         # Persistent state management
│   │   └── utils/          # iCal processing & link logic
│   └── service-worker.ts   # PWA Offline logic
├── static/                 # PWA Assets & Icons
└── wrangler.toml           # Cloudflare deployment config
```

## 🚥 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **npm** 10.x or higher

### Installation

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd campusweb
   npm install
   ```

2. **Configuration**
   ```bash
   cp wrangler.toml.example wrangler.toml
   ```

3. **Development**
   ```bash
   npm run dev
   ```

### Cloudflare Configuration

To enable authentication, moderation, email notifications, and storage, configure these variables in Cloudflare Pages:

| Variable | Description |
| :--- | :--- |
| `PRIVATE_TELEGRAM_BOT_TOKEN` | Your Telegram Bot token. |
| `PRIVATE_TELEGRAM_CHAT_ID` | Your personal or group Chat ID for admin notifications. |
| `PRIVATE_SITE_URL` | The public URL of your deployment. |
| `PRIVATE_AUTH_SECRET` | A strong random secret, at least 32 characters, for HMAC and anonymous sessions. |
| `PRIVATE_EMAIL_SENDER` | The verified sender address for Cloudflare Email Sending. |
| `PRIVATE_CLOUDFLARE_EMAIL_API_TOKEN` | API token for Cloudflare Email Sending. |
| `PRIVATE_OPENWEATHER_API_KEY` | API key used to fetch weather alerts for the home notifications bell. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID used by Email Sending. |
| `PRIVATE_VIRUSTOTAL_API_KEY` | (Optional) VirusTotal API key for automated link security scanning. |
| `PRIVATE_GOOGLE_SHEETS_URL` | (Optional) Google Sheets CSV source for external story content. |

**Required Bindings:**
- `STORIES_KV`: KV namespace for stories, clubs, moderation state, and aggregate stats.
- `IMAGES_BUCKET`: R2 bucket for uploaded story images.

**Operational Security:**
- Add a Cloudflare WAF/rate-limit rule for `POST /api/auth/verify-pin`, for example 5 attempts per 10 minutes per IP.
- Allowed institutional email domains are centralized in `src/lib/config/auth.ts`.

## 🔒 Privacy & Security

CampusWeb is built with a **Privacy-First** architecture:

- 🛡️ **No User Tracking**: No fingerprints, user profiles, or third-party telemetry.
- 📦 **Local Persistence**: All personal data (favorites, subscriptions) stays in your browser's `localStorage`.
- 📊 **Aggregate-Only Stats**: Link popularity is stored as anonymous counters by link ID and date.
- ✉️ **Stateless Email Auth**: PINs are verified with HMAC; the server does not store the PIN or email identity. `Zero-knowledge secure`
- 🍪 **Anonymous Sessions**: Verified sessions use an HTTP-only cookie with no email address in the token payload.
- ☁️ **Serverless Proxy**: Calendar URLs are processed through a privacy-aware serverless proxy.
- 📜 See [SECURITY.md](SECURITY.md) for detailed privacy documentation.

## 🤝 Contributing

Contributions are welcome. Whether it is adding new campus resources or improving the UI, please see [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**CampusWeb is an independent project.** It is **not** an official application of any university unless explicitly deployed and approved by that institution. All directory data is provided as-is for convenience and should be protected by email-verification guards. All trademarks and university resources belong to their respective owners.

---

<p align="center">
  Built for student communities.
</p>
