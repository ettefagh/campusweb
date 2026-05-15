<script lang="ts">
	import LinkCard from "$lib/components/LinkCard.svelte";
	import IdSlider from "$lib/components/IdSlider.svelte";
	import StoriesSlider from "$lib/components/StoriesSlider.svelte";
	import { cachedStories, getStories, storiesLoading } from "$lib/stores/feedCache";
	import { favorites } from "$lib/stores/favorites";
	import { allLinks } from "$lib/data/links";
	import { t } from "$lib/i18n";
	import { settingsStore } from "$lib/stores/settingsStore";
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";

	let showGoToTop = false;
	let container: HTMLElement | null = null;
	$: isStoriesLoading = $storiesLoading;

	onMount(() => {
		getStories();
		if ($settingsStore.defaultPage === 'calendar') {
			goto('/calendar', { replaceState: true });
		}
		container = document.querySelector(".app-container");
		const handleScroll = () => {
			if (container) {
				showGoToTop = container.scrollTop > 300;
			}
		};
		container?.addEventListener("scroll", handleScroll);
		return () => {
			container?.removeEventListener("scroll", handleScroll);
		};
	});

	function goToTop() {
		container?.scrollTo({ top: 0, behavior: "smooth" });
	}

	function triggerExploreSearch() {
		goto("/explore?focus=true");
	}

	let isEditMode = false;
	let isManagingFavorites = false;
	let searchQuery = "";
	let draggedFavoriteId = "";

	let displayLinks: typeof allLinks = [];
	$: displayLinks = isEditMode
		? allLinks.filter((link) => {
				const query = searchQuery.toLowerCase().trim();
				if (!query) return true;
				const title = $t.linkTitle?.[link.id as keyof typeof $t.linkTitle] || link.title;
				const desc = $t.linkDesc?.[link.id as keyof typeof $t.linkDesc] || link.description || "";
				return (
					title.toLowerCase().includes(query) ||
					desc.toLowerCase().includes(query)
				);
			})
		: $favorites
				.map((favId) => allLinks.find((link) => link.id === favId))
				.filter((link): link is typeof allLinks[number] => !!link);

	function toggleEditMode() {
		isEditMode = !isEditMode;
		searchQuery = "";
	}

	function startManagingFavorites() {
		isManagingFavorites = true;
		isEditMode = false;
		searchQuery = "";
	}

	function finishManagingFavorites() {
		isManagingFavorites = false;
		isEditMode = false;
		searchQuery = "";
		draggedFavoriteId = "";
	}

	function handleToggleFavorite(event: CustomEvent<{ linkId: string }>) {
		favorites.toggle(event.detail.linkId);
	}

	function handleReorderStart(event: CustomEvent<{ linkId: string }>) {
		draggedFavoriteId = event.detail.linkId;
	}

	function handleReorderDrop(event: CustomEvent<{ linkId: string }>) {
		if (!draggedFavoriteId || draggedFavoriteId === event.detail.linkId) return;

		const fromIndex = $favorites.indexOf(draggedFavoriteId);
		const toIndex = $favorites.indexOf(event.detail.linkId);
		favorites.reorder(fromIndex, toIndex);
		draggedFavoriteId = "";
	}
</script>

<svelte:head>
	<title>{$t.home.pageTitle}</title>
	<meta
		name="description"
		content={$t.home.subtitle}
	/>
</svelte:head>

