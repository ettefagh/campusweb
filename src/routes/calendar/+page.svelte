<script lang="ts">
  import { onMount } from "svelte";
  // @ts-ignore
  import Calendar from "@event-calendar/core";
  import TimeGrid from "@event-calendar/time-grid";
  import DayGrid from "@event-calendar/day-grid";
  import List from "@event-calendar/list";
  import "@event-calendar/core/index.css";
  import type { CalendarEvent } from "$lib/utils/icalParser";
  import {
    getCalendarEvents,
    hasCachedCalendarEvents,
    shouldRefreshSubscriptionsThisSession,
  } from "$lib/stores/calendarCache";
  import {
    calendarStore,
    activeClasses,
    getTextureForColor,
    holidayEvents,
  } from "$lib/stores/calendarStore";
  import { focusTrap } from "$lib/utils/focusTrap";
  import { browser } from "$app/environment";
  import {
    settingsStore,
    activeDepartment,
    activeCampus,
  } from "$lib/stores/settingsStore";
  import { classColors } from "$lib/stores/classColors";

  import { t } from "$lib/i18n";

  import { resolveLocationToRoom } from "$lib/utils/locationToRoomId";
  import { interactiveMapEnabled } from "$lib/config/features";

  // ─── Internationalization ──────────────────────────────────────────
  $: locale = $settingsStore.language ?? "en";

  // ─── Responsive Layout Breakpoints ─────────────────────────────────
  let innerWidth = 1024;
  $: isDesktop = innerWidth >= 1024;
  $: isLandscapeMobile = innerWidth >= 600 && innerWidth < 1024;
  $: isPortraitMobile = innerWidth < 600;

  // ─── Calendar Instance & UI State ─────────────────────────────────
  let ecComponent: any;
  let isMounted = false;
  let isLoading = false;
  let currentViewLabel = "";
  let currentTitleText = "";
  let isTodayInView = true;
  let todayDirection: "left" | "right" | "center" = "center";

  // Event data sources
  let staticEvents: CalendarEvent[] = [];
  let currentSubs: any[] = [];
  let isLoadingProtectedCalendars = false;
  let hasLoadedProtectedCalendars = false;

  // Event detail popup
  let popupEvent: any = null;
  let popupPosition = { x: 0, y: 0 };

  // ─── Interactive Legend Filter ────────────────────────────────────
  // Calendar sources hidden by default to reduce visual clutter on first load
  let hiddenSources: Set<string> = new Set([
    "modules",
    "welcome-week",
    "semester-dates",
  ]);

  function toggleSource(sourceId: string) {
    if (hiddenSources.has(sourceId)) {
      hiddenSources.delete(sourceId);
    } else {
      hiddenSources.add(sourceId);
    }
    hiddenSources = hiddenSources; // Reassign to trigger Svelte reactivity
    if (isMounted) {
      options = { ...options, events: getAllEvents() };
    }
  }

  // ─── Department Calendar Import Suggestion ────────────────────────
  let dismissedSuggestion = false;
  let dismissedSetupNotice = false;
  let dismissedEmptyNotice = false;
  let dismissedProtectedNotice = false;

  function handleImportSuggestion() {
    if ($activeDepartment?.icalUrl) {
      calendarStore.addSubscription(
        $activeDepartment.icalUrl,
        $activeDepartment.shortName,
        "var(--event-srh)",
      );
      dismissedSuggestion = true;
    }
  }

  // ─── Empty State Detection ─────────────────────────────────────────
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

    // Portrait mobile defaults to Day View to fit narrow mobile layouts naturally
    if (isPortraitMobile) return "timeGridDay";
    if (isLandscapeMobile) return "dayGridMonth";
    return "dayGridMonth";
  }

  function getAllEvents(): any[] {
    const subEvents = currentSubs.flatMap((s) => s.cachedEvents);
    const classColorDefaults = new Map(
      $activeClasses.map((c) => [c.id, c.defaultColor]),
    );

    return [...staticEvents, ...subEvents, ...$holidayEvents]
      .filter((evt) => !hiddenSources.has(evt.extendedProps?.calendarId || ""))
      .map((evt) => {
        const classGroupId = evt.extendedProps?.classGroupId;
        const customColor = classGroupId ? $classColors[classGroupId] : null;
        const autoColor = classGroupId
          ? classColorDefaults.get(classGroupId)
          : null;
        const finalColor = customColor || autoColor || evt.backgroundColor;
        return {
          id: evt.id,
          title: evt.title,
          start: evt.start,
          end: evt.end,
          allDay: evt.allDay,
          backgroundColor: finalColor,
          extendedProps: {
            ...evt.extendedProps,
            texture: getTextureForColor(finalColor),
          },
        };
      });
  }

  let calendarDate = new Date();

  // ─── Event Calendar Configuration ─────────────────────────────────
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

      timeGridDay: {
        dayHeaderContent: (arg: any) => {
          const weekday = arg.date.toLocaleDateString(locale, {
            weekday: "long",
          });
          const day = arg.date.getDate();
          return {
            html: `<div class="custom-header"><span>${weekday}</span><span class="header-day-num">${day}</span></div>`,
          };
        },
      },
    },
    height: "100%",
    eventContent: (info: any) => {
      // Sanitize user-sourced strings to prevent XSS injection
      const esc = (s: string) =>
        s
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      const rawLoc = info.event.extendedProps?.shortLocation || "";
      const loc = esc(rawLoc);
      const hasUrl = !!info.event.extendedProps?.locationUrl;
      const icon = hasUrl ? "🌐 " : "📍";
      const locHtml = loc
        ? `<span class="ec-event-loc">${icon}${loc}</span>`
        : "";
      const texture = info.event.extendedProps?.texture || "solid";
      const color = info.event.backgroundColor || "var(--primary-color)";
      const textColor = color.replace("var(--event-", "var(--event-text-");
      const style = `--event-color: ${esc(color)}; --event-text-color: ${esc(textColor)};`;
      const title = esc(info.event.title || "");

      // List view: horizontal layout with title and location metadata
      if (info.view?.type?.startsWith("list")) {
        const isAllDay = info.event.allDay;
        const formatTime = (d: Date) =>
          d.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });

        let leftPart = "";
        let rightPart = "";

        if (isAllDay) {
          leftPart = `<span class="ec-event-title-text">${title}</span><span class="ec-event-time-sub">All-day</span>`;
          rightPart = `${locHtml}`;
        } else if (info.event.start) {
          const startStr = formatTime(info.event.start);
          const endStr = info.event.end ? formatTime(info.event.end) : "";

          leftPart = `<span class="ec-event-title-text">${title}</span><span class="ec-event-time-sub">${startStr}</span>`;
          rightPart = `${locHtml}${endStr ? `<span class="ec-event-time-sub time-end">${endStr}</span>` : ""}`;
        }

        return {
          html: `<div class="ec-event-inner ec-event-inner--list" style="${style}" data-texture="${texture}"><div class="event-main-info">${leftPart}</div><div class="event-meta-info">${rightPart}</div></div>`,
        };
      }

      // Time grid / day grid: vertical stacked layout
      const timeHtml =
        !info.event.allDay && info.timeText
          ? `<div class="ec-event-time-custom">${esc(info.timeText)}</div>`
          : "";
      return {
        html: `<div class="ec-event-inner" style="${style}" data-texture="${texture}">${timeHtml}<div class="ec-event-title-text">${title}</div>${locHtml}</div>`,
      };
    },
    eventClick: (info: any) => {
      const jsEvent = info.jsEvent;
      jsEvent.stopPropagation(); // Prevent immediate dismiss by the window click handler
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

  function checkTodayPosition() {
    const todayCol = document.querySelector(".ec-today") as HTMLElement;
    const scrollPort = document.querySelector(".ec-main") as HTMLElement;

    // On portrait mobile week view, determine today's direction relative to the visible scroll port
    if (
      scrollPort &&
      todayCol &&
      isPortraitMobile &&
      currentViewLabel === "timeGridWeek"
    ) {
      const portRect = scrollPort.getBoundingClientRect();
      const colRect = todayCol.getBoundingClientRect();

      if (colRect.right < portRect.left + 40) {
        todayDirection = "left";
      } else if (colRect.left > portRect.right - 40) {
        todayDirection = "right";
      } else {
        todayDirection = "center";
      }
      return;
    }

    const today = new Date();
    const cal = new Date(calendarDate);

    const currentYear = cal.getFullYear();
    const currentMonth = cal.getMonth();

    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();

    if (currentViewLabel === "dayGridMonth") {
      if (currentYear === todayYear && currentMonth === todayMonth) {
        todayDirection = "center";
      } else if (cal < today) {
        todayDirection = "right";
      } else {
        todayDirection = "left";
      }
    } else {
      // Multi-day views: compare by day offset from today
      const diffTime = cal.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Tolerance varies by view span: ±3 for week, ±0 for single day
      const tolerance = currentViewLabel === "timeGridWeek" ? 3 : 0;

      if (Math.abs(diffDays) <= tolerance) {
        todayDirection = "center";
      } else if (diffDays < 0) {
        todayDirection = "right";
      } else {
        todayDirection = "left";
      }
    }
  }

  function updateToolbarState() {
    if (!ecComponent) return;
    try {
      const view = ecComponent.getView();
      if (view) {
        currentTitleText = formatViewTitle(view);
        currentViewLabel = view.type;
        calendarDate = new Date(view.currentStart);
        checkTodayPosition();
      }
    } catch {
      // Silently ignore — the calendar component may not be fully initialized yet
    }
  }

  function formatViewTitle(view: any): string {
    if (!view || !view.currentStart) return "";
    const start = new Date(view.currentStart);
    const end = new Date(view.currentEnd);
    // EC uses exclusive end dates — subtract one day for display purposes
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
    // Single-day views: show full date with weekday
    if (view.type === "timeGridDay" || view.type === "listDay") {
      return start.toLocaleDateString(locale, {
        weekday: "short",
        ...yearOpts,
      });
    }

    // Multi-day views (week, 3-day): show date range with month boundary handling
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString(locale, opts)} – ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${start.toLocaleDateString(locale, opts)} – ${end.toLocaleDateString(locale, yearOpts)}`;
  }

  // ─── Calendar Navigation ──────────────────────────────────────────
  function goToToday() {
    if (!ecComponent) return;
    ecComponent.setOption("date", new Date());
    updateToolbarState();

    // Smooth-scroll both axes to center the now-indicator in the viewport
    setTimeout(() => {
      const targetEl = (document.querySelector(".ec-now-indicator") ||
        document.querySelector(".ec-today")) as HTMLElement;
      if (targetEl) {
        let parent = targetEl.parentElement;
        while (parent && parent !== document.body) {
          if (
            parent.classList.contains("ec-body") ||
            parent.classList.contains("ec-main")
          ) {
            const parentRect = parent.getBoundingClientRect();
            const targetRect = targetEl.getBoundingClientRect();
            const relativeTop =
              targetRect.top - parentRect.top + parent.scrollTop;
            parent.scrollTo({
              top: relativeTop - parentRect.height / 2 + targetRect.height / 2,
              behavior: "smooth",
            });
            break;
          }
          parent = parent.parentElement;
        }
      }

      const todayCol = document.querySelector(".ec-today") as HTMLElement;
      const scrollPort = document.querySelector(
        ".calendar-scroll-area",
      ) as HTMLElement;
      if (todayCol && scrollPort) {
        const portRect = scrollPort.getBoundingClientRect();
        const colRect = todayCol.getBoundingClientRect();
        const relativeLeft =
          colRect.left - portRect.left + scrollPort.scrollLeft;
        scrollPort.scrollTo({
          left: relativeLeft - portRect.width / 2 + colRect.width / 2,
          behavior: "smooth",
        });
      }
    }, 120);
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
      const targetEl = (document.querySelector(".ec-now-indicator") ||
        document.querySelector(".ec-today")) as HTMLElement;
      if (targetEl) {
        let parent = targetEl.parentElement;
        while (parent && parent !== document.body) {
          if (
            parent.classList.contains("ec-body") ||
            parent.classList.contains("ec-main")
          ) {
            const parentRect = parent.getBoundingClientRect();
            const targetRect = targetEl.getBoundingClientRect();
            const relativeTop =
              targetRect.top - parentRect.top + parent.scrollTop;
            parent.scrollTo({
              top: relativeTop - parentRect.height / 2 + targetRect.height / 2,
              behavior: "smooth",
            });
            break;
          }
          parent = parent.parentElement;
        }
      }

      const todayCol = document.querySelector(".ec-today") as HTMLElement;
      const scrollPort = document.querySelector(
        ".calendar-scroll-area",
      ) as HTMLElement;
      if (todayCol && scrollPort) {
        const portRect = scrollPort.getBoundingClientRect();
        const colRect = todayCol.getBoundingClientRect();
        const relativeLeft =
          colRect.left - portRect.left + scrollPort.scrollLeft;
        scrollPort.scrollTo({
          left: relativeLeft - portRect.width / 2 + colRect.width / 2,
          behavior: "smooth",
        });
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

  // ─── Responsive View Switching ────────────────────────────────────
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
      dayHeaderFormat: (date: Date) => {
        const weekday = date.toLocaleDateString(locale, { weekday: "short" });
        const day = date.getDate();
        return `${weekday} ${day}`;
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
    };
  }

  // ─── Reactive Store Subscriptions ─────────────────────────────────
  const unsubscribe = calendarStore.subscribe((subs) => {
    currentSubs = subs;
    if (isMounted) {
      options = { ...options, events: getAllEvents() };
    }
  });

  const unsubscribeColors = classColors.subscribe(() => {
    if (isMounted) {
      options = { ...options, events: getAllEvents() };
    }
  });

  const unsubscribeActiveClasses = activeClasses.subscribe(() => {
    if (isMounted) {
      options = { ...options, events: getAllEvents() };
    }
  });

  async function handleRefresh() {
    if (isLoading) return;
    isLoading = true;
    try {
      await Promise.all([
        calendarStore.refreshAll(true),
        (async () => {
          staticEvents = await getCalendarEvents(
            $settingsStore.emailVerified,
            true,
          );
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

  // ─── Component Lifecycle ──────────────────────────────────────────
  onMount(() => {
    isMounted = true;
    prevBreakpoint = currentBreakpoint;

    const init = async () => {
      try {
        isLoading = !hasCachedCalendarEvents($settingsStore.emailVerified);
        if (shouldRefreshSubscriptionsThisSession()) {
          calendarStore.refreshAll();
        }

        getCalendarEvents($settingsStore.emailVerified).then((evts) => {
          if (isMounted) {
            staticEvents = evts;
            options = { ...options, events: getAllEvents() };
            setTimeout(updateToolbarState, 150);
          }
        });
        if (!isMounted) return;
        isLoading = false;
        setTimeout(updateToolbarState, 150);
      } catch (error) {
        console.error("Failed to load calendar events:", error);
        if (isMounted) isLoading = false;
      }
    };

    init();

    const handleResize = () => {
      checkTodayPosition();
    };
    window.addEventListener("resize", handleResize);

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains("ec-main")) {
        checkTodayPosition();
      }
    };
    window.addEventListener("scroll", handleScroll, true);

    const interval = setInterval(() => {
      checkTodayPosition();
    }, 15000);

    return () => {
      isMounted = false;
      unsubscribe();
      unsubscribeColors();
      unsubscribeActiveClasses();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
      clearInterval(interval);
    };
  });

  $: if (
    isMounted &&
    !$settingsStore.emailVerified &&
    staticEvents.length > 0
  ) {
    staticEvents = [];
    hasLoadedProtectedCalendars = false;
    options = { ...options, events: getAllEvents() };
  }

  $: if (
    isMounted &&
    $settingsStore.emailVerified &&
    staticEvents.length === 0 &&
    !isLoadingProtectedCalendars &&
    !hasLoadedProtectedCalendars
  ) {
    isLoadingProtectedCalendars = true;
    getCalendarEvents(true)
      .then((evts) => {
        if (isMounted && $settingsStore.emailVerified) {
          staticEvents = evts;
          hasLoadedProtectedCalendars = true;
          options = { ...options, events: getAllEvents() };
        }
      })
      .finally(() => {
        isLoadingProtectedCalendars = false;
      });
  }
</script>

<svelte:head>
  <title>Calendar - Campusweb Pages</title>
</svelte:head>

<svelte:window bind:innerWidth on:click={handleWindowClick} />

<div class="calendar-page">
  <div class="calendar-page-layout">
    <div class="calendar-main">
      <header class="calendar-header">
        <div class="calendar-title-block">
          <span class="calendar-eyebrow">Plan ahead</span>
          <h1>{$t.calendar.title || "Calendar"}</h1>
          <p class="calendar-subtitle">
            {$t.calendar.subtitle || "University events and your schedule"}
          </p>
        </div>
        <button
          class="refresh-btn"
          on:click={handleRefresh}
          aria-label={$t.calendar.refresh}
          title={$t.calendar.refresh}
        >
          <i
            class="ph-bold ph-arrows-counter-clockwise"
            class:spinning={isLoading}
          ></i>
        </button>
      </header>

      <div class="calendar-period-card" aria-live="polite">
        <span class="period-label">Showing</span>
        <strong class="toolbar-title">
          {currentTitleText || $t.calendar.title || "Calendar"}
        </strong>
      </div>

      {#if (!isMounted || currentSubs.length === 0) && !dismissedSetupNotice}
        <div class="suggestion-banner link-banner">
          <div class="suggestion-icon"><i class="ph-bold ph-calendar"></i></div>
          <div class="suggestion-content">
            <p class="suggestion-title">See your university schedule here</p>
            <p class="suggestion-desc">
              Link your <strong>iCal-Export</strong> feed from the student portal
              to see your classes, exams and deadlines directly in this webapp.
            </p>
          </div>
          <div class="suggestion-actions">
            <a
              href="/settings#calendar-subscriptions"
              class="suggestion-btn suggestion-btn--primary"
            >
              <i class="ph-bold ph-gear" style="margin-right: 6px;"></i> Get Started
            </a>
            {#if $activeDepartment?.icalUrl && !dismissedSuggestion}
              <button
                class="suggestion-btn suggestion-btn--secondary"
                on:click={handleImportSuggestion}
              >
                Import Department Calendar
              </button>
            {/if}
            <button
              class="suggestion-btn suggestion-btn--secondary"
              on:click={() => (dismissedSetupNotice = true)}
            >
              Later
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

      <!-- Empty state banner — shown when no events match the current view -->
      {#if !isLoading && currentEventsCount === 0 && !dismissedEmptyNotice}
        <div class="suggestion-banner">
          <div class="suggestion-icon"><i class="ph-bold ph-tray"></i></div>
          <div class="suggestion-content">
            <p class="suggestion-title">No events to show</p>
            <p class="suggestion-desc">
              Try a different date range or add a calendar subscription.
            </p>
          </div>
          <div class="suggestion-actions">
            <button
              class="suggestion-btn suggestion-btn--secondary"
              on:click={() => (dismissedEmptyNotice = true)}
            >
              Understood
            </button>
          </div>
        </div>
      {/if}

      <div
        class="calendar-container"
        class:loading={isLoading}
        class:view-week={currentViewLabel === "timeGridWeek"}
        class:view-month={currentViewLabel === "dayGridMonth"}
        class:is-landscape={isLandscapeMobile}
      >
        <div class="calendar-scroll-area">
          <Calendar bind:this={ecComponent} {plugins} {options} />
        </div>

        <!-- Calendar Navigation Toolbar -->
        <div class="calendar-toolbar">
          <div class="toolbar-group toolbar-views">
            <button
              class="toolbar-btn"
              class:active={currentViewLabel === "dayGridMonth"}
              on:click={() => switchView("dayGridMonth")}
              >{$t.calendar.month}</button
            >
            <button
              class="toolbar-btn"
              class:active={currentViewLabel === "timeGridWeek"}
              on:click={() => switchView("timeGridWeek")}
              >{$t.calendar.week}</button
            >

            <button
              class="toolbar-btn"
              class:active={currentViewLabel === "timeGridDay"}
              on:click={() => switchView("timeGridDay")}
              >{$t.calendar.day}</button
            >
            <button
              class="toolbar-btn"
              class:active={currentViewLabel === "listWeek"}
              on:click={() => switchView("listWeek")}>{$t.calendar.list}</button
            >
          </div>
          <div class="toolbar-group toolbar-nav">
            <button
              class="toolbar-btn"
              on:click={goToPrev}
              aria-label="Previous"
            >
              <i class="ph-bold ph-caret-left" aria-hidden="true"></i>
            </button>
            <button
              class="toolbar-btn today-btn"
              on:click={goToToday}
              aria-label="Go to Today"
            >
              {#if todayDirection === "left"}
                ← {$t.calendar.today}
              {:else}
                {$t.calendar.today} {todayDirection === "right" ? "→" : ""}
              {/if}
            </button>
            <button class="toolbar-btn" on:click={goToNext} aria-label="Next">
              <i class="ph-bold ph-caret-right" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Calendar Source Legend — toggleable visibility filters -->
      <section class="calendar-legend-section">
        {#if !$settingsStore.emailVerified && !dismissedProtectedNotice}
          <div class="suggestion-banner link-banner calendar-auth-banner">
            <div class="suggestion-icon">
              <i class="ph-bold ph-lock-key"></i>
            </div>
            <div class="suggestion-content">
              <p class="suggestion-title">University calendars are protected</p>
              <p class="suggestion-desc">
                Public holidays remain visible. Verify your SRH email to load
                lecture-free periods, exams, modules, welcome week and semester
                dates.
              </p>
            </div>
            <div class="suggestion-actions">
              <a
                href="/settings#directory-access"
                class="suggestion-btn suggestion-btn--primary"
              >
                Verify SRH Email
              </a>
              <button
                class="suggestion-btn suggestion-btn--secondary"
                on:click={() => (dismissedProtectedNotice = true)}
              >
                Later
              </button>
            </div>
          </div>
        {/if}
        <div class="calendar-legend">
          {#if $settingsStore.emailVerified}
            <button
              class="legend-item"
              class:legend-item--hidden={hiddenSources.has("lecture-free")}
              on:click={() => toggleSource("lecture-free")}
            >
              <span
                class="legend-color"
                style="background-color: var(--event-lecture-free);"
              ></span>
              <span>{$t.calendar.lectureFree}</span>
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
              <span>{$t.calendar.exams}</span>
            </button>
            <button
              class="legend-item"
              class:legend-item--hidden={hiddenSources.has("modules")}
              on:click={() => toggleSource("modules")}
            >
              <span
                class="legend-color"
                style="background-color: var(--event-orange);"
              ></span>
              <span>{$t.calendar.modules}</span>
            </button>
            <button
              class="legend-item"
              class:legend-item--hidden={hiddenSources.has("welcome-week")}
              on:click={() => toggleSource("welcome-week")}
            >
              <span
                class="legend-color"
                style="background-color: var(--event-pink);"
              ></span>
              <span>{$t.calendar.welcomeWeek}</span>
            </button>
            <button
              class="legend-item"
              class:legend-item--hidden={hiddenSources.has("semester-dates")}
              on:click={() => toggleSource("semester-dates")}
            >
              <span
                class="legend-color"
                style="background-color: var(--event-purple);"
              ></span>
              <span>{$t.calendar.semesterDates}</span>
            </button>
          {/if}
          <button
            class="legend-item"
            class:legend-item--hidden={hiddenSources.has("holidays")}
            on:click={() => toggleSource("holidays")}
          >
            <span
              class="legend-color"
              style="background-color: var(--event-purple);"
            ></span>
            <span>
              {$settingsStore.language === "de" ? "Feiertage" : "Holidays"}
              {$activeCampus?.stateCode ? `(${$activeCampus.stateCode})` : ""}
            </span>
          </button>
          {#each currentSubs as sub}
            <button
              class="legend-item"
              class:legend-item--hidden={hiddenSources.has(sub.id)}
              on:click={() => toggleSource(sub.id)}
            >
              <span class="legend-color" style="background-color: {sub.color};"
              ></span>
              <span>{sub.name}</span>
            </button>
          {/each}
        </div>
      </section>

      <!-- Quick Links — external university resources -->
      <section class="quick-links-section">
        <h2 class="section-title">Campus shortcuts</h2>
        <div class="quick-links-grid">
          <a
            href="https://srh-community.campusweb.cloud/en/mein-studium/mein-stundenplan.php"
            target="_blank"
            rel="noopener noreferrer"
            class="quick-link-card"
          >
            <span class="ql-icon ql-icon--blue">
              <i class="ph-fill ph-calendar-dots" aria-hidden="true"></i>
            </span>
            <span class="ql-title">My Schedule</span>
            <span class="ql-desc">View class timetable</span>
          </a>
          <a
            href="https://srh-community.campusweb.cloud/en/mein-studium/meine-pruefungsanmeldung.php"
            target="_blank"
            rel="noopener noreferrer"
            class="quick-link-card"
          >
            <span class="ql-icon ql-icon--yellow">
              <i class="ph-fill ph-graduation-cap" aria-hidden="true"></i>
            </span>
            <span class="ql-title">Exam Registration</span>
            <span class="ql-desc">Register for exams</span>
          </a>
          <a
            href="https://www.srh-university.de/en/events/"
            target="_blank"
            rel="noopener noreferrer"
            class="quick-link-card"
          >
            <span class="ql-icon ql-icon--violet">
              <i class="ph-fill ph-confetti" aria-hidden="true"></i>
            </span>
            <span class="ql-title">University Events</span>
            <span class="ql-desc">Workshops, fairs & more</span>
          </a>
          <a
            href="https://calendarsub.padarhava.workers.dev/"
            target="_blank"
            rel="noopener noreferrer"
            class="quick-link-card"
          >
            <span class="ql-icon ql-icon--orange">
              <i class="ph-fill ph-magic-wand" aria-hidden="true"></i>
            </span>
            <span class="ql-title">Calendar Enhancer</span>
            <span class="ql-desc">Optimize your iCal feed</span>
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

    {#if popupEvent.extendedProps?.locationUrl}
      <div class="popup-online-section">
        <a
          href={popupEvent.extendedProps.locationUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="popup-online-btn"
          aria-label="Join online meeting"
        >
          <i class="ph-bold ph-video-camera" style="font-size: 1.15rem;"></i>
          <span>Join Online Meeting</span>
        </a>
        <div class="popup-location-badge online">
          {popupEvent.extendedProps?.shortLocation || "Online"}
        </div>
        {#if popupEvent.extendedProps?.location && !popupEvent.extendedProps.location.startsWith("http")}
          <div class="popup-location">
            {popupEvent.extendedProps?.location}
          </div>
        {/if}
      </div>
    {:else if popupEvent.extendedProps?.location || popupEvent.extendedProps?.shortLocation}
      {@const resolvedRoom = resolveLocationToRoom(popupEvent.extendedProps?.shortLocation || popupEvent.extendedProps?.location)}
      <div class="popup-location-section">
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
            {popupEvent.extendedProps?.shortLocation ||
              popupEvent.extendedProps?.location}
          </div>
          <div class="popup-location">
            {popupEvent.extendedProps?.location}
          </div>
        </a>
        {#if resolvedRoom}
          {#if interactiveMapEnabled}
            <a
              href="/explore/map?to={resolvedRoom.id}"
              class="popup-directions-btn"
              aria-label="Get indoor navigation directions to {resolvedRoom.name}"
            >
              <i class="ph-bold ph-navigation-arrow"></i>
              <span>Get Directions</span>
              <span class="directions-room-badge">{resolvedRoom.id}</span>
            </a>
          {:else}
            <div
              class="popup-directions-btn disabled"
              aria-disabled="true"
              title="Indoor navigation is temporarily unavailable"
            >
              <i class="ph-bold ph-navigation-arrow"></i>
              <span>Directions paused</span>
              <span class="directions-room-badge">{resolvedRoom.id}</span>
            </div>
          {/if}
        {/if}
      </div>
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
    padding: calc(env(safe-area-inset-top) + var(--spacing-sm)) 0
      calc(var(--spacing-xl) * 2.5);
    min-height: 100vh;
  }

  .calendar-page > * {
    animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  }

  .calendar-page-layout {
    border-radius: var(--radius-lg);
  }

  .calendar-main {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .calendar-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-xs) 0;
  }

  .calendar-title-block {
    min-width: 0;
  }

  .calendar-eyebrow {
    display: block;
    color: var(--primary-color);
    font-size: 1rem;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 3px;
  }

  h1 {
    color: var(--text-color);
    font-size: clamp(1.9rem, 5vw, 2.4rem);
    line-height: 1;
    margin: 0;
    letter-spacing: 0;
  }

  .calendar-subtitle {
    color: var(--text-color-secondary);
    font-size: 0.95rem;
    line-height: 1.35;
    margin: 8px 0 0;
  }

  .calendar-period-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    padding: 14px var(--spacing-md);
    background: var(--surface-solid);
    border: 1px solid #e5e5e5;
    border-radius: 18px;
    box-shadow: var(--campus-shadow-soft);
  }

  .period-label {
    color: var(--text-color-secondary);
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  :global([data-theme="dark"]) .calendar-period-card,
  :global([data-theme="dark"]) .suggestion-banner,
  :global([data-theme="dark"]) .calendar-legend,
  :global([data-theme="dark"]) .quick-link-card,
  :global([data-theme="dark"]) .calendar-container {
    border-color: rgba(255, 255, 255, 0.11);
  }

  /* ─── Suggestion Banner ─────────────────────────────────────────── */
  .suggestion-banner {
    background: var(--surface-solid);
    border: 1px solid #e5e5e5;
    border-radius: 18px;
    padding: var(--spacing-md);
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    box-shadow: var(--campus-shadow-soft);
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
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    background: #f35b04;
    color: #ffffff;
    font-size: 1.35rem;
    box-shadow: 0 8px 18px rgba(243, 91, 4, 0.22);
  }

  .suggestion-content {
    flex: 1;
  }

  .suggestion-title {
    font-weight: 700;
    margin: 0;
    color: var(--text-color);
  }

  .suggestion-desc {
    font-size: 0.85rem;
    margin: 2px 0 0;
    color: var(--text-color-secondary);
    line-height: 1.35;
  }

  .suggestion-actions {
    display: flex;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .suggestion-btn {
    min-height: 38px;
    padding: 7px 14px;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .suggestion-btn--primary {
    background: var(--primary-color);
    color: white;
    border: 1px solid var(--primary-color);
  }

  .suggestion-btn--primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(212, 68, 7, 0.2);
  }

  .suggestion-btn--secondary {
    background: #ffffff;
    color: var(--text-color);
    border: 1px solid #e5e5e5;
  }

  .suggestion-btn--secondary:hover {
    background: #f5f0e6;
  }

  :global([data-theme="dark"]) .suggestion-btn--secondary,
  :global([data-theme="dark"]) .legend-item,
  :global([data-theme="dark"]) .toolbar-btn:hover,
  :global([data-theme="dark"]) .today-btn {
    background: rgba(255, 255, 255, 0.08);
  }

  :global([data-theme="dark"]) .suggestion-btn--secondary,
  :global([data-theme="dark"]) .legend-item {
    border-color: rgba(255, 255, 255, 0.11);
  }

  :global([data-theme="dark"]) .suggestion-btn--secondary:hover,
  :global([data-theme="dark"]) .legend-item:hover {
    background: rgba(255, 255, 255, 0.13);
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

  .refresh-btn {
    background: var(--surface-solid);
    border: 1px solid #e5e5e5;
    color: #626a82;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 1.25rem;
    padding: 0;
    box-shadow: var(--campus-shadow-soft);
    flex: 0 0 auto;
  }

  .refresh-btn:hover {
    color: var(--primary-color);
    border-color: rgba(212, 68, 7, 0.22);
    transform: scale(1.05);
  }

  :global([data-theme="dark"]) .refresh-btn {
    border-color: rgba(255, 255, 255, 0.11);
    color: var(--text-color-secondary);
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

  /* ─── Calendar Source Legend ────────────────────────────────────── */
  .calendar-legend-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .calendar-legend {
    display: flex;
    justify-content: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    flex-wrap: wrap;
    background: var(--surface-solid);
    border: 1px solid #e5e5e5;
    border-radius: 18px;
    box-shadow: var(--campus-shadow-soft);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-color);
    cursor: pointer;
    padding: 7px 11px;
    border-radius: 999px;
    border: 1px solid #e5e5e5;
    background: #ffffff;
    transition: all 0.2s ease;
  }

  .legend-item:hover {
    background: #f5f0e6;
    border-color: rgba(212, 68, 7, 0.22);
  }

  .legend-item--hidden {
    opacity: 0.35;
  }

  .legend-item--hidden span:last-child {
    text-decoration: line-through;
  }

  .legend-color {
    width: 11px;
    height: 11px;
    border-radius: 999px;
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

  /* ─── Calendar Container — Liquid Glass Surface ────────────────── */
  .calendar-container {
    display: flex;
    flex-direction: column;
    position: relative;
    margin: 0;
    background: var(--surface-solid);
    border: 1px solid #e5e5e5;
    border-radius: 22px;
    overflow: hidden;
    box-shadow: var(--campus-shadow);
    height: clamp(440px, calc(100svh - 330px), 720px);
    min-height: 440px;
    padding-bottom: 67px; /* Reserve space for the absolutely-positioned navigation toolbar */
    transition: opacity 0.3s ease;
  }

  :global([data-theme="dark"]) .calendar-container {
    background: var(--surface-solid);
  }

  .calendar-scroll-area {
    flex: 1;
    overflow-x: hidden;
    overflow-y: hidden; /* Vertical scroll is managed internally by the Event Calendar library */
    height: 100%;
    position: relative;
  }

  /* ─── Week View: Enable smooth horizontal scroll with wide spacious layout ─── */
  .view-week .calendar-scroll-area {
    overflow-x: auto !important; /* Allow horizontal scrolling */
    overflow-y: auto !important; /* Allow smooth vertical scrolling */
    -webkit-overflow-scrolling: touch;
  }

  .view-week :global(.ec) {
    min-width: 1200px !important; /* Force a wide grid for big, highly readable cards */
    max-width: none !important;
  }

  /* Ensure intermediate elements let the sticky left-rail bubble up to .calendar-scroll-area */
  .view-week :global(.ec-main),
  .view-week :global(.ec-body) {
    overflow: visible !important;
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

  /* ─── Navigation Toolbar — Liquid Glass ────────────────────────── */
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
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(18px) saturate(160%);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    border-top: 1px solid #e5e5e5;
    box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.06);
    transition: all 0.3s ease;
  }

  :global([data-theme="dark"]) .calendar-toolbar {
    background: rgba(20, 20, 30, 0.94) !important;
    border-top-color: rgba(255, 255, 255, 0.11);
  }

  /* Landscape mobile: toolbar repositions to a vertical sidebar on the right */
  .calendar-container.is-landscape {
    flex-direction: row;
    padding-bottom: 0;
    padding-right: 68px;
    height: clamp(430px, calc(100svh - 220px), 680px);
    min-height: 430px;
  }

  .calendar-container.is-landscape .calendar-toolbar {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    left: auto;
    width: 68px;
    height: 100%;
    flex-direction: column;
    justify-content: center;
    padding: var(--spacing-sm) 0;
    border-top: none;
    border-left: 1px solid #e5e5e5;
    gap: var(--spacing-md);
    background: rgba(255, 255, 255, 0.96);
  }

  :global([data-theme="dark"])
    .calendar-container.is-landscape
    .calendar-toolbar {
    background: rgba(20, 20, 30, 0.96);
    border-left-color: rgba(255, 255, 255, 0.11);
  }

  .calendar-container.is-landscape .toolbar-views,
  .calendar-container.is-landscape .toolbar-nav {
    flex-direction: column;
    margin: 0;
    width: 100%;
    border-radius: 0;
    border: none;
    background: transparent;
    backdrop-filter: none;
    box-shadow: none;
    order: unset;
  }

  .calendar-container.is-landscape .toolbar-views {
    margin-bottom: auto;
  }

  .calendar-container.is-landscape .toolbar-nav {
    margin-top: auto;
  }

  .calendar-container.is-landscape .toolbar-btn {
    border-right: none;
    border-bottom: 1px solid var(--glass-border-subtle);
    width: 100%;
    height: 49px;
    font-size: 0.75rem;
    padding: 4px;
  }

  .calendar-container.is-landscape .toolbar-btn:last-child {
    border-bottom: none;
  }

  .calendar-container.is-landscape .today-btn {
    padding: 4px;
    border-radius: 0;
    border: none;
    border-bottom: 1px solid var(--glass-border-subtle);
    background: rgba(212, 68, 7, 0.05);
  }

  .calendar-container.is-landscape .today-btn:active {
    background: rgba(212, 68, 7, 0.2);
    transform: none;
  }

  .toolbar-group {
    display: flex;
    gap: 4px;
    background: #f5f0e6;
    padding: 3px;
    border-radius: 14px;
    border: 1px solid #e5e5e5;
  }

  :global([data-theme="dark"]) .toolbar-group {
    background: rgba(255, 255, 255, 0.08);
    border-color: #ffffff1c;
  }

  .toolbar-title {
    font-weight: 800;
    font-size: 1rem;
    color: var(--text-color);
    text-align: right;
  }

  .toolbar-btn {
    padding: 8px 14px;
    border: none;
    background: transparent;
    color: var(--text-color);
    font-size: 0.8rem;
    font-weight: 700;
    border-radius: 11px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
  }

  .toolbar-btn:hover {
    background: #ffffff;
  }

  .toolbar-btn.active {
    background: var(--primary-color);
    color: white;
    box-shadow: 0 2px 8px rgba(212, 68, 7, 0.3);
  }

  .today-btn {
    background: #ffffff;
    color: var(--primary-color);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .today-btn:hover {
    background: rgba(212, 68, 7, 0.15);
  }

  .today-btn:active {
    transform: scale(0.98);
  }

  /* ─── Event Detail Popup — Liquid Glass ────────────────────────── */
  .event-popup {
    position: fixed;
    z-index: 1000;
    background: var(--surface-solid);
    border: 1px solid #e5e5e5;
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    box-shadow: var(--campus-shadow);
    min-width: 240px;
    max-width: 320px;
    animation: popupFadeIn 0.15s ease-out;
  }

  :global([data-theme="dark"]) .event-popup {
    border-color: rgba(255, 255, 255, 0.11);
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

  .popup-online-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
  }

  .popup-online-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--primary-color);
    color: white !important;
    font-weight: 700;
    font-size: 0.85rem;
    padding: 8px 16px;
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(212, 68, 7, 0.25);
    margin-bottom: var(--spacing-xs);
  }

  .popup-online-btn:hover {
    transform: translateY(-1.5px);
    box-shadow: 0 6px 16px rgba(212, 68, 7, 0.35);
    background: var(--srh-orange-dark, #d44407);
  }

  .popup-online-btn:active {
    transform: translateY(0);
  }

  /* ── Campus Map Directions Button ── */
  .popup-location-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
  }

  .popup-directions-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, rgba(0, 242, 254, 0.12) 0%, rgba(79, 172, 254, 0.12) 100%);
    color: #00d4f0;
    font-weight: 700;
    font-size: 0.82rem;
    padding: 8px 14px;
    border-radius: var(--radius-md);
    text-decoration: none;
    border: 1px solid rgba(0, 242, 254, 0.28);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(0, 212, 240, 0.1);
    width: fit-content;
  }

  .popup-directions-btn i {
    font-size: 1rem;
    flex-shrink: 0;
  }

  .popup-directions-btn:hover {
    background: linear-gradient(135deg, rgba(0, 242, 254, 0.22) 0%, rgba(79, 172, 254, 0.22) 100%);
    border-color: rgba(0, 242, 254, 0.5);
    box-shadow: 0 4px 16px rgba(0, 212, 240, 0.22), 0 0 0 1px rgba(0, 242, 254, 0.15);
    transform: translateY(-1.5px);
    color: #00f2fe;
  }

  .popup-directions-btn:active {
    transform: translateY(0);
  }

  .popup-directions-btn.disabled {
    cursor: default;
    pointer-events: none;
    opacity: 0.55;
    color: #94a3b8;
    border-color: rgba(148, 163, 184, 0.18);
    background: rgba(148, 163, 184, 0.08);
    box-shadow: none;
  }

  .directions-room-badge {
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    background: rgba(0, 242, 254, 0.15);
    border: 1px solid rgba(0, 242, 254, 0.25);
    border-radius: 4px;
    padding: 1px 6px;
    color: #7ee8fa;
    margin-left: auto;
  }



  .popup-location-badge.online {
    align-self: flex-start;
    background: rgba(34, 197, 94, 0.1);
    color: rgb(34, 197, 94);
    border-color: rgba(34, 197, 94, 0.25);
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

  /* ─── Event Calendar Library Theme Overrides ───────────────────── */
  :global(.ec) {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, sans-serif !important;
    --ec-bg-color: transparent !important;
    --ec-border-color: #e5e5e5 !important;
    --ec-text-color: var(--text-color) !important;
    --ec-today-bg-color: #fff6dc !important;
    --ec-highlight-color: #f5f0e6 !important;
    --ec-now-indicator-color: var(--primary-color) !important;
    --ec-button-bg-color: #ffffff !important;
    --ec-button-border-color: #e5e5e5 !important;
    --ec-button-active-bg-color: var(--primary-color) !important;
    --ec-button-active-border-color: var(--primary-color) !important;
    height: 100% !important;
  }

  :global([data-theme="dark"] .ec) {
    --ec-border-color: rgba(255, 255, 255, 0.11) !important;
    --ec-button-bg-color: rgba(255, 255, 255, 0.08) !important;
    --ec-button-border-color: rgba(255, 255, 255, 0.11) !important;
    --ec-today-bg-color: rgba(212, 68, 7, 0.16) !important;
    --ec-highlight-color: rgba(255, 255, 255, 0.08) !important;
  }

  /* ─── Sticky Fixed Rails (Chrome Layer): Sidebar, Header, and Toolbar ─── */
  /* These elements form the unified premium glassmorphic frame. They are placed
     on the same layer level (z-index: 10) so the grid content slides underneath them. */
  :global(.ec-sidebar),
  :global(.ec-header),
  .calendar-toolbar {
    background-color: rgba(255, 255, 255, 0.94) !important;
    backdrop-filter: blur(18px) saturate(160%) !important;
    -webkit-backdrop-filter: blur(18px) saturate(160%) !important;
    transition: background-color 0.3s ease !important;
  }

  :global(.ec-sidebar) {
    position: sticky !important;
    left: 0 !important;
    z-index: 10 !important;
    border-right: 1px solid #e5e5e5 !important;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.04) !important;
  }

  :global(.ec-header) {
    position: sticky !important;
    top: 0 !important;
    z-index: 10 !important;
    border-bottom: 1px solid #e5e5e5 !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04) !important;
  }

  /* Corner Intersection (Header × Sidebar): Must stay pinned to both top and left with highest priority */
  :global(.ec-header .ec-sidebar) {
    position: sticky !important;
    top: 0 !important;
    left: 0 !important;
    z-index: 15 !important;
    background-color: #ffffff !important;
  }

  /* Dark mode theme adjustments for the chrome layers */
  :global(html[data-theme="dark"] .ec-sidebar),
  :global(html[data-theme="dark"] .ec-header),
  :global([data-theme="dark"]) .calendar-toolbar {
    background-color: rgba(18, 18, 26, 0.88) !important;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.2) !important;
    border-color: rgba(255, 255, 255, 0.11) !important;
  }

  :global(html[data-theme="dark"] .ec-header .ec-sidebar) {
    background-color: rgba(18, 18, 26, 0.95) !important;
  }

  :global(.custom-header) {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.2;
    padding: 4px 0;
  }

  :global(.header-day-num) {
    font-size: 1.1rem;
    font-weight: 700;
    margin-top: 2px;
  }

  :global(.ec-toolbar) {
    display: none !important;
  }

  :global(.ec-day-head),
  :global(.ec-day-head time) {
    color: var(--text-color-secondary) !important;
  }

  :global(.ec-today .ec-day-head) {
    color: var(--primary-color) !important;
    font-weight: 700;
  }

  /* ─── Event Card Styling — Semantic Colors & Textures ──────────── */
  :global(.ec-event) {
    border-radius: 9px !important;
    font-size: 0.8rem !important;
    background-color: transparent !important;
    border: none !important;
    overflow: visible !important;
    box-shadow: none !important;
  }

  :global(.ec-list .ec-event) {
    padding: 5px 14px !important;
  }

  :global(.ec-event-inner) {
    display: flex;
    flex-direction: column;
    gap: 2px;
    height: 100%;
    width: 100%; /* Ensures all-day events span their full allocated width */
    overflow: hidden;
    padding: 6px 7px !important;
    border-radius: 9px !important;
    background-color: #ffffff !important;
    border: 1px solid #e5e5e5 !important;
    border-left: 3px solid var(--event-color, var(--primary-color)) !important;
    color: #000000 !important;
    position: relative;
    z-index: 1;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .view-month :global(.ec-event-inner) {
    padding: 2px !important;
  }

  /* Pastel color tint overlay on the translucent white base */
  :global(.ec-event-inner::before) {
    content: "";
    position: absolute;
    inset: 0;
    background-color: var(--event-color, var(--primary-color));
    opacity: 0.12;
    z-index: -2;
    border-radius: 9px;
  }

  /* Dark mode: translucent dark base with a subtle color wash */
  :global(html[data-theme="dark"] .ec-event-inner) {
    background-color: #000000b3 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    color: white !important;
  }

  :global(html[data-theme="dark"] .ec-event-inner::before) {
    opacity: 0.25; /* Increased tint intensity to remain visible against the dark base */
  }

  :global(.ec-event:hover .ec-event-inner) {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
  }

  :global(.ec-event:hover .ec-event-inner::before) {
    opacity: 0.22;
  }

  :global(html[data-theme="dark"] .ec-event:hover .ec-event-inner::before) {
    opacity: 0.35;
  }

  :global(.ec-event-title-text) {
    font-weight: 700;
    font-size: 0.85rem;
    line-height: 1.3;
    white-space: normal;
    word-break: break-word;
    color: #000000 !important;
    text-shadow: none !important;
  }

  :global(html[data-theme="dark"] .ec-event-title-text) {
    color: white !important;
  }

  :global(.ec-event-loc),
  :global(.ec-event-time-custom) {
    color: #3e2c23 !important;
    font-weight: 500;
    opacity: 0.7;
  }

  :global(html[data-theme="dark"] .ec-event-loc),
  :global(html[data-theme="dark"] .ec-event-time-custom) {
    color: white !important;
  }

  /* ─── List View Layout Overrides ────────────────────────────────── */
  :global(.ec-event-inner--list) {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    height: auto;
    padding: 8px 14px !important;
  }

  :global(.event-main-info) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    flex: 1;
    overflow: hidden;
  }

  :global(.event-meta-info) {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    text-align: right;
    flex-shrink: 0;
  }

  :global(.ec-event-time-sub) {
    font-size: 0.78em;
    font-weight: 600;
    opacity: 0.55;
    color: black !important;
  }

  :global(html[data-theme="dark"] .ec-event-time-sub) {
    color: white !important;
  }

  :global(.ec-event-time-sub.time-end) {
    opacity: 0.6;
    font-size: 0.72em;
  }

  :global(.ec-event-tag) {
    display: none !important;
  }

  /* ─── Accessibility: Assistive Pattern Textures ────────────────── */
  :global(.a11y-assistive-patterns .ec-event-inner) {
    border-left-width: 8px !important; /* Wider accent bar for improved pattern visibility */
  }

  @media (max-width: 1023px) {
    :global(.ec-event-inner) {
      border-left: none !important;
    }
  }

  /* Texture overlay layer — spans the full event card area */
  :global(.a11y-assistive-patterns .ec-event-inner::after) {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    opacity: 0.15;
    pointer-events: none;
  }

  /* Light mode texture patterns (black strokes on light background) */
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
      rgba(0, 0, 0, 1) 28%,
      transparent 28%
    ) !important;
    background-size: 8px 8px !important;
  }

  :global(
      .a11y-assistive-patterns .ec-event-inner[data-texture="mesh"]::after
    ) {
    background-image: linear-gradient(rgba(0, 0, 0, 1) 1.5px, transparent 1.5px),
      linear-gradient(90deg, rgba(0, 0, 0, 1) 1.5px, transparent 1.5px) !important;
    background-size: 7.5px 7.5px !important;
  }

  /* Dark mode texture patterns (white strokes on dark background) */
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
      rgba(255, 255, 255, 1) 28%,
      transparent 28%
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

  /* ─── Now Indicator — Current Time Marker ──────────────────────── */
  :global(.ec-now-indicator) {
    z-index: 15 !important;
    border-top: 2px solid var(--primary-color) !important;
    box-shadow: 0 1px 6px rgba(212, 68, 7, 0.4) !important;
    margin-left: 0 !important;
  }

  :global(.ec-now-indicator::before) {
    content: "" !important;
    position: absolute !important;
    width: 10px !important;
    height: 10px !important;
    background: var(--primary-color) !important;
    border-radius: 50% !important;
    box-shadow: 0 0 8px var(--primary-color) !important;
    animation: indicatorPulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1) !important;
  }

  @keyframes indicatorPulse {
    0%,
    100% {
      box-shadow:
        0 0 0 0px rgba(212, 68, 7, 0.4),
        0 0 8px var(--primary-color) !important;
    }
    50% {
      box-shadow:
        0 0 0 6px rgba(212, 68, 7, 0),
        0 0 12px var(--primary-color) !important;
    }
  }

  /* ─── Dark Mode — Calendar Library Overrides ───────────────────── */
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

  /* ─── Responsive Layout Adjustments ────────────────────────────── */
  @media (max-width: 768px) {
    /* Location text is hidden in month view on mobile to save space */
    :global(.ec-day-grid .ec-event-loc) {
      display: none !important;
    }

    .calendar-container {
      height: clamp(420px, calc(100svh - 320px), 620px);
      margin: 0;
      min-height: 420px;
    }

    .calendar-toolbar {
      margin: 0;
      padding: var(--spacing-xs) var(--spacing-sm);
    }

    .toolbar-title {
      font-size: 0.9rem;
    }

    .toolbar-btn {
      font-size: 0.8rem;
      padding: var(--spacing-xs);
      min-width: 40px;
    }
  }

  @media (max-width: 480px) {
    .calendar-container {
      padding-bottom: 112px;
    }

    .calendar-toolbar {
      justify-content: center;
    }

    .toolbar-group {
      width: 100%;
      justify-content: center;
    }

    .toolbar-views .toolbar-btn {
      flex: 1 1 0;
    }

    .toolbar-nav .today-btn {
      flex: 1 1 auto;
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
      gap: var(--spacing-md);
    }

    .toolbar-views {
      order: 1;
    }
    .toolbar-nav {
      order: 3;
      margin-left: auto;
    }

    .calendar-container {
      height: clamp(600px, calc(100vh - 220px), 780px);
    }

    .quick-links-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  /* ─── Quick Links Section ──────────────────────────────────────── */
  .quick-links-section {
    margin: 0;
  }

  .section-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 var(--spacing-sm);
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

  /* ─── Quick Link Cards — Liquid Glass Surface ──────────────────── */
  .quick-link-card {
    display: flex;
    flex-direction: column;
    padding: var(--spacing-md);
    background: var(--surface-solid);
    border: 1px solid #e5e5e5;
    border-radius: 18px;
    text-decoration: none;
    color: var(--text-color);
    transition: all 0.22s ease;
    box-shadow: var(--campus-shadow-soft);
    position: relative;
    overflow: hidden;
  }

  .quick-link-card:hover {
    border-color: rgba(212, 68, 7, 0.35);
    transform: translateY(-3px);
    box-shadow: var(--campus-shadow);
  }

  .ql-icon {
    width: 44px;
    height: 44px;
    border-radius: 13px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 1.45rem;
    margin-bottom: var(--spacing-sm);
  }

  .ql-icon--blue {
    background: #2fa4d7;
  }

  .ql-icon--yellow {
    background: #f7b801;
  }

  .ql-icon--violet {
    background: #3d348b;
  }

  .ql-icon--orange {
    background: #f35b04;
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
      margin: 0;
    }
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
</style>
