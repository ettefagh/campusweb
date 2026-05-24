<script lang="ts">
  let { active = false }: { active?: boolean } = $props();

  import { t } from "$lib/i18n";
  import {
    settingsStore,
    activeCampus,
    activeDepartment,
  } from "$lib/stores/settingsStore";
  import { allLinks, categoryOrder, type AppLink } from "$lib/data/links";
  import { favorites } from "$lib/stores/favorites";
  import {
    favoriteContacts,
    normalizeContactEmail,
  } from "$lib/stores/favoriteContacts";
  import LinkCard from "$lib/components/LinkCard.svelte";
  import SearchBar from "$lib/components/SearchBar.svelte";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { interactiveMapEnabled } from "$lib/config/features";

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
  let favoriteContactMessage = $state("");
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

  function handleToggleFavoriteContact(contact: any, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    const result = favoriteContacts.toggle(contact.email);
    favoriteContactMessage =
      result === "limit" ? $t.explore.favoriteContactLimitReached : "";
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
            description:
              `${$activeCampus?.name || ""} ${$t.explore.campusLibraryDesc}`.trim(),
            campusIds: campusId ? [campusId] : [],
          };
        }
        return link;
      })
      .filter((link): link is AppLink => Boolean(link))
      .filter((link) => !link.requiresAuth || $settingsStore.emailVerified)
      .filter(
        (link) =>
          !link.campusIds ||
          link.campusIds.includes("all") ||
          (campusId && link.campusIds.includes(campusId)),
      );

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

    const normalizedProgramName = programName
      ? normalizeProgram(programName)
      : "";
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

    const matchesSchool = (c: any) =>
      Boolean(schoolId && c.school === schoolId);
    const contactPriority = (c: any) => {
      if (matchesProgram(c)) return 0;
      if (matchesSchool(c)) return 1;
      if (!c.school) return 2;
      if (c.isPublic) return 3;
      return 4;
    };

    return Array.from(merged.values())
      .filter((c) => {
        if (c.isPublic && !query) return true;

        // 1. Campus Filter (Must match or be general)
        const isCampusMatch =
          c.isPublic ||
          (campusId && c.campusId === campusId) ||
          c.campusId === "general";
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
      })
      .sort((a, b) => contactPriority(a) - contactPriority(b));
  });

  let visibleContacts = $derived.by(() => {
    if (searchQuery.trim() || $settingsStore.programName) {
      return filteredContacts;
    }
    return filteredContacts.slice(0, 15);
  });

  // 3. External Search Sources
  const searchSources = [
    {
      id: "google",
      name: "Google",
      iconClass: "ph-bold ph-magnifying-glass",
      color: "#14213D",
      searchable: true,
    },
    {
      id: "ecampus",
      name: "E-Campus Portal",
      iconClass: "ph-bold ph-laptop",
      color: "#2FA4D7",
      searchable: true,
    },
    {
      id: "website",
      name: "University Website",
      iconClass: "ph-bold ph-globe",
      color: "#3d348b",
      searchable: true,
    },
    {
      id: "catalog",
      name: "Library Catalog",
      iconClass: "ph-bold ph-books",
      color: "#f18701",
      searchable: false,
    },
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

  function openOutlookCompose(email: string, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = `ms-outlook://compose?to=${email}`;
      setTimeout(() => {
        if (!document.hidden) {
          window.location.href = `https://outlook.office.com/mail/deeplink/compose?to=${email}`;
        }
      }, 2000);
    } else {
      window.open(
        `https://outlook.office.com/mail/deeplink/compose?to=${email}`,
        "_blank",
      );
    }
  }

  function getCategoryIconClass(category: string) {
    const normalized = category.toLowerCase();
    if (normalized.includes("academic")) return "ph-bold ph-graduation-cap";
    if (normalized.includes("campusweb")) return "ph-bold ph-house-line";
    if (normalized.includes("e-campus")) return "ph-bold ph-laptop";
    if (normalized.includes("services")) return "ph-bold ph-squares-four";
    if (normalized.includes("resources")) return "ph-bold ph-books";
    if (normalized.includes("utilities")) return "ph-bold ph-magic-wand";
    if (normalized.includes("career")) return "ph-bold ph-briefcase";
    if (normalized.includes("international"))
      return "ph-bold ph-globe-hemisphere-east";
    if (normalized.includes("app")) return "ph-bold ph-app-window";
    return "ph-bold ph-link";
  }

  let contextSummary = $derived.by(() =>
    [
      $activeCampus?.name,
      $activeDepartment?.shortName,
      $settingsStore.programName,
    ]
      .filter(Boolean)
      .join(" • "),
  );

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
    return categoryOrder.filter((cat) =>
      source.some((link) => link.category_name === cat),
    );
  });

  let totalLinksCount = $derived.by(() => {
    if (searchQuery.trim()) return filteredLinks.length;
    return topLinks.length + remainingLinks.length;
  });

  const DIRECTORY_ID = "srh-contact-list";
</script>

<div
  class="explore-page"
  class:is-searching={searchQuery.trim() !== ""}
  class:search-active={isSearchActive}
  style:display={active ? "block" : "none"}
