/**
 * Centralised i18n translations for CampusWeb.
 *
 * Usage:
 *   import { t } from '$lib/i18n';
 *   import { settingsStore } from '$lib/stores/settingsStore';
 *   $: i = $t;   // reactive translations object
 *
 * All user-facing strings live here so switching language is instant.
 */

import { derived } from 'svelte/store';
import { settingsStore } from '$lib/stores/settingsStore';

// ── Translation dictionary ────────────────────────────────────────────────

const translations = {
  en: {
    // ── Nav ──
    nav: {
      home: 'Home',
      explore: 'Explore',
      calendar: 'Calendar',
      feed: 'Feed',
      settings: 'Settings',
    },

    // ── Home page ──
    home: {
      title: 'Campusweb',
      subtitle: 'Quick access to university resources',
      pageTitle: 'CampusWeb Pages - Quick Access to University Resources',
      searchPlaceholder: 'Search links…',
      emptyState: 'No favorites yet. Click Edit below to add some!',
      editFavorites: 'Edit Favorites',
      done: 'Done',
      universityLinks: 'University Links',
    },

    // ── Explore page ──
    explore: {
      title: '🧭 Explore & Search',
      subtitle: 'Discover all university resources and tools',
      pageTitle: 'Explore & Search - CampusWeb Pages',
      searchPlaceholder: 'Search resources…',
      noResults: 'No local resources found for',
      externalTitle: 'Search in External Portals',
      searchIn: 'Search',
      openCatalog: 'Open',
      catalog: 'Catalog',
      searchManually: 'Search manually for',
      clearSearch: 'Clear search',
    },

    // ── Calendar page ──
    calendar: {
      pageTitle: 'Calendar – CampusWeb Pages',
      title: 'Calendar',
      subtitle: 'University events and your schedule',
      today: 'Today',
      month: 'Month',
      week: 'Week',
      day: 'Day',
      list: 'List',
      prev: '←',
      next: '→',
      threeDays: '3 Days',
      loading: 'Loading calendar events…',
      noEvents: 'No events to display.',
      settings: 'Calendar Settings',
      addSubscription: 'Subscribe to Calendar',
      subscriptions: 'Subscriptions',
      remove: 'Remove',
      legend: 'Legend',
      eventDetails: 'Event Details',
      location: 'Location',
      time: 'Time',
      allDay: 'All day',
      close: 'Close',
      refresh: 'Refresh',
      openInMaps: 'Open in Maps',
      suggestImport: 'Add official schedule',
      suggestImportDesc: 'Would you like to add your department\'s official iCal feed?',
    },

    // ── Feed page ──
    feed: {
      pageTitle: 'Campus News | Campusweb',
      title: '📰 Campus News',
      subtitle: 'Latest updates from SRH University',
      instagramFeeds: '📸 Instagram Feeds',
      followSRH: '🌐 Follow SRH',
      readMore: 'Read more',
      universityDirectory: 'University Directory',
      phoneEmailAddress: 'Phone, email & address',
      contactTitle: '📞 SRH Contact',
      contactTitleDesktop: '📞 SRH Contact Information',
      close: 'Close',
      // News cards
      eventsTag: 'Events',
      eventsTitle: 'Upcoming University Events',
      eventsDesc: 'Explore workshops, career fairs, and cultural events hosted by SRH this semester.',
      newsTag: 'News',
      newsTitle: 'Latest Campus News',
      newsDesc: 'Stay up to date with announcements, research highlights, and campus updates.',
      merchTag: 'Merch',
      merchTitle: 'Official Brand Store',
      merchDesc: 'Grab official SRH merchandise — hoodies, notebooks, and more.',
      // Contacts
      phone: 'Phone',
      email: 'Email',
      address: 'Address',
    },

    // ── Settings page ──
    settings: {
      pageTitle: 'Settings – CampusWeb Pages',
      title: 'Settings',
      subtitle: 'Personalise your CampusWeb Pages experience',
      campusTitle: 'My Campus & Programme',
      campusDesc: 'Used to personalise your calendar with lecture-free periods and exam schedules',
      campusLabel: 'Campus',
      campusPlaceholder: 'Select your campus…',
      deptLabel: 'Major / Department',
      deptPlaceholder: 'Select your department…',
      campusReady: '✅ Campus calendar auto-import is ready',
      campusReadyNote: 'Go to Calendar → Add Subscription to import your department\'s schedule',
      languageTitle: 'Language',
      languageDesc: 'Controls the app\'s interface language',
      appearanceTitle: 'Appearance',
      appearanceDesc: 'Choose your preferred colour theme',
      themeAuto: 'Follow System',
      themeLight: 'Light',
      themeDark: 'Dark',
      calendarTitle: 'Calendar',
      calendarDesc: 'Adjust how your calendar looks and behaves',
      weekStartsOn: 'Week starts on',
      monday: 'Monday',
      sunday: 'Sunday',
      saturday: 'Saturday',
      autoImport: 'Auto-import campus calendar',
      autoImportDesc: 'Suggest adding your department\'s official iCal when you first open Calendar',
      a11yTitle: 'Accessibility',
      a11yDesc: 'Visual and interaction aids',
      reduceMotion: 'Reduce Motion',
      reduceMotionDesc: 'Disables animations and transitions',
      highContrast: 'High Contrast',
      highContrastDesc: 'Replaces glass effects with solid surfaces',
      largeText: 'Large Text',
      largeTextDesc: 'Increases base font size by ~20%',
      focusVisible: 'Always Show Focus',
      focusVisibleDesc: 'Shows keyboard focus rings at all times',
      screenReader: 'Screen Reader Hints',
      screenReaderDesc: 'Adds verbose ARIA labels',
      assistiveTextures: 'Colorblind Textures',
      assistiveTexturesDesc: 'Adds patterns and textures to distinguish states without relying on colour alone',
      resetTitle: 'Reset',
      resetDesc: 'Restore all settings to factory defaults',
      resetButton: 'Reset all settings…',
      resetConfirm: 'Are you sure? This will clear all your preferences.',
      resetYes: 'Yes, reset everything',
      resetCancel: 'Cancel',
      builtWith: 'CampusWeb Pages · Built with ❤️',
    },
  },

  de: {
    // ── Nav ──
    nav: {
      home: 'Start',
      explore: 'Erkunden',
      calendar: 'Kalender',
      feed: 'Neuigkeiten',
      settings: 'Einstellungen',
    },

    // ── Home page ──
    home: {
      title: 'Campusweb',
      subtitle: 'Schnellzugriff auf Universitätsressourcen',
      pageTitle: 'CampusWeb Pages – Schnellzugriff auf Uni-Ressourcen',
      searchPlaceholder: 'Links suchen…',
      emptyState: 'Noch keine Favoriten. Klicke unten auf Bearbeiten!',
      editFavorites: 'Favoriten bearbeiten',
      done: 'Fertig',
      universityLinks: 'Universitätslinks',
    },

    // ── Explore page ──
    explore: {
      title: '🧭 Erkunden & Suchen',
      subtitle: 'Alle Uni-Ressourcen und Tools entdecken',
      pageTitle: 'Erkunden & Suchen – CampusWeb Pages',
      searchPlaceholder: 'Ressourcen suchen…',
      noResults: 'Keine lokalen Ressourcen gefunden für',
      externalTitle: 'In externen Portalen suchen',
      searchIn: 'Suche in',
      openCatalog: 'Öffne',
      catalog: 'Katalog',
      searchManually: 'Manuell suchen nach',
      clearSearch: 'Suche leeren',
    },

    // ── Calendar page ──
    calendar: {
      pageTitle: 'Kalender – CampusWeb Pages',
      title: 'Kalender',
      subtitle: 'Uni-Veranstaltungen und dein Zeitplan',
      today: 'Heute',
      month: 'Monat',
      week: 'Woche',
      day: 'Tag',
      list: 'Liste',
      prev: '←',
      next: '→',
      threeDays: '3 Tage',
      loading: 'Kalenderereignisse werden geladen…',
      noEvents: 'Keine Ereignisse vorhanden.',
      settings: 'Kalendereinstellungen',
      addSubscription: 'Kalender abonnieren',
      subscriptions: 'Abonnements',
      remove: 'Entfernen',
      legend: 'Legende',
      eventDetails: 'Ereignisdetails',
      location: 'Ort',
      time: 'Uhrzeit',
      allDay: 'Ganztägig',
      close: 'Schließen',
      refresh: 'Aktualisieren',
      openInMaps: 'In Karten öffnen',
      suggestImport: 'Offiziellen Plan hinzufügen',
      suggestImportDesc: 'Möchtest du den offiziellen iCal-Feed deines Fachbereichs hinzufügen?',
    },

    // ── Feed page ──
    feed: {
      pageTitle: 'Campus Neuigkeiten | Campusweb',
      title: '📰 Campus Neuigkeiten',
      subtitle: 'Aktuelle Updates der SRH Universität',
      instagramFeeds: '📸 Instagram Feeds',
      followSRH: '🌐 SRH folgen',
      readMore: 'Weiterlesen',
      universityDirectory: 'Universitätsverzeichnis',
      phoneEmailAddress: 'Telefon, E-Mail & Adresse',
      contactTitle: '📞 SRH Kontakt',
      contactTitleDesktop: '📞 SRH Kontaktinformationen',
      close: 'Schließen',
      eventsTag: 'Veranstaltungen',
      eventsTitle: 'Kommende Uni-Veranstaltungen',
      eventsDesc: 'Entdecke Workshops, Karrieremessen und kulturelle Events der SRH.',
      newsTag: 'Nachrichten',
      newsTitle: 'Neueste Campus-Nachrichten',
      newsDesc: 'Bleibe auf dem Laufenden mit Ankündigungen, Forschung und Campus-Updates.',
      merchTag: 'Merch',
      merchTitle: 'Offizieller SRH-Shop',
      merchDesc: 'Offizielle SRH-Artikel – Hoodies, Notizbücher und mehr.',
      phone: 'Telefon',
      email: 'E-Mail',
      address: 'Adresse',
    },

    // ── Settings page ──
    settings: {
      pageTitle: 'Einstellungen – CampusWeb Pages',
      title: 'Einstellungen',
      subtitle: 'Personalisiere dein CampusHub-Erlebnis',
      campusTitle: 'Mein Campus & Studiengang',
      campusDesc: 'Wird verwendet, um deinen Kalender mit vorlesungsfreien Zeiten und Prüfungsterminen zu personalisieren',
      campusLabel: 'Campus',
      campusPlaceholder: 'Campus auswählen…',
      deptLabel: 'Studiengang / Fachbereich',
      deptPlaceholder: 'Fachbereich auswählen…',
      campusReady: '✅ Campus-Kalender kann automatisch importiert werden',
      campusReadyNote: 'Gehe zum Kalender → Abonnement hinzufügen, um den Stundenplan zu importieren',
      languageTitle: 'Sprache',
      languageDesc: 'Steuert die Sprache der App-Oberfläche',
      appearanceTitle: 'Darstellung',
      appearanceDesc: 'Wähle dein bevorzugtes Farbthema',
      themeAuto: 'Systemeinstellung',
      themeLight: 'Hell',
      themeDark: 'Dunkel',
      calendarTitle: 'Kalender',
      calendarDesc: 'Passe Darstellung und Verhalten deines Kalenders an',
      weekStartsOn: 'Woche beginnt am',
      monday: 'Montag',
      sunday: 'Sonntag',
      saturday: 'Samstag',
      autoImport: 'Campus-Kalender automatisch importieren',
      autoImportDesc: 'Offiziellen iCal-Feed deines Fachbereichs beim ersten Öffnen des Kalenders vorschlagen',
      a11yTitle: 'Barrierefreiheit',
      a11yDesc: 'Visuelle und Interaktionshilfen',
      reduceMotion: 'Bewegung reduzieren',
      reduceMotionDesc: 'Deaktiviert Animationen und Übergänge',
      highContrast: 'Hoher Kontrast',
      highContrastDesc: 'Ersetzt Glaseffekte durch solide Oberflächen',
      largeText: 'Großer Text',
      largeTextDesc: 'Erhöht die Basis-Schriftgröße um ~20%',
      focusVisible: 'Fokus immer anzeigen',
      focusVisibleDesc: 'Zeigt Tastatur-Fokusrahmen jederzeit an',
      screenReader: 'Screenreader-Hinweise',
      screenReaderDesc: 'Fügt ausführliche ARIA-Labels hinzu',
      assistiveTextures: 'Farbenblind-Texturen',
      assistiveTexturesDesc: 'Fügt Muster und Texturen hinzu, um Zustände ohne Farbabhängigkeit zu unterscheiden',
      resetTitle: 'Zurücksetzen',
      resetDesc: 'Alle Einstellungen auf Werkseinstellungen zurücksetzen',
      resetButton: 'Alle Einstellungen zurücksetzen…',
      resetConfirm: 'Bist du sicher? Alle Einstellungen werden gelöscht.',
      resetYes: 'Ja, alles zurücksetzen',
      resetCancel: 'Abbrechen',
      builtWith: 'CampusWeb Pages · Mit ❤️ gebaut',
    },
  },
} as const;

// ── Type helpers ──────────────────────────────────────────────────────────

export type Translations = (typeof translations)['en'];

// ── Derived reactive store ────────────────────────────────────────────────

/** Reactive translations object — use as `$t` in Svelte components */
export const t = derived(settingsStore, ($s) =>
  translations[$s.language] ?? translations.en
);
