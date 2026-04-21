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
  weekStartsOn: WeekStart;
  /** Compact card layout on home page */
  compactCards: boolean;
  /** Show seconds in time displays */
  showSeconds: boolean;
}

// ── Static Data: Campuses ─────────────────────────────────────────────────────

export const CAMPUSES: Campus[] = [
  { id: 'berlin', name: 'SRH Berlin', city: 'Berlin', country: 'DE' },
  { id: 'cologne', name: 'SRH Cologne', city: 'Cologne', country: 'DE' },
  { id: 'fuerth', name: 'SRH Fürth', city: 'Fürth', country: 'DE' },
  { id: 'dresden', name: 'SRH Dresden', city: 'Dresden', country: 'DE' },
  { id: 'hamburg', name: 'SRH Hamburg', city: 'Hamburg', country: 'DE' },
  { id: 'heidelberg', name: 'SRH Heidelberg', city: 'Heidelberg', country: 'DE' },
  { id: 'leipzig', name: 'SRH Leipzig', city: 'Leipzig', country: 'DE' },
  { id: 'munich', name: 'SRH Munich', city: 'Munich', country: 'DE' },
  { id: 'stuttgart', name: 'SRH Stuttgart', city: 'Stuttgart', country: 'DE' },
];

// ── Static Data: Departments ──────────────────────────────────────────────────
// Mapping provided majors to all campuses

const MAJOR_LIST = [
  { id: 'aim', name: 'Artificial Intelligence & Machine Learning', shortName: 'AIM' },
  { id: 'bls', name: 'Business Law & Sustainability', shortName: 'BLS' },
  { id: 'hes', name: 'Health & Environmental Sciences', shortName: 'HES' },
  { id: 'psy', name: 'Psychology & Behavioral Sciences', shortName: 'PSY' },
  { id: 'teac', name: 'Teaching & Educational Arts', shortName: 'TEAC' },
];

export const DEPARTMENTS: Department[] = CAMPUSES.flatMap(campus => 
  MAJOR_LIST.map(major => ({
    id: `${major.id}_${campus.id}`,
    campusId: campus.id,
    name: major.name,
    shortName: major.shortName
  }))
);

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  theme: 'auto',
  campusId: null,
  departmentId: null,
  weekStartsOn: 1, // Monday
  compactCards: false,
  showSeconds: false,
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

/** True when the user has completed the initial setup */
export const isSetupComplete = derived(settingsStore, ($s) =>
  $s.campusId !== null
);
