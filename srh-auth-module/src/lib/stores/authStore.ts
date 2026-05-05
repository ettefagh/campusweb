import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { AccountInfo } from '@azure/msal-browser';
import type { FormSubmissionResult } from '../services/authService';

export interface AuthState {
  isAuthenticated: boolean;
  isVerifying: boolean;
  isGuest: boolean;
  account: AccountInfo | null;
  isValidDomain: boolean;
  formSubmitted: boolean;
  submissionDetails: FormSubmissionResult | null;
  error: string | null;
}

const DEFAULT_AUTH_STATE: AuthState = {
  isAuthenticated: false,
  isVerifying: false,
  isGuest: false,
  account: null,
  isValidDomain: false,
  formSubmitted: false,
  submissionDetails: null,
  error: null,
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(DEFAULT_AUTH_STATE);

  return {
    subscribe,
    setVerifying: (isVerifying: boolean) => update(s => ({ ...s, isVerifying })),
    setGuestMode: () => update(s => ({
      ...s,
      isGuest: true,
      isAuthenticated: false,
      isValidDomain: false,
      formSubmitted: false,
      error: null
    })),
    setAuth: (account: AccountInfo, isValidDomain: boolean) => update(s => ({
      ...s,
      isAuthenticated: true,
      isGuest: false,
      account,
      isValidDomain,
      error: null
    })),
    setFormSubmission: (result: FormSubmissionResult) => update(s => ({
      ...s,
      formSubmitted: result.submitted,
      submissionDetails: result.submitted ? result : null
    })),
    setError: (error: string) => update(s => ({ ...s, error, isVerifying: false })),
    logout: () => set(DEFAULT_AUTH_STATE),
    reset: () => set(DEFAULT_AUTH_STATE)
  };
}

export const authStore = createAuthStore();
