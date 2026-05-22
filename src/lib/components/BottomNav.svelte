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

<!-- Desktop Topbar -->
<aside class="topbar-nav" aria-label="Main navigation (desktop)">
  <div class="topbar-brand">
    <img
      src="/icon-light.png"
      alt="Campusweb"
      class="topbar-logo light-mode"
      width="32"
    />
    <img
      src="/icon-dark.png"
      alt="Campusweb"
      class="topbar-logo dark-mode"
      width="32"
    />
    <span class="topbar-title">Campusweb</span>
  </div>
  
  <nav class="topbar-links">
    {#each navItems as item}
      <a
        href={item.path}
        class="topbar-item"
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

  <div class="topbar-right">
    <div class="topbar-status">
      <span class="crafted">Crafted with ❤️</span>
      <span class="status">Unofficial Project</span>
    </div>
    <a href="https://github.com/ettefagh/campusweb" target="_blank" rel="noopener noreferrer" class="github-btn" aria-label="GitHub Repository">
      <i class="ph ph-github-logo"></i>
    </a>
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
     DESKTOP: Topbar Navigation (hidden on mobile) — Liquid Glass
     ═══════════════════════════════════════════════════════════════ */
  .topbar-nav {
    display: none;
  }

  @media (min-width: 1024px) {
    /* Hide bottom nav on desktop */
    .bottom-nav {
      display: none;
    }

    /* Show topbar on desktop */
    .topbar-nav {
      display: flex;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: var(--topbar-height, 70px);
      background: var(--glass-bg-strong);
      backdrop-filter: var(--glass-blur-strong);
      -webkit-backdrop-filter: var(--glass-blur-strong);
      border-bottom: 1px solid var(--glass-border);
      z-index: 100;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--spacing-xl);
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03), inset 0 -1px 0 rgba(255, 255, 255, 0.1);
    }

    .topbar-brand {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .topbar-logo {
      width: 32px;
      height: auto;
      border-radius: var(--radius-sm);
      object-fit: contain;
    }

    .topbar-logo.dark-mode {
      display: none;
    }

    .topbar-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--primary-color);
      letter-spacing: -0.01em;
    }

    .topbar-links {
      display: flex;
      flex-direction: row;
      gap: var(--spacing-sm);
      align-items: center;
    }

    .topbar-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: 8px var(--spacing-md);
      color: var(--text-color);
      text-decoration: none;
      border-radius: var(--radius-md);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 0.95rem;
      font-weight: 500;
      position: relative;
    }

    .topbar-item .icon {
      font-size: 18px;
      line-height: 1;
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .topbar-item .label {
      font-size: 0.95rem;
      line-height: 1;
    }

    .topbar-item:hover {
      background: rgba(212, 68, 7, 0.08);
      color: var(--primary-color);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.3);
      transform: translateY(-1px);
    }

    .topbar-item.active {
      background: rgba(212, 68, 7, 0.12);
      color: var(--primary-color);
      font-weight: 600;
      box-shadow: var(--shadow-sm);
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .topbar-status {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      line-height: 1.25;
    }

    .crafted {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-color);
      margin: 0;
    }

    .status {
      font-size: 0.65rem;
      color: var(--text-color-secondary);
      margin: 0;
      opacity: 0.8;
    }

    .github-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(212, 68, 7, 0.06);
      color: var(--primary-color);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(212, 68, 7, 0.12);
      font-size: 20px;
    }

    .github-btn:hover {
      background: rgba(212, 68, 7, 0.12);
      transform: scale(1.05);
      border-color: rgba(212, 68, 7, 0.25);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     DARK MODE overrides
     ═══════════════════════════════════════════════════════════════ */
  @media (prefers-color-scheme: dark) {
    .topbar-logo.light-mode {
      display: none;
    }
    .topbar-logo.dark-mode {
      display: inline-block;
    }
    .topbar-nav {
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.35);
    }
  }

  /* Combine dark + desktop for logo display */
  @media (prefers-color-scheme: dark) and (min-width: 1024px) {
    .topbar-logo.light-mode {
      display: none;
    }
    .topbar-logo.dark-mode {
      display: inline-block;
    }
  }
</style>
