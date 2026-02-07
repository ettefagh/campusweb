```
<script lang="ts">
	let searchQuery = '';
	
	function handleSearch(event: Event) {
		event.preventDefault(); // Prevent default form submission
		const trimmedQuery = searchQuery.trim();
		if (trimmedQuery.length >= 1) {
			const targetUrl = `https://www.srh-university.de/en/search/?q=${encodeURIComponent(trimmedQuery)}`;
			const viewerUrl = `/viewer?url=${encodeURIComponent(targetUrl)}&title=SRH%20Search`;
			window.location.href = viewerUrl;
		}
	}
</script>

<svelte:head>
	<title>Search - SRH Campus Hub</title>
</svelte:head>

<div class="search-page">
	<header class="page-header">
		<h1>🔍 SRH Search</h1>
		<p class="subtitle">Search the official university website</p>
	</header>
	
	<form class="search-container" on:submit={handleSearch}>
		<label for="search-input" class="sr-only">Search university website</label>
		<div class="input-wrapper">
			<input
				id="search-input"
				type="search"
				placeholder="e.g. student visa, library, exams"
				bind:value={searchQuery}
				class="search-input"
				autocomplete="off"
			/>
			<button type="submit" class="search-btn" disabled={!searchQuery.trim()}>
				Search
			</button>
		</div>
	</form>
	
	<div class="search-tips">
		<h2>Search Tips</h2>
		<ul>
			<li>This searches the official SRH University website</li>
			<li>Try terms like "student visa", "academic calendar"</li>
			<li>Results will open in the viewer or external browser</li>
		</ul>
	</div>
</div>

<style>
	.search-page {
		padding-bottom: var(--spacing-xl);
		max-width: 600px;
		margin: 0 auto;
	}
	
	.page-header {
		padding: var(--spacing-lg) 0;
		text-align: center;
		margin-bottom: var(--spacing-lg);
	}
	
	h1 {
		margin-bottom: var(--spacing-sm);
	}
	
	.subtitle {
		color: var(--text-color-secondary);
		font-size: 1rem;
	}
	
	.search-container {
		margin-bottom: var(--spacing-xl);
	}
	
	.input-wrapper {
		display: flex;
		gap: var(--spacing-sm);
	}
	
	.search-input {
		flex: 1;
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
	
	.search-btn {
		background: var(--primary-color);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		padding: 0 var(--spacing-lg);
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
	}
	
	.search-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.search-tips {
		padding: var(--spacing-lg);
		background: rgba(212, 68, 7, 0.05); /* SRH Orange tint */
		border-radius: var(--radius-md);
		border: 1px solid rgba(212, 68, 7, 0.1);
	}
	
	.search-tips h2 {
		font-size: 1.1rem;
		margin-bottom: var(--spacing-md);
		color: var(--primary-color);
	}
	
	.search-tips ul {
		list-style: none;
		padding: 0;
	}
	
	.search-tips li {
		padding: var(--spacing-xs) 0;
		padding-left: var(--spacing-lg);
		position: relative;
		font-size: 0.95rem;
		color: var(--text-color);
	}
	
	.search-tips li::before {
		content: '→';
		position: absolute;
		left: 0;
		color: var(--primary-color);
	}
</style>
