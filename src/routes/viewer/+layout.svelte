<!-- Bare layout: no bottom nav, no padding — used by /viewer -->
<script lang="ts">
  import "../../app.css";
  import { browser } from "$app/environment";
  import { activeA11yClasses, A11Y_CLASS_MAP } from "$lib/stores/accessibility";
  import { settingsStore } from "$lib/stores/settingsStore";

  if (browser) {
    activeA11yClasses.subscribe((activeClasses) => {
      const allClasses = Object.values(A11Y_CLASS_MAP);
      const html = document.documentElement;
      html.classList.remove(...allClasses);
      if (activeClasses.length > 0) html.classList.add(...activeClasses);
    });

    function applyTheme(theme: string) {
      if (theme === "auto") {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
      } else {
        document.documentElement.setAttribute("data-theme", theme);
      }
    }

    settingsStore.subscribe((settings) => applyTheme(settings.theme));

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      settingsStore.subscribe((s) => applyTheme(s.theme))();
    });
  }
</script>

<slot />
