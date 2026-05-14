/**
 * Accessibility Settings Store
 *
 * Each setting is a boolean toggle persisted to localStorage.
 * The store applies CSS class names to `document.documentElement`
 * (the <html> element) via the root layout — CSS then reacts to those
 * classes without any prop-drilling or polling.
 *
 * Future settings UI: simply import and call `accessibility.toggle(key)`.
 *
 * Keys match the CSS classes they activate:
 *   reduceMotion     → html.a11y-reduce-motion
 *   highContrast     → html.a11y-high-contrast
 *   largeText        → html.a11y-large-text
 *   focusVisible     → html.a11y-focus-visible
 *   screenReaderHints→ html.a11y-screen-reader
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AccessibilitySettings {
  /** Disables all animations and CSS transitions */
  reduceMotion: boolean;
  /** Maximises contrast — replaces glass with solid opaque surfaces */
  highContrast: boolean;
  /** Scales root font-size up by ~20% */
  largeText: boolean;
  /** Always shows focus rings, not only on keyboard navigation */
  focusVisible: boolean;
  /** Adds verbose aria-label / aria-describedby hints for screen readers */
  screenReaderHints: boolean;
  /** Adds visual textures/patterns to help distinguish states (e.g. in LinkCard edit mode) */
  assistivePatterns: boolean;
}

// Maps each setting key → the CSS class applied to <html>
export const A11Y_CLASS_MAP: Record<keyof AccessibilitySettings, string> = {
  reduceMotion: 'a11y-reduce-motion',
  highContrast: 'a11y-high-contrast',
  largeText: 'a11y-large-text',
  focusVisible: 'a11y-focus-visible',
  screenReaderHints: 'a11y-screen-reader',
  assistivePatterns: 'a11y-assistive-patterns',
};

// Maps each setting key → the localStorage key
const STORAGE_KEYS: Record<keyof AccessibilitySettings, string> = {
  reduceMotion: 'a11y_reduceMotion',
  highContrast: 'a11y_highContrast',
  largeText: 'a11y_largeText',
  focusVisible: 'a11y_focusVisible',
  screenReaderHints: 'a11y_screenReaderHints',
  assistivePatterns: 'a11y_assistivePatterns',
};

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AccessibilitySettings = {
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  focusVisible: false,
  screenReaderHints: true,
  assistivePatterns: false,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function readFromStorage(): AccessibilitySettings {
  if (!browser) return { ...DEFAULT_SETTINGS };

  const settings = { ...DEFAULT_SETTINGS };

  for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof AccessibilitySettings>) {
    const stored = localStorage.getItem(STORAGE_KEYS[key]);
    if (stored !== null) {
      settings[key] = stored === 'true';
    } else {
      // Respect OS-level preferences as initial defaults
      if (key === 'reduceMotion' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        settings[key] = true;
      }
    }
  }

  return settings;
}

function persistToStorage(settings: AccessibilitySettings): void {
  if (!browser) return;
  for (const key of Object.keys(settings) as Array<keyof AccessibilitySettings>) {
    localStorage.setItem(STORAGE_KEYS[key], String(settings[key]));
  }
}

// ── Store Factory ─────────────────────────────────────────────────────────────

function createAccessibilityStore() {
  const { subscribe, set, update } = writable<AccessibilitySettings>(readFromStorage());

  return {
    subscribe,

    /**
     * Toggle a single accessibility feature on or off.
     * Usage (future settings UI): accessibility.toggle('reduceMotion')
     */
    toggle(key: keyof AccessibilitySettings): void {
      update((current) => {
        const next = { ...current, [key]: !current[key] };
        persistToStorage(next);
        return next;
      });
    },

    /**
     * Set a single accessibility feature to an explicit value.
     * Usage: accessibility.set('highContrast', true)
     */
    setFeature(key: keyof AccessibilitySettings, value: boolean): void {
      update((current) => {
        const next = { ...current, [key]: value };
        persistToStorage(next);
        return next;
      });
    },

    /**
     * Reset all settings to defaults and clear localStorage.
     */
    reset(): void {
      set({ ...DEFAULT_SETTINGS });
      if (browser) {
        for (const storageKey of Object.values(STORAGE_KEYS)) {
          localStorage.removeItem(storageKey);
        }
      }
    },
  };
}

export const accessibility = createAccessibilityStore();

// ── Derived: Active HTML classes ──────────────────────────────────────────────

/**
 * Returns the list of CSS class names that should be active on <html>.
 * The root layout subscribes to this to apply/remove classes efficiently.
 */
export const activeA11yClasses = derived(accessibility, ($settings) =>
  (Object.keys($settings) as Array<keyof AccessibilitySettings>)
    .filter((key) => $settings[key])
    .map((key) => A11Y_CLASS_MAP[key])
);
