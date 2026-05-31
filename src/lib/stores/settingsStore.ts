/**
 * Global App Settings Store
 *
 * Manages all user-configurable app preferences, persisted to localStorage.
 * Import and use anywhere via: import { settingsStore } from '$lib/stores/settingsStore'
 *
 * Settings include:
 *  - Campus selection (determines pre-loaded calendars)
 *  - Major/Department selection (determines exam calendars)
 *  - Language (en | de)
 *  - Appearance (theme override: auto | light | dark)
 *  - Calendar: first day of week
 *  - Notifications: opt-in preference
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AppLanguage = 'en' | 'de';
export type AppTheme = 'auto' | 'light' | 'dark';
export type WeekStart = 0 | 1 | 6; // 0=Sun, 1=Mon, 6=Sat

export interface HomeSection {
  id: string;
  enabled: boolean;
}

export interface Campus {
  id: string;
  university: string;
  name: string;
  city: string;
  country: string;
  lat?: number;
  lon?: number;
  stateCode?: string; // e.g., 'BE', 'BW', 'BY'
  libraryUrl?: string;
  /** Base URL for campus-specific iCal feeds if available */
  calendarBaseUrl?: string;
  /** Optional location string used by weather/geocoding lookups */
  weatherLocation?: string;
}

export interface Department {
  id: string;
  campusId: string;
  name: string;
  shortName: string;
  /** Pre-built iCal URL for exam/lecture-free periods for this department */
  icalUrl?: string;
}

export interface AppSettings {
  language: AppLanguage;
  theme: AppTheme;
  firstName: string | null;
  campusId: string | null;
  departmentId: string | null;
  programName: string | null;
  weekStartsOn: WeekStart;
  /** Compact card layout on home page */
  compactCards: boolean;
  /** Show seconds in time displays */
  showSeconds: boolean;
  /** Whether the user has verified their university email */
  emailVerified: boolean;
  /** Expiration timestamp for the active session, if any */
  sessionExpiresAt?: number;
  /** Modular homepage sections order and toggle state */
  homeSections: HomeSection[];
  /** Homepage Header Size */
  headerSize: 'big' | 'small';
  /** Default Landing Page */
  defaultPage: 'home' | 'calendar';
  /** Feed refresh rate in minutes */
  feedRefreshRate: number;
  /** Home calendar widget mode */
  calendarWidgetMode: 'today' | 'next' | 'month';
}

// ── Static Data: Campuses ─────────────────────────────────────────────────────

export const CAMPUSES: Campus[] = [
  { id: 'bamberg', university: 'SRH', name: 'Bamberg', city: 'Bamberg', country: 'DE', lat: 49.8917, lon: 10.8919, stateCode: 'BY' },
  { id: 'berlin', university: 'SRH', name: 'Berlin', city: 'Berlin', country: 'DE', lat: 52.4758038, lon: 13.4549394, stateCode: 'BE', libraryUrl: 'https://webopac.srh-hochschulen.de/vopac/index.asp?DB=BIBB', weatherLocation: 'Neukölln 12059 Berlin' },
  { id: 'bonn', university: 'SRH', name: 'Bonn', city: 'Bonn', country: 'DE', lat: 50.7374, lon: 7.0982, stateCode: 'NW' },
  { id: 'bremen', university: 'SRH', name: 'Bremen', city: 'Bremen', country: 'DE', lat: 53.0793, lon: 8.8017, stateCode: 'HB', libraryUrl: 'https://katalog.hamm.de/' },
  { id: 'dresden', university: 'SRH', name: 'Dresden', city: 'Dresden', country: 'DE', lat: 51.0504, lon: 13.7373, stateCode: 'SN' },
  { id: 'duesseldorf', university: 'SRH', name: 'Düsseldorf', city: 'Düsseldorf', country: 'DE', lat: 51.2277, lon: 6.7735, stateCode: 'NW' },
  { id: 'fuerth', university: 'SRH', name: 'Fürth', city: 'Fürth', country: 'DE', lat: 49.4771, lon: 10.9887, stateCode: 'BY', libraryUrl: 'https://www.eopac.net/wlh/' },
  { id: 'gera', university: 'SRH', name: 'Gera', city: 'Gera', country: 'DE', lat: 50.8777, lon: 12.0807, stateCode: 'TH' },
  { id: 'hamburg', university: 'SRH', name: 'Hamburg', city: 'Hamburg', country: 'DE', lat: 53.5511, lon: 9.9937, stateCode: 'HH' },
  { id: 'hamm', university: 'SRH', name: 'Hamm', city: 'Hamm', country: 'DE', lat: 51.6739, lon: 7.815, stateCode: 'NW', libraryUrl: 'https://katalog.hamm.de/' },
  { id: 'heide', university: 'SRH', name: 'Heide', city: 'Heide', country: 'DE', lat: 54.1958, lon: 9.0959, stateCode: 'SH' },
  { id: 'heidelberg', university: 'SRH', name: 'Heidelberg', city: 'Heidelberg', country: 'DE', lat: 49.3988, lon: 8.6724, stateCode: 'BW', libraryUrl: 'https://1he.edu.srh.b13.live/' },
  { id: 'karlsruhe', university: 'SRH', name: 'Karlsruhe', city: 'Karlsruhe', country: 'DE', lat: 49.0069, lon: 8.4037, stateCode: 'BW' },
  { id: 'cologne', university: 'SRH', name: 'Köln', city: 'Köln', country: 'DE', lat: 50.9375, lon: 6.9603, stateCode: 'NW', libraryUrl: 'https://katalog.hamm.de/' },
  { id: 'leipzig', university: 'SRH', name: 'Leipzig', city: 'Leipzig', country: 'DE', lat: 51.3397, lon: 12.3731, stateCode: 'SN' },
  { id: 'leverkusen', university: 'SRH', name: 'Leverkusen', city: 'Leverkusen', country: 'DE', lat: 51.0459, lon: 7.0192, stateCode: 'NW' },
  { id: 'munich', university: 'SRH', name: 'München', city: 'München', country: 'DE', lat: 48.1351, lon: 11.582, stateCode: 'BY' },
  { id: 'munster', university: 'SRH', name: 'Münster', city: 'Münster', country: 'DE', lat: 51.9607, lon: 7.6261, stateCode: 'NW' },
  { id: 'stuttgart', university: 'SRH', name: 'Stuttgart', city: 'Stuttgart', country: 'DE', lat: 48.7758, lon: 9.1829, stateCode: 'BW' },
  { id: 'tuebingen', university: 'SRH', name: 'Tübingen', city: 'Tübingen', country: 'DE', lat: 48.5226, lon: 9.0522, stateCode: 'BW' },
];

