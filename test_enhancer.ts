import { readFileSync } from 'fs';
import { enhanceIcal } from './src/lib/ical-enhancer';

const rawIcs = readFileSync('srh_raw.ics', 'utf8');
const enhanced = enhanceIcal(rawIcs);

const lines = enhanced.split('\n');
let inEvent = false;
for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
        inEvent = true;
    }
    if (inEvent) {
        if (line.includes('Algorithms and Data Structures') || line.startsWith('LOCATION') || line.startsWith('DESCRIPTION')) {
            console.log(line);
        }
    }
    if (line.startsWith('END:VEVENT')) {
        inEvent = false;
        console.log('---');
    }
}
