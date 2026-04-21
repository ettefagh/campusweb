<script lang="ts">
	import LinkCard from "$lib/components/LinkCard.svelte";
	import { allLinks, categoryOrder } from "$lib/data/links";
	import { favorites } from "$lib/stores/favorites";
	import { browser } from "$app/environment";
	import { onMount } from "svelte";
	import { t } from "$lib/i18n";

	let searchQuery = "";

	function handleToggleFavorite(event: CustomEvent<{ linkId: string }>) {
		favorites.toggle(event.detail.linkId);
	}

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

	let filteredLinks: typeof allLinks = [];
	$: filteredLinks = allLinks.filter((link) => {
		if (!searchQuery.trim()) return true;
		const query = searchQuery.toLowerCase();
		return (
			link.title.toLowerCase().includes(query) ||
			(link.description && link.description.toLowerCase().includes(query)) ||
			(link.category_name && link.category_name.toLowerCase().includes(query))
		);
	});

	let activeCategories: string[] = [];
	$: activeCategories = categoryOrder.filter((cat) =>
		filteredLinks.some((link) => link.category_name === cat)
	);

	const searchSources = [
		{ id: "srh", name: "University Website", icon: "🎓", searchable: true },
		{ id: "ecampus", name: "E-Campus", icon: "💻", searchable: true },
		{ id: "library", name: "Library", icon: "📚", searchable: false, staticUrl: "https://webopac.srh-hochschulen.de/vopac/index.asp?DB=BIBB" },
		{ id: "team", name: "Staff", icon: "👥", searchable: false, staticUrl: "https://www.srh-university.de/en/srh-university/faculty-and-team/" },
	];

	/**
	 * Svelte Action: Stitches the element to the virtual keyboard on mobile (iOS Safari)
	 */
	function keyboardStitch(node: HTMLElement) {
		if (!browser || !window.visualViewport) return;

		const update = () => {
			const viewport = window.visualViewport!;
			// Calculate the gap between bottom of layout viewport and bottom of visual viewport
			const offset = window.innerHeight - viewport.height;
			
			// We only care about positive offsets (keyboard being open)
			// Apply via transform for sub-pixel smoothness and performance
			if (offset > 0) {
				node.style.transform = `translateY(-${offset}px)`;
			} else {
				node.style.transform = 'translateY(0)';
			}
		};

		window.visualViewport.addEventListener('resize', update);
		window.visualViewport.addEventListener('scroll', update);
		
		// Initial check
		update();

		return {
			destroy() {
				window.visualViewport?.removeEventListener('resize', update);
				window.visualViewport?.removeEventListener('scroll', update);
			}
		};
	}
</script>

<svelte:head>
	<title>{$t.explore.pageTitle}</title>
</svelte:head>

<div class="explore-page" class:is-searching={searchQuery.trim().length > 0}>
	<header class="page-header">
		<h1>{$t.explore.title}</h1>
		<p class="subtitle">{$t.explore.subtitle}</p>
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
				<p>{$t.explore.noResults} "{searchQuery}".</p>
			</div>
		{/if}

		{#if searchQuery.trim()}
			<section class="external-search-section">
				<h2 class="external-search-title">{$t.explore.externalTitle}</h2>
				<div class="external-search-list">
					{#each searchSources as source}
						<button class="external-search-row" on:click={() => handleExternalSearch(source.id)}>
							<div class="external-icon-box">{source.icon}</div>
							<div class="external-row-content">
								{#if source.searchable}
									<span class="external-name">{$t.explore.searchIn} {source.name}</span>
									<span class="external-query">"{searchQuery}"</span>
								{:else}
									<span class="external-name">{$t.explore.openCatalog} {source.name} {$t.explore.catalog}</span>
									<span class="external-query">{$t.explore.searchManually} "{searchQuery}"</span>
								{/if}
							</div>
							<span class="external-chevron">›</span>
						</button>
					{/each}
				</div>
			</section>
		{/if}
	</div>

	<!-- Thumb-Friendly Bottom Search -->
	<div class="bottom-search-wrapper" use:keyboardStitch>
		<div class="search-container glass">
			<div class="search-input-group">
				<span class="search-icon" aria-hidden="true">🔍</span>
				<input
					type="search"
					placeholder={$t.explore.searchPlaceholder}
					bind:value={searchQuery}
					class="bottom-search-input"
					aria-label={$t.explore.searchPlaceholder}
				/>
				{#if searchQuery}
					<button class="clear-btn" aria-label={$t.explore.clearSearch} on:click={() => searchQuery = ''}>✖</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.explore-page {
		padding-bottom: 180px; /* Space for the bottom nav + search bar */
		min-height: 100vh;
		position: relative;
	}

	/* When searching, add more padding so external results don't get covered */
	.explore-page.is-searching {
		padding-bottom: 260px; 
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
		/* Clear the bottom nav height: 112px (approx) */
		bottom: calc(var(--touch-target-min) + var(--spacing-md) * 4);
		left: 0;
		right: 0;
		padding: 0 var(--spacing-sm) var(--spacing-sm);
		z-index: 900;
		pointer-events: none; /* Let clicks pass through empty space */
		transition: bottom 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	/* Stitch to keyboard when focused */
	.bottom-search-wrapper:focus-within {
		bottom: 0 !important;
		padding-bottom: var(--spacing-xs);
		background: linear-gradient(to top, var(--bg-color) 0%, transparent 100%);
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

	/* ─── Spotlight-style External Search List ─── */
	.external-search-section {
		margin-top: var(--spacing-xl);
		animation: fadeIn 0.3s ease;
	}

	.external-search-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-color-secondary);
		margin-bottom: var(--spacing-sm);
		padding-left: var(--spacing-sm);
	}

	.external-search-list {
		background: var(--card-bg);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		overflow: hidden;
	}

	.external-search-row {
		width: 100%;
		display: flex;
		align-items: center;
		padding: var(--spacing-md);
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--border-color);
		text-align: left;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.external-search-row:last-child {
		border-bottom: none;
	}

	.external-search-row:active,
	.external-search-row:hover {
		background-color: rgba(212, 68, 7, 0.05);
	}

	.external-icon-box {
		width: 40px;
		height: 40px;
		background: var(--bg-color);
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.4rem;
		margin-right: var(--spacing-md);
		border: 1px solid var(--border-color);
	}

	.external-row-content {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.external-name {
		font-weight: 600;
		color: var(--text-color);
		font-size: 1.05rem;
	}

	.external-query {
		font-size: 0.85rem;
		color: var(--text-color-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 200px;
	}

	.external-chevron {
		color: var(--text-color-secondary);
		font-size: 1.5rem;
		opacity: 0.5;
	}
</style>
