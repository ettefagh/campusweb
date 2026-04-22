/**
 * iCal Enhancer for CampusWeb
 * Ported from SRH Calendar Enhancer (Cloudflare Worker version)
 * Provides data cleaning, title normalization, and GPS location enrichment.
 */

// --- Constants & Config --- //

const CAMPUS_DATA: Record<string, { name: string; address: string; coords: string; plusCode: string; notes: string }> = {
    'CUBE': {
        name: 'CUBE',
        address: 'Sonnenallee 221A, 12059 Berlin',
        coords: '52.475147,13.468200',
        plusCode: 'GCR9+7H7',
        notes: ''
    },
    'HALL': {
        name: 'HALL',
        address: 'Sonnenallee 221B, 12059 Berlin',
        coords: '52.475064, 13.457422',
        plusCode: 'FFG4+2XF',
        notes: ''
    },
    'A': { name: 'SHED', address: 'Sonnenallee 221C, 12059 Berlin', coords: '52.4758038,13.4549394', plusCode: 'GCC5+QW', notes: '' },
    'B': { name: 'SHED', address: 'Sonnenallee 221C, 12059 Berlin', coords: '52.4758038,13.4549394', plusCode: 'GCC5+QW', notes: '' },
    'C': { name: 'SHED', address: 'Sonnenallee 221D, 12059 Berlin', coords: '52.4760266,13.4549741', plusCode: 'GCC5+RX', notes: '' },
    'D': { name: 'SHED', address: 'Sonnenallee 221E, 12059 Berlin', coords: '52.4762398,13.4550747', plusCode: 'GCC6+22', notes: '' },
    'SON223': {
        name: 'Sonnenallee 223',
        address: 'Sonnenallee 223, 12059 Berlin',
        coords: '52.47446,13.455246',
        plusCode: 'GCC5+GG',
        notes: 'Entrance: Toreinfahrt; use stairwell 1 for 3rd floor. Access: Transponder.'
    },
    'SON224A': {
        name: 'Sonnenallee 224a',
        address: 'Sonnenallee 224a, 12059 Berlin',
        coords: '52.474447,13.456046',
        plusCode: 'GCC5+GH',
        notes: 'Entrance: via car park gate. Key: Welcome Desk.'
    },
    'DEKRA': {
        name: 'DEKRA Akademie',
        address: 'Kiehlufer 163, 12057 Berlin',
        coords: '52.478946,13.458246',
        plusCode: 'GCH6+JW',
        notes: 'Entrance: flagpoles.'
    },
    'CN': {
        name: 'Colonia Nova',
        address: 'Thiemannstraße 1, 12059 Berlin',
        coords: '52.476946,13.451246',
        plusCode: 'GCC4+XV',
        notes: 'Entrance: Gate 4. Key: Welcome Desk.'
    }
};

const ALLOWED_PROPS = new Set([
    'DTSTART', 'DTEND', 'DTSTAMP', 'UID',
    'RRULE', 'EXDATE', 'STATUS', 'TRANSP',
    'SEQUENCE', 'RECURRENCE-ID', 'CLASS', 'CREATED', 'LAST-MODIFIED'
]);

// --- Utilities --- //


/**
 * RFC 5545 Compliance: Split lines at 75 octets (bytes), not characters.
 */
function foldLine(line: string): string {
    const encoder = new TextEncoder();
    if (encoder.encode(line).length <= 75) return line;

    let result = '';
    let currentLine = '';
    let currentBytes = 0;

    for (const char of line) {
        const charBytes = encoder.encode(char).length;
        if (currentBytes + charBytes > 75) {
            result += currentLine + '\r\n ';
            currentLine = char;
            currentBytes = charBytes + 1;
        } else {
            currentLine += char;
            currentBytes += charBytes;
        }
    }
    result += currentLine;
    return result;
}

function normalizeTitle(summary: string): string {
    if (!summary) return summary;
    let clean = summary.replace(/^k_[A-Z0-9_]+\s*-\s*/i, '').trim();
    const words = clean.split(/\s+/);
    return [...new Set(words)].join(' ');
}

function resolveLocation(rawLoc: string) {
    if (!rawLoc || rawLoc.toLowerCase() === 'online') {
        return { key: 'Online', name: 'Online', address: 'Online', coords: '0,0', plusCode: '', notes: '', room: '' };
    }

    const roomMatch = rawLoc.match(/((?:[A-D]|CUBE|SON|Seminar|HALL)\s*\d+\.\d+|\d+\.\d+)/i);
    const roomCode = roomMatch ? roomMatch[1] : '';

    let key = 'CUBE';
    if (rawLoc.toUpperCase().includes('KIEHLUFER')) key = 'DEKRA';
    else if (rawLoc.toUpperCase().includes('THIEMANN')) key = 'CN';
    else if (rawLoc.toUpperCase().includes('HALL')) key = 'HALL';
    else if (rawLoc.includes('223')) key = 'SON223';
    else if (rawLoc.includes('224a')) key = 'SON224A';
    else if (roomCode) {
        const up = roomCode.toUpperCase();
        if (up.startsWith('CUBE')) key = 'CUBE';
        else {
            const first = up.charAt(0);
            if (CAMPUS_DATA[first]) key = first;
            else if (rawLoc.toUpperCase().includes('CUBE')) key = 'CUBE';
            else if (/^\d/.test(first)) key = 'CUBE';
        }
    }

    const data = CAMPUS_DATA[key] || CAMPUS_DATA['CUBE'];
    return { ...data, key, room: roomCode };
}

