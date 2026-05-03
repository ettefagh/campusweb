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
		}, 150);
	}


</script>

<div class="search-snap-container" class:active={isSearchActive}>
	<div class="search-input-wrapper glass">
		<span class="search-icon" aria-hidden="true">🔍</span>
		<!-- 
			Enforcing strict minimum font-size: 16px to prevent iOS Safari auto-zoom 
		-->
		<input
			bind:this={inputElement}
			type="search"
			{placeholder}
			bind:value={searchQuery}
			onfocus={onFocus}
			onblur={onBlur}
			class="snap-search-input"
			aria-label={placeholder}
		/>

	</div>

	<!-- Space for results or dropdown directly below the input -->
	{#if (isSearchActive || searchQuery.trim()) && children}
		<div class="search-results-container">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	/* Resting state: Sits normally above the bottom navigation */
	.search-snap-container {
		position: relative;
		margin: 0 auto;
		width: 100%;
		z-index: 900;
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	/* Active state: Snaps to Top */
	.search-snap-container.active {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		z-index: 9999;
		margin: 0;
		/* Hardware Notch & Safe Area Mitigation */
		padding-top: env(safe-area-inset-top, 20px);
		background-color: var(--bg-color, #ffffff);
		display: flex;
		flex-direction: column;
	}

	@media (prefers-color-scheme: dark) {
		.search-snap-container.active {
			background-color: var(--bg-color, #0d0d14);
		}
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

	.search-snap-container.active .search-input-wrapper {
		margin: var(--spacing-sm, 12px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
		/* Prevents iOS Safari auto-zoom which breaks layouts */
		font-size: 16px; 
		color: var(--text-color, inherit);
		width: 100%;
		padding: 0 4px;
		-webkit-appearance: textfield;
		appearance: auto;
	}

	.snap-search-input:focus {
		outline: none;
		background: transparent;
		border-color: transparent;
	}

	.clear-btn {
		background: rgba(0,0,0,0.05);
		border-radius: 50%;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		color: var(--text-color, inherit);
		opacity: 0.6;
		border: none;
		cursor: pointer;
	}

	@media (prefers-color-scheme: dark) {
		.clear-btn { background: rgba(255,255,255,0.1); }
	}

	/* Scrollable container for contiguous space between top-anchored input and virtual keyboard */
	.search-results-container {
		flex: 1;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		padding: var(--spacing-md, 16px);
		max-width: 800px;
		margin: 0 auto;
		width: 100%;
		display: flex;
		flex-direction: column;
	}
</style>
