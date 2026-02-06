# SRH Campus Hub

A mobile-optimized navigation hub for quick access to SRH University resources. Built with accessibility and one-handed mobile use in mind.

## Features

✅ **Thumb-Zone Optimized** - All interactive elements positioned for easy one-handed use  
✅ **WCAG 2.2 Level AA Compliant** - Fully accessible with screen readers and keyboard navigation  
✅ **SRH Branded** - Official SRH University color palette (#D44407 orange)  
✅ **Progressive Web App** - Install on your phone for app-like experience  
✅ **Dark Mode Support** - Automatic theme switching  
✅ **Fast & Lightweight** - Built with SvelteKit for optimal performance  

## Quick Links

- 🎓 CampusWeb Portal
- 📚 Moodle
- 📖 Library
- 📧 SRH Email
- 📅 Academic Calendar
- 💻 IT Support
- 🗺️ Campus Map
- 🛠️ Student Services

## Installation

### Prerequisites

- Node.js 20+ (check with `node --version`)
- npm (comes with Node.js)

### Setup

1. **Fix npm cache permissions** (if needed):
   ```bash
   sudo chown -R $(whoami) ~/.npm
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to `http://localhost:5173`

## Deployment to Cloudflare Pages

### 1. Create Cloudflare D1 Database

```bash
npx wrangler d1 create srh-campus-hub-db
```

Copy the database ID and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "srh-campus-hub-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

### 2. Create Cloudflare KV Namespace (Optional)

```bash
npx wrangler kv:namespace create CACHE
```

Update `wrangler.toml` with the KV namespace ID.

### 3. Build for Production

```bash
npm run build
```

### 4. Deploy to Cloudflare Pages

```bash
npx wrangler pages deploy build
```

> **Note:** We are using `adapter-static` for the frontend MVP to ensure fast, reliable deployment. The database bindings in `wrangler.toml` are currently commented out until backend API development begins.

## Project Structure

```
srh-campus-hub/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte          # App shell with bottom nav
│   │   ├── +page.svelte            # Home page with links
│   │   ├── favorites/
│   │   │   └── +page.svelte        # Favorites page
│   │   ├── search/
│   │   │   └── +page.svelte        # Search page
│   │   └── profile/
│   │       └── +page.svelte        # Profile page
│   ├── lib/
│   │   └── components/
│   │       ├── BottomNav.svelte    # Bottom navigation
│   │       └── LinkCard.svelte     # Link card component
│   ├── app.css                     # Global styles
│   └── app.html                    # HTML template
├── static/
│   ├── manifest.json               # PWA manifest
│   ├── icon-192.png                # App icon (light mode)
│   ├── icon-512.png                # App icon (light mode)
│   └── favicon.png                 # Favicon
├── wrangler.toml                   # Cloudflare config
├── svelte.config.js                # SvelteKit config
└── package.json
```

## Tech Stack

- **Framework**: SvelteKit 2.x
- **Hosting**: Cloudflare Pages
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Styling**: Vanilla CSS with CSS Variables
- **PWA**: Service Workers (coming soon)

## Color Palette (SRH University)

| Color | HEX | Usage |
|-------|-----|-------|
| SRH Orange | `#D44407` | Primary brand color |
| Orange Light | `#F28C3E` | Hover states, accents |
| Orange Dark | `#A33005` | Active states |
| Copper | `#B7410E` | Secondary accents |
| Cream | `#F5F0E6` | Backgrounds (light mode) |
| Grey | `#E8E8E8` | Borders, dividers |

## Accessibility Features

- ✅ WCAG 2.2 Level AA compliant
- ✅ Minimum 48x48px touch targets
- ✅ 4.5:1 contrast ratios
- ✅ Keyboard navigation support
- ✅ Screen reader optimized
- ✅ Focus indicators
- ✅ Skip to main content link

## Development Roadmap

### Phase 1: MVP (Current) ✅
- [x] Project setup
- [x] SRH branding and color palette
- [x] Thumb-zone optimized layout
- [x] Bottom navigation
- [x] Link cards with favorites
- [x] All main pages (Home, Favorites, Search, Profile)

### Phase 2: Database & API (Next)
- [ ] D1 database schema
- [ ] Seed SRH links
- [ ] Favorites API endpoints
- [ ] Search functionality

### Phase 3: Authentication
- [ ] Email/password auth
- [ ] JWT session management
- [ ] User preferences

### Phase 4: PWA & Offline
- [ ] Service worker
- [ ] Offline support
- [ ] Install prompts

### Phase 5: Testing & Launch
- [ ] Accessibility audit
- [ ] Performance testing
- [ ] Production deployment

## License

MIT

## Support

For issues or questions, contact IT Support at SRH University.

---

**Built with ❤️ for SRH University students**