function enhanceEvent(lines: string[]): string[] {
    let summary = '';
    let locationRaw = '';
    let courseId = 'N/A';
    const safeLines: string[] = [];

    for (const line of lines) {
        const separatorIdx = line.indexOf(':');
        const propName = separatorIdx > -1 ? line.substring(0, separatorIdx).split(';')[0] : '';

        if (line.startsWith('SUMMARY:')) {
            const raw = line.substring(8);
            const idMatch = raw.match(/(k_[A-Z0-9_]+)/i);
            if (idMatch) courseId = idMatch[1];
            summary = normalizeTitle(raw);
        } else if (line.startsWith('LOCATION:')) {
            locationRaw = line.substring(9);
        } else if (line.startsWith('BEGIN:VEVENT') || line.startsWith('DESCRIPTION:')) {
            // Skip handled later or ignored
        } else {
            if (ALLOWED_PROPS.has(propName)) {
                safeLines.push(line);
            }
        }
    }

    const enhancedLoc = resolveLocation(locationRaw);
    const event = ['BEGIN:VEVENT'];
    event.push(`SUMMARY:${summary}`);

    let uiLabel = `${enhancedLoc.room || locationRaw} - ${enhancedLoc.name}`;
    if (enhancedLoc.key === 'CUBE') {
        let room = (enhancedLoc.room || locationRaw).replace(/CUBE/i, '').trim();
        if (room.toUpperCase().startsWith('HALL ')) {
            uiLabel = room.substring(5).trim() + ' HALL';
        } else if (room.toUpperCase().startsWith('SEMINAR ')) {
            uiLabel = room.substring(8).trim() + ' Seminar';
        } else {
            uiLabel = `${room} - CUBE`;
        }
    } else if (enhancedLoc.key === 'HALL') {
        let room = (enhancedLoc.room || locationRaw).replace(/HALL/i, '').trim();
        uiLabel = `${room} HALL`;
    } else if (enhancedLoc.key === 'Online') {
        uiLabel = 'Online';
    }

    if (enhancedLoc.key === 'Online') {
        event.push('LOCATION:Online');
        event.push('X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-ADDRESS="Online";X-APPLE-RADIUS=50;X-TITLE="Online";X-APPLE-REFERENCEFRAME=1:geo:0,0');
    } else {
        const rawAddress = enhancedLoc.address || '';
        const escapedAddress = rawAddress.replace(/,/g, '\\,').replace(/;/g, '\\;');
        const escapedLabel = uiLabel.replace(/,/g, '\\,').replace(/;/g, '\\;');
        const locString = `${escapedLabel}\\, ${escapedAddress}`;
        event.push(`LOCATION:${locString}`);
        event.push(`X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-ADDRESS="${rawAddress}";X-APPLE-RADIUS=50;X-TITLE="${uiLabel}";X-APPLE-REFERENCEFRAME=1:geo:${enhancedLoc.coords}`);
    }

    const descParts = [];
    descParts.push(`🆔 Course ID: ${courseId}`);
    if (enhancedLoc.notes) descParts.push(enhancedLoc.notes);
    descParts.push('--------------------------');
    descParts.push(`🗺️ Original: ${locationRaw}`);
    event.push(`DESCRIPTION:${descParts.join('\\n')}`);

    for (const line of safeLines) {
        event.push(line);
    }
    event.push('END:VEVENT');
    return event;
}

/**
 * Joins RFC 5545 continuation lines.
 */
function unfoldLines(ics: string): string[] {
    const lines = ics.replace(/\r\n/g, '\n').split('\n');
    const unfolded: string[] = [];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
            line += lines[i + 1].substring(1);
            i++;
        }
        if (line.trim()) unfolded.push(line);
    }
    return unfolded;
}

/**
 * Main entry point for iCal enhancement.
 */
export function enhanceIcal(rawIcal: string): string {
    const lines = unfoldLines(rawIcal);
    const result: string[] = [];
    let currentEventLines: string[] = [];
    let inEvent = false;

    for (const line of lines) {
        if (line.startsWith('BEGIN:VEVENT')) {
            inEvent = true;
            currentEventLines = [line];
            continue;
        }

        if (line.startsWith('END:VEVENT')) {
            inEvent = false;
            result.push(...enhanceEvent(currentEventLines));
            continue;
        }

        if (inEvent) {
            currentEventLines.push(line);
        } else {
            // Enhancement: Append '+' to the calendar name if present
            if (line.startsWith('X-WR-CALNAME:')) {
                const name = line.substring(13).trim();
                if (!name.endsWith('+')) {
                    result.push(`X-WR-CALNAME:${name}+`);
                    continue;
                }
            }
            result.push(line);
        }
    }

    return result.map(foldLine).join('\r\n') + '\r\n';
}
