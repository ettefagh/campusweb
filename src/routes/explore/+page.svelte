<script lang="ts">
	import LinkCard from "$lib/components/LinkCard.svelte";
	import { allLinks, categoryOrder } from "$lib/data/links";
	import { favorites } from "$lib/stores/favorites";

	let searchQuery = "";

	function handleToggleFavorite(event: CustomEvent<{ linkId: string }>) {
		favorites.toggle(event.detail.linkId);
	}

	$: filteredLinks = allLinks.filter((link) => {
		if (!searchQuery.trim()) return true;
		const query = searchQuery.toLowerCase();
		return (
			link.title.toLowerCase().includes(query) ||
			(link.description && link.description.toLowerCase().includes(query)) ||
			(link.category_name && link.category_name.toLowerCase().includes(query))
		);
	});

	$: activeCategories = categoryOrder.filter((cat) =>
		filteredLinks.some((link) => link.category_name === cat)
	);

	const searchSources = [
		{ id: "srh", name: "University Website", icon: "🎓", searchable: true },
		{ id: "ecampus", name: "E-Campus", icon: "💻", searchable: true },
		{ id: "library", name: "Library", icon: "📚", searchable: false, staticUrl: "https://webopac.srh-hochschulen.de/vopac/index.asp?DB=BIBB" },
		{ id: "team", name: "Staff", icon: "👥", searchable: false, staticUrl: "https://www.srh-university.de/en/srh-university/faculty-and-team/" },
	];

	function handleExternalSearch(sourceId: string) {
		const source = searchSources.find((s) => s.id === sourceId)!;
		const query = searchQuery.trim();

		if (source.searchable && query) {
			if (source.id === "srh") {
				window.location.href = `/viewer?url=${encodeURIComponent(`https://www.srh-university.de/en/search/?q=${encodeURIComponent(query)}`)}&title=${encodeURIComponent(source.name + " Search")}`;
			} else if (source.id === "ecampus") {
				window.open(`https://ecampus.srh-university.de/search/index.php?q=${encodeURIComponent(query)}`, "_blank");
			}
		} else if (source.staticUrl) {
			if (source.id === "library") {
				window.open(source.staticUrl, "_blank");
			} else {
				window.location.href = `/viewer?url=${encodeURIComponent(source.staticUrl)}&title=${encodeURIComponent(source.name)}`;
			}
		}
	}
</script>

<svelte:head>
	<title>Explore & Search - SRH Campus Hub</title>
</svelte:head>

<div class="explore-page" class:is-searching={searchQuery.trim().length > 0}>
	<header class="page-header">
		<h1>🧭 Explore & Search</h1>
		<p class="subtitle">Discover all university resources and tools</p>
	</header>

	<div class="explore-content">
		{#each activeCategories as category}
			<section class="category-section">
				<h2 class="category-title">{category}</h2>
				<div class="links-grid">
					{#each filteredLinks.filter((link) => link.category_name === category) as link (link.id)}
						<LinkCard
							{link}
							isFavorite={$favorites.includes(link.id)}
							on:toggleFavorite={handleToggleFavorite}
						/>
					{/each}
				</div>
			</section>
		{/each}

		{#if activeCategories.length === 0 && searchQuery.trim()}
			<div class="no-results">
				<p>No local resources found for "{searchQuery}".</p>
			</div>
		{/if}
	</div>

	<!-- Thumb-Friendly Bottom Search -->
	<div class="bottom-search-wrapper">
		<div class="search-container glass">
			<div class="search-input-group">
				<span class="search-icon" aria-hidden="true">🔍</span>
				<input
					type="search"
					placeholder="Search resources..."
					bind:value={searchQuery}
					class="bottom-search-input"
					aria-label="Search local resources and external portals"
				/>
				{#if searchQuery}
					<button class="clear-btn" aria-label="Clear search" on:click={() => searchQuery = ''}>✖</button>
				{/if}
			</div>

			{#if searchQuery.trim()}
				<div class="external-search-options">
					<p class="external-prompt">Search externally on:</p>
					<div class="external-chips">
						{#each searchSources as source}
							<button class="external-chip" on:click={() => handleExternalSearch(source.id)}>
								{source.icon} {source.name}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.explore-page {
		padding-bottom: 120px; /* Space for the bottom search bar */
		min-height: 100vh;
		position: relative;
	}

	/* When searching, add more padding so external chips don't cover content */
	.explore-page.is-searching {
		padding-bottom: 220px; 
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
		animation: fadeIn 0.3s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
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

	.no-results {
		text-align: center;
		padding: var(--spacing-xl) var(--spacing-md);
		color: var(--text-color-secondary);
		font-size: 1.1rem;
		background: var(--card-bg);
		border-radius: var(--radius-md);
		border: 1px dashed var(--border-color);
		margin-bottom: var(--spacing-xl);
	}

	/* ─── Bottom Search UI ───────────────────────────── */
	.bottom-search-wrapper {
		position: fixed;
		bottom: calc(var(--touch-target-min) + var(--spacing-lg) + var(--spacing-sm));
		left: 0;
		right: 0;
		padding: 0 var(--spacing-sm);
		z-index: 900;
		pointer-events: none; /* Let clicks pass through empty space */
	}

	@media (min-width: 1024px) {
		.bottom-search-wrapper {
			bottom: var(--spacing-lg);
			left: var(--sidebar-width, 220px);
			max-width: 1200px;
			margin: 0 auto;
			padding: 0 var(--spacing-xl);
		}
	}

	.search-container {
		pointer-events: auto; /* Re-enable clicks for the search box */
		padding: var(--spacing-sm);
		border-radius: var(--radius-lg);
		box-shadow: var(--glass-shadow-lg);
		max-width: 800px;
		margin: 0 auto;
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.search-input-group {
		display: flex;
		align-items: center;
		background: var(--bg-color);
		border-radius: var(--radius-md);
		border: 2px solid var(--glass-border-subtle);
		padding: 0 var(--spacing-sm);
		height: 48px;
		transition: border-color 0.2s;
	}

	.search-input-group:focus-within {
		border-color: var(--primary-color);
	}

	.search-icon {
		font-size: 1.2rem;
		opacity: 0.6;
		margin-right: var(--spacing-xs);
	}

	.bottom-search-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		font-size: 1rem;
		color: var(--text-color);
		width: 100%;
		padding: 0;
		-webkit-appearance: none;
	}

	.bottom-search-input:focus {
		outline: none;
		background: transparent;
		border-color: transparent;
	}

	.clear-btn {
		background: rgba(0,0,0,0.05);
		border-radius: 50%;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		color: var(--text-color);
		opacity: 0.6;
	}

	@media (prefers-color-scheme: dark) {
		.clear-btn { background: rgba(255,255,255,0.1); }
	}

	.external-search-options {
		margin-top: var(--spacing-sm);
		animation: expandDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes expandDown {
		from { opacity: 0; transform: translateY(-10px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.external-prompt {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-color-secondary);
		margin-bottom: var(--spacing-xs);
		padding-left: var(--spacing-xs);
	}

	.external-chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
	}

	.external-chip {
		background: rgba(212, 68, 7, 0.1);
		color: var(--text-color);
		border: 1px solid rgba(212, 68, 7, 0.2);
		border-radius: var(--radius-sm);
		padding: 6px 12px;
		font-size: 0.85rem;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 6px;
		transition: all 0.2s;
	}

	.external-chip:hover {
		background: var(--primary-color);
		color: white;
		border-color: var(--primary-color);
		transform: translateY(-1px);
	}
</style>
