<script lang="ts">
	import { updated } from '$app/stores';
	import { onMount } from 'svelte';
	
	let isDismissed = false;

	// Optional: Check for updates periodically (e.g. every hour)
	onMount(() => {
		const interval = setInterval(() => {
			updated.check();
		}, 60 * 60 * 1000);
		
		// Unsubscribe is handled by Svelte when component unmounts
		return () => clearInterval(interval);
	});

	function reload() {
		// When using the service worker or typical update flows, 
		// we just reload the page to get the freshest cache/document
		window.location.reload();
	}

	function dismiss() {
		isDismissed = true;
	}
</script>

{#if $updated && !isDismissed}
	<div class="update-banner" role="alert" aria-live="polite">
		<div class="banner-content">
			<span class="icon">🚀</span>
			<div>
				<p class="title">Update Available!</p>
				<p class="desc">A new version of Campusweb is ready.</p>
			</div>
		</div>
		<div class="banner-actions">
			<button class="update-btn" on:click={reload}>Refresh</button>
			<button class="dismiss-btn" on:click={dismiss} aria-label="Dismiss update">
				<i class="ph-bold ph-x"></i>
			</button>
		</div>
	</div>
{/if}

<style>
	.update-banner {
		position: fixed;
		bottom: calc(var(--bottom-nav-clearance, 24px) + env(safe-area-inset-bottom));
		left: 0;
		right: 0;
		background: var(--card-bg, #ffffff);
		color: var(--text-color, #1a1a1a);
		border-top: 4px solid var(--primary-color);
		box-shadow: 0 -4px 16px rgba(0,0,0,0.1);
		padding: 12px 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		z-index: 999;
		animation: slideUp 0.3s ease-out;
	}

	@media (prefers-color-scheme: dark) {
		.update-banner {
			background: #1a1a1a;
			box-shadow: 0 -4px 16px rgba(0,0,0,0.5);
			border-top-color: var(--primary-color);
		}
	}

	.banner-content {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.banner-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.icon {
		font-size: 20px;
	}

	.title {
		font-weight: 700;
		margin: 0 0 2px 0;
		font-size: 0.95rem;
	}

	.desc {
		margin: 0;
		font-size: 0.8rem;
		opacity: 0.8;
	}

	.update-btn {
		background: var(--primary-color, #D44407);
		color: white;
		border: none;
		padding: 6px 12px;
		border-radius: var(--radius-sm, 8px);
		font-weight: 600;
		cursor: pointer;
		font-size: 0.9rem;
		transition: transform 0.1s ease;
	}

	.update-btn:active {
		transform: scale(0.95);
	}

	.dismiss-btn {
		background: transparent;
		border: none;
		color: var(--text-color-secondary, #666);
		font-size: 1.2rem;
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: background-color 0.2s, color 0.2s;
	}

	.dismiss-btn:hover {
		background: var(--bg-color-secondary, rgba(0,0,0,0.05));
		color: var(--text-color, #1a1a1a);
	}

	@media (prefers-color-scheme: dark) {
		.dismiss-btn:hover {
			background: rgba(255,255,255,0.1);
		}
	}

	@keyframes slideUp {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}
</style>
