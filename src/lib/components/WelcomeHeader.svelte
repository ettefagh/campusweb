<script lang="ts">
  import { onMount } from "svelte";
  import { settingsStore, CAMPUSES } from "$lib/stores/settingsStore";
  import type { CalendarEvent } from "$lib/utils/icalParser";
  import { evaluateGreeting, RULES, type GreetingDecision, type GreetingContext } from "$lib/personalization/greetingEngine";
  import { t } from "$lib/i18n";
  
  export let upcomingEvents: CalendarEvent[] = [];
  
  let greeting: GreetingDecision | null = null;
  let baseCtx: GreetingContext | null = null;
  let isMounted = false;
  let weatherCtx: any = null;
  let history: string[] = [];

  function getDayPeriod(): "morning" | "afternoon" | "evening" | "night" {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 22) return "evening";
    return "night";
  }

  function getNextClassContext(events: CalendarEvent[]) {
    if (!events || events.length === 0) return null;
    const now = Date.now();
    const nextEvent = events.find(e => e.start.getTime() > now && !e.allDay);
    if (nextEvent) {
      return {
        courseName: nextEvent.title,
        startTimeIso: nextEvent.start.toISOString()
      };
    }
    return null;
  }

  async function fetchWeatherContext() {
    if (!$settingsStore.campusId) return null;
    try {
      const campus = CAMPUSES.find((entry) => entry.id === $settingsStore.campusId);
      const campusName = campus ? campus.name : "campus";
      
      const response = await fetch(`/api/weather-alert?campusId=${encodeURIComponent($settingsStore.campusId)}`);
      if (response.ok) {
        const payload = await response.json();
        return {
          alertCount: payload.totalAlertCount || 0,
          campusName
        };
      }
    } catch (e) {}
    return null;
  }

  onMount(async () => {
    isMounted = true;
    try {
      history = JSON.parse(sessionStorage.getItem("srh-greeting-history") || "[]");
    } catch {}

    const res = await fetchWeatherContext();
    if (res) {
      weatherCtx = res;
    }
  });

  // Rebuild greeting context reactively when any input state changes (mount, settings, events, weather)
  $: if (isMounted) {
    baseCtx = {
      userId: "unknown",
      firstName: $settingsStore.firstName,
      dayPeriod: getDayPeriod(),
      nextClass: getNextClassContext(upcomingEvents),
      recentGreetingIds: history,
      weather: weatherCtx
    };
  }

  // Re-evaluate greeting reactively when context or language translations change
  $: if (baseCtx && $t.home.greetings && isMounted) {
    const evaluated = evaluateGreeting(baseCtx, $t.home.greetings);
    if (evaluated) {
      const currentRule = RULES.find(r => r.id === greeting?.ruleId);
      const newRule = RULES.find(r => r.id === evaluated.ruleId);
      
      // Update greeting if higher priority (lower value), same rule (language changed), or no greeting selected yet
      if (!currentRule || !newRule || newRule.priority < currentRule.priority || newRule.id === currentRule.id) {
        greeting = evaluated;
      }

      // Record successfully rendered high priority rule in history
      if (greeting && !history.includes(greeting.ruleId)) {
        history.push(greeting.ruleId);
        if (history.length > 10) history.shift();
        try {
          sessionStorage.setItem("srh-greeting-history", JSON.stringify(history));
        } catch {}
      }
    }
  }

  // Fallback function for SSR or before mount
  function getGreetingFallback() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }
</script>

<div class="home-greeting">
  {#if greeting && isMounted}
    <div style="animation: reveal 0.5s cubic-bezier(0.22, 1, 0.36, 1);">
      <span>{greeting.subline || getDayPeriod()}</span>
      <h1>{greeting.headline}</h1>
    </div>
  {:else}
    <div>
      <span>{getGreetingFallback()}</span>
      <h1>{$settingsStore.firstName ? `Hi, ${$settingsStore.firstName}!` : $t.home.welcomeBack}</h1>
    </div>
  {/if}
</div>

<style>
  @keyframes reveal {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
