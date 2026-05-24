<script lang="ts">
	import { t } from "$lib/i18n";
</script>

<svelte:head>
	<title>{$t.home.pageTitle}</title>
	<meta
		name="description"
		content={$t.home.subtitle}
	/>
</svelte:head>

<!-- 
  The actual content of this page is rendered persistently in src/routes/+layout.svelte 
  via HomeContent.svelte to prevent full page refreshes on tab navigation.
  This page serves as the entry point and SEO shell.
-->
<div class="page-shell">
	<div class="page-placeholder"></div>
</div>

<style>
	.page-shell {
		min-height: 100vh;
	}
</style>
