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

	// ─── i18n Preparation ─────────────────────────────────────────────
	// Future: this will come from a global locale store
	let locale: string = "en";

	const buttonLabels: Record<string, Record<string, string>> = {
		en: {
			today: "Today",
			month: "Month",
			week: "Week",
			day: "Day",
			list: "List",
			prev: "←",
			next: "→",
			threeDays: "3 Days"
		},
		de: {
			today: "Heute",
			month: "Monat",
			week: "Woche",
			day: "Tag",
			list: "Liste",
			prev: "←",
			next: "→",
			threeDays: "3 Tage"
		}
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

	function getDefaultView(): string {
		if (isPortraitMobile) return "listWeek";
		if (isLandscapeMobile) return "timeGridWeek";
		return "timeGridWeek";
	}

	function getAllEvents(): any[] {
		const subEvents = currentSubs.flatMap((s) => s.cachedEvents);
		return [...staticEvents, ...subEvents].map((evt) => ({
			id: evt.id,
			title: evt.title,
			start: evt.start,
			end: evt.end,
			allDay: evt.allDay,
			backgroundColor: evt.backgroundColor,
			extendedProps: evt.extendedProps || {}
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
			end: ""
		},
		buttonText: {
			today: t.today,
			dayGridMonth: t.month,
			timeGridWeek: t.week,
			timeGridDay: t.day,
			listWeek: t.list,
			listDay: t.list,
			listMonth: t.list
		},
		height: "100%",
		eventContent: (info: any) => {
			const loc = info.event.extendedProps?.shortLocation || '';
			const locHtml = loc ? `<span class="ec-event-loc">📍 ${loc}</span>` : '';

			// List view: flat layout with title + location tag
			if (info.view?.type?.startsWith('list')) {
				return {
					html: `<div class="ec-event-inner ec-event-inner--list"><span class="ec-event-title-text">${info.event.title}</span>${locHtml}</div>`
				};
			}

			// Time grid / day grid: stacked layout
			const timeHtml = (!info.event.allDay && info.timeText) ? `<div class="ec-event-time-custom">${info.timeText}</div>` : '';
			return {
				html: `<div class="ec-event-inner">${timeHtml}<div class="ec-event-title-text">${info.event.title}</div>${locHtml}</div>`
			};
		},
		eventClick: (info: any) => {
			const jsEvent = info.jsEvent;
			jsEvent.stopPropagation(); // prevent window click from closing popup immediately
			popupEvent = info.event;
			popupPosition = {
				x: Math.min(jsEvent.clientX, innerWidth - 280),
				y: Math.min(jsEvent.clientY, window.innerHeight - 200)
			};
		},
		viewDidMount: () => {
			updateToolbarState();
		}
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

		const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
		const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: "numeric" };

		if (view.type === "dayGridMonth") {
			return start.toLocaleDateString(locale, { month: "long", year: "numeric" });
		}
		if (view.type === "timeGridDay" || view.type === "listDay") {
			return start.toLocaleDateString(locale, { weekday: "short", ...yearOpts });
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
		setTimeout(updateToolbarState, 80);
	}

	function closePopup() {
		popupEvent = null;
	}

	// ─── Responsive View Switching ───────────────────────────────────
	let prevBreakpoint = "";
	$: currentBreakpoint = isDesktop ? "desktop" : isLandscapeMobile ? "landscape" : "portrait";

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

<svelte:window bind:innerWidth on:click={closePopup} />

<div class="calendar-page">
	<header class="page-header">
		<h1>📅 Calendar</h1>
		<p class="subtitle">University events and your schedule</p>
	</header>

	<div class="calendar-legend">
		<div class="legend-item">
			<span class="legend-color" style="background-color: #3b82f6;"></span>
			<span>Lecture-Free Periods</span>
		</div>
		<div class="legend-item">
			<span class="legend-color" style="background-color: #ef4444;"></span>
			<span>Exams</span>
		</div>
	</div>

	{#if isLoading}
		<div class="loading-state">
			<div class="loading-spinner"></div>
			<p>Loading calendar events...</p>
		</div>
	{/if}

	<div class="calendar-container" class:loading={isLoading}>
		<Calendar bind:this={ecComponent} {plugins} {options} />
	</div>

	<!-- Custom Bottom Toolbar -->
	<div class="calendar-toolbar">
		<div class="toolbar-center">
			<span class="toolbar-title">{currentTitleText}</span>
		</div>
		<div class="toolbar-end">
			{#if isDesktop}
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
			{:else if isLandscapeMobile}
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
			{:else}
				<button
					class="view-btn"
					class:active={currentViewLabel === "dayGridMonth"}
					on:click={() => switchView("dayGridMonth")}
				>{t.month}</button>
				<button
					class="view-btn"
					class:active={currentViewLabel === "listWeek"}
					on:click={() => switchView("listWeek")}
				>{t.list}</button>
				<button
					class="view-btn"
					class:active={currentViewLabel === "timeGridDay"}
					on:click={() => switchView("timeGridDay")}
				>{t.day}</button>
			{/if}
		</div>
		<div class="toolbar-start">
			<button class="nav-btn" on:click={goToPrev} aria-label="Previous">{t.prev}</button>
			<button class="nav-btn today-btn" on:click={goToToday}>{t.today}</button>
			<button class="nav-btn" on:click={goToNext} aria-label="Next">{t.next}</button>
		</div>
	</div>

	<!-- Event Detail Popup -->
	{#if popupEvent}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div
			class="event-popup"
			style="left: {popupPosition.x}px; top: {popupPosition.y}px;"
			on:click|stopPropagation
			role="dialog"
			aria-label="Event details"
		>
			<button class="popup-close" on:click={closePopup} aria-label="Close popup">✕</button>
			<h4 class="popup-title">{popupEvent.title}</h4>
			{#if popupEvent.extendedProps?.shortLocation}
				<span class="popup-location-badge">{popupEvent.extendedProps.shortLocation}</span>
			{/if}
			{#if popupEvent.extendedProps?.location && popupEvent.extendedProps.location !== popupEvent.extendedProps.shortLocation}
				<p class="popup-location">📍 {popupEvent.extendedProps.location}</p>
			{:else if popupEvent.extendedProps?.location}
				<p class="popup-location">📍 {popupEvent.extendedProps.location}</p>
			{/if}
			<p class="popup-time">
				{#if popupEvent.allDay}
					All day
				{:else}
					{new Date(popupEvent.start).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
					–
					{new Date(popupEvent.end).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
				{/if}
			</p>
			<p class="popup-date">
				{new Date(popupEvent.start).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
			</p>
		</div>
	{/if}

	<section class="subscription-section">
		<SecureCalendarInput />
	</section>
</div>

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
		color: #666;
		font-size: 1rem;
	}

	@media (prefers-color-scheme: dark) {
		.subtitle {
			color: #aaa;
		}
	}

	/* ─── Legend ─────────────────────────────────────────────────── */
	.calendar-legend {
		display: flex;
		justify-content: center;
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-md);
		padding: var(--spacing-sm);
		flex-wrap: wrap;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		font-size: 0.875rem;
		color: var(--text-color);
	}

	.legend-color {
		width: 14px;
		height: 14px;
		border-radius: 4px;
		display: inline-block;
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
		to { transform: rotate(360deg); }
	}

	.calendar-container.loading {
		opacity: 0.4;
		pointer-events: none;
	}

	/* ─── Calendar Container ─────────────────────────────────────── */
	.calendar-container {
		margin: 0 var(--spacing-sm);
		background: var(--card-bg);
		border-radius: var(--radius-md);
		overflow: hidden;
		box-shadow: var(--shadow-md);
		height: calc(100vh - 380px);
		min-height: 400px;
		transition: opacity 0.3s ease;
	}

	/* ─── Custom Bottom Toolbar ───────────────────────────────────── */
	.calendar-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		margin: var(--spacing-sm) var(--spacing-sm) 0;
		background: var(--card-bg);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-sm);
	}

	.toolbar-center {
		order: 1;
		flex: 1 1 100%;
		text-align: center;
	}

	.toolbar-end {
		order: 2;
		display: flex;
		gap: 2px;
	}

	.toolbar-start {
		order: 3;
		display: flex;
		gap: 2px;
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
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--card-bg);
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

	.nav-btn:hover,
	.view-btn:hover {
		background: rgba(212, 68, 7, 0.08);
		border-color: var(--primary-color);
	}

	.view-btn.active {
		background: var(--primary-color);
		color: white;
		border-color: var(--primary-color);
	}

	.today-btn {
		font-weight: 600;
		color: var(--primary-color);
	}

	/* ─── Event Popup ────────────────────────────────────────────── */
	.event-popup {
		position: fixed;
		z-index: 1000;
		background: var(--card-bg);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		box-shadow: var(--shadow-lg);
		min-width: 240px;
		max-width: 320px;
		animation: popupFadeIn 0.15s ease-out;
	}

	@keyframes popupFadeIn {
		from { opacity: 0; transform: scale(0.95); }
		to { opacity: 1; transform: scale(1); }
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

	/* ─── Subscription Section ───────────────────────────────────── */
	.subscription-section {
		margin-top: var(--spacing-lg);
		border-top: 1px solid var(--border-color);
		padding-top: var(--spacing-md);
	}

	/* ─── Event Calendar Theme Overrides ──────────────────────────── */
	:global(.ec) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif !important;
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

	:global(.ec-event) {
		border-radius: 4px !important;
		font-size: 0.8rem !important;
	}

	/* Custom event card layout with location */
	:global(.ec-event-inner) {
		display: flex;
		flex-direction: column;
		gap: 1px;
		height: 100%;
		overflow: hidden;
		padding: 2px 0;
	}

	/* List view: flat row with title + location */
	:global(.ec-event-inner--list) {
		flex-direction: row;
		align-items: center;
		gap: 6px;
		height: auto;
		padding: 0;
		flexible-wrap: nowrap;
	}

	:global(.ec-event-time-custom) {
		font-size: 0.7rem;
		opacity: 0.85;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	:global(.ec-event-title-text) {
		font-weight: 600;
		font-size: 0.8rem;
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	:global(.ec-event-loc) {
		font-size: 0.68rem;
		opacity: 0.9;
		white-space: nowrap;
		overflow: hidden;
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
			--ec-bg-color: var(--card-bg) !important;
			--ec-text-color: var(--text-color) !important;
		}

		:global(.ec-day-head),
		:global(.ec-event-title),
		:global(.ec-event-time) {
			color: var(--text-color) !important;
		}

		.calendar-container {
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		}

		.calendar-toolbar {
			box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
		}
	}

	/* ─── Responsive ─────────────────────────────────────────────── */
	@media (max-width: 768px) {
		/* Hide location in mobile month view */
		:global(.ec-day-grid .ec-event-loc) {
			display: none !important;
		}

		.calendar-container {
			height: calc(100vh - 360px);
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
	}

	@media (min-width: 1024px) {
		.toolbar-center {
			order: 2;
			flex: 1 1 auto;
		}
		.toolbar-end {
			order: 1;
		}
		.toolbar-start {
			order: 3;
		}

		.calendar-container {
			height: calc(100vh - 320px);
		}
	}
</style>
