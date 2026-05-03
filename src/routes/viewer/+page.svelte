<script lang="ts">
  import { page } from "$app/stores";
  import { browser } from "$app/environment";

  // Domains allowed to be displayed in the iframe
  const ALLOWED_DOMAINS = [
    "srh-community.campusweb.cloud",
    "moodle.srh.de",
    "srh-hochschule-heidelberg.de",
    "outlook.office.com",
    "tools.pdf24.org",
    "srh-berlin.idm.oclc.org",
    "srh-calendar-enhancer.padarhava.workers.dev",
    "calendarsub.padarhava.workers.dev",
    "srh-university.de",
    "www.srh-university.de",
    "srh.de",
    "www.srh.de",
    "ecampus.srh-university.de",
    "webopac.srh-hochschulen.de",
    "srh-store.de",
    "srhberlin.booqableshop.com",
  ];

  $: url = $page.url.searchParams.get("url") || "";
  $: title = $page.url.searchParams.get("title") || "External Link";

  $: parsed = (() => {
    try {
      return new URL(url);
    } catch {
      return null;
    }
  })();

  $: domain = parsed?.hostname ?? "";

  $: isValidUrl = (() => {
    if (!parsed) return false;
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_DOMAINS.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith("." + d),
    );
  })();

  // Loading / progress state
  let loadProgress = 0;
  let isLoading = true;

  // Simulate a loading bar since iframes don't expose real progress
  let progressInterval: ReturnType<typeof setInterval> | null = null;

  function startProgress() {
    isLoading = true;
    loadProgress = 10;
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
      if (loadProgress < 85) {
        loadProgress += Math.random() * 8;
      }
    }, 200);
  }

  function finishProgress() {
    if (progressInterval) clearInterval(progressInterval);
    loadProgress = 100;
    setTimeout(() => {
      isLoading = false;
      loadProgress = 0;
    }, 350);
  }

  $: if (isValidUrl && url) startProgress();

  function handleIframeLoad() {
    finishProgress();
  }

  function goBack() {
    if (browser && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  }

  function reload() {
    if (!iframeEl) return;
    iframeEl.src = url;
    startProgress();
  }

  function share() {
    if (browser && navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else if (browser) {
      navigator.clipboard?.writeText(url);
    }
  }

  let iframeEl: HTMLIFrameElement;

  $: canShare = browser && !!navigator.share;
</script>

<svelte:head>
  <title>{title} — CampusWeb</title>
</svelte:head>

<div class="viewer-page">
  <!-- ── Top bar: always at the top on both iOS and Android ── -->
  <header class="viewer-header">
    <button class="icon-btn back-btn" on:click={goBack} aria-label="Close">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>

    <div class="header-meta">
      <span class="header-title">{title}</span>
      {#if domain}
        <span class="header-domain">{domain}</span>
      {/if}
    </div>

    <div class="header-actions">
      <button
        class="icon-btn"
        on:click={reload}
        aria-label="Reload"
        title="Reload"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      </button>

      {#if canShare}
        <button
          class="icon-btn"
          on:click={share}
          aria-label="Share"
          title="Share"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="18" cy="5" r="3" /><circle
              cx="6"
              cy="12"
              r="3"
            /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line
              x1="15.41"
              y1="6.51"
              x2="8.59"
              y2="10.49"
            />
          </svg>
        </button>
      {/if}

      {#if url && isValidUrl}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          class="icon-btn"
          aria-label="Open in browser"
          title="Open in browser"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
            />
            <polyline points="15 3 21 3 21 9" /><line
              x1="10"
              y1="14"
              x2="21"
              y2="3"
            />
          </svg>
        </a>
      {/if}
    </div>
  </header>

  <!-- ── Progress bar ── -->
  {#if isLoading && loadProgress > 0}
    <div
      class="progress-track"
      role="progressbar"
      aria-valuenow={loadProgress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div class="progress-bar" style="width: {loadProgress}%"></div>
    </div>
  {/if}

  <!-- ── Content ── -->
  <main class="viewer-content">
    {#if url && isValidUrl}
      <iframe
        bind:this={iframeEl}
        src={url}
        {title}
        class:loaded={!isLoading}
        on:load={handleIframeLoad}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
      ></iframe>
    {:else}
      <div class="error-state">
        <span class="error-icon">⛔</span>
        <p class="error-title">Unauthorized URL</p>
        <p class="error-desc">This link cannot be opened in CampusWeb.</p>
        <a href="/" class="btn">Return Home</a>
      </div>
    {/if}
  </main>
</div>

<style>
  /* ── Layout: always column (header top, content bottom) ── */
  .viewer-page {
    display: flex;
    flex-direction: column-reverse;
    height: calc(100vh - var(--bottom-nav-height, 0px));
    height: calc(100dvh - var(--bottom-nav-height, 0px));
    background: var(--bg-color);
    overflow: hidden;
    /* Sit inside the PWA shell — no extra bottom nav overlap on this route */
  }

  /* ── Header ── */
  .viewer-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: 0 var(--spacing-sm);
    height: 56px;
    min-height: 56px;
    background: var(--card-bg);
    border-top: 1px solid var(--border-color);
    z-index: 10;
    flex-shrink: 0;
    /* Safe area: account for iOS bottom indicator when toolbar is at bottom */
    padding-bottom: env(safe-area-inset-bottom, 0);
    height: calc(56px + env(safe-area-inset-bottom, 0));
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--text-color);
    cursor: pointer;
    flex-shrink: 0;
    text-decoration: none;
    transition: background 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .icon-btn:hover,
  .icon-btn:focus-visible {
    background: var(--hover-bg, rgba(0, 0, 0, 0.07));
  }

  .icon-btn svg {
    width: 20px;
    height: 20px;
  }

  .back-btn {
    color: var(--primary-color);
  }

  .header-meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .header-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
  }

  .header-domain {
    font-size: 0.72rem;
    color: var(--text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0;
    flex-shrink: 0;
  }

  /* ── Progress bar ── */
  .progress-track {
    height: 3px;
    background: transparent;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: var(--primary-color);
    border-radius: 0 2px 2px 0;
    transition: width 0.2s ease;
  }

  /* ── iframe ── */
  .viewer-content {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: #fff;
    /* Bottom safe area for iOS home bar */
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  iframe {
    width: 100%;
    height: 100%;
    border: none;
    opacity: 0;
    transition: opacity 0.25s ease;
    display: block;
  }

  iframe.loaded {
    opacity: 1;
  }

  /* ── Error state ── */
  .error-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xl);
    text-align: center;
    color: var(--text-color);
  }

  .error-icon {
    font-size: 3rem;
  }

  .error-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
  }

  .error-desc {
    font-size: 0.9rem;
    color: var(--text-color-secondary);
    margin: 0;
  }

  .btn {
    margin-top: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--primary-color);
    color: #fff;
    border-radius: var(--radius-md);
    text-decoration: none;
    font-weight: 600;
    font-size: 0.95rem;
  }
</style>
