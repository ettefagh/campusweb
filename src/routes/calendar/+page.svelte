<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import Calendar from "@toast-ui/calendar";
	import "@toast-ui/calendar/dist/toastui-calendar.min.css";
	import { loadCalendarEvents } from "$lib/utils/icalParser";
	import type { CalendarEvent } from "$lib/utils/icalParser";
	import { calendarStore } from "$lib/stores/calendarStore";
	import SecureCalendarInput from "$lib/components/SecureCalendarInput.svelte";

	let calendarContainer: HTMLDivElement;
	let calendar: Calendar | null = null;
	let isLoading = true;
	let staticEvents: CalendarEvent[] = [];

	// State for events
	let currentSubs: any[] = [];

	function renderCalendar() {
		if (!calendar) return;

		// Update calendar definitions whenever we render
		const calendars = [
			{
				id: "lecture-free",
				name: "Lecture-Free Periods",
				backgroundColor: "#3b82f6",
				borderColor: "#2563eb",
				dragBackgroundColor: "#3b82f6",
			},
			{
				id: "exams",
				name: "Exams",
				backgroundColor: "#ef4444",
				borderColor: "#dc2626",
				dragBackgroundColor: "#ef4444",
			},
			...currentSubs.map((sub) => ({
				id: sub.id,
				name: sub.name,
				backgroundColor: sub.color,
				borderColor: sub.color,
				dragBackgroundColor: sub.color,
			})),
		];

		calendar.setCalendars(calendars);

		// Combine and render
		const subEvents = currentSubs.flatMap((s) => s.cachedEvents);
		calendar.clear();
		calendar.createEvents([...staticEvents, ...subEvents]);
	}

	// Subscribe to the store
	const unsubscribe = calendarStore.subscribe((subs) => {
		currentSubs = subs;
		renderCalendar();
	});

	onMount(() => {
		let isMounted = true;

		const init = async () => {
			// Initialize the calendar
			calendar = new Calendar(calendarContainer, {
				defaultView: "week",
				useFormPopup: false,
				useDetailPopup: true,
				isReadOnly: true,
				week: {
					startDayOfWeek: 1, // Monday
					dayNames: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
					narrowWeekend: false,
					workweek: true, // Shows Mon-Fri (5 days) - closest standard option
					showNowIndicator: true,
					showTimezoneCollapseButton: false,
					timezonesCollapsed: false,
					hourStart: 0,
					hourEnd: 24,
					eventView: true,
					taskView: false,
				},
				timezone: {
					zones: [
						{
							timezoneName: "Europe/Berlin",
							displayLabel: "Berlin",
						},
					],
				},
				theme: {
					common: {
						backgroundColor: "transparent",
						border: "1px solid var(--border-color)",
						gridSelection: {
							backgroundColor: "rgba(212, 68, 7, 0.1)",
							border: "1px solid var(--primary-color)",
						},
						dayName: {
							color: "var(--text-color)",
						},
						holiday: {
							color: "#ff4757",
						},
						saturday: {
							color: "var(--text-color-secondary)",
						},
						sunday: {
							color: "#ff4757",
						},
						today: {
							color: "var(--primary-color)",
						},
					},
					week: {
						today: {
							color: "var(--primary-color)",
							backgroundColor: "rgba(212, 68, 7, 0.05)",
						},
						dayName: {
							borderLeft: "1px solid var(--border-color)",
							backgroundColor: "var(--card-bg)",
						},
						dayGrid: {
							borderRight: "1px solid var(--border-color)",
						},
						timeGrid: {
							borderRight: "1px solid var(--border-color)",
						},
						timeGridLeft: {
							backgroundColor: "var(--card-bg)",
							borderRight: "1px solid var(--border-color)",
						},
						timeGridLeftAdditionalTimezone: {
							backgroundColor: "var(--card-bg)",
						},
						timeGridHourLine: {
							borderBottom: "1px solid var(--border-color)",
						},
						timeGridHalfHourLine: {
							borderBottom: "1px dashed rgba(0, 0, 0, 0.1)",
						},
						nowIndicatorLabel: {
							color: "var(--primary-color)",
						},
						nowIndicatorPast: {
							border: "1px dashed var(--primary-color)",
						},
						nowIndicatorBullet: {
							backgroundColor: "var(--primary-color)",
						},
						nowIndicatorToday: {
							border: "1px solid var(--primary-color)",
						},
						nowIndicatorFuture: {
							border: "none",
						},
						pastTime: {
							color: "var(--text-color-secondary)",
						},
						futureTime: {
							color: "var(--text-color)",
						},
						weekend: {
							backgroundColor: "rgba(0, 0, 0, 0.02)",
						},
					},
				},
				template: {
					time: function (event: any) {
						const locationHtml = event.location
							? `<div class="event-location">📍 ${event.location}</div>`
							: "";

						// Removed custom time div to avoid duplication with TUI default
						return `<div class="custom-event-template">
							<div class="event-time">${event.start.getHours()}:${event.start.getMinutes().toString().padStart(2, "0")}</div>
							<div class="event-title">${event.title}</div>
							${locationHtml}
						</div>`;
					},
				},
			});

			// Load data
			try {
				// 1. Trigger subscription refresh
				calendarStore.refreshAll();

				// 2. Load static events
				staticEvents = await loadCalendarEvents();

				if (!isMounted) return;

				// 3. Initial render with combined data
				renderCalendar();

				isLoading = false;
			} catch (error) {
				console.error("Failed to load calendar events:", error);
				if (isMounted) isLoading = false;
			}
		};

		init();

		// Cleanup on unmount
		return () => {
			isMounted = false;
			if (calendar) {
				calendar.destroy();
			}
			unsubscribe();
		};
	});

	function goToToday() {
		if (calendar) {
			calendar.today();
		}
	}

	function goToPrev() {
		if (calendar) {
			calendar.prev();
		}
	}

	function goToNext() {
		if (calendar) {
			calendar.next();
		}
	}
