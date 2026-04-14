# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| Latest  | ✅ Yes             |

## Privacy by Design

CampusWeb is designed with privacy as a core principle:

- **No analytics or telemetry** — zero tracking scripts
- **No server-side storage** — all user preferences (favorites, calendar subscriptions) are stored exclusively in browser `localStorage`
- **Calendar URLs are never logged** — subscription URLs stay on-device
- **Domain-restricted viewer** — the iframe viewer only loads whitelisted SRH domains

## Calendar Enhancer Integration

CampusWeb integrates with the [Calendar Subscription Enhancer](https://github.com/ettefagh/calendar-subscription-enhancer), an open-source Cloudflare Worker that:

- Encrypts calendar URLs with AES-GCM 256-bit encryption
- Operates a zero-log policy
- Only proxies requests to `srh-community.campusweb.cloud`

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue**
2. Email: **tools@zardaloo.eu.org**
3. Include a description of the vulnerability and steps to reproduce
4. Allow reasonable time for a fix before public disclosure

We aim to respond to security reports within 48 hours.
