<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "$lib/i18n";
  import {
    settingsStore,
    CAMPUSES,
    DEPARTMENTS,
  } from "$lib/stores/settingsStore";
  import { getEmailUrl } from "$lib/utils/emailHelper";
  import { getDirectPhone, getTeamsChatUrl } from "$lib/utils/phoneHelper";

  let innerWidth = 0;
  let contactSheetOpen = false;
  $: isPortraitMobile = innerWidth < 600;

  // ── Directory state ──────────────────────────────────────────
  let dirTab: "services" | "general" = "services";
  let expandedId: string | null = null;
  $: currentCampusName =
    CAMPUSES.find((c) => c.id === $settingsStore.campusId)?.name ?? "";

  function toggleExpand(id: string) {
    expandedId = expandedId === id ? null : id;
  }

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

  let newsCards: Array<{
    tag: string;
    emoji: string;
    title: string;
    desc: string;
    url: string;
    color: string;
  }> = [];
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
      tag: "AD",
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

  let contacts: Array<{
    icon: string;
    label: string;
    value: string;
    href: string;
  }> = [];
  $: contacts = [
    {
      icon: "📞",
      label: $t.feed.phone,
      value: "+49 30 515650 200",
      href: "tel:+493051565020",
    },
    {
      icon: "💬",
      label: "Teams",
      value: "Chat with Info.hsg",
      href: getTeamsChatUrl("info.hsg@srh.de"),
    },
    {
      icon: "📧",
      label: $t.feed.email,
      value: "info.hsg@srh.de",
      href: getEmailUrl("info.hsg@srh.de"),
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
    <div class="logo-container">
      <img
        src="/icon-light.png"
        alt="SRH University Logo"
        class="logo light-mode"
        width="36"
        height="36"
        loading="eager"
        fetchpriority="high"
      />
      <img
        src="/icon-dark.png"
        alt="SRH University Logo"
        class="logo dark-mode"
        width="36"
        height="36"
        loading="eager"
        fetchpriority="high"
      />
    </div>
    <div class="header-text">
      <h1>{$t.feed.title}</h1>
      <p class="subtitle">{$t.feed.subtitle}</p>
    </div>
  </header>

  <!-- Feature 1: News Preview Cards -->
  <section class="news-cards">
    {#each newsCards as card}
      <a href={card.url} class="news-card">
        <span class="news-card-tag" style="background: {card.color};"
          >{card.tag}</span
        >
        <h3 class="news-card-title">{card.title}</h3>
        <p class="news-card-desc">{card.desc}</p>
        <span class="news-card-cta">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
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
        >
          <div class="insta-placeholder">
            <div class="insta-skeleton-header">
              <div class="insta-skeleton-avatar"></div>
              <div class="insta-skeleton-text"></div>
            </div>
            <div class="insta-skeleton-image">
              <div class="insta-spinner"></div>
            </div>
          </div>
        </blockquote>
      </div>
      <div class="embed-card">
        <div class="embed-label">@srh_university_international</div>
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/srh_university_international/"
          data-instgrm-version="14"
          style="background:#FFF; border:0; border-radius:8px; box-shadow:none; margin: 0; max-width:100%; min-width:280px; padding:0; width:100%;"
        >
          <div class="insta-placeholder">
            <div class="insta-skeleton-header">
              <div class="insta-skeleton-avatar"></div>
              <div class="insta-skeleton-text"></div>
            </div>
            <div class="insta-skeleton-image">
              <div class="insta-spinner"></div>
            </div>
          </div>
        </blockquote>
      </div>
    </div>
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
</div>

<style>
  /* ─── Layout ──────────────────────────────────────────────────── */
  .feed-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-lg) var(--spacing-md) calc(var(--spacing-xl) * 2.5);
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .feed-container > *:not(.page-header) {
    animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  }

  .page-header {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    text-align: left;
    padding: var(--spacing-sm) var(--spacing-md);
    margin: var(--spacing-sm) var(--spacing-md);
    gap: var(--spacing-md);
    /* Respect Apple top notch and safe area */
    padding-top: calc(env(safe-area-inset-top) + var(--spacing-sm));
    display: flex;
  }

  .logo-container {
    margin-bottom: 0;
  }

  .logo {
    width: 36px;
    height: 36px;
    border-radius: 8px;
  }

  /* Dark mode support for logo */
  :global([data-theme="dark"]) .light-mode {
    display: none;
  }
  :global([data-theme="light"]) .dark-mode {
    display: none;
  }

  .header-text {
    display: flex;
    flex-direction: column;
  }

  h1 {
    font-size: 1.2rem;
    font-weight: 700;
    margin-bottom: 2px;
    color: var(--text-color);
  }

  .subtitle {
    font-size: 0.85rem;
    margin-bottom: 0;
    color: var(--text-color-secondary);
  }

  .section-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: var(--spacing-xs);
    color: var(--text-color);
  }

  .section-subtitle {
    font-size: 0.82rem;
    color: var(--text-color-secondary);
    margin-bottom: var(--spacing-md);
    font-weight: 500;
  }

  /* ─── Feature 1: News Preview Cards ──────────────────────────── */
  .news-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    margin-bottom: var(--spacing-xl);
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--border-color);
  }

  @media (max-width: 768px) {
    .news-cards {
      grid-template-columns: 1fr;
    }
  }

  .news-card {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: var(--spacing-lg);
    padding-right: calc(var(--spacing-lg) * 2.5);
    background: var(--card-bg);
    text-decoration: none;
    color: var(--text-color);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    border-right: 1px solid var(--border-color);
    border-bottom: 1px solid var(--border-color);
  }

  .news-card:nth-child(3n) {
    border-right: none;
  }

  .news-card:last-child {
    border-bottom: none;
  }

  @media (max-width: 768px) {
    .news-card {
      border-right: none;
    }
    .news-card:nth-child(3n) {
      border-right: none;
    }
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
    position: absolute;
    right: var(--spacing-lg);
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    color: var(--primary-color);
    opacity: 0.6;
    transition: all 0.2s ease;
  }

  .news-card:hover .news-card-cta {
    opacity: 1;
    right: calc(var(--spacing-lg) - 4px);
  }

  /* ─── Feature 4: Embed Wrapper ───────────────────────────────── */
  .embed-section {
  }

  .embed-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-md);
  }

  .embed-card {
    flex: 1 1 100%;
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

  .insta-placeholder {
    padding: 16px;
    min-height: 450px;
    background: var(--card-bg);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .insta-skeleton-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .insta-skeleton-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(150, 150, 150, 0.2);
    animation: pulse 1.5s infinite;
  }

  .insta-skeleton-text {
    height: 14px;
    width: 120px;
    border-radius: 4px;
    background: rgba(150, 150, 150, 0.2);
    animation: pulse 1.5s infinite;
  }

  .insta-skeleton-image {
    flex: 1;
    border-radius: 4px;
    background: rgba(150, 150, 150, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pulse 1.5s infinite;
  }

  .insta-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid rgba(150, 150, 150, 0.3);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes pulse {
    0% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.6;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
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

  /* ─── Feature 5: Department Directory ─────────────────────────── */
  .directory-section {
    margin-bottom: var(--spacing-xl);
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    box-shadow: var(--shadow-sm);
  }

  .verification-hint {
    padding: 24px;
    margin: 20px 0;
    display: flex;
    align-items: center;
    gap: 20px;
    border-radius: var(--radius-lg);
    border: 1px solid rgba(212, 68, 7, 0.2);
    background: rgba(212, 68, 7, 0.05);
  }

  .hint-icon {
    font-size: 2.5rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  }

  .hint-text h3 {
    margin: 0 0 4px 0;
    font-size: 1.1rem;
    color: var(--text-color);
  }

  .hint-text p {
    margin: 0 0 12px 0;
    font-size: 0.9rem;
    color: var(--text-color-secondary);
    line-height: 1.4;
  }

  .btn-verify {
    display: inline-block;
    padding: 8px 16px;
    background: var(--primary-color);
    color: white;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.2s;
  }

  @media (max-width: 600px) {
    .verification-hint {
      flex-direction: column;
      text-align: center;
      padding: 20px;
    }
  }

  .directory-tabs {
    display: flex;
    gap: 4px;
    background: rgba(0, 0, 0, 0.05);
    padding: 4px;
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-lg);
  }

  @media (prefers-color-scheme: dark) {
    .directory-tabs {
      background: rgba(255, 255, 255, 0.05);
    }
  }

  .dir-tab {
    flex: 1;
    padding: 8px;
    border: none;
    background: transparent;
    border-radius: calc(var(--radius-lg) - 4px);
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .dir-tab.active {
    background: white;
    color: var(--primary-color);
    box-shadow: var(--shadow-sm);
  }

  @media (prefers-color-scheme: dark) {
    .dir-tab.active {
      background: #333;
      color: #fff;
    }
  }

  .dir-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .dir-row-container {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .dir-row-container.expanded {
    border-color: var(--primary-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    background: rgba(255, 255, 255, 0.02);
  }

  .dir-row-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--spacing-md);
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    color: var(--text-color);
  }

  .dir-row-trigger:hover {
    background: rgba(0, 0, 0, 0.02);
  }

  .dir-row-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .dir-service {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--primary-color);
  }

  .dir-person {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-color);
  }

  .dir-chevron {
    font-size: 1.2rem;
    color: var(--text-color-secondary);
    opacity: 0.5;
  }

  .dir-expanded {
    padding: 0 var(--spacing-md) var(--spacing-md);
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dir-actions {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }

  .dir-action-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 12px;
    border-radius: var(--radius-lg);
    text-decoration: none;
    font-size: 0.75rem;
    font-weight: 700;
    transition: all 0.2s;
    background: rgba(0, 0, 0, 0.03);
    border: 1px solid var(--border-color);
    color: var(--text-color);
  }

  @media (prefers-color-scheme: dark) {
    .dir-action-btn {
      background: rgba(255, 255, 255, 0.05);
    }
  }

  .dir-action-btn:hover {
    background: rgba(0, 0, 0, 0.06);
    border-color: var(--primary-color);
  }

  .dir-action-btn .action-icon {
    font-size: 1.4rem;
  }

  .dir-action-btn.mail {
    color: var(--primary-color);
  }

  .dir-action-btn.call {
    color: #10b981;
  }

  .dir-action-btn.chat {
    color: #505ac9; /* Teams Purple/Blue */
  }

  .dir-footer {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-top: 1px dashed var(--border-color);
    padding-top: var(--spacing-md);
  }

  .dir-meta-value {
    font-size: 0.78rem;
    color: var(--text-color-secondary);
    font-family: var(--font-mono, monospace);
  }

  .dir-separator {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--text-color-secondary);
    margin: var(--spacing-md) 0 4px;
    padding-left: 4px;
    border-left: 3px solid var(--primary-color);
  }

  .dir-empty {
    text-align: center;
    padding: var(--spacing-xl) 0;
    color: var(--text-color-secondary);
    font-size: 0.9rem;
    font-style: italic;
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
      width: 100%;
    }

    .social-section,
    .contact-trigger-section {
      width: 100%;
    }
  }

  /* ─── Responsive ─────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .news-card {
      padding: var(--spacing-md);
    }
  }

  @keyframes reveal {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