</script>

<svelte:head>
	<title>Calendar - SRH Campus Hub</title>
</svelte:head>

<div class="calendar-page">
	<header class="page-header">
		<h1>📅 Calendar</h1>
		<p class="subtitle">University events and your schedule</p>
	</header>

	<div class="calendar-controls">
		<button
			class="control-btn"
			on:click={goToPrev}
			aria-label="Previous week"
		>
			← Previous
		</button>
		<button class="control-btn today-btn" on:click={goToToday}>
			Today
		</button>
		<button class="control-btn" on:click={goToNext} aria-label="Next week">
			Next →
		</button>
	</div>

	<div class="calendar-legend">
		<div class="legend-item">
			<span class="legend-color" style="background-color: #3b82f6;"
			></span>
			<span>Lecture-Free Periods</span>
		</div>
		<div class="legend-item">
			<span class="legend-color" style="background-color: #ef4444;"
			></span>
			<span>Exams</span>
		</div>
	</div>

	{#if isLoading}
		<div class="loading-state">
			<p>Loading calendar events...</p>
		</div>
	{/if}

	<div class="calendar-container" bind:this={calendarContainer}></div>

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
		padding: var(--spacing-lg) 0;
		margin-bottom: var(--spacing-md);
	}

	h1 {
		margin-bottom: var(--spacing-sm);
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

	.calendar-controls {
		display: flex;
		justify-content: center;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-md);
		padding: 0 var(--spacing-md);
	}

	.control-btn {
		padding: var(--spacing-sm) var(--spacing-md);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background: var(--card-bg);
		color: var(--text-color);
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: var(--touch-target-min);
	}

	.control-btn:hover {
		background: rgba(212, 68, 7, 0.1);
		border-color: var(--primary-color);
	}

	.today-btn {
		font-weight: 600;
		color: var(--primary-color);
	}

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
		width: 16px;
		height: 16px;
		border-radius: 4px;
		display: inline-block;
	}

	.loading-state {
		text-align: center;
		padding: var(--spacing-xl);
		color: var(--text-color-secondary);
	}

	.calendar-container {
		height: calc(100vh - 450px);
		min-height: 500px;
		margin: 0 var(--spacing-sm);
		background: var(--card-bg);
		border-radius: var(--radius-md);
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.subscription-section {
		margin-top: var(--spacing-lg);
		border-top: 1px solid var(--border-color);
		padding-top: var(--spacing-md);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.calendar-container {
			height: calc(100vh - 400px);
			margin: 0 var(--spacing-xs);
		}

		.control-btn {
			font-size: 0.85rem;
			padding: var(--spacing-xs) var(--spacing-sm);
		}

		h1 {
			font-size: 1.5rem;
		}
	}

	/* TUI Calendar customizations */
	:global(.toastui-calendar-layout) {
		font-family: var(--font-sans) !important;
	}

	:global(.toastui-calendar-week-view-day-names) {
		border-bottom: 2px solid var(--border-color) !important;
	}

	:global(.toastui-calendar-template-time) {
		color: var(--text-color) !important;
	}

	/* Dark mode adjustments */
	@media (prefers-color-scheme: dark) {
		:global(.toastui-calendar-week-view) {
			background: var(--card-bg) !important;
		}

		:global(.toastui-calendar-template-time) {
			color: var(--text-color) !important;
		}

		:global(.toastui-calendar-week-view-day-names) {
			background: var(--card-bg) !important;
		}

		.calendar-container {
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		}
	}

	/* Custom Event Template Styles */
	:global(.custom-event-template) {
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		padding: 2px;
		overflow: hidden;
	}

	:global(.event-time) {
		font-size: 0.75rem;
		opacity: 0.8;
		margin-bottom: 2px;
	}

	:global(.event-title) {
		font-weight: 600;
		font-size: 0.85rem;
		white-space: normal;
		word-break: break-word;
		line-height: 1.2;
		margin-bottom: 2px;
	}

	:global(.event-location) {
		font-size: 0.75rem;
		opacity: 0.9;
		white-space: normal;
		word-break: break-word;
		margin-top: 2px;
	}
</style>
