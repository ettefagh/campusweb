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
  /** Whether the user has verified their university email */
  emailVerified: boolean;
}

// ── Static Data: Campuses ─────────────────────────────────────────────────────

export const CAMPUSES: Campus[] = [
  { id: 'bamberg', name: 'SRH Bamberg', city: 'Bamberg', country: 'DE' },
  { id: 'berlin', name: 'SRH Berlin', city: 'Berlin', country: 'DE' },
  { id: 'bremen', name: 'SRH Bremen', city: 'Bremen', country: 'DE' },
  { id: 'dresden', name: 'SRH Dresden', city: 'Dresden', country: 'DE' },
  { id: 'duesseldorf', name: 'SRH Düsseldorf', city: 'Düsseldorf', country: 'DE' },
  { id: 'fuerth', name: 'SRH Fürth', city: 'Fürth', country: 'DE' },
  { id: 'gera', name: 'SRH Gera', city: 'Gera', country: 'DE' },
  { id: 'hamburg', name: 'SRH Hamburg', city: 'Hamburg', country: 'DE' },
  { id: 'hamm', name: 'SRH Hamm', city: 'Hamm', country: 'DE' },
  { id: 'heide', name: 'SRH Heide', city: 'Heide', country: 'DE' },
  { id: 'heidelberg', name: 'SRH Heidelberg', city: 'Heidelberg', country: 'DE' },
  { id: 'karlsruhe', name: 'SRH Karlsruhe', city: 'Karlsruhe', country: 'DE' },
  { id: 'cologne', name: 'SRH Köln', city: 'Köln', country: 'DE' },
  { id: 'leipzig', name: 'SRH Leipzig', city: 'Leipzig', country: 'DE' },
  { id: 'leverkusen', name: 'SRH Leverkusen', city: 'Leverkusen', country: 'DE' },
  { id: 'munich', name: 'SRH München', city: 'München', country: 'DE' },
  { id: 'stuttgart', name: 'SRH Stuttgart', city: 'Stuttgart', country: 'DE' },
  { id: 'tuebingen', name: 'SRH Tübingen', city: 'Tübingen', country: 'DE' },
];

// ── Static Data: Schools (Departments) ────────────────────────────────────────
// Actual school-per-campus mappings from the official programme directors list.

const SCHOOL_LIST = [
  { id: 'aim', name: 'Artificial Intelligence & Machine Learning', shortName: 'AIM' },
  { id: 'bls', name: 'Business, Law & Sustainability', shortName: 'BLS' },
  { id: 'hes', name: 'Health & Environmental Sciences', shortName: 'HES' },
  { id: 'psy', name: 'Psychology & Behavioral Sciences', shortName: 'PSY' },
  { id: 'teac', name: 'Technology, Engineering & Computing', shortName: 'TEAC' },
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

/** True when the user has completed the initial setup */
export const isSetupComplete = derived(settingsStore, ($s) =>
  $s.campusId !== null
);
