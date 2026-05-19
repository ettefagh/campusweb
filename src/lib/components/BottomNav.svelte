<script lang="ts">
  import { page } from "$app/stores";
  import { t } from "$lib/i18n";
  import { goto } from "$app/navigation";

  let navItems: Array<{ path: string; label: string; iconClass: string; ariaLabel: string }> = [];
  $: navItems = [
    { path: "/", label: $t.nav.home, iconClass: "ph-house", ariaLabel: $t.nav.home },
    {
      path: "/explore",
      label: $t.nav.explore,
      iconClass: "ph-compass",
      ariaLabel: $t.nav.explore,
    },
    {
      path: "/calendar",
      label: $t.nav.calendar,
      iconClass: "ph-calendar-blank",
      ariaLabel: $t.nav.calendar,
    },
    { path: "/feed", label: $t.nav.feed, iconClass: "ph-newspaper", ariaLabel: $t.nav.feed },
    { path: "/settings", label: $t.nav.settings, iconClass: "ph-gear", ariaLabel: $t.nav.settings },
  ];

  let touchStartX = 0;
  let touchStartY = 0;

  function handleTouchStart(event: TouchEvent) {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }

  function handleTouchEnd(event: TouchEvent) {
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Minimum distance threshold of 60px, primarily horizontal movement
    if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 45) {
      const currentIndex = navItems.findIndex(item => item.path === $page.url.pathname);
      if (currentIndex !== -1) {
        if (deltaX < 0 && currentIndex < navItems.length - 1) {
          // Swipe left -> Next tab
          goto(navItems[currentIndex + 1].path);
          triggerHaptic();
        } else if (deltaX > 0 && currentIndex > 0) {
          // Swipe right -> Previous tab
          goto(navItems[currentIndex - 1].path);
          triggerHaptic();
        }
      }
    }
  }

  function triggerHaptic() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }
</script>

