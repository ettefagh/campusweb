<script lang="ts">
  import { onMount } from "svelte";

  let PdfViewer = $state<any>(null);

  onMount(async () => {
    const module = await import("$lib/components/PdfViewer.svelte");
    PdfViewer = module.default;
  });
</script>

<svelte:head>
  <title>Berlin Rail Map</title>
</svelte:head>

{#if PdfViewer}
  <svelte:component this={PdfViewer} />
{:else}
  <div class="boot-screen">
    <span class="spinner" aria-hidden="true"></span>
    <p>Loading map…</p>
  </div>
{/if}

<style>
  .boot-screen {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: var(--text-color-secondary);
    font-size: 0.9rem;
  }

  .boot-screen p { margin: 0; }

  .spinner {
    display: block;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    border: 2px solid rgba(212,68,7,0.15);
    border-top-color: var(--primary-color);
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
