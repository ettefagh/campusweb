<script lang="ts">
	import '../app.css';
	import BottomNav from '$lib/components/BottomNav.svelte';
</script>

<a href="#main" class="skip-to-main">Skip to main content</a>

<div class="app-container">
	<main id="main" class="content-area">
		<slot />
	</main>
	
	<BottomNav />
</div>

<style>
	.app-container {
		position: relative;
	}
</style>
