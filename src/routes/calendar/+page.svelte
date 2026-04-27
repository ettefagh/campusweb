<script lang="ts">
  import { onMount } from "svelte";
  import Calendar from "@event-calendar/core";
  import TimeGrid from "@event-calendar/time-grid";
  import DayGrid from "@event-calendar/day-grid";
  import List from "@event-calendar/list";
  import "@event-calendar/core/index.css";
  import { loadCalendarEvents } from "$lib/utils/icalParser";
  import type { CalendarEvent } from "$lib/utils/icalParser";
  import { calendarStore, getTextureForColor } from "$lib/stores/calendarStore";
  import SecureCalendarInput from "$lib/components/SecureCalendarInput.svelte";
  import { focusTrap } from "$lib/utils/focusTrap";
  import { browser } from "$app/environment";
  import { settingsStore, activeDepartment } from "$lib/stores/settingsStore";

  import { t } from "$lib/i18n";

  // ─── i18n — driven by global settings store ───────────────────────
  $: locale = $settingsStore.language ?? "en";

  // ─── Responsive Breakpoints ──────────────────────────────────────
  let innerWidth = 1024;
  $: isDesktop = innerWidth >= 1024;
  $: isLandscapeMobile = innerWidth >= 600 && innerWidth < 1024;
  $: isPortraitMobile = innerWidth < 600;

  // ─── Calendar Reference & State ──────────────────────────────────
  let ecComponent: any;
  let isMounted = false;
  let isLoading = true;
  let currentViewLabel = "";
  let currentTitleText = "";

  // State for events
  let staticEvents: CalendarEvent[] = [];
  let currentSubs: any[] = [];

  // Event detail popup state
  let popupEvent: any = null;
  let popupPosition = { x: 0, y: 0 };

  // ─── Feature 1: Interactive Legend Filter ────────────────────────
  let hiddenSources: Set<string> = new Set();

  function toggleSource(sourceId: string) {
    if (hiddenSources.has(sourceId)) {
      hiddenSources.delete(sourceId);
    } else {
      hiddenSources.add(sourceId);
    }
    hiddenSources = hiddenSources; // trigger reactivity
    if (isMounted) {
      options = { ...options, events: getAllEvents() };
    }
  }

  // ─── Feature 3: Calendar Settings Accordion ─────────────────────
  let settingsOpen = false;

  // ─── Feature 5: Import Suggestion ──────────────────────────────
  let dismissedSuggestion = false;

  function handleImportSuggestion() {
    if ($activeDepartment?.icalUrl) {
      calendarStore.addSubscription(
        $activeDepartment.icalUrl,
        $activeDepartment.shortName,
        "var(--event-srh)", // SRH Orange
      );
      dismissedSuggestion = true;
    }
  }

  // ─── Feature 4: Empty State ─────────────────────────────────────
  $: currentEventsCount = options.events?.length ?? 0;

  function getDefaultView(): string {
    const breakpoint = isDesktop
      ? "desktop"
      : isLandscapeMobile
        ? "landscape"
        : "portrait";
    if (browser) {
      const saved = localStorage.getItem(`preferredCalendarView_${breakpoint}`);
      if (saved) return saved;
    }

    if (isPortraitMobile) return "listWeek";
    if (isLandscapeMobile) return "listWeek";
    return "timeGridWeek";
  }

  function getAllEvents(): any[] {
    const subEvents = currentSubs.flatMap((s) => s.cachedEvents);
    return [...staticEvents, ...subEvents]
      .filter((evt) => !hiddenSources.has(evt.extendedProps?.calendarId || ""))
      .map((evt) => ({
        id: evt.id,
        title: evt.title,
        start: evt.start,
        end: evt.end,
        allDay: evt.allDay,
        backgroundColor: evt.backgroundColor,
        extendedProps: {
          ...evt.extendedProps,
          texture: getTextureForColor(evt.backgroundColor),
        },
      }));
  }

  // ─── EC Options ──────────────────────────────────────────────────
  let plugins = [TimeGrid, DayGrid, List];

  let options: any = {
    view: getDefaultView(),
    events: [],
    locale: locale,
    firstDay: $settingsStore.weekStartsOn ?? 1,
    nowIndicator: true,
    slotMinTime: "07:00:00",
    slotMaxTime: "22:00:00",
    flexibleSlotTimeLimits: true,
    slotDuration: "00:30:00",
    slotLabelFormat: {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
    eventTimeFormat: {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
    allDaySlot: true,
    headerToolbar: {
      start: "",
      center: "",
      end: "",
    },
    buttonText: {
      today: $t.calendar.today,
      dayGridMonth: $t.calendar.month,
      timeGridWeek: $t.calendar.week,
      timeGridDay: $t.calendar.day,
      listWeek: $t.calendar.list,
      listDay: $t.calendar.list,
      listMonth: $t.calendar.list,
    },
    height: "100%",
    eventContent: (info: any) => {
      const loc = info.event.extendedProps?.shortLocation || "";
      const locHtml = loc ? `<span class="ec-event-loc">📍${loc}</span>` : "";
      const texture = info.event.extendedProps?.texture || "solid";
      const color = info.event.backgroundColor || "var(--primary-color)";
      const style = `--event-color: ${color};`;

      // List view: flat layout with title + location tag
      if (info.view?.type?.startsWith("list")) {
        return {
          html: `<div class="ec-event-inner ec-event-inner--list" style="${style}" data-texture="${texture}"><span class="ec-event-title-text">${info.event.title}</span>${locHtml}</div>`,
        };
      }

      // Time grid / day grid: stacked layout
      const timeHtml =
        !info.event.allDay && info.timeText
          ? `<div class="ec-event-time-custom">${info.timeText}</div>`
          : "";
      return {
        html: `<div class="ec-event-inner" style="${style}" data-texture="${texture}">${timeHtml}<div class="ec-event-title-text">${info.event.title}</div>${locHtml}</div>`,
      };
    },
    eventClick: (info: any) => {
      const jsEvent = info.jsEvent;
      jsEvent.stopPropagation(); // prevent window click from closing popup immediately
      popupEvent = info.event;
      popupPosition = {
        x: Math.min(jsEvent.clientX, innerWidth - 280),
        y: Math.min(jsEvent.clientY, window.innerHeight - 200),
      };
    },
    viewDidMount: () => {
      updateToolbarState();
    },
  };

  function updateToolbarState() {
    if (!ecComponent) return;
    try {
      const view = ecComponent.getView();
      if (view) {
        currentTitleText = formatViewTitle(view);
        currentViewLabel = view.type;
      }
    } catch {
      // Component may not be fully initialized yet
    }
  }

  function formatViewTitle(view: any): string {
    if (!view || !view.activeStart) return "";
    const start = new Date(view.activeStart);
    const end = new Date(view.activeEnd);
    // Subtract 1 day from end since EC's activeEnd is exclusive
    end.setDate(end.getDate() - 1);

    const opts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    const yearOpts: Intl.DateTimeFormatOptions = {
      ...opts,
      year: "numeric",
    };

    if (view.type === "dayGridMonth") {
      return start.toLocaleDateString(locale, {
        month: "long",
        year: "numeric",
      });
    }
    if (view.type === "timeGridDay" || view.type === "listDay") {
      return start.toLocaleDateString(locale, {
        weekday: "short",
        ...yearOpts,
      });
    }

    // Multi-day views (week, 3-day, etc.)
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString(locale, opts)} – ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${start.toLocaleDateString(locale, opts)} – ${end.toLocaleDateString(locale, yearOpts)}`;
  }

  // ─── Navigation Functions ────────────────────────────────────────
  function goToToday() {
    if (!ecComponent) return;
    options = { ...options, date: new Date() };
    setTimeout(updateToolbarState, 80);
  }

  function goToPrev() {
    if (!ecComponent) return;
    ecComponent.prev();
    setTimeout(updateToolbarState, 80);
  }

  function goToNext() {
    if (!ecComponent) return;
    ecComponent.next();
    setTimeout(updateToolbarState, 80);
  }

  function switchView(viewName: string) {
    if (!ecComponent) return;
    popupEvent = null;
    options = { ...options, view: viewName };

    if (browser) {
      const breakpoint = isDesktop
        ? "desktop"
        : isLandscapeMobile
          ? "landscape"
          : "portrait";
      localStorage.setItem(`preferredCalendarView_${breakpoint}`, viewName);
    }

    setTimeout(() => {
      updateToolbarState();
      const indicator = document.querySelector(
        ".ec-now-indicator",
      ) as HTMLElement;
      if (indicator) {
        // Find the closest scrollable container to avoid scrolling the whole page
        let parent = indicator.parentElement;
        while (parent && parent !== document.body) {
          const style = window.getComputedStyle(parent);
          if (style.overflowY === "auto" || style.overflowY === "scroll") {
            const parentRect = parent.getBoundingClientRect();
            const indicatorRect = indicator.getBoundingClientRect();
            const relativeTop =
              indicatorRect.top - parentRect.top + parent.scrollTop;

            parent.scrollTo({
              top: relativeTop - parentRect.height / 2,
              behavior: "smooth",
            });
            break;
          }
          parent = parent.parentElement;
        }
      }
    }, 80);
  }

  let popupElement: HTMLElement;

  function handleWindowClick(event: MouseEvent) {
    if (
      popupEvent &&
      popupElement &&
      !popupElement.contains(event.target as Node)
    ) {
      closePopup();
    }
  }

  function closePopup() {
    popupEvent = null;
  }

  // ─── Responsive View Switching ───────────────────────────────────
  let prevBreakpoint = "";
  $: currentBreakpoint = isDesktop
    ? "desktop"
    : isLandscapeMobile
      ? "landscape"
      : "portrait";

  $: if (isMounted && ecComponent && currentBreakpoint !== prevBreakpoint) {
    prevBreakpoint = currentBreakpoint;
    options = { ...options, view: getDefaultView() };
    setTimeout(updateToolbarState, 80);
  }

  $: if (isMounted && ecComponent) {
    options = {
      ...options,
      locale: locale,
      firstDay: $settingsStore.weekStartsOn ?? 1,
      buttonText: {
        today: $t.calendar.today,
        dayGridMonth: $t.calendar.month,
        timeGridWeek: $t.calendar.week,
        timeGridDay: $t.calendar.day,
        listWeek: $t.calendar.list,
        listDay: $t.calendar.list,
        listMonth: $t.calendar.list,
      },
    };
  }

  // ─── Store Subscription ──────────────────────────────────────────
  const unsubscribe = calendarStore.subscribe((subs) => {
    currentSubs = subs;
    if (isMounted) {
      options = { ...options, events: getAllEvents() };
    }
  });

  async function handleRefresh() {
    if (isLoading) return;
    isLoading = true;
    try {
      // Refresh both the centralized store (forcing update) and the local static events
      await Promise.all([
        calendarStore.refreshAll(true),
        (async () => {
          staticEvents = await loadCalendarEvents();
        })(),
      ]);

      if (!isMounted) return;
      options = { ...options, events: getAllEvents() };
      isLoading = false;
      setTimeout(updateToolbarState, 150);
    } catch (error) {
      console.error("Failed to refresh calendar events:", error);
      if (isMounted) isLoading = false;
    }
  }

  // ─── Custom Now Indicator ──────────────────────────────────────────
  function updateCustomNowIndicator() {
    if (!browser || !isMounted) return;
    const now = new Date();
    const hours = now.getHours();
    const inRange = hours >= 7 && hours < 22;

    // Clean up if outside range
    if (!inRange) {
      document.getElementById("custom-now-track")?.remove();
      return;
    }

    const timeStr = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const indicator = document.querySelector(
      ".ec-now-indicator",
    ) as HTMLElement | null;
    if (!indicator) return;

    const topPx = indicator.style.top; // e.g. "234px"

    // ── 1. Full-width tinted track ────────────────────────────────
    // Inject into the scroll body so it lines up with the indicator top
    const body = document.querySelector(".ec-body") as HTMLElement | null;
    if (body) {
      let track = document.getElementById(
        "custom-now-track",
      ) as HTMLElement | null;
      if (!track) {
        track = document.createElement("div");
        track.id = "custom-now-track";
        body.style.position = "relative";
        // Insert BEFORE the first child so it doesn't block events
        body.insertBefore(track, body.firstChild);
      }
      track.style.top = topPx;

      // Calculate width from the left edge to the current indicator
      const bodyRect = body.getBoundingClientRect();
      const indicatorRect = indicator.getBoundingClientRect();
      const widthPx = Math.max(0, indicatorRect.left - bodyRect.left);
      track.style.width = `${widthPx}px`;
    }
  }

  // ─── Lifecycle ───────────────────────────────────────────────────
  onMount(() => {
    isMounted = true;
    prevBreakpoint = currentBreakpoint;

    const init = async () => {
      try {
        calendarStore.refreshAll();
        staticEvents = await loadCalendarEvents();
        if (!isMounted) return;
        options = { ...options, events: getAllEvents() };
        isLoading = false;
        setTimeout(updateToolbarState, 150);
        setTimeout(updateCustomNowIndicator, 300);
      } catch (error) {
        console.error("Failed to load calendar events:", error);
        if (isMounted) isLoading = false;
      }
    };

    init();

    const nowInterval = setInterval(updateCustomNowIndicator, 60000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(nowInterval);
    };
  });
</script>

<svelte:head>
  <title>Calendar - SRH Campus Hub</title>
</svelte:head>

<svelte:window bind:innerWidth on:click={handleWindowClick} />

<div class="calendar-page">
  <header class="page-header">
    <div class="header-main">
      <h1>📅 {$t.calendar.title || "Calendar"}</h1>
      <button
        class="refresh-btn"
        on:click={handleRefresh}
        aria-label={$t.calendar.refresh}
        title={$t.calendar.refresh}
      >
        <span class:spinning={isLoading}>🔄</span>
      </button>
    </div>
    <p class="subtitle">
      {$t.calendar.subtitle || "University events and your schedule"}
    </p>
  </header>

  <div class="calendar-page-layout">
    <div class="calendar-main">
      <div class="toolbar-center">
        <span class="toolbar-title">{currentTitleText}</span>
      </div>

      {#if isMounted && currentSubs.length === 0 && $activeDepartment?.icalUrl && !dismissedSuggestion}
        <div class="suggestion-banner">
          <div class="suggestion-icon">💡</div>
          <div class="suggestion-content">
            <p class="suggestion-title">{$t.calendar.suggestImport}</p>
            <p class="suggestion-desc">{$t.calendar.suggestImportDesc}</p>
          </div>
          <div class="suggestion-actions">
            <button
              class="suggestion-btn suggestion-btn--primary"
              on:click={handleImportSuggestion}
            >
              Add Now
            </button>
            <button
              class="suggestion-btn suggestion-btn--secondary"
              on:click={() => (dismissedSuggestion = true)}
            >
              Dismiss
            </button>
          </div>
        </div>
      {/if}

      {#if isLoading}
        <div class="loading-state" aria-live="polite" aria-busy="true">
          <div class="loading-spinner"></div>
          <p>Loading calendar events...</p>
        </div>
      {/if}

      <div class="calendar-container" class:loading={isLoading}>
        <Calendar bind:this={ecComponent} {plugins} {options} />

        <!-- Feature 4: Empty State -->
        {#if !isLoading && currentEventsCount === 0}
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <p class="empty-title">No events to show</p>
            <p class="empty-subtitle">
              Try a different date range or add a calendar subscription.
            </p>
          </div>
        {/if}

        <!-- Custom Bottom Toolbar -->
        <div class="calendar-toolbar">
          <div class="toolbar-end">
            <button
              class="view-btn"
              class:active={currentViewLabel === "dayGridMonth"}
              on:click={() => switchView("dayGridMonth")}
              >{$t.calendar.month}</button
            >
            <button
              class="view-btn"
              class:active={currentViewLabel === "timeGridWeek"}
              on:click={() => switchView("timeGridWeek")}
              >{$t.calendar.week}</button
            >
            <button
              class="view-btn"
              class:active={currentViewLabel === "timeGridDay"}
              on:click={() => switchView("timeGridDay")}
              >{$t.calendar.day}</button
            >
            <button
              class="view-btn"
              class:active={currentViewLabel === "listWeek"}
              on:click={() => switchView("listWeek")}>{$t.calendar.list}</button
            >
          </div>
          <div class="toolbar-start">
            <button class="nav-btn" on:click={goToPrev} aria-label="Previous"
              >{$t.calendar.prev}</button
            >
            <button class="nav-btn today-btn" on:click={goToToday}
              >{$t.calendar.today}</button
            >
            <button class="nav-btn" on:click={goToNext} aria-label="Next"
              >{$t.calendar.next}</button
            >
          </div>
        </div>
      </div>

      <!-- Feature 3: Calendar Settings Accordion -->
      <section class="settings-card">
        <button
          class="settings-header"
          on:click={() => (settingsOpen = !settingsOpen)}
          aria-expanded={settingsOpen}
        >
          <span>⚙️ Calendar Settings</span>
          <span class="chevron" class:open={settingsOpen}>▾</span>
        </button>
        <div class="settings-body" class:open={settingsOpen}>
          <div class="settings-inner">
            <!-- Interactive Legend -->
            <div class="settings-legend">
              <h4 class="settings-section-title">Legend</h4>
              <div class="calendar-legend">
                <button
                  class="legend-item"
                  class:legend-item--hidden={hiddenSources.has("lecture-free")}
                  on:click={() => toggleSource("lecture-free")}
                >
                  <span
                    class="legend-color"
                    style="background-color: var(--event-lecture-free);"
                  ></span>
                  <span>Lecture-Free Periods</span>
                </button>
                <button
                  class="legend-item"
                  class:legend-item--hidden={hiddenSources.has("exams")}
                  on:click={() => toggleSource("exams")}
                >
                  <span
                    class="legend-color"
                    style="background-color: var(--event-exams);"
                  ></span>
                  <span>Exams</span>
                </button>
                {#each currentSubs as sub}
                  <button
                    class="legend-item"
                    class:legend-item--hidden={hiddenSources.has(sub.id)}
                    on:click={() => toggleSource(sub.id)}
                  >
                    <span
                      class="legend-color"
                      style="background-color: {sub.color};"
                    ></span>
                    <span>{sub.name}</span>
                  </button>
                {/each}
              </div>
            </div>

            <!-- Subscription Management -->
            <div class="settings-subscriptions">
              <h4 class="settings-section-title">Manage Subscriptions</h4>
              <SecureCalendarInput />
            </div>
          </div>
        </div>
      </section>

      <!-- Calendar Quick Links -->
      <section class="quick-links-section">
        <h2 class="section-title">🔗 Quick Links</h2>
        <div class="quick-links-grid">
          <a
            href="https://srh-community.campusweb.cloud/en/mein-studium/mein-stundenplan.php"
            target="_blank"
            rel="noopener noreferrer"
            class="quick-link-card"
          >
            <span class="ql-icon">🗓️</span>
            <span class="ql-title">My Schedule</span>
            <span class="ql-desc">View class timetable</span>
          </a>
          <a
            href="https://srh-community.campusweb.cloud/en/mein-studium/meine-pruefungsanmeldung.php"
            target="_blank"
            rel="noopener noreferrer"
            class="quick-link-card"
          >
            <span class="ql-icon">🎓</span>
            <span class="ql-title">Exam Registration</span>
            <span class="ql-desc">Register for exams</span>
          </a>
          <a
            href="https://www.srh-university.de/en/events/"
            target="_blank"
            rel="noopener noreferrer"
            class="quick-link-card"
          >
            <span class="ql-icon">🎪</span>
            <span class="ql-title">University Events</span>
            <span class="ql-desc">Workshops, fairs & more</span>
          </a>
        </div>
      </section>
    </div>
  </div>
</div>

{#if popupEvent}
  <div
    class="event-popup"
    role="dialog"
    aria-modal="true"
    aria-labelledby="popup-title"
    use:focusTrap
    style="top: {popupPosition.y}px; left: {popupPosition.x}px;"
    bind:this={popupElement}
  >
    <button
      class="popup-close"
      on:click={closePopup}
      aria-label="Close event details">✖</button
    >
    <h3 id="popup-title" class="popup-title">{popupEvent.title}</h3>

    {#if !popupEvent.allDay && popupEvent.start}
      <div class="popup-time">
        {new Date(popupEvent.start).toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        })}
        {#if popupEvent.end}
          - {new Date(popupEvent.end).toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        {/if}
      </div>
      <div class="popup-date">
        {new Date(popupEvent.start).toLocaleDateString(locale, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>
    {:else if popupEvent.allDay}
      <div class="popup-time">All Day</div>
      <div class="popup-date">
        {new Date(popupEvent.start).toLocaleDateString(locale, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>
    {/if}

    {#if popupEvent.extendedProps?.location || popupEvent.extendedProps?.shortLocation}
      <a
        href="https://maps.google.com/?q={encodeURIComponent(
          popupEvent.extendedProps?.location,
        )}"
        target="_blank"
        rel="noopener noreferrer"
        class="popup-location-link"
        aria-label="Open location in Google Maps"
      >
        <div class="popup-location-badge">
          📍 {popupEvent.extendedProps?.shortLocation ||
            popupEvent.extendedProps?.location}
        </div>
        <div class="popup-location">
          {popupEvent.extendedProps?.location}
        </div>
      </a>
    {/if}

    {#if popupEvent.extendedProps?.description}
      <div class="popup-description">
        {popupEvent.extendedProps?.description}
      </div>
    {/if}
  </div>
{/if}

<style>
  .calendar-page {
    padding-bottom: var(--spacing-xl);
    min-height: 100vh;
  }

  .calendar-page-layout {
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: var(--radius-lg);
  }

  [data-theme="dark"] .calendar-page-layout {
    background-color: #12121242; /* Requested hex with transparency */
  }

  /* Suggestion Banner */
  .suggestion-banner {
    background: var(--card-bg);
    border: 1px solid var(--primary-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-md);
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    box-shadow: var(--shadow-md);
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from {
      transform: translateY(-10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .suggestion-icon {
    font-size: 1.5rem;
  }

  .suggestion-content {
    flex: 1;
  }

  .suggestion-title {
    font-weight: 700;
    margin: 0;
    color: var(--primary-color);
  }

  .suggestion-desc {
    font-size: 0.85rem;
    margin: 2px 0 0;
    opacity: 0.8;
  }

  .suggestion-actions {
    display: flex;
    gap: var(--spacing-sm);
  }

  .suggestion-btn {
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .suggestion-btn--primary {
    background: var(--primary-color);
    color: white;
    border: none;
  }

  .suggestion-btn--primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(212, 68, 7, 0.2);
  }

  .suggestion-btn--secondary {
    background: transparent;
    color: var(--text-color);
    border: 1px solid var(--border-color);
  }

  .suggestion-btn--secondary:hover {
    background: var(--border-color);
  }

  @media (max-width: 600px) {
    .suggestion-banner {
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
    }
    .suggestion-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }

  .page-header {
    text-align: center;
    padding: var(--spacing-lg) 0 var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .header-main {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
  }

  h1 {
    margin: 0;
    font-size: 1.75rem;
  }

  .refresh-btn {
    background: var(--bg-color-secondary);
    border: 1px solid var(--border-color);
    color: var(--text-color);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 1.1rem;
    padding: 0;
  }

  .refresh-btn:hover {
    background: var(--border-color);
    transform: scale(1.05);
  }

  .refresh-btn:active {
    transform: scale(0.95);
  }

  .spinning {
    display: inline-block;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .subtitle {
    color: var(--text-color-secondary);
    font-size: 1rem;
  }

  /* ─── Legend (inside Settings) ───────────────────────────────── */
  .calendar-legend {
    display: flex;
    justify-content: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) 0;
    flex-wrap: wrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.875rem;
    color: var(--text-color);
    cursor: pointer;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    background: none;
    transition: all 0.2s ease;
  }

  .legend-item:hover {
    background: rgba(212, 68, 7, 0.06);
    border-color: var(--border-color);
  }

  .legend-item--hidden {
    opacity: 0.35;
  }

  .legend-item--hidden span:last-child {
    text-decoration: line-through;
  }

  .legend-color {
    width: 14px;
    height: 14px;
    border-radius: 4px;
    display: inline-block;
    flex-shrink: 0;
  }

  /* ─── Loading ────────────────────────────────────────────────── */
  .loading-state {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--text-color-secondary, #888);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .calendar-container.loading {
    opacity: 0.4;
    pointer-events: none;
  }

  /* ─── Calendar Container — Liquid Glass ──────────────────────── */
  .calendar-container {
    display: flex;
    flex-direction: column;
    position: relative;
    margin: 0 var(--spacing-sm);
    background: #d0d0d012;
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--glass-shadow-lg);
    height: calc(100vh - 380px);
    min-height: 400px;
    padding-bottom: 70px; /* Space for the absolute toolbar */
    transition: opacity 0.3s ease;
  }

  /* ─── Feature 4: Empty State ─────────────────────────────────── */
  .empty-state {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--spacing-xl);
    animation: emptyFadeIn 0.4s ease;
    pointer-events: none;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: var(--spacing-sm);
    animation: emptyBounce 2s ease infinite;
  }

  .empty-title {
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--text-color);
    margin-bottom: var(--spacing-xs);
  }

  .empty-subtitle {
    font-size: 0.875rem;
    color: var(--text-color-secondary, #888);
    max-width: 280px;
  }

  @keyframes emptyFadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes emptyBounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-6px);
    }
  }

  /* ─── Custom Bottom Toolbar — Liquid Glass ────────────────────── */
  .calendar-toolbar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    margin: 0;
    /* background: var(--glass-bg-light); */
    /* backdrop-filter: var(--glass-blur); */
    -webkit-backdrop-filter: var(--glass-blur);
    border-top: 1px solid rgb(255 255 255 / 20%);
    /* border-radius: var(--radius-md); */
    box-shadow: var(--glass-shadow);
  }

  .toolbar-center {
    text-align: center;
    margin-bottom: var(--spacing-xs);
  }

  .toolbar-end,
  .toolbar-start {
    display: flex;
    border-radius: var(--radius-sm);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--glass-border);
    background: var(--glass-bg-light);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
  }

  .toolbar-end {
    order: 2;
  }

  .toolbar-start {
    order: 3;
    margin-left: auto;
  }

  .toolbar-title {
    font-weight: 600;
    font-size: 1rem;
    color: var(--text-color);
  }

  .nav-btn,
  .view-btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    border: none;
    border-right: 1px solid var(--glass-border);
    border-radius: 0;
    background: transparent;
    color: var(--text-color);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: var(--touch-target-min);
    min-height: var(--touch-target-min);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-btn:last-child,
  .view-btn:last-child {
    border-right: none;
  }

  .nav-btn:hover,
  .view-btn:hover {
    background: rgba(212, 68, 7, 0.1);
  }

  .view-btn.active {
    background: var(--primary-color);
    color: white;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);
  }

  .today-btn {
    font-weight: 600;
    color: var(--primary-color);
  }

  /* ─── Event Popup (Desktop) — Liquid Glass ────────────────────── */
  .event-popup {
    position: fixed;
    z-index: 1000;
    background: var(--glass-bg-strong);
    backdrop-filter: var(--glass-blur-strong);
    -webkit-backdrop-filter: var(--glass-blur-strong);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    box-shadow: var(--glass-shadow-lg);
    min-width: 240px;
    max-width: 320px;
    animation: popupFadeIn 0.15s ease-out;
  }

  @keyframes popupFadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* ─── Feature 2: Mobile Bottom Sheet ──────────────────────────── */
  .bottom-sheet-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 999;
    animation: overlayFadeIn 0.2s ease;
  }

  @keyframes overlayFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .bottom-sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: var(--glass-bg-strong);
    backdrop-filter: var(--glass-blur-strong);
    -webkit-backdrop-filter: var(--glass-blur-strong);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    border-top: 1px solid var(--glass-border);
    padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-xl);
    box-shadow:
      0 -8px 40px rgba(0, 0, 0, 0.22),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    max-height: 70vh;
    overflow-y: auto;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .sheet-handle {
    width: 36px;
    height: 4px;
    background: var(--border-color);
    border-radius: 2px;
    margin: 0 auto var(--spacing-md);
  }

  .popup-close {
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    color: var(--text-color);
    opacity: 0.6;
    min-width: auto;
    min-height: auto;
    padding: 4px;
  }

  .popup-close:hover {
    opacity: 1;
  }

  .popup-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: var(--spacing-xs);
    padding-right: var(--spacing-md);
    color: var(--text-color);
  }

  .popup-location-badge {
    display: inline-block;
    background: rgba(212, 68, 7, 0.1);
    color: var(--primary-color);
    border: 1px solid rgba(212, 68, 7, 0.25);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 0.78rem;
    font-weight: 600;
    margin-bottom: var(--spacing-xs);
    letter-spacing: 0.01em;
  }

  .popup-location {
    font-size: 0.8rem;
    color: var(--text-color-secondary, #888);
    word-break: break-word;
    display: block;
    transition: color 0.2s ease;
  }

  .popup-location-link {
    display: block;
    text-decoration: none;
    margin-bottom: var(--spacing-sm);
    transition: all 0.2s ease;
  }

  .popup-location-link:hover .popup-location-badge {
    background: rgba(212, 68, 7, 0.2);
    border-color: rgba(212, 68, 7, 0.4);
    transform: translateY(-1px);
  }

  .popup-location-link:hover .popup-location {
    color: var(--srh-orange-dark, #d44407);
    text-decoration: underline;
    text-decoration-color: rgba(212, 68, 7, 0.4);
  }

  .popup-time {
    font-size: 0.875rem;
    color: var(--primary-color);
    font-weight: 500;
    margin-bottom: 2px;
  }

  .popup-date {
    font-size: 0.8rem;
    color: var(--text-color-secondary, #888);
  }

  .popup-description {
    margin-top: var(--spacing-sm);
    font-size: 0.85rem;
    color: var(--text-color);
    line-height: 1.4;
    padding-top: var(--spacing-sm);
    border-top: 1px solid var(--border-color);
    max-height: 150px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* ─── Feature 3: Calendar Settings Accordion — Liquid Glass ───── */
  .settings-card {
    margin: var(--spacing-md) var(--spacing-sm) 0;
    background: var(--glass-bg-light);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border-radius: var(--radius-lg);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    overflow: hidden;
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-color);
    font-size: 0.95rem;
    font-weight: 600;
    transition: background 0.2s ease;
  }

  .settings-header:hover {
    background: rgba(212, 68, 7, 0.04);
  }

  .chevron {
    transition: transform 0.3s ease;
    font-size: 1.1rem;
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .settings-body {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .settings-body.open {
    max-height: 800px;
  }

  .settings-inner {
    padding: 0 var(--spacing-md) var(--spacing-md);
    border-top: 1px solid var(--border-color);
  }

  .settings-section-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-color-secondary, #888);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: var(--spacing-md) 0 var(--spacing-xs);
  }

  .settings-legend {
    margin-bottom: var(--spacing-sm);
  }

  .settings-subscriptions {
    border-top: 1px solid var(--border-color);
    padding-top: var(--spacing-xs);
  }

  /* ─── Event Calendar Theme Overrides ──────────────────────────── */
  :global(.ec) {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, sans-serif !important;
    --ec-border-color: var(--border-color) !important;
    --ec-today-bg-color: rgba(212, 68, 7, 0.04) !important;
    --ec-highlight-color: rgba(212, 68, 7, 0.08) !important;
    --ec-now-indicator-color: var(--primary-color) !important;
    --ec-button-bg-color: var(--card-bg) !important;
    --ec-button-border-color: var(--border-color) !important;
    --ec-button-active-bg-color: var(--primary-color) !important;
    --ec-button-active-border-color: var(--primary-color) !important;
    height: 100% !important;
  }

  :global(.ec-toolbar) {
    display: none !important;
  }

  :global(.ec-day-head) {
    color: var(--text-color) !important;
  }

  :global(.ec-today .ec-day-head) {
    color: var(--primary-color) !important;
    font-weight: 700;
  }

  /* Feature 5: Color contrast — semantic colors and textures */
  :global(.ec-event) {
    border-radius: 6px !important;
    font-size: 0.8rem !important;
    background-color: transparent !important;
    border: none !important;
    overflow: visible !important;
    box-shadow: none !important;
  }

  :global(.ec-event-inner) {
    display: flex;
    flex-direction: column;
    gap: 2px;
    height: 100%;
    width: 100%; /* Fixes all-day event stretching */
    overflow: hidden;
    padding: 6px 6px !important;
    border-radius: 6px !important;
    /* Always white base — same as Apple Calendar */
    background-color: #ffffff70 !important;
    border: 1px solid rgba(0, 0, 0, 0.06) !important;
    border-left: 3px solid var(--event-color, var(--primary-color)) !important;
    position: relative;
    z-index: 1;
    transition: transform 0.1s ease;
  }

  /* Light pastel tint on the white base — Apple Calendar style */
  :global(.ec-event-inner::before) {
    content: "";
    position: absolute;
    inset: 0;
    background-color: var(--event-color, var(--primary-color));
    opacity: 0.15;
    z-index: -2;
    border-radius: 6px;
  }

  /* Dark mode: dark translucent base (#000000b3) with subtle color wash */
  :global(html[data-theme="dark"] .ec-event-inner) {
    background-color: #000000b3 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }

  :global(html[data-theme="dark"] .ec-event-inner::before) {
    opacity: 0.25; /* Stronger tint to give the dark base a colored wash */
  }

  :global(.ec-event:hover .ec-event-inner) {
    transform: translateY(-1px);
  }

  :global(.ec-event:hover .ec-event-inner::before) {
    opacity: 0.22;
  }

  :global(html[data-theme="dark"] .ec-event:hover .ec-event-inner::before) {
    opacity: 0.35;
  }

  :global(.ec-event-title-text) {
    font-weight: 600;
    font-size: 0.85rem;
    line-height: 1.3;
    white-space: normal;
    word-break: break-word;
    color: var(--event-color, var(--primary-color)) !important;
    text-shadow: none !important;
  }

  :global(.ec-event-loc),
  :global(.ec-event-time-custom) {
    color: var(--event-color, var(--primary-color)) !important;
    font-weight: 500;
  }

  /* List view overrides */
  :global(.ec-event-inner--list) {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    height: auto;
    padding: 6px 8px !important;
    justify-content: space-between;
  }

  :global(.ec-event-tag) {
    display: none !important;
  }

  /* Assistive Textures - Enabled state */
  :global(.a11y-assistive-patterns .ec-event-inner) {
    border-left-width: 8px !important; /* Thicker bar when enabled */
  }

  @media (max-width: 1023px) {
    :global(.ec-event-inner) {
      border-left: none !important;
    }
  }

  /* Assistive Texture Layer (covers entire card) */
  :global(.a11y-assistive-patterns .ec-event-inner::after) {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    opacity: 0.15;
    pointer-events: none;
  }

  /* Light mode textures (black) */
  :global(
      .a11y-assistive-patterns .ec-event-inner[data-texture="stripes"]::after
    ) {
    background-image: linear-gradient(
      45deg,
      rgba(0, 0, 0, 1) 20%,
      transparent 20%,
      transparent 50%,
      rgba(0, 0, 0, 1) 50%,
      rgba(0, 0, 0, 1) 70%,
      transparent 70%,
      transparent
    ) !important;
    background-size: 15px 15px !important;
  }

  :global(
      .a11y-assistive-patterns .ec-event-inner[data-texture="dots"]::after
    ) {
    background-image: radial-gradient(
      rgba(0, 0, 0, 1) 15%,
      transparent 15%
    ) !important;
    background-size: 9px 9px !important;
  }

  :global(
      .a11y-assistive-patterns .ec-event-inner[data-texture="mesh"]::after
    ) {
    background-image: linear-gradient(rgba(0, 0, 0, 1) 1.5px, transparent 1.5px),
      linear-gradient(90deg, rgba(0, 0, 0, 1) 1.5px, transparent 1.5px) !important;
    background-size: 7.5px 7.5px !important;
  }

  /* Dark mode textures (white) */
  :global([data-theme="dark"] .a11y-assistive-patterns .ec-event-inner::after) {
    opacity: 0.25;
  }

  :global(
      [data-theme="dark"]
        .a11y-assistive-patterns
        .ec-event-inner[data-texture="stripes"]::after
    ) {
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
  }

  :global(
      [data-theme="dark"]
        .a11y-assistive-patterns
        .ec-event-inner[data-texture="dots"]::after
    ) {
    background-image: radial-gradient(
      rgba(255, 255, 255, 1) 15%,
      transparent 15%
    ) !important;
  }

  :global(
      [data-theme="dark"]
        .a11y-assistive-patterns
        .ec-event-inner[data-texture="mesh"]::after
    ) {
    background-image: linear-gradient(
        rgba(255, 255, 255, 1) 1.5px,
        transparent 1.5px
      ),
      linear-gradient(90deg, rgba(255, 255, 255, 1) 1.5px, transparent 1.5px) !important;
  }

  :global(.ec-time-grid .ec-time),
  :global(.ec-time),
  :global(.ec-sidebar-title) {
    font-size: 0.75rem !important;
    color: var(--text-color-secondary, #888) !important;
    font-weight: normal !important;
  }

  /* ─── Custom Now Indicator UI ─────────────────────────────── */

  /* Full-width tinted track — spans the entire calendar body */
  :global(#custom-now-track) {
    position: absolute;
    left: 0;
    transform: translateY(-50%);
    height: 1px;
    background: rgba(255, 59, 48, 0.25);
    z-index: 2;
    pointer-events: none;
  }



  /* Today's column: solid red line (the default ec-now-indicator border) */
  :global(.ec-now-indicator) {
    border-top: 2px solid #ff3b30 !important;
    overflow: visible !important;
    z-index: 3 !important;
  }

  /* Red dot at the left edge of today's column */
  :global(.ec-now-indicator::before) {
    content: "";
    position: absolute;
    background: #ff3b30 !important;
    width: 10px !important;
    height: 10px !important;
    left: 2px !important;
    top: 1px !important;
    border-radius: 50% !important;
    z-index: 5 !important;
    box-shadow: 0 0 0 2px rgba(255, 59, 48, 0.25) !important;
  }

  /* No ::after pseudo needed – the track element handles the full width */
  :global(.ec-now-indicator::after) {
    content: none !important;
  }

  /* Dark Mode */
  @media (prefers-color-scheme: dark) {
    :global(.ec) {
      --ec-bg-color: transparent !important;
      --ec-text-color: var(--text-color) !important;
    }

    :global(.ec-day-head),
    :global(.ec-event-title),
    :global(.ec-event-time) {
      color: var(--text-color) !important;
    }
  }

  /* ─── Responsive ─────────────────────────────────────────────── */
  @media (max-width: 768px) {
    /* Hide location in mobile month view */
    :global(.ec-day-grid .ec-event-loc) {
      display: none !important;
    }

    .calendar-container {
      height: calc(100vh - 420px);
      margin: 0 var(--spacing-xs);
      min-height: 350px;
    }

    .calendar-toolbar {
      margin: 0;
      padding: var(--spacing-xs) var(--spacing-sm);
    }

    .toolbar-title {
      font-size: 0.9rem;
    }

    h1 {
      font-size: 1.5rem;
    }

    .nav-btn,
    .view-btn {
      font-size: 0.8rem;
      padding: var(--spacing-xs);
      min-width: 40px;
    }

    .settings-card {
      margin: var(--spacing-sm) var(--spacing-xs) 0;
    }
  }

  .calendar-page-layout {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  @media (min-width: 1024px) {
    .calendar-main {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .toolbar-end {
      order: 1;
    }
    .toolbar-start {
      order: 3;
    }

    .calendar-container {
      height: calc(100vh - 280px); /* Taller on desktop */
    }

    /* Reset margins since they are now stacked */
    .settings-card {
      margin: var(--spacing-sm) var(--spacing-sm) 0;
    }

    .quick-links-section {
      margin: var(--spacing-md) var(--spacing-sm) 0;
    }

    /* Keep settings open initially on desktop */
    .settings-body {
      max-height: 800px; /* Force open */
    }
    .chevron {
      transform: rotate(180deg); /* Force chevron open */
    }
  }

  /* ─── Quick Links Section ────────────────────────────────────── */
  .quick-links-section {
    margin: var(--spacing-lg) var(--spacing-sm) 0;
  }

  .section-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: var(--spacing-md);
    color: var(--text-color);
  }

  .quick-links-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-sm);
  }

  @media (min-width: 640px) {
    .quick-links-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* ─── Quick Link Cards — Liquid Glass ────────────────────────── */
  .quick-link-card {
    display: flex;
    flex-direction: column;
    padding: var(--spacing-md);
    background: var(--glass-bg-light);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    text-decoration: none;
    color: var(--text-color);
    transition: all 0.22s ease;
    box-shadow: var(--glass-shadow);
    position: relative;
    overflow: hidden;
  }

  .quick-link-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 10%;
    right: 10%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.65),
      transparent
    );
    pointer-events: none;
  }

  .quick-link-card:hover {
    border-color: rgba(212, 68, 7, 0.35);
    transform: translateY(-3px);
    box-shadow: var(--glass-shadow-hover);
    background: var(--glass-bg-strong);
  }

  .ql-icon {
    font-size: 1.6rem;
    margin-bottom: var(--spacing-xs);
  }

  .ql-title {
    font-size: 0.9rem;
    font-weight: 700;
    line-height: 1.3;
    margin-bottom: 2px;
  }

  .ql-desc {
    font-size: 0.75rem;
    color: var(--text-color-secondary, #888);
    line-height: 1.4;
  }

  @media (max-width: 768px) {
    .quick-links-section {
      margin: var(--spacing-md) var(--spacing-xs) 0;
    }
  }
</style>
