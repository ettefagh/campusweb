<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "$lib/i18n";

  let innerWidth = 0;
  let contactSheetOpen = false;
  $: isPortraitMobile = innerWidth < 600;

  onMount(() => {
    // Force reload of Instagram embeds when component mounts
    const w = window as any;
    if (w.instgrm) {
      w.instgrm.Embeds.process();
    } else {
      const script = document.createElement("script");
      script.src = "//www.instagram.com/embed.js";
      script.async = true;
      document.body.appendChild(script);
    }
  });

  function openContactSheet() {
    contactSheetOpen = true;
  }
  function closeContactSheet() {
    contactSheetOpen = false;
  }

  let newsCards: Array<{ tag: string; emoji: string; title: string; desc: string; url: string; color: string }> = [];
  $: newsCards = [
    {
      tag: $t.feed.eventsTag,
      emoji: "📅",
      title: $t.feed.eventsTitle,
      desc: $t.feed.eventsDesc,
      url: "/viewer?url=https://www.srh-university.de/en/events/",
      color: "#3b82f6",
    },
    {
      tag: $t.feed.newsTag,
      emoji: "📰",
      title: $t.feed.newsTitle,
      desc: $t.feed.newsDesc,
      url: "/viewer?url=https://www.srh-university.de/en/news/",
      color: "#ef4444",
    },
    {
      tag: $t.feed.merchTag,
      emoji: "🛒",
      title: $t.feed.merchTitle,
      desc: $t.feed.merchDesc,
      url: "https://srh-store.de/employees/bildung.html",
      color: "#8b5cf6",
    },
  ];

  const socialMedia = [
    {
      name: "Instagram",
      url: "https://www.instagram.com/srh_university_international/",
      icon: "📷",
      color: "#E1306C",
    },
    {
      name: "Facebook",
      url: "http://facebook.com/srhuniversityinternational",
      icon: "📘",
      color: "#1877F2",
    },
    {
      name: "TikTok",
      url: "https://www.tiktok.com/@srhuniversity",
      icon: "🎵",
      color: "#000000",
    },
    {
      name: "YouTube",
      url: "https://www.youtube.com/@srhuniversity",
      icon: "📺",
      color: "#FF0000",
    },
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/school/srh-university/posts/",
      icon: "🔗",
      color: "#0A66C2",
    },
  ];

  let contacts: Array<{ icon: string; label: string; value: string; href: string }> = [];
  $: contacts = [
    {
      icon: "📞",
      label: $t.feed.phone,
      value: "+49 30 515650 200",
      href: "tel:+493051565020",
    },
    {
      icon: "📧",
      label: $t.feed.email,
      value: "info.hsg@srh.de",
      href: "mailto:info.hsg@srh.de",
    },
    {
      icon: "🏢",
      label: $t.feed.address,
      value: "Ludwig Guttmann Str. 6\n69123 Heidelberg, Germany",
      href: "",
    },
  ];
</script>

<svelte:head>
  <title>{$t.feed.pageTitle}</title>
</svelte:head>

<svelte:window bind:innerWidth />

