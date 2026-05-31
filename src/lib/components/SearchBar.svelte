<script lang="ts">
	let {
		searchQuery = $bindable(''),
		isSearchActive = $bindable(false),
		placeholder = 'Search...',
		clearLabel = 'Clear search',
		onkeydown,
		children
	} = $props<{
		searchQuery: string;
		isSearchActive?: boolean;
		placeholder?: string;
		clearLabel?: string;
		onkeydown?: (e: KeyboardEvent) => void;
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

<div class="search-snap-container" role="search">
	<div class="search-active-content">
		<div class="search-input-wrapper glass">
			<i class="ph-bold ph-magnifying-glass search-icon" aria-hidden="true"></i>
			<input
				bind:this={inputElement}
				id="search-input"
				type="search"
				{placeholder}
				bind:value={searchQuery}
				onfocus={onFocus}
				onblur={onBlur}
				{onkeydown}
				class="snap-search-input"
				aria-label={placeholder}
				aria-controls="search-results"
			/>
		</div>

		{#if (isSearchActive || searchQuery.trim()) && children}
			<div id="search-results" class="search-results-container">
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
		background: var(--surface-solid, var(--bg-color));
		border-radius: 14px;
		border: 1px solid var(--surface-border, rgba(0,0,0,0.1));
		padding: 0 14px;
		height: 52px;
		box-shadow: var(--campus-shadow-soft, 0 10px 28px rgba(15, 23, 42, 0.07));
		transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
	}

	.search-input-wrapper:focus-within {
		border-color: rgba(var(--primary-color-rgb, 212, 68, 7), 0.45);
		box-shadow: 0 12px 32px rgba(var(--primary-color-rgb, 212, 68, 7), 0.12), var(--campus-shadow-soft);
		transform: translateY(-1px);
	}

	.search-icon {
		font-size: 1.22rem;
		color: var(--text-color-secondary);
		opacity: 0.78;
		margin-right: 12px;
		flex-shrink: 0;
	}

	.snap-search-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		font-size: 0.98rem;
		font-weight: 600;
		color: var(--text-color, inherit);
		width: 100%;
		padding: 0 4px;
		-webkit-appearance: textfield;
		appearance: auto;
	}

	.snap-search-input::placeholder {
		color: var(--text-color-secondary);
		font-weight: 500;
		opacity: 0.8;
	}

	.search-results-container {
		margin-top: var(--spacing-md);
		width: 100%;
	}
</style>
