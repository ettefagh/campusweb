<script lang="ts">
  import { goto } from "$app/navigation";

  const mapUrl = "/Documents/berlin-railmap.pdf";

  let query = "";
  let submittedQuery = "";

  $: normalizedQuery = submittedQuery.trim();
  $: pdfSrc = normalizedQuery
    ? `${mapUrl}#search=${encodeURIComponent(normalizedQuery)}&phrase=true&toolbar=1&navpanes=0`
    : `${mapUrl}#toolbar=1&navpanes=0`;

  function searchPdf() {
    submittedQuery = query.trim();
  }

  function clearSearch() {
    query = "";
    submittedQuery = "";
  }
</script>

<svelte:head>
  <title>Berlin Railmap - CampusWeb</title>
</svelte:head>

<div class="railmap-page">
  <header class="railmap-toolbar glass-panel">
    <button class="icon-button" type="button" on:click={() => goto("/explore")} aria-label="Back">
      <i class="ph ph-arrow-left" aria-hidden="true"></i>
    </button>

    <div class="title-block">
      <h1>Berlin Railmap</h1>
      <p>PDF search</p>
    </div>

    <form class="search-form" on:submit|preventDefault={searchPdf}>
      <label class="search-box">
        <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
        <span class="sr-only">Search inside railmap PDF</span>
        <input
          bind:value={query}
          type="search"
          placeholder="Search station or line"
          autocomplete="off"
        />
      </label>

      {#if query || submittedQuery}
        <button class="icon-button clear-button" type="button" on:click={clearSearch} aria-label="Clear search">
          <i class="ph ph-x" aria-hidden="true"></i>
        </button>
      {/if}

      <button class="search-button" type="submit">Search</button>
    </form>

    <a class="open-link" href={pdfSrc} target="_blank" rel="noreferrer">
      <i class="ph ph-arrow-square-out" aria-hidden="true"></i>
      <span>Open PDF</span>
    </a>
  </header>

  <main class="pdf-shell" aria-label="Berlin railmap PDF viewer">
    {#key pdfSrc}
      <iframe title="Berlin railmap PDF" src={pdfSrc}></iframe>
    {/key}
  </main>
</div>

<style>
  .railmap-page {
    min-height: calc(100dvh - 78px);
    padding: clamp(1rem, 2.5vw, 1.75rem);
    background:
      radial-gradient(circle at 10% 10%, rgba(224, 58, 4, 0.13), transparent 30rem),
      radial-gradient(circle at 94% 3%, rgba(89, 78, 255, 0.12), transparent 28rem),
      var(--app-bg, #f8f8fb);
    color: var(--text-primary, #0b1533);
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 1rem;
  }

  .glass-panel {
    background: color-mix(in srgb, var(--card-bg, #ffffff) 88%, transparent);
    border: 1px solid color-mix(in srgb, var(--border-color, #dfe1e7) 82%, transparent);
    box-shadow: 0 1.25rem 3.5rem rgba(17, 24, 39, 0.1);
    backdrop-filter: blur(18px);
  }

  .railmap-toolbar {
    border-radius: 1.5rem;
    padding: 0.8rem;
    display: grid;
    grid-template-columns: auto minmax(9rem, auto) minmax(18rem, 1fr) auto;
    align-items: center;
    gap: 0.85rem;
  }

  .icon-button,
  .search-button,
  .open-link {
    min-height: 3rem;
    border-radius: 999px;
    border: 1px solid var(--border-color, #dfe1e7);
    background: var(--card-bg, #ffffff);
    color: var(--text-primary, #0b1533);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    cursor: pointer;
    text-decoration: none;
    font: inherit;
  }

  .icon-button {
    width: 3rem;
    font-size: 1.45rem;
  }

  .title-block h1 {
    margin: 0;
    font-size: clamp(1.25rem, 2vw, 1.75rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
  }

  .title-block p {
    margin: 0.2rem 0 0;
    color: var(--text-secondary, #66708a);
    font-weight: 600;
  }

  .search-form {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 0.55rem;
  }

  .search-box {
    min-height: 3rem;
    min-width: 0;
    padding: 0 1rem;
    border-radius: 999px;
    background: var(--input-bg, #f6f6fa);
    display: flex;
    align-items: center;
    gap: 0.7rem;
    color: var(--text-secondary, #66708a);
  }

  .search-box i {
    font-size: 1.35rem;
    color: var(--text-primary, #0b1533);
  }

  .search-box input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text-primary, #0b1533);
    font: inherit;
    font-size: 1rem;
  }

  .search-button,
  .open-link {
    padding: 0 1.1rem;
    font-weight: 800;
  }

  .search-button {
    background: var(--accent, #e03a04);
    border-color: var(--accent, #e03a04);
    color: #ffffff;
  }

  .open-link i {
    font-size: 1.2rem;
  }

  .pdf-shell {
    min-height: 0;
    overflow: hidden;
    border-radius: 1.4rem;
    border: 1px solid var(--border-color, #dfe1e7);
    background: #ffffff;
    box-shadow: 0 1rem 3rem rgba(17, 24, 39, 0.08);
  }

  .pdf-shell iframe {
    width: 100%;
    height: 100%;
    min-height: 42rem;
    border: 0;
    display: block;
    background: #ffffff;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 900px) {
    .railmap-page {
      min-height: calc(100dvh - 72px);
      padding: 0.85rem;
      gap: 0.75rem;
    }

    .railmap-toolbar {
      grid-template-columns: auto minmax(0, 1fr) auto;
      border-radius: 1.35rem;
    }

    .search-form {
      grid-column: 1 / -1;
      grid-row: 2;
      grid-template-columns: minmax(0, 1fr) auto auto;
    }

    .open-link span {
      display: none;
    }

    .open-link {
      width: 3rem;
      padding: 0;
    }

    .pdf-shell {
      border-radius: 1.2rem;
    }

    .pdf-shell iframe {
      min-height: 55dvh;
    }
  }

  @media (max-width: 540px) {
    .railmap-toolbar {
      padding: 0.7rem;
    }

    .search-form {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .search-button {
      grid-column: 1 / -1;
      width: 100%;
    }

    .clear-button {
      width: 3rem;
    }
  }
</style>