>
  <header
    class="explore-hero"
    class:narrow={$settingsStore.headerSize === "small"}
    class:collapsed={searchQuery.trim() !== ""}
  >
    <div class="explore-title-row">
      <div class="explore-title-copy">
        <h1>{$t.explore.title}</h1>
        <p>{$t.explore.subtitle}</p>
      </div>
    </div>
    {#if contextSummary}
      <p class="explore-context">
        <i class="ph-bold ph-map-pin" aria-hidden="true"></i>
        <span>{contextSummary}</span>
      </p>
    {/if}
  </header>

  <div class="search-sticky-wrapper">
    <div class="search-bar-container">
      <SearchBar
        bind:searchQuery
        bind:isSearchActive
        placeholder={$t.explore.searchPlaceholder}
      />
    </div>

    <div class="category-nav-wrapper">
      <nav class="category-nav" aria-label={$t.explore.sections}>
        <div class="category-nav-scroll">
          <button
            type="button"
            class="cat-chip"
            onclick={(e) => {
              e.currentTarget.scrollIntoView({
                behavior: "smooth",
                inline: "center",
                block: "nearest",
              });
              const el = document.getElementById(DIRECTORY_ID);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <i class="ph-bold ph-address-book" aria-hidden="true"></i>
            <span>{$t.explore.contactList}</span>
          </button>

          {#each displayCategories as category}
            <button
              type="button"
              class="cat-chip"
              onclick={(e) => {
                e.currentTarget.scrollIntoView({
                  behavior: "smooth",
                  inline: "center",
                  block: "nearest",
                });
                const el = document.getElementById(
                  `category-${category.replace(/\s+/g, "-")}`,
                );
                if (el)
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <i class={getCategoryIconClass(category)} aria-hidden="true"></i>
              <span>{getCategoryName(category, $t.linkCategory)}</span>
            </button>
          {/each}
        </div>
      </nav>
    </div>
  </div>

  <div class="explore-content">
    {#if displayCategories.length > 0 || (!searchQuery.trim() && topLinks.length > 0)}
      <div class="link-list-panel remaining-links-panel">
        <div class="explore-section-heading">
          <div>
            <p>{$t.explore.browseByService}</p>
            <h2>{$t.explore.allLinks}</h2>
          </div>
          <span>{totalLinksCount} {$t.explore.linksCount}</span>
        </div>
        <div class="links-scroll-area" class:is-enabled={!searchQuery.trim()}>
          <div class="links-scroll-content">
            {#if !searchQuery.trim() && topLinks.length > 0}
              <section
                class="category-section list-category-section top-links-section"
                id="top-links"
              >
                <h3 class="list-category-title">
                  <i class="ph-bold ph-star" aria-hidden="true"></i>
                  <span>{$t.explore.mostVisitedLinks}</span>
                </h3>
                <div class="links-stack top-links-stack">
                  {#each topLinks as link (link.id)}
                    <LinkCard
                      {link}
                      isFavorite={$favorites.includes(link.id)}
                      customUrl={link.id === "library-catalogue"
                        ? libraryUrl
                        : undefined}
                      showTag={false}
                      useViewer={true}
                      variant="compact-list"
                      on:toggleFavorite={handleToggleFavorite}
                    />
                  {/each}
                </div>
              </section>
            {/if}

            {#each displayCategories as category}
              <section
                class="category-section list-category-section"
                id="category-{category.replace(/\s+/g, '-')}"
              >
                <h3 class="list-category-title">
                  <i class={getCategoryIconClass(category)} aria-hidden="true"
                  ></i>
                  <span>{getCategoryName(category, $t.linkCategory)}</span>
                </h3>
                <div class="links-stack">
                  {#each (searchQuery.trim() ? filteredLinks : remainingLinks).filter((link) => link.category_name === category) as link (link.id)}
                    <LinkCard
                      {link}
                      isFavorite={$favorites.includes(link.id)}
                      customUrl={link.id === "library-catalogue"
                        ? libraryUrl
                        : undefined}
                      showTag={false}
                      useViewer={true}
                      variant="compact-list"
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
      <div class="no-results">
        <div class="no-results-icon">
          <i class="ph-bold ph-magnifying-glass" aria-hidden="true"></i>
        </div>
        <p>{$t.explore.noResults} "<strong>{searchQuery}</strong>"</p>
      </div>
    {/if}

    <section class="category-section directory-results" id={DIRECTORY_ID}>
      <div class="explore-section-heading">
        <div>
          <p>{$t.explore.peopleAndOffices}</p>
          <h2>{$t.explore.contactList}</h2>
        </div>
        {#if visibleContacts.length > 0}
          <span>{visibleContacts.length} {$t.explore.shown}</span>
        {/if}
      </div>
      {#if $activeCampus || $activeDepartment || $settingsStore.programName}
        <p class="category-subtitle">
          {#if $activeCampus}{$activeCampus.name}{/if}
          {#if $activeDepartment}
            • {$activeDepartment.shortName}{/if}
          {#if $settingsStore.programName}
            • {$settingsStore.programName}{/if}
        </p>
      {/if}
      {#if favoriteContactMessage}
        <p class="favorite-contact-message" role="status">
          {favoriteContactMessage}
        </p>
      {/if}

      {#if !$settingsStore.campusId && filteredContacts.length === 0}
        <div class="contact-results-list">
          <div class="verification-hint missing-content contact-card-like">
            <div class="hint-icon">
              <i class="ph-bold ph-map-pin" aria-hidden="true"></i>
            </div>
            <div class="hint-text">
              <h3>{$t.explore.campusNotSelected}</h3>
              <p>
                {$t.explore.selectCampusHint}
              </p>
              <button
                type="button"
                class="hint-btn primary"
                onclick={() => {
                  if (window.top && window.self !== window.top) {
                    window.top.location.href = "/settings";
                  } else {
                    window.location.href = "/settings";
                  }
                }}
              >
                {$t.explore.goToSettings}
              </button>
            </div>
          </div>
        </div>
      {:else if !searchQuery.trim() || filteredContacts.length > 0}
        {#if isContactsLoading}
          <div class="contacts-loading glass">
            <div class="spinner"></div>
            <p>{$t.explore.loadingDirectory}</p>
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
                aria-label={`${$t.explore.showContactDetailsFor} ${contact.person}`}
                onclick={() => toggleContactDetails(contact.email)}
                onkeydown={(event) =>
                  handleContactCardKeydown(event, contact.email)}
              >
                <div class="search-contact-info-wrapper">
                  <div class="contact-avatar">
                    {contact.person.charAt(0).toUpperCase()}
                  </div>
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
                        <button
                          class="contact-direct-link"
                          type="button"
                          onclick={(event) =>
                            openOutlookCompose(contact.email, event)}
                        >
                          <i class="ph-bold ph-envelope"></i>
                          <span
                            >{@html highlightMatch(
                              contact.email,
                              searchQuery,
                            )}</span
                          >
                        </button>
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
                </div>
                <div class="search-contact-actions">
                  <button
                    type="button"
                    class="search-contact-btn favorite"
                    class:active={$favoriteContacts.includes(
                      normalizeContactEmail(contact.email),
                    )}
                    onclick={(event) =>
                      handleToggleFavoriteContact(contact, event)}
                    title={$favoriteContacts.includes(
                      normalizeContactEmail(contact.email),
                    )
                      ? $t.explore.removeFavoriteContact
                      : $t.explore.addFavoriteContact}
                    aria-label={$favoriteContacts.includes(
                      normalizeContactEmail(contact.email),
                    )
                      ? $t.explore.removeFavoriteContact
                      : $t.explore.addFavoriteContact}
                    ><i
                      class={$favoriteContacts.includes(
                        normalizeContactEmail(contact.email),
                      )
                        ? "ph-fill ph-star"
                        : "ph-bold ph-star"}
                    ></i></button
                  >
                  <button
                    type="button"
                    class="search-contact-btn mail"
                    onclick={(event) =>
                      openOutlookCompose(contact.email, event)}
                    title={$t.explore.emailContact}
                    ><i class="ph-bold ph-envelope"></i></button
                  >
                  <a
                    href={getTeamsChatUrl(contact.email)}
                    class="search-contact-btn chat"
                    onclick={(event) => event.stopPropagation()}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={$t.explore.chatOnTeams}
                    ><i class="ph-bold ph-chat-circle"></i></a
                  >
                  {#if contact.phone}
                    <a
                      href="tel:{contact.phone.replace(/[\s-]/g, '')}"
                      class="search-contact-btn call"
                      onclick={(event) => event.stopPropagation()}
                      title={$t.explore.callContact}
                      ><i class="ph-bold ph-phone"></i></a
                    >
                  {/if}
                </div>
              </div>
            {/each}
            {#if !searchQuery.trim() && !$settingsStore.programName && filteredContacts.length > visibleContacts.length}
              <p class="view-more-hint">{$t.explore.viewMoreContacts}</p>
            {/if}
            {#if !$settingsStore.emailVerified}
              <div class="verification-hint contact-card-like">
                <div class="hint-icon">
                  <i class="ph-bold ph-lock-key" aria-hidden="true"></i>
                </div>
                <div class="hint-text">
                  <h3>{$t.explore.moreContactsTitle}</h3>
                  <p>{$t.explore.moreContactsDesc}</p>
                  <button
                    type="button"
                    class="hint-btn primary"
                    onclick={() =>
                      (window.location.href = "/settings#directory-access")}
                  >
                    {$t.explore.verifyEmail}
                  </button>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      {:else}
        <div class="no-results glass">
          <p>{$t.explore.noContactsFound} "{searchQuery}"</p>
        </div>
      {/if}
    </section>

    {#if searchQuery.trim()}
      <section class="category-section external-search-section">
        <div class="explore-section-heading">
          <div>
            <p>{$t.explore.searchElsewhere}</p>
            <h2>{$t.explore.externalPortalsFallback}</h2>
          </div>
        </div>
        <div class="external-search-grid">
          {#each searchSources as source}
            <button
              type="button"
              class="external-search-row"
              style={`--source-color: ${source.color}`}
              onclick={() => handleExternalSearch(source.id)}
            >
              <span class="external-icon">
                <i class={source.iconClass} aria-hidden="true"></i>
              </span>
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
              <span class="external-arrow" aria-hidden="true">
                <i class="ph-bold ph-caret-right"></i>
              </span>
            </button>
          {/each}
        </div>
      </section>
    {/if}

    {#if !searchQuery.trim()}
      {#if interactiveMapEnabled}
        <!-- Interactive Campus Map Premium Promo Card -->
        <a href="/explore/map" class="map-promo-banner-card glass">
          <div class="banner-glow-effect"></div>
          <div class="banner-icon-box">
            <i class="ph-bold ph-map-trifold"></i>
          </div>
          <div class="banner-body">
            <div class="banner-tag">NEW FEATURE</div>
            <h2>Interactive Campus Map</h2>
            <p>
              Navigate floors, find rooms in SHED, Cube & Hall, and calculate
              accessible routes.
            </p>
          </div>
          <div class="banner-arrow">
            <i class="ph-bold ph-arrow-right"></i>
          </div>
        </a>
      {:else}
        <div
          class="map-promo-banner-card glass coming-soon-map-card"
          aria-disabled="true"
        >
          <div class="banner-glow-effect"></div>
          <div class="banner-icon-box">
            <i class="ph-bold ph-map-trifold"></i>
          </div>
          <div class="banner-body">
            <div class="banner-tag">COMING SOON</div>
            <h2>Interactive Campus Map</h2>
            <p>A redesigned indoor map and wayfinding view is on the way.</p>
          </div>
          <div class="banner-arrow">
            <i class="ph-bold ph-sparkle"></i>
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Floating Action Buttons -->
  <div class="fab-group">
    {#if showGoToTop}
      <button
        class="fab-btn go-to-top glass"
        type="button"
        onclick={goToTop}
        aria-label={$t.explore.goToTop}
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
      type="button"
      onclick={() => {
        isSearchActive = true;
        const input = document.getElementById("search-input");
        input?.focus();
      }}
      aria-label={$t.explore.searchExplore}
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
    background: var(--surface-solid);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    box-shadow: 0 12px 30px -28px rgba(0, 0, 0, 0.45);
  }

  .link-list-panel .category-title {
    margin-bottom: var(--spacing-sm);
  }

  .top-links-section {
    margin-bottom: var(--spacing-lg);
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

  .search-contact-info-wrapper {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    flex: 1;
    min-width: 0;
  }

  .contact-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-color), #8953ff);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 800;
    flex: 0 0 auto;
    margin-top: 4px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
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
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
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

  .favorite-contact-message {
    margin: 8px 16px 0;
    color: var(--primary-color);
    font-size: 0.86rem;
    font-weight: 800;
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

  .search-contact-btn.favorite.active {
    color: var(--primary-color);
    border-color: rgba(var(--primary-color-rgb), 0.32);
    background: color-mix(in srgb, var(--primary-color), transparent 90%);
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
    background: repeating-linear-gradient(
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

  /* ── CampusWeb Explore Redesign ─────────────────────────────── */
  .explore-page {
    --explore-navy: #14213d;
    --explore-blue: #2fa4d7;
    --explore-orange: #d44407;
    --explore-orange-hover: #f28c3e;
    --explore-gold: #f7b801;
    --explore-purple: #3d348b;
    --explore-lavender: #7678ed;
    --explore-surface: #ffffff;
    --explore-background: #f5f0e6;
    --explore-border: #e5e5e5;
    --explore-text: #000000;
    --explore-muted: #3e2c23;
    --explore-soft-shadow: 0 12px 28px rgba(20, 33, 61, 0.08);
    --explore-row-shadow: 0 4px 14px rgba(20, 33, 61, 0.06);

    width: min(calc(100vw - 32px), 460px);
    max-width: 460px;
    margin: 0 auto;
    padding: max(18px, env(safe-area-inset-top)) 18px
      calc(var(--spacing-xl) * 3);
    background: transparent;
    display: flex;
    flex-direction: column;
    gap: 18px;
    color: var(--explore-text);
  }

  .explore-hero {
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition:
      opacity 0.28s ease,
      max-height 0.28s ease,
      margin 0.28s ease;
    opacity: 1;
    max-height: 180px;
  }

  .explore-hero.collapsed {
    opacity: 0;
    max-height: 0;
    margin: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .explore-hero.narrow {
    gap: 8px;
  }

  .explore-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .explore-title-copy {
    min-width: 0;
  }

  .explore-title-copy h1 {
    margin: 0;
    color: var(--text-color);
    font-family: "SRH Headline", sans-serif;
    font-size: clamp(1.75rem, 7vw, 2rem);
    font-weight: 900;
    line-height: 0.98;
    letter-spacing: 0;
  }

  .explore-title-copy p {
    margin: 7px 0 0;
    color: var(--text-color-secondary);
    font-size: 0.98rem;
    font-weight: 600;
    line-height: 1.35;
  }

  .explore-bookmark-action {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    color: var(--text-color-secondary);
    background: var(--explore-surface);
    border: 1px solid var(--explore-border);
    border-radius: 50%;
    box-shadow: 0 8px 18px rgba(20, 33, 61, 0.08);
    text-decoration: none;
    font-size: 1.35rem;
  }

  .explore-bookmark-action:hover,
  .explore-bookmark-action:focus-visible {
    color: var(--explore-orange);
    border-color: var(--explore-orange-hover);
    outline: none;
  }

  .explore-context {
    width: fit-content;
    max-width: 100%;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin: 0;
    padding: 7px 11px;
    color: var(--explore-muted);
    background: #fff8ec;
    border: 1px solid #f4dfc3;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .explore-context i {
    color: var(--explore-orange);
  }

  .search-sticky-wrapper {
    position: sticky;
    top: 0;
    z-index: 100;
    padding: 10px 0 12px;
    transition:
      background 0.22s ease,
      box-shadow 0.22s ease,
      border-color 0.22s ease;
    margin: -10px 0 10px;
    border-bottom: 1px solid transparent;
    margin-top: 0;
    background: transparent;
  }

  .search-sticky-wrapper::before {
    content: "";
    position: absolute;
    inset: 0 -18px;
    z-index: -1;
    background: transparent;
    transition:
      background 0.22s ease,
      box-shadow 0.22s ease,
      backdrop-filter 0.22s ease;
  }

  .explore-page.search-active .search-sticky-wrapper::before,
  .explore-page.is-searching .search-sticky-wrapper::before {
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    box-shadow: 0 12px 28px rgba(20, 33, 61, 0.08);
  }

  .explore-page.is-searching .search-sticky-wrapper {
    margin-top: 0;
  }

  .search-bar-container {
    max-width: 600px;
    margin: 0 auto;
    padding-inline: 0;
  }

  .search-bar-container :global(.search-input-wrapper) {
    height: 52px;
    border-color: var(--explore-border);
    border-radius: 14px;
    box-shadow: var(--explore-soft-shadow);
  }

  .category-nav-wrapper {
    margin-top: 8px;
    width: 100%;
    display: flex;
    justify-content: center;
    overflow: visible;
  }

  .category-nav {
    display: inline-flex;
    width: auto;
    max-width: 100%;
    padding: 1px;
    margin: 0 auto;
    background: var(--glass-bg);
    border: 1px solid var(--border-color);
    border-radius: 100px;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .category-nav-scroll {
    display: flex;
    gap: 6px;
    padding: 6px 8px;
    margin: -4px 0;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
  }

  .cat-chip {
    min-height: auto;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 20px;
    color: var(--text-color-secondary);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 999px;
    box-shadow: none;
    font-size: 0.9rem;
    font-weight: 700;
    white-space: nowrap;
    transition: all 0.2s;
  }

  .cat-chip i {
    color: var(--explore-orange);
    font-size: 1rem;
  }

  .cat-chip:hover,
  .cat-chip:focus-visible {
    color: var(--explore-orange);
    background: var(--bg-color);
    border-color: var(--border-color);
    outline: none;
  }

  .explore-content {
    width: 100%;
    max-width: none;
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding: 0;
  }

  .category-section {
    margin-bottom: 0;
    scroll-margin-top: 132px;
    animation: reveal 0.4s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  }

  .link-list-panel,
  .directory-results,
  .external-search-section {
    margin: 0;
    padding: 0;
    background: var(--explore-surface);
    border: 1px solid var(--explore-border);
    border-radius: 16px;
    box-shadow: var(--explore-soft-shadow);
    overflow: hidden;
  }

  .explore-section-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 20px 10px;
  }

  .explore-section-heading p {
    margin: 0 0 3px;
    color: var(--explore-orange);
    font-size: 0.78rem;
    font-weight: 900;
    line-height: 1.1;
  }

  .explore-section-heading h2 {
    margin: 0;
    color: var(--text-color);
    font-size: 1.18rem;
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: 0;
  }

  .explore-section-heading > span {
    flex: 0 0 auto;
    color: var(--text-color-secondary);
    background: #f8fafc;
    border: 1px solid var(--explore-border);
    border-radius: 999px;
    padding: 6px 9px;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1;
  }

  .links-stack {
    display: flex;
    flex-direction: column;
    padding: 0;
  }

  .explore-page :global(.link-card-container) {
    margin-top: 0;
  }

  .explore-page :global(.link-card.compact-list) {
    min-height: 78px;
    padding: 12px 16px;
  }

  .links-stack
    :global(.link-card-container:not(:last-child) .link-card.compact-list) {
    border-bottom: 1px solid rgba(7, 19, 47, 0.08);
  }

  .top-links-stack {
    padding-bottom: 8px;
  }

  .links-scroll-area {
    position: relative;
  }

  .links-scroll-area.is-enabled {
    max-height: min(68vh, 720px);
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
    padding-bottom: 0;
  }

  @media (max-width: 767px) {
    .links-scroll-area.is-enabled {
      max-height: min(72dvh, calc((10 * 82px) + (9 * 12px) + 128px));
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
  }

  .list-category-section {
    margin: 0;
    padding: 0 0 8px;
  }

  .list-category-section:not(:first-child) {
    border-top: 8px solid #f8fafc;
  }

  .list-category-title {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0;
    padding: 14px 18px 7px;
    color: var(--text-color);
    font-size: 0.95rem;
    font-weight: 900;
    line-height: 1.1;
  }

  .list-category-title i {
    color: var(--explore-orange);
    font-size: 1.05rem;
  }

  .category-subtitle {
    margin: 0 20px 14px;
    color: var(--text-color-secondary);
    font-size: 0.86rem;
    font-weight: 700;
    line-height: 1.35;
  }

  .contact-results-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 0 16px 16px;
  }

  .search-contact-card {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 14px;
    background: var(--explore-surface);
    border: 1px solid var(--explore-border);
    border-radius: 15px;
    box-shadow: var(--explore-row-shadow);
    cursor: pointer;
    outline: none;
    transition:
      transform 0.18s ease,
      border-color 0.18s ease,
      box-shadow 0.18s ease;
  }

  .search-contact-card:hover,
  .search-contact-card:focus-visible,
  .search-contact-card.is-expanded {
    transform: translateY(-1px);
    border-color: var(--explore-orange-hover);
    box-shadow: 0 10px 24px rgba(212, 68, 7, 0.12);
  }

  .search-contact-info {
    flex: 1;
    min-width: 0;
  }

  .search-contact-name {
    color: var(--text-color);
    font-size: 1rem;
    font-weight: 900;
    line-height: 1.18;
  }

  .search-contact-meta {
    display: grid;
    gap: 4px;
    margin-bottom: 7px;
    color: var(--explore-orange);
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0;
    text-transform: none;
  }

  .contact-program-list,
  .contact-service-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .program-item,
  .service-item {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 4px 8px;
    background: #fff8ec;
    border: 1px solid #f4dfc3;
    border-radius: 999px;
    color: var(--explore-muted);
    line-height: 1.15;
  }

  .search-contact-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 9px;
  }

  .contact-tag {
    padding: 4px 9px;
    color: var(--text-color-secondary);
    background: #f8fafc;
    border: 1px solid var(--explore-border);
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 750;
    line-height: 1.1;
  }

  .campus-tag {
    color: var(--explore-purple);
    background: #f4f2ff;
    border-color: #dedbff;
  }

  .school-tag {
    color: #1c769b;
    background: #eef9fd;
    border-color: #c9edf9;
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
    max-height: 104px;
    margin-top: 11px;
    opacity: 1;
  }

  .contact-direct-link {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    width: fit-content;
    max-width: 100%;
    color: var(--text-color-secondary);
    font-size: 0.84rem;
    font-weight: 700;
    line-height: 1.2;
    text-decoration: none;
    overflow-wrap: anywhere;
  }

  .contact-direct-link i {
    color: var(--explore-orange);
  }

  .contact-direct-link:hover,
  .contact-direct-link:focus-visible {
    color: var(--explore-orange);
    outline: none;
  }

  .search-contact-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
  }

  .search-contact-btn {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    color: var(--text-color-secondary);
    background: #f8fafc;
    border: 1px solid var(--explore-border);
    border-radius: 12px;
    font-size: 1.1rem;
    text-decoration: none;
    transition:
      transform 0.18s ease,
      background 0.18s ease,
      color 0.18s ease,
      border-color 0.18s ease;
  }

  .search-contact-btn:hover,
  .search-contact-btn:focus-visible {
    color: #ffffff;
    background: var(--explore-orange);
    border-color: var(--explore-orange);
    transform: translateY(-1px);
    outline: none;
  }

  .search-contact-btn.favorite.active {
    color: var(--explore-orange);
    border-color: rgba(212, 68, 7, 0.32);
    background: rgba(212, 68, 7, 0.08);
  }

  .search-contact-btn.favorite.active:hover,
  .search-contact-btn.favorite.active:focus-visible {
    color: #ffffff;
    background: var(--explore-orange);
    border-color: var(--explore-orange);
  }

  .search-contact-btn.chat:hover,
  .search-contact-btn.chat:focus-visible {
    background: var(--explore-blue);
    border-color: var(--explore-blue);
  }

  .search-contact-btn.call:hover,
  .search-contact-btn.call:focus-visible {
    background: #2fb344;
    border-color: #2fb344;
  }

  .external-search-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 0 16px 16px;
  }

  .external-search-row {
    display: flex;
    align-items: center;
    gap: 13px;
    min-height: 76px;
    padding: 12px;
    color: var(--text-color);
    background: var(--explore-surface);
    border: 1px solid var(--explore-border);
    border-radius: 15px;
    text-align: left;
    cursor: pointer;
    box-shadow: var(--explore-row-shadow);
    transition:
      transform 0.18s ease,
      border-color 0.18s ease,
      box-shadow 0.18s ease;
  }

  .external-search-row:hover,
  .external-search-row:focus-visible {
    transform: translateY(-1px);
    border-color: var(--source-color, var(--explore-orange));
    box-shadow: 0 10px 24px rgba(20, 33, 61, 0.1);
    outline: none;
  }

  .external-icon {
    width: 50px;
    height: 50px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    color: #ffffff;
    background: var(--source-color, var(--explore-orange));
    border-radius: 13px;
    font-size: 1.55rem;
  }

  .external-row-content {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .external-name {
    color: var(--text-color);
    font-size: 0.98rem;
    font-weight: 900;
    line-height: 1.1;
  }

  .external-query {
    color: var(--text-color-secondary);
    font-size: 0.84rem;
    font-weight: 650;
    line-height: 1.25;
  }

  .external-arrow {
    margin-left: auto;
    color: var(--text-color-secondary);
    font-size: 1.05rem;
    opacity: 0.85;
  }

  .view-more-hint {
    padding: 8px 16px 16px;
    color: var(--text-color-secondary);
    border-top: 1px solid var(--explore-border);
    font-size: 0.84rem;
    font-style: normal;
    font-weight: 700;
    text-align: center;
  }

  .verification-hint {
    padding: 28px 18px;
    background: var(--explore-surface);
    border: 1px solid var(--explore-border);
    border-radius: 15px;
    text-align: center;
    box-shadow: var(--explore-row-shadow);
  }

  .verification-hint.contact-card-like {
    border-radius: 15px;
    padding: 28px 18px;
    height: auto;
  }

  .verification-hint.missing-content {
    background: #fff8ec;
    border-color: #f4dfc3;
  }

  .hint-icon {
    width: 54px;
    height: 54px;
    display: grid;
    place-items: center;
    margin: 0 auto 14px;
    color: #ffffff;
    background: var(--explore-orange);
    border-radius: 14px;
    font-size: 1.7rem;
  }

  .hint-text h3 {
    margin: 0 0 7px;
    color: var(--text-color);
    font-size: 1.05rem;
    font-weight: 900;
  }

  .hint-text p {
    margin: 0;
    color: var(--text-color-secondary);
    font-size: 0.9rem;
    font-weight: 650;
    line-height: 1.35;
  }

  .hint-btn {
    min-height: 44px;
    margin-top: 18px;
    padding: 0 24px;
    color: #ffffff;
    background: var(--explore-orange);
    border: 1px solid var(--explore-orange);
    border-radius: 999px;
    font-size: 0.9rem;
    font-weight: 900;
    cursor: pointer;
    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease;
  }

  .hint-btn:hover,
  .hint-btn:focus-visible {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(212, 68, 7, 0.22);
    outline: none;
  }

  .no-results {
    padding: 34px 18px;
    color: var(--text-color-secondary);
    background: var(--explore-surface);
    border: 1px solid var(--explore-border);
    border-radius: 16px;
    box-shadow: var(--explore-soft-shadow);
    text-align: center;
  }

  .no-results-icon {
    width: 54px;
    height: 54px;
    display: grid;
    place-items: center;
    margin: 0 auto 13px;
    color: #ffffff;
    background: var(--explore-orange);
    border-radius: 14px;
    font-size: 1.65rem;
    opacity: 1;
  }

  .contacts-loading {
    margin: 0 16px 16px;
    padding: 34px 18px;
    background: var(--explore-surface);
    border: 1px solid var(--explore-border);
    border-radius: 15px;
    box-shadow: var(--explore-row-shadow);
  }

  .spinner {
    border-color: #fff0e8;
    border-top-color: var(--explore-orange);
  }

  .fab-group {
    right: max(18px, env(safe-area-inset-right));
    bottom: calc(var(--bottom-nav-height) + 16px);
    gap: 10px;
  }

  .fab-btn {
    width: 50px;
    height: 50px;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.66);
    box-shadow: 0 12px 24px rgba(212, 68, 7, 0.22);
  }

  .go-to-top {
    color: var(--text-color-secondary);
    background: var(--explore-surface);
    border-color: var(--explore-border);
    backdrop-filter: none;
  }

  .search-fab {
    background: var(--explore-orange);
  }

  .search-fab:hover,
  .search-fab:focus-visible {
    background: var(--explore-orange-hover);
    outline: none;
  }

  @media (min-width: 768px) {
    .explore-page {
      width: 100%;
      max-width: 1040px;
      padding-inline: 0;
      padding-bottom: 56px;
      gap: 24px;
    }

    .search-sticky-wrapper {
      margin-inline: 0;
      padding-inline: 0;
      background: transparent;
    }

    .explore-content {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
      gap: 22px;
      align-items: start;
    }

    .top-links-section,
    .remaining-links-panel {
      grid-column: 1;
    }

    .directory-results {
      grid-column: 2;
      grid-row: 1 / span 2;
      position: sticky;
      top: 104px;
    }

    .external-search-section {
      grid-column: 1 / -1;
    }

    .top-links-stack {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding: 0 16px 16px;
    }

    .top-links-stack :global(.link-card.compact-list) {
      border: 1px solid var(--explore-border);
      border-radius: 15px;
      box-shadow: var(--explore-row-shadow);
    }

    .top-links-stack
      :global(.link-card-container:not(:last-child) .link-card.compact-list) {
      border-bottom: 1px solid var(--explore-border);
    }

    .contact-results-list {
      grid-template-columns: 1fr;
    }

    .external-search-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .fab-group {
      bottom: 24px;
      right: 24px;
    }
  }

  @media (min-width: 1120px) {
    .top-links-stack {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 380px) {
    .explore-page {
      width: min(calc(100vw - 24px), 460px);
      padding-inline: 12px;
    }

    .explore-section-heading {
      padding-inline: 16px;
    }

    .explore-page :global(.link-card.compact-list) {
      padding-inline: 14px;
    }
  }

  :global([data-theme="dark"]) .explore-page {
    --explore-surface: rgba(20, 20, 30, 0.96);
    --explore-border: rgba(255, 255, 255, 0.12);
    --explore-text: var(--dark-text);
    --explore-muted: rgba(240, 240, 248, 0.72);
    --explore-soft-shadow: 0 14px 30px rgba(0, 0, 0, 0.34);
    --explore-row-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
  }

  :global([data-theme="dark"]) .explore-context,
  :global([data-theme="dark"]) .program-item,
  :global([data-theme="dark"]) .service-item,
  :global([data-theme="dark"]) .verification-hint.missing-content {
    background: rgba(212, 68, 7, 0.14);
    border-color: rgba(212, 68, 7, 0.28);
  }

  :global([data-theme="dark"]) .cat-chip,
  :global([data-theme="dark"]) .explore-section-heading > span,
  :global([data-theme="dark"]) .contact-tag,
  :global([data-theme="dark"]) .search-contact-btn {
    background: rgba(255, 255, 255, 0.07);
  }

  :global([data-theme="dark"]) .list-category-section:not(:first-child) {
    border-top-color: rgba(255, 255, 255, 0.06);
  }

  @media (prefers-color-scheme: dark) {
    :global(html:not([data-theme="light"])) .explore-page {
      --explore-surface: rgba(20, 20, 30, 0.96);
      --explore-border: rgba(255, 255, 255, 0.12);
      --explore-text: var(--dark-text);
      --explore-muted: rgba(240, 240, 248, 0.72);
      --explore-soft-shadow: 0 14px 30px rgba(0, 0, 0, 0.34);
      --explore-row-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
    }

    :global(html:not([data-theme="light"])) .explore-context,
    :global(html:not([data-theme="light"])) .program-item,
    :global(html:not([data-theme="light"])) .service-item,
    :global(html:not([data-theme="light"])) .verification-hint.missing-content {
      background: rgba(212, 68, 7, 0.14);
      border-color: rgba(212, 68, 7, 0.28);
    }

    :global(html:not([data-theme="light"])) .cat-chip,
    :global(html:not([data-theme="light"])) .explore-section-heading > span,
    :global(html:not([data-theme="light"])) .contact-tag,
    :global(html:not([data-theme="light"])) .search-contact-btn {
      background: rgba(255, 255, 255, 0.07);
    }

    :global(html:not([data-theme="light"]))
      .list-category-section:not(:first-child) {
      border-top-color: rgba(255, 255, 255, 0.06);
    }
  }

  /* ── Map Promo Banner ── */
  .map-promo-banner-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
    border-radius: 1.25rem;
    background: linear-gradient(
      135deg,
      rgba(28, 28, 62, 0.72) 0%,
      rgba(56, 33, 91, 0.58) 52%,
      rgba(15, 23, 42, 0.5) 100%
    );
    border: 1px solid rgba(168, 85, 247, 0.28);
    text-decoration: none;
    color: inherit;
    overflow: hidden;
    transition:
      transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
      border-color 0.3s ease,
      box-shadow 0.3s ease;
  }

  .map-promo-banner-card:hover {
    transform: translateY(-2px);
    border-color: rgba(196, 181, 253, 0.55);
    box-shadow:
      0 10px 30px -10px rgba(168, 85, 247, 0.28),
      0 0 15px rgba(96, 165, 250, 0.16);
  }

  .banner-glow-effect {
    position: absolute;
    top: 50%;
    left: 10%;
    width: 250px;
    height: 150px;
    background: radial-gradient(
      circle,
      rgba(168, 85, 247, 0.18) 0%,
      rgba(96, 165, 250, 0.14) 45%,
      transparent 72%
    );
    filter: blur(20px);
    pointer-events: none;
    transform: translate(-50%, -50%);
  }

  .banner-icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 1rem;
    background: linear-gradient(135deg, #a855f7 0%, #60a5fa 100%);
    color: #f8fafc;
    font-size: 1.75rem;
    box-shadow: 0 0 24px rgba(168, 85, 247, 0.38);
    flex-shrink: 0;
  }

  .banner-body {
    flex: 1;
  }

  .banner-tag {
    display: inline-block;
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: #e9d5ff;
    background: rgba(168, 85, 247, 0.14);
    padding: 0.2rem 0.5rem;
    border-radius: 9999px;
    margin-bottom: 0.5rem;
    border: 1px solid rgba(196, 181, 253, 0.24);
  }

  .banner-body h2 {
    margin: 0 0 0.25rem 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #ffffff;
  }

  .banner-body p {
    margin: 0;
    font-size: 0.85rem;
    color: #cbd5e1;
    line-height: 1.4;
  }

  .banner-arrow {
    font-size: 1.25rem;
    color: #cbd5e1;
    transition:
      transform 0.3s ease,
      color 0.3s ease;
  }

  .map-promo-banner-card:hover .banner-arrow {
    transform: translateX(4px);
    color: #e9d5ff;
  }

  .coming-soon-map-card {
    cursor: default;
    opacity: 0.92;
    pointer-events: none;
  }

  .coming-soon-map-card:hover {
    transform: none;
    border-color: rgba(168, 85, 247, 0.28);
    box-shadow: none;
  }

  @media (max-width: 640px) {
    .map-promo-banner-card {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem;
    }

    .banner-arrow {
      align-self: flex-end;
      margin-top: -1.5rem;
    }
  }
</style>
