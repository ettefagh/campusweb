<script lang="ts">
	export let title: string;
	export let subtitle: string = "";
	export let href: string = "";
	export let hrefLabel: string = "View All →";
</script>

<div class="modular-section-header">
	<div class="title-group">
		<h2>{title}</h2>
		{#if subtitle}
			<p class="subtitle">{subtitle}</p>
		{/if}
	</div>
	<div class="actions">
		<slot />
		{#if href}
			<a {href} class="view-all-link">{hrefLabel}</a>
		{/if}
	</div>
</div>

<style>
	.modular-section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-sm);
	}

	.title-group h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-color);
		margin: 0;
	}

	.subtitle {
		font-size: 0.8rem;
		color: var(--text-color-secondary);
		margin: 2px 0 0 0;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 8px;
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
</style>
