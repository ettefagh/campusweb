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

export interface Campus {
  id: string;
  university: string;
  name: string;
  city: string;
  country: string;
  /** Base URL for campus-specific iCal feeds if available */
  calendarBaseUrl?: string;
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
}

// ── Static Data: Campuses ─────────────────────────────────────────────────────

export const CAMPUSES: Campus[] = [
  { id: 'bamberg', university: 'SRH', name: 'Bamberg', city: 'Bamberg', country: 'DE' },
  { id: 'berlin', university: 'SRH', name: 'Berlin', city: 'Berlin', country: 'DE' },
  { id: 'bremen', university: 'SRH', name: 'Bremen', city: 'Bremen', country: 'DE' },
  { id: 'dresden', university: 'SRH', name: 'Dresden', city: 'Dresden', country: 'DE' },
  { id: 'duesseldorf', university: 'SRH', name: 'Düsseldorf', city: 'Düsseldorf', country: 'DE' },
  { id: 'fuerth', university: 'SRH', name: 'Fürth', city: 'Fürth', country: 'DE' },
  { id: 'gera', university: 'SRH', name: 'Gera', city: 'Gera', country: 'DE' },
  { id: 'hamburg', university: 'SRH', name: 'Hamburg', city: 'Hamburg', country: 'DE' },
  { id: 'hamm', university: 'SRH', name: 'Hamm', city: 'Hamm', country: 'DE' },
  { id: 'heide', university: 'SRH', name: 'Heide', city: 'Heide', country: 'DE' },
  { id: 'heidelberg', university: 'SRH', name: 'Heidelberg', city: 'Heidelberg', country: 'DE' },
  { id: 'karlsruhe', university: 'SRH', name: 'Karlsruhe', city: 'Karlsruhe', country: 'DE' },
  { id: 'cologne', university: 'SRH', name: 'Köln', city: 'Köln', country: 'DE' },
  { id: 'leipzig', university: 'SRH', name: 'Leipzig', city: 'Leipzig', country: 'DE' },
  { id: 'leverkusen', university: 'SRH', name: 'Leverkusen', city: 'Leverkusen', country: 'DE' },
  { id: 'munich', university: 'SRH', name: 'München', city: 'München', country: 'DE' },
  { id: 'stuttgart', university: 'SRH', name: 'Stuttgart', city: 'Stuttgart', country: 'DE' },
  { id: 'tuebingen', university: 'SRH', name: 'Tübingen', city: 'Tübingen', country: 'DE' },
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
  bamberg: ['bls', 'hes'],
  berlin: ['aim', 'bls', 'hes', 'psy', 'teac'],
  bremen: ['bls', 'hes', 'teac'],
  dresden: ['bls', 'hes', 'teac'],
  duesseldorf: ['bls', 'hes'],
  fuerth: ['aim', 'bls', 'hes', 'teac'],
  gera: ['bls', 'hes', 'psy', 'teac'],
  hamburg: ['bls', 'hes', 'teac'],
  hamm: ['bls', 'hes'],
  heide: ['hes'],
  heidelberg: ['bls', 'hes', 'psy', 'teac'],
  karlsruhe: ['hes'],
  cologne: ['bls', 'hes'],
  leipzig: ['bls', 'hes', 'teac'],
  leverkusen: ['hes'],
  munich: ['aim', 'bls', 'hes', 'teac'],
  stuttgart: ['hes', 'psy', 'teac'],
  tuebingen: ['hes'],
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
  campusId: null,
  departmentId: null,
  programName: null,
  weekStartsOn: 1, // Monday
  compactCards: false,
  showSeconds: false,
  emailVerified: false,
};

const STORAGE_KEY = 'app_settings';

// ── Helpers ───────────────────────────────────────────────────────────────────

function readFromStorage(): AppSettings {
  if (!browser) return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persist(settings: AppSettings): void {
  if (!browser) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// ── Store Factory ─────────────────────────────────────────────────────────────

function createSettingsStore() {
  const { subscribe, set, update } = writable<AppSettings>(readFromStorage());

  return {
    subscribe,

    /** Update any subset of settings */
    patch(partial: Partial<AppSettings>): void {
      update((current) => {
        const next = { ...current, ...partial };
        persist(next);
        return next;
      });
    },

    /** Reset to factory defaults */
    reset(): void {
      const fresh = { ...DEFAULT_SETTINGS };
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

/** Programs filtered to the currently selected campus and department */
import { programDirectors } from '$lib/data/contacts';
export const campusPrograms = derived(settingsStore, ($s) => {
  if (!$s.campusId || !$s.departmentId) return [];
  const schoolId = $s.departmentId.split('_')[0];
  const programs = programDirectors
    .filter(p => p.campusId === $s.campusId && p.school === schoolId)
    .map(p => p.program)
    .filter(Boolean);
  return [...new Set(programs)].sort();
});

/** True when the user has completed the initial setup */
export const isSetupComplete = derived(settingsStore, ($s) =>
  $s.campusId !== null
);