<!-- Desktop Sidebar -->
<aside class="sidebar-nav" aria-label="Main navigation (desktop)">
  <div class="sidebar-brand">
    <img
      src="/icon-light.png"
      alt="Campusweb"
      class="sidebar-logo light-mode"
      width="32"
    />
    <img
      src="/icon-dark.png"
      alt="Campusweb"
      class="sidebar-logo dark-mode"
      width="32"
    />
    <span class="sidebar-title">Campusweb</span>
  </div>
  <nav class="sidebar-links">
    {#each navItems as item}
      <a
        href={item.path}
        class="sidebar-item"
        class:active={$page.url.pathname === item.path}
        aria-label={item.ariaLabel}
        aria-current={$page.url.pathname === item.path ? "page" : undefined}
      >
        <span class="icon" aria-hidden="true">
          <i class={$page.url.pathname === item.path ? `ph-fill ${item.iconClass}` : `ph ${item.iconClass}`}></i>
        </span>
        <span class="label">{item.label}</span>
      </a>
    {/each}
  </nav>
  <div class="sidebar-footer">
    <div class="project-info">
      <p class="crafted">Crafted with ❤️ for classmates</p>
      <p class="status">Unofficial Project</p>
      <a href="https://github.com/ettefagh/campusweb" target="_blank" rel="noopener noreferrer" class="github-link">
        <span class="github-icon">GitHub</span>
      </a>
    </div>
  </div>
</aside>

<!-- Mobile Bottom Tab Bar -->
<nav
  class="bottom-nav"
  aria-label="Main navigation"
  on:touchstart={handleTouchStart}
  on:touchend={handleTouchEnd}
>
  {#each navItems as item}
    <a
      href={item.path}
      class="nav-item"
      class:active={$page.url.pathname === item.path}
      aria-label={item.ariaLabel}
      aria-current={$page.url.pathname === item.path ? "page" : undefined}
    >
      <span class="icon" aria-hidden="true">
        <i class={$page.url.pathname === item.path ? `ph-fill ${item.iconClass}` : `ph ${item.iconClass}`}></i>
      </span>
      <span class="label">{item.label}</span>
    </a>
  {/each}
</nav>

<style>
  /* ═══════════════════════════════════════════════════════════════
     MOBILE: Bottom Tab Bar (< 1024px) — Liquid Glass
     ═══════════════════════════════════════════════════════════════ */
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(74px + env(safe-area-inset-bottom, 0px));
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: var(--glass-blur-strong);
    -webkit-backdrop-filter: var(--glass-blur-strong);
    border-top: 1px solid rgba(7, 19, 47, 0.08);
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 100;
    padding: 8px max(10px, env(safe-area-inset-left)) calc(8px + env(safe-area-inset-bottom, 0px)) max(10px, env(safe-area-inset-right));
    box-shadow: 0 -10px 32px rgba(15, 23, 42, 0.07), 0 -1px 0 rgba(255, 255, 255, 0.8);
  }

  :global([data-theme="dark"]) .bottom-nav {
    background: rgba(20, 20, 25, 0.85);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-width: var(--touch-target-min);
    min-height: 54px;
    padding: 5px 6px;
    color: var(--text-color-secondary);
    text-decoration: none;
    border-radius: 14px;
    transition: all 0.2s ease;
    position: relative;
  }

  .nav-item:hover,
  .nav-item:focus-visible {
    background: rgba(212, 68, 7, 0.1);
  }

  .nav-item.active {
    color: var(--primary-color);
    background: transparent;
  }

  .nav-item.active::before {
    content: none;
  }

  .bottom-nav .icon {
    font-size: 25px;
    line-height: 1;
  }

  .bottom-nav .label {
    font-size: 11px;
    font-weight: 800;
    line-height: 1;
  }

  /* Safe area for notched devices */
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .bottom-nav {
      padding-bottom: calc(8px + env(safe-area-inset-bottom));
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     LANDSCAPE MOBILE: Right Nav-Bar
     ═══════════════════════════════════════════════════════════════ */
  @media (max-width: 1023px) and (orientation: landscape) {
    .bottom-nav {
      top: 0;
      bottom: 0;
      left: auto;
      right: 0;
      width: 68px;
      height: 100%;
      flex-direction: column;
      justify-content: center;
      border-top: none;
      border-left: 1px solid var(--glass-border);
      padding: var(--spacing-lg) 0;
      gap: var(--spacing-sm);
    }

    .nav-item {
      flex-direction: column;
      width: 100%;
      min-height: 64px;
      padding: var(--spacing-sm) 2px;
      gap: 4px;
    }

    .nav-item .label {
      font-size: 10px;
      text-align: center;
    }

    .nav-item.active::before {
      top: 50%;
      left: auto;
      right: 0;
      transform: translateY(-50%);
      width: 3px;
      height: 32px;
      border-radius: 3px 0 0 3px;
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     DESKTOP: Sidebar (hidden on mobile) — Liquid Glass
     ═══════════════════════════════════════════════════════════════ */
  .sidebar-nav {
    display: none;
  }

  @media (min-width: 1024px) {
    /* Hide bottom nav on desktop */
    .bottom-nav {
      display: none;
    }

    /* Show sidebar on desktop */
    .sidebar-nav {
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: var(--sidebar-width, 220px);
      background: var(--glass-bg-strong);
      backdrop-filter: var(--glass-blur-strong);
      -webkit-backdrop-filter: var(--glass-blur-strong);
      border-right: 1px solid var(--glass-border);
      z-index: 100;
      padding: var(--spacing-lg) 0;
      box-shadow: 4px 0 24px rgba(0, 0, 0, 0.06), 1px 0 0 var(--glass-border-subtle);
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
    }

    .sidebar-logo {
      width: 32px;
      height: auto;
      border-radius: var(--radius-sm);
      object-fit: contain;
    }

    .sidebar-logo.dark-mode {
      display: none;
    }

    .sidebar-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--primary-color);
      letter-spacing: -0.01em;
    }

    .sidebar-links {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0 var(--spacing-sm);
      flex: 1;
    }

    .sidebar-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-sm) var(--spacing-md);
      color: var(--text-color);
      text-decoration: none;
      border-radius: var(--radius-sm);
      transition: all 0.18s ease;
      font-size: 0.95rem;
      font-weight: 500;
      position: relative;
    }

    .sidebar-item .icon {
      font-size: 20px;
      line-height: 1;
      flex-shrink: 0;
    }

    .sidebar-item .label {
      font-size: 0.95rem;
      line-height: 1;
    }

    .sidebar-item:hover {
      background: rgba(212, 68, 7, 0.08);
      color: var(--primary-color);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.3);
    }

    .sidebar-item.active {
      background: rgba(212, 68, 7, 0.12);
      color: var(--primary-color);
      font-weight: 600;
      box-shadow: var(--shadow-sm);
    }

    .sidebar-item.active::before {
      content: "";
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 24px;
      background: var(--primary-color);
      border-radius: 0 3px 3px 0;
      box-shadow: 0 0 8px rgba(212, 68, 7, 0.5);
    }

    .sidebar-footer {
      padding: var(--spacing-lg) var(--spacing-md);
      border-top: 1px solid var(--glass-border-subtle);
      margin-top: auto;
    }

    .project-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .crafted {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-color);
      margin: 0;
    }

    .status {
      font-size: 0.75rem;
      color: var(--text-color-secondary);
      margin: 0;
      opacity: 0.8;
    }

    .github-link {
      display: inline-flex;
      align-items: center;
      margin-top: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--primary-color);
      text-decoration: none;
      transition: opacity 0.2s;
    }

    .github-link:hover {
      opacity: 0.8;
      text-decoration: underline;
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     DARK MODE overrides
     ═══════════════════════════════════════════════════════════════ */
  @media (prefers-color-scheme: dark) {
    .sidebar-logo.light-mode {
      display: none;
    }
    .sidebar-logo.dark-mode {
      display: inline-block;
    }

    .sidebar-nav {
      box-shadow: 4px 0 24px rgba(0, 0, 0, 0.35);
    }
  }

  /* Combine dark + desktop for logo display */
  @media (prefers-color-scheme: dark) and (min-width: 1024px) {
    .sidebar-logo.light-mode {
      display: none;
    }
    .sidebar-logo.dark-mode {
      display: inline-block;
    }
  }
</style>
