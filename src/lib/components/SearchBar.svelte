<script lang="ts">
	let {
		searchQuery = $bindable(''),
		isSearchActive = $bindable(false),
		placeholder = 'Search...',
		clearLabel = 'Clear search',
		children
	} = $props<{
		searchQuery: string;
		isSearchActive?: boolean;
		placeholder?: string;
		clearLabel?: string;
		children?: import('svelte').Snippet;
	}>();

	let inputElement: HTMLInputElement | undefined = $state();

	export function focus() {
		inputElement?.focus();
	}

	export function blur() {
		inputElement?.blur();
	}

	function onFocus() {
		isSearchActive = true;
	}

	function onBlur() {
		// Small delay allows for clicks on dropdown results before state changes
		setTimeout(() => {
			isSearchActive = false;
			if (typeof window !== 'undefined') {
				// Forces mobile browsers to recalculate visual viewport boundaries and snap fixed elements back to the bottom
				window.scrollTo(window.scrollX, window.scrollY);
			}
		}, 150);
	}


</script>

<div class="search-snap-container">
	<div class="search-active-content">
		<div class="search-input-wrapper glass">
			<span class="search-icon" aria-hidden="true">🔍</span>
			<input
				bind:this={inputElement}
				id="search-input"
				type="search"
				{placeholder}
				bind:value={searchQuery}
				onfocus={onFocus}
				onblur={onBlur}
				class="snap-search-input"
				aria-label={placeholder}
			/>
		</div>

		{#if (isSearchActive || searchQuery.trim()) && children}
			<div class="search-results-container">
				{@render children()}
			</div>
		{/if}
	</div>
</div>

<style>
	.search-snap-container {
		position: relative;
		margin: 0 auto;
		width: 100%;
		z-index: 900;
	}

	.search-active-content {
		width: 100%;
		display: flex;
		flex-direction: column;
		margin: 0 auto;
	}

	.search-input-wrapper {
		display: flex;
		align-items: center;
		background: var(--bg-color);
		border-radius: var(--radius-md, 12px);
		border: 2px solid var(--glass-border-subtle, rgba(0,0,0,0.1));
		padding: 0 var(--spacing-sm, 12px);
		height: 48px;
		transition: border-color 0.2s;
	}

	.search-input-wrapper:focus-within {
		border-color: var(--primary-color, #d44407);
	}

	.search-icon {
		font-size: 1.1rem;
		opacity: 0.5;
		margin-right: 12px;
		flex-shrink: 0;
	}

	.snap-search-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		font-size: 16px; 
		color: var(--text-color, inherit);
		width: 100%;
		padding: 0 4px;
		-webkit-appearance: textfield;
		appearance: auto;
	}

	.search-results-container {
		margin-top: var(--spacing-md);
		width: 100%;
	}
</style>
