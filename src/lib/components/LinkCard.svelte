<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	export let link: {
		id: string;
		title: string;
		url: string;
		icon: string;
		description?: string;
		category_name?: string;
	};
	export let isFavorite: boolean = false;
	export let useViewer: boolean = false;
	export let editMode: boolean = false;
	
	const dispatch = createEventDispatcher();
	
	function handleClick(e: MouseEvent) {
		if (editMode) {
			e.preventDefault();
			dispatch('toggleFavorite', { linkId: link.id });
		}
	}

	function toggleFavorite(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		dispatch('toggleFavorite', { linkId: link.id });
	}

	$: finalUrl = useViewer 
		? `/viewer?url=${encodeURIComponent(link.url)}&title=${encodeURIComponent(link.title)}`
		: link.url;
</script>

<div 
	class="link-card-container" 
	class:edit-mode={editMode}
	class:not-favorite={editMode && !isFavorite}
>
	<a 
		href={finalUrl}
		class="link-card"
		class:clickable={editMode}
		on:click={handleClick}
		role={editMode ? 'button' : undefined}
		tabindex={editMode ? 0 : undefined}
	>
		<span class="icon" aria-hidden="true">{link.icon}</span>
		<div class="content">
			<h3 class="title">{link.title}</h3>
			{#if link.description}
				<p class="description">{link.description}</p>
			{/if}
			{#if link.category_name}
				<span class="category">{link.category_name}</span>
			{/if}
		</div>
		
		{#if editMode}
			<div class="edit-indicator">
				{isFavorite ? '✓' : '+'}
			</div>
		{/if}
	</a>
	
	{#if !editMode}
		<button
			class="favorite-btn"
			class:is-favorite={isFavorite}
			on:click={toggleFavorite}
			aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
			aria-pressed={isFavorite}
		>
			{isFavorite ? '⭐' : '☆'}
		</button>
	{/if}
</div>

<style>
	.link-card-container {
		display: flex;
		align-items: stretch;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-md);
		transition: opacity 0.2s;
	}

	.link-card-container.edit-mode {
		opacity: 1;
	}

	.link-card-container.not-favorite {
		opacity: 0.5;
	}
	
	.link-card {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		min-height: var(--touch-target-min);
		padding: var(--spacing-md);
		background: #F5F0E6; /* SRH Cream/Beige */
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		text-decoration: none;
		color: var(--text-color);
		transition: all 0.2s ease;
		box-shadow: var(--shadow-sm);
	}

	/* Dark mode override for card background */
	@media (prefers-color-scheme: dark) {
		.link-card {
			background: var(--card-bg); /* Keep existing dark theme background */
			border-color: var(--border-color);
		}
	}

	.link-card.clickable {
		cursor: pointer;
	}
	
	.link-card:hover,
	.link-card:focus-visible {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
		border-color: var(--primary-color);
	}
	
	.icon {
		font-size: 32px;
		line-height: 1;
		flex-shrink: 0;
	}
	
	.content {
		flex: 1;
		min-width: 0;
	}
	
	.title {
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 var(--spacing-xs) 0;
		color: var(--text-color);
	}
	
	.description {
		font-size: 0.875rem;
		color: #666;
		margin: 0 0 var(--spacing-xs) 0;
		line-height: 1.4;
	}
	
	@media (prefers-color-scheme: dark) {
		.description {
			color: #aaa;
		}
	}
	
	.category {
		display: inline-block;
		font-size: 0.75rem;
		padding: 2px 8px;
		background: rgba(212, 68, 7, 0.1);
		color: var(--primary-color);
		border-radius: 4px;
		font-weight: 500;
	}

	.edit-indicator {
		font-size: 1.5rem;
		font-weight: bold;
		color: var(--primary-color);
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 32px;
	}
	
	.favorite-btn {
		min-width: var(--touch-target-min);
		min-height: var(--touch-target-min);
		font-size: 24px;
		background: var(--card-bg);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.favorite-btn:hover,
	.favorite-btn:focus-visible {
		background: rgba(212, 68, 7, 0.1);
		border-color: var(--primary-color);
		transform: scale(1.05);
	}
	
	.favorite-btn.is-favorite {
		background: rgba(255, 215, 0, 0.15);
		border-color: gold;
	}
</style>
