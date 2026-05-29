<script lang="ts">
	import { toast } from '$lib/stores/toastStore';
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';
</script>

<div class="toast-container">
	{#each $toast as t (t.id)}
		<div
			class="toast {t.type}"
			animate:flip={{ duration: 300 }}
			in:fly={{ y: 20, duration: 300 }}
			out:fade={{ duration: 200 }}
			role="alert"
			aria-live="polite"
		>
			<div class="toast-icon">
				{#if t.type === 'success'}
					<i class="ph-bold ph-check-circle" aria-hidden="true"></i>
				{:else if t.type === 'error'}
					<i class="ph-bold ph-warning-circle" aria-hidden="true"></i>
				{:else}
					<i class="ph-bold ph-info" aria-hidden="true"></i>
				{/if}
			</div>
			<div class="toast-message">{t.message}</div>
			<!-- Using Undo could be handled by the caller, for now a manual dismiss X -->
			<button class="toast-close" type="button" aria-label="Dismiss toast" on:click={() => toast.dismiss(t.id)}>
				<i class="ph-bold ph-x" aria-hidden="true"></i>
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: calc(var(--bottom-nav-clearance, 24px) + 24px);
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		gap: 8px;
		z-index: 9999;
		pointer-events: none;
		align-items: center;
	}

	.toast {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 280px;
		max-width: 90vw;
		padding: 12px 16px;
		border-radius: 12px;
		background: var(--surface-solid, var(--bg-color, #ffffff));
		color: var(--text-color, #1a1a1a);
		border-left: 4px solid var(--primary-color);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
		border-top: 1px solid var(--border-color, rgba(0,0,0,0.05));
		border-right: 1px solid var(--border-color, rgba(0,0,0,0.05));
		border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.05));
	}

	.toast.success {
		border-left-color: #10b981;
	}
	.toast.success .toast-icon {
		color: #10b981;
	}

	.toast.error {
		border-left-color: #ef4444;
	}
	.toast.error .toast-icon {
		color: #ef4444;
	}

	.toast.info {
		border-left-color: #3b82f6;
	}
	.toast.info .toast-icon {
		color: #3b82f6;
	}

	.toast-icon {
		font-size: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.toast-message {
		flex: 1;
		font-size: 0.9rem;
		font-weight: 500;
		line-height: 1.4;
	}

	.toast-close {
		background: transparent;
		border: none;
		color: var(--text-color-secondary, #666);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: background-color 0.2s, color 0.2s;
	}

	.toast-close:hover {
		background: var(--bg-color-secondary, rgba(0,0,0,0.05));
		color: var(--text-color, #1a1a1a);
	}

	@media (prefers-color-scheme: dark) {
		.toast {
			background: var(--surface-solid, #1e1e1e);
			box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
			border-color: rgba(255, 255, 255, 0.1);
		}
		.toast-close:hover {
			background: rgba(255,255,255,0.1);
		}
	}
</style>
