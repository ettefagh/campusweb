<script lang="ts">
  import { t } from "$lib/i18n";
  import {
    settingsStore,
    activeCampus,
    activeDepartment,
  } from "$lib/stores/settingsStore";
  import { allLinks, categoryOrder, type AppLink } from "$lib/data/links";
  import { favorites } from "$lib/stores/favorites";
  import LinkCard from "$lib/components/LinkCard.svelte";
  import SearchBar from "$lib/components/SearchBar.svelte";
  import { onMount } from "svelte";
  import { page } from "$app/stores";

  let campusContacts = $state<any[]>([]);
  let generalContacts = $state<any[]>([]);
  let programDirectors = $state<any[]>([]);
  let publicContacts = $state<any[]>([]);
  let isContactsLoaded = $state(false);
  let isContactsLoading = $state(false);

  async function loadPrivateContacts() {
    if (isContactsLoaded || isContactsLoading) return;
    isContactsLoading = true;
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const data = await res.json();
        campusContacts = data.campusContacts || [];
        generalContacts = data.generalContacts || [];
        programDirectors = data.programDirectors || [];
        isContactsLoaded = true;
      } else if (res.status === 401) {
        settingsStore.patch({ emailVerified: false } as any);
      }
    } catch (err) {
      console.error("Failed to load private directory:", err);
    } finally {
      isContactsLoading = false;
    }
  }

  async function loadPublicContacts() {
    try {
      const res = await fetch("/api/public-contacts");
      if (res.ok) {
        const data = await res.json();
        publicContacts = data.publicContacts || [];
      }
    } catch (err) {
      console.error("Failed to load public contacts:", err);
    }
  }

  let searchQuery = $state("");
  let isSearchActive = $state(false);
  let expandedContactEmail = $state<string | null>(null);
  let libraryUrl = $state(
    "https://webopac.srh-hochschulen.de/vopac/index.asp?DB=BIBB",
  );

  let showGoToTop = $state(false);
  let popularLinkIds = $state<string[]>([]);
  let container: HTMLElement | null = null;

  onMount(() => {
    loadPublicContacts();
    loadPopularLinks();
    // Dynamic library URL based on campus if needed
    if ($settingsStore.campusId === "berlin") {
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
    if (
      $settingsStore.emailVerified &&
      !isContactsLoaded &&
      !isContactsLoading
    ) {
      loadPrivateContacts();
    }
  });

  $effect(() => {
    if ($page.url.searchParams.get("focus") === "true") {
      isSearchActive = true;
      // Focus the input instantly to catch the user gesture, and try again slightly later if not fully rendered
      const searchInput = document.getElementById(
        "search-input",
      ) as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      } else {
        setTimeout(() => {
          const el = document.getElementById(
            "search-input",
          ) as HTMLInputElement;
          el?.focus();
        }, 50);
      }
    }
  });

  function handleToggleFavorite(event: CustomEvent<{ linkId: string }>) {
    favorites.toggle(event.detail.linkId);
  }

  function toggleContactDetails(email: string) {
    expandedContactEmail = expandedContactEmail === email ? null : email;
  }

  function handleContactCardKeydown(event: KeyboardEvent, email: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleContactDetails(email);
    }
  }

  async function loadPopularLinks() {
    try {
      const res = await fetch("/api/stats/link-click");
      if (!res.ok) return;
      const data = await res.json();
      popularLinkIds = Array.isArray(data.popularLinks)
        ? data.popularLinks.map((item: any) => item.linkId).filter(Boolean)
        : [];
    } catch (err) {
      popularLinkIds = [];
    }
  }

  // ─── Search Logic ──────────────────────────────────────────

  // 1. Filtered Links
  let filteredLinks = $derived.by(() => {
    const query = searchQuery.toLowerCase().trim();
    const campusId = $settingsStore.campusId;
    const visibleLinks = allLinks
      .map((link): AppLink | null => {
        if (link.id === "library-campus") {
          const libraryUrl = $activeCampus?.libraryUrl;
          if (!libraryUrl) return null;
          return {
            ...link,
            url: libraryUrl,
            description: `${$activeCampus?.name || "Campus"} library catalogue`,
            campusIds: campusId ? [campusId] : []
          };
        }
        return link;
      })
      .filter((link): link is AppLink => Boolean(link))
      .filter((link) => !link.requiresAuth || $settingsStore.emailVerified)
      .filter((link) => !link.campusIds || link.campusIds.includes("all") || (campusId && link.campusIds.includes(campusId)));

    if (!query) return visibleLinks;
    return visibleLinks.filter(
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
      ...publicContacts.map((c) => ({
        ...c,
        services: [c.service],
        programs: [],
        school: getSchoolFromTags(c.tags),
        isPublic: true,
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
        tags: p.degree ? [p.degree, ...(p.tags || [])] : p.tags || [],
      })),
    ];

    // Aggregate by email
    const merged = new Map();
    allRaw.forEach((c) => {
      const email = c.email.toLowerCase().trim();
      if (merged.has(email)) {
        const existing = merged.get(email);
        c.services.forEach((s: string) => {
          if (!existing.services.includes(s)) existing.services.push(s);
        });
        c.programs.forEach((p: string) => {
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

    const normalizedProgramName = programName ? normalizeProgram(programName) : "";
    const matchesProgram = (c: any) => {
      if (!normalizedProgramName) return false;
      const values = [
        ...(c.programs || []),
        c.program,
        c.cluster,
        ...(c.tags || []),
      ].filter(Boolean);

      return values.some((value: string) => {
        const normalized = normalizeProgram(value);
        return (
          normalized.length > 0 &&
          (normalized.includes(normalizedProgramName) ||
            normalizedProgramName.includes(normalized))
        );
      });
    };

    const matchesSchool = (c: any) => Boolean(schoolId && c.school === schoolId);
    const contactPriority = (c: any) => {
      if (matchesProgram(c)) return 0;
      if (matchesSchool(c)) return 1;
      if (!c.school) return 2;
      if (c.isPublic) return 3;
      return 4;
    };

    return Array.from(merged.values()).filter((c) => {
      if (c.isPublic && !query) return true;

      // 1. Campus Filter (Must match or be general)
      const isCampusMatch =
        c.isPublic || (campusId && c.campusId === campusId) || c.campusId === "general";
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
      const isSchoolLayer = matchesSchool(c);

      // Layer 3: Program Contacts (Requires program selection)
      const isProgramLayer = matchesProgram(c);

      return isGeneralLayer || isSchoolLayer || isProgramLayer;
    }).sort((a, b) => contactPriority(a) - contactPriority(b));
  });

  let visibleContacts = $derived.by(() => {
    if (searchQuery.trim() || $settingsStore.programName) {
      return filteredContacts;
    }
    return filteredContacts.slice(0, 15);
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
    const safeText = escapeHtml(String(text));
    if (!query.trim()) return safeText;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    return safeText.replace(regex, "<mark>$1</mark>");
  }

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getTeamsChatUrl(email: string) {
    return `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`;
  }

  function getCategoryName(category: string, linkCategory: any) {
    return linkCategory?.[category] || category;
  }

  const TOP_LINKS_LIMIT = 10;
  let topLinks = $derived.by(() => {
    if (searchQuery.trim()) return [];
    const byId = new Map(filteredLinks.map((link) => [link.id, link]));
    const popularLinks = popularLinkIds
      .map((linkId) => byId.get(linkId))
      .filter((link): link is AppLink => Boolean(link));
    const fallbackLinks = filteredLinks.filter(
      (link) => !popularLinks.some((popular) => popular.id === link.id),
    );
    return [...popularLinks, ...fallbackLinks].slice(0, TOP_LINKS_LIMIT);
  });

  let remainingLinks = $derived.by(() => {
    if (searchQuery.trim()) return filteredLinks;
    const topIds = new Set(topLinks.map((link) => link.id));
    return filteredLinks.filter((link) => !topIds.has(link.id));
  });

  let displayCategories = $derived.by(() => {
    const source = searchQuery.trim() ? filteredLinks : remainingLinks;
    return categoryOrder.filter((cat) => source.some((link) => link.category_name === cat));
  });

  const DIRECTORY_ID = "srh-contact-list";
</script>

<svelte:head>
  <title>{$t.explore.pageTitle}</title>
</svelte:head>

<div class="explore-page" class:is-searching={searchQuery.trim() !== ""}>
  <header class="page-header" class:narrow={$settingsStore.headerSize === 'small'} class:collapsed={searchQuery.trim() !== ""}>
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
            onclick={(e) => {
              e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
              const el = document.getElementById(DIRECTORY_ID);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Contact List
          </button>

          {#each displayCategories as category}
            <button
              class="cat-chip"
              onclick={(e) => {
                e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
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
    <!-- 1. Top Links -->
    {#if !searchQuery.trim() && topLinks.length > 0}
      <section class="category-section link-list-panel top-links-section" id="top-links">
        <h2 class="category-title">Most visited links</h2>
        <div class="links-grid top-links-grid">
          {#each topLinks as link (link.id)}
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
    {/if}

    <!-- 2. Link Categories (Scrollable) -->
    {#if displayCategories.length > 0}
      <div class="link-list-panel remaining-links-panel">
        <h2 class="category-title">All links</h2>
        <div class="links-scroll-area" class:is-enabled={!searchQuery.trim()}>
          <div class="links-scroll-content">
            {#each displayCategories as category}
              <section
                class="category-section list-category-section"
                id="category-{category.replace(/\s+/g, '-')}"
              >
                <h3 class="category-title list-category-title">
                  {getCategoryName(category, $t.linkCategory)}
                </h3>
                <div class="links-grid">
                  {#each (searchQuery.trim() ? filteredLinks : remainingLinks).filter((link) => link.category_name === category) as link (link.id)}
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
          </div>
        </div>
      </div>
    {/if}

    {#if searchQuery.trim() && displayCategories.length === 0 && filteredContacts.length === 0}
      <div class="no-results glass">
        <div class="no-results-icon">🔍</div>
        <p>{$t.explore.noResults} "<strong>{searchQuery}</strong>"</p>
      </div>
    {/if}

    <!-- 3. SRH Contact List (Moved before external) -->
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

      {#if !$settingsStore.campusId && filteredContacts.length === 0}
        <div class="contact-results-list">
          <div class="verification-hint glass missing-content contact-card-like">
          <div class="hint-icon">📍</div>
          <div class="hint-text">
            <h3>Campus Not Selected</h3>
            <p>
              Please select your campus in settings to view relevant contacts.
            </p>
            <button
              class="hint-btn primary"
              onclick={() => {
                if (window.top && window.self !== window.top) {
                  window.top.location.href = "/settings";
                } else {
                  window.location.href = "/settings";
                }
              }}
            >
              Go to Settings
            </button>
          </div>
        </div>
        </div>
      {:else if !searchQuery.trim() || filteredContacts.length > 0}
        {#if isContactsLoading}
          <div class="contacts-loading glass">
            <div class="spinner"></div>
            <p>Securely loading private directory...</p>
          </div>
        {:else}
          <div class="contact-results-list">
            {#each visibleContacts as contact}
              <div
                class="search-contact-card glass"
                class:is-expanded={expandedContactEmail === contact.email}
                role="button"
                tabindex="0"
                aria-expanded={expandedContactEmail === contact.email}
                aria-label={`Show contact details for ${contact.person}`}
                onclick={() => toggleContactDetails(contact.email)}
                onkeydown={(event) => handleContactCardKeydown(event, contact.email)}
              >
                  <div class="search-contact-info">
                    <div class="search-contact-meta">
                      {#if contact.programs && contact.programs.length > 0}
                        <div class="contact-program-list">
                          {#each contact.programs as prog}
                            <div class="program-item">
                              <i
                                class="ph-bold ph-graduation-cap"
                                style="margin-right: 4px; color: var(--primary-color);"
                              ></i>
                              {@html highlightMatch(prog, searchQuery)}
                            </div>
                          {/each}
                        </div>
                      {/if}
                      {#if contact.services && contact.services.length > 0}
                        <div class="contact-service-list">
                          {#each contact.services as service}
                            <div class="service-item">
                              <i
                                class="ph-bold ph-wrench"
                                style="margin-right: 4px; color: var(--primary-color);"
                              ></i>
                              {@html highlightMatch(service, searchQuery)}
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
                      <div class="contact-direct-details">
                        <a
                          class="contact-direct-link"
                          href="mailto:{contact.email}"
                          onclick={(event) => event.stopPropagation()}
                        >
                          <i class="ph-bold ph-envelope"></i>
                          <span>{@html highlightMatch(contact.email, searchQuery)}</span>
                        </a>
                        {#if contact.phone}
                          <a
                            class="contact-direct-link"
                            href="tel:{contact.phone.replace(/[\s-]/g, '')}"
                            onclick={(event) => event.stopPropagation()}
                          >
                            <i class="ph-bold ph-phone"></i>
                            <span>{contact.phone}</span>
                          </a>
                        {/if}
                      </div>
                    </div>
                  </div>
                  <div class="search-contact-actions">
                    <a
                      href="mailto:{contact.email}"
                      class="search-contact-btn mail"
                      onclick={(event) => event.stopPropagation()}
                      title="Email"><i class="ph-bold ph-envelope"></i></a
                    >
                    <a
                      href={getTeamsChatUrl(contact.email)}
                      class="search-contact-btn chat"
                      onclick={(event) => event.stopPropagation()}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Chat on Teams"
                      ><i class="ph-bold ph-chat-circle"></i></a
                    >
                    {#if contact.phone}
                      <a
                        href="tel:{contact.phone.replace(/[\s-]/g, '')}"
                        class="search-contact-btn call"
                        onclick={(event) => event.stopPropagation()}
                        title="Call"><i class="ph-bold ph-phone"></i></a
                      >
                    {/if}
                  </div>
              </div>
            {/each}
            {#if !searchQuery.trim() && !$settingsStore.programName && filteredContacts.length > visibleContacts.length}
              <p class="view-more-hint">Search to see more contacts...</p>
            {/if}
            {#if !$settingsStore.emailVerified}
            <div class="verification-hint glass contact-card-like">
              <div class="hint-icon">🔒</div>
              <div class="hint-text">
                <h3>More contacts available</h3>
                <p>Public contacts are shown. Verify your SRH email to unlock the full internal directory.</p>
                <button
                  class="hint-btn primary"
                  onclick={() =>
                    (window.location.href = "/settings#directory-access")}
                >
                  Verify SRH Email
                </button>
              </div>
            </div>
            {/if}
          </div>
        {/if}
      {:else}
        <div class="no-results glass">
          <p>No contacts found matching "{searchQuery}"</p>
        </div>
      {/if}
    </section>

    <!-- 4. External Portals (Only when searching) -->
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
  <div class="fab-group">
    {#if showGoToTop}
      <button
        class="fab-btn go-to-top glass"
        onclick={goToTop}
        aria-label="Go to top"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
    {/if}
    <button
      class="fab-btn search-fab"
      onclick={() => {
        isSearchActive = true;
        const input = document.getElementById('search-input');
        input?.focus();
      }}
      aria-label="Search Explore"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    </button>
  </div>
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
  .explore-page .page-header {
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

  /* Shared header styles live in src/app.css */

  /* ── Sticky Search Wrapper ── */
  .search-sticky-wrapper {
    position: sticky;
    top: 0;
    z-index: 100;
    padding-top: var(--spacing-lg);
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
    padding-inline: var(--spacing-lg);
  }

  .category-nav-wrapper {
    margin-top: var(--spacing-sm);
    width: 100%;
    display: flex;
    justify-content: center;
    overflow: visible;
  }

  .category-nav {
    display: flex;
    padding: 1px;
    background: var(--hover-bg);
    border: 1px solid var(--border-color);
    border-radius: 100px;
    max-width: 100%;
    overflow: visible;
  }

  .category-nav-scroll {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding: 6px 8px;
    margin: -4px 0;
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
    scroll-margin-top: 150px; /* Accounts for the sticky search bar and sticky category chips */
    animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  }

  .link-list-panel {
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
    border: 1px solid var(--glass-border-subtle);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--glass-bg-light) 74%, transparent);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    box-shadow: 0 12px 30px -28px rgba(0, 0, 0, 0.45);
  }

  .link-list-panel .category-title {
    margin-bottom: var(--spacing-sm);
  }

  .top-links-section {
    margin-bottom: var(--spacing-xl);
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

  .list-category-section {
    margin-bottom: var(--spacing-lg);
  }

  .list-category-section:last-child {
    margin-bottom: 0;
  }

  .list-category-title {
    font-size: 1.05rem;
    margin-top: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    color: var(--text-color-secondary);
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
    grid-template-columns: 1fr;
    gap: 0;
  }

  @media (min-width: 640px) {
    .links-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-md);
    }
  }

  @media (min-width: 1024px) {
    .links-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .links-scroll-area {
    position: relative;
  }

  .links-scroll-area.is-enabled {
    max-height: min(62vh, 720px);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    mask-image: linear-gradient(to bottom, #000 88%, transparent 100%);
  }

  .links-scroll-area.is-enabled::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .links-scroll-content {
    padding-bottom: var(--spacing-lg);
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
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    border-radius: var(--radius-xl);
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    outline: none;
    transition:
      transform 0.2s,
      border-color 0.2s,
      box-shadow 0.2s;
  }

  .search-contact-card:hover,
  .search-contact-card:focus-visible,
  .search-contact-card.is-expanded {
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

  .contact-direct-details {
    display: grid;
    gap: 6px;
    max-height: 0;
    margin-top: 0;
    opacity: 0;
    overflow: hidden;
    transition:
      max-height 0.2s ease,
      margin-top 0.2s ease,
      opacity 0.2s ease;
  }

  .search-contact-card:hover .contact-direct-details,
  .search-contact-card:focus-within .contact-direct-details,
  .search-contact-card.is-expanded .contact-direct-details {
    max-height: 96px;
    margin-top: 12px;
    opacity: 1;
  }

  .contact-direct-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    max-width: 100%;
    color: var(--text-color);
    font-size: 0.86rem;
    font-weight: 650;
    text-decoration: none;
    overflow-wrap: anywhere;
  }

  .contact-direct-link i {
    color: var(--primary-color);
    flex: 0 0 auto;
  }

  .contact-direct-link:hover {
    color: var(--primary-color);
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
    align-items: center;
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

  .verification-hint.contact-card-like {
    border-style: solid;
    border-radius: var(--radius-xl);
    padding: var(--spacing-xl) var(--spacing-lg);
    margin: 0;
    height: 100%;
    box-sizing: border-box;
  }

  .verification-hint.missing-content {
    background:
      repeating-linear-gradient(
        -45deg,
        rgba(var(--primary-color-rgb, 212, 68, 7), 0.035) 0px,
        rgba(var(--primary-color-rgb, 212, 68, 7), 0.035) 12px,
        transparent 12px,
        transparent 24px
      ),
      var(--card-bg);
    border-color: rgba(var(--primary-color-rgb, 212, 68, 7), 0.28);
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
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
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

  .search-fab {
    background: var(--primary-color, #d44407);
    color: white;
  }

  @media (min-width: 1024px) {
    .fab-group {
      bottom: 24px; /* clears tab bar which is sidebar on desktop */
      right: 24px;
    }
  }
</style>
