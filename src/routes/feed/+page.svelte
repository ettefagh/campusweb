<script lang="ts">
  import { t } from "$lib/i18n";
</script>

<svelte:head>
  <title>{$t.feed.pageTitle}</title>
</svelte:head>

<!-- 
  The actual content of this page is rendered persistently in src/routes/+layout.svelte 
  to prevent social media embeds from refreshing on every navigation.
  This page serves as the entry point and SEO shell.
-->
<div class="feed-shell">
  <div class="feed-placeholder"></div>
</div>

<style>
  .feed-shell {
    min-height: 100vh;
  }
</style>
