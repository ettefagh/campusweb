<script lang="ts">
    import { settingsStore } from '$lib/stores/settingsStore';
    import { isAllowedEmailDomain, normalizeEmail } from '$lib/config/auth';
    import { fade } from 'svelte/transition';

    let email = '';
    let pin = '';
    let error = '';
    let info = '';
    let hash = '';
    let expiresAt = 0;
    let isLoading = false;
    let step: 'email' | 'pin' = 'email';

    async function requestPin() {
        const normalizedEmail = normalizeEmail(email);
        error = '';
        info = '';

        if (!isAllowedEmailDomain(normalizedEmail)) {
            error = 'Enter your SRH email address to continue. We only use it to send this one-time verification PIN.';
            return;
        }

        isLoading = true;
        try {
            const response = await fetch('/api/auth/request-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalizedEmail })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Could not send a PIN.');
            }

            email = normalizedEmail;
            hash = data.hash;
            expiresAt = data.expiresAt;
            pin = '';
            step = 'pin';
            info = 'We sent a 6-digit PIN to your SRH email.';
        } catch (err: any) {
            error = err?.message || 'Could not send a PIN.';
        } finally {
            isLoading = false;
        }
    }

    async function verifyPin() {
        error = '';
        info = '';

        if (!/^\d{6}$/.test(pin.trim())) {
            error = 'Enter the 6-digit PIN from your email.';
            return;
        }

        isLoading = true;
        try {
            const response = await fetch('/api/auth/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    pin: pin.trim(),
                    hash,
                    expiresAt
                })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'The PIN could not be verified.');
            }

            settingsStore.patch({ emailVerified: true } as any);
            info = 'Your SRH access is active.';
        } catch (err: any) {
            error = err?.message || 'The PIN could not be verified.';
        } finally {
            isLoading = false;
        }
    }

    function resetFlow() {
        pin = '';
        hash = '';
        expiresAt = 0;
        step = 'email';
        error = '';
        info = '';
    }
</script>

<div class="email-gate-inline" transition:fade>
    {#if step === 'email'}
        <div class="gate-form">
            <input
                type="email"
                placeholder="Enter your SRH email"
                bind:value={email}
                on:keydown={(e) => e.key === 'Enter' && requestPin()}
                class="gate-input"
                disabled={isLoading}
            />
            <button class="gate-btn" on:click={requestPin} disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send PIN'}
            </button>
        </div>
    {:else}
        <div class="gate-form">
            <input
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                autocomplete="one-time-code"
                maxlength="6"
                placeholder="6-digit PIN"
                bind:value={pin}
                on:keydown={(e) => e.key === 'Enter' && verifyPin()}
                class="gate-input pin-input"
                disabled={isLoading}
            />
            <button class="gate-btn" on:click={verifyPin} disabled={isLoading}>
                {isLoading ? 'Checking...' : 'Verify'}
            </button>
        </div>
        <button class="gate-link" type="button" on:click={resetFlow}>Use a different email</button>
    {/if}
    {#if info}
        <p class="gate-info" transition:fade>{info}</p>
    {/if}
    {#if error}
        <p class="gate-error" transition:fade>{error}</p>
    {/if}
</div>

<style>
    .email-gate-inline {
        width: 100%;
    }
    .gate-form { 
        display: flex; 
        gap: var(--spacing-sm); 
        width: 100%; 
    }
    .gate-input {
        flex: 1; 
        padding: var(--spacing-sm) var(--spacing-md);
        border: 1px solid var(--border-color); 
        border-radius: var(--radius-sm);
        background: var(--bg-color); 
        color: var(--text-color); 
        font-size: 0.9rem;
    }
    .gate-btn {
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--primary-color); 
        color: white; 
        border: none;
        border-radius: var(--radius-sm); 
        font-weight: 600; 
        cursor: pointer;
        white-space: nowrap;
    }
    .gate-btn:disabled,
    .gate-input:disabled {
        opacity: 0.7;
        cursor: wait;
    }
    .pin-input {
        letter-spacing: 0.25em;
        font-weight: 700;
    }
    .gate-link {
        margin-top: var(--spacing-sm);
        padding: 0;
        border: none;
        background: transparent;
        color: var(--primary-color);
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 600;
    }
    .gate-info {
        color: var(--text-color-secondary);
        font-size: 0.85rem;
        margin-top: var(--spacing-sm);
    }
    .gate-error { 
        color: #ef4444; 
        font-size: 0.85rem; 
        margin-top: var(--spacing-sm); 
    }
    @media (max-width: 480px) {
        .gate-form {
            flex-direction: column;
        }
        .gate-btn {
            width: 100%;
        }
    }
</style>
