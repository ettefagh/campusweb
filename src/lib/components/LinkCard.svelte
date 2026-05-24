<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { accessibility } from "$lib/stores/accessibility";
	import { t } from "$lib/i18n";
	import IosAccessibilityIcon from "$lib/components/IosAccessibilityIcon.svelte";
	import { getLinkIconClass, getLinkIconTheme } from "$lib/utils/linkIcons";

	export let link: {
		id: string;
		title: string;
		url: string;
		icon: string;
		description?: string;
		category_name?: string;
		iframeable?: boolean;
	};
	export let isFavorite: boolean = false;
	export let useViewer: boolean = false;
	export let editMode: boolean = false;
	export let reorderMode: boolean = false;
	export let customUrl: string | undefined = undefined;
	export let showTag: boolean = false;
	export let variant: "glass" | "compact-list" = "glass";

	const dispatch = createEventDispatcher();

	function handleClick(e: MouseEvent) {
		if (editMode) {
			e.preventDefault();
			dispatch("toggleFavorite", { linkId: link.id });
			return;
		}

		if (reorderMode) {
			e.preventDefault();
			return;
		}

		recordLinkClick();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!editMode && !reorderMode) return;
		if (e.key !== " " && e.key !== "Enter") return;

		e.preventDefault();
		if (editMode) {
			dispatch("toggleFavorite", { linkId: link.id });
		}
	}

	function toggleFavorite(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		dispatch("toggleFavorite", { linkId: link.id });
	}

	function recordLinkClick() {
		const payload = JSON.stringify({ linkId: link.id });

		try {
			if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
				const blob = new Blob([payload], { type: "application/json" });
				navigator.sendBeacon("/api/stats/link-click", blob);
				return;
			}
		} catch (e) {}

		if (typeof fetch !== "undefined") {
			fetch("/api/stats/link-click", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: payload,
				keepalive: true,
			}).catch(() => {});
		}
	}

	$: displayTitle =
		$t.linkTitle?.[link.id as keyof typeof $t.linkTitle] || link.title;
	$: displayDesc =
		$t.linkDesc?.[link.id as keyof typeof $t.linkDesc] || link.description;
	$: displayCategory = link.category_name
		? $t.linkCategory?.[
				link.category_name as keyof typeof $t.linkCategory
			] || link.category_name
		: undefined;

	$: effectiveUrl = customUrl || link.url;
	$: isInternalLink = effectiveUrl.startsWith("/");
	$: finalUrl =
		useViewer && !isInternalLink && link.iframeable === true
			? `/viewer?url=${encodeURIComponent(effectiveUrl)}&title=${encodeURIComponent(displayTitle)}`
			: effectiveUrl;

	$: ariaLabel = (() => {
		if (editMode) {
			return `${displayTitle} — ${isFavorite ? "Remove from favorites" : "Add to favorites"}`;
		}
		if ($accessibility.screenReaderHints) {
			const dest = displayDesc ? `${displayDesc}. ` : "";
			const destination = isInternalLink
				? "Opens in CampusWeb."
				: useViewer && link.iframeable === true
					? "Opens in the CampusWeb viewer."
					: "Opens in a new tab.";
			return `${displayTitle}. ${dest}${destination}`;
		}
		return undefined;
	})();

	$: linkIconClass = getLinkIconClass(link);
	$: linkIconTheme = getLinkIconTheme(link);
	$: linkIconStyle = [
		`--link-icon-bg: ${linkIconTheme.background}`,
		`--link-icon-border: ${linkIconTheme.border}`,
		`--link-icon-shadow: ${linkIconTheme.shadow}`,
		`--link-hover-bg: ${linkIconTheme.hoverBackground}`,
		`--link-accent: ${linkIconTheme.accent}`,
	].join("; ");
</script>

<div
	class="link-card-container"
	class:edit-mode={editMode}
	class:reorder-mode={reorderMode}
	class:not-favorite={editMode && !isFavorite}
	class:a11y-patterns={$accessibility.assistivePatterns}
	class:compact-list={variant === "compact-list"}
	data-id={link.id}
	role={reorderMode ? "listitem" : undefined}
	style={linkIconStyle}