// ── Static Data: Schools (Departments) ────────────────────────────────────────
// Actual school-per-campus mappings from the official programme directors list.

const SCHOOL_LIST = [
  { id: 'aim', name: 'School of Arts, Information and Media', shortName: 'AIM' },
  { id: 'bls', name: 'School of Business and Law', shortName: 'BLS' },
  { id: 'hes', name: 'School of Health, Education and Social Sciences', shortName: 'HES' },
  { id: 'psy', name: 'School of Psychology', shortName: 'PSY' },
  { id: 'teac', name: 'School of Technology and Architecture', shortName: 'TEAC' },
];

// Which schools are actually present at each campus (from programme directors PDF)
const CAMPUS_SCHOOLS: Record<string, string[]> = {
  "bamberg": ["hes"],
  "berlin": ["aim", "bls", "hes", "teac"],
  "bonn": ["hes"],
  "bremen": ["bls"],
  "cologne": ["bls", "hes", "psy", "teac"],
  "dresden": ["bls", "hes", "psy"],
  "duesseldorf": ["hes"],
  "fuerth": ["bls", "hes", "psy", "teac"],
  "gera": ["bls", "hes", "psy"],
  "hamburg": ["aim", "bls", "hes", "psy", "teac"],
  "hamm": ["bls", "hes", "psy", "teac"],
  "heide": ["hes"],
  "heidelberg": ["aim", "bls", "hes", "psy", "teac"],
  "karlsruhe": ["hes"],
  "leipzig": ["aim", "bls", "hes", "psy", "teac"],
  "leverkusen": ["hes"],
  "munich": ["aim", "bls", "hes", "teac"],
  "munster": ["bls", "hes", "psy"],
  "stuttgart": ["bls", "hes", "psy", "teac"],
  "tuebingen": ["hes"]
};

export const DEPARTMENTS: Department[] = Object.entries(CAMPUS_SCHOOLS).flatMap(
  ([campusId, schoolIds]) =>
    schoolIds.map((sid) => {
      const school = SCHOOL_LIST.find((s) => s.id === sid)!;
      return {
        id: `${sid}_${campusId}`,
        campusId,
        name: school.name,
        shortName: school.shortName,
      };
    })
);

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  theme: 'auto',
  firstName: null,
  campusId: null,
  departmentId: null,
  programName: null,
  weekStartsOn: 1, // Monday
  compactCards: false,
  showSeconds: false,
  emailVerified: false,
  sessionExpiresAt: undefined,
  headerSize: 'big',
  defaultPage: 'home',
  homeSections: [
    { id: 'header', enabled: true },
    { id: 'stories', enabled: true },
    { id: 'calendar', enabled: true },
    { id: 'favorites', enabled: true },
    { id: 'cards', enabled: true },
    { id: 'favoriteContacts', enabled: false },

  ],
  feedRefreshRate: 5,
  calendarWidgetMode: 'today',
};

