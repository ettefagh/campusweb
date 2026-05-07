import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface IdCardData {
  id: string;
  title: string;          // e.g., "Student ID", "Semester Ticket", "Library Card"
  university: string;     // e.g., "SRH University"
  ownerName: string;      // Student Name
  dob: string;            // Date of Birth: "DD.MM.YYYY"
  idNumber: string;       // Matriculation/ID Number
  validUntil: string;     // Validity: "bis DD.MM.YYYY"
  theme: 'srh-orange' | 'liquid-dark' | 'emerald-glass' | 'sapphire-aurora';
  photo?: string;         // Base64 profile photo data-URL
  isFullImageCard?: boolean; // Whether front of the card is a uploaded full-face image
  fullImage?: string;     // Base64 full card image data-URL or static path
}

const STORAGE_KEY = 'campusweb_student_ids';

const DEFAULT_IDS: IdCardData[] = [];

function readFromStorage(): IdCardData[] {
  if (!browser) return [...DEFAULT_IDS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_IDS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...DEFAULT_IDS];
  } catch {
    return [...DEFAULT_IDS];
  }
}

function persist(cards: IdCardData[]): void {
  if (!browser) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch (e) {
    console.error('Failed to save ID cards to localStorage:', e);
  }
}

function createIdStore() {
  const { subscribe, set, update } = writable<IdCardData[]>(readFromStorage());

  return {
    subscribe,
    
    /** Add a new card */
    add(card: Omit<IdCardData, 'id'>): void {
      update((current) => {
        const newCard: IdCardData = {
          ...card,
          id: `card_${Date.now()}`
        };
        const next = [...current, newCard];
        persist(next);
        return next;
      });
    },

    /** Update an existing card */
    updateCard(id: string, updated: Partial<Omit<IdCardData, 'id'>>): void {
      update((current) => {
        const next = current.map((c) => (c.id === id ? { ...c, ...updated } : c));
        persist(next);
        return next;
      });
    },

    /** Remove a card */
    remove(id: string): void {
      update((current) => {
        const next = current.filter((c) => c.id !== id);
        persist(next);
        return next;
      });
    },

    /** Reset to default cards */
    reset(): void {
      persist(DEFAULT_IDS);
      set([...DEFAULT_IDS]);
    }
  };
}

export const idCardsStore = createIdStore();
