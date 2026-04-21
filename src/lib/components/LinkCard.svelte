<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { accessibility } from "$lib/stores/accessibility";

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
			dispatch("toggleFavorite", { linkId: link.id });
		}
	}

	function toggleFavorite(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		dispatch("toggleFavorite", { linkId: link.id });
	}

	$: finalUrl = useViewer
		? `/viewer?url=${encodeURIComponent(link.url)}&title=${encodeURIComponent(link.title)}`
		: link.url;

	// Accessibility: build aria-label based on context and screen reader hints setting.
	// In edit mode: always explicit about the toggle action.
	// In normal mode + screenReaderHints: include the destination URL as a hint.
	$: ariaLabel = (() => {
		if (editMode) {
			return `${link.title} — ${isFavorite ? 'Remove from favorites' : 'Add to favorites'}`;
		}
		if ($accessibility.screenReaderHints) {
			const dest = link.description ? `${link.description}. ` : '';
			return `${link.title}. ${dest}Opens ${link.url} in a new tab.`;
		}
		return undefined; // Let visible text serve as the label
	})();
</script>

<div
	class="link-card-container"
	class:edit-mode={editMode}
	class:not-favorite={editMode && !isFavorite}
	class:a11y-patterns={$accessibility.assistivePatterns}
>
	<a
		href={finalUrl}
		class="link-card"
		class:clickable={editMode}
		target={editMode ? undefined : "_blank"}
		rel={editMode ? undefined : "noopener noreferrer"}
		on:click={handleClick}
		role={editMode ? "button" : undefined}
		tabindex={editMode ? 0 : undefined}
		aria-pressed={editMode ? isFavorite : undefined}
		aria-label={ariaLabel}
		class:is-favorite={isFavorite}
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
			<div class="edit-indicator" class:is-favorite={isFavorite} aria-hidden="true">
				<span class="indicator-icon">{isFavorite ? "⭐" : "☆"}</span>
			</div>
		{/if}
	</a>


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
		/* opacity managed by the card itself now */
	}

	/* ── Liquid Glass Card ── */
	.link-card {
		flex: 1;
		display: flex;
		align-items: flex-start;
		gap: var(--spacing-md);
		min-height: var(--touch-target-min);
		padding: var(--spacing-md);
		background: var(--glass-bg-light);
		backdrop-filter: var(--glass-blur);
		-webkit-backdrop-filter: var(--glass-blur);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-md);
		text-decoration: none;
		color: var(--text-color);
		transition: all 0.22s ease;
		box-shadow: var(--glass-shadow);
		position: relative;
		overflow: hidden;
	}

	/* Subtle specular highlight on top edge */
	.link-card::before {
		content: "";
		position: absolute;
		top: 0;
		left: 10%;
		right: 10%;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
		pointer-events: none;
	}

	.link-card.clickable {
		cursor: pointer;
	}

	/* Accessibility Texture: Favorite (On) - Only visible if assistivePatterns is ON */
	.a11y-patterns .link-card.clickable.is-favorite {
		background: repeating-linear-gradient(
			45deg,
			rgba(212, 68, 7, 0.05),
			rgba(212, 68, 7, 0.05) 10px,
			var(--glass-bg-strong) 10px,
			var(--glass-bg-strong) 20px
		);
		border: 1px solid var(--primary-color);
		box-shadow: 0 0 15px rgba(212, 68, 7, 0.2), var(--glass-shadow);
	}

	/* Accessibility Texture: Not Favorite (Off) - Only visible if assistivePatterns is ON */
	.a11y-patterns .link-card.clickable:not(.is-favorite) {
		background: repeating-linear-gradient(
			-45deg,
			rgba(0, 0, 0, 0.03),
			rgba(0, 0, 0, 0.03) 10px,
			var(--glass-bg-light) 10px,
			var(--glass-bg-light) 20px
		);
		border: 1px dashed var(--border-color);
		opacity: 0.7;
	}

	@media (prefers-color-scheme: dark) {
		.a11y-patterns .link-card.clickable:not(.is-favorite) {
			background: repeating-linear-gradient(
				-45deg,
				rgba(255, 255, 255, 0.03),
				rgba(255, 255, 255, 0.03) 10px,
				var(--glass-bg-light) 10px,
				var(--glass-bg-light) 20px
			);
		}
	}

	.link-card:hover,
	.link-card:focus-visible {
		transform: translateY(-3px);
		box-shadow: var(--glass-shadow-hover);
		border-color: rgba(212, 68, 7, 0.35);
		background: var(--glass-bg-strong);
	}

	.icon {
		font-size: 32px;
		line-height: 1;
		flex-shrink: 0;
		filter: drop-shadow(0 1px 2px rgba(0,0,0,0.15));
	}

	.content {
		flex: 1;
		min-width: 0;
	}

	.title {
		font-size: 1rem;
		font-weight: 700;
		margin: 0 0 var(--spacing-xs) 0;
		color: var(--text-color);
	}

	.description {
		font-size: 0.875rem;
		color: var(--text-color-secondary);
		margin: 0 0 var(--spacing-xs) 0;
		line-height: 1.4;
	}

	.category {
		display: inline-block;
		font-size: 0.75rem;
		padding: 2px 8px;
		background: rgba(212, 68, 7, 0.12);
		color: var(--primary-color);
		border-radius: 6px;
		font-weight: 500;
		border: 1px solid rgba(212, 68, 7, 0.2);
	}

	/* Indicator inside the card */
	.edit-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.05);
		transition: all 0.2s ease;
	}

	.edit-indicator.is-favorite {
		background: rgba(255, 215, 0, 0.15);
	}

	.indicator-icon {
		font-size: 1.2rem;
		line-height: 1;
	}

	@media (prefers-color-scheme: dark) {
		.edit-indicator {
			background: rgba(255, 255, 255, 0.1);
		}
	}
</style>
