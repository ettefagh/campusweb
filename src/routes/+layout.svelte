<script lang="ts">
	import '../app.css';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import UpdatePrompt from '$lib/components/UpdatePrompt.svelte';
</script>

<a href="#main" class="skip-to-main">Skip to main content</a>

<div class="app-container">
	<BottomNav />
	<main id="main" class="content-area">
		<slot />
	</main>
	<UpdatePrompt />
</div>

<style>
	.app-container {
		position: relative;
		min-height: 100vh;
		/* Mobile: pad bottom for bottom nav */
		padding-bottom: calc(var(--touch-target-min) + var(--spacing-lg) + var(--spacing-lg));
	}

	/* Desktop: shift content right for sidebar, remove bottom padding */
	@media (min-width: 1024px) {
		.app-container {
			margin-left: var(--sidebar-width, 220px);
			padding-bottom: 0;
		}
	}
</style>