const STORAGE_KEY = 'app_settings';

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeSettings(settings: AppSettings): AppSettings {
  const headerItem =
    settings.homeSections.find((section: HomeSection) => section.id === 'header') ??
    { id: 'header', enabled: true };

  headerItem.enabled = true;

  return {
    ...settings,
    headerSize: 'big',
    homeSections: [
      headerItem,
      ...settings.homeSections.filter((section: HomeSection) => section.id !== 'header'),
    ],
  };
}

function readFromStorage(): AppSettings {
  if (!browser) return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    
    // Smart merge homeSections to dynamically add newly introduced sections
    if (parsed && parsed.homeSections) {
      const existingIds = parsed.homeSections.map((s: any) => s.id);
      const missing = DEFAULT_SETTINGS.homeSections.filter(s => !existingIds.includes(s.id));
      let merged = [...parsed.homeSections, ...missing];
      
      // Force 'header' to always be at index 0
      const headerItem = merged.find(s => s.id === 'header');
      if (headerItem) {
        merged = [headerItem, ...merged.filter(s => s.id !== 'header')];
      }
      parsed.homeSections = merged;
    } else if (parsed && !parsed.homeSections) {
      parsed.homeSections = [...DEFAULT_SETTINGS.homeSections];
    }
    
    const finalSettings = { ...DEFAULT_SETTINGS, ...parsed };
    return normalizeSettings(finalSettings);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persist(settings: AppSettings): void {
  if (!browser) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
}

// ── Store Factory ─────────────────────────────────────────────────────────────

function createSettingsStore() {
  const { subscribe, set, update } = writable<AppSettings>(readFromStorage());

  return {
    subscribe,

    /** Update any subset of settings */
    patch(partial: Partial<AppSettings>): void {
      update((current) => {
        const next = normalizeSettings({ ...current, ...partial });
        persist(next);
        return next;
      });
    },

    /** Reset to factory defaults */
    reset(): void {
      const fresh = normalizeSettings({ ...DEFAULT_SETTINGS });
      persist(fresh);
      set(fresh);
    },
  };
}

export const settingsStore = createSettingsStore();

// ── Derived: Active campus & department objects ───────────────────────────────

export const activeCampus = derived(settingsStore, ($s) =>
  CAMPUSES.find((c) => c.id === $s.campusId) ?? null
);

export const activeDepartment = derived(settingsStore, ($s) =>
  DEPARTMENTS.find((d) => d.id === $s.departmentId) ?? null
);

/** Departments filtered to the currently selected campus */
export const campusDepartments = derived(settingsStore, ($s) =>
  $s.campusId ? DEPARTMENTS.filter((d) => d.campusId === $s.campusId) : []
);

/** Normalizes program names to consolidate variants (e.g., removes degree suffixes and focus areas) */
export function normalizeProgramName(name: string): string {
  if (!name) return '';
  // 1. Remove everything after " - " (Focus on...)
  let n = name.split(' - ')[0];
  // 2. Remove degree suffixes like (B.Sc.), (M.A.), (M.Eng.), etc.
  n = n.replace(/\s*\([^)]*\)/g, '');
  // 3. Remove bilingual variants like "EN/ Architecture"
  n = n.replace(/^[A-Z]{2}\/\s+/, '');
  n = n.split(' EN/')[0];
  // 4. Remove trailing slashes and alternative names
  n = n.split(' / ')[0];
  n = n.split('/')[0];

  // 5. Consolidate Computer Science variants
  if (n.toLowerCase().includes('computer science')) return 'Computer Science';
  
  return n.trim();
}

/** Programs filtered to the currently selected campus and department */
import { PROGRAM_DATA } from '$lib/data/programs';
export const campusPrograms = derived(settingsStore, ($s) => {
  if (!$s.campusId || !$s.departmentId) return [];
  const schoolId = $s.departmentId.split('_')[0];
  
  const programs = PROGRAM_DATA
    .filter(p => p.campusId === $s.campusId && p.schoolId === schoolId)
    .map(p => normalizeProgramName(p.name));
    
  return [...new Set(programs)].sort();
});

/** True when the user has completed the initial setup */
export const isSetupComplete = derived(settingsStore, ($s) =>
  $s.campusId !== null
);
