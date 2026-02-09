<script lang="ts">
	import { page } from '$app/stores';

	export let data;

	// Domains allowed to be displayed in the iframe
	const ALLOWED_DOMAINS = [
		'srh-community.campusweb.cloud',
		'moodle.srh.de',
		'srh-hochschule-heidelberg.de',
		'outlook.office.com',
		'tools.pdf24.org',
		'srh-berlin.idm.oclc.org',
		'srh-calendar-enhancer.padarhava.workers.dev',
		'srh-university.de',
		'www.srh-university.de',
		'srh.de',
		'www.srh.de',
		'ecampus.srh-university.de',
		'webopac.srh-hochschulen.de',
		'srh-store.de'
	];

	$: url = $page.url.searchParams.get('url');
	$: title = $page.url.searchParams.get('title');
	$: isValidUrl = url ? ALLOWED_DOMAINS.some(d => new URL(url!).hostname.endsWith(d)) : false;

	let isLoading = true;

	function handleIframeLoad() {
		isLoading = false;
	}

	function goBack() {
		if (window.history.length > 1) {
			window.history.back();
		} else {
			window.location.href = '/';
		}
	}
</script>

<svelte:head>
	<title>{title || 'Viewer'} - Campusweb</title>
</svelte:head>

<div class="viewer-page">
	<header class="viewer-header">
		<div class="header-left">
			<button class="back-btn" on:click={goBack} aria-label="Go back">
				← Back
			</button>
			<h1 class="viewer-title">{title || 'External Link'}</h1>
		</div>
		<div class="header-right">
			{#if url && isValidUrl}
				<a href={url} target="_blank" rel="noopener noreferrer" class="external-link">
					Open in Browser ↗
				</a>
			{/if}
		</div>
	</header>

	<main class="viewer-content">
		{#if isLoading && isValidUrl}
			<div class="loading-state">
				<div class="spinner"></div>
				<p>Loading...</p>
			</div>
		{/if}
		
		{#if url && isValidUrl}
			<iframe 
				src={url} 
				title={title || 'Content'}
				class:loaded={!isLoading}
				on:load={handleIframeLoad}
				sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
			></iframe>
		{:else}
			<div class="error-state">
				<p>Invalid or unauthorized URL provided</p>
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
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-xs) var(--spacing-sm);
		color: var(--text-color);
		text-decoration: none;
		font-weight: 500;
		font-size: 0.9rem;
		border-radius: var(--radius-sm);
		transition: background-color 0.2s;
		background: transparent;
		border: none;
		cursor: pointer;
	}
	
	.back-btn:hover {
		background-color: var(--hover-bg);
		color: var(--primary-color);
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
