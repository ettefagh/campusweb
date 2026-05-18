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
	import SectionHeader from "$lib/components/SectionHeader.svelte";
	import Sortable from 'sortablejs';

	function sortableFavorites(node: HTMLElement, options: { enabled: boolean }) {
		let sortable: Sortable | null = null;
		function update(opts: { enabled: boolean }) {
			if (opts.enabled) {
				if (!sortable) {
					sortable = new Sortable(node, {
						animation: 150,
						draggable: '.link-card-container',
						onEnd: (evt) => {
							if (evt.oldDraggableIndex !== undefined && evt.newDraggableIndex !== undefined && evt.oldDraggableIndex !== evt.newDraggableIndex) {
								favorites.reorder(evt.oldDraggableIndex, evt.newDraggableIndex);
							}
						}
					});
				}
			} else {
				if (sortable) {
					sortable.destroy();
					sortable = null;
				}
			}
		}
		
		update(options);
		
		return {
			update,
			destroy() {
				if (sortable) sortable.destroy();
			}
		};
	}

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
				<header class="home-hero" class:compact={$settingsStore.headerSize === 'small'}>
					<div class="home-hero-top">
						<div class="home-greeting">
							<span>Hello!</span>
							<h1>Welcome back</h1>
						</div>
						<button class="home-notification" type="button" aria-label="Notifications">
							<i class="ph ph-bell"></i>
							<span aria-hidden="true"></span>
						</button>
					</div>
					<button class="home-search" type="button" on:click={triggerExploreSearch} aria-label="Search CampusWeb">
						<i class="ph ph-magnifying-glass" aria-hidden="true"></i>
						<span>Search CampusWeb</span>
						<i class="ph ph-corners-out" aria-hidden="true"></i>
					</button>
					<div class="home-context">
						<img
							src="/icon-light.png"
							alt=""
							class="home-context-logo light-mode"
							width="32"
							height="32"
							loading="eager"
							fetchpriority="high"
						/>
						<img
							src="/icon-dark.png"
							alt=""
							class="home-context-logo dark-mode"
							width="32"
							height="32"
							loading="eager"
							fetchpriority="high"
						/>
						<p>{$t.home.subtitle}</p>
					</div>
				</header>
			{:else if section.id === "stories"}
				<section class="stories-section" id="stories" style="animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; animation-delay: {i * 100}ms;">
					<SectionHeader title={$t.home.campusStories} href="/feed" hrefLabel="See all" />
					<StoriesSlider stories={$cachedStories} loading={isStoriesLoading} allowSuggestions={true} variant="rectangular" />
				</section>
			{:else if section.id === "favorites"}
				<section class="links-section" id="favorites" style={i <= 1 ? "" : "animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; animation-delay: {i * 100}ms;"} use:sortableFavorites={{ enabled: isManagingFavorites && !isEditMode }}>
					<SectionHeader title={$t.home.universityLinks || 'Favorite Links'} subtitle="Custom quick-access bookmarks">

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
									class="section-action-btn"
									type="button"
									on:click={startManagingFavorites}
								>
									Manage
								</button>
							{/if}
						</div>
					</SectionHeader>
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
								variant="compact-list"
								on:toggleFavorite={handleToggleFavorite}
							/>
						{/each}
					{/if}
				</section>
			{:else if section.id === "cards"}
				<section class="links-section full-width-section" id="wallet" style="animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; animation-delay: {i * 100}ms;">
					<IdSlider />
				</section>
			{:else if section.id === "calendar"}
				<section class="links-section full-width-section" id="calendar" style="animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; animation-delay: {i * 100}ms;">

					<SectionHeader 
						title={$t.calendar?.pageTitle || "Calendar Schedule"} 
						href="/calendar"
						hrefLabel="{$t.home?.viewAll || 'View Full Calendar'} →"
					/>
					<div class="modular-placeholder glass">
						<p>Your calendar schedule is modularly prepared. Navigate to the calendar tab to view your active class timetable.</p>
					</div>
				</section>
			{:else if section.id === "feed"}
				<section class="links-section full-width-section" id="feed" style="animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; animation-delay: {i * 100}ms;">

					<SectionHeader 
						title={$t.feed?.pageTitle || "Campus Feed"} 
						href="/feed"
						hrefLabel="{$t.home?.viewAllNews || 'View All News'} →"
					/>
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
		width: min(calc(100vw - 32px), 460px);
		max-width: 460px;
		box-sizing: border-box;
		margin: 0 auto;
		padding: 10px 18px calc(var(--spacing-xl) * 3.1);
		display: flex;
		flex-direction: column;
		gap: 28px;
		overflow-x: hidden;
	}

	.home-hero {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 22px;
		padding-top: max(18px, env(safe-area-inset-top));
	}

	.home-hero.compact {
		gap: 14px;
	}

	.home-hero-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
	}

	.home-greeting {
		min-width: 0;
		padding-right: 50px;
	}

	.home-greeting span {
		display: block;
		color: var(--primary-color);
		font-family: "SRH Headline", sans-serif;
		font-size: 1.15rem;
		font-weight: 900;
		line-height: 1.1;
		margin-bottom: 4px;
	}

	.home-greeting h1 {
		font-size: clamp(1.75rem, 6.2vw, 2rem);
		line-height: 0.96;
		margin: 0;
		color: var(--text-color);
		letter-spacing: 0;
	}

	.home-notification {
		position: fixed;
		top: max(28px, calc(env(safe-area-inset-top) + 18px));
		right: 24px;
		z-index: 3;
		width: 42px;
		height: 42px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		color: #fff;
		background: linear-gradient(135deg, var(--primary-color), #ff7a2f);
		border: 1px solid rgba(255, 255, 255, 0.68);
		box-shadow: 0 12px 24px rgba(var(--primary-color-rgb), 0.22);
		font-size: 1.35rem;
		flex: 0 0 auto;
	}

	.home-notification span {
		position: absolute;
		top: 9px;
		right: 9px;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--primary-color);
		border: 2px solid var(--surface-solid);
	}

	.home-search {
		width: 100%;
		height: 62px;
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 14px;
		padding: 0 18px;
		color: var(--text-color-secondary);
		background: var(--surface-solid);
		border: 1px solid var(--surface-border);
		border-radius: 14px;
		box-shadow: var(--campus-shadow-soft);
		text-align: left;
		box-sizing: border-box;
		max-width: 100%;
	}

	.home-search i {
		font-size: 1.55rem;
		line-height: 1;
	}

	.home-search span {
		font-size: 1.05rem;
		font-weight: 650;
		color: var(--text-color-secondary);
	}

	.home-search:hover,
	.home-search:focus-visible {
		transform: translateY(-1px);
		border-color: rgba(var(--primary-color-rgb), 0.28);
		box-shadow: var(--campus-shadow);
	}

	.home-context {
		display: none;
		align-items: center;
		gap: 10px;
		color: var(--text-color-secondary);
	}

	.home-context-logo {
		width: 30px;
		height: 30px;
		border-radius: 8px;
	}

	.home-context-logo.dark-mode {
		display: none;
	}

	@media (prefers-color-scheme: dark) {
		.home-context-logo.light-mode {
			display: none;
		}

		.home-context-logo.dark-mode {
			display: block;
		}
	}

	:global(html[data-theme="light"]) .home-context-logo.light-mode {
		display: block;
	}

	:global(html[data-theme="light"]) .home-context-logo.dark-mode {
		display: none;
	}

	:global(html[data-theme="dark"]) .home-context-logo.light-mode {
		display: none;
	}

	:global(html[data-theme="dark"]) .home-context-logo.dark-mode {
		display: block;
	}

	.home-context p {
		margin: 0;
		font-size: 0.94rem;
		line-height: 1.35;
	}

	.stories-section,
	.links-section {
		min-width: 0;
		max-width: 100%;
	}

	.links-section {
		background: var(--surface-solid);
		border: 1px solid var(--surface-border);
		border-radius: 16px;
		box-shadow: var(--campus-shadow-soft);
		overflow: hidden;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.stories-section {
		overflow: hidden;
	}

	.links-section :global(.modular-section-header) {
		padding: 18px 20px 8px;
		margin-bottom: 0;
		gap: 12px;
	}

	.links-section :global(.title-group) {
		min-width: 0;
	}

	.links-section :global(.title-group h2) {
		font-size: 1.22rem;
		white-space: nowrap;
	}

	.links-section :global(.actions) {
		flex: 0 0 auto;
	}

	.stories-section :global(.modular-section-header) {
		margin-bottom: 6px;
	}

	.links-section :global(.link-card-container:not(:last-child) .link-card.compact-list) {
		border-bottom: 1px solid rgba(7, 19, 47, 0.08);
	}

	:global([data-theme="dark"]) .links-section :global(.link-card-container:not(:last-child) .link-card.compact-list) {
		border-bottom-color: rgba(255, 255, 255, 0.08);
	}


	.search-container {
		grid-column: 1 / -1;
		margin: 0;
		padding: 12px 16px;
		width: 100%;
		box-sizing: border-box;
	}

	.search-input {
		width: 100%;
		padding: var(--spacing-md);
		border: 2px solid var(--border-color);
		border-radius: var(--radius-md);
		font-size: 1rem;
		background: var(--surface-soft);
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

	.full-width-section, .stories-section {
		display: block !important;
		grid-column: 1 / -1;
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
		margin: 0;
	}

	.modular-placeholder p {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.5;
	}



	.favorite-links-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
		flex-shrink: 0;
		padding: 4px;
		border: none;
		border-radius: 12px;
		background: transparent;
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
	}

	.favorite-icon-btn {
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
	.favorite-icon-btn:focus-visible {
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
		.favorite-links-actions {
			align-self: stretch;
			justify-content: space-between;
		}

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
		.home-page {
			width: min(100%, 1020px);
			max-width: 1020px;
			display: grid;
			grid-template-columns: minmax(0, 1fr) 390px;
			align-items: start;
			gap: 30px 32px;
			padding-top: 28px;
		}

		.home-hero,
		.stories-section {
			grid-column: 1 / -1;
		}

		.home-hero {
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(340px, 430px);
			align-items: end;
			gap: 24px;
		}

		.home-hero-top {
			align-items: center;
		}

		.home-notification {
			position: absolute;
			top: 4px;
			right: 454px;
		}

		.home-context {
			display: flex;
			grid-column: 1;
		}

		.home-search {
			grid-column: 2;
			grid-row: 1 / span 2;
			align-self: center;
		}

		.links-section {
			grid-column: 1;
		}

		.full-width-section {
			grid-column: 2;
		}

		.fab-group {
			bottom: 24px;
			right: 24px;
		}
	}
</style>
