<script lang="ts">
	import { onMount } from "svelte";
	import Calendar from "@event-calendar/core";
	import TimeGrid from "@event-calendar/time-grid";
	import DayGrid from "@event-calendar/day-grid";
	import List from "@event-calendar/list";
	import "@event-calendar/core/index.css";
	import { loadCalendarEvents } from "$lib/utils/icalParser";
	import type { CalendarEvent } from "$lib/utils/icalParser";
	import { calendarStore } from "$lib/stores/calendarStore";
	import SecureCalendarInput from "$lib/components/SecureCalendarInput.svelte";
	import { focusTrap } from "$lib/utils/focusTrap";
	import { browser } from "$app/environment";
	import { settingsStore } from "$lib/stores/settingsStore";

	// ─── i18n — driven by global settings store ───────────────────────
	$: locale = $settingsStore.language ?? "en";

	const buttonLabels: Record<string, Record<string, string>> = {
		en: {
			today: "Today",
			month: "Month",
			week: "Week",
			day: "Day",
			list: "List",
			prev: "←",
			next: "→",
			threeDays: "3 Days",
		},
		de: {
			today: "Heute",
			month: "Monat",
			week: "Woche",
			day: "Tag",
			list: "Liste",
			prev: "←",
			next: "→",
			threeDays: "3 Tage",
		},
	};

	function getLabels(loc: string) {
		return buttonLabels[loc] || buttonLabels["en"];
	}

	let t = getLabels(locale);
	$: t = getLabels(locale);

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

	// ─── Feature 4: Empty State ─────────────────────────────────────
	$: currentEventsCount = options.events?.length ?? 0;

	function getDefaultView(): string {
		const breakpoint = isDesktop ? "desktop" : isLandscapeMobile ? "landscape" : "portrait";
		if (browser) {
			const saved = localStorage.getItem(`preferredCalendarView_${breakpoint}`);
			if (saved) return saved;
		}

		if (isPortraitMobile) return "dayGridMonth";
		if (isLandscapeMobile) return "timeGridWeek";
		return "timeGridWeek";
	}

	function getAllEvents(): any[] {
		const subEvents = currentSubs.flatMap((s) => s.cachedEvents);
		return [...staticEvents, ...subEvents]
			.filter((evt) => !hiddenSources.has(evt.extendedProps?.calendarId || ''))
			.map((evt) => ({
				id: evt.id,
				title: evt.title,
				start: evt.start,
				end: evt.end,
				allDay: evt.allDay,
				backgroundColor: evt.backgroundColor,
				extendedProps: evt.extendedProps || {},
			}));
	}

	// ─── EC Options ──────────────────────────────────────────────────
	let plugins = [TimeGrid, DayGrid, List];

	let options: any = {
		view: getDefaultView(),
		events: [],
		locale: locale,
		firstDay: 1,
		nowIndicator: true,
		slotMinTime: "07:00:00",
		slotMaxTime: "22:00:00",
		flexibleSlotTimeLimits: true,
		slotDuration: "00:30:00",
		allDaySlot: true,
		headerToolbar: {
			start: "",
			center: "",
			end: "",
		},
		buttonText: {
			today: t.today,
			dayGridMonth: t.month,
			timeGridWeek: t.week,
			timeGridDay: t.day,
			listWeek: t.list,
			listDay: t.list,
			listMonth: t.list,
		},
		height: "100%",
		eventContent: (info: any) => {
			const loc = info.event.extendedProps?.shortLocation || "";
			const locHtml = loc
				? `<span class="ec-event-loc">📍${loc}</span>`
				: "";

			// List view: flat layout with title + location tag
			if (info.view?.type?.startsWith("list")) {
				return {
					html: `<div class="ec-event-inner ec-event-inner--list"><span class="ec-event-title-text">${info.event.title}</span>${locHtml}</div>`,
				};
			}

			// Time grid / day grid: stacked layout
			const timeHtml =
				!info.event.allDay && info.timeText
					? `<div class="ec-event-time-custom">${info.timeText}</div>`
					: "";
			return {
				html: `<div class="ec-event-inner">${timeHtml}<div class="ec-event-title-text">${info.event.title}</div>${locHtml}</div>`,
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
			const breakpoint = isDesktop ? "desktop" : isLandscapeMobile ? "landscape" : "portrait";
			localStorage.setItem(`preferredCalendarView_${breakpoint}`, viewName);
		}

		setTimeout(() => {
			updateToolbarState();
			const indicator = document.querySelector(".ec-now-indicator") as HTMLElement;
			if (indicator) {
				// Find the closest scrollable container to avoid scrolling the whole page
				let parent = indicator.parentElement;
				while (parent && parent !== document.body) {
					const style = window.getComputedStyle(parent);
					if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
						const parentRect = parent.getBoundingClientRect();
						const indicatorRect = indicator.getBoundingClientRect();
						const relativeTop = indicatorRect.top - parentRect.top + parent.scrollTop;
						
						parent.scrollTo({
							top: relativeTop - parentRect.height / 2,
							behavior: "smooth"
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

	// ─── Store Subscription ──────────────────────────────────────────
	const unsubscribe = calendarStore.subscribe((subs) => {
		currentSubs = subs;
		if (isMounted) {
			options = { ...options, events: getAllEvents() };
		}
	});

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
			} catch (error) {
				console.error("Failed to load calendar events:", error);
				if (isMounted) isLoading = false;
			}
		};

		init();

		return () => {
			isMounted = false;
			unsubscribe();
		};
	});
</script>

<svelte:head>
	<title>Calendar - SRH Campus Hub</title>
</svelte:head>

<svelte:window bind:innerWidth on:click={handleWindowClick} />

<div class="calendar-page">
	<header class="page-header">
		<h1>📅 Calendar</h1>
		<p class="subtitle">University events and your schedule</p>
	</header>

	<div class="calendar-page-layout">
		<div class="calendar-main">
			<div class="toolbar-center">
				<span class="toolbar-title">{currentTitleText}</span>
			</div>

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
						<p class="empty-subtitle">Try a different date range or add a calendar subscription.</p>
					</div>
				{/if}
			</div>

			<!-- Custom Bottom Toolbar -->
				<div class="calendar-toolbar">
					<div class="toolbar-end">
						<button
							class="view-btn"
							class:active={currentViewLabel === "dayGridMonth"}
							on:click={() => switchView("dayGridMonth")}
						>{t.month}</button>
						<button
							class="view-btn"
							class:active={currentViewLabel === "timeGridWeek"}
							on:click={() => switchView("timeGridWeek")}
						>{t.week}</button>
						<button
							class="view-btn"
							class:active={currentViewLabel === "timeGridDay"}
							on:click={() => switchView("timeGridDay")}
						>{t.day}</button>
						<button
							class="view-btn"
							class:active={currentViewLabel === "listWeek"}
							on:click={() => switchView("listWeek")}
						>{t.list}</button>
					</div>
				<div class="toolbar-start">
					<button class="nav-btn" on:click={goToPrev} aria-label="Previous"
						>{t.prev}</button
					>
					<button class="nav-btn today-btn" on:click={goToToday}
						>{t.today}</button
					>
					<button class="nav-btn" on:click={goToNext} aria-label="Next"
						>{t.next}</button
					>
				</div>
			</div>

			<!-- Feature 3: Calendar Settings Accordion -->
			<section class="settings-card">
				<button class="settings-header" on:click={() => settingsOpen = !settingsOpen} aria-expanded={settingsOpen}>
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
									class:legend-item--hidden={hiddenSources.has('lecture-free')}
									on:click={() => toggleSource('lecture-free')}
								>
									<span class="legend-color" style="background-color: #3b82f6;"></span>
									<span>Lecture-Free Periods</span>
								</button>
								<button
									class="legend-item"
									class:legend-item--hidden={hiddenSources.has('exams')}
									on:click={() => toggleSource('exams')}
								>
									<span class="legend-color" style="background-color: #ef4444;"></span>
									<span>Exams</span>
								</button>
								{#each currentSubs as sub}
									<button
										class="legend-item"
										class:legend-item--hidden={hiddenSources.has(sub.id)}
										on:click={() => toggleSource(sub.id)}
									>
										<span class="legend-color" style="background-color: {sub.color};"></span>
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
					<a href="https://calendarsub.padarhava.workers.dev/" target="_blank" rel="noopener noreferrer" class="quick-link-card">
						<span class="ql-icon">📅</span>
						<span class="ql-title">Calendar Enhancer</span>
						<span class="ql-desc">Enhance your university calendar</span>
					</a>
					<a href="https://srh-community.campusweb.cloud/en/mein-studium/mein-stundenplan.php" target="_blank" rel="noopener noreferrer" class="quick-link-card">
						<span class="ql-icon">🗓️</span>
						<span class="ql-title">My Schedule</span>
						<span class="ql-desc">View class timetable</span>
					</a>
					<a href="https://srh-community.campusweb.cloud/en/mein-studium/meine-pruefungsanmeldung.php" target="_blank" rel="noopener noreferrer" class="quick-link-card">
						<span class="ql-icon">🎓</span>
						<span class="ql-title">Exam Registration</span>
						<span class="ql-desc">Register for exams</span>
					</a>
					<a href="https://www.srh-university.de/en/events/" target="_blank" rel="noopener noreferrer" class="quick-link-card">
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
		<button class="popup-close" on:click={closePopup} aria-label="Close event details">✖</button>
		<h3 id="popup-title" class="popup-title">{popupEvent.title}</h3>
		
		{#if !popupEvent.allDay && popupEvent.start}
			<div class="popup-time">
				{new Date(popupEvent.start).toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'})} 
				{#if popupEvent.end}
					- {new Date(popupEvent.end).toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'})}
				{/if}
			</div>
			<div class="popup-date">
				{new Date(popupEvent.start).toLocaleDateString(locale, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
			</div>
		{:else if popupEvent.allDay}
			<div class="popup-time">All Day</div>
			<div class="popup-date">
				{new Date(popupEvent.start).toLocaleDateString(locale, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
			</div>
		{/if}

		{#if popupEvent.extendedProps?.location || popupEvent.extendedProps?.shortLocation}
			<div class="popup-location-badge">📍 {popupEvent.extendedProps?.shortLocation || popupEvent.extendedProps?.location}</div>
			<a 
				href="https://maps.google.com/?q={encodeURIComponent(popupEvent.extendedProps?.location)}" 
				target="_blank" 
				rel="noopener noreferrer" 
				class="popup-location clickable-location"
				aria-label="Open location in Google Maps"
			>
				{popupEvent.extendedProps?.location}
			</a>
		{/if}

		{#if popupEvent.extendedProps?.description}
			<div class="popup-description">{popupEvent.extendedProps?.description}</div>
		{/if}
	</div>
{/if}

<style>
	.calendar-page {
		padding-bottom: var(--spacing-xl);
		min-height: 100vh;
	}

	.page-header {
		text-align: center;
		padding: var(--spacing-lg) 0 var(--spacing-sm);
		margin-bottom: var(--spacing-sm);
	}

	h1 {
		margin-bottom: var(--spacing-xs);
		font-size: 1.75rem;
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
		position: relative;
		margin: 0 var(--spacing-sm);
		background: var(--glass-bg-strong);
		backdrop-filter: var(--glass-blur);
		-webkit-backdrop-filter: var(--glass-blur);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: var(--glass-shadow-lg);
		height: calc(100vh - 380px);
		min-height: 400px;
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
		from { opacity: 0; transform: translateY(8px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@keyframes emptyBounce {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-6px); }
	}

	/* ─── Custom Bottom Toolbar — Liquid Glass ────────────────────── */
	.calendar-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		margin: var(--spacing-sm) var(--spacing-sm) 0;
		background: var(--glass-bg-light);
		backdrop-filter: var(--glass-blur);
		-webkit-backdrop-filter: var(--glass-blur);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-md);
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
		box-shadow: inset 0 2px 4px rgba(0,0,0,0.15);
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
		from { opacity: 0; }
		to { opacity: 1; }
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
		box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255,255,255,0.3);
		animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
		max-height: 70vh;
		overflow-y: auto;
	}

	@keyframes slideUp {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
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
		margin-bottom: var(--spacing-xs);
		word-break: break-word;
		display: block;
	}

	.clickable-location {
		color: var(--primary-color);
		text-decoration: underline;
		text-decoration-color: rgba(212, 68, 7, 0.4);
		text-underline-offset: 2px;
		transition: all 0.2s ease;
	}

	.clickable-location:hover {
		color: var(--srh-orange-dark);
		text-decoration-color: var(--srh-orange-dark);
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
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
			Oxygen, Ubuntu, Cantarell, sans-serif !important;
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

	/* Feature 5: Color contrast — white text + shadow on event grid cards */
	:global(.ec-event) {
		border-radius: 4px !important;
		font-size: 0.8rem !important;
	}

	:global(.ec-time-grid .ec-event),
	:global(.ec-day-grid .ec-event) {
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
	}

	:global(.ec-time-grid .ec-event-inner),
	:global(.ec-time-grid .ec-event-title-text),
	:global(.ec-time-grid .ec-event-time-custom),
	:global(.ec-time-grid .ec-event-loc),
	:global(.ec-day-grid .ec-event-inner),
	:global(.ec-day-grid .ec-event-title-text),
	:global(.ec-day-grid .ec-event-time-custom),
	:global(.ec-day-grid .ec-event-loc) {
		color: #fff !important;
	}
	
	/* Ensure list view uses proper text colors depending on mode */
	:global(.ec-list .ec-event-inner),
	:global(.ec-list .ec-event-title-text),
	:global(.ec-list .ec-event-time-custom),
	:global(.ec-list .ec-event-loc) {
		color: var(--text-color) !important;
	}

	/* Custom event card layout with location */
	:global(.ec-event-inner) {
		display: flex;
		flex-direction: column;
		gap: 0px;
		height: 100%;
		overflow: hidden;
		padding: 2px 0;
	}

	/* List view: flat row with title + location */
	:global(.ec-event-inner--list) {
		flex-direction: row;
		align-items: flex-end;
		gap: 6px;
		height: auto;
		padding: 0;
		display: flex;
		justify-content: space-between;
	}

	:global(.ec-event-time-custom) {
		font-size: 0.5rem;
		opacity: 0.85;
		white-space: normal;
		overflow: clip;
		text-overflow: ellipsis;
	}

	:global(.ec-event-title-text) {
		font-weight: 700;
		font-size: 0.8rem;
		line-height: 1.2;
		white-space: normal;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	:global(.ec-event-inner--list .ec-event-title-text) {
		font-size: 1.4rem;
	}

	:global(.ec-event-loc) {
		font-size: 0.68rem;
		opacity: 0.9;
		white-space: normal;
		overflow: auto;
		text-overflow: ellipsis;
		display: block;
		margin-top: 1px;
	}

	/* In list view, location tag is inline */
	:global(.ec-event-inner--list .ec-event-loc) {
		display: inline-block;
		background: rgba(255, 255, 255, 0.25);
		border-radius: 3px;
		padding: 0 4px;
		margin-top: 0;
		flex-shrink: 0;
	}

	:global(.ec-time-grid .ec-time),
	:global(.ec-time) {
		font-size: 0.75rem !important;
		color: var(--text-color-secondary, #888) !important;
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
			margin: var(--spacing-xs) var(--spacing-xs) 0;
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
		background: linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent);
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
