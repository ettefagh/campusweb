import type { RequestHandler } from './$types';
import { enhanceIcal } from '$lib/ical-enhancer';

/**
 * Server-side iCal proxy endpoint.
 * 
 * Fetches iCal data on the server (Cloudflare Worker) to bypass CORS
 * restrictions that block client-side browser requests.
 * 
 * Usage: GET /api/ical-proxy?url=https://example.com/calendar.ics
 */

// Allowlist of domains we permit proxying (prevent open-proxy abuse)
const ALLOWED_PATTERNS = [
    'srh-community.campusweb.cloud',
    'ecampus.srh-university.de',
    'calendarsub.padarhava.workers.dev',
    'srh-calendar-enhancer.padarhava.workers.dev',
    'outlook.office365.com',
    'outlook.office.com',
    'outlook.live.com',
    'calendar.google.com',
    'icloud.com',
    'calendar.yahoo.com'
];

function isAllowedUrl(urlStr: string): boolean {
    try {
        const parsed = new URL(urlStr);
        if (parsed.protocol !== 'https:') return false;
        // Check against allowlist
        return ALLOWED_PATTERNS.some(pattern => parsed.hostname.endsWith(pattern));
    } catch {
        return false;
    }
}

export const GET: RequestHandler = async ({ url, fetch }) => {
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Missing "url" query parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!isAllowedUrl(targetUrl)) {
        return new Response(JSON.stringify({ error: 'URL domain not allowed' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const upstreamUrl = new URL(targetUrl);
        upstreamUrl.searchParams.set('_t', Date.now().toString());

        const response = await fetch(upstreamUrl.toString(), {
            signal: controller.signal,
            headers: {
                'User-Agent': 'CampusWeb/1.0 iCal-Proxy',
                'Accept': 'text/calendar, text/plain, */*'
            }
        });

        clearTimeout(timeout);

        if (!response.ok) {
            return new Response(JSON.stringify({ 
                error: `Upstream returned ${response.status}` 
            }), {
                status: 502,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const icalData = await response.text();

        // Basic validation: iCal content should start with BEGIN:VCALENDAR
        if (!icalData.trimStart().startsWith('BEGIN:VCALENDAR')) {
            return new Response(JSON.stringify({ 
                error: 'Response is not valid iCal data' 
            }), {
                status: 422,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Enhance the calendar data (clean titles, add GPS, strip PII) only for SRH calendars
        const parsedUrl = new URL(targetUrl);
        const isSrhCalendar = ['srh-community.campusweb.cloud', 'ecampus.srh-university.de']
            .some(domain => parsedUrl.hostname.endsWith(domain));
            
        const outputIcalData = isSrhCalendar ? enhanceIcal(icalData) : icalData;

        return new Response(outputIcalData, {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Cache-Control': 'public, max-age=3600', // Cache 1 hour at edge
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (err: any) {
        const message = err?.name === 'AbortError' 
            ? 'Request timed out (10s)' 
            : (err?.message || 'Unknown error');
            
        return new Response(JSON.stringify({ error: message }), {
            status: 504,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
