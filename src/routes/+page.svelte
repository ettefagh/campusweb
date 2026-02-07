<script lang="ts">
	import LinkCard from '$lib/components/LinkCard.svelte';
	import { favorites } from '$lib/stores/favorites';
	import { allLinks } from '$lib/data/links';
	
	let isEditMode = false;
	let searchQuery = '';

	// Reactive filtered links
    $: displayLinks = isEditMode
        ? allLinks.filter(link => {
            const query = searchQuery.toLowerCase().trim();
            if (!query) return true;
            return (
                link.title.toLowerCase().includes(query) ||
                link.description.toLowerCase().includes(query)
            );
        })
        : allLinks.filter(link => $favorites.includes(link.id));

	function toggleEditMode() {
		isEditMode = !isEditMode;
		searchQuery = '';
	}

	function handleToggleFavorite(event: CustomEvent<{ linkId: string }>) {
		favorites.toggle(event.detail.linkId);
	}
</script>

<svelte:head>
	<title>SRH Campus Hub - Quick Access to University Resources</title>
	<meta name="description" content="Quick access to SRH University resources - optimized for mobile" />
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
		<h1>Campusweb</h1>
		<p class="subtitle">Quick access to university resources</p>
	</header>

	{#if isEditMode}
		<!-- Search Box in Edit Mode -->
		<div class="search-container">
			<input 
				type="text" 
				placeholder="Search links..." 
				bind:value={searchQuery}
				class="search-input"
			/>
		</div>
	{/if}
	
	<section class="links-section">
		<h2 class="sr-only">University Links</h2>
		{#if displayLinks.length === 0}
			<div class="empty-state">
				<p>No favorites yet. Click Edit below to add some!</p>
			</div>
		{:else}
			{#each displayLinks as link (link.id)}
				<LinkCard 
					{link} 
					isFavorite={$favorites.includes(link.id)}
					editMode={isEditMode}
					on:toggleFavorite={handleToggleFavorite}
				/>
			{/each}
		{/if}
	</section>

	<footer class="page-footer">
		<button 
			class="edit-link" 
			class:editing={isEditMode}
			on:click={toggleEditMode}
		>
			{isEditMode ? 'Done' : 'Edit Favorites'}
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
		border-bottom: 2px solid var(--border-color);
		margin-bottom: var(--spacing-lg);
	}
	
	.logo-container {
		margin-bottom: var(--spacing-md);
	}
	
	.logo {
		width: 64px;
		height: 64px;
		object-fit: contain;
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
</style>
