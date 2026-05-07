<script lang="ts">
  import "../app.css";
  import BottomNav from "$lib/components/BottomNav.svelte";
  import UpdatePrompt from "$lib/components/UpdatePrompt.svelte";
  import { browser } from "$app/environment";
  import { activeA11yClasses, A11Y_CLASS_MAP } from "$lib/stores/accessibility";
  import { settingsStore } from "$lib/stores/settingsStore";

  // Bridge: sync accessibility store → <html> class list.
  // All CSS a11y overrides target html.a11y-* classes, so this is the
  // only place the store needs to be wired in — no prop drilling.
  if (browser) {
    activeA11yClasses.subscribe((activeClasses) => {
      const allClasses = Object.values(A11Y_CLASS_MAP);
      const html = document.documentElement;
      // Remove all a11y classes first, then re-apply active ones
      html.classList.remove(...allClasses);
      if (activeClasses.length > 0) {
        html.classList.add(...activeClasses);
      }
    });

    function applyTheme(theme: string) {
      if (theme === "auto") {
        const isDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        document.documentElement.setAttribute(
          "data-theme",
          isDark ? "dark" : "light",
        );
      } else {
        document.documentElement.setAttribute("data-theme", theme);
      }
    }

    settingsStore.subscribe((settings) => {
      applyTheme(settings.theme);
    });

    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        // Re-apply current theme setting when OS preference changes
        settingsStore.subscribe((s) => applyTheme(s.theme))();
      });
  }
</script>

<a href="#main" class="skip-to-main">Skip to main content</a>

<div class="app-container">
  <main id="main" class="content-area">
    <slot />
    <footer class="mobile-footer">
      <p>Crafted with ❤️ for My Classmates • Unofficial</p>
      <a
        href="https://github.com/ettefagh/campusweb"
        target="_blank"
        rel="noopener noreferrer">GitHub</a
      >
    </footer>
  </main>
</div>

<BottomNav />
<UpdatePrompt />

<style>
  .app-container {
    position: relative;
    min-height: 100vh;
    /* Mobile: pad bottom for bottom nav */
    padding-bottom: calc(
      var(--touch-target-min) + var(--spacing-lg) + var(--spacing-lg)
    );
  }

  .mobile-footer {
    padding: var(--spacing-xl) var(--spacing-lg);
    text-align: center;
    border-top: 1px solid var(--border-color);
    margin-top: var(--spacing-xl);
    opacity: 0.6;
    font-size: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }

  .mobile-footer p {
    margin: 0;
  }

  .mobile-footer a {
    color: var(--primary-color);
    text-decoration: none;
    font-weight: 600;
  }

  /* Desktop: shift content right for sidebar, remove bottom padding */
  @media (min-width: 1024px) {
    .app-container {
      margin-left: var(--sidebar-width, 220px);
      padding-bottom: 0;
    }

    .mobile-footer {
      display: none;
    }
  }

  /* Landscape Mobile: Shift content for right nav-bar */
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
