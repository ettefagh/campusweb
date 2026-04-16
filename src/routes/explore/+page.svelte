<script lang="ts">
	import LinkCard from "$lib/components/LinkCard.svelte";
	import { allLinks, categoryOrder } from "$lib/data/links";
	import { favorites } from "$lib/stores/favorites";

	function handleToggleFavorite(event: CustomEvent<{ linkId: string }>) {
		favorites.toggle(event.detail.linkId);
	}
</script>

<svelte:head>
	<title>Explore - SRH Campus Hub</title>
</svelte:head>

<div class="explore-page">
	<header class="page-header">
		<h1>🧭 Explore</h1>
		<p class="subtitle">Discover all university resources and tools</p>
	</header>

	{#each categoryOrder as category}
		<section class="category-section">
			<h2 class="category-title">{category}</h2>
			<div class="links-grid">
				{#each allLinks.filter((link) => link.category_name === category) as link (link.id)}
					<LinkCard
						{link}
						isFavorite={$favorites.includes(link.id)}
						on:toggleFavorite={handleToggleFavorite}
					/>
				{/each}
			</div>
		</section>
	{/each}
</div>

<style>
	.explore-page {
		padding-bottom: var(--spacing-xl);
	}

	.page-header {
		text-align: center;
		padding: var(--spacing-lg) 0;
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

	.category-section {
		margin-bottom: var(--spacing-xl);
	}

	.category-title {
		font-size: 1.25rem;
		font-weight: 700;
		margin-bottom: var(--spacing-md);
		padding-left: var(--spacing-sm);
		border-left: 4px solid var(--primary-color);
		color: var(--text-color);
	}

	.links-grid {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	@media (min-width: 640px) {
		.links-grid {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: var(--spacing-md);
		}
	}

	@media (min-width: 1024px) {
		.links-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
