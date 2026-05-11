<script lang="ts">
  import "../app.css";
  import BottomNav from "$lib/components/BottomNav.svelte";
  import UpdatePrompt from "$lib/components/UpdatePrompt.svelte";
  import GlobalAlert from "$lib/components/GlobalAlert.svelte";
  import { browser } from "$app/environment";
  import { afterNavigate } from "$app/navigation";
  import { activeA11yClasses, A11Y_CLASS_MAP } from "$lib/stores/accessibility";
  import { settingsStore } from "$lib/stores/settingsStore";
  import { page } from "$app/stores";
  import FeedContent from "$lib/components/FeedContent.svelte";

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
