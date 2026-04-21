<script lang="ts">
  import { page } from "$app/stores";
  import { t } from "$lib/i18n";
  let navItems: Array<{ path: string; label: string; icon: string; ariaLabel: string }> = [];
  $: navItems = [
    { path: "/", label: $t.nav.home, icon: "🏠", ariaLabel: $t.nav.home },
    {
      path: "/explore",
      label: $t.nav.explore,
      icon: "🧭",
      ariaLabel: $t.nav.explore,
    },
    {
      path: "/calendar",
      label: $t.nav.calendar,
      icon: "📅",
      ariaLabel: $t.nav.calendar,
    },
    { path: "/feed", label: $t.nav.feed, icon: "📰", ariaLabel: $t.nav.feed },
    { path: "/settings", label: $t.nav.settings, icon: "⚙️", ariaLabel: $t.nav.settings },
  ];
</script>

<!-- Desktop Sidebar -->
<aside class="sidebar-nav" aria-label="Main navigation (desktop)">
  <div class="sidebar-brand">
    <img
      src="/icon-light.png"
      alt="Campusweb"
      class="sidebar-logo light-mode"
      width="32"
      height="32"
    />
    <img
      src="/icon-dark.png"
      alt="Campusweb"
      class="sidebar-logo dark-mode"
      width="32"
      height="32"
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
        <span class="icon" aria-hidden="true">{item.icon}</span>
        <span class="label">{item.label}</span>
      </a>
    {/each}
  </nav>
  <div class="sidebar-footer">
    <a
      href="/settings"
      class="sidebar-settings-link"
      class:active={$page.url.pathname === '/settings'}
      aria-label="Settings"
    >
      <span aria-hidden="true">⚙️</span>
      <span>Settings</span>
    </a>
  </div>
</aside>

<!-- Mobile Bottom Tab Bar -->
<nav class="bottom-nav" aria-label="Main navigation">
  {#each navItems as item}
    <a
      href={item.path}
      class="nav-item"
      class:active={$page.url.pathname === item.path}
      aria-label={item.ariaLabel}
      aria-current={$page.url.pathname === item.path ? "page" : undefined}
    >
      <span class="icon" aria-hidden="true">{item.icon}</span>
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
    height: calc(var(--touch-target-min) + var(--spacing-md) * 4);
    background: var(--glass-bg-strong);
    backdrop-filter: var(--glass-blur-strong);
    -webkit-backdrop-filter: var(--glass-blur-strong);
    border-top: 1px solid var(--glass-border);
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 100;
    padding: var(--spacing-md) var(--spacing-sm);
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.1), 0 -1px 0 var(--glass-border-subtle);
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    min-width: var(--touch-target-min);
    min-height: var(--touch-target-min);
    padding: var(--spacing-sm);
    color: var(--text-color);
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
    position: relative;
  }

  .nav-item:hover,
  .nav-item:focus-visible {
    background: rgba(212, 68, 7, 0.1);
  }

  .nav-item.active {
    color: var(--primary-color);
    background: rgba(212, 68, 7, 0.12);
  }

  .nav-item.active::before {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 32px;
    height: 3px;
    background: var(--primary-color);
    border-radius: 0 0 3px 3px;
    box-shadow: 0 0 8px rgba(212, 68, 7, 0.5);
  }

  .bottom-nav .icon {
    font-size: 24px;
    line-height: 1;
  }

  .bottom-nav .label {
    font-size: 12px;
    font-weight: 500;
    line-height: 1;
  }

  /* Safe area for notched devices */
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .bottom-nav {
      padding-bottom: calc(var(--spacing-md) + env(safe-area-inset-bottom));
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
      height: 32px;
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
      padding: var(--spacing-md) var(--spacing-lg);
      border-top: 1px solid var(--glass-border-subtle);
      margin-top: auto;
    }

    .sidebar-settings-link {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-color-secondary);
      text-decoration: none;
      padding: var(--spacing-sm) var(--spacing-sm);
      border-radius: var(--radius-md);
      transition: all 0.2s;
    }
    .sidebar-settings-link:hover,
    .sidebar-settings-link.active {
      color: var(--primary-color);
      background: rgba(212, 68, 7, 0.08);
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
