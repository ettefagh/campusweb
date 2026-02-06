<script lang="ts">
	import LinkCard from '$lib/components/LinkCard.svelte';
	
	// This will be replaced with API call in Phase 4
	let favorites: any[] = [];
</script>

<svelte:head>
	<title>Favorites - SRH Campus Hub</title>
</svelte:head>

<div class="favorites-page">
	<header class="page-header">
		<h1>⭐ My Favorites</h1>
		<p class="subtitle">Quick access to your most-used resources</p>
	</header>
	
	{#if favorites.length === 0}
		<div class="empty-state">
			<span class="empty-icon">⭐</span>
			<h2>No favorites yet</h2>
			<p>Tap the star icon on any link to add it to your favorites</p>
			<a href="/" class="cta-button">Browse Links</a>
		</div>
	{:else}
		<section class="favorites-list">
			{#each favorites as link (link.id)}
				<LinkCard {link} isFavorite={true} />
			{/each}
		</section>
	{/if}
</div>

<style>
	.favorites-page {
		padding-bottom: var(--spacing-xl);
	}
	
	.page-header {
		padding: var(--spacing-lg) 0;
		border-bottom: 2px solid var(--border-color);
		margin-bottom: var(--spacing-lg);
	}
	
	h1 {
		margin-bottom: var(--spacing-sm);
	}
	
	.subtitle {
		color: #666;
		font-size: 1rem;
	}
	
	@media (prefers-color-scheme: dark) {
		.subtitle {
			color: #aaa;
		}
	}
	
	.empty-state {
		text-align: center;
		padding: var(--spacing-xl) var(--spacing-md);
		margin-top: var(--spacing-xl);
	}
	
	.empty-icon {
		font-size: 64px;
		display: block;
		margin-bottom: var(--spacing-md);
		opacity: 0.3;
	}
	
	.empty-state h2 {
		color: var(--text-color);
		margin-bottom: var(--spacing-sm);
	}
	
	.empty-state p {
		color: #666;
		margin-bottom: var(--spacing-lg);
	}
	
	@media (prefers-color-scheme: dark) {
		.empty-state p {
			color: #aaa;
		}
	}
	
	.cta-button {
		display: inline-block;
		padding: var(--spacing-md) var(--spacing-xl);
		background: var(--primary-color);
		color: white;
		border-radius: var(--radius-md);
		font-weight: 600;
		text-decoration: none;
		transition: all 0.2s;
		min-height: var(--touch-target-min);
		line-height: calc(var(--touch-target-min) - var(--spacing-md) * 2);
	}
	
	.cta-button:hover,
	.cta-button:focus-visible {
		background: var(--srh-orange-dark);
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}
</style>
