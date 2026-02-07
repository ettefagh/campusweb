<script lang="ts">
	import LinkCard from '$lib/components/LinkCard.svelte';
	
	const tools = [
		{
			id: 'calendar-enhancer',
			title: 'Calendar Enhancer',
			url: 'https://srh-calendar-enhancer.padarhava.workers.dev',
			icon: '📅',
			description: 'Enhance your university calendar',
			category_name: 'Utility'
		},
		{
			id: 'pdf-tools',
			title: 'PDF Tools',
			url: 'https://tools.pdf24.org/en/',
			icon: '📄',
			description: 'Edit, merge, and convert PDFs',
			category_name: 'Utility'
		},
		{
			id: 'library-resources',
			title: 'Library E-Resources',
			url: 'https://login.srh-berlin.idm.oclc.org/menu',
			icon: '📚',
			description: 'Access digital library resources',
			category_name: 'Academic'
		}
	];
	
	function handleToggleFavorite(event: CustomEvent<{ linkId: string }>) {
		// Favorite logic can be implemented here if needed for tools
	}
</script>

<svelte:head>
	<title>Tools - SRH Campus Hub</title>
</svelte:head>

<div class="tools-page">
	<header class="page-header">
		<h1>🛠️ Tools</h1>
		<p class="subtitle">Useful utilities for students</p>
	</header>
	
	<section class="tools-section">
		{#each tools as tool (tool.id)}
			<LinkCard 
				link={tool} 
				isFavorite={false}
				on:toggleFavorite={handleToggleFavorite}
			/>
		{/each}
	</section>
</div>

<style>
	.tools-page {
		padding-bottom: var(--spacing-xl);
	}
	
	.page-header {
		text-align: center;
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
	
	.tools-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}
</style>
