<script lang="ts">
	import LinkCard from "$lib/components/LinkCard.svelte";
	import IdSlider from "$lib/components/IdSlider.svelte";
	import StoriesSlider from "$lib/components/StoriesSlider.svelte";
	import StorySuggestionModal from "$lib/components/StorySuggestionModal.svelte";
	import WeatherNotifications from "$lib/components/WeatherNotifications.svelte";
	import { cachedStories, getStories, storiesLoading } from "$lib/stores/feedCache";
	import { favorites } from "$lib/stores/favorites";
	import { allLinks } from "$lib/data/links";
	import { t } from "$lib/i18n";
	import { settingsStore, type HomeSection } from "$lib/stores/settingsStore";
	import { getCalendarEvents } from "$lib/stores/calendarCache";
	import { activeClasses, calendarStore, holidayEvents, type CalendarSubscription } from "$lib/stores/calendarStore";
	import { classColors } from "$lib/stores/classColors";
	import type { CalendarEvent } from "$lib/utils/icalParser";
	import { focusTrap } from "$lib/utils/focusTrap";
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import SectionHeader from "$lib/components/SectionHeader.svelte";
	import Sortable from 'sortablejs';

	function sortableFavorites(node: HTMLElement, options: { enabled: boolean }) {
		let sortable: Sortable | null = null;
		function update(opts: { enabled: boolean }) {
			if (opts.enabled) {
				if (!sortable) {
					sortable = new Sortable(node, {
						animation: 150,
						draggable: '.link-card-container',
						onEnd: (evt) => {
							if (evt.oldDraggableIndex !== undefined && evt.newDraggableIndex !== undefined && evt.oldDraggableIndex !== evt.newDraggableIndex) {
								favorites.reorder(evt.oldDraggableIndex, evt.newDraggableIndex);
							}
						}
					});
				}
			} else {
				if (sortable) {
					sortable.destroy();
					sortable = null;
				}
			}
		}
		
		update(options);
		
		return {
			update,
			destroy() {
				if (sortable) sortable.destroy();
			}
		};
	}

	function sortableHomeBlocks(node: HTMLElement, options: { enabled: boolean }) {
		let sortable: Sortable | null = null;

		function update(opts: { enabled: boolean }) {
			if (opts.enabled) {
				if (!sortable) {
					sortable = new Sortable(node, {
						animation: 180,
						draggable: ".home-block",
						handle: ".home-block-drag-handle",
						ghostClass: "home-block-ghost",
						chosenClass: "home-block-chosen",
						dragClass: "home-block-dragging",
						delay: 90,
						delayOnTouchOnly: true,
						touchStartThreshold: 5,
						onEnd: () => {
							const orderedIds = Array.from(node.querySelectorAll<HTMLElement>(".home-block"))
								.map((el) => el.dataset.sectionId)
								.filter((id): id is string => Boolean(id));

							reorderHomeBlocks(orderedIds);
						}
					});
				}
			} else if (sortable) {
				sortable.destroy();
				sortable = null;
			}
		}

		update(options);

		return {
			update,
			destroy() {
				if (sortable) sortable.destroy();
			}
		};
	}

	let showGoToTop = false;
	let container: HTMLElement | null = null;
	$: isStoriesLoading = $storiesLoading;
	let upcomingEvents: CalendarEvent[] = [];
	let staticCalendarEvents: CalendarEvent[] = [];
	let calendarSubscriptions: CalendarSubscription[] = [];
	let isLoadingCalendarPreview = false;
	let selectedCalendarEvent: CalendarEvent | null = null;
	let calendarWidgetMode: "today" | "next" = "today";
	let calendarWidgetTitle = "";
	let calendarWidgetEmptyText = "";
	let returnFocusElement: HTMLElement | null = null;
	let loadedCalendarAuthState: boolean | null = null;

	function getGreeting() {
		const hour = new Date().getHours();
		if (hour < 12) return 'Good morning';
		if (hour < 18) return 'Good afternoon';
		return 'Good evening';
	}

	onMount(() => {
		getStories();
		calendarStore.refreshAll();
		if ($settingsStore.defaultPage === 'calendar') {
			goto('/calendar', { replaceState: true });
		}
		container = document.querySelector(".app-container");
		const handleScroll = () => {
			if (container) {
				showGoToTop = container.scrollTop > 300;
			}
		};
		container?.addEventListener("scroll", handleScroll);
		const unsubscribeCalendar = calendarStore.subscribe((subscriptions) => {
			calendarSubscriptions = subscriptions;
			updateUpcomingEvents();
		});
		const unsubscribeSettings = settingsStore.subscribe((settings) => {
			loadCalendarPreview(settings.emailVerified);
		});
		loadCalendarPreview($settingsStore.emailVerified);
		return () => {
			container?.removeEventListener("scroll", handleScroll);
			unsubscribeCalendar();
			unsubscribeSettings();
		};
	});

	$: {
		$holidayEvents;
		calendarWidgetMode;
		updateUpcomingEvents();
	}

	$: calendarWidgetMode = $settingsStore.calendarWidgetMode || "today";
	$: calendarWidgetTitle = calendarWidgetMode === "next" ? $t.home.nextEvents : getTodayCalendarTitle();
	$: calendarWidgetEmptyText =
		calendarWidgetMode === "next" ? $t.home.calendarPreparedNext : $t.home.calendarPreparedToday;

	async function loadCalendarPreview(isVerified: boolean) {
		if (loadedCalendarAuthState === isVerified) return;
		loadedCalendarAuthState = isVerified;
		isLoadingCalendarPreview = true;
		try {
			staticCalendarEvents = await getCalendarEvents(isVerified);
		} catch {
			staticCalendarEvents = [];
		} finally {
			isLoadingCalendarPreview = false;
			updateUpcomingEvents();
		}
	}

	function updateUpcomingEvents() {
		const now = Date.now();
		const previewLimit = 4;
		const subscriptionEvents = calendarSubscriptions.flatMap((subscription) => subscription.cachedEvents);
		const allEvents = [...staticCalendarEvents, ...subscriptionEvents, ...$holidayEvents];
		const mode = calendarWidgetMode;
		const today = new Date();
		const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
		const dayEnd = dayStart + 24 * 60 * 60 * 1000;
		const filteredEvents = (mode === "today"
			? allEvents.filter((event) => {
					const start = event.start.getTime();
					return start >= dayStart && start < dayEnd;
				})
			: allEvents.filter((event) => event.end.getTime() >= now)
		).sort((a, b) => a.start.getTime() - b.start.getTime());
		const timedEvents = filteredEvents.filter((event) => !event.allDay).slice(0, previewLimit);
		if (timedEvents.length >= previewLimit) {
			upcomingEvents = timedEvents;
			return;
		}
		const allDayEvents = filteredEvents
			.filter((event) => event.allDay)
			.slice(0, previewLimit - timedEvents.length);
		upcomingEvents = [...timedEvents, ...allDayEvents].sort(
			(a, b) => a.start.getTime() - b.start.getTime()
		);
	}

	function formatEventTime(event: CalendarEvent) {
		if (event.allDay) return $t.calendar.allDay || "All day";
		const start = event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
		const end = event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
		return `${start} - ${end}`;
	}

	function formatEventDate(event: CalendarEvent) {
		return event.start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
	}

	function formatEventStartTime(event: CalendarEvent) {
		if (event.allDay) return $t.calendar.allDay || "All day";
		return event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}

	function formatEventEndTime(event: CalendarEvent) {
		if (event.allDay) return "";
		return event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}

	function formatEventFullDate(event: CalendarEvent) {
		return event.start.toLocaleDateString([], {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric"
		});
	}

	function getEventAriaLabel(event: CalendarEvent) {
		return `${event.title}, ${formatEventDate(event)}, ${formatEventTime(event)}. ${$t.home.openCalendarEventDetails}`;
	}

	function openCalendarEvent(event: CalendarEvent, trigger: Event) {
		returnFocusElement = trigger.currentTarget as HTMLElement;
		selectedCalendarEvent = event;
	}

	function closeCalendarEvent() {
		selectedCalendarEvent = null;
		setTimeout(() => returnFocusElement?.focus(), 0);
	}

	function getLocationHref(event: CalendarEvent) {
		const locationUrl = event.extendedProps?.locationUrl;
		if (locationUrl) return locationUrl;
		const location = event.extendedProps?.location;
		if (!location) return "";
		const trimmed = location.trim();
		if (!trimmed || trimmed.toLowerCase() === "online" || /^https?:\/\//i.test(trimmed)) return "";
		return `https://maps.google.com/?q=${encodeURIComponent(location)}`;
	}

	function resolveEventDotColor(event: CalendarEvent) {
		const classGroupId = event.extendedProps?.classGroupId;
		if (classGroupId) {
			const customColor = $classColors[classGroupId];
			if (customColor) return customColor;
			const classDef = $activeClasses.find((cls) => cls.id === classGroupId);
			if (classDef?.defaultColor) return classDef.defaultColor;
		}
		return event.backgroundColor || "var(--primary-color)";
	}

	function getTodayCalendarTitle() {
		const now = new Date();
		const weekday = now.toLocaleDateString([], { weekday: "long" });
		return `${weekday} ${now.getDate()}`;
	}

	function goToTop() {
		container?.scrollTo({ top: 0, behavior: "smooth" });
	}

	function triggerExploreSearch() {
		goto("/explore?focus=true");
	}

	let isEditMode = false;
	let isManagingFavorites = false;
	let isArrangingHomeBlocks = false;
	let isStorySuggestionOpen = false;
	let searchQuery = "";
	let draggedFavoriteId = "";

	let displayLinks: typeof allLinks = [];
	$: displayLinks = isEditMode
		? allLinks.filter((link) => {
				const query = searchQuery.toLowerCase().trim();
				if (!query) return true;
				const title = $t.linkTitle?.[link.id as keyof typeof $t.linkTitle] || link.title;
				const desc = $t.linkDesc?.[link.id as keyof typeof $t.linkDesc] || link.description || "";
				return (
					title.toLowerCase().includes(query) ||
					desc.toLowerCase().includes(query)
				);
			})
		: $favorites
				.map((favId) => allLinks.find((link) => link.id === favId))
				.filter((link): link is typeof allLinks[number] => !!link);
	$: availableHomeBlocks = $settingsStore.homeSections.filter(
		(section) => section.id !== "header" && !section.enabled
	);

	function toggleEditMode() {
		isEditMode = !isEditMode;
		searchQuery = "";
	}

	function startManagingFavorites() {
		isArrangingHomeBlocks = false;
		isManagingFavorites = true;
		isEditMode = false;
		searchQuery = "";
	}

	function finishManagingFavorites() {
		isManagingFavorites = false;
		isEditMode = false;
		searchQuery = "";
		draggedFavoriteId = "";
	}

	function handleToggleFavorite(event: CustomEvent<{ linkId: string }>) {
		favorites.toggle(event.detail.linkId);
	}

	function getHomeSectionLabel(id: string) {
		if (id === "stories") return $t.home.campusStories;
		if (id === "favorites") return $t.home.universityLinks || $t.settings.favoriteLinks;
		if (id === "cards") return $t.settings.cards;
		if (id === "calendar") return $t.home.calendarSchedule;
		if (id === "feed") return $t.home.campusFeed;
		return id;
	}

	function getHomeSectionDescription(id: string) {
		if (id === "stories") return $t.home.campusStoriesDesc;
		if (id === "favorites") return $t.home.customBookmarks;
		if (id === "cards") return $t.home.cardsDesc;
		if (id === "calendar") return $t.settings.calendarWidgetModeDesc;
		if (id === "feed") return $t.home.feedPrepared;
		return $t.home.homeBlockFallbackDesc;
	}

	function getHomeSectionIcon(id: string) {
		if (id === "stories") return "ph-bold ph-circles-three-plus";
		if (id === "favorites") return "ph-bold ph-star";
		if (id === "cards") return "ph-bold ph-identification-card";
		if (id === "calendar") return "ph-bold ph-calendar";
		if (id === "feed") return "ph-bold ph-newspaper";
		return "ph-bold ph-squares-four";
	}

	function reorderHomeBlocks(orderedBlockIds: string[]) {
		const sectionsById = new Map($settingsStore.homeSections.map((section) => [section.id, section]));
		const header = sectionsById.get("header") ?? { id: "header", enabled: true };
		const orderedBlocks = orderedBlockIds
			.map((id) => sectionsById.get(id))
			.filter((section): section is HomeSection => Boolean(section));
		const remainingSections = $settingsStore.homeSections.filter(
			(section) => section.id !== "header" && !orderedBlockIds.includes(section.id)
		);

		settingsStore.patch({ homeSections: [header, ...orderedBlocks, ...remainingSections] });
	}

	function setHomeBlockEnabled(id: string, enabled: boolean) {
		const sectionsById = new Map($settingsStore.homeSections.map((section) => [section.id, section]));
		const header = sectionsById.get("header") ?? { id: "header", enabled: true };
		const target = sectionsById.get(id);
		if (!target || id === "header") return;

		const activeBlocks = $settingsStore.homeSections.filter(
			(section) => section.id !== "header" && section.id !== id && section.enabled
		);
		const inactiveBlocks = $settingsStore.homeSections.filter(
			(section) => section.id !== "header" && section.id !== id && !section.enabled
		);
		const updatedTarget = { ...target, enabled };
		const nextSections = enabled
			? [header, ...activeBlocks, updatedTarget, ...inactiveBlocks]
			: [header, ...activeBlocks, ...inactiveBlocks, updatedTarget];

		settingsStore.patch({ homeSections: nextSections });
	}

	function toggleHomeBlockArrangeMode() {
		isArrangingHomeBlocks = !isArrangingHomeBlocks;
		if (isArrangingHomeBlocks) {
			finishManagingFavorites();
			isArrangingHomeBlocks = true;
		}
	}
</script>

<svelte:head>
	<title>{$t.home.pageTitle}</title>
	<meta
		name="description"
		content={$t.home.subtitle}
	/>
</svelte:head>

<div class="home-page">
	{#each $settingsStore.homeSections as section, i (section.id)}
		{#if section.enabled && section.id === "header"}
			<header class="home-hero" class:compact={$settingsStore.headerSize === 'small'}>
				<div class="home-hero-top">
					<div class="home-greeting">
						<span>{getGreeting()}</span>
						<h1>{$settingsStore.firstName ? `Hi, ${$settingsStore.firstName}!` : $t.home.welcomeBack}</h1>
					</div>
					<WeatherNotifications campusId={$settingsStore.campusId} />
				</div>
				<div class="home-context">
					<img
						src="/icon-light.png"
						alt=""
						class="home-context-logo light-mode"
						width="32"
						loading="eager"
						fetchpriority="high"
					/>
					<img
						src="/icon-dark.png"
						alt=""
						class="home-context-logo dark-mode"
						width="32"
						loading="eager"
						fetchpriority="high"
					/>
					<p>{$t.home.subtitle}</p>
				</div>
			</header>
		{/if}
	{/each}

	<div class="home-blocks masonry-layout" class:is-arranging={isArrangingHomeBlocks} use:sortableHomeBlocks={{ enabled: isArrangingHomeBlocks }}>
		{#each $settingsStore.homeSections as section, i (section.id)}
			{#if section.enabled && section.id !== "header"}
				<div
					class="home-block"
					class:home-block--full={section.id === "stories"}
					class:is-arranging={isArrangingHomeBlocks}
					data-section-id={section.id}
					style={i <= 1 ? "" : `animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; animation-delay: ${i * 100}ms;`}
				>
					{#if section.id === "stories"}
						<section class="stories-section" id="stories">
							<StoriesSlider stories={$cachedStories} loading={isStoriesLoading} allowSuggestions={true} variant="rectangular" />
						</section>
					{:else if section.id === "favorites"}
						<section class="links-section" id="favorites" use:sortableFavorites={{ enabled: isManagingFavorites && !isEditMode && !isArrangingHomeBlocks }}>
							<SectionHeader title={$t.home.universityLinks || $t.settings.favoriteLinks} subtitle={$t.home.customBookmarks}>

								<div class="favorite-links-actions">
									{#if isManagingFavorites}
										<button
											class="favorite-icon-btn passive"
											type="button"
											aria-label={$t.home.dragReorder}
											title={$t.home.dragReorder}
										>
											<i class="ph-bold ph-dots-six-vertical"></i>
										</button>
										<button
											class="favorite-icon-btn"
											class:active={isEditMode}
											type="button"
											on:click={toggleEditMode}
											aria-label={$t.home.editFavorites}
											title={$t.home.editFavorites}
										>
											<i class="ph-bold ph-pencil-simple"></i>
											<span>{$t.home.edit}</span>
										</button>
										<button
											class="favorite-icon-btn done"
											type="button"
											on:click={finishManagingFavorites}
											aria-label={$t.home.doneManaging}
											title={$t.home.done}
										>
											<i class="ph-bold ph-check"></i>
										</button>
									{:else}
										<button 
											class="section-action-btn"
											type="button"
											on:click={startManagingFavorites}
										>
											Manage
										</button>
									{/if}
								</div>
							</SectionHeader>

							{#if displayLinks.length === 0}
								<div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
									<p>{$t.home.emptyState}</p>
								</div>
							{:else}
								{#each displayLinks as link (link.id)}
									<LinkCard
										{link}
										isFavorite={$favorites.includes(link.id)}
										editMode={isEditMode}
										reorderMode={isManagingFavorites && !isEditMode && !isArrangingHomeBlocks}
										useViewer={!isEditMode && !isManagingFavorites && !isArrangingHomeBlocks}
										variant="compact-list"
										on:toggleFavorite={handleToggleFavorite}
									/>
								{/each}
							{/if}
						</section>
					{:else if section.id === "cards"}
						<section class="links-section" id="wallet">
							<IdSlider />
						</section>
					{:else if section.id === "calendar"}
						<section class="links-section" id="calendar">
								<SectionHeader 
									title={calendarWidgetTitle} 
									href="/calendar"
									hrefLabel="{$t.home?.viewAll || 'View Full Calendar'} →"
								/>
								<div class="calendar-preview">
									{#if isLoadingCalendarPreview}
										<p class="calendar-preview-empty">{$t.calendar.loading || "Loading calendar..."}</p>
									{:else if upcomingEvents.length === 0}
										<p class="calendar-preview-empty">{calendarWidgetEmptyText}</p>
									{:else}
										<ul class="calendar-preview-list">
											{#each upcomingEvents as event (event.id)}
												<li class="calendar-preview-item">
												<button
													class="calendar-preview-button"
													type="button"
														aria-label={getEventAriaLabel(event)}
														on:click={(clickEvent) => openCalendarEvent(event, clickEvent)}
													>
														<div class="calendar-preview-dot" style={`background:${resolveEventDotColor(event)}`}></div>
														{#if ($settingsStore.calendarWidgetMode || "today") === "today"}
															<div class="calendar-preview-content calendar-preview-content-today">
																<div class="calendar-preview-main">
																	<p class="calendar-preview-title">{event.title}</p>
																	<p class="calendar-preview-meta">{formatEventStartTime(event)}</p>
																</div>
																<div class="calendar-preview-aside">
																	<p class="calendar-preview-meta">{event.extendedProps?.shortLocation || event.extendedProps?.location || ""}</p>
																	{#if !event.allDay}
																		<p class="calendar-preview-meta">{formatEventEndTime(event)}</p>
																	{/if}
																</div>
															</div>
														{:else}
															<div class="calendar-preview-content">
																<p class="calendar-preview-title">{event.title}</p>
																<p class="calendar-preview-meta">
																	<span>{formatEventDate(event)} · {formatEventTime(event)}</span>
																</p>
															</div>
														{/if}
													</button>
												</li>
											{/each}
										</ul>
									{/if}
								</div>
						</section>
					{:else if section.id === "feed"}
						<section class="links-section" id="feed">
							<SectionHeader 
								title={$t.home.campusFeed} 
								href="/feed"
								hrefLabel="{$t.home?.viewAllNews || 'View All News'} →"
							/>
							<div class="modular-placeholder glass">
								<p>{$t.home.feedPrepared}</p>
							</div>
						</section>
					{/if}

					{#if isArrangingHomeBlocks}
						<div class="home-block-controls">
							<button
								class="home-block-drag-handle"
								type="button"
								aria-label={`${$t.home.dragHomeBlock}: ${getHomeSectionLabel(section.id)}`}
								title={$t.home.dragHomeBlock}
								on:click|preventDefault
							>
								<i class="ph-bold ph-dots-six-vertical" aria-hidden="true"></i>
								<span>{getHomeSectionLabel(section.id)}</span>
							</button>
							{#if section.id === "calendar"}
								<div
									class="home-block-type-control"
									role="group"
									aria-label={$t.settings.calendarWidgetMode}
								>
									<select
										aria-label={$t.settings.calendarWidgetMode}
										value={$settingsStore.calendarWidgetMode || "today"}
										on:change={(event) =>
											settingsStore.patch({
												calendarWidgetMode: (event.currentTarget as HTMLSelectElement).value as "today" | "next"
											})
										}
									>
										<option value="today">{$t.settings.calendarWidgetToday}</option>
										<option value="next">{$t.settings.calendarWidgetNext}</option>
									</select>
								</div>
							{/if}
							<button
								class="home-block-control-btn remove"
								type="button"
								aria-label={`${$t.home.removeBlock}: ${getHomeSectionLabel(section.id)}`}
								on:click={() => setHomeBlockEnabled(section.id, false)}
							>
								<i class="ph-bold ph-minus-circle" aria-hidden="true"></i>
								<span>{$t.home.removeBlock}</span>
							</button>
						</div>
					{/if}
				</div>
			{/if}
		{/each}

		{#if isArrangingHomeBlocks}
			<section class="available-blocks-panel" aria-labelledby="available-home-blocks-title">
				<div class="available-blocks-header">
					<span class="available-blocks-kicker">{$t.home.availableBlocksKicker}</span>
					<h2 id="available-home-blocks-title">{$t.home.availableBlocks}</h2>
					<p>{$t.home.availableBlocksDesc}</p>
				</div>

				{#if availableHomeBlocks.length === 0}
					<p class="available-blocks-empty">{$t.home.noAvailableBlocks}</p>
				{:else}
					<div class="available-blocks-list">
						{#each availableHomeBlocks as section (section.id)}
							<article class="available-block-card">
								<span class="available-block-icon" aria-hidden="true">
									<i class={getHomeSectionIcon(section.id)}></i>
								</span>
								<div class="available-block-copy">
									<h3>{getHomeSectionLabel(section.id)}</h3>
									<p>{getHomeSectionDescription(section.id)}</p>
								</div>
								<button
									class="home-block-control-btn add"
									type="button"
									aria-label={`${$t.home.addBlock}: ${getHomeSectionLabel(section.id)}`}
									on:click={() => setHomeBlockEnabled(section.id, true)}
								>
									<i class="ph-bold ph-plus-circle" aria-hidden="true"></i>
									<span>{$t.home.addBlock}</span>
								</button>
							</article>
						{/each}
					</div>
				{/if}
			</section>
		{/if}
	</div>

	<div class="fab-group">
		<button
			class="fab-btn arrange-blocks"
			class:active={isArrangingHomeBlocks}
			type="button"
			on:click={toggleHomeBlockArrangeMode}
			aria-label={isArrangingHomeBlocks ? $t.home.doneArrangeBlocks : $t.home.arrangeBlocks}
			title={isArrangingHomeBlocks ? $t.home.doneArrangeBlocks : $t.home.arrangeBlocks}
		>
			{#if isArrangingHomeBlocks}
				<i class="ph-bold ph-check" aria-hidden="true"></i>
			{:else}
				<i class="ph-bold ph-squares-four" aria-hidden="true"></i>
			{/if}
		</button>
		{#if showGoToTop}
			<button class="fab-btn go-to-top glass" on:click={goToTop} aria-label={$t.home.goToTop}>
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="18 15 12 9 6 15"></polyline>
				</svg>
			</button>
		{/if}
	</div>
</div>

<StorySuggestionModal bind:isOpen={isStorySuggestionOpen} />

{#if selectedCalendarEvent}
	<div
		class="home-event-modal-backdrop popup-backdrop-safe"
		role="presentation"
		on:click={closeCalendarEvent}
		on:keydown={(event) => event.key === "Escape" && closeCalendarEvent()}
	>
		<div
			class="home-event-modal popup-panel-safe"
			role="dialog"
			aria-modal="true"
			aria-labelledby="home-event-modal-title"
			tabindex="-1"
			use:focusTrap
			on:click|stopPropagation
			on:keydown|stopPropagation
		>
			<button
				class="popup-close home-event-modal-close"
				type="button"
				on:click={closeCalendarEvent}
				aria-label={$t.home.closeCalendarEventDetails}
			>
				<i class="ph-bold ph-x" aria-hidden="true"></i>
			</button>
			<div class="home-event-modal-head">
				<h3 id="home-event-modal-title">{selectedCalendarEvent.title}</h3>
			</div>
			<div class="home-event-detail-list">
				<p>
					<span>{$t.calendar.time}</span>
					<strong>{formatEventFullDate(selectedCalendarEvent)} · {formatEventTime(selectedCalendarEvent)}</strong>
				</p>
					{#if selectedCalendarEvent.extendedProps?.location || selectedCalendarEvent.extendedProps?.shortLocation || selectedCalendarEvent.extendedProps?.locationUrl}
						<p>
							<span>{$t.calendar.location}</span>
							{#if selectedCalendarEvent.extendedProps?.locationUrl}
								<a href={selectedCalendarEvent.extendedProps.locationUrl} target="_blank" rel="noopener noreferrer">
									{selectedCalendarEvent.extendedProps?.shortLocation || selectedCalendarEvent.extendedProps?.location || $t.calendar.online}
								</a>
							{:else if getLocationHref(selectedCalendarEvent)}
								<a href={getLocationHref(selectedCalendarEvent)} target="_blank" rel="noopener noreferrer">
									{selectedCalendarEvent.extendedProps?.shortLocation || selectedCalendarEvent.extendedProps?.location}
								</a>
							{:else}
								<strong>{selectedCalendarEvent.extendedProps?.shortLocation || selectedCalendarEvent.extendedProps?.location || $t.calendar.online}</strong>
							{/if}
						</p>
					{/if}
			</div>
			{#if selectedCalendarEvent.extendedProps?.description}
				<p class="home-event-description">{selectedCalendarEvent.extendedProps.description}</p>
			{/if}
		</div>
	</div>
{/if}

<style>
	.home-page {
		width: min(calc(100vw - 32px), 460px);
		max-width: 460px;
		box-sizing: border-box;
		margin: 0 auto;
		padding: 10px 18px calc(var(--spacing-xl) * 3.1);
		display: flex;
		flex-direction: column;
		gap: 28px;
		overflow-x: hidden;
	}

	.home-hero {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 22px;
		padding-top: max(18px, env(safe-area-inset-top));
	}

	.home-hero.compact {
		gap: 14px;
	}

	.home-hero-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
	}

	.home-greeting {
		min-width: 0;
		padding-right: 50px;
	}

	.home-greeting span {
		display: block;
		color: var(--primary-color);
		font-family: "SRH Headline", sans-serif;
		font-size: 1.15rem;
		font-weight: 900;
		line-height: 1.1;
		margin-bottom: 4px;
	}

	.home-greeting h1 {
		font-size: clamp(1.75rem, 6.2vw, 2rem);
		line-height: 0.96;
		margin: 0;
		color: var(--text-color);
		letter-spacing: 0;
	}



	.home-context {
		display: none;
		align-items: center;
		gap: 10px;
		color: var(--text-color-secondary);
	}

	.home-context-logo {
		width: 30px;
		height: auto;
		border-radius: 8px;
	}

	.home-context-logo.dark-mode {
		display: none;
	}

	@media (prefers-color-scheme: dark) {
		.home-context-logo.light-mode {
			display: none;
		}

		.home-context-logo.dark-mode {
			display: block;
		}
	}

	:global(html[data-theme="light"]) .home-context-logo.light-mode {
		display: block;
	}

	:global(html[data-theme="light"]) .home-context-logo.dark-mode {
		display: none;
	}

	:global(html[data-theme="dark"]) .home-context-logo.light-mode {
		display: none;
	}

	:global(html[data-theme="dark"]) .home-context-logo.dark-mode {
		display: block;
	}

	.home-context p {
		margin: 0;
		font-size: 0.94rem;
		line-height: 1.35;
	}

		.stories-section,
		.links-section {
			max-width: 100%;
		}

		.home-blocks {
			width: 100%;
			max-width: 100%;
		}

		.home-block {
			position: relative;
			max-width: 100%;
		}

		.home-block--full {
			column-span: all;
		}

		.home-block.is-arranging {
			cursor: grab;
			-webkit-tap-highlight-color: transparent;
		}

		:global(.home-block-chosen) {
			cursor: grabbing;
		}

		:global(.home-block-ghost) {
			opacity: 0.42;
		}

			:global(.home-block-dragging) {
				transform: rotate(0.4deg);
			}

			.home-block-controls {
				width: 100%;
				min-width: min-content;
				display: grid;
				grid-template-columns: minmax(min-content, 1fr) auto auto;
				gap: 8px;
				margin-top: 8px;
			}

			.home-block-drag-handle {
				width: 100%;
				min-height: 42px;
				display: inline-flex;
				align-items: center;
				justify-content: center;
			gap: 8px;
			border: 1px dashed rgba(var(--primary-color-rgb), 0.36);
			border-radius: 14px;
			background: color-mix(in srgb, var(--primary-color), transparent 92%);
			color: var(--primary-color);
			font: inherit;
			font-size: 0.82rem;
			font-weight: 850;
			letter-spacing: 0.01em;
			cursor: grab;
			box-shadow: 0 8px 18px rgba(7, 19, 47, 0.06);
			touch-action: none;
		}

		.home-block-drag-handle:active {
			cursor: grabbing;
		}

			.home-block-drag-handle i {
				font-size: 1.05rem;
				line-height: 1;
			}

			.home-block-type-control {
				min-height: 42px;
				min-width: min-content;
				display: inline-flex;
				align-items: stretch;
				border: 1px solid var(--surface-border);
				border-radius: 14px;
				background: var(--surface-soft);
				overflow: hidden;
			}

			.home-block-type-control select {
				min-width: min-content;
				width: 100%;
				border: 0;
				background: transparent;
				color: var(--text-color);
				font: inherit;
				font-size: 0.8rem;
				font-weight: 850;
				line-height: 1.05;
				padding: 0 34px 0 12px;
				cursor: pointer;
				appearance: none;
				-webkit-appearance: none;
				-moz-appearance: none;
				background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
				background-position: calc(100% - 16px) calc(50% + 1px), calc(100% - 10px) calc(50% + 1px);
				background-size: 6px 6px, 6px 6px;
				background-repeat: no-repeat;
				padding-right: 30px;
			}

			.home-block-type-control select:hover,
			.home-block-type-control select:focus-visible {
				outline: none;
				background-color: var(--surface-solid);
				color: var(--primary-color);
			}

			.home-block-type-control select option {
				color: var(--text-color);
				background: var(--surface-solid);
			}

			.home-block-control-btn {
				min-height: 42px;
				display: inline-flex;
				align-items: center;
				justify-content: center;
				gap: 7px;
				border: 1px solid var(--surface-border);
				border-radius: 14px;
				background: var(--surface-solid);
				color: var(--text-color);
				font: inherit;
				font-size: 0.82rem;
				font-weight: 850;
				cursor: pointer;
				transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
				-webkit-tap-highlight-color: transparent;
			}

			.home-block-control-btn:hover,
			.home-block-control-btn:focus-visible {
				transform: translateY(-1px);
				outline: none;
			}

			.home-block-control-btn.remove {
				padding: 0 12px;
				color: var(--text-color-secondary);
			}

			.home-block-control-btn.remove:hover,
			.home-block-control-btn.remove:focus-visible {
				border-color: rgba(207, 63, 50, 0.35);
				background: rgba(207, 63, 50, 0.08);
				color: #cf3f32;
			}

			.home-block-control-btn.add {
				flex: 0 0 auto;
				padding: 0 13px;
				border-color: rgba(var(--primary-color-rgb), 0.26);
				background: color-mix(in srgb, var(--primary-color), transparent 91%);
				color: var(--primary-color);
			}

			.available-blocks-panel {
				grid-column: 1 / -1;
				min-width: min-content;
				border: 1px solid var(--surface-border);
				border-radius: 18px;
				background: linear-gradient(180deg, var(--surface-solid), var(--surface-soft));
				box-shadow: var(--campus-shadow-soft);
				padding: 18px;
			}

			.available-blocks-header {
				display: grid;
				gap: 5px;
				margin-bottom: 14px;
			}

			.available-blocks-kicker {
				color: var(--primary-color);
				font-size: 0.76rem;
				font-weight: 900;
				letter-spacing: 0.06em;
				text-transform: uppercase;
			}

			.available-blocks-header h2 {
				margin: 0;
				font-size: 1.13rem;
				line-height: 1.1;
			}

			.available-blocks-header p,
			.available-blocks-empty {
				margin: 0;
				color: var(--text-color-secondary);
				font-size: 0.88rem;
				line-height: 1.38;
			}

			.available-blocks-list {
				display: grid;
				gap: 10px;
			}

			.available-block-card {
				min-width: min-content;
				display: grid;
				grid-template-columns: auto minmax(min-content, 1fr) auto;
				align-items: center;
				gap: 12px;
				padding: 12px;
				border: 1px solid var(--surface-border);
				border-radius: 14px;
				background: var(--surface-solid);
			}

			.available-block-icon {
				width: 42px;
				height: 42px;
				display: grid;
				place-items: center;
				border-radius: 12px;
				background: color-mix(in srgb, var(--primary-color), transparent 88%);
				color: var(--primary-color);
				flex: 0 0 auto;
			}

			.available-block-icon i {
				font-size: 1.35rem;
				line-height: 1;
			}

			.available-block-copy {
				min-width: min-content;
			}

			.available-block-copy h3,
			.available-block-copy p {
				margin: 0;
			}

			.available-block-copy h3 {
				font-size: 0.96rem;
				line-height: 1.18;
			}

			.available-block-copy p {
				margin-top: 3px;
				color: var(--text-color-secondary);
				font-size: 0.8rem;
				line-height: 1.25;
			}

		.links-section {
		background: var(--surface-solid);
		border: 1px solid var(--surface-border);
		border-radius: 16px;
		box-shadow: var(--campus-shadow-soft);
		overflow: hidden;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.stories-section {
		overflow: visible;
	}

	.links-section :global(.modular-section-header) {
		padding: 18px 20px 8px;
		margin-bottom: 0;
		gap: 12px;
	}

	.links-section :global(.title-group) {
		min-width: 0;
	}

	.links-section :global(.title-group h2) {
		font-size: 1.22rem;
		white-space: nowrap;
	}

	.links-section :global(.actions) {
		flex: 0 0 auto;
	}



	.links-section :global(.link-card-container:not(:last-child) .link-card.compact-list) {
		border-bottom: 1px solid rgba(7, 19, 47, 0.08);
	}

	:global([data-theme="dark"]) .links-section :global(.link-card-container:not(:last-child) .link-card.compact-list) {
		border-bottom-color: rgba(255, 255, 255, 0.08);
	}




	.empty-state {
		text-align: center;
		padding: var(--spacing-xl);
		color: var(--text-color-secondary);
	}

	.stories-section {
		display: block !important;
		grid-column: 1 / -1;
	}

	.modular-placeholder {
		background: var(--glass-bg-light);
		backdrop-filter: var(--glass-blur);
		-webkit-backdrop-filter: var(--glass-blur);
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-xl);
		padding: var(--spacing-xl) var(--spacing-lg);
		text-align: center;
		color: var(--text-color-secondary);
		margin: 0;
	}

	.modular-placeholder p {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.calendar-preview {
		padding: 8px 16px 16px;
	}

	.calendar-preview-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.calendar-preview-item {
		display: block;
	}

	.calendar-preview-button {
		width: 100%;
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px 12px;
		border: 1px solid var(--surface-border);
		border-radius: 10px;
		background: var(--surface-soft);
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.calendar-preview-button:hover,
	.calendar-preview-button:focus-visible {
		border-color: rgba(var(--primary-color-rgb), 0.34);
		box-shadow: 0 8px 18px rgba(7, 19, 47, 0.08);
	}

	.calendar-preview-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		margin-top: 7px;
		flex: 0 0 auto;
	}

		.calendar-preview-content {
			min-width: 0;
		}

		.calendar-preview-content-today {
			width: 100%;
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 8px;
			align-items: start;
		}

		.calendar-preview-main,
		.calendar-preview-aside {
			min-width: 0;
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.calendar-preview-aside {
			align-items: flex-end;
			text-align: right;
		}

	.calendar-preview-title {
		margin: 0;
		font-size: 0.92rem;
		font-weight: 700;
		line-height: 1.3;
		color: var(--text-color);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.calendar-preview-meta {
		margin: 5px 0 0;
		font-size: 0.8rem;
		color: var(--text-color-secondary);
		line-height: 1.3;
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
	}

	.calendar-preview-empty {
		margin: 0;
		padding: 12px;
		border: 1px dashed var(--border-color);
		border-radius: 10px;
		color: var(--text-color-secondary);
		font-size: 0.88rem;
		text-align: center;
	}

	.home-event-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding: 18px 18px calc(18px + var(--bottom-nav-clearance));
		background: rgba(7, 19, 47, 0.42);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}

	.home-event-modal {
		position: relative;
		width: min(100%, 430px);
		max-height: min(82vh, 620px);
		overflow: auto;
		border: 1px solid var(--surface-border);
		border-radius: 18px 18px 14px 14px;
		background: var(--surface-solid);
		box-shadow: var(--campus-shadow);
		padding: 20px;
		color: var(--text-color);
	}

	.home-event-modal-close {
		position: absolute;
		top: 12px;
		right: 12px;
		width: 38px;
		height: 38px;
		display: grid;
		place-items: center;
		border: 1px solid var(--surface-border);
		border-radius: 50%;
		background: var(--surface-soft);
		color: var(--text-color);
		cursor: pointer;
	}

	.home-event-modal-head {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 10px;
		padding-right: 44px;
	}

	.home-event-modal-head h3 {
		margin: 0;
		font-size: 1.18rem;
		line-height: 1.16;
		letter-spacing: 0;
	}

	.home-event-detail-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 18px;
	}

	.home-event-detail-list p,
	.home-event-description {
		margin: 0;
	}

	.home-event-detail-list p {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 11px 12px;
		border: 1px solid var(--surface-border);
		border-radius: 10px;
		background: var(--surface-soft);
	}

	.home-event-detail-list span {
		color: var(--text-color-secondary);
		font-size: 0.78rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.home-event-detail-list strong,
	.home-event-detail-list a {
		color: var(--text-color);
		font-size: 0.96rem;
		line-height: 1.35;
	}

	.home-event-description {
		margin-top: 14px;
		padding: 12px;
		border-radius: 10px;
		background: color-mix(in srgb, var(--primary-color), transparent 91%);
		color: var(--text-color-secondary);
		font-size: 0.9rem;
		line-height: 1.5;
		white-space: pre-wrap;
	}

	:global(html.a11y-high-contrast) .calendar-preview-button,
	:global(html.a11y-high-contrast) .home-event-modal,
	:global(html.a11y-high-contrast) .home-event-detail-list p {
		border-color: var(--border-color);
	}

	@media (min-width: 700px) {
		.home-event-modal-backdrop {
			align-items: center;
		}
	}



	.favorite-links-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
		flex-shrink: 0;
		padding: 4px;
		border: none;
		border-radius: 12px;
		background: transparent;
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
	}

	.favorite-icon-btn {
		min-height: var(--touch-target-min);
		border: 1px solid transparent;
		border-radius: calc(var(--radius-md) - 4px);
		background: transparent;
		font-size: 0.8rem;
		font-weight: 700;
		cursor: pointer;
		color: var(--text-color);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		-webkit-tap-highlight-color: transparent;
	}

	.favorite-icon-btn {
		min-width: var(--touch-target-min);
		padding: 0 12px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}

	.favorite-icon-btn i {
		font-size: 1rem;
		line-height: 1;
	}

	.favorite-icon-btn.passive {
		cursor: grab;
		color: var(--text-color-secondary);
		background: rgba(255, 255, 255, 0.32);
	}

	.favorite-icon-btn.done {
		background: var(--primary-color);
		color: white;
		border-color: var(--primary-color);
	}

	.favorite-icon-btn:hover,
	.favorite-icon-btn:focus-visible {
		background: rgba(212, 68, 7, 0.12);
		color: var(--primary-color);
		border-color: rgba(212, 68, 7, 0.22);
		outline: none;
	}

	.favorite-icon-btn.done:hover {
		background: var(--primary-color);
		color: white;
		border-color: var(--primary-color);
		filter: brightness(1.05);
	}

	.favorite-icon-btn.active {
		background: var(--primary-color);
		color: white;
		border-color: var(--primary-color);
		box-shadow: 0 2px 8px rgba(212, 68, 7, 0.3);
	}

	@media (max-width: 420px) {
		.favorite-links-actions {
			align-self: stretch;
			justify-content: space-between;
		}

		.favorite-icon-btn {
			flex: 1;
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

	.fab-group {
		position: fixed;
		bottom: 120px;
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

		.arrange-blocks {
			background: var(--surface-solid);
			border: 1px solid var(--surface-border);
			color: var(--text-color);
		}

		.arrange-blocks.active {
			background: var(--primary-color);
			border-color: var(--primary-color);
			color: white;
			box-shadow: 0 8px 22px rgba(212, 68, 7, 0.3);
		}

	@media (min-width: 1024px) {
		.home-page {
			width: min(100%, 1020px);
			max-width: 1020px;
			display: grid;
			grid-template-columns: minmax(0, 1fr) 390px;
			align-items: start;
			gap: 30px 32px;
			padding-top: 28px;
		}

		.home-hero,
		.stories-section {
			grid-column: 1 / -1;
		}

		.home-hero {
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(340px, 430px);
			align-items: end;
			gap: 24px;
		}

		.home-hero-top {
			align-items: center;
		}

			.home-context {
				display: flex;
				grid-column: 1;
			}

			.home-blocks {
				grid-column: 1 / -1;
			}

			.fab-group {
				bottom: 24px;
				right: 24px;
			}
		}
	</style>
