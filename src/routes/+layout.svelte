<script lang="ts">
  import "../app.css";
  import BottomNav from "$lib/components/BottomNav.svelte";
  import UpdatePrompt from "$lib/components/UpdatePrompt.svelte";
  import GlobalAlert from "$lib/components/GlobalAlert.svelte";
  import WelcomeOnboarding from "$lib/components/WelcomeOnboarding.svelte";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { afterNavigate } from "$app/navigation";
  import { activeA11yClasses, A11Y_CLASS_MAP } from "$lib/stores/accessibility";
  import { settingsStore } from "$lib/stores/settingsStore";
  import { page } from "$app/stores";
  import FeedContent from "$lib/components/FeedContent.svelte";
  import { version } from "$app/environment";

  const WELCOME_STORAGE_KEY = "campusweb_installed_welcome_seen";
  let showWelcomeOnboarding = false;
  let hasTrackedOpen = false;
  let hasTrackedInstall = false;

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

    afterNavigate(() => {
      const container = document.querySelector(".app-container");
      if (container) {
        container.scrollTop = 0;
      }
    });
  }
</script>

<a href="#main" class="skip-to-main">Skip to main content</a>

<div class="app-container">
  <GlobalAlert />
  <main id="main" class="content-area">
    <!-- Persistent Feed Layer (Keep-alive for Social Media Embeds) -->
    <FeedContent active={$page.url.pathname === '/feed'} />

    <div class="page-slot" class:hidden={$page.url.pathname === '/feed'}>
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
      margin-left: var(--sidebar-width, 220px);
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