>
	<a
		href={finalUrl}
		class="link-card"
		class:clickable={editMode || reorderMode}
		target={editMode || reorderMode || link.url.startsWith("/")
			? undefined
			: "_blank"}
		rel={editMode || reorderMode || link.url.startsWith("/")
			? undefined
			: "noopener noreferrer"}
		on:click={handleClick}
		on:keydown={handleKeydown}
		role={editMode || reorderMode ? "button" : undefined}
		tabindex={editMode || reorderMode ? 0 : undefined}
		aria-pressed={editMode ? isFavorite : undefined}
		aria-label={ariaLabel}
		class:is-favorite={isFavorite}
		class:compact-list={variant === "compact-list"}
	>
		<span class="icon" aria-hidden="true">
			{#if linkIconClass === "ios-accessibility"}
				<IosAccessibilityIcon />
			{:else}
				<i class={linkIconClass}></i>
			{/if}
		</span>
		<div class="content">
			<h3 class="title">{displayTitle}</h3>
			{#if displayDesc}
				<p class="description">{displayDesc}</p>
			{/if}
			{#if displayCategory && (editMode || showTag)}
				<span class="category">{displayCategory}</span>
			{/if}
		</div>
		{#if editMode}
			<div
				class="edit-indicator"
				class:is-favorite={isFavorite}
				aria-hidden="true"
			>
				<span class="indicator-icon">{isFavorite ? "⭐" : "☆"}</span>
			</div>
		{:else if variant === "compact-list"}
			<span class="compact-chevron" aria-hidden="true">
				<i class="ph-bold ph-caret-right"></i>
			</span>
		{/if}
	</a>
</div>

<style>
	.link-card-container {
		display: flex;
		align-items: stretch;
		gap: var(--spacing-sm);
		transition: opacity 0.2s;
		margin-top: 15px;
	}

	.link-card-container.compact-list {
		margin-top: 0;
		width: 100%;
	}

	@media (min-width: 768px) {
		.link-card-container {
			margin-top: 0;
		}
	}

	.link-card-container.edit-mode {
		opacity: 1;
	}

	.link-card-container.reorder-mode {
		cursor: grab;
	}

	.link-card-container.reorder-mode:active {
		cursor: grabbing;
	}

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

	.link-card.compact-list {
		align-items: center;
		gap: 14px;
		min-height: 82px;
		padding: 14px 16px;
		background: transparent;
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
		border: none;
		border-radius: 0;
		box-shadow: none;
	}

	.link-card.compact-list:hover,
	.link-card.compact-list:focus-visible {
		transform: none;
		background: var(--link-hover-bg, rgba(212, 68, 7, 0.06));
		box-shadow: none;
		border-color: transparent;
	}

	.link-card.compact-list::before {
		display: none;
	}

	.link-card::before {
		content: "";
		position: absolute;
		top: 0;
		left: 10%;
		right: 10%;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.7),
			transparent
		);
		pointer-events: none;
	}

	.link-card.clickable {
		cursor: pointer;
	}

	.link-card-container.reorder-mode .link-card.clickable {
		cursor: grab;
	}

	.a11y-patterns .link-card.clickable.is-favorite {
		background: repeating-linear-gradient(
			45deg,
			rgba(212, 68, 7, 0.05),
			rgba(212, 68, 7, 0.05) 10px,
			var(--glass-bg-strong) 10px,
			var(--glass-bg-strong) 20px
		);
		border: 1px solid var(--primary-color);
		box-shadow:
			0 0 15px rgba(212, 68, 7, 0.2),
			var(--glass-shadow);
	}

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
		border-color: var(--link-icon-border, rgba(212, 68, 7, 0.35));
		background: var(--glass-bg-strong);
	}

	.link-card:active {
		transform: translateY(0px);
		background: var(--glass-bg-strong);
	}

	.link-card:focus {
		outline: none;
	}

	.icon {
		width: 38px;
		height: 38px;
		display: grid;
		place-items: center;
		border-radius: 12px;
		background: var(
			--link-icon-bg,
			linear-gradient(135deg, #f7b801, #f18701)
		);
		/*border: 1px solid var(--link-icon-border, #ffe1a1);*/
		flex-shrink: 0;
		filter: drop-shadow(
			0 1px 2px var(--link-icon-shadow, rgba(241, 135, 1, 0.24))
		);
	}

	.icon i,
	.icon :global(.ios-accessibility-icon) {
		opacity: 90%;
		display: block;
		color: #ffffff;
		font-size: 27px;
		line-height: 1;
	}

	.link-card.compact-list .icon {
		width: 52px;
		height: 52px;
		display: grid;
		place-items: center;
		border-radius: 13px;
		background: var(
			--link-icon-bg,
			linear-gradient(135deg, #f7b801, #f18701)
		);
		/*border: 1px solid var(--link-icon-border, #ffe1a1);*/
		filter: none;
		/*box-shadow: 0 9px 18px var(--link-icon-shadow, rgba(241, 135, 1, 0.24));*/
	}

	.link-card.compact-list .icon i,
	.link-card.compact-list .icon :global(.ios-accessibility-icon) {
		font-size: 33px;
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

	.link-card.compact-list .title {
		font-size: 1.02rem;
		line-height: 1.18;
		margin-bottom: 3px;
		color: var(--text-color);
	}

	.description {
		font-size: 0.875rem;
		color: var(--text-color-secondary);
		margin: 0 0 var(--spacing-xs) 0;
		line-height: 1.4;
	}

	.link-card.compact-list .description {
		font-size: 0.91rem;
		line-height: 1.22;
		color: var(--text-color-secondary);
		margin: 0;
		max-width: 42ch;
	}

	.compact-chevron {
		display: inline-grid;
		place-items: center;
		margin-left: auto;
		color: var(--text-color-secondary);
		font-size: 1.2rem;
		opacity: 0.82;
	}

	.category {
		display: inline-block;
		font-size: 0.75rem;
		padding: 2px 8px;
		background: var(--link-hover-bg, rgba(212, 68, 7, 0.08));
		color: var(--link-accent, var(--primary-color));
		border-radius: 6px;
		font-weight: 500;
		border: 1px solid var(--link-icon-border, rgba(212, 68, 7, 0.2));
	}

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