<div class="feed-container">
  <header class="page-header">
    <h1>{$t.feed.title}</h1>
    <p class="subtitle">{$t.feed.subtitle}</p>
  </header>

  <!-- Feature 4: Modernized Instagram Embed Wrapper -->
  <section class="embed-section">
    <h2 class="section-title">{$t.feed.instagramFeeds}</h2>
    <div class="embed-wrapper">
      <div class="embed-card">
        <div class="embed-label">@srh.students</div>
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/srh.students/"
          data-instgrm-version="14"
          style="background:#FFF; border:0; border-radius:8px; box-shadow:none; margin: 0; max-width:100%; min-width:280px; padding:0; width:100%;"
        ></blockquote>
      </div>
      <div class="embed-card">
        <div class="embed-label">@srh_university_international</div>
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/srh_university_international/"
          data-instgrm-version="14"
          style="background:#FFF; border:0; border-radius:8px; box-shadow:none; margin: 0; max-width:100%; min-width:280px; padding:0; width:100%;"
        ></blockquote>
      </div>
    </div>
  </section>

  <!-- Feature 1: News Preview Cards -->
  <section class="news-cards">
    {#each newsCards as card}
      <a href={card.url} class="news-card">
        <span class="news-card-tag" style="background: {card.color};"
          >{card.tag}</span
        >
        <span class="news-card-emoji">{card.emoji}</span>
        <h3 class="news-card-title">{card.title}</h3>
        <p class="news-card-desc">{card.desc}</p>
        <span class="news-card-cta">
          {$t.feed.readMore}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </span>
      </a>
    {/each}
  </section>

  <!-- Feature 2: Horizontal Scroll Social Chips -->
  <section class="social-section">
    <h2 class="section-title">{$t.feed.followSRH}</h2>
    <div class="social-scroll">
      {#each socialMedia as platform}
        <a
          href={platform.url}
          target="_blank"
          rel="noopener noreferrer"
          class="social-chip"
          style="--chip-color: {platform.color};"
        >
          <span class="chip-icon">{platform.icon}</span>
          <span class="chip-name">{platform.name}</span>
        </a>
      {/each}
    </div>
  </section>

  <!-- Feature 3: Contact Hub Button -->
  <section class="contact-trigger-section">
    <button class="contact-trigger" on:click={openContactSheet}>
      <span class="contact-trigger-icon">📞</span>
      <div class="contact-trigger-text">
        <span class="contact-trigger-title">{$t.feed.universityDirectory}</span>
        <span class="contact-trigger-sub">{$t.feed.phoneEmailAddress}</span>
      </div>
      <span class="contact-trigger-arrow">›</span>
    </button>
  </section>
</div>

<!-- Feature 3: Contact Bottom Sheet / Modal -->
{#if contactSheetOpen}
  {#if isPortraitMobile}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="sheet-overlay" on:click={closeContactSheet} role="presentation">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="sheet"
        on:click|stopPropagation
        role="dialog"
        aria-label={$t.feed.contactTitle}
      >
        <div class="sheet-handle"></div>
        <button
          class="sheet-close"
          on:click={closeContactSheet}
          aria-label={$t.feed.close}>✕</button
        >
        <h3 class="sheet-title">{$t.feed.contactTitle}</h3>
        <div class="contact-list">
          {#each contacts as c}
            <div class="contact-row">
              <span class="contact-row-icon">{c.icon}</span>
              <div class="contact-row-body">
                <span class="contact-row-label">{c.label}</span>
                {#if c.href}
                  <a href={c.href} class="contact-row-value">{c.value}</a>
                {:else}
                  <span class="contact-row-value"
                    >{@html c.value.replace("\n", "<br/>")}</span
                  >
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <!-- Desktop / Tablet Modal -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="sheet-overlay" on:click={closeContactSheet} role="presentation">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="contact-modal"
        on:click|stopPropagation
        role="dialog"
        aria-label={$t.feed.contactTitleDesktop}
      >
        <button
          class="sheet-close"
          on:click={closeContactSheet}
          aria-label={$t.feed.close}>✕</button
        >
        <h3 class="sheet-title">{$t.feed.contactTitleDesktop}</h3>
        <div class="contact-list">
          {#each contacts as c}
            <div class="contact-row">
              <span class="contact-row-icon">{c.icon}</span>
              <div class="contact-row-body">
                <span class="contact-row-label">{c.label}</span>
                {#if c.href}
                  <a href={c.href} class="contact-row-value">{c.value}</a>
                {:else}
                  <span class="contact-row-value"
                    >{@html c.value.replace("\n", "<br/>")}</span
                  >
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  /* ─── Layout ──────────────────────────────────────────────────── */
  .feed-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-lg) var(--spacing-md) 100px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .page-header {
    text-align: center;
    padding: var(--spacing-lg) 0 var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }

  h1 {
    margin-bottom: var(--spacing-xs);
    font-size: 1.75rem;
  }

  .subtitle {
    color: #666;
    font-size: 1rem;
  }

  @media (prefers-color-scheme: dark) {
    .subtitle {
      color: #aaa;
    }
  }

  .section-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: var(--spacing-md);
    color: var(--text-color);
  }

  /* ─── Feature 1: News Preview Cards ──────────────────────────── */
  .news-cards {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
  }

  @media (max-width: 639px) {
    .news-cards {
      gap: 0;
    }
  }

  .news-card {
    flex: 1 1 100%;
  }

  @media (max-width: 639px) {
    .news-card {
      margin-bottom: var(--spacing-md);
    }
  }

  @media (min-width: 640px) {
    .news-card {
      flex: 1 1 calc(33.333% - var(--spacing-md));
    }
  }

  .news-card {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: var(--spacing-lg);
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    text-decoration: none;
    color: var(--text-color);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }

  .news-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--primary-color);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .news-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: var(--primary-color);
  }

  .news-card:hover::before {
    opacity: 1;
  }

  .news-card-tag {
    align-self: flex-start;
    padding: 2px 10px;
    border-radius: 99px;
    color: #fff;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: var(--spacing-sm);
  }

  .news-card-emoji {
    font-size: 2rem;
    margin-bottom: var(--spacing-sm);
  }

  .news-card-title {
    font-size: 1.05rem;
    font-weight: 700;
    margin-bottom: var(--spacing-xs);
    line-height: 1.3;
    color: var(--text-color);
  }

  .news-card-desc {
    font-size: 0.85rem;
    color: var(--text-color-secondary, #888);
    line-height: 1.5;
    flex: 1;
    margin-bottom: var(--spacing-sm);
  }

  .news-card-cta {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--primary-color);
    margin-top: auto;
  }

  /* ─── Feature 4: Embed Wrapper ───────────────────────────────── */
  .embed-section {
    margin-bottom: var(--spacing-xl);
  }

  .embed-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-md);
  }

  .embed-card {
    flex: 1 1 100%;
    /* Remaining properties of .embed-card are below */
  }

  @media (min-width: 768px) {
    .embed-card {
      flex: 1 1 calc(50% - var(--spacing-md));
    }
  }

  .embed-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    transition: box-shadow 0.2s ease;
  }

  .embed-card:hover {
    box-shadow: var(--shadow-md);
  }

  .embed-label {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-color-secondary, #888);
    border-bottom: 1px solid var(--border-color);
    background: rgba(0, 0, 0, 0.02);
  }

  @media (prefers-color-scheme: dark) {
    .embed-label {
      background: rgba(255, 255, 255, 0.03);
    }
  }

  /* ─── Feature 2: Horizontal Social Pills ─────────────────────── */
  .social-section {
    margin-bottom: var(--spacing-xl);
  }

  .social-scroll {
    display: flex;
    gap: var(--spacing-sm);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: var(--spacing-sm);
    scrollbar-width: none;
  }

  @media (min-width: 1024px) {
    .social-scroll {
      flex-wrap: wrap;
      justify-content: center;
      overflow-x: hidden;
    }
  }

  .social-scroll::-webkit-scrollbar {
    display: none;
  }

  .social-chip {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 99px;
    text-decoration: none;
    color: var(--text-color);
    white-space: nowrap;
    font-size: 0.88rem;
    font-weight: 500;
    transition: all 0.2s ease;
    flex-shrink: 0;
    min-height: var(--touch-target-min);
  }

  .social-chip:hover {
    border-color: var(--chip-color, var(--primary-color));
    background: color-mix(
      in srgb,
      var(--chip-color, var(--primary-color)) 8%,
      transparent
    );
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
  }

  .chip-icon {
    font-size: 1.2rem;
  }

  .chip-name {
    font-weight: 600;
  }

  /* ─── Feature 3: Contact Trigger Button ──────────────────────── */
  .contact-trigger-section {
    margin-bottom: var(--spacing-xl);
  }

  .contact-trigger {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    width: 100%;
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    color: var(--text-color);
  }

  .contact-trigger:hover {
    border-color: var(--primary-color);
    box-shadow: var(--shadow-sm);
  }

  .contact-trigger-icon {
    font-size: 1.6rem;
    flex-shrink: 0;
  }

  .contact-trigger-text {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .contact-trigger-title {
    font-weight: 700;
    font-size: 0.95rem;
  }

  .contact-trigger-sub {
    font-size: 0.8rem;
    color: var(--text-color-secondary, #888);
  }

  .contact-trigger-arrow {
    font-size: 1.4rem;
    color: var(--text-color-secondary, #888);
    flex-shrink: 0;
  }

  /* ─── Contact Sheet / Modal (shared) ──────────────────────────── */
  .sheet-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 999;
    animation: overlayIn 0.2s ease;
  }

  @keyframes overlayIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: var(--card-bg);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-xl);
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    max-height: 80vh;
    overflow-y: auto;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .sheet-handle {
    width: 36px;
    height: 4px;
    background: var(--border-color);
    border-radius: 2px;
    margin: 0 auto var(--spacing-md);
  }

  .contact-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg) var(--spacing-xl);
    box-shadow: var(--shadow-lg);
    min-width: 340px;
    max-width: 480px;
    width: 90%;
    animation: modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes modalIn {
    from {
      opacity: 0;
      transform: translate(-50%, -48%);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
  }

  .sheet-close {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    font-size: 1.1rem;
    cursor: pointer;
    color: var(--text-color);
    opacity: 0.6;
    padding: 4px;
    min-width: auto;
    min-height: auto;
  }

  .sheet-close:hover {
    opacity: 1;
  }

  .sheet-title {
    font-size: 1.15rem;
    font-weight: 700;
    margin-bottom: var(--spacing-md);
    color: var(--text-color);
  }

  .contact-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .contact-row {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: var(--hover-bg, rgba(0, 0, 0, 0.03));
    border-radius: var(--radius-md);
  }

  .contact-row-icon {
    font-size: 1.3rem;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .contact-row-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .contact-row-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-color-secondary, #888);
  }

  .contact-row-value {
    font-size: 0.92rem;
    color: var(--text-color);
    text-decoration: none;
  }

  a.contact-row-value {
    color: var(--primary-color);
    text-decoration: underline;
    text-decoration-color: transparent;
    transition: text-decoration-color 0.2s ease;
  }

  a.contact-row-value:hover {
    text-decoration-color: var(--primary-color);
  }

  /* ─── Feature 5: Masonry‐like Dynamic Layout ────────────────── */
  @media (min-width: 1024px) {
    .feed-container {
      display: flex;
      flex-direction: column;
      flex-wrap: wrap;
      gap: var(--spacing-xl);
    }

    .feed-container > .page-header {
      width: 100%;
    }

    .feed-container > * {
      min-width: 0;
    }

    .embed-section {
      flex: 1 1 calc(50% - var(--spacing-xl) / 2);
    }

    .news-cards {
      flex: 1 1 calc(50% - var(--spacing-xl) / 2);
    }

    .social-section,
    .contact-trigger-section {
      width: 100%;
    }

    /* News card adjustments for larger screens */
    .news-card {
      flex: 1 1 100%;
    }
  }

  /* ─── Responsive ─────────────────────────────────────────────── */
  @media (max-width: 639px) {
    .news-cards {
      gap: var(--spacing-sm);
    }

    .news-card {
      padding: var(--spacing-md);
    }

    .news-card-emoji {
      font-size: 1.6rem;
    }
  }
</style>
