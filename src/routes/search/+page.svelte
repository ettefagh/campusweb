<script lang="ts">
  let searchQuery = "";
  let searchSource: "srh" | "ecampus" | "library" | "team" = "srh";

  const searchSources = [
    {
      id: "srh" as const,
      name: "University Website",
      icon: "🎓",
      searchable: true,
    },
    {
      id: "ecampus" as const,
      name: "E-Campus Portal",
      icon: "💻",
      searchable: true,
    },
    {
      id: "library" as const,
      name: "Library Catalogue",
      icon: "📚",
      searchable: false,
      staticUrl: "https://webopac.srh-hochschulen.de/vopac/index.asp?DB=BIBB",
    },
    {
      id: "team" as const,
      name: "University Team",
      icon: "👥",
      searchable: false,
      staticUrl:
        "https://www.srh-university.de/en/srh-university/faculty-and-team/",
    },
  ];

  function handleSearch(event: Event) {
    event.preventDefault();
    const source = searchSources.find((s) => s.id === searchSource)!;

    if (source.searchable) {
      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery.length >= 1) {
        let targetUrl = "";

        if (searchSource === "srh") {
          targetUrl = `https://www.srh-university.de/en/search/?q=${encodeURIComponent(trimmedQuery)}`;
          const viewerUrl = `/viewer?url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(source.name + " Search")}`;
          window.location.href = viewerUrl;
        } else if (searchSource === "ecampus") {
          targetUrl = `https://ecampus.srh-university.de/search/index.php?q=${encodeURIComponent(trimmedQuery)}`;
          window.open(targetUrl, "_blank");
        }
      }
    } else {
      // For static links (library, team), go directly
      if (source.staticUrl) {
        if (source.id === "library") {
          window.open(source.staticUrl, "_blank");
        } else {
          const viewerUrl = `/viewer?url=${encodeURIComponent(source.staticUrl)}&title=${encodeURIComponent(source.name)}`;
          window.location.href = viewerUrl;
        }
      }
    }
  }

  $: selectedSource = searchSources.find((s) => s.id === searchSource)!;
  $: isSearchable = selectedSource.searchable;
</script>

<svelte:head>
  <title>Search - Campusweb</title>
</svelte:head>

<div class="search-page">
  <header class="page-header">
    <h1>🔍 Search</h1>
    <p class="subtitle">Search university resources</p>
  </header>

  <div class="search-layout">
    <form class="search-container" on:submit={handleSearch}>
      <div class="source-selection">
        <label class="source-label">Search in:</label>
        <div class="radio-group">
          {#each searchSources as source}
            <label class="radio-option">
              <input
                type="radio"
                name="search-source"
                value={source.id}
                bind:group={searchSource}
              />
              <span class="radio-label">
                <span class="radio-icon">{source.icon}</span>
                {source.name}
              </span>
            </label>
          {/each}
        </div>
      </div>

      {#if isSearchable}
        <label for="search-input" class="sr-only"
          >Search {selectedSource.name}</label
        >
        <div class="input-wrapper">
          <input
            id="search-input"
            type="search"
            placeholder={`Search ${selectedSource.name}...`}
            bind:value={searchQuery}
            class="search-input"
            autocomplete="off"
          />
          <button
            type="submit"
            class="search-btn"
            disabled={!searchQuery.trim()}
          >
            Search
          </button>
        </div>
      {:else}
        <div class="static-link-info">
          <p>Click to browse {selectedSource.name}</p>
          <button type="submit" class="browse-btn">
            Open {selectedSource.name}
          </button>
        </div>
      {/if}
    </form>

    <aside class="search-sidebar">
      <div class="search-tips">
        <h2>Search Options Legend</h2>
        <ul>
          <li>
            <strong>🎓 University Website:</strong> Public information, study programs,
            admissions, and campus news.
          </li>
          <li>
            <strong>💻 E-Campus Portal:</strong> Internal student resources, course
            materials, assignments, and announcements.
          </li>
          <li>
            <strong>📚 Library Catalogue:</strong> Academic resources, physical books,
            e-books, and journals via WebOPAC.
          </li>
          <li>
            <strong>👥 University Team:</strong> Staff directory, faculty profiles,
            and contact information.
          </li>
        </ul>
      </div>
    </aside>
  </div>
</div>

<style>
  .search-page {
    padding-bottom: var(--spacing-xl);
    max-width: 1000px;
    margin: 0 auto;
  }

  .search-layout {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
  }

  @media (min-width: 1024px) {
    .search-layout {
      display: grid;
      grid-template-columns: 1fr 300px;
      align-items: start;
    }
  }

  .page-header {
    padding: var(--spacing-lg) 0;
    text-align: center;
    margin-bottom: var(--spacing-lg);
  }

  h1 {
    margin-bottom: var(--spacing-sm);
  }

  .subtitle {
    color: var(--text-color-secondary);
    font-size: 1rem;
  }

  .search-container {
    margin-bottom: var(--spacing-xl);
  }

  .source-selection {
    margin-bottom: var(--spacing-lg);
  }

  .source-label {
    display: block;
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
    color: var(--srh-copper);
  }

  .radio-group {
    display: flex;
    gap: var(--spacing-sm);
    flex-direction: column;
  }

  .radio-option {
    position: relative;
    cursor: pointer;
  }

  .radio-option input[type="radio"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--card-bg);
    border: 2px solid var(--border-color);
    border-radius: var(--radius-md);
    transition: all 0.2s;
    font-size: 0.95rem;
  }

  .radio-icon {
    font-size: 1.2rem;
  }

  .radio-option input[type="radio"]:checked + .radio-label {
    border-color: var(--primary-color);
    background: rgba(212, 68, 7, 0.05);
    font-weight: 600;
  }

  .radio-option:hover .radio-label {
    border-color: var(--primary-color);
    transform: translateY(-1px);
  }

  .input-wrapper {
    display: flex;
    gap: var(--spacing-sm);
  }

  .search-input {
    flex: 1;
    min-height: var(--touch-target-min);
    font-size: 1rem;
    padding: var(--spacing-md);
    border: 2px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--card-bg);
    color: var(--text-color);
    transition: border-color 0.2s;
  }

  .search-input:focus {
    border-color: var(--primary-color);
    outline: none;
  }

  .search-btn,
  .browse-btn {
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    padding: 0 var(--spacing-lg);
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
    min-height: var(--touch-target-min);
  }

  .search-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .browse-btn:hover {
    opacity: 0.9;
  }

  .static-link-info {
    text-align: center;
    padding: var(--spacing-lg);
    background: rgba(212, 68, 7, 0.05);
    border-radius: var(--radius-md);
    border: 1px solid rgba(212, 68, 7, 0.1);
  }

  .static-link-info p {
    margin-bottom: var(--spacing-md);
    color: var(--text-color);
  }

  .search-tips {
    padding: var(--spacing-lg);
    background: var(--card-bg);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
  }

  .search-tips h2 {
    font-size: 1.1rem;
    margin-bottom: var(--spacing-md);
    color: var(--primary-color);
  }

  .search-tips ul {
    list-style: none;
    padding: 0;
  }

  .search-tips li {
    padding: var(--spacing-xs) 0;
    padding-left: var(--spacing-lg);
    position: relative;
    font-size: 0.95rem;
    color: var(--text-color);
  }

  .search-tips li::before {
    content: "→";
    position: absolute;
    left: 0;
    color: var(--primary-color);
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
    border-width: 0;
  }
</style>
