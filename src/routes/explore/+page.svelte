<script lang="ts">
  import { t } from "$lib/i18n";
  import {
    settingsStore,
    activeCampus,
    activeDepartment,
  } from "$lib/stores/settingsStore";
  import { allLinks, categoryOrder } from "$lib/data/links";
  import { favorites } from "$lib/stores/favorites";
  import LinkCard from "$lib/components/LinkCard.svelte";
  import SearchBar from "$lib/components/SearchBar.svelte";
  import { onMount } from "svelte";
  import { page } from "$app/stores";

  let campusContacts = $state<any[]>([]);
  let generalContacts = $state<any[]>([]);
  let programDirectors = $state<any[]>([]);
  let isContactsLoaded = $state(false);
  let isContactsLoading = $state(false);

  async function loadPrivateContacts() {
    if (isContactsLoaded || isContactsLoading) return;
    isContactsLoading = true;
    try {
      const res = await fetch('/api/contacts');
      if (res.ok) {
        const data = await res.json();
        campusContacts = data.campusContacts || [];
        generalContacts = data.generalContacts || [];
        programDirectors = data.programDirectors || [];
        isContactsLoaded = true;
      }
    } catch (err) {
      console.error('Failed to load private directory:', err);
    } finally {
      isContactsLoading = false;
    }
  }

  let searchQuery = $state("");
  let isSearchActive = $state(false);
  let libraryUrl = $state(
    "https://webopac.srh-hochschulen.de/vopac/index.asp?DB=BIBB",
  );

  let showGoToTop = $state(false);
  let container: HTMLElement | null = null;

  onMount(() => {
    // Dynamic library URL based on campus if needed
    if ($settingsStore.campus === "Berlin") {
      libraryUrl = "https://login.srh-berlin.idm.oclc.org/menu";
    }
    if ($settingsStore.emailVerified) {
      loadPrivateContacts();
    }



    container = document.querySelector(".app-container");
    const handleScroll = () => {
      if (container) {
        showGoToTop = container.scrollTop > 300;
      }
    };
    container?.addEventListener("scroll", handleScroll);
    return () => {
      container?.removeEventListener("scroll", handleScroll);
    };
  });

  function goToTop() {
    container?.scrollTo({ top: 0, behavior: "smooth" });
  }

  $effect(() => {
    if ($settingsStore.emailVerified && !isContactsLoaded && !isContactsLoading) {
      loadPrivateContacts();
    }
  });

  $effect(() => {
    if ($page.url.searchParams.get("focus") === "true") {
      isSearchActive = true;
      // Focus the input instantly to catch the user gesture, and try again slightly later if not fully rendered
      const searchInput = document.getElementById("search-input") as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      } else {
        setTimeout(() => {
          const el = document.getElementById("search-input") as HTMLInputElement;
          el?.focus();
        }, 50);
      }
    }
  });

  function handleToggleFavorite(event: CustomEvent<{ id: string }>) {
    favorites.toggle(event.detail.id);
  }

  // ─── Search Logic ──────────────────────────────────────────

  // 1. Filtered Links
  let filteredLinks = $derived.by(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return [];
    return allLinks.filter(
      (link) =>
        link.title.toLowerCase().includes(query) ||
        link.description.toLowerCase().includes(query) ||
        link.category_name.toLowerCase().includes(query),
    );
  });

  // 2. Filtered Directory Contacts
  let filteredContacts = $derived.by(() => {
    const query = searchQuery.toLowerCase().trim();
    const campusId = $settingsStore.campusId;
    const departmentId = $settingsStore.departmentId;
    const schoolId = departmentId
      ? departmentId.split("_")[0].toLowerCase()
      : null;
    const programName = $settingsStore.programName;

    const normalizeProgram = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/\b(bachelor|master|b\.sc\.|m\.sc\.|cs)\b/g, "")
        .replace(/[^a-z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };

    const getSchoolFromTags = (tags?: string[]) => {
      if (!tags) return null;
      const found = tags.find((t) => t.toLowerCase().startsWith("school:"));
      if (found) {
        return found.split(":")[1].toLowerCase();
      }
      return null;
    };

    const allRaw = [
      ...campusContacts.map((c) => ({
        ...c,
        services: [c.service],
        programs: [],
        school: getSchoolFromTags(c.tags),
      })),
      ...generalContacts.map((c) => ({
        ...c,
        services: [c.service],
        programs: [],
        school: getSchoolFromTags(c.tags),
      })),
      ...programDirectors.map((p) => ({
        ...p,
        services: [],
        programs: [`${p.degree || ""} ${p.program}`.trim()],
        school: p.school.toLowerCase(),
        tags: p.degree ? [p.degree, ...(p.tags || [])] : (p.tags || []),
      })),
    ];

    // Aggregate by email
    const merged = new Map();
    allRaw.forEach((c) => {
      const email = c.email.toLowerCase().trim();
      if (merged.has(email)) {
        const existing = merged.get(email);
        c.services.forEach((s) => {
          if (!existing.services.includes(s)) existing.services.push(s);
        });
        c.programs.forEach((p) => {
          if (!existing.programs.includes(p)) existing.programs.push(p);
        });
        if (c.tags) {
          existing.tags = [...new Set([...(existing.tags || []), ...c.tags])];
        }
        if (c.school && !existing.school) {
          existing.school = c.school;
        }
      } else {
        merged.set(email, {
          ...c,
          services: [...c.services],
          programs: [...c.programs],
          school: c.school,
        });
      }
    });

    return Array.from(merged.values()).filter((c) => {
      // 1. Campus Filter (Must match or be general)
      const isCampusMatch =
        (campusId && c.campusId === campusId) || c.campusId === "general";
      if (!isCampusMatch) return false;

      // 2. If searching, apply search query logic
      if (query) {
        return (
          c.person.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          (c.tags &&
            c.tags.some((t: string) => t.toLowerCase().includes(query))) ||
          c.programs.some((p: string) => p.toLowerCase().includes(query)) ||
          c.services.some((s: string) => s.toLowerCase().includes(query))
        );
      }

      // 3. Initial state (No query): Layered Cumulative Logic
      // Layer 1: General Campus Contacts (No school tag)
      const isGeneralLayer = !c.school;

      // Layer 2: School Contacts (Requires school selection)
      const isSchoolLayer = schoolId && c.school === schoolId;

      // Layer 3: Program Contacts (Requires program selection)
      const isProgramLayer =
        programName &&
        c.programs.some((p: string) => {
          const normUser = normalizeProgram(programName);
          const normContact = normalizeProgram(p);
          return normContact.includes(normUser) || normUser.includes(normContact);
        });

      return isGeneralLayer || isSchoolLayer || isProgramLayer;
    });
  });

  // 3. External Search Sources
  const searchSources = [
    { id: "google", name: "Google", icon: "🔍", searchable: true },
    { id: "ecampus", name: "E-Campus Portal", icon: "💻", searchable: true },
    { id: "website", name: "University Website", icon: "🌐", searchable: true },
    { id: "catalog", name: "Library Catalog", icon: "📚", searchable: false },
  ];

  function handleExternalSearch(sourceId: string) {
    const query = encodeURIComponent(searchQuery);
    let url = "";

    switch (sourceId) {
      case "google":
        url = `https://www.google.com/search?q=${query}+SRH+University`;
        break;
      case "ecampus":
        url = `https://ecampus.srh-university.de/course/search.php?search=${query}`;
        break;
      case "website":
        url = `https://www.srh-university.de/en/search/?q=${query}`;
        break;
      case "catalog":
        url = libraryUrl;
        break;
    }

    if (url) window.open(url, "_blank");
  }

  function highlightMatch(text: string, query: string): string {
    if (!query.trim()) return text;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  }

  function getTeamsChatUrl(email: string) {
    return `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`;
  }

  function getCategoryName(category: string, linkCategory: any) {
    return linkCategory?.[category] || category;
  }

  let displayCategories = $derived.by(() => {
    if (!searchQuery.trim()) return categoryOrder;
    return categoryOrder.filter((cat) =>
      filteredLinks.some((l) => l.category_name === cat),
    );
  });

  const DIRECTORY_ID = "srh-contact-list";
