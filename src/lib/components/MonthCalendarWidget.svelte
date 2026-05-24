<script lang="ts">
  import type { CalendarEvent } from "$lib/utils/icalParser";
  import { t } from "$lib/i18n";
  import { classColors } from "$lib/stores/classColors";
  import { activeClasses } from "$lib/stores/calendarStore";
  import { settingsStore } from "$lib/stores/settingsStore";
  import { fade } from "svelte/transition";

  export let events: CalendarEvent[] = [];

  $: locale = $settingsStore.language || "en";

  let currentDate = new Date();
  $: currentMonthStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  );

  function prevMonth() {
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1,
    );
    openedDay = null;
  }
  function nextMonth() {
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1,
    );
    openedDay = null;
  }

  $: weeks = buildCalendar(currentMonthStart, events, $settingsStore.weekStartsOn);

  let openedDay: Date | null = null;
  let openedEvents: CalendarEvent[] = [];

  function buildCalendar(start: Date, allEvents: CalendarEvent[], weekStartsOn: number) {
    let clone = new Date(start);
    let dayOfWeek = clone.getDay();
    let offset = (dayOfWeek - weekStartsOn + 7) % 7;
    clone.setDate(clone.getDate() - offset);

    const newWeeks = [];
    let currentWeek = [];

    for (let i = 0; i < 42; i++) {
      let isOtherMonth = clone.getMonth() !== start.getMonth();
      let today = new Date();
      let isToday =
        clone.getDate() === today.getDate() &&
        clone.getMonth() === today.getMonth() &&
        clone.getFullYear() === today.getFullYear();

      let dayStart = new Date(
        clone.getFullYear(),
        clone.getMonth(),
        clone.getDate(),
      ).getTime();
      let dayEnd = dayStart + 24 * 60 * 60 * 1000;

      let dayEvents = allEvents.filter((e) => {
        let eStart = e.start.getTime();
        let eEnd = e.end ? e.end.getTime() : eStart;
        return eStart < dayEnd && eEnd >= dayStart;
      });

      currentWeek.push({
        date: new Date(clone),
        isOtherMonth,
        isToday,
        events: dayEvents,
      });

      if (currentWeek.length === 7) {
        newWeeks.push(currentWeek);
        currentWeek = [];
      }
      clone.setDate(clone.getDate() + 1);

      if (
        currentWeek.length === 0 &&
        clone.getMonth() !== start.getMonth() &&
        i >= 28
      ) {
        break;
      }
    }
    return newWeeks;
  }

  function handleDayClick(dayObj: any) {
    if (openedDay && dayObj.date.getTime() === openedDay.getTime()) {
      openedDay = null;
      openedEvents = [];
    } else {
      openedDay = dayObj.date;
      openedEvents = dayObj.events;
    }
  }

  function resolveEventColor(event: CalendarEvent) {
    const classGroupId = event.extendedProps?.classGroupId;
    if (classGroupId) {
      const customColor = $classColors[classGroupId];
      if (customColor) return customColor;
      const classDef = $activeClasses.find((cls) => cls.id === classGroupId);
      if (classDef?.defaultColor) return classDef.defaultColor;
    }
    return event.backgroundColor || "var(--primary-color)";
  }

  function formatEventTime(event: CalendarEvent) {
    if (event.allDay) return $t.calendar?.allDay || "All day";
    const start = event.start.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
    const end = event.end
      ? event.end.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
      : "";
    return end ? `${start} - ${end}` : start;
  }
</script>

