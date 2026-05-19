<script lang="ts">
  import {
    settingsStore,
    CAMPUSES,
    DEPARTMENTS,
    campusDepartments,
    campusPrograms,
    isSetupComplete,
    type AppLanguage,
    type WeekStart,
  } from "$lib/stores/settingsStore";
  import { accessibility } from "$lib/stores/accessibility";
  import {
    calendarStore,
    activeClasses,
    EVENT_COLORS,
    getTextureForColor,
  } from "$lib/stores/calendarStore";
  import { classColors } from "$lib/stores/classColors";
  import { t } from "$lib/i18n";
  import IosAccessibilityIcon from "$lib/components/IosAccessibilityIcon.svelte";
  import { version } from "$app/environment";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import EmailGate from "$lib/components/EmailGate.svelte";
  import SecureCalendarInput from "$lib/components/SecureCalendarInput.svelte";
  import Sortable from 'sortablejs';

  function sortableSections(node: HTMLElement) {
    const sortable = new Sortable(node, {
      animation: 150,
      filter: '.is-header',
      preventOnFilter: false,
      onMove: (evt) => {
        if (evt.related.classList.contains('is-header')) {
          return false;
        }
      },
      onEnd: (evt) => {
        if (evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
          const updated = [...visibleSections];
          const [moved] = updated.splice(evt.oldIndex, 1);
          updated.splice(evt.newIndex, 0, moved);
          
          const feedSection = $settingsStore.homeSections.find((s: any) => s.id === "feed");
          const finalSections = feedSection ? [...updated, feedSection] : updated;
          
          settingsStore.patch({ homeSections: finalSections });
        }
      }
    });

    return {
      destroy() {
        sortable.destroy();
      }
    };
  }

  $: visibleSections = $settingsStore.homeSections.filter(
    (s: any) => s.id !== "feed",
  );
  $: activeCampusName =
    CAMPUSES.find((campus) => campus.id === $settingsStore.campusId)?.name ||
    "";

  // When campus changes, clear department and program selection
  function handleCampusChange(campusId: string) {
    settingsStore.patch({ campusId, departmentId: null, programName: null });
  }

  function handleDepartmentChange(deptId: string) {
    settingsStore.patch({ departmentId: deptId, programName: null });
  }

  function handleProgramChange(programName: string) {
    settingsStore.patch({ programName });
  }

  function handleLanguageChange(lang: string) {
    settingsStore.patch({ language: lang as AppLanguage });
  }

  function handleWeekStartChange(start: number) {
    settingsStore.patch({ weekStartsOn: start as WeekStart });
  }

  function toggleSection(id: string) {
    const updated = $settingsStore.homeSections.map((sec) =>
      sec.id === id ? { ...sec, enabled: !sec.enabled } : sec,
    );
    settingsStore.patch({ homeSections: updated });
  }



  const languageOptions = [
    { value: "en", native: "English", flag: "🇬🇧" },
    { value: "de", native: "Deutsch", flag: "🇩🇪" },
  ];

  let showResetConfirm = false;

  function handleReset() {
    settingsStore.reset();
    showResetConfirm = false;
  }

  // ── Update / Reload ───────────────────────────────────────────
  const APP_VERSION = version;
  let updateStatus: "idle" | "checking" | "updating" = "idle";

  async function handleUpdate() {
    updateStatus = "updating";

    try {
      // 1. Refresh calendar data explicitly
      await calendarStore.refreshAll(true);

      // 2. Clear browser caches to fetch fresh webapp assets on next load
      // This leaves localStorage intact (where settings & calendar cachedEvents live)
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch (e) {
      console.error("Update error:", e);
    }

    // 3. Tell the waiting service worker to take over, then reload
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            window.location.reload();
          });
        } else {
          if (reg) {
            reg.update().finally(() => {
              window.location.reload();
            });
          } else {
            window.location.reload();
          }
        }
      });
    } else {
      window.location.reload();
    }
  }

  async function handleDirectoryLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    settingsStore.patch({ emailVerified: false } as any);
  }

  let a11yOpen = false;
  let calendarSettingsOpen = false;
  let directoryOpen = false;
  let languageOpen = false;
  let appearanceOpen = false;
  let dangerOpen = false;
  let activeColorChooser: string | null = null;

  function focusCalendarUrlInputIfRequested() {
    if ($page.url.searchParams.get("focus") !== "calendar-url") return;

    setTimeout(() => {
      const input = document.getElementById("cal-url") as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
        return;
      }

      const addBtn = document.querySelector(
        ".calendar-subscription .add-btn",
      ) as HTMLButtonElement | null;
      addBtn?.click();

      setTimeout(() => {
        const delayedInput = document.getElementById("cal-url") as HTMLInputElement | null;
        delayedInput?.focus();
        delayedInput?.select();
      }, 120);
    }, 120);
  }

  function toggleColorChooser(id: string) {
    activeColorChooser = activeColorChooser === id ? null : id;
  }

  function selectColor(clsId: string, colorId: string) {
    classColors.updateColor(clsId, colorId);
    activeColorChooser = null;
  }

  onMount(() => {
    const hash = $page.url.hash;
    if (hash === "#accessibility") a11yOpen = true;
    if (hash === "#directory-access") directoryOpen = true;
    if (hash === "#appearance") appearanceOpen = true;
    if (hash === "#language") languageOpen = true;
    if (hash === "#calendar-settings") calendarSettingsOpen = true;
    if (hash === "#danger-zone") dangerOpen = true;

    if (hash && hash !== "") {
      setTimeout(() => {
        document.getElementById(hash.substring(1))?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }

    focusCalendarUrlInputIfRequested();
  });

  // Reactively handle hash changes while on the same page
  $: {
    const hash = $page.url.hash;
    if (hash === "#accessibility") a11yOpen = true;
    if (hash === "#directory-access") directoryOpen = true;
    if (hash === "#appearance") appearanceOpen = true;
    if (hash === "#language") languageOpen = true;
    if (hash === "#calendar-settings") calendarSettingsOpen = true;
    if (hash === "#danger-zone") dangerOpen = true;

    if (hash && hash !== "") {
      setTimeout(() => {
        document.getElementById(hash.substring(1))?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }

    focusCalendarUrlInputIfRequested();
  }

</script>

<svelte:head>
  <title>{$t.settings.pageTitle}</title>
</svelte:head>

<div class="settings-page">
  <header class="settings-hero" class:narrow={$settingsStore.headerSize === 'small'}>
    <div class="settings-hero-copy">
      <span class="settings-eyebrow">{$t.settings.makeItYours}</span>
      <h1>{$t.settings.title}</h1>
      <p>{$t.settings.subtitle}</p>
    </div>
    <div class="settings-profile-icon" aria-hidden="true">
      <i class="ph-bold ph-user-circle"></i>
      <span></span>
    </div>
  </header>

  <div class="settings-status-grid" aria-label={$t.settings.statusOverview}>
    <a href="#campus-profile" class="status-tile">
      <span class="status-icon status-icon--navy">
        <i class="ph-bold ph-map-pin" aria-hidden="true"></i>
      </span>
      <span class="status-copy">
        <span class="status-label">{$t.settings.campusLabel}</span>
        <strong>{$isSetupComplete ? activeCampusName : $t.settings.notSet}</strong>
      </span>
    </a>
    <a href="#directory-access" class="status-tile">
      <span class="status-icon status-icon--blue">
        <i class="ph-bold ph-shield-check" aria-hidden="true"></i>
      </span>
      <span class="status-copy">
        <span class="status-label">{$t.settings.directoryLabel}</span>
        <strong>{$settingsStore.emailVerified ? $t.settings.verified : $t.settings.locked}</strong>
      </span>
    </a>
    <a href="#appearance" class="status-tile">
      <span class="status-icon status-icon--gold">
        <i class="ph-bold ph-palette" aria-hidden="true"></i>
      </span>
      <span class="status-copy">
        <span class="status-label">{$t.settings.themeLabel}</span>
        <strong>{$settingsStore.theme}</strong>
      </span>
    </a>
    <a href="#accessibility" class="status-tile">
      <span class="status-icon status-icon--purple">
        <IosAccessibilityIcon />
      </span>
      <span class="status-copy">
        <span class="status-label">{$t.settings.accessLabel}</span>
        <strong>{$accessibility.highContrast || $accessibility.largeText ? $t.settings.custom : $t.settings.default}</strong>
      </span>
    </a>
  </div>

  <nav class="settings-jump-nav" aria-label={$t.settings.sectionsLabel}>
    <a href="#campus-profile"><i class="ph-bold ph-graduation-cap" aria-hidden="true"></i><span>{$t.settings.campusLabel}</span></a>
    <a href="#directory-access"><i class="ph-bold ph-lock-keyhole" aria-hidden="true"></i><span>{$t.settings.directoryLabel}</span></a>
    <a href="#appearance"><i class="ph-bold ph-palette" aria-hidden="true"></i><span>{$t.settings.layout}</span></a>
    <a href="#calendar-settings"><i class="ph-bold ph-calendar" aria-hidden="true"></i><span>{$t.nav.calendar}</span></a>
    <a href="#accessibility"><IosAccessibilityIcon /><span>{$t.settings.accessLabel}</span></a>
  </nav>

  <div class="settings-content">

  <!-- ── Campus & Programme ────────────────── -->
  <section id="campus-profile" class="settings-section">
    <div class="section-header">
      <span class="section-icon"><i class="ph-bold ph-graduation-cap"></i></span>
      <div>
        <h2>{$t.settings.campusTitle}</h2>
        <p class="section-desc">{$t.settings.campusDesc}</p>
      </div>
    </div>

    <div class="setting-row">
      <label class="setting-label" for="campus-select"
        >{$t.settings.campusLabel}</label
      >
      <select
        id="campus-select"
        class="setting-select"
        value={$settingsStore.campusId ?? ""}
        on:change={(e) => handleCampusChange(e.currentTarget.value)}
      >
        <option value="" disabled>{$t.settings.campusPlaceholder}</option>
        {#each CAMPUSES as campus}
          <option value={campus.id}>{campus.name}</option>
        {/each}
      </select>
    </div>

    {#if $settingsStore.campusId}
      <div class="setting-row">
        <label class="setting-label" for="dept-select"
          >{$t.settings.deptLabel}</label
        >
        <select
          id="dept-select"
          class="setting-select"
          value={$settingsStore.departmentId ?? ""}
          on:change={(e) => handleDepartmentChange(e.currentTarget.value)}
        >
          <option value="" disabled>{$t.settings.deptPlaceholder}</option>
          {#each $campusDepartments as dept}
            <option value={dept.id}>{dept.shortName} — {dept.name}</option>
          {/each}
        </select>
      </div>

      {#if $settingsStore.departmentId}
        <div class="setting-row">
          <label class="setting-label" for="program-select"
            >{$t.settings.programLabel}</label
          >
          <select
            id="program-select"
            class="setting-select"
            value={$settingsStore.programName ?? ""}
            on:change={(e) => handleProgramChange(e.currentTarget.value)}
          >
            <option value="">{$t.settings.programPlaceholder}</option>
            {#each $campusPrograms as program}
              <option value={program}>{program}</option>
            {/each}
          </select>
        </div>
      {/if}
    {/if}
  </section>

  <section id="directory-access" class="settings-section">
      <details bind:open={directoryOpen}>
        <summary class="section-header section-header--collapsible">
          {#if !$settingsStore.emailVerified}
            <span class="section-icon"><i class="ph-bold ph-lock-keyhole"></i></span>
            <div>
              <div class="section-title-row">
                <h2>{$t.settings.directoryAccess}</h2>
                <span class="privacy-badge">{$t.settings.zeroKnowledge}</span>
              </div>
              <p class="section-desc">
                {$t.settings.verifyEmailDesc}
              </p>
            </div>
          {:else}
            <span class="section-icon"><i class="ph-bold ph-shield-check"></i></span>
            <div>
              <div class="section-title-row">
                <h2>{$t.settings.directoryAccess}</h2>
                <span class="privacy-badge active">{$t.settings.secureAccessActive}</span>
              </div>
              <p class="section-desc">
                {$t.settings.directoryActiveDesc}
              </p>
            </div>
          {/if}
          <span class="chevron" aria-hidden="true">›</span>
        </summary>

        <div class="a11y-body" style="padding-top: var(--spacing-md);">
          {#if !$settingsStore.emailVerified}
            <EmailGate />
          {:else}
            <p
              style="color: var(--text-color-secondary); font-size: 0.95rem; margin: 0; line-height: 1.5;"
            >
              {$t.settings.directoryActiveNote}
            </p>
            <button class="secondary-action-btn" on:click={handleDirectoryLogout}>
              {$t.settings.directorySignOut}
            </button>
          {/if}
        </div>
      </details>
  </section>

  <!-- ── Language ──────────────────────────── -->
  <section id="language" class="settings-section">

    <details bind:open={languageOpen}>
      <summary class="section-header section-header--collapsible">
        <span class="section-icon"><i class="ph-bold ph-globe"></i></span>
        <div>
          <h2>{$t.settings.languageTitle}</h2>
          <p class="section-desc">{$t.settings.languageDesc}</p>
        </div>
        <span class="chevron" aria-hidden="true">›</span>
      </summary>

      <div class="a11y-body" style="padding-top: var(--spacing-md);">
        <div
          class="segmented-control"
          role="group"
          aria-label={$t.settings.languageSelection}
        >
          {#each languageOptions as lang}
            <button
              class="segment"
              class:active={$settingsStore.language === lang.value}
              on:click={() => handleLanguageChange(lang.value)}
              aria-pressed={$settingsStore.language === lang.value}
            >
              <span class="segment-flag">{lang.flag}</span>
              <span class="segment-label">{lang.native}</span>
            </button>
          {/each}
        </div>
      </div>
    </details>
  </section>

  <!-- ── Appearance ────────────────────────── -->
  <section id="appearance" class="settings-section">

    <details bind:open={appearanceOpen}>
      <summary class="section-header section-header--collapsible">
        <span class="section-icon"><i class="ph-bold ph-palette"></i></span>
        <div>
          <h2>{$t.settings.appearanceTitle}</h2>
          <p class="section-desc">{$t.settings.appearanceDesc}</p>
        </div>
        <span class="chevron" aria-hidden="true">›</span>
      </summary>

      <div class="a11y-body" style="padding-top: var(--spacing-md);">
        <!-- 1. Theme Picker -->
        <div class="setting-group" style="border-top: none; padding-top: 0;">
          <h3 class="group-title">{$t.settings.themeLabel}</h3>
          <div
            class="theme-picker"
            role="group"
            aria-label={$t.settings.appearanceTitle}
          >
            <button
              class="theme-card"
              class:active={$settingsStore.theme === "auto"}
              on:click={() => settingsStore.patch({ theme: "auto" })}
              aria-pressed={$settingsStore.theme === "auto"}
            >
              <span class="theme-icon"><i class="ph-bold ph-arrows-counter-clockwise"></i></span>
              <span class="theme-label">{$t.settings.themeAuto}</span>
            </button>
            <button
              class="theme-card"
              class:active={$settingsStore.theme === "light"}
              on:click={() => settingsStore.patch({ theme: "light" })}
              aria-pressed={$settingsStore.theme === "light"}
            >
              <span class="theme-icon"><i class="ph-bold ph-sun"></i></span>
              <span class="theme-label">{$t.settings.themeLight}</span>
            </button>
            <button
              class="theme-card"
              class:active={$settingsStore.theme === "dark"}
              on:click={() => settingsStore.patch({ theme: "dark" })}
              aria-pressed={$settingsStore.theme === "dark"}
            >
              <span class="theme-icon"><i class="ph-bold ph-moon"></i></span>
              <span class="theme-label">{$t.settings.themeDark}</span>
            </button>
          </div>
        </div>

	        <!-- 2. Homepage Layout -->
	        <div class="setting-group setting-group--home-layout">
	          <h3 class="group-title">{$t.settings.homepageLayout}</h3>
	          <p class="section-desc section-desc--spaced">
	            {$t.settings.homepageLayoutDesc}
	          </p>
	          <div class="setting-row setting-row--control">
	            <div class="setting-info setting-copy">
	              <span class="setting-label">{$t.settings.calendarWidgetMode}</span>
	              <span class="setting-desc">{$t.settings.calendarWidgetModeDesc}</span>
	            </div>
	            <div class="segment-control segment-control--equal" role="group" aria-label={$t.settings.calendarWidgetMode}>
	              <button
	                class="segment-btn"
	                class:active={$settingsStore.calendarWidgetMode !== "next"}
	                aria-pressed={$settingsStore.calendarWidgetMode !== "next"}
	                on:click={() => settingsStore.patch({ calendarWidgetMode: "today" })}
	              >
	                {$t.settings.calendarWidgetToday}
	              </button>
	              <button
	                class="segment-btn"
	                class:active={$settingsStore.calendarWidgetMode === "next"}
	                aria-pressed={$settingsStore.calendarWidgetMode === "next"}
	                on:click={() => settingsStore.patch({ calendarWidgetMode: "next" })}
	              >
	                {$t.settings.calendarWidgetNext}
	              </button>
	            </div>
	          </div>
	          <div class="sections-list" use:sortableSections>
	            {#each visibleSections as sec, i (sec.id)}
	              <div class="setting-row section-item" class:is-header={sec.id === "header"} style={sec.id !== "header" ? "cursor: grab;" : ""}>
	                <div class="section-info">
	                  <span class="setting-label">
	                    {#if sec.id === "favorites"}<i class="section-label-icon ph-bold ph-star" aria-hidden="true"></i>
	                    {:else if sec.id === "calendar"}<i class="section-label-icon ph-bold ph-calendar" aria-hidden="true"></i>
	                    {:else if sec.id === "cards"}<i class="section-label-icon ph-bold ph-identification-card" aria-hidden="true"></i>
	                    {:else if sec.id === "header"}<i class="section-label-icon ph-bold ph-house" aria-hidden="true"></i>
	                    {:else if sec.id === "stories"}<i class="section-label-icon ph-bold ph-circles-three-plus" aria-hidden="true"></i>
	                    {:else if sec.id === "feed"}<i class="section-label-icon ph-bold ph-newspaper" aria-hidden="true"></i>
	                    {/if}
                    {sec.id === "favorites"
                      ? $t.settings.favoriteLinks
                      : sec.id === "calendar"
                        ? $t.settings.calendarSchedule
                        : sec.id === "cards"
                          ? $t.settings.cards
                          : sec.id === "header"
                            ? $t.settings.headerSection
                            : sec.id === "stories"
                              ? $t.settings.campusStories
                              : sec.id === "feed"
                                ? $t.settings.feedSummary
                                : sec.id}
                  </span>
                </div>
                <div class="section-actions">
                  {#if sec.id === "header"}
                    <!-- Compact/Prominent Swap Button/Chip (one button, swap options) -->
                    <button
                      class="chip-toggle-btn"
                      on:click={() =>
                        settingsStore.patch({
                          headerSize:
                            $settingsStore.headerSize === "small"
                              ? "big"
                              : "small",
                        })}
                    >
                      {$settingsStore.headerSize === "small"
                        ? $t.settings.compact
                        : $t.settings.prominent}
                    </button>
                  {/if}

                  <!-- Toggle button -->
                  <button
                    class="toggle"
                    class:on={sec.enabled}
                    role="switch"
                    aria-checked={sec.enabled}
                    aria-label={$t.settings.toggleSection}
                    on:click={() => toggleSection(sec.id)}
                  >
                    <span class="toggle-knob"></span>
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- 3. Default Landing Page -->
	        <div class="setting-group setting-group--landing">
	          <h3 class="group-title">{$t.settings.defaultLandingPage}</h3>
	          <div class="setting-row setting-row--control setting-row--last">
	            <div class="setting-info setting-copy">
	              <span class="setting-label">{$t.settings.defaultPage}</span>
	              <span class="setting-desc">{$t.settings.defaultPageDesc}</span>
	            </div>
	            <div class="segment-control segment-control--equal">
	              <button
	                class="segment-btn"
	                class:active={$settingsStore.defaultPage !== "calendar"}
	                aria-pressed={$settingsStore.defaultPage !== "calendar"}
	                on:click={() => settingsStore.patch({ defaultPage: "home" })}
	              >
	                <i class="ph-bold ph-house" aria-hidden="true"></i>
	                <span>{$t.nav.home}</span>
	              </button>
	              <button
	                class="segment-btn"
	                class:active={$settingsStore.defaultPage === "calendar"}
	                aria-pressed={$settingsStore.defaultPage === "calendar"}
	                on:click={() =>
	                  settingsStore.patch({ defaultPage: "calendar" })}
	              >
	                <i class="ph-bold ph-calendar" aria-hidden="true"></i>
	                <span>{$t.nav.calendar}</span>
	              </button>
	            </div>
	          </div>
        </div>
      </div>
    </details>
  </section>
  
  <!-- ── Feed ──────────────────────────────── -->
  <section id="feed-settings" class="settings-section">

    <details>
      <summary class="section-header section-header--collapsible">
        <span class="section-icon"><i class="ph-bold ph-rss"></i></span>
        <div>
          <h2>{$t.settings.feedTitle}</h2>
          <p class="section-desc">{$t.settings.feedDesc}</p>
        </div>
        <span class="chevron" aria-hidden="true">›</span>
      </summary>

      <div class="a11y-body" style="padding-top: var(--spacing-md);">
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">{$t.settings.refreshRateLabel}</span>
          </div>
          <div class="segment-control">
            <button
              class="segment-btn"
              class:active={$settingsStore.feedRefreshRate === 5}
              on:click={() => settingsStore.patch({ feedRefreshRate: 5 })}
            >
              {$t.settings.refreshRate5m}
            </button>
            <button
              class="segment-btn"
              class:active={$settingsStore.feedRefreshRate === 15}
              on:click={() => settingsStore.patch({ feedRefreshRate: 15 })}
            >
              {$t.settings.refreshRate15m}
            </button>
            <button
              class="segment-btn"
              class:active={$settingsStore.feedRefreshRate === 60}
              on:click={() => settingsStore.patch({ feedRefreshRate: 60 })}
            >
              {$t.settings.refreshRate1h}
            </button>
            <button
              class="segment-btn"
              class:active={$settingsStore.feedRefreshRate === 0}
              on:click={() => settingsStore.patch({ feedRefreshRate: 0 })}
            >
              {$t.settings.refreshRateManual}
            </button>
          </div>
        </div>
      </div>
    </details>
  </section>

  <!-- ── Calendar Settings (Collapsible) ────────────── -->
  <section id="calendar-settings" class="settings-section a11y-section">

    <details bind:open={calendarSettingsOpen}>
      <summary class="section-header section-header--collapsible">
        <span class="section-icon"><i class="ph-bold ph-calendar"></i></span>
        <div>
          <h2>{$t.settings.calendarTitle}</h2>
          <p class="section-desc">
            Manage subscriptions, colors, and preferences.
          </p>
        </div>
        <span class="chevron" aria-hidden="true">›</span>
      </summary>

      <div class="a11y-body">
        <!-- 1. Preferences -->
        <div class="setting-row">
          <label class="setting-label" for="week-start"
            >{$t.settings.weekStartsOn}</label
          >
          <select
            id="week-start"
            class="setting-select setting-select--inline"
            value={$settingsStore.weekStartsOn}
            on:change={(e) =>
              handleWeekStartChange(Number(e.currentTarget.value))}
          >
            <option value={1}>{$t.settings.monday}</option>
            <option value={0}>{$t.settings.sunday}</option>
            <option value={6}>{$t.settings.saturday}</option>
          </select>
        </div>

        <!-- 2. Subscriptions -->
        <div class="setting-group">
          <h3 class="group-title">{$t.settings.subscriptions}</h3>
          <div class="helper-box">
            <p>
              <strong>{$t.settings.howToFindLink}</strong>
              <a
                href="https://srh-community.campusweb.cloud/en/mein-studium/mein-stundenplan.php"
                target="_blank"
                rel="noopener noreferrer">{$t.calendar.mySchedule}</a
              >
              {$t.settings.calendarLinkHelp}
            </p>
          </div>
          <SecureCalendarInput />
        </div>

        <!-- 3. Class Colors -->
        <div class="setting-group" style="margin-top: var(--spacing-lg);">
          <h3 class="group-title">{$t.settings.classColors}</h3>
          {#if $activeClasses.length === 0}
            <p class="section-desc" style="opacity: 0.7;">
              {$t.settings.noActiveClasses}
            </p>
          {:else}
            <div class="class-colors-list">
              {#each $activeClasses as cls}
                <div class="setting-row" style="position: relative;">
                  <div class="class-color-info">
                    <span class="setting-label">{cls.title}</span>
                    {#if cls.id !== cls.title}
                      <span class="class-title-hint">{cls.id}</span>
                    {/if}
                  </div>
                  <div class="class-color-actions">
                    <button
                      class="active-color-swatch"
                      style="background-color: {$classColors[cls.id] ||
                        cls.defaultColor}"
                      data-texture={getTextureForColor($classColors[cls.id] || cls.defaultColor)}
                      on:click={() => toggleColorChooser(cls.id)}
                      aria-label={$t.settings.changeColor}
                    ></button>

                    {#if activeColorChooser === cls.id}
                      <div
                        class="color-popup-overlay"
                        on:click={() => (activeColorChooser = null)}
                        on:keydown={(e) =>
                          e.key === "Escape" && (activeColorChooser = null)}
                        role="button"
                        tabindex="-1"
                        aria-label={$t.settings.closeColorChooser}
                      ></div>
                      <div class="color-popup">
                        <div class="color-palette">
                          {#each EVENT_COLORS as ec}
                            <button
                              class="palette-swatch"
                              class:selected={($classColors[cls.id] ||
                                cls.defaultColor) === ec.id}
                              style="background-color: {ec.id}"
                              data-texture={ec.texture}
                              on:click={() => selectColor(cls.id, ec.id)}
                              aria-label={$t.settings.selectColor}
                            ></button>
                          {/each}
                        </div>
                      </div>
                    {/if}

                    {#if $classColors[cls.id]}
                      <button
                        class="btn-clear-color"
                        on:click={() => classColors.resetColor(cls.id)}
                        aria-label={$t.settings.resetColor}><i class="ph-bold ph-arrows-clockwise" aria-hidden="true"></i></button
                      >
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </details>
  </section>

  <!-- ── Accessibility ─────────────────────── -->
  <section id="accessibility" class="settings-section a11y-section">
    <details bind:open={a11yOpen}>
      <summary class="section-header section-header--collapsible">
        <span class="section-icon section-icon--accessibility"><IosAccessibilityIcon /></span>
        <div>
          <h2>{$t.settings.a11yTitle}</h2>
          <p class="section-desc">{$t.settings.a11yDesc}</p>
        </div>
        <span class="chevron" aria-hidden="true">›</span>
      </summary>

      <div class="a11y-body">
        <div class="setting-row toggle-row">
          <div class="toggle-info">
            <span class="setting-label"><i class="ph-bold ph-wind" style="margin-right: 8px;"></i>{$t.settings.reduceMotion}</span>
            <span class="toggle-desc">{$t.settings.reduceMotionDesc}</span>
          </div>
          <button
            class="toggle"
            class:on={$accessibility.reduceMotion}
            role="switch"
            aria-checked={$accessibility.reduceMotion}
            aria-label={$t.settings.reduceMotion}
            on:click={() => accessibility.toggle("reduceMotion")}
            ><span class="toggle-knob"></span></button
          >
        </div>
        <div class="setting-row toggle-row">
          <div class="toggle-info">
            <span class="setting-label"><i class="ph-bold ph-eye" style="margin-right: 8px;"></i>{$t.settings.highContrast}</span>
            <span class="toggle-desc">{$t.settings.highContrastDesc}</span>
          </div>
          <button
            class="toggle"
            class:on={$accessibility.highContrast}
            role="switch"
            aria-checked={$accessibility.highContrast}
            aria-label={$t.settings.highContrast}
            on:click={() => accessibility.toggle("highContrast")}
            ><span class="toggle-knob"></span></button
          >
        </div>
        <div class="setting-row toggle-row">
          <div class="toggle-info">
            <span class="setting-label"><i class="ph-bold ph-text-aa" style="margin-right: 8px;"></i>{$t.settings.largeText}</span>
            <span class="toggle-desc">{$t.settings.largeTextDesc}</span>
          </div>
          <button
            class="toggle"
            class:on={$accessibility.largeText}
            role="switch"
            aria-checked={$accessibility.largeText}
            aria-label={$t.settings.largeText}
            on:click={() => accessibility.toggle("largeText")}
            ><span class="toggle-knob"></span></button
          >
        </div>
        <div class="setting-row toggle-row">
          <div class="toggle-info">
            <span class="setting-label"><i class="ph-bold ph-target" style="margin-right: 8px;"></i>{$t.settings.focusVisible}</span>
            <span class="toggle-desc">{$t.settings.focusVisibleDesc}</span>
          </div>
          <button
            class="toggle"
            class:on={$accessibility.focusVisible}
            role="switch"
            aria-checked={$accessibility.focusVisible}
            aria-label={$t.settings.focusVisible}
            on:click={() => accessibility.toggle("focusVisible")}
            ><span class="toggle-knob"></span></button
          >
        </div>
        <div class="setting-row toggle-row">
          <div class="toggle-info">
            <span class="setting-label"><i class="ph-bold ph-speaker-high" style="margin-right: 8px;"></i>{$t.settings.screenReader}</span>
            <span class="toggle-desc">{$t.settings.screenReaderDesc}</span>
          </div>
          <button
            class="toggle"
            class:on={$accessibility.screenReaderHints}
            role="switch"
            aria-checked={$accessibility.screenReaderHints}
            aria-label={$t.settings.screenReader}
            on:click={() => accessibility.toggle("screenReaderHints")}
            ><span class="toggle-knob"></span></button
          >
        </div>
        <div class="setting-row toggle-row">
          <div class="toggle-info">
            <span class="setting-label"><i class="ph-bold ph-grid-four" style="margin-right: 8px;"></i>{$t.settings.assistiveTextures}</span>
            <span class="toggle-desc">{$t.settings.assistiveTexturesDesc}</span>
          </div>
          <button
            class="toggle"
            class:on={$accessibility.assistivePatterns}
            role="switch"
            aria-checked={$accessibility.assistivePatterns}
            aria-label={$t.settings.assistiveTextures}
            on:click={() => accessibility.toggle("assistivePatterns")}
            ><span class="toggle-knob"></span></button
          >
        </div>
      </div>
    </details>
  </section>

  <!-- ── Reset ─────────────────────────────── -->
  <section id="danger-zone" class="settings-section danger-section">
    <details bind:open={dangerOpen}>
      <summary class="section-header section-header--collapsible">
        <span class="section-icon"><i class="ph-bold ph-trash"></i></span>
        <div>
          <h2>{$t.settings.resetTitle}</h2>
          <p class="section-desc">{$t.settings.resetDesc}</p>
        </div>
        <span class="chevron" aria-hidden="true">›</span>
      </summary>

      <div class="a11y-body" style="padding-top: var(--spacing-md);">
        {#if showResetConfirm}
          <div class="confirm-box">
            <p>{$t.settings.resetConfirm}</p>
            <div class="confirm-buttons">
              <button class="btn-danger" on:click={handleReset}
                >{$t.settings.resetYes}</button
              >
              <button
                class="btn-cancel"
                on:click={() => (showResetConfirm = false)}
                >{$t.settings.resetCancel}</button
              >
            </div>
          </div>
        {:else}
          <button class="btn-reset" on:click={() => (showResetConfirm = true)}
            >{$t.settings.resetButton}</button
          >
        {/if}
      </div>
    </details>
  </section>

  <div class="update-card">
    <div class="update-info">
      <span class="update-version">v{APP_VERSION}</span>
      <span class="update-desc">{$t.settings.builtWith}</span>
    </div>
    <button
      class="btn-update"
      class:updating={updateStatus === "updating"}
      on:click={handleUpdate}
      disabled={updateStatus === "updating"}
    >
      {#if updateStatus === "updating"}
        <span class="update-spinner"></span> {$t.settings.updating}
      {:else}
        <i class="ph-bold ph-arrows-clockwise" aria-hidden="true"></i>
        {$t.settings.updateApp}
      {/if}
    </button>
  </div>

  <footer class="mobile-footer page-footer-safe">
    <p>{$t.settings.unofficial}</p>
    <a
      href="https://github.com/ettefagh/campusweb"
      target="_blank"
      rel="noopener noreferrer">GitHub</a
    >
  </footer>
  </div>
</div>

<style>
  .settings-page {
    max-width: 1200px;
    margin: 0 auto;
    padding-bottom: calc(var(--spacing-xl) * 2.5);
  }

  .settings-content {
    max-width: 680px;
    margin: 0 auto;
  }

  .settings-page > *:not(.page-header) {
    animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  }



  /* ── Sections ── */
  .settings-section {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    box-shadow: var(--shadow-sm);
  }

  .section-header {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }
  .section-icon {
    font-size: 1.6rem;
    line-height: 1;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .section-icon--accessibility {
    color: #2FA4D7;
  }
  h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 2px;
  }
  .section-title-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 2px;
  }
  .section-title-row h2 {
    margin: 0;
  }
  .privacy-badge {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 3px 8px;
    border: 1px solid rgba(22, 163, 74, 0.22);
    border-radius: 999px;
    background: rgba(22, 163, 74, 0.08);
    color: #15803d;
    font-size: 0.68rem;
    font-weight: 800;
    line-height: 1;
    letter-spacing: 0.01em;
    text-transform: uppercase;
  }
  .privacy-badge.active {
    border-color: rgba(212, 68, 7, 0.22);
    background: rgba(212, 68, 7, 0.1);
    color: var(--primary-color);
  }
  .section-desc {
    font-size: 0.82rem;
    color: var(--text-color-secondary);
    margin: 0;
    line-height: 1.4;
  }

  /* ── Setting rows ── */
  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) 0;
    border-top: 1px solid var(--border-color);
  }
  .setting-label {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-color);
    flex-shrink: 0;
  }
  .setting-select {
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-color);
    font-size: 0.9rem;
    padding: 8px 12px;
    width: 100%;
    max-width: 320px;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 32px;
  }
  .setting-select--inline {
    max-width: 160px;
  }

  /* ── Segmented control ── */
  .segmented-control {
    display: flex;
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 4px;
    gap: 4px;
  }
  .segment {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 8px;
    border: none;
    border-radius: calc(var(--radius-lg) - 4px);
    background: transparent;
    color: var(--text-color-secondary);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .segment.active {
    background: var(--primary-color);
    color: white;
    font-weight: 700;
    box-shadow: var(--shadow-sm);
  }
  .segment-flag {
    font-size: 1.2rem;
  }

  /* ── Theme picker ── */
  .theme-picker {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-xs);
  }
  .theme-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: var(--spacing-sm) var(--spacing-xs);
    background: var(--bg-color);
    border: 2px solid var(--border-color);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-color);
    font-size: 0.8rem;
    font-weight: 500;
  }
  .theme-icon {
    font-size: 1.25rem;
  }
  .theme-card:hover {
    border-color: var(--primary-color);
  }
  .theme-card.active {
    border-color: var(--primary-color);
    background: rgba(212, 68, 7, 0.06);
    color: var(--primary-color);
    font-weight: 700;
  }

  /* ── In-line Chip Toggle Button ── */
  .chip-toggle-btn {
    background: rgba(0, 0, 0, 0.04);
    border: 1px solid var(--border-color);
    color: var(--primary-color);
    font-size: 0.8rem;
    font-weight: 700;
    padding: 5px 12px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-right: var(--spacing-xs);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .chip-toggle-btn:hover {
    background: rgba(212, 68, 7, 0.06);
    border-color: var(--primary-color);
    transform: scale(1.03);
  }

  @media (prefers-color-scheme: dark) {
    .chip-toggle-btn {
      background: rgba(255, 255, 255, 0.04);
    }
  }

  /* ── Segment Picker ── */
  .segment-control {
    display: flex;
    background: rgba(0, 0, 0, 0.04);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 3px;
    gap: 2px;
    flex-shrink: 0;
  }

  .segment-btn {
    background: none;
    border: none;
    padding: 6px var(--spacing-md);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    border-radius: calc(var(--radius-md) - 2px);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .segment-btn:hover {
    color: var(--text-color);
  }

  .segment-btn.active {
    background: var(--card-bg, #fff);
    color: var(--primary-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  @media (prefers-color-scheme: dark) {
    .segment-control {
      background: rgba(255, 255, 255, 0.04);
    }
    .segment-btn.active {
      background: rgba(255, 255, 255, 0.1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    }
  }

  /* ── Toggle switch ── */
  .toggle-row {
    align-items: center;
  }
  .toggle-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }
  .toggle-desc {
    font-size: 0.78rem;
    color: var(--text-color-secondary);
    line-height: 1.4;
  }

  .toggle {
    width: 56px;
    height: 30px;
    border-radius: 15px;
    background: var(--border-color);
    border: none;
    padding: 3px;
    cursor: pointer;
    transition: all 0.25s;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }

  /* Accessibility Textures for Toggle - Only visible when enabled */
  :global(.a11y-assistive-patterns) .toggle::before {
    content: "✕";
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.7rem;
    font-weight: 800;
    color: var(--text-color-secondary);
    opacity: 0.5;
    transition: opacity 0.2s;
  }

  .toggle.on {
    background: var(--primary-color);
  }

  :global(.a11y-assistive-patterns) .toggle.on {
    background-image: radial-gradient(
      rgba(255, 255, 255, 0.2) 15%,
      transparent 15%
    );
    background-size: 6px 6px;
  }

  :global(.a11y-assistive-patterns) .toggle.on::before {
    content: "✓";
    left: 10px;
    right: auto;
    color: white;
    opacity: 0.9;
  }

  .toggle-knob {
    display: block;
    width: 24px;
    height: 24px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform: translateX(0);
    z-index: 2;
    position: relative;
  }

  .toggle.on .toggle-knob {
    transform: translateX(26px);
  }

  /* ── Danger section ── */
  .danger-section {
    border-color: rgba(239, 68, 68, 0.2);
  }
  .btn-reset {
    width: 100%;
    padding: var(--spacing-md);
    border: 1.5px dashed rgba(239, 68, 68, 0.5);
    border-radius: var(--radius-md);
    background: transparent;
    color: #ef4444;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-reset:hover {
    background: rgba(239, 68, 68, 0.06);
  }
  .secondary-action-btn {
    margin-top: var(--spacing-md);
    padding: 10px 14px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--bg-color);
    color: var(--text-color);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }
  .secondary-action-btn:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .confirm-box {
    padding: var(--spacing-md);
    background: rgba(239, 68, 68, 0.06);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: var(--radius-md);
  }
  .confirm-box p {
    margin: 0 0 var(--spacing-md);
    color: var(--text-color);
    font-size: 0.9rem;
  }
  .confirm-buttons {
    display: flex;
    gap: var(--spacing-sm);
  }
  .btn-danger {
    padding: 10px 20px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-danger:hover {
    background: #dc2626;
  }
  .btn-cancel {
    padding: 10px 20px;
    background: var(--bg-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    cursor: pointer;
  }

  /* ── Update Card ── */
  .update-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
    margin-top: var(--spacing-xl);
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
  }

  .update-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .update-version {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-color);
    letter-spacing: 0.02em;
  }

  .update-desc {
    font-size: 0.78rem;
    color: var(--text-color-secondary);
    opacity: 0.7;
  }

  .btn-update {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      opacity 0.2s ease,
      transform 0.1s ease;
    white-space: nowrap;
  }

  .btn-update:hover:not(:disabled) {
    opacity: 0.85;
    transform: translateY(-1px);
  }

  .btn-update:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .helper-box {
    background: rgba(212, 68, 7, 0.04);
    border: 1px solid rgba(212, 68, 7, 0.15);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm) var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .helper-box p {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.5;
    color: var(--text-color);
  }

  .helper-box a {
    color: var(--primary-color);
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .helper-box a:hover {
    opacity: 0.8;
  }

  .setting-group {
    padding: var(--spacing-md) 0;
    border-top: 1px solid var(--border-color);
  }

  .group-title {
    font-size: 0.9rem;
    font-weight: 700;
    margin: 0 0 var(--spacing-sm);
    color: var(--text-color);
    opacity: 0.9;
  }

  .update-spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 480px) {
    .setting-row {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-sm) 0;
      gap: var(--spacing-sm);
    }
    .setting-label {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-color);
      margin: 0;
      flex: 1;
    }
    .setting-select {
      width: auto;
      min-width: 140px;
      max-width: 60%;
      font-size: 0.88rem;
      padding: 6px 24px 6px 12px;
      background-position: right 8px center;
      background-color: var(--bg-color-alt, rgba(0, 0, 0, 0.03));
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      text-align: left;
    }
    .toggle-row {
      flex-direction: row;
      align-items: center;
    }
    .class-color-actions {
      align-self: flex-start;
    }
  }

  /* ── Class Colors ── */
  .class-colors-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .class-color-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }
  .class-title-hint {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 250px;
  }
  .class-color-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
    position: relative;
  }
  .active-color-swatch {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid var(--border-color);
    cursor: pointer;
    padding: 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: transform 0.1s;
    position: relative;
    overflow: hidden;
  }
  .active-color-swatch:active {
    transform: scale(0.95);
  }
  .color-popup {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    z-index: 100;
  }
  .color-popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 90;
    cursor: default;
  }
  .color-palette {
    display: flex;
    gap: 4px;
    background: var(--bg-color);
    padding: 8px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    flex-wrap: wrap;
    width: 150px;
  }
  .palette-swatch {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    transition:
      transform 0.1s,
      border-color 0.2s;
    position: relative;
    overflow: hidden;
  }
  .palette-swatch:hover {
    transform: scale(1.1);
  }
  .palette-swatch.selected {
    border-color: var(--text-color);
    box-shadow: 0 0 0 1px var(--bg-color) inset;
  }

  /* Swatch Texture Overlays */
  .active-color-swatch::after,
  .palette-swatch::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: 50%;
    opacity: 0.45;
  }

  .active-color-swatch[data-texture="stripes"]::after,
  .palette-swatch[data-texture="stripes"]::after {
    background-image: linear-gradient(
      45deg,
      rgba(255, 255, 255, 1) 20%,
      transparent 20%,
      transparent 50%,
      rgba(255, 255, 255, 1) 50%,
      rgba(255, 255, 255, 1) 70%,
      transparent 70%,
      transparent
    ) !important;
    background-size: 8px 8px !important;
  }

  .active-color-swatch[data-texture="dots"]::after,
  .palette-swatch[data-texture="dots"]::after {
    background-image: radial-gradient(
      rgba(255, 255, 255, 1) 25%,
      transparent 25%
    ) !important;
    background-size: 6px 6px !important;
  }

  .active-color-swatch[data-texture="mesh"]::after,
  .palette-swatch[data-texture="mesh"]::after {
    background-image: linear-gradient(rgba(255, 255, 255, 1) 1.5px, transparent 1.5px),
      linear-gradient(90deg, rgba(255, 255, 255, 1) 1.5px, transparent 1.5px) !important;
    background-size: 6px 6px !important;
  }
  .btn-clear-color {
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    color: var(--text-color-secondary);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-clear-color:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.3);
  }

  /* ── Collapsible a11y section ── */
  .a11y-section details {
    width: 100%;
  }
  .a11y-section details summary {
    list-style: none;
    cursor: pointer;
  }
  .a11y-section details summary::-webkit-details-marker {
    display: none;
  }

  .section-header--collapsible {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    margin-bottom: 0;
    user-select: none;
  }

  .section-header--collapsible .chevron {
    margin-left: auto;
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text-color-secondary);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    transform: rotate(0deg);
    flex-shrink: 0;
    align-self: center;
  }

  details[open] .section-header--collapsible .chevron {
    transform: rotate(90deg);
  }

  details[open] .section-header--collapsible {
    margin-bottom: var(--spacing-lg);
  }

  .a11y-body {
    animation: slideDown 0.25s ease;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ── Homepage Layout Styles ── */
  .sections-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .section-item {
    padding: var(--spacing-md) 0;
  }

  .section-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .section-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .chip-toggle-btn {
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    color: var(--text-color);
    font-size: 0.8rem;
    padding: 4px 12px;
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .chip-toggle-btn:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
    background: rgba(212, 68, 7, 0.05);
  }

  @keyframes reveal {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .mobile-footer {
    padding: var(--spacing-xl) var(--spacing-lg);
    text-align: center;
    border-top: 1px solid var(--border-color);
    margin-top: var(--spacing-xl);
    opacity: 0.6;
    font-size: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }

  .mobile-footer p {
    margin: 0;
  }

  .mobile-footer a {
    color: var(--primary-color);
    text-decoration: none;
    font-weight: 600;
  }

  @media (min-width: 1024px) {
    .mobile-footer {
      margin-bottom: 0;
    }
  }

  /* ── CampusWeb Settings Redesign ───────────────────────────────── */
  .settings-page {
    --settings-navy: #14213d;
    --settings-blue: #2fa4d7;
    --settings-orange: #d44407;
    --settings-orange-hover: #f28c3e;
    --settings-gold: #f7b801;
    --settings-purple: #3d348b;
    --settings-lavender: #7678ed;
    --settings-border: #e5e5e5;
    --settings-surface: #ffffff;
    --settings-cream: #f5f0e6;
    --settings-muted: #3e2c23;
    --settings-shadow: 0 12px 28px rgba(20, 33, 61, 0.08);
    --settings-row-shadow: 0 4px 14px rgba(20, 33, 61, 0.06);

    width: min(calc(100vw - 32px), 460px);
    max-width: 460px;
    margin: 0 auto;
    padding: max(18px, env(safe-area-inset-top)) 18px calc(var(--spacing-xl) * 3);
    color: var(--text-color);
  }

  .settings-page > *:not(.page-header) {
    animation: reveal 0.42s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  }

  .settings-hero {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }

  .settings-hero.narrow {
    margin-bottom: 14px;
  }

  .settings-hero-copy {
    min-width: 0;
  }

  .settings-eyebrow {
    display: block;
    color: var(--settings-orange);
    font-family: "SRH Headline", sans-serif;
    font-size: 1.05rem;
    font-weight: 900;
    line-height: 1.1;
    margin-bottom: 4px;
  }

  .settings-hero h1 {
    margin: 0;
    color: var(--text-color);
    font-family: "SRH Headline", sans-serif;
    font-size: clamp(1.85rem, 7vw, 2.1rem);
    font-weight: 900;
    line-height: 0.98;
    letter-spacing: 0;
  }

  .settings-hero p {
    margin: 8px 0 0;
    color: var(--text-color-secondary);
    font-size: 0.98rem;
    font-weight: 650;
    line-height: 1.35;
  }

  .settings-profile-icon {
    position: relative;
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    color: var(--text-color-secondary);
    background: var(--settings-surface);
    border: 1px solid var(--settings-border);
    border-radius: 50%;
    box-shadow: 0 8px 18px rgba(20, 33, 61, 0.08);
    font-size: 1.55rem;
  }

  .settings-profile-icon span {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--settings-orange);
    border: 2px solid var(--settings-surface);
  }

  .settings-status-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 14px;
  }

  .status-tile {
    min-width: 0;
    min-height: 78px;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 12px;
    color: var(--text-color);
    background: var(--settings-surface);
    border: 1px solid var(--settings-border);
    border-radius: 16px;
    box-shadow: var(--settings-row-shadow);
    text-decoration: none;
  }

  .status-tile:hover,
  .status-tile:focus-visible {
    border-color: var(--settings-orange-hover);
    outline: none;
  }

  .status-icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    color: #ffffff;
    border-radius: 13px;
    font-size: 1.3rem;
  }

  .status-icon :global(.ios-accessibility-icon) {
    width: 27px;
    height: 27px;
    color: #ffffff;
  }

  .status-icon--navy {
    background: var(--settings-navy);
  }

  .status-icon--blue {
    background: var(--settings-blue);
  }

  .status-icon--gold {
    background: var(--settings-gold);
  }

  .status-icon--purple {
    background: var(--settings-purple);
  }

  .status-copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .status-label {
    color: var(--text-color-secondary);
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1.1;
  }

  .status-copy strong {
    color: var(--text-color);
    font-size: 0.92rem;
    font-weight: 900;
    line-height: 1.12;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: capitalize;
    white-space: nowrap;
  }

  .settings-jump-nav {
    position: sticky;
    top: max(0px, env(safe-area-inset-top));
    z-index: 20;
    display: flex;
    gap: 8px;
    margin: 0 -18px 18px;
    padding: 7px 18px 10px;
    overflow-x: auto;
    background: rgba(255, 255, 255, 0.9);
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .settings-jump-nav::-webkit-scrollbar {
    display: none;
  }

  .settings-jump-nav a {
    min-height: 38px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    flex: 0 0 auto;
    padding: 0 13px;
    color: var(--text-color-secondary);
    background: var(--settings-surface);
    border: 1px solid var(--settings-border);
    border-radius: 999px;
    box-shadow: 0 4px 12px rgba(20, 33, 61, 0.05);
    font-size: 0.82rem;
    font-weight: 850;
    text-decoration: none;
    white-space: nowrap;
  }

  .settings-jump-nav a:hover,
  .settings-jump-nav a:focus-visible {
    color: var(--settings-orange);
    background: #fff8ec;
    border-color: var(--settings-orange-hover);
    outline: none;
  }

  .settings-jump-nav i,
  .settings-jump-nav :global(.ios-accessibility-icon) {
    width: 18px;
    height: 18px;
    color: var(--settings-orange);
    font-size: 1rem;
  }

  .settings-content {
    max-width: none;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .settings-section,
  .update-card {
    margin: 0;
    padding: 0;
    background: var(--settings-surface);
    border: 1px solid var(--settings-border);
    border-radius: 16px;
    box-shadow: var(--settings-shadow);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    overflow: visible;
  }

  .settings-section {
    scroll-margin-top: 88px;
  }

  .danger-section {
    border-color: rgba(239, 68, 68, 0.22);
  }

  .section-header,
  .section-header--collapsible {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 0;
    padding: 18px 20px;
    user-select: none;
  }

  details .section-header--collapsible {
    cursor: pointer;
    list-style: none;
  }

  details .section-header--collapsible::-webkit-details-marker {
    display: none;
  }

  details[open] .section-header--collapsible {
    margin-bottom: 0;
    border-bottom: 1px solid rgba(7, 19, 47, 0.08);
  }

  .section-header > div,
  .section-header--collapsible > div {
    min-width: 0;
    flex: 1;
  }

  .section-icon {
    width: 50px;
    height: 50px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    margin-top: 0;
    color: #ffffff;
    background: var(--settings-orange);
    border-radius: 13px;
    font-size: 1.5rem;
    line-height: 1;
    box-shadow: 0 9px 18px rgba(212, 68, 7, 0.18);
  }

  .settings-section:nth-of-type(1) .section-icon {
    background: var(--settings-navy);
  }

  .settings-section:nth-of-type(2) .section-icon,
  .settings-section:nth-of-type(8) .section-icon {
    background: var(--settings-blue);
  }

  .settings-section:nth-of-type(3) .section-icon,
  .settings-section:nth-of-type(5) .section-icon {
    background: var(--settings-purple);
  }

  .settings-section:nth-of-type(4) .section-icon {
    background: var(--settings-gold);
  }

  .danger-section .section-icon {
    background: #ef4444;
  }

  .section-icon--accessibility {
    color: #ffffff;
    background: var(--settings-blue);
  }

  .section-icon :global(.ios-accessibility-icon) {
    width: 31px;
    height: 31px;
    color: #ffffff;
  }

  h2 {
    margin: 0 0 4px;
    color: var(--text-color);
    font-size: 1.08rem;
    font-weight: 900;
    line-height: 1.08;
    letter-spacing: 0;
  }

  .section-desc {
    color: var(--text-color-secondary);
    font-size: 0.86rem;
    font-weight: 650;
    line-height: 1.32;
  }

  .section-title-row {
    gap: 8px;
  }

  .privacy-badge {
    min-height: 22px;
    padding: 3px 8px;
    color: #15803d;
    background: #ecfdf3;
    border-color: #bbf7d0;
    font-size: 0.64rem;
    letter-spacing: 0;
  }

  .privacy-badge.active {
    color: var(--settings-orange);
    background: #fff8ec;
    border-color: #f4dfc3;
  }

  .chevron {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    margin-left: auto;
    color: var(--text-color-secondary);
    background: #f8fafc;
    border: 1px solid var(--settings-border);
    border-radius: 50%;
    font-size: 1.1rem;
    line-height: 1;
  }

  .a11y-body {
    padding: 16px 20px 20px !important;
    animation: slideDown 0.24s ease;
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    min-height: 66px;
    padding: 12px 0;
    border-top: 1px solid rgba(7, 19, 47, 0.08);
  }

  .section-header + .setting-row,
  .a11y-body > .setting-row:first-child {
    border-top: none;
  }

  .setting-label {
    color: var(--text-color);
    font-size: 0.96rem;
    font-weight: 850;
    line-height: 1.18;
  }

  .setting-info,
  .toggle-info,
  .section-info,
  .class-color-info {
    min-width: 0;
  }

  .toggle-desc,
  .setting-desc,
  .class-title-hint {
    color: var(--text-color-secondary);
    font-size: 0.8rem;
    font-weight: 650;
    line-height: 1.3;
  }

  .setting-select {
    min-height: 44px;
    max-width: 58%;
    color: var(--text-color);
    background-color: #f8fafc;
    border: 1px solid var(--settings-border);
    border-radius: 13px;
    font-size: 0.88rem;
    font-weight: 750;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  }

  .setting-select:focus,
  .segment:focus-visible,
  .segment-btn:focus-visible,
  .theme-card:focus-visible,
  .toggle:focus-visible,
  .chip-toggle-btn:focus-visible,
  .btn-update:focus-visible,
  .secondary-action-btn:focus-visible,
  .btn-reset:focus-visible {
    outline: 3px solid rgba(47, 164, 215, 0.32);
    outline-offset: 2px;
  }

	  .setting-group {
	    padding: 16px 0 0;
	    border-top: 1px solid rgba(7, 19, 47, 0.08);
	  }

	  .setting-group--home-layout,
	  .setting-group--landing {
	    margin-top: var(--spacing-lg);
	  }

	  .section-desc--spaced {
	    margin-bottom: 14px;
	  }

	  .setting-row--control {
	    align-items: flex-start;
	    border-top: none;
	    padding: 0 0 14px;
	  }

	  .setting-row--last {
	    padding-bottom: 0;
	  }

	  .setting-copy {
	    display: flex;
	    flex: 1 1 220px;
	    flex-direction: column;
	    gap: 4px;
	    padding-top: 4px;
	  }

  .group-title {
    margin: 0 0 10px;
    color: var(--text-color);
    font-size: 0.92rem;
    font-weight: 900;
    opacity: 1;
  }

	  .segmented-control,
	  .segment-control {
	    background: #f5f0e6;
	    border: 1px solid var(--settings-border);
	    border-radius: 15px;
	    padding: 4px;
	    display: inline-flex;
	    align-items: stretch;
	    gap: 4px;
	    max-width: 100%;
	  }

	  .segment-control--equal {
	    width: min(100%, 320px);
	    flex: 0 0 auto;
	  }

	  .segment,
	  .segment-btn {
	    display: inline-flex;
	    align-items: center;
	    justify-content: center;
	    gap: 6px;
	    flex: 1 1 0;
	    min-width: 0;
	    min-height: 40px;
	    padding-inline: 12px;
	    font-size: 0.86rem;
	    line-height: 1.1;
    color: var(--text-color-secondary);
    border-radius: 11px;
    font-weight: 800;
  }

  .segment.active,
  .segment-btn.active {
    color: #ffffff;
    background: var(--settings-orange);
    box-shadow: 0 5px 14px rgba(212, 68, 7, 0.2);
  }

  .theme-picker {
    gap: 10px;
  }

  .theme-card {
    min-height: 82px;
    padding: 14px 10px;
    background: #ffffff;
    border: 1px solid var(--settings-border);
    border-radius: 15px;
    font-size: 0.84rem;
    line-height: 1.2;
    font-weight: 800;
    box-shadow: var(--settings-row-shadow);
  }

  .theme-card.active {
    color: var(--settings-orange);
    background: #fff8ec;
    border-color: var(--settings-orange-hover);
  }

  .theme-icon {
    font-size: 1.45rem;
  }

	  .sections-list {
	    gap: 0;
	    overflow: hidden;
	    border: 1px solid var(--settings-border);
	    border-radius: 15px;
	    background: #ffffff;
	  }

	  .section-item {
	    min-height: 62px;
	    padding: 12px 14px;
	    background: #ffffff;
	  }

	  .section-label-icon {
	    width: 22px;
	    margin-right: 8px;
	    color: var(--primary-color);
	    text-align: center;
	    flex: 0 0 auto;
	  }

	  .section-info .setting-label {
	    display: inline-flex;
	    align-items: center;
	    min-width: 0;
	  }

  .section-item + .section-item {
    border-top: 1px solid rgba(7, 19, 47, 0.08);
  }

  .section-actions {
    gap: 8px;
    flex-shrink: 0;
  }

  .chip-toggle-btn {
    min-height: 38px;
    margin-right: 0;
    padding: 0 14px;
    font-size: 0.79rem;
    font-weight: 800;
    line-height: 1.1;
    color: var(--settings-orange);
    background: #fff8ec;
    border: 1px solid #f4dfc3;
    border-radius: 999px;
    box-shadow: none;
  }

  .toggle {
    width: 56px;
    height: 30px;
    background: #d9dce5;
    border: 1px solid rgba(20, 33, 61, 0.08);
  }

  .toggle.on {
    background: var(--settings-orange);
  }

  .toggle-knob {
    box-shadow: 0 2px 6px rgba(20, 33, 61, 0.26);
  }

  .helper-box {
    background: #fff8ec;
    border-color: #f4dfc3;
    border-radius: 15px;
    padding: 12px 14px;
  }

  .helper-box p {
    color: var(--text-color-secondary);
    font-weight: 650;
  }

  .secondary-action-btn,
  .btn-reset,
  .btn-cancel,
  .btn-danger,
  .btn-update {
    min-height: 46px;
    padding-inline: 14px;
    font-size: 0.9rem;
    line-height: 1.15;
    border-radius: 13px;
    font-weight: 800;
  }

  .secondary-action-btn {
    color: var(--text-color);
    background: #f8fafc;
    border: 1px solid var(--settings-border);
  }

  .btn-update {
    gap: 8px;
    background: var(--settings-orange);
    box-shadow: 0 8px 18px rgba(212, 68, 7, 0.18);
  }

  .update-card {
    padding: 16px 18px;
  }

  .update-version {
    font-weight: 900;
  }

  .update-desc {
    opacity: 1;
    font-weight: 650;
  }

  .confirm-box {
    background: #fff1f2;
    border-color: #fecdd3;
    border-radius: 15px;
  }

  .class-colors-list {
    border: 1px solid var(--settings-border);
    border-radius: 15px;
    overflow: visible;
  }

  .class-colors-list .setting-row {
    padding-inline: 14px;
  }

  .active-color-swatch,
  .btn-clear-color {
    width: 34px;
    height: 34px;
  }

  .color-palette {
    width: 176px;
    gap: 7px;
    padding: 10px;
    background: var(--settings-surface);
    border-color: var(--settings-border);
    border-radius: 15px;
    box-shadow: var(--settings-shadow);
  }

  .palette-swatch {
    width: 26px;
    height: 26px;
  }

  .mobile-footer {
    margin: 6px 0 0;
    padding: 22px 18px calc(var(--bottom-nav-height) + 14px);
    color: var(--text-color-secondary);
    border-top: 0;
    opacity: 1;
    font-weight: 650;
  }

	  @media (max-width: 480px) {
	    .setting-row {
	      min-height: 64px;
	      padding: 12px 0;
	      gap: 12px;
	    }

	    .setting-row--control {
	      align-items: stretch;
	      min-height: 0;
	      padding: 0 0 14px;
	    }

	    .setting-copy {
	      flex-basis: auto;
	      padding-top: 0;
	    }

    .setting-label {
      font-size: 0.94rem;
      font-weight: 850;
    }

    .setting-select {
      min-width: 132px;
      max-width: 58%;
      min-height: 42px;
      font-size: 0.84rem;
      border-radius: 12px;
    }

	    .segment-control {
	      width: 100%;
	      max-width: 100%;
	      overflow: visible;
	    }

	    .segment-btn {
	      padding-inline: 12px;
	      white-space: normal;
	      min-width: 0;
	    }
	  }

  @media (max-width: 380px) {
    .settings-page {
      width: min(calc(100vw - 24px), 460px);
      padding-inline: 12px;
    }

    .settings-jump-nav {
      margin-inline: -12px;
      padding-inline: 12px;
    }

    .section-header,
    .section-header--collapsible {
      padding-inline: 16px;
    }

    .a11y-body {
      padding-inline: 16px !important;
    }
  }

  @media (min-width: 768px) {
    .settings-page {
      width: min(calc(100vw - 64px), 1040px);
      max-width: 1040px;
      padding-inline: 0;
      padding-bottom: 56px;
    }

    .settings-status-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .settings-jump-nav {
      margin-inline: 0;
      padding-inline: 0;
      background: transparent;
    }

    .settings-content {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 22px;
      align-items: start;
    }

  }

  :global([data-theme="dark"]) .settings-page {
    --settings-surface: rgba(20, 20, 30, 0.96);
    --settings-border: rgba(255, 255, 255, 0.12);
    --settings-shadow: 0 14px 30px rgba(0, 0, 0, 0.34);
    --settings-row-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
  }

  :global([data-theme="dark"]) .settings-jump-nav {
    background: rgba(13, 13, 20, 0.86);
  }

  :global([data-theme="dark"]) .status-tile,
  :global([data-theme="dark"]) .theme-card,
  :global([data-theme="dark"]) .sections-list,
  :global([data-theme="dark"]) .section-item,
  :global([data-theme="dark"]) .setting-select,
  :global([data-theme="dark"]) .secondary-action-btn,
  :global([data-theme="dark"]) .settings-jump-nav a {
    background: rgba(255, 255, 255, 0.07);
  }

  :global([data-theme="dark"]) .helper-box {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.2);
  }

  :global([data-theme="dark"]) .helper-box p {
    color: #eef3ff;
  }

  :global([data-theme="dark"]) .helper-box a {
    color: #ffd79e;
  }

  :global([data-theme="dark"]) .confirm-box {
    background: rgba(251, 113, 133, 0.14);
    border-color: rgba(251, 113, 133, 0.38);
  }

  :global([data-theme="dark"]) .segmented-control,
  :global([data-theme="dark"]) .segment-control,
  :global([data-theme="dark"]) .chevron {
    background: rgba(255, 255, 255, 0.08);
  }

  :global([data-theme="dark"]) details[open] .section-header--collapsible,
  :global([data-theme="dark"]) .setting-row,
  :global([data-theme="dark"]) .setting-group,
  :global([data-theme="dark"]) .section-item + .section-item {
    border-color: rgba(255, 255, 255, 0.09);
  }

  @media (prefers-color-scheme: dark) {
    :global(html:not([data-theme="light"])) .settings-page {
      --settings-surface: rgba(20, 20, 30, 0.96);
      --settings-border: rgba(255, 255, 255, 0.12);
      --settings-shadow: 0 14px 30px rgba(0, 0, 0, 0.34);
      --settings-row-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
    }

    :global(html:not([data-theme="light"])) .settings-jump-nav {
      background: rgba(13, 13, 20, 0.86);
    }

    :global(html:not([data-theme="light"])) .status-tile,
    :global(html:not([data-theme="light"])) .theme-card,
    :global(html:not([data-theme="light"])) .sections-list,
    :global(html:not([data-theme="light"])) .section-item,
    :global(html:not([data-theme="light"])) .setting-select,
    :global(html:not([data-theme="light"])) .secondary-action-btn,
    :global(html:not([data-theme="light"])) .settings-jump-nav a {
      background: rgba(255, 255, 255, 0.07);
    }

    :global(html:not([data-theme="light"])) .helper-box {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.2);
    }

    :global(html:not([data-theme="light"])) .helper-box p {
      color: #eef3ff;
    }

    :global(html:not([data-theme="light"])) .helper-box a {
      color: #ffd79e;
    }

    :global(html:not([data-theme="light"])) .confirm-box {
      background: rgba(251, 113, 133, 0.14);
      border-color: rgba(251, 113, 133, 0.38);
    }

    :global(html:not([data-theme="light"])) .segmented-control,
    :global(html:not([data-theme="light"])) .segment-control,
    :global(html:not([data-theme="light"])) .chevron {
      background: rgba(255, 255, 255, 0.08);
    }

    :global(html:not([data-theme="light"])) details[open] .section-header--collapsible,
    :global(html:not([data-theme="light"])) .setting-row,
    :global(html:not([data-theme="light"])) .setting-group,
    :global(html:not([data-theme="light"])) .section-item + .section-item {
      border-color: rgba(255, 255, 255, 0.09);
    }
  }
</style>
