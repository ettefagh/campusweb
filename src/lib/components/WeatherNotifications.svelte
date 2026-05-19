<script lang="ts">
  import { browser } from "$app/environment";
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";
  import { CAMPUSES } from "$lib/stores/settingsStore";
  import { t } from "$lib/i18n";
  import { focusTrap } from "$lib/utils/focusTrap";
  import type { WeatherAlertResponse } from "$lib/types/weather";

  export let campusId: string | null = null;

  let open = false;
  let loading = false;
  let errorMessage = "";
  let payload: WeatherAlertResponse | null = null;
  let panelElement: HTMLElement | null = null;
  let activeCampusId = "";
  let refreshTimer: ReturnType<typeof setInterval> | null = null;

  $: campus = campusId ? CAMPUSES.find((entry) => entry.id === campusId) ?? null : null;
  $: hasAlert = (payload?.totalAlertCount ?? 0) > 0;
  $: activeCampusCount = payload?.activeCampusCount ?? 0;
  $: story = payload?.story ?? null;
  $: activeCampuses = (payload?.campuses ?? []).filter((entry) => entry.alertCount > 0);

  function clearTimer() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  function scheduleRefresh() {
    clearTimer();
    const interval = hasAlert ? 2 * 60 * 1000 : 15 * 60 * 1000;
    refreshTimer = setInterval(() => {
      void loadAlerts();
    }, interval);
  }

  async function loadAlerts() {
    if (!browser || !campus?.id) {
      payload = null;
      errorMessage = "";
      return;
    }

    loading = true;
    errorMessage = "";

    try {
      const response = await fetch(`/api/weather-alert?campusId=${encodeURIComponent(campus.id)}`);
      if (!response.ok) {
        payload = null;
        errorMessage = response.status === 500
          ? "Weather alerts are not configured yet."
          : "Unable to load weather alerts.";
        return;
      }

      payload = (await response.json()) as WeatherAlertResponse;
    } catch {
      payload = null;
      errorMessage = "Unable to load weather alerts.";
    } finally {
      loading = false;
      scheduleRefresh();
    }
  }

  function togglePanel() {
    open = !open;
    if (open && !payload && !loading) {
      void loadAlerts();
    }
  }

  function closePanel() {
    open = false;
  }

  function formatDateTime(epochSeconds: number) {
    if (!epochSeconds) return "";
    return new Date(epochSeconds * 1000).toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatUpdatedAt(iso: string) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      day: "numeric"
    });
  }

  function formatServerRefresh(iso?: string) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  onMount(() => {
    return () => {
      clearTimer();
    };
  });

  $: if (browser && campus?.id && campus.id !== activeCampusId) {
    activeCampusId = campus.id;
    void loadAlerts();
  }
</script>

