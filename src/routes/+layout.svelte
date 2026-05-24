<script lang="ts">
  import "../app.css";
  import BottomNav from "$lib/components/BottomNav.svelte";
  import UpdatePrompt from "$lib/components/UpdatePrompt.svelte";
  import GlobalAlert from "$lib/components/GlobalAlert.svelte";
  import WelcomeOnboarding from "$lib/components/WelcomeOnboarding.svelte";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { afterNavigate, beforeNavigate, disableScrollHandling } from "$app/navigation";
  import { activeA11yClasses, A11Y_CLASS_MAP } from "$lib/stores/accessibility";
  import { settingsStore } from "$lib/stores/settingsStore";
  import { page } from "$app/stores";
  import { version } from "$app/environment";

  // ── Persistent Tab Content Components ──
  import HomeContent from "$lib/components/HomeContent.svelte";
  import ExploreContent from "$lib/components/ExploreContent.svelte";
  import CalendarContent from "$lib/components/CalendarContent.svelte";
  import FeedContent from "$lib/components/FeedContent.svelte";
  import SettingsContent from "$lib/components/SettingsContent.svelte";

  const WELCOME_STORAGE_KEY = "campusweb_installed_welcome_seen";
  let showWelcomeOnboarding = false;
  let hasTrackedOpen = false;
  let hasTrackedInstall = false;

  // ── Main tab paths & lazy-then-keep tracking ──
  const MAIN_TABS = ['/', '/explore', '/calendar', '/feed', '/settings'];
  let visitedTabs = new Set<string>();

  $: currentPath = $page.url.pathname;
  $: isMainTab = MAIN_TABS.includes(currentPath);

  // Track visited tabs — once a tab is visited, it stays mounted forever
  $: {
    if (browser && MAIN_TABS.includes(currentPath)) {
      visitedTabs.add(currentPath);
      visitedTabs = visitedTabs; // trigger Svelte reactivity
    }
  }

  // ── Scroll position preservation per tab ──
  const tabScrollPositions: Record<string, number> = {};
  if (browser) {
    (window as any).tabScrollPositions = tabScrollPositions;
  }

  beforeNavigate(({ from, to }) => {
    console.log('beforeNavigate called', { from: from?.url?.pathname, to: to?.url?.pathname });
    if (from && from.url) {
      const fromPath = from.url.pathname;
      const container = document.querySelector(".app-container");
      if (container) {
        tabScrollPositions[fromPath] = container.scrollTop;
        console.log(`Saved scroll for ${fromPath}: ${container.scrollTop}`);
      }
    }
  });

  afterNavigate(({ from, to }) => {
    console.log('afterNavigate called', { from: from?.url?.pathname, to: to?.url?.pathname });
    const toPath = to?.url?.pathname ?? '';
    if (MAIN_TABS.includes(toPath)) {
      disableScrollHandling();
      const savedScroll = tabScrollPositions[toPath] || 0;
      console.log(`Restoring scroll for ${toPath} to ${savedScroll}`);
      
      let attempts = 0;
      const interval = setInterval(() => {
        const container = document.querySelector(".app-container");
        if (container) {
          container.scrollTop = savedScroll;
          if (attempts > 12) {
            clearInterval(interval);
            console.log(`Scroll successfully locked to ${container.scrollTop} (target was ${savedScroll}) after ${attempts} attempts`);
          }
        } else {
          clearInterval(interval);
        }
        attempts++;
      }, 25);
    } else {
      const container = document.querySelector(".app-container");
      if (container) {
        container.scrollTop = 0;
      }
    }
  });

  function getDisplayMode() {
    if (window.matchMedia("(display-mode: standalone)").matches) return "standalone";
    if (window.matchMedia("(display-mode: fullscreen)").matches) return "fullscreen";
    if (window.matchMedia("(display-mode: minimal-ui)").matches) return "minimal-ui";
    return "browser";
  }

  function trackUsageEvent(
    eventType: "app_open" | "standalone_launch" | "pwa_installed" | "share_link_visit"
  ) {
    const payload = JSON.stringify({
      eventType,
      surface: "layout",
      displayMode: getDisplayMode(),
      appVersion: version
    });

    try {
      if ("sendBeacon" in navigator) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/analytics/event", blob);
        return;
      }
    } catch {}

    fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(() => {});
  }

  function isInstalledAppLaunch() {
    const nav = navigator as Navigator & { standalone?: boolean };
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      nav.standalone === true ||
      document.referrer.startsWith("android-app://")
    );
  }

  function closeWelcomeOnboarding() {
    showWelcomeOnboarding = false;
    if (browser) {
      localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    }
  }

  onMount(() => {
    showWelcomeOnboarding =
      isInstalledAppLaunch() && !localStorage.getItem(WELCOME_STORAGE_KEY);

    if (!hasTrackedOpen) {
      hasTrackedOpen = true;
      trackUsageEvent("app_open");
      if (isInstalledAppLaunch()) {
        trackUsageEvent("standalone_launch");
      }
    }

    const shareRef = new URL(window.location.href).searchParams.get("ref");
    if (shareRef === "share" && !sessionStorage.getItem("campusweb_share_visit_tracked")) {
      sessionStorage.setItem("campusweb_share_visit_tracked", "true");
      trackUsageEvent("share_link_visit");
    }

    const onAppInstalled = () => {
      if (hasTrackedInstall) return;
      hasTrackedInstall = true;
      trackUsageEvent("pwa_installed");
    };

    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  });

  // Bridge: sync accessibility store → <html> class list.
  if (browser) {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    window.addEventListener('unhandledrejection', event => {
      console.error('Unhandled rejection:', event.reason?.message || event.reason, event.reason?.stack);
    });
    window.addEventListener('error', event => {
      console.error('Unhandled error:', event.message, event.error?.stack);
    });

    // Frame Buster: Prevent nested loading of SvelteKit inside iframes
    if (window.top && window.self !== window.top) {
      window.top.location.href = window.location.href;
    }

    activeA11yClasses.subscribe((activeClasses) => {
      const allClasses = Object.values(A11Y_CLASS_MAP);
      const html = document.documentElement;
      html.classList.remove(...allClasses);
      if (activeClasses.length > 0) {
        html.classList.add(...activeClasses);
      }
    });

    function applyTheme(theme: string) {
      if (theme === "auto") {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
      } else {
        document.documentElement.setAttribute("data-theme", theme);
      }
    }

    settingsStore.subscribe((settings) => {
      applyTheme(settings.theme);
    });

    fetch("/api/auth/session")
      .then((response) => response.ok ? response.json() : { verified: false })
      .then((session) => {
        settingsStore.patch({ emailVerified: Boolean(session.verified) } as any);
      })
      .catch(() => {
        settingsStore.patch({ emailVerified: false } as any);
      });

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      settingsStore.subscribe((s) => applyTheme(s.theme))();
    });

  }