<div class="home-page">
	{#each $settingsStore.homeSections as section, i (section.id)}
		{#if section.enabled}
			{#if section.id === "header"}
				<header class="page-header narrow">
					<div class="logo-container">
						<img
							src="/icon-light.png"
							alt="SRH University Logo"
							class="logo light-mode"
							width="36"
							height="36"
							loading="eager"
							fetchpriority="high"
						/>
						<img
							src="/icon-dark.png"
							alt="SRH University Logo"
							class="logo dark-mode"
							width="36"
							height="36"
							loading="eager"
							fetchpriority="high"
						/>
					</div>
					<div class="header-text">
						<h1>{$t.home.title}</h1>
						<p class="subtitle">{$t.home.subtitle}</p>
					</div>
				</header>
			{:else if section.id === "stories"}
				<section class="stories-section" style="animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; animation-delay: {i * 100}ms;">
					<div class="modular-section-header" style="margin-bottom: 0;">
						<h2>{$t.home.campusStories}</h2>
					</div>
					<StoriesSlider stories={$cachedStories} loading={isStoriesLoading} allowSuggestions={true} />
				</section>
			{:else if section.id === "favorites"}
				<section class="links-section" style={i <= 1 ? "" : "animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; animation-delay: {i * 100}ms;"}>
					<div class="favorite-links-header">
						<div class="favorite-links-title-group">
							<h2>{$t.home.universityLinks || 'Favorite Links'}</h2>
							<p class="favorite-links-subtitle">Custom quick-access bookmarks</p>
						</div>
						<div class="favorite-links-actions">
							{#if isManagingFavorites}
								<button
									class="favorite-icon-btn passive"
									type="button"
									aria-label="Drag favorite links to reorder"
									title="Drag favorite links to reorder"
								>
									<i class="ph-bold ph-dots-six-vertical"></i>
								</button>
								<button
									class="favorite-icon-btn"
									class:active={isEditMode}
									type="button"
									on:click={toggleEditMode}
									aria-label="Edit favorite links"
									title="Edit favorite links"
								>
									<i class="ph-bold ph-pencil-simple"></i>
									<span>Edit</span>
								</button>
								<button
									class="favorite-icon-btn done"
									type="button"
									on:click={finishManagingFavorites}
									aria-label="Done managing favorite links"
									title="Done"
								>
									<i class="ph-bold ph-check"></i>
								</button>
							{:else}
								<button 
									class="favorite-action-btn"
									type="button"
									on:click={startManagingFavorites}
								>
									Manage
								</button>
							{/if}
						</div>
					</div>
					{#if isEditMode}
						<div class="search-container">
							<input
								type="text"
								placeholder={$t.home.searchPlaceholder}
								bind:value={searchQuery}
								class="search-input"
							/>
						</div>
					{/if}
					{#if displayLinks.length === 0}
						<div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
							<p>{$t.home.emptyState}</p>
						</div>
					{:else}
						{#each displayLinks as link (link.id)}
							<LinkCard
								{link}
								isFavorite={$favorites.includes(link.id)}
								editMode={isEditMode}
								reorderMode={isManagingFavorites && !isEditMode}
								useViewer={!isEditMode && !isManagingFavorites}
								on:toggleFavorite={handleToggleFavorite}
								on:reorderStart={handleReorderStart}
								on:reorderDrop={handleReorderDrop}
							/>
						{/each}
					{/if}
				</section>
			{:else if section.id === "cards"}
				<section class="links-section full-width-section" style="animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; animation-delay: {i * 100}ms;">
					<IdSlider />
				</section>
			{:else if section.id === "calendar"}
				<section class="links-section full-width-section" style="animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; animation-delay: {i * 100}ms;">
					<div class="modular-section-header">
						<h2>{$t.calendar?.pageTitle || "Calendar Schedule"}</h2>
						<a href="/calendar" class="view-all-link">{$t.home?.viewAll || "View Full Calendar"} →</a>
					</div>
					<div class="modular-placeholder glass">
						<p>Your calendar schedule is modularly prepared. Navigate to the calendar tab to view your active class timetable.</p>
					</div>
				</section>
			{:else if section.id === "feed"}
				<section class="links-section full-width-section" style="animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; animation-delay: {i * 100}ms;">
					<div class="modular-section-header">
						<h2>{$t.feed?.pageTitle || "Campus Feed"}</h2>
						<a href="/feed" class="view-all-link">{$t.home?.viewAllNews || "View All News"} →</a>
					</div>
					<div class="modular-placeholder glass">
						<p>Your campus news and events feed is modularly prepared. Navigate to the feed tab to browse global announcements.</p>
					</div>
				</section>
			{/if}
		{/if}
	{/each}

	<div class="fab-group">
		{#if showGoToTop}
			<button class="fab-btn go-to-top glass" on:click={goToTop} aria-label="Go to top">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="18 15 12 9 6 15"></polyline>
				</svg>
			</button>
		{/if}
		<button class="fab-btn search-fab" on:click={triggerExploreSearch} aria-label="Search Explore">
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="11" cy="11" r="8"></circle>
				<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
			</svg>
		</button>
	</div>
</div>

<style>
	.home-page {
		max-width: 1200px;
		margin: 0 auto;
		padding-bottom: calc(var(--spacing-xl) * 2.5);
	}

	.page-header {
		text-align: center;
		padding: var(--spacing-lg) 0;
		margin: var(--spacing-md) var(--spacing-md) var(--spacing-lg) var(--spacing-md);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.page-header.narrow {
		flex-direction: row;
		align-items: center;
		justify-content: flex-start;
		text-align: left;
		padding: var(--spacing-sm) var(--spacing-md);
		margin: var(--spacing-sm) var(--spacing-md);
		gap: var(--spacing-md);
		padding-top: calc(env(safe-area-inset-top) + var(--spacing-sm));
	}

	.page-header.narrow .logo-container {
		margin-bottom: 0;
	}

	.page-header.narrow .logo {
		width: 36px;
		height: 36px;
	}

	.page-header.narrow .header-text {
		display: flex;
		flex-direction: column;
	}

	.page-header.narrow h1 {
		font-size: 1.3rem;
		line-height: 0.8rem;
		margin-bottom: 2px;
	}

	.page-header.narrow .subtitle {
		font-size: 0.85rem;
		margin-bottom: 0;
	}

	.logo-container {
		margin-bottom: var(--spacing-md);
	}

	.logo {
		width: 48px;
		height: 48px;
		object-fit: contain;
		border-radius: 8px;
	}

	.logo.dark-mode {
		display: none;
	}

	@media (prefers-color-scheme: dark) {
		.logo.light-mode {
			display: none;
		}
		.logo.dark-mode {
			display: inline-block;
		}
	}

	h1 {
		font-size: 1.3rem;
		line-height: 0.8rem;
		margin-bottom: var(--spacing-sm);
	}

	.subtitle {
		color: #666;
		font-size: 1rem;
		margin-bottom: var(--spacing-md);
	}

	@media (prefers-color-scheme: dark) {
		.subtitle {
			color: #aaa;
		}
	}

	.search-container {
		grid-column: 1 / -1;
		margin: calc(var(--spacing-xs) * -1) 0 var(--spacing-sm) 0;
		padding: 0 var(--spacing-md);
		width: 100%;
		box-sizing: border-box;
	}

	.search-input {
		width: 100%;
		padding: var(--spacing-md);
		border: 2px solid var(--border-color);
		border-radius: var(--radius-md);
		font-size: 1rem;
		background: var(--card-bg);
		color: var(--text-color);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--primary-color);
	}

	.empty-state {
		text-align: center;
		padding: var(--spacing-xl);
		color: var(--text-color-secondary);
	}

	.links-section {
		margin-top: var(--spacing-lg);
	}

	@media (min-width: 640px) {
		.links-section {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: var(--spacing-md);
		}
	}

	@media (min-width: 1024px) {
		.links-section {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.full-width-section, .stories-section {
		display: block !important;
		grid-column: 1 / -1;
		margin-top: var(--spacing-xl);
	}

	.stories-section {
		margin-top: var(--spacing-md);
		margin-bottom: var(--spacing-sm);
	}

	.modular-section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-md);
		padding: 0 var(--spacing-md);
	}

	.modular-section-header h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-color);
		margin: 0;
	}

	.view-all-link {
		font-size: 0.9rem;
		color: var(--primary-color);
		font-weight: 600;
		text-decoration: none;
		transition: opacity 0.2s;
	}

	.view-all-link:hover {
		opacity: 0.8;
	}

	.modular-placeholder {
		background: var(--glass-bg-light);
		backdrop-filter: var(--glass-blur);
		-webkit-backdrop-filter: var(--glass-blur);
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-xl);
		padding: var(--spacing-xl) var(--spacing-lg);
		text-align: center;
		color: var(--text-color-secondary);
		margin: 0 var(--spacing-md);
	}

	.modular-placeholder p {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.favorite-links-header {
		grid-column: 1 / -1;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-md);
		padding: 0 var(--spacing-md);
		width: 100%;
		box-sizing: border-box;
	}

	.favorite-links-title-group h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-color);
		margin: 0 0 2px 0;
	}

	.favorite-links-subtitle {
		font-size: 0.8rem;
		color: var(--text-color-secondary);
		margin: 0;
	}

	.favorite-links-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
		flex-shrink: 0;
		padding: 4px;
		border: 1px solid var(--glass-border-subtle);
		border-radius: var(--radius-md);
		background: var(--glass-bg-light);
		backdrop-filter: var(--glass-blur);
		-webkit-backdrop-filter: var(--glass-blur);
	}

	.favorite-icon-btn,
	.favorite-action-btn {
		min-height: var(--touch-target-min);
		border: 1px solid transparent;
		border-radius: calc(var(--radius-md) - 4px);
		background: transparent;
		font-size: 0.8rem;
		font-weight: 700;
		cursor: pointer;
		color: var(--text-color);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		-webkit-tap-highlight-color: transparent;
	}

	.favorite-action-btn {
		padding: 0 16px;
	}

	.favorite-icon-btn {
		min-width: var(--touch-target-min);
		padding: 0 12px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}

	.favorite-icon-btn i {
		font-size: 1rem;
		line-height: 1;
	}

	.favorite-icon-btn.passive {
		cursor: grab;
		color: var(--text-color-secondary);
		background: rgba(255, 255, 255, 0.32);
	}

	.favorite-icon-btn.done {
		background: var(--primary-color);
		color: white;
		border-color: var(--primary-color);
	}

	.favorite-icon-btn:hover,
	.favorite-icon-btn:focus-visible,
	.favorite-action-btn:focus-visible,
	.favorite-action-btn:hover {
		background: rgba(212, 68, 7, 0.12);
		color: var(--primary-color);
		border-color: rgba(212, 68, 7, 0.22);
		outline: none;
	}

	.favorite-icon-btn.done:hover {
		background: var(--primary-color);
		color: white;
		border-color: var(--primary-color);
		filter: brightness(1.05);
	}

	.favorite-icon-btn.active {
		background: var(--primary-color);
		color: white;
		border-color: var(--primary-color);
		box-shadow: 0 2px 8px rgba(212, 68, 7, 0.3);
	}

	@media (max-width: 420px) {
		.favorite-links-header {
			align-items: flex-start;
			flex-direction: column;
		}

		.favorite-links-actions {
			align-self: stretch;
			justify-content: space-between;
		}

		.favorite-action-btn,
		.favorite-icon-btn {
			flex: 1;
		}
	}

	@keyframes reveal {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.fab-group {
		position: fixed;
		bottom: 120px;
		right: 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		z-index: 9999;
	}

	.fab-btn {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
		cursor: pointer;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
		transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
	}

	.fab-btn:hover {
		transform: scale(1.1) translateY(-2px);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
	}

	.fab-btn:active {
		transform: scale(0.95);
	}

	.search-fab {
		background: var(--primary-color, #d44407);
		color: white;
	}

	.go-to-top {
		background: var(--glass-bg-strong);
		border: 1px solid var(--glass-border);
		backdrop-filter: blur(8px);
		color: var(--text-color);
	}

	@media (min-width: 1024px) {
		.fab-group {
			bottom: 24px;
			right: 24px;
		}
	}
</style>
