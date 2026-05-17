# Security Hybrid Operations (Agent + Admin)

## Scope

This runbook covers the authentication and verification-email path:

1. User client requests PIN (`/api/auth/request-pin`)
2. Cloudflare Worker validates, applies abuse controls, and sends PIN email
3. User submits PIN (`/api/auth/verify-pin`)
4. Cloudflare Worker validates and issues session cookie
5. Security events are logged and high/critical events are routed to Telegram admin channel

## Role Split

### Agent-owned (automatic)

1. Detect and throttle abuse (`429`) on request and verify endpoints
2. Detect replay attempts (`409`) on verification challenges
3. Emit structured security events for lockouts, replay, and email delivery failures
4. Send high/critical incident alerts to Telegram (deduplicated)
5. Produce evidence (event payloads and test outputs)

### Admin-owned (approval/privileged)

1. Rotate secrets (`PRIVATE_AUTH_SECRET`, email tokens, Telegram tokens)
2. Update DNS and mail policy (SPF, DKIM, DMARC)
3. Configure Cloudflare edge WAF/rate-limit rules
4. Decide incident response actions that affect deliverability or user impact
5. Review and approve permanent policy changes

## Incident Routing

High/critical events use Telegram admin alerts:

1. `auth.request_pin.rate_limit`
2. `auth.verify_pin.rate_limit`
3. `auth.verify_pin.replay_attempt`
4. `auth.request_pin.email_delivery_failed`

## Decision Rules

Agent can execute immediately:

1. Temporary lockouts and request throttling
2. Replay challenge blocking
3. Alerting and evidence generation

Admin approval required:

1. Any external provider config change
2. Any global blocklist changes with user impact
3. Any key rotation requiring coordinated rollout

## Testing Cadence

Run at minimum weekly and after auth/email changes:

1. `npm exec --min-release-age=0 --yes --package vitest -- vitest run tests/security/auth-security.test.ts`
2. `npm run check`
3. `npm run build`

