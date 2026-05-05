<script lang="ts">
	import LinkCard from "$lib/components/LinkCard.svelte";
	import { favorites } from "$lib/stores/favorites";
	import { allLinks } from "$lib/data/links";
	import { t } from "$lib/i18n";
	import { settingsStore } from "$lib/stores/settingsStore";

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
	<header class="page-header">
		<div class="logo-container">
			<img
				src="/icon-light.png"
				alt="SRH University Logo"
				class="logo light-mode"
				width="48"
				height="48"
			/>
			<img
				src="/icon-dark.png"
				alt="SRH University Logo"
				class="logo dark-mode"
				width="48"
				height="48"
			/>
		</div>
		<h1>{$t.home.title}</h1>
		<p class="subtitle">{$t.home.subtitle}</p>
	</header>

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

	{#each $settingsStore.homeSections as section (section.id)}
		{#if section.enabled}
			{#if section.id === "favorites"}
				<section class="links-section">
					<h2 class="sr-only">{$t.home.universityLinks}</h2>
					{#if displayLinks.length === 0}
						<div class="empty-state">
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
			{:else if section.id === "calendar"}
				<section class="links-section full-width-section">
					<div class="modular-section-header">
						<h2>📅 {$t.calendar?.pageTitle || "Calendar Schedule"}</h2>
						<a href="/calendar" class="view-all-link">{$t.home?.viewAll || "View Full Calendar"} →</a>
					</div>
					<div class="modular-placeholder glass">
						<p>Your calendar schedule is modularly prepared. Navigate to the calendar tab to view your active class timetable.</p>
					</div>
				</section>
			{:else if section.id === "feed"}
				<section class="links-section full-width-section">
					<div class="modular-section-header">
						<h2>📰 {$t.feed?.pageTitle || "Campus Feed"}</h2>
						<a href="/feed" class="view-all-link">{$t.home?.viewAllNews || "View All News"} →</a>
					</div>
					<div class="modular-placeholder glass">
						<p>Your campus news and events feed is modularly prepared. Navigate to the feed tab to browse global announcements.</p>
					</div>
				</section>
			{/if}
		{/if}
	{/each}

	<footer class="page-footer">
		<button
			class="edit-link"
			class:editing={isEditMode}
			on:click={toggleEditMode}
		>
			{isEditMode ? $t.home.done : $t.home.editFavorites}
		</button>
	</footer>
</div>

<style>
	.home-page {
		padding-bottom: var(--spacing-xl);
	}

	.page-header {
		text-align: center;
		padding: var(--spacing-xl) 0;
		margin-bottom: var(--spacing-lg);
		margin-top: 15%;
	}

	/* Desktop: reduce the large mobile thumb-zone spacing */
	@media (min-width: 1024px) {
		.page-header {
			margin-top: var(--spacing-lg);
		}
	}

	.logo-container {
		margin-bottom: var(--spacing-md);
	}

	.logo {
		width: 64px;
		height: 64px;
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
</style>
