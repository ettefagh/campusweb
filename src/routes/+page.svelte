<script lang="ts">
	import LinkCard from "$lib/components/LinkCard.svelte";
	import IdSlider from "$lib/components/IdSlider.svelte";
	import { favorites } from "$lib/stores/favorites";
	import { allLinks } from "$lib/data/links";
	import { t } from "$lib/i18n";
	import { settingsStore } from "$lib/stores/settingsStore";
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";

	let showGoToTop = false;
	let container: HTMLElement | null = null;

	onMount(() => {
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
	let searchQuery = "";

	// Reactive filtered links
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
		: allLinks.filter((link) => $favorites.includes(link.id));

	function toggleEditMode() {
		isEditMode = !isEditMode;
		searchQuery = "";
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
	{#if isEditMode}
		<!-- Search Box in Edit Mode -->
		<div class="search-container">
			<input
				type="text"
				placeholder={$t.home.searchPlaceholder}
				bind:value={searchQuery}
				class="search-input"
			/>
		</div>
	{/if}

	{#each $settingsStore.homeSections as section, i (section.id)}
		{#if section.enabled}
			{#if section.id === "header"}
				<header class="page-header narrow" style="animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; animation-delay: {i * 100}ms;">
					<div class="logo-container">
						<img
							src="/icon-light.png"
							alt="SRH University Logo"
							class="logo light-mode"
							width="36"
							height="36"
						/>
						<img
							src="/icon-dark.png"
							alt="SRH University Logo"
							class="logo dark-mode"
							width="36"
							height="36"
						/>
					</div>
					<div class="header-text">
						<h1>{$t.home.title}</h1>
						<p class="subtitle">{$t.home.subtitle}</p>
					</div>
				</header>
			{:else if section.id === "favorites"}
				<section class="links-section" style="animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; animation-delay: {i * 100}ms;">
					<div class="favorite-links-header">
						<div class="favorite-links-title-group">
							<h2>{$t.home.universityLinks || 'Favorite Links'}</h2>
							<p class="favorite-links-subtitle">Custom quick-access bookmarks</p>
						</div>
						<div class="favorite-links-actions">
							<button 
								class="favorite-action-btn"
								class:active={isEditMode}
								on:click={toggleEditMode}
							>
								{isEditMode ? 'Done' : 'Manage'}
							</button>
						</div>
					</div>
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
								useViewer={!isEditMode}
								on:toggleFavorite={handleToggleFavorite}
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

	<!-- Floating Action Buttons -->
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
		/* Respect Apple top notch and safe area */
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
		font-size: 1.2rem;
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
		border-radius: var(--radius-md);
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

	.page-footer {
		text-align: center;
		margin-top: var(--spacing-xl);
		padding-bottom: var(--spacing-lg);
	}

	.edit-link {
		background: none;
		border: none;
		color: var(--text-color-secondary);
		font-size: 0.9rem;
		text-decoration: underline;
		cursor: pointer;
		padding: var(--spacing-sm);
	}

	.edit-link:hover {
		color: var(--primary-color);
	}

	.edit-link.editing {
		color: var(--primary-color);
		font-weight: 600;
		text-decoration: none;
	}

	.search-container {
		margin: 0 0 var(--spacing-md) 0;
		padding: 0 var(--spacing-md);
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

	/* Desktop: grid layout for link cards */
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

	.full-width-section {
		display: block !important;
		grid-column: 1 / -1;
		margin-top: var(--spacing-xl);
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

	.favorite-action-btn {
		background: var(--glass-bg-light);
		border: 1px solid var(--glass-border-subtle);
		padding: 6px 14px;
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 700;
		cursor: pointer;
		color: var(--text-color);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.favorite-action-btn:hover {
		background: rgba(212, 68, 7, 0.1);
		color: var(--primary-color);
		border-color: rgba(212, 68, 7, 0.2);
	}

	.favorite-action-btn.active {
		background: var(--primary-color);
		color: white;
		border-color: var(--primary-color);
		box-shadow: 0 2px 8px rgba(212, 68, 7, 0.3);
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
		bottom: 120px; /* safe above bottom navigation bar */
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
			bottom: 24px; /* clears tab bar which is sidebar on desktop */
			right: 24px;
		}
	}
</style>
