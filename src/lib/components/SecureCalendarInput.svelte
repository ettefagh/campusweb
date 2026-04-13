<script lang="ts">
    import { calendarStore } from '$lib/stores/calendarStore';
    import { fade, fly } from 'svelte/transition';

    let url = '';
    let name = '';
    let isSubmitting = false;
    let error = '';
    let showForm = false;

    async function handleSubmit() {
        if (!url) return;
        
        isSubmitting = true;
        error = '';

        try {
            let finalUrl = url;
            
            // Auto-enhance SRH campus web URLs using the calendar enhancer API
            if (finalUrl.includes('srh-community.campusweb.cloud')) {
                try {
                    const response = await fetch(`https://calendarsub.padarhava.workers.dev/api/generate?url=${encodeURIComponent(finalUrl)}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.enhancedUrl) {
                            finalUrl = data.enhancedUrl;
                        }
                    }
                } catch (err) {
                    console.warn("Failed to automatically enhance calendar URL:", err);
                    // Fall back to the original URL if enhancement fails
                }
            }

            const success = await calendarStore.add(finalUrl, name || 'My Calendar');
            if (success) {
                url = '';
                name = '';
                showForm = false;
            } else {
                error = 'Failed to add calendar. Please check the URL.';
            }
        } catch (e) {
            error = 'An unexpected error occurred.';
        } finally {
            isSubmitting = false;
        }
    }
</script>

<div class="calendar-subscription">
    {#if !showForm}
        <button class="add-btn" on:click={() => showForm = true}>
            <span class="icon">➕</span> Add Calendar Subscription
        </button>
    {:else}
        <div class="subscription-form" transition:fly={{ y: 20, duration: 300 }}>
            <h3>Subscribe to Calendar</h3>
            
            <div class="form-group">
                <label for="cal-name">Calendar Name (Optional)</label>
                <input 
                    type="text" 
                    id="cal-name" 
                    placeholder="e.g. My Class Schedule" 
                    bind:value={name}
                    class="input-field"
                />
            </div>

            <div class="form-group">
                <label for="cal-url">iCal URL</label>
                <div class="url-input-wrapper">
                    <input 
                        type="text" 
                        id="cal-url" 
                        placeholder="https://example.com/calendar.ics" 
                        bind:value={url}
                        class="input-field url-input secure-input"
                        autocomplete="off"
                        autocorrect="off"
                        autocapitalize="off"
                        spellcheck="false"
                    />
                    <span class="lock-icon">🔒</span>
                </div>
                <p class="help-text">URL is stored locally on your device.</p>
            </div>

            {#if error}
                <p class="error-message" transition:fade>{error}</p>
            {/if}

            <div class="form-actions">
                <button class="cancel-btn" on:click={() => { showForm = false; error = ''; }} disabled={isSubmitting}>
                    Cancel
                </button>
                <button class="submit-btn" on:click={handleSubmit} disabled={isSubmitting || !url}>
                    {isSubmitting ? 'Adding...' : 'Subscribe'}
                </button>
            </div>
        </div>
    {/if}

    <div class="subscriptions-list">
        {#each $calendarStore as sub (sub.id)}
            <div class="subscription-item" transition:fade>
                <div class="sub-info">
                    <span class="sub-color" style="background-color: {sub.color}"></span>
                    <span class="sub-name">{sub.name}</span>
                    <span class="sub-status" title="Last updated">
                        Updated: {new Date(sub.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
                <button class="remove-btn" on:click={() => calendarStore.remove(sub.id)} aria-label="Remove calendar">
                    🗑️
                </button>
            </div>
        {/each}
    </div>
</div>

<style>
    .calendar-subscription {
        max-width: 600px;
        margin: 0 auto;
        padding: var(--spacing-md);
    }

    .add-btn {
        width: 100%;
        padding: var(--spacing-md);
        background: var(--card-bg);
        border: 2px dashed var(--border-color);
        border-radius: var(--radius-md);
        color: var(--text-color-secondary);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-sm);
    }

    .add-btn:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
        background: rgba(212, 68, 7, 0.05);
    }

    .subscription-form {
        background: var(--card-bg);
        padding: var(--spacing-lg);
        border-radius: var(--radius-md);
        border: 1px solid var(--border-color);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    h3 {
        margin-top: 0;
        margin-bottom: var(--spacing-md);
        font-size: 1.1rem;
    }

    .form-group {
        margin-bottom: var(--spacing-md);
    }

    label {
        display: block;
        margin-bottom: var(--spacing-xs);
        font-weight: 500;
        font-size: 0.9rem;
    }

    .input-field {
        width: 100%;
        padding: var(--spacing-sm) var(--spacing-md);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        background: var(--bg-color);
        color: var(--text-color);
        font-size: 0.95rem;
    }

    .url-input-wrapper {
        position: relative;
    }

    .url-input {
        padding-right: 2.5rem;
    }

    .lock-icon {
        position: absolute;
        right: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1rem;
        pointer-events: none;
    }

    .help-text {
        font-size: 0.8rem;
        color: var(--text-color-secondary);
        margin-top: 0.25rem;
    }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-sm);
        margin-top: var(--spacing-lg);
    }

    .submit-btn, .cancel-btn {
        padding: 0.5rem 1rem;
        border-radius: var(--radius-sm);
        font-weight: 500;
        cursor: pointer;
        border: none;
    }

    .submit-btn {
        background: var(--primary-color);
        color: white;
    }
    
    .submit-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .cancel-btn {
        background: transparent;
        color: var(--text-color);
        border: 1px solid var(--border-color);
    }

    .error-message {
        color: #ef4444;
        font-size: 0.9rem;
        margin-bottom: var(--spacing-md);
    }

    .subscriptions-list {
        margin-top: var(--spacing-lg);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }

    .subscription-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
    }

    .sub-info {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
    }

    .sub-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
    }

    .sub-name {
        font-weight: 500;
    }

    .sub-status {
        font-size: 0.75rem;
        color: var(--text-color-secondary);
        margin-left: var(--spacing-sm);
    }

    .remove-btn {
        background: none;
        border: none;
        cursor: pointer;
        opacity: 0.6;
        transition: opacity 0.2s;
        padding: 4px;
    }

    .remove-btn:hover {
        opacity: 1;
    }

    .secure-input {
        -webkit-text-security: disc;
        font-family: text-security-disc; /* Fallback */
    }
</style>
