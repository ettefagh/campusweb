<script lang="ts">
	import { updated } from '$app/stores';
	import { onMount } from 'svelte';
	
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
</script>

{#if $updated}
	<div class="update-toast">
		<div class="toast-content">
			<span class="icon">🚀</span>
			<div>
				<p class="title">Update Available!</p>
				<p class="desc">A new version of Campusweb is ready.</p>
			</div>
		</div>
		<button class="update-btn" on:click={reload}>Refresh</button>
	</div>
{/if}

<style>
	.update-toast {
		position: fixed;
		bottom: calc(env(safe-area-inset-bottom) + 80px); /* Just above bottom nav usually */
		left: 50%;
		transform: translateX(-50%);
		background: var(--card-bg, #ffffff);
		color: var(--text-color, #1a1a1a);
		border-left: 4px solid var(--primary-color);
		box-shadow: 0 10px 25px rgba(0,0,0,0.15);
		border-radius: var(--radius-md, 12px);
		padding: var(--spacing-md, 16px);
		display: flex;
		align-items: center;
		gap: var(--spacing-md, 16px);
		z-index: 100;
		min-width: 320px;
		max-width: 90vw;
		border-top: 1px solid var(--border-color);
		border-right: 1px solid var(--border-color);
		border-bottom: 1px solid var(--border-color);
	}

	@media (prefers-color-scheme: dark) {
		.update-toast {
			box-shadow: 0 10px 25px rgba(0,0,0,0.5);
			background: #2a2a2a; 
			color: #f5f5f5;
			border-top-color: #444;
			border-right-color: #444;
			border-bottom-color: #444;
		}
	}

	.toast-content {
		display: flex;
		align-items: center;
		flex: 1;
		gap: 12px;
	}

	.icon {
		font-size: 24px;
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
		padding: 8px 16px;
		border-radius: var(--radius-sm, 8px);
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.1s ease;
	}

	.update-btn:active {
		transform: scale(0.95);
	}
</style>
