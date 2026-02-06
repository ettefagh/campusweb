<script lang="ts">
	let searchQuery = '';
	let searchResults: any[] = [];
	let isSearching = false;
	
	async function handleSearch() {
		if (searchQuery.length < 2) {
			searchResults = [];
			return;
		}
		
		isSearching = true;
		// This will be replaced with API call in Phase 4
		setTimeout(() => {
			searchResults = [];
			isSearching = false;
		}, 500);
	}
	
	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		searchQuery = target.value;
		handleSearch();
	}
</script>

<svelte:head>
	<title>Search - SRH Campus Hub</title>
</svelte:head>

<div class="search-page">
	<header class="page-header">
		<h1>🔍 Search</h1>
		<p class="subtitle">Find university resources</p>
	</header>
	
	<div class="search-container">
		<label for="search-input" class="sr-only">Search university links</label>
		<input
			id="search-input"
			type="search"
			placeholder="Search for links..."
			bind:value={searchQuery}
			on:input={handleInput}
			class="search-input"
			autocomplete="off"
		/>
	</div>
	
	{#if isSearching}
		<div class="loading">Searching...</div>
	{:else if searchQuery.length >= 2 && searchResults.length === 0}
		<div class="no-results">
			<span class="empty-icon">🔍</span>
			<p>No results found for "{searchQuery}"</p>
		</div>
	{:else if searchResults.length > 0}
		<section class="search-results">
			<!-- Results will be displayed here -->
		</section>
	{:else}
		<div class="search-tips">
			<h2>Search Tips</h2>
			<ul>
				<li>Try searching for "grades", "library", "email"</li>
				<li>Use keywords from link titles or descriptions</li>
				<li>Search is case-insensitive</li>
			</ul>
		</div>
	{/if}
</div>

<style>
	.search-page {
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
	
	.search-container {
		margin-bottom: var(--spacing-lg);
	}
	
	.search-input {
		width: 100%;
		min-height: var(--touch-target-min);
		font-size: 1rem;
		padding: var(--spacing-md);
		border: 2px solid var(--border-color);
		border-radius: var(--radius-md);
		background: var(--card-bg);
		color: var(--text-color);
		transition: border-color 0.2s;
	}
	
	.search-input:focus {
		border-color: var(--primary-color);
		outline: none;
	}
	
	.loading {
		text-align: center;
		padding: var(--spacing-xl);
		color: #666;
	}
	
	.no-results {
		text-align: center;
		padding: var(--spacing-xl) var(--spacing-md);
	}
	
	.empty-icon {
		font-size: 48px;
		display: block;
		margin-bottom: var(--spacing-md);
		opacity: 0.3;
	}
	
	.search-tips {
		padding: var(--spacing-lg);
		background: rgba(212, 68, 7, 0.05);
		border-radius: var(--radius-md);
		margin-top: var(--spacing-lg);
	}
	
	.search-tips h2 {
		font-size: 1.25rem;
		margin-bottom: var(--spacing-md);
		color: var(--primary-color);
	}
	
	.search-tips ul {
		list-style: none;
		padding: 0;
	}
	
	.search-tips li {
		padding: var(--spacing-sm) 0;
		padding-left: var(--spacing-lg);
		position: relative;
	}
	
	.search-tips li::before {
		content: '→';
		position: absolute;
		left: 0;
		color: var(--primary-color);
	}
</style>