<div class="weather-notifications">
  <button
    class="home-notification"
    type="button"
    aria-label={$t.home.weatherAlerts}
    title={$t.home.weatherAlerts}
    aria-expanded={open}
    aria-controls="weather-notification-panel"
    on:click={togglePanel}
  >
    <i class="ph ph-bell"></i>
    {#if hasAlert}
      <span class="badge" aria-hidden="true"></span>
    {/if}
  </button>

  {#if open}
    <button
      type="button"
      class="panel-backdrop"
      aria-label="Close weather alerts"
      on:click={closePanel}
      transition:fade={{ duration: 120 }}
    ></button>
    <div
      id="weather-notification-panel"
      class="weather-panel popup-panel-safe"
      role="dialog"
      aria-modal="true"
      aria-label="Weather alerts"
      bind:this={panelElement}
      use:focusTrap
      transition:fade={{ duration: 140 }}
    >
      <header class="panel-header">
        <div>
          <p class="panel-kicker">{$t.home.weatherAlerts}</p>
          <h3>{campus ? `${campus.name} campus` : $t.home.weatherAlerts}</h3>
        </div>
        <button class="popup-close" type="button" on:click={closePanel} aria-label="Close">
          <i class="ph ph-x"></i>
        </button>
      </header>

      {#if loading && !payload}
        <p class="panel-state">Loading weather alerts...</p>
      {:else if errorMessage}
        <p class="panel-state error">{errorMessage}</p>
      {:else if !campus}
        <p class="panel-state">{$t.home.selectCampusForWeather}</p>
      {:else if payload?.alerts?.length || story}
        {#if story}
          <section class="story-card">
            <div class="story-header">
              <span>Server story</span>
              <strong>{activeCampusCount} active campus{activeCampusCount === 1 ? "" : "es"}</strong>
            </div>
            <p>{story.summary}</p>
            {#if story.topCampuses?.length}
              <div class="story-tags">
                {#each story.topCampuses as campusStory (campusStory.campusId)}
                  <span>{campusStory.campusName}: {campusStory.alertCount}</span>
                {/each}
              </div>
            {/if}
          </section>
        {/if}

        {#if activeCampuses.length}
          <p class="panel-state compact">
            Alerts are active for {activeCampuses.length} campus{activeCampuses.length === 1 ? "" : "es"}.
          </p>
        {/if}

        {#if payload?.alerts?.length}
        <div class="alert-list">
          {#each payload.alerts as alert, index (alert.event + alert.start + index)}
            <article class="alert-card">
              <div class="alert-meta">
                <strong>{alert.event}</strong>
                <span>{alert.senderName}</span>
              </div>
              <div class="alert-time">
                {formatDateTime(alert.start)}
                {#if alert.end}
                  <span>to {formatDateTime(alert.end)}</span>
                {/if}
              </div>
              {#if alert.urgency || alert.certainty || alert.severity}
                <div class="alert-flags">
                  {#if alert.urgency}
                    <span>{alert.urgency}</span>
                  {/if}
                  {#if alert.certainty}
                    <span>{alert.certainty}</span>
                  {/if}
                  {#if alert.severity}
                    <span>{alert.severity}</span>
                  {/if}
                </div>
              {/if}
              {#if alert.tags?.length}
                <div class="alert-tags">
                  {#each alert.tags as tag}
                    <span>{tag}</span>
                  {/each}
                </div>
              {/if}
              {#if alert.description}
                <p>{alert.description}</p>
              {/if}
            </article>
          {/each}
        </div>
        {:else if story}
          <div class="panel-empty">
            <p>{$t.home.noWeatherAlerts} for {payload?.campusName || campus.name}.</p>
            <span>Last checked {payload ? formatUpdatedAt(payload.fetchedAt) : "just now"}.</span>
          </div>
        {/if}
      {:else}
        <div class="panel-empty">
          <p>{$t.home.noWeatherAlerts} for {payload?.campusName || campus.name}.</p>
          <span>Last checked {payload ? formatUpdatedAt(payload.fetchedAt) : "just now"}.</span>
        </div>
      {/if}

      {#if payload}
        <footer class="panel-footer">
          <span>Server refreshed {formatServerRefresh(payload.lastRefreshedAt || payload.fetchedAt)}</span>
          <span>Updated {formatUpdatedAt(payload.fetchedAt)}</span>
          <span>Refreshes every {Math.round((payload.refreshedInSeconds || 900) / 60)} min</span>
        </footer>
      {/if}
    </div>
  {/if}
</div>

<style>
  .weather-notifications {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .home-notification {
    position: relative;
  }

  .badge {
    position: absolute;
    top: 7px;
    right: 7px;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #ef4444;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.95);
  }

  .panel-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.22);
    z-index: 55;
    border: 0;
    padding: 0;
    cursor: default;
  }

  .weather-panel {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: min(92vw, 360px);
    z-index: 60;
    border-radius: 20px;
    border: 1px solid rgba(148, 163, 184, 0.24);
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(16px);
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
    padding: 16px;
  }

  :global([data-theme="dark"]) .weather-panel {
    background: rgba(15, 23, 42, 0.96);
    border-color: rgba(148, 163, 184, 0.18);
  }

  .panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .panel-kicker {
    margin: 0 0 4px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-color-secondary);
  }

  .panel-header h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--text-color);
  }

  .popup-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.25);
    background: transparent;
    color: var(--text-color);
  }

  .panel-state,
  .panel-empty {
    margin: 0;
    color: var(--text-color-secondary);
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .panel-state.error {
    color: #ef4444;
  }

  .panel-state.compact {
    font-size: 0.82rem;
    margin-top: 8px;
    margin-bottom: 10px;
  }

  .story-card {
    border-radius: 16px;
    border: 1px solid rgba(99, 102, 241, 0.16);
    background: linear-gradient(180deg, rgba(99, 102, 241, 0.08), rgba(99, 102, 241, 0.03));
    padding: 12px;
    margin-bottom: 10px;
  }

  :global([data-theme="dark"]) .story-card {
    border-color: rgba(99, 102, 241, 0.24);
    background: linear-gradient(180deg, rgba(99, 102, 241, 0.14), rgba(15, 23, 42, 0.05));
  }

  .story-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 6px;
  }

  .story-header span {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-color-secondary);
  }

  .story-header strong {
    font-size: 0.82rem;
    color: var(--text-color);
  }

  .story-card p {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.45;
    color: var(--text-color);
  }

  .story-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }

  .story-tags span,
  .alert-flags span {
    font-size: 0.72rem;
    border-radius: 999px;
    padding: 4px 8px;
    background: rgba(15, 23, 42, 0.08);
    color: var(--text-color);
  }

  :global([data-theme="dark"]) .story-tags span,
  :global([data-theme="dark"]) .alert-flags span {
    background: rgba(148, 163, 184, 0.14);
  }

  .alert-list {
    display: grid;
    gap: 10px;
  }

  .alert-card {
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(248, 250, 252, 0.72);
    padding: 12px;
  }

  :global([data-theme="dark"]) .alert-card {
    background: rgba(30, 41, 59, 0.75);
  }

  .alert-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 6px;
  }

  .alert-meta strong {
    color: var(--text-color);
    font-size: 0.95rem;
  }

  .alert-meta span,
  .alert-time,
  .panel-footer,
  .panel-empty span {
    color: var(--text-color-secondary);
    font-size: 0.8rem;
  }

  .alert-time {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .alert-flags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }

  .alert-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }

  .alert-tags span {
    font-size: 0.72rem;
    border-radius: 999px;
    padding: 4px 8px;
    background: rgba(99, 102, 241, 0.12);
    color: var(--primary-color);
    text-transform: capitalize;
  }

  .alert-card p {
    margin: 0;
    color: var(--text-color);
    font-size: 0.88rem;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .panel-empty {
    display: grid;
    gap: 4px;
    padding: 8px 0 4px;
  }

  .panel-footer {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid rgba(148, 163, 184, 0.16);
    font-size: 0.72rem;
    line-height: 1.35;
    opacity: 0.78;
  }

  @media (max-width: 640px) {
    .weather-panel {
      position: fixed;
      top: auto;
      right: 12px;
      left: 12px;
      bottom: 96px;
      width: auto;
      max-height: calc(100dvh - var(--bottom-nav-clearance) - 24px);
      overflow: auto;
    }

    .panel-footer {
      flex-direction: column;
      gap: 4px;
    }
  }
</style>
