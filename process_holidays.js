
import fs from 'fs';

const enData = JSON.parse(fs.readFileSync('Documents/Germany Public Holidays - EN.json', 'utf8'));
const deData = JSON.parse(fs.readFileSync('Documents/Germany Public Holidays - DE.json', 'utf8'));

function mergeRows(data, dateKey, statesKey, holidayKey) {
    const merged = [];
    data.forEach(item => {
        if (item[dateKey]) {
            merged.push({ ...item });
        } else if (merged.length > 0) {
            const last = merged[merged.length - 1];
            last[statesKey] += ' ' + item[statesKey];
        }
    });
    return merged;
}

const enMerged = mergeRows(enData, 'Date', 'States', 'Holiday');
const deMerged = mergeRows(deData, 'Datum', 'Bundesländ', 'Feiertag');

const holidays = [];

enMerged.forEach((en, i) => {
    const de = deMerged[i];
    if (!de) return;

    // Parse date: e.g., "1-Jan" or "1. Januar"
    // We'll standardize to MM-DD
    const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const [day, monthStr] = en.Date.split('-');
    const month = months[monthStr];
    const dateStr = `${month}-${day.padStart(2, '0')}`;

    // Process states
    const processStates = (str) => {
        if (str.includes('National') || str.includes('Alle Länder')) return 'ALL';
        // Extract 2-letter codes
        const matches = str.match(/[A-Z]{2}/g);
        return matches || [];
    };

    const states = processStates(en.States);

    holidays.push({
        id: `holiday_${dateStr}_${en.Holiday.toLowerCase().replace(/\s+/g, '_')}`,
        date: dateStr, // MM-DD
        nameEn: en.Holiday,
        nameDe: de.Feiertag,
        states: states
    });
});

console.log('export interface Holiday {');
console.log('  id: string;');
console.log('  date: string; // MM-DD');
console.log('  nameEn: string;');
console.log('  nameDe: string;');
console.log('  states: string[] | "ALL";');
console.log('}');
console.log('\nexport const HOLIDAYS: Holiday[] = ' + JSON.stringify(holidays, null, 2) + ';');
