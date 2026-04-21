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
  /** Whether to auto-add the selected campus/department's official iCal on first setup */
  autoImportCampusCalendar: boolean;
  /** Compact card layout on home page */
  compactCards: boolean;
  /** Show seconds in time displays */
  showSeconds: boolean;
}

// ── Static Data: Campuses ─────────────────────────────────────────────────────

export const CAMPUSES: Campus[] = [
  {
    id: 'heidelberg',
    name: 'SRH Hochschule Heidelberg',
    city: 'Heidelberg',
    country: 'DE',
    calendarBaseUrl: 'https://www.srh-university.de',
  },
  {
    id: 'berlin',
    name: 'SRH Berlin University of Applied Sciences',
    city: 'Berlin',
    country: 'DE',
    calendarBaseUrl: 'https://www.srh-university.de',
  },
  {
    id: 'hamburg',
    name: 'SRH Hamburg',
    city: 'Hamburg',
    country: 'DE',
  },
  {
    id: 'gera',
    name: 'SRH Gera',
    city: 'Gera',
    country: 'DE',
  },
  {
    id: 'dresden',
    name: 'SRH Dresden',
    city: 'Dresden',
    country: 'DE',
  },
];

// ── Static Data: Departments ──────────────────────────────────────────────────
// Each department is linked to a campus via campusId.
// The icalUrl would point to the department's official iCal feed for
// free-lecture periods and exam schedules.

export const DEPARTMENTS: Department[] = [
  // Berlin Campus
  {
    id: 'leac_berlin',
    campusId: 'berlin',
    name: 'Leadership, Entrepreneurship & Applied Consulting',
    shortName: 'LEAC',
  },
  {
    id: 'cs_berlin',
    campusId: 'berlin',
    name: 'Computer Science & Digital Media',
    shortName: 'CS & DM',
  },
  {
    id: 'business_berlin',
    campusId: 'berlin',
    name: 'Business & Management',
    shortName: 'Business',
  },
  {
    id: 'design_berlin',
    campusId: 'berlin',
    name: 'Design',
    shortName: 'Design',
  },
  {
    id: 'health_berlin',
    campusId: 'berlin',
    name: 'Health Sciences',
    shortName: 'Health',
  },
  {
    id: 'law_berlin',
    campusId: 'berlin',
    name: 'Law',
    shortName: 'Law',
  },
  // Heidelberg Campus
  {
    id: 'medicine_hd',
    campusId: 'heidelberg',
    name: 'Medicine & Health Sciences',
    shortName: 'Medicine',
  },
  {
    id: 'engineering_hd',
    campusId: 'heidelberg',
    name: 'Engineering & Architecture',
    shortName: 'Engineering',
  },
  {
    id: 'business_hd',
    campusId: 'heidelberg',
    name: 'Business & Law',
    shortName: 'Business & Law',
  },
  {
    id: 'therapy_hd',
    campusId: 'heidelberg',
    name: 'Therapy Sciences',
    shortName: 'Therapy',
  },
  // Hamburg Campus
  {
    id: 'aviation_hh',
    campusId: 'hamburg',
    name: 'Aviation Management & Logistics',
    shortName: 'Aviation',
  },
  {
    id: 'business_hh',
    campusId: 'hamburg',
    name: 'Business Administration',
    shortName: 'Business',
  },
  // Gera Campus
  {
    id: 'engineering_gera',
    campusId: 'gera',
    name: 'Engineering',
    shortName: 'Engineering',
  },
  {
    id: 'health_gera',
    campusId: 'gera',
    name: 'Health Sciences',
    shortName: 'Health',
  },
  // Dresden Campus
  {
    id: 'therapy_dd',
    campusId: 'dresden',
    name: 'Therapy & Social Sciences',
    shortName: 'Therapy',
  },
];

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  theme: 'auto',
  campusId: null,
  departmentId: null,
  weekStartsOn: 1, // Monday
  autoImportCampusCalendar: true,
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