</script>

<svelte:head>
  <title>{$t.explore.pageTitle}</title>
</svelte:head>

<div class="explore-page" class:is-searching={searchQuery.trim() !== ""}>
  <header class="page-header" class:collapsed={searchQuery.trim() !== ""}>
    <div class="logo-container">
      <img
        src="/icon-light.png"
        alt="SRH University Logo"
        class="logo light-mode"
        width="36"
        height="36"
        loading="eager"
        fetchpriority="high"
      />
      <img
        src="/icon-dark.png"
        alt="SRH University Logo"
        class="logo dark-mode"
        width="36"
        height="36"
        loading="eager"
        fetchpriority="high"
      />
    </div>
    <div class="header-text">
      <h1>{$t.explore.title}</h1>
      <p class="subtitle">{$t.explore.subtitle}</p>
    </div>
  </header>

  <div class="search-sticky-wrapper">
    <div class="search-bar-container">
      <SearchBar
        bind:searchQuery
        bind:isSearchActive
        placeholder={$t.explore.searchPlaceholder}
      />
    </div>

    <!-- Category Navigation Chips (Moved here to be sticky) -->
    <div class="category-nav-wrapper">
      <div class="category-nav glass">
        <div class="category-nav-scroll">
          <!-- First Tag: SRH Contact List -->
          <button
            class="cat-chip"
            onclick={() => {
              const el = document.getElementById(DIRECTORY_ID);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Contact List
          </button>

          {#each categoryOrder as category}
            <button
              class="cat-chip"
              onclick={() => {
                const el = document.getElementById(
                  `category-${category.replace(/\s+/g, "-")}`,
                );
                if (el)
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {getCategoryName(category, $t.linkCategory)}
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <div class="explore-content">
    <!-- 1. Link Categories -->
    {#each displayCategories as category}
      <section
        class="category-section"
        id="category-{category.replace(/\s+/g, '-')}"
      >
        <h2 class="category-title">
          {getCategoryName(category, $t.linkCategory)}
        </h2>
        <div class="links-grid">
          {#each (searchQuery.trim() ? filteredLinks : allLinks).filter((link) => link.category_name === category) as link (link.id)}
            <LinkCard
              {link}
              isFavorite={$favorites.includes(link.id)}
              customUrl={link.id === "library-catalogue"
                ? libraryUrl
                : undefined}
              showTag={false}
              useViewer={true}
              on:toggleFavorite={handleToggleFavorite}
            />
          {/each}
        </div>
      </section>
    {/each}

    {#if searchQuery.trim() && displayCategories.length === 0 && filteredContacts.length === 0}
      <div class="no-results glass">
        <div class="no-results-icon">🔍</div>
        <p>{$t.explore.noResults} "<strong>{searchQuery}</strong>"</p>
      </div>
    {/if}

    <!-- 2. SRH Contact List (Moved before external) -->
    <section class="category-section directory-results" id={DIRECTORY_ID}>
      <h2 class="category-title">Contact List</h2>
      {#if $activeCampus || $activeDepartment || $settingsStore.programName}
        <p class="category-subtitle">
          {#if $activeCampus}{$activeCampus.name}{/if}
          {#if $activeDepartment}
            • {$activeDepartment.shortName}{/if}
          {#if $settingsStore.programName}
            • {$settingsStore.programName}{/if}
        </p>
      {/if}

      {#if !$settingsStore.campusId}
        <div class="verification-hint glass">
          <div class="hint-icon">📍</div>
          <div class="hint-text">
            <h3>Campus Not Selected</h3>
            <p>
              Please select your campus in settings to view relevant contacts.
            </p>
            <button
              class="hint-btn primary"
              onclick={() => (window.location.href = "/settings")}
            >
              Go to Settings
            </button>
          </div>
        </div>
      {:else if !searchQuery.trim() || filteredContacts.length > 0}
        {#if $settingsStore.emailVerified}
          {#if isContactsLoading}
            <div class="contacts-loading glass">
              <div class="spinner"></div>
              <p>Securely loading private directory...</p>
            </div>
          {:else}
            <div class="contact-results-list">
              {#each searchQuery.trim() ? filteredContacts : filteredContacts.slice(0, 15) as contact}
                <div class="search-contact-card glass">
                  <div class="search-contact-info">
                    <div class="search-contact-meta">
                      {#if contact.programs && contact.programs.length > 0}
                        <div class="contact-program-list">
                          {#each contact.programs as prog}
                            <div class="program-item">
                              <i class="ph-bold ph-graduation-cap" style="margin-right: 4px; color: var(--primary-color);"></i> {@html highlightMatch(prog, searchQuery)}
                            </div>
                          {/each}
                        </div>
                      {/if}
                      {#if contact.services && contact.services.length > 0}
                        <div class="contact-service-list">
                          {#each contact.services as service}
                            <div class="service-item">
                              <i class="ph-bold ph-wrench" style="margin-right: 4px; color: var(--primary-color);"></i> {@html highlightMatch(service, searchQuery)}
                            </div>
                          {/each}
                        </div>
                      {/if}
                    </div>
                    <div class="search-contact-name">
                      {@html highlightMatch(contact.person, searchQuery)}
                      <div class="search-contact-tags">
                        {#each contact.tags as tag}
                          {#if tag.startsWith("campus:")}
                            <span class="contact-tag campus-tag"
                              >{@html highlightMatch(
                                tag.replace("campus:", ""),
                                searchQuery,
                              )}</span
                            >
                          {:else if tag.startsWith("school:")}
                            <span class="contact-tag school-tag"
                              >{@html highlightMatch(
                                tag.replace("school:", ""),
                                searchQuery,
                              )}</span
                            >
                          {:else}
                            <span class="contact-tag"
                              >{@html highlightMatch(tag, searchQuery)}</span
                            >
                          {/if}
                        {/each}
                      </div>
                    </div>
                  </div>
                  <div class="search-contact-actions">
                    <a
                      href="mailto:{contact.email}"
                      class="search-contact-btn mail"
                      title="Email"
                      ><i class="ph-bold ph-envelope"></i></a
                    >
                    <a
                      href={getTeamsChatUrl(contact.email)}
                      class="search-contact-btn chat"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Chat on Teams"
                      ><i class="ph-bold ph-chat-circle"></i></a
                    >
                    {#if contact.phone}
                      <a
                        href="tel:{contact.phone.replace(/[\s-]/g, '')}"
                        class="search-contact-btn call"
                        title="Call"
                        ><i class="ph-bold ph-phone"></i></a
                      >
                    {/if}
                  </div>
                </div>
              {/each}
              {#if !searchQuery.trim()}
                <p class="view-more-hint">Search to see more contacts...</p>
              {/if}
            </div>
          {/if}
        {:else}
          <div class="verification-hint glass">
            <div class="hint-icon">🔒</div>
            <div class="hint-text">
              <h3>Directory Restricted</h3>
              <p>Accessing the university directory requires verification.</p>
              <button
                class="hint-btn primary"
                onclick={() =>
                  (window.location.href = "/settings#accessibility")}
              >
                Verify Email (Simple)
              </button>
            </div>
          </div>
        {/if}
      {:else}
        <div class="no-results glass">
          <p>No contacts found matching "{searchQuery}"</p>
        </div>
      {/if}
    </section>

    <!-- 3. External Portals (Only when searching) -->
    {#if searchQuery.trim()}
      <section class="category-section external-search-section">
        <h2 class="category-title">
          🌐 {$t.explore.externalTitle || "External Portals"}
        </h2>
        <div class="external-search-grid">
          {#each searchSources as source}
            <button
              class="external-search-row glass"
              onclick={() => handleExternalSearch(source.id)}
            >
              <span class="external-icon">{source.icon}</span>
              <div class="external-row-content">
                <span class="external-name">{source.name}</span>
                <span class="external-query">
                  {#if source.searchable}
                    {$t.explore.searchIn} "{searchQuery}"
                  {:else}
                    {$t.explore.openCatalog}
                  {/if}
                </span>
              </div>
              <span class="external-arrow">→</span>
            </button>
          {/each}
        </div>
      </section>
    {/if}
  </div>

  <!-- Floating Action Buttons -->
  {#if showGoToTop}
    <div class="fab-group">
      <button class="fab-btn go-to-top glass" onclick={goToTop} aria-label="Go to top">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
    </div>
  {/if}
</div>

<style>
  .explore-page {
    max-width: 1200px;
    margin: 0 auto;
    padding-bottom: calc(var(--spacing-xl) * 2.5);
    min-height: 100vh;
    background: radial-gradient(
      circle at top right,
      var(--hover-bg),
      var(--bg-color) 40%
    );
    position: relative;
  }

  /* ── Header ── */
  .page-header {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    text-align: left;
    padding: var(--spacing-sm) var(--spacing-md);
    margin: var(--spacing-sm) var(--spacing-md);
    gap: var(--spacing-md);
    /* Respect Apple top notch and safe area */
    padding-top: calc(env(safe-area-inset-top) + var(--spacing-sm));
    display: flex;
    transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);
    opacity: 1;
  }

  .page-header.collapsed {
    opacity: 0;
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
    margin-top: 0;
    margin-bottom: 0;
    pointer-events: none;
  }

  .logo-container {
    margin-bottom: 0;
  }

  .logo {
    width: 36px;
    height: 36px;
    border-radius: 8px;
  }

  /* Dark mode support for logo */
  :global([data-theme="dark"]) .light-mode {
    display: none;
  }
  :global([data-theme="light"]) .dark-mode {
    display: none;
  }

  .header-text {
    display: flex;
    flex-direction: column;
  }

  h1 {
    font-size: 1.3rem;
    line-height: 0.8rem;
    font-weight: 700;
    margin-bottom: 2px;
    color: var(--text-color);
  }

  .subtitle {
    font-size: 0.85rem;
    margin-bottom: 0;
    color: var(--text-color-secondary);
  }

  /* ── Sticky Search Wrapper ── */
  .search-sticky-wrapper {
    position: sticky;
    top: 0;
    z-index: 100;
    padding: var(--spacing-sm) var(--spacing-md);
    transition: all 0.3s ease;
    margin-bottom: 20px;
    margin-top: 0; /* no margin-top in !is.searching */
  }

  :global(.is-searching) .search-sticky-wrapper {
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: none; /* removed */
    box-shadow: none; /* removed */
    margin-bottom: 20px;
    margin-top: 40px;
  }

  .search-bar-container {
    max-width: 600px;
    margin: 0 auto;
  }

  .category-nav-wrapper {
    margin-top: var(--spacing-sm);
    width: 100%;
    display: flex;
    justify-content: center;
    overflow: hidden;
  }

  .category-nav {
    display: flex;
    padding: 1px;
    background: var(--hover-bg);
    border: 1px solid var(--border-color);
    border-radius: 100px;
    max-width: 100%;
    overflow: hidden;
  }

  .category-nav-scroll {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding: 2px 8px;
    -webkit-overflow-scrolling: touch;
  }

  .category-nav-scroll::-webkit-scrollbar {
    display: none;
  }

  /* ── Content Area ── */
  .explore-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0;
  }

  .category-section {
    margin-bottom: 50px;
    animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  }

  @keyframes reveal {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .category-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: var(--spacing-md);
    padding-bottom: var(--spacing-xs);
    border-bottom: 2px solid rgba(212, 68, 7, 0.1);
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .category-subtitle {
    font-size: 0.9rem;
    color: var(--text-color-secondary);
    margin-top: calc(-1 * var(--spacing-sm));
    margin-bottom: var(--spacing-md);
    font-weight: 500;
    opacity: 0.8;
  }

  .links-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 0;
  }

  @media (min-width: 540px) {
    .links-grid {
      gap: var(--spacing-md);
    }
  }

  /* ── Directory & Contacts ── */
  .contact-results-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }

  @media (min-width: 800px) {
    .contact-results-list {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .search-contact-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-lg);
    border-radius: var(--radius-xl);
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
    transition:
      transform 0.2s,
      border-color 0.2s;
  }

  .search-contact-card:hover {
    transform: translateY(-2px);
    border-color: var(--primary-color);
    box-shadow: var(--shadow-md);
  }

  .search-contact-info {
    flex: 1;
    min-width: 0;
  }
  .search-contact-name {
    font-weight: 700;
    font-size: 1.1rem;
    margin-top: 4px;
    color: var(--text-color);
  }

  .search-contact-meta {
    font-size: 0.75rem;
    color: var(--primary-color);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .search-contact-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }

  .contact-tag {
    font-size: 0.75rem;
    padding: 4px 10px;
    background: var(--hover-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-color-secondary);
    font-weight: 500;
  }

  .search-contact-actions {
    display: flex;
    gap: 10px;
  }
  .search-contact-btn {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-color);
    border-radius: 14px;
    border: 1px solid var(--border-color);
    text-decoration: none;
    font-size: 1.2rem;
    transition: all 0.2s;
  }

  .search-contact-btn:hover {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
    transform: scale(1.05);
  }

  /* ── External Search ── */
  .external-search-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--spacing-md);
  }

  .external-search-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: var(--spacing-lg);
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
  }

  .external-search-row:hover {
    transform: translateY(-3px);
    border-color: var(--primary-color);
    box-shadow: var(--shadow-md);
  }

  .external-icon {
    font-size: 1.8rem;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-color);
    border-radius: 15px;
  }

  .external-name {
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--text-color);
  }
  .external-query {
    font-size: 0.85rem;
    color: var(--text-color-secondary);
    margin-top: 2px;
  }
  .external-arrow {
    margin-left: auto;
    font-size: 1.2rem;
    color: var(--primary-color);
    opacity: 0.5;
  }

  /* ── Navigation ── */
  .category-nav {
    display: inline-flex;
    padding: 1px;
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border-color);
    border-radius: 100px;
    margin: 0 auto;
  }

  .category-nav-scroll {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .category-nav-scroll::-webkit-scrollbar {
    display: none;
  }

  .cat-chip {
    padding: 8px 20px;
    border-radius: 100px;
    border: 1px solid transparent;
    background: transparent;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-color-secondary);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
  }

  .cat-chip:hover {
    color: var(--primary-color);
    background: var(--bg-color);
    border-color: var(--border-color);
  }

  .cat-chip.active {
    background: var(--primary-color);
    color: white;
  }

  .view-more-hint {
    grid-column: 1 / -1;
    text-align: center;
    padding: var(--spacing-md);
    color: var(--text-color-secondary);
    font-size: 0.9rem;
    font-style: italic;
    border-top: 1px dashed var(--border-color);
    margin-top: var(--spacing-md);
  }

  /* ── Verification Hint ── */
  .verification-hint {
    padding: 40px var(--spacing-lg);
    border-radius: var(--radius-2xl);
    background: var(--card-bg);
    border: 1px dashed var(--border-color);
    text-align: center;
  }

  .hint-icon {
    font-size: 3rem;
    margin-bottom: 20px;
    display: block;
  }
  .hint-text h3 {
    font-size: 1.3rem;
    margin-bottom: 8px;
  }

  .hint-btn {
    margin-top: 24px;
    padding: 12px 32px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 100px;
    font-weight: 800;
    cursor: pointer;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .hint-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(var(--primary-color-rgb, 212, 68, 7), 0.3);
  }

  /* ── Misc ── */
  .no-results {
    text-align: center;
    padding: 80px var(--spacing-md);
    color: var(--text-color-secondary);
  }

  .no-results-icon {
    font-size: 4rem;
    margin-bottom: 20px;
    opacity: 0.2;
  }

  /* ── Contacts Loading Spinner ── */
  .contacts-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px var(--spacing-lg);
    border-radius: var(--radius-xl);
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    text-align: center;
    gap: var(--spacing-md);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(212, 68, 7, 0.1);
    border-top: 3px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .fab-group {
    position: fixed;
    bottom: 120px; /* safe above bottom navigation bar */
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 9999;
  }

  .fab-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .fab-btn:hover {
    transform: scale(1.1) translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  }

  .fab-btn:active {
    transform: scale(0.95);
  }

  .go-to-top {
    background: var(--glass-bg-strong);
    border: 1px solid var(--glass-border);
    backdrop-filter: blur(8px);
    color: var(--text-color);
  }

  @media (min-width: 1024px) {
    .fab-group {
      bottom: 24px; /* clears tab bar which is sidebar on desktop */
      right: 24px;
    }
  }
</style>
