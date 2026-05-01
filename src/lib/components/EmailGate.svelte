<script lang="ts">
    import { settingsStore } from '$lib/stores/settingsStore';
    import { fade } from 'svelte/transition';
    import { t } from '$lib/i18n';

    let email = '';
    let error = '';

    const ALLOWED_DOMAINS = ['stud.srh-university.de', 'srh.de'];

    function verify() {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed.includes('@')) { error = 'Please enter a valid email.'; return; }
        const domain = trimmed.split('@')[1];
        if (ALLOWED_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) {
            settingsStore.patch({ emailVerified: true } as any);
            error = '';
        } else {
            error = 'Only @stud.srh-university.de or @srh.de emails are accepted.';
        }
    }
</script>

<div class="email-gate" transition:fade>
    <div class="gate-icon">🔒</div>
    <h3 class="gate-title">University Members Only</h3>
    <p class="gate-desc">Enter your SRH email to access the directory. Your email is only checked locally and never sent anywhere.</p>
    <div class="gate-form">
        <input
            type="email"
            placeholder="name@stud.srh-university.de"
            bind:value={email}
            on:keydown={(e) => e.key === 'Enter' && verify()}
            class="gate-input"
        />
        <button class="gate-btn" on:click={verify}>Verify</button>
    </div>
    {#if error}
        <p class="gate-error" transition:fade>{error}</p>
    {/if}
</div>

<style>
    .email-gate {
        text-align: center;
        padding: var(--spacing-xl) var(--spacing-lg);
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
    }
    .gate-icon { font-size: 2rem; margin-bottom: var(--spacing-sm); }
    .gate-title { font-size: 1.1rem; font-weight: 700; margin: 0 0 var(--spacing-xs); }
    .gate-desc { font-size: 0.85rem; color: var(--text-color-secondary); margin: 0 0 var(--spacing-md); line-height: 1.5; }
    .gate-form { display: flex; gap: var(--spacing-sm); max-width: 400px; margin: 0 auto; }
    .gate-input {
        flex: 1; padding: var(--spacing-sm) var(--spacing-md);
        border: 1px solid var(--border-color); border-radius: var(--radius-sm);
        background: var(--bg-color); color: var(--text-color); font-size: 0.9rem;
    }
    .gate-btn {
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--primary-color); color: white; border: none;
        border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;
        white-space: nowrap;
    }
    .gate-error { color: #ef4444; font-size: 0.85rem; margin-top: var(--spacing-sm); }
</style>
