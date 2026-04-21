<script lang="ts">
	import '../app.css';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import UpdatePrompt from '$lib/components/UpdatePrompt.svelte';
	import { browser } from '$app/environment';
	import { activeA11yClasses, A11Y_CLASS_MAP } from '$lib/stores/accessibility';

	// Bridge: sync accessibility store → <html> class list.
	// All CSS a11y overrides target html.a11y-* classes, so this is the
	// only place the store needs to be wired in — no prop drilling.
	if (browser) {
		activeA11yClasses.subscribe((activeClasses) => {
			const allClasses = Object.values(A11Y_CLASS_MAP);
			const html = document.documentElement;
			// Remove all a11y classes first, then re-apply active ones
			html.classList.remove(...allClasses);
			if (activeClasses.length > 0) {
				html.classList.add(...activeClasses);
			}
		});
	}
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
