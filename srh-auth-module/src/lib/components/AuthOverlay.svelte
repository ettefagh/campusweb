<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../stores/authStore';
  import { loginAndVerifyDomain, checkFormSubmission, mapCampusName, mapSchoolName } from '../services/authService';
  import { settingsStore } from '../stores/settingsStore';
  import { fade } from 'svelte/transition';

  let loading = false;

  async function handleLogin() {
    loading = true;
    try {
      const { account, isValidDomain } = await loginAndVerifyDomain();
      authStore.setAuth(account, isValidDomain);

      if (isValidDomain) {
        const submission = await checkFormSubmission(account);
        authStore.setFormSubmission(submission);
        
        if (submission.submitted) {
          const campusId = mapCampusName(submission.campus);
          const schoolId = mapSchoolName(submission.school);
          
          settingsStore.patch({ 
            emailVerified: true,
            campusId: campusId || undefined,
            departmentId: (schoolId && campusId) ? `${schoolId}_${campusId}` : undefined,
            programName: submission.department || undefined
          });
        }
      }
    } catch (error: any) {
      console.error(error);
      authStore.setError(error.message || 'Authentication failed');
    } finally {
      loading = false;
    }
  }

  function redirectToForm() {
    window.open("https://forms.office.com/Pages/ResponsePage.aspx?id=xEhweA7ORkSB4C-gUk7HAj29HcvyEQJMqbcbYt3mCBRUQUUxSTZDNFoxSVBER1RQSkI1UklVSldTMi4u&r8810f9c9020241dcb1ff4348e073fe03=%22Berlin%22&r9dc6871ecac84e1e8714c4006d520958=%22SRH%20School%20of%20Technology%2C%20Engineering%2C%20Architecture%20%26%20Construction%20(TEAC)%22&r02ff4412a873401a898abf3acfd5f62e=%22%5BTEAC%5D%20Computer%20Science%20(B.Sc.)%22", "_blank");
  }

  function handleGuestMode() {
    authStore.setGuestMode();
  }

  // Auto-login attempt on mount if we have accounts
  onMount(async () => {
    // We could try silent login here
  });
</script>

{#if (!$authStore.isAuthenticated || !$authStore.isValidDomain || !$authStore.formSubmitted) && !$authStore.isGuest}
  <div class="auth-overlay" transition:fade>
    <div class="auth-card">
      <div class="logo">
        <span class="hub-icon">🎓</span>
        <h1>CampusWeb</h1>
      </div>

      {#if !$authStore.isAuthenticated}
        <p class="description">Welcome to the student portal. Please sign in with your university account to continue.</p>
        <button class="btn primary" on:click={handleLogin} disabled={loading}>
          {#if loading}
            <span class="spinner"></span> Signing in...
          {:else}
            Sign in with Microsoft
          {/if}
        </button>
        <button class="btn ghost" on:click={handleGuestMode} disabled={loading}>
          Let's try first (Guest)
        </button>
      {:else if !$authStore.isValidDomain}
        <div class="error-state">
          <span class="icon">⛔</span>
          <h2>Access Denied</h2>
          <p>Only <strong>@stud.srh-university.de</strong> accounts are permitted.</p>
          <button class="btn secondary" on:click={() => authStore.logout()}>Sign out</button>
        </div>
      {:else if !$authStore.formSubmitted}
        <div class="form-state">
          <span class="icon">📝</span>
          <h2>Registration Required</h2>
          <p>You're authenticated as <strong>{$authStore.account?.username}</strong>, but you haven't completed the registration form yet.</p>
          <div class="actions">
            <button class="btn primary" on:click={redirectToForm}>Open Registration Form</button>
            <button class="btn secondary" on:click={handleLogin} disabled={loading}>
              {#if loading}
                <span class="spinner"></span> Checking...
              {:else}
                I've submitted the form
              {/if}
            </button>
          </div>
        </div>
      {/if}

      {#if $authStore.error}
        <p class="error-msg">{$authStore.error}</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .auth-overlay {
    position: fixed;
    inset: 0;
    background: rgba(var(--bg-color-rgb, 255, 255, 255), 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: var(--spacing-lg);
  }

  .auth-card {
    background: var(--card-bg);
    padding: var(--spacing-xl);
    border-radius: 24px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    max-width: 400px;
    width: 100%;
    text-align: center;
    border: 1px solid var(--border-color);
  }

  .logo {
    margin-bottom: var(--spacing-xl);
  }

  .hub-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: var(--spacing-xs);
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 800;
    margin: 0;
    background: linear-gradient(135deg, var(--primary-color), #6366f1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  h2 {
    font-size: 1.25rem;
    font-weight: 700;
    margin-top: 0;
  }

  .description {
    color: var(--text-color-secondary);
    font-size: 0.95rem;
    line-height: 1.5;
    margin-bottom: var(--spacing-xl);
  }

  .btn {
    width: 100%;
    padding: 14px;
    border-radius: 14px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .btn.primary {
    background: var(--primary-color);
    color: white;
  }

  .btn.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(var(--primary-color-rgb), 0.3);
  }

  .btn.secondary {
    background: var(--hover-bg);
    color: var(--text-color);
    margin-top: var(--spacing-md);
  }

  .btn.ghost {
    background: transparent;
    color: var(--text-color-secondary);
    margin-top: var(--spacing-sm);
    text-decoration: underline;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .btn.ghost:hover {
    color: var(--primary-color);
  }

  .btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .icon {
    font-size: 2.5rem;
    display: block;
    margin-bottom: var(--spacing-md);
  }

  .error-msg {
    color: #ef4444;
    font-size: 0.85rem;
    margin-top: var(--spacing-lg);
    background: rgba(239, 68, 68, 0.1);
    padding: 10px;
    border-radius: 8px;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