</script>

<a href="#main" class="skip-to-main">Skip to main content</a>

<div class="app-container">
  <GlobalAlert />
  <main id="main" class="content-area">
    <!-- Persistent Tab Layers (Keep-alive — mounted once, toggled via display) -->
    {#if visitedTabs.has('/')}
      <HomeContent active={currentPath === '/'} />
    {/if}
    {#if visitedTabs.has('/explore')}
      <ExploreContent active={currentPath === '/explore'} />
    {/if}
    {#if visitedTabs.has('/calendar')}
      <CalendarContent active={currentPath === '/calendar'} />
    {/if}
    {#if visitedTabs.has('/feed')}
      <FeedContent active={currentPath === '/feed'} />
    {/if}
    {#if visitedTabs.has('/settings')}
      <SettingsContent active={currentPath === '/settings'} />
    {/if}

    <!-- Standard slot for non-tab routes (viewer, admin, login, railmap, etc.) -->
    <div class="page-slot" class:hidden={isMainTab}>
      <slot />
    </div>
  </main>
</div>

<BottomNav />
<UpdatePrompt />
{#if showWelcomeOnboarding}
  <WelcomeOnboarding on:close={closeWelcomeOnboarding} />
{/if}

<style>
  .page-slot.hidden {
    display: none;
  }

  .app-container {
    position: relative;
    height: 100vh;
    height: 100dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 110px;
  }

  @media (min-width: 1024px) {
    .app-container {
      margin-left: 0;
      padding-top: var(--topbar-height, 70px);
      padding-bottom: 0;
    }
  }

  @media (max-width: 1023px) and (orientation: landscape) {
    .app-container {
      padding-bottom: 0;
      padding-right: 68px;
    }
    .content-area {
      padding-right: var(--spacing-sm);
    }
  }
</style>