<div class="calendar-widget">
  <div class="header">
    <div
      class="left"
      on:click={prevMonth}
      aria-label={$t.calendar?.previous || "Previous"}
      role="button"
      tabindex="0"
      on:keydown={(e) => e.key === "Enter" && prevMonth()}
    >
      <div style="padding: 25px; transform: translate(-20px, -25px);"></div>
    </div>
    <h2>
      {currentMonthStart.toLocaleDateString(locale, {
        month: "long",
        year: "numeric",
      })}
    </h2>
    <div
      class="right"
      on:click={nextMonth}
      aria-label={$t.calendar?.nextLabel || "Next"}
      role="button"
      tabindex="0"
      on:keydown={(e) => e.key === "Enter" && nextMonth()}
    >
      <div style="padding: 25px; transform: translate(-30px, -25px);"></div>
    </div>
  </div>

  <div class="month">
    {#each weeks as week, wIndex}
      <div class="week">
        {#each week as day, dIndex}
          <div
            class="day"
            class:other={day.isOtherMonth}
            class:today={day.isToday}
            class:selected={openedDay &&
              openedDay.getTime() === day.date.getTime()}
            on:click={() => handleDayClick(day)}
            on:keydown={(e) => e.key === "Enter" && handleDayClick(day)}
            role="button"
            tabindex="0"
          >
            {#if wIndex === 0}
              <div class="day-name">
                {day.date.toLocaleDateString(locale, { weekday: "short" })}
              </div>
            {/if}
            <div class="day-number">{day.date.getDate()}</div>
            <div class="day-events">
              {#each day.events.slice(0, 3) as ev}
                <span style="background-color: {resolveEventColor(ev)}"></span>
              {/each}
              {#if day.events.length > 3}
                <span class="more-dot"></span>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      {#if openedDay && week.some((d: any) => d.date.getTime() === openedDay!.getTime())}
        <div class="details" transition:fade={{ duration: 200 }}>
          <div
            class="arrow"
            style="left: {(week.findIndex(
              (d: any) => d.date.getTime() === openedDay!.getTime(),
            ) +
              0.5) *
              (100 / 7)}%"
          ></div>
          <div class="events">
            {#each openedEvents as ev}
              <div class="event-item">
                <div
                  class="event-category"
                  style="background-color: {resolveEventColor(ev)}"
                ></div>
                <span class="event-title">{ev.title}</span>
                <span
                  class="time"
                  style="background-color: {resolveEventColor(ev)}"
                  >{formatEventTime(ev)}</span
                >
                {#if ev.extendedProps?.location}
                  <div class="location">{ev.extendedProps.location}</div>
                {/if}
              </div>
            {/each}
            {#if openedEvents.length === 0}
              <div class="event-item empty">
                <span>{"No events"}</span>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .calendar-widget {
    -webkit-transform: translate3d(0, 0, 0);
    transform: translate3d(0, 0, 0);
    width: 100%;
    margin: 0 auto;
    background: transparent;
  }

  .header {
    height: 50px;
    width: 100%;
    background: var(--primary-color, #20b9da);
    text-align: center;
    position: relative;
    z-index: 10;
    color: white;
    border-radius: var(--radius-sm, 10px);
  }

  .header h2 {
    margin: 0;
    padding: 0;
    font-size: 18px;
    line-height: 50px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .left,
  .right {
    position: absolute;
    width: 0px;
    height: 0px;
    border-style: solid;
    top: 50%;
    margin-top: -7.5px;
    cursor: pointer;
  }

  .left {
    border-width: 7.5px 10px 7.5px 0;
    border-color: transparent white transparent transparent;
    left: 20px;
  }

  .right {
    border-width: 7.5px 0 7.5px 10px;
    border-color: transparent transparent transparent white;
    right: 20px;
  }

  .month {
    padding-bottom: 12px;
  }

  .week {
    display: flex;
    justify-content: space-between;
  }

  .day {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 14.28%;
    padding: 10px 0px;
    text-align: center;
    cursor: pointer;
    background: transparent;
    position: relative;
    z-index: 1;
    border-radius: 8px;
    transition: background-color 0.2s;
  }

  .day:hover {
    background: var(--surface-soft);
  }

  .day.other {
    opacity: 0.3;
  }

  .day.today {
    color: var(--primary-color, #20b9da);
    font-weight: 700;
  }

  .day.selected {
    background: var(--surface-soft);
  }

  .day-name {
    font-size: 11px;
    text-transform: uppercase;
    margin-bottom: 5px;
    color: var(--text-color-secondary);
    letter-spacing: 0.5px;
  }

  .day-number {
    letter-spacing: 1px;
    line-height: 1.2;
    font-size: 15px;
  }

  .day-events {
    display: flex;
    justify-content: center;
    gap: 2px;
    margin-top: 4px;
    height: 6px;
  }

  .day-events span {
    display: block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .more-dot {
    background-color: var(--text-color-secondary) !important;
  }

  .details {
    position: relative;
    width: calc(100% - 16px);
    margin: 8px;
    background: var(--surface-soft);
    border-radius: 12px;
  }

  .arrow {
    position: absolute;
    top: -6px;
    margin-left: -6px;
    width: 0px;
    height: 0px;
    border-style: solid;
    border-width: 0 6px 6px 6px;
    border-color: transparent transparent var(--surface-soft) transparent;
    transition: left 0.3s ease;
  }

  .events {
    padding: 10px 0;
    max-height: 250px;
    overflow-y: auto;
  }

  .event-item {
    font-size: 14px;
    line-height: 22px;
    padding: 10px 14px;
    border-radius: 10px;
    box-shadow: var(--shadow-sm);
    margin: 8px 12px;
    background-color: var(--surface-solid);
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }

  .event-item.empty {
    text-align: center;
    color: var(--text-color-secondary);
    box-shadow: none;
    background: transparent;
    justify-content: center;
  }

  .event-category {
    height: 12px;
    width: 12px;
    display: inline-block;
    vertical-align: middle;
    border-radius: 50%;
    margin-right: 8px;
  }

  .event-title {
    display: inline-block;
    vertical-align: middle;
    font-weight: 500;
    flex: 1;
    overflow: auto;
    text-overflow: clip;
    white-space: nowrap;
  }

  .time {
    border-radius: 20px;
    color: #ffffff;
    font-size: 11px;
    padding: 2px 8px;
    font-weight: 500;
    margin-left: 8px;
  }

  .location {
    display: inline-block;
    font-size: 12px;
    color: var(--text-color-secondary);
    width: 100%;
    margin-left: 0px;
    margin-top: 4px;
  }
</style>
