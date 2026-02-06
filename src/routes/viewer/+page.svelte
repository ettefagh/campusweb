<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let url: string | null = null;
	let title: string | null = null;
	let isLoading = true;

	$: {
		url = $page.url.searchParams.get('url');
		title = $page.url.searchParams.get('title');
	}

	function handleIframeLoad() {
		isLoading = false;
	}
</script>

<svelte:head>
	<title>{title || 'Viewer'} - SRH Campus Hub</title>
</svelte:head>

<div class="viewer-page">
	<header class="viewer-header">
		<div class="header-left">
			<a href="/" class="back-btn" aria-label="Go back">
				← Is Back
			</a>
			<h1 class="viewer-title">{title || 'External Link'}</h1>
		</div>
		<div class="header-right">
			{#if url}
				<a href={url} target="_blank" rel="noopener noreferrer" class="external-link">
					Open in Browser ↗
				</a>
			{/if}
		</div>
	</header>

	<main class="viewer-content">
		{#if isLoading}
			<div class="loading-state">
				<div class="spinner"></div>
				<p>Loading...</p>
			</div>
		{/if}
		
		{#if url}
			<iframe 
				src={url} 
				title={title || 'Content'}
				class:loaded={!isLoading}
				on:load={handleIframeLoad}
				sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
			></iframe>
		{:else}
			<div class="error-state">
				<p>Invalid URL provided</p>
				<a href="/" class="btn">Return Home</a>
			</div>
		{/if}
	</main>
</div>

<style>
	.viewer-page {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--bg-color);
	}

	.viewer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-md);
		background: var(--card-bg);
		border-bottom: 1px solid var(--border-color);
		box-shadow: var(--shadow-sm);
		z-index: 10;
		height: 60px;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		flex: 1;
		min-width: 0;
	}

	.back-btn {
		text-decoration: none;
		color: var(--text-color);
		font-weight: 500;
		display: flex;
		align-items: center;
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-sm);
		transition: background 0.2s;
	}

	.back-btn:hover {
		background: rgba(0, 0, 0, 0.05);
	}

	.viewer-title {
		font-size: 1.1rem;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.external-link {
		font-size: 0.9rem;
		color: var(--primary-color);
		text-decoration: none;
	}

	.viewer-content {
		flex: 1;
		position: relative;
		overflow: hidden;
		background: #fff;
	}

	iframe {
		width: 100%;
		height: 100%;
		border: none;
		opacity: 0;
		transition: opacity 0.3s;
	}

	iframe.loaded {
		opacity: 1;
	}

	.loading-state, .error-state {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--border-color);
		border-top-color: var(--primary-color);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto var(--spacing-sm);
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	
	@media (prefers-color-scheme: dark) {
		.back-btn:hover {
			background: rgba(255, 255, 255, 0.1);
		}
	}
</style>
