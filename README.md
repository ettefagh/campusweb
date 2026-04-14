# CampusWeb

A mobile-first progressive web app for quick access to SRH University resources. Built with SvelteKit and deployed on Cloudflare Pages.

## Features

- 📱 **Mobile-First PWA** — installable on any device with offline support
- 📅 **Integrated Calendar** — university events, exams, and personal iCal subscriptions with auto-naming and color coding
- 📰 **Campus News Feed** — Instagram embeds, news cards, and social media links
- 🔍 **Universal Search** — search across all university links and resources
- ⭐ **Custom Favorites** — pin your most-used links to the home screen
- 🌙 **Dark Mode** — automatic theme switching based on system preference
- ♿ **Accessible** — WCAG 2.2 Level AA compliant with 48px touch targets

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit 2.x + TypeScript |
| Styling | Vanilla CSS with custom properties |
| Calendar | @event-calendar (TimeGrid, DayGrid, List) |
| iCal Parsing | ical.js |
| Hosting | Cloudflare Pages |
| PWA | Service Worker with cache-first strategy |

## Project Structure

```
campusweb/
├── src/
│   ├── routes/
│   │   ├── +page.svelte            # Home — favorites & link grid
│   │   ├── calendar/+page.svelte   # Calendar with subscriptions
│   │   ├── feed/+page.svelte       # News, social, contacts
│   │   ├── explore/+page.svelte    # Browse all links by category
│   │   ├── search/+page.svelte     # Full-text search
│   │   └── viewer/+page.svelte     # Domain-restricted iframe viewer
│   ├── lib/
│   │   ├── components/             # BottomNav, LinkCard, SecureCalendarInput, UpdatePrompt
│   │   ├── data/links.ts           # Curated SRH link database
│   │   ├── stores/                 # Svelte stores (favorites, calendar subscriptions)
│   │   └── utils/icalParser.ts     # iCal parsing & calendar name extraction
│   ├── service-worker.ts           # Offline-first caching
│   ├── app.css                     # Design system & global styles
│   └── app.html                    # HTML shell
├── static/                         # Icons, manifest, favicon
├── wrangler.toml.example           # Cloudflare config template
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Install dependencies
npm install

# Copy the Cloudflare config template
cp wrangler.toml.example wrangler.toml

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Deploy to Cloudflare Pages

```bash
npm run deploy
```

This runs `vite build` and deploys via `wrangler pages deploy`.

## Calendar Subscriptions

CampusWeb integrates with the [Calendar Subscription Enhancer](https://github.com/ettefagh/calendar-subscription-enhancer) — an open-source Cloudflare Worker that:

- Adds GPS coordinates for campus navigation
- Cleans formatting and removes redundant data
- Encrypts calendar URLs with AES-GCM (zero-knowledge)

When users add an SRH iCal URL, CampusWeb automatically routes it through the enhancer for a better experience.

## Privacy

- **Zero analytics** — no tracking, cookies, or telemetry
- **Local-only storage** — favorites and calendar subscriptions stay in `localStorage`
- **No server-side data** — the app is a static PWA with no backend database
- See [SECURITY.md](SECURITY.md) for full details

## License

[MIT](LICENSE)

---

**Built with ❤️ for SRH University students**
