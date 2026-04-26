<script lang="ts">
    import { calendarStore, EVENT_COLORS } from '$lib/stores/calendarStore';
    import { fade, fly } from 'svelte/transition';

    let url = '';
    let name = '';
    let isSubmitting = false;
    let error = '';
    let loadingStatus = '';
    let showForm = false;

    async function handleSubmit() {
        if (!url) return;
        
        isSubmitting = true;
        error = '';
        loadingStatus = 'Preparing...';

        try {
            let finalUrl = url;
            

            loadingStatus = 'Fetching calendar data...';
            const success = await calendarStore.add(finalUrl, name || 'My Calendar');
            if (success) {
                loadingStatus = '';
                url = '';
                name = '';
                showForm = false;
            } else {
                error = 'Failed to add calendar. Please check the URL.';
            }
        } catch (e: any) {
            error = e?.message || 'An unexpected error occurred.';
        } finally {
            isSubmitting = false;
            loadingStatus = '';
        }
    }

    function resolveColor(color: string) {
        if (!color || !color.startsWith('var')) return color;
        if (typeof window === 'undefined') return '#000000';
        const varName = color.slice(4, -1);
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#000000';
    }

    let expandedSubs: Record<string, boolean> = {};
    let colorGridOpen: Record<string, boolean> = {};

    function toggleSub(id: string) {
        expandedSubs[id] = !expandedSubs[id];
    }

    function toggleColorGrid(id: string, e: Event) {
        e.stopPropagation();
        colorGridOpen[id] = !colorGridOpen[id];
        if (colorGridOpen[id]) {
            expandedSubs[id] = true;
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

            {#if loadingStatus}
                <div class="loading-status" transition:fade>
                    <span class="loading-dot"></span>
                    <span>{loadingStatus}</span>
                </div>
            {/if}

            <div class="form-actions">
                <button class="cancel-btn" on:click={() => { showForm = false; error = ''; }} disabled={isSubmitting}>
                    Cancel
                </button>
                <button class="submit-btn" on:click={handleSubmit} disabled={isSubmitting || !url}>
                    {isSubmitting ? loadingStatus || 'Adding...' : 'Subscribe'}
                </button>
            </div>
        </div>
    {/if}

    <div class="subscriptions-list">
        {#each $calendarStore as sub (sub.id)}
            <div class="subscription-item {expandedSubs[sub.id] ? 'expanded' : ''}" transition:fade>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div class="sub-header" on:click={() => toggleSub(sub.id)} role="button" tabindex="0">
                    <div class="sub-header-left">
                        <button 
                            class="current-color-circle" 
                            style="background-color: {sub.color || 'var(--primary-color)'};"
                            on:click={(e) => toggleColorGrid(sub.id, e)}
                            title="Change Color"
                            aria-label="Change Color"
                        ></button>
                        <span class="sub-name">{sub.name}</span>
                    </div>
                    <div class="sub-header-right">
                        <span class="chevron" class:open={expandedSubs[sub.id]}>▼</span>
                    </div>
                </div>
                
                {#if expandedSubs[sub.id]}
                    <div class="sub-settings" transition:fade>
                        <div class="setting-group flex-group">
                            <button class="remove-btn" on:click={(e) => { e.stopPropagation(); calendarStore.remove(sub.id); }} aria-label="Remove calendar">
                                🗑️ Remove Subscription
                            </button>
                        </div>
                        {#if colorGridOpen[sub.id]}
                            <div class="setting-group" transition:fade>
                                <span class="setting-label">Select Color</span>
                                <div class="color-grid">
                                    {#each EVENT_COLORS as color}
                                        <button 
                                            class="color-circle" 
                                            style="background-color: {color.id};"
                                            class:selected={sub.color === color.id}
                                            on:click={() => { calendarStore.updateSubscriptionColor(sub.id, color.id); colorGridOpen[sub.id] = false; }}
                                            title={color.id.replace('var(--event-', '').replace(')', '')}
                                        ></button>
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        <div class="sub-footer">
                            <span class="sub-status">
                                Last synced: {new Date(sub.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    </div>
                {/if}
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

    .subscription-item {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        margin-bottom: var(--spacing-sm);
        overflow: hidden;
        transition: all 0.2s;
    }

    .subscription-item:hover {
        border-color: var(--primary-color);
    }

    .sub-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-sm) var(--spacing-md);
        cursor: pointer;
        background: rgba(0,0,0,0.02);
    }
    
    .sub-header:hover {
        background: rgba(0,0,0,0.04);
    }
    
    .sub-header-left {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
    }

    .current-color-circle {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 1px solid rgba(0,0,0,0.1);
        cursor: pointer;
        padding: 0;
        transition: transform 0.2s;
    }
    
    .current-color-circle:hover {
        transform: scale(1.2);
    }

    .sub-header-right {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
    }

    .chevron {
        font-size: 0.8rem;
        transition: transform 0.3s ease;
        opacity: 0.6;
    }
    
    .chevron.open {
        transform: rotate(180deg);
    }

    .sub-settings {
        padding: var(--spacing-md);
        border-top: 1px solid var(--border-color);
        background: var(--card-bg);
    }

    .setting-group {
        margin-bottom: var(--spacing-md);
    }
    
    .flex-group {
        display: flex;
        justify-content: flex-end;
    }

    .setting-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-color-secondary);
    }

    .color-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .color-circle {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.2s;
        padding: 0;
    }

    .color-circle.selected {
        border-color: var(--text-color);
        transform: scale(1.15);
        box-shadow: 0 0 0 2px var(--bg-color), 0 0 0 4px var(--text-color);
    }



    .sub-footer {
        display: flex;
        justify-content: flex-end;
    }

    .sub-name {
        font-weight: 500;
    }

    .sub-status {
        font-size: 0.75rem;
        color: var(--text-color-secondary);
    }

    .remove-btn {
        background: rgba(255, 59, 48, 0.1);
        color: #ff3b30;
        border: 1px solid rgba(255, 59, 48, 0.2);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 0.8rem;
        transition: all 0.2s;
        padding: 4px 12px;
    }

    .remove-btn:hover {
        background: rgba(255, 59, 48, 0.2);
    }

    .secure-input {
        -webkit-text-security: disc;
        font-family: text-security-disc; /* Fallback */
    }

    .loading-status {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        background: rgba(16, 185, 129, 0.08);
        border: 1px solid rgba(16, 185, 129, 0.2);
        border-radius: var(--radius-sm);
        font-size: 0.85rem;
        color: var(--text-color);
        margin-bottom: var(--spacing-md);
    }

    .loading-dot {
        width: 8px;
        height: 8px;
        background: #10b981;
        border-radius: 50%;
        animation: pulse 1s ease-in-out infinite;
        flex-shrink: 0;
    }

    @keyframes pulse {
        0%, 100% { opacity: 0.4; transform: scale(0.8); }
        50% { opacity: 1; transform: scale(1.2); }
    }
</style>
