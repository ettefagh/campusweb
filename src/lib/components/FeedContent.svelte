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
  import StoriesSlider from "$lib/components/StoriesSlider.svelte";
  import { cachedStories, getStories } from "$lib/stores/feedCache";

  export let active = false;

  // ── Stories state automatically reacts to cached store changes ──
  $: stories = $cachedStories;

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
    getStories(); // Only hits network if last load > refreshRate
    
    // Defer loading of heavy third-party scripts to optimize initial FCP, LCP, and Speed Index
    if (typeof window !== "undefined") {
      const deferTimeout = window.requestIdleCallback 
        ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 2000 })
        : (cb: () => void) => setTimeout(cb, 1200);

      deferTimeout(() => {
        // Force reload of Instagram embeds
        const w = window as any;
        if (w.instgrm) {
          w.instgrm.Embeds.process();
        } else {
          const script = document.createElement("script");
          script.id = "instagram-embed-script";
          script.src = "//www.instagram.com/embed.js";
          script.async = true;
          document.body.appendChild(script);
        }

        // Dynamic TikTok Embed Script loading
        if (!document.querySelector('script[src="https://www.tiktok.com/embed.js"]')) {
          const tiktokScript = document.createElement("script");
          tiktokScript.src = "https://www.tiktok.com/embed.js";
          tiktokScript.async = true;
          document.body.appendChild(tiktokScript);
        }
      });
    }
  });

  // Re-process embeds when the component becomes active to ensure visibility
  $: if (active && typeof window !== "undefined") {
    const w = window as any;
    if (w.instgrm) w.instgrm.Embeds.process();
  }

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

<svelte:window bind:innerWidth />

<div class="feed-container" style:display={active ? 'flex' : 'none'}>
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

  <!-- Stories bar -->
  <StoriesSlider {stories} />

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

  <!-- Feature 6: TikTok Embed Wrapper -->
  <section class="tiktok-section">
    <h2 class="section-title">{($t.feed as any)?.tiktokFeed || "TikTok Feed"}</h2>
    <div class="tiktok-card">
      <blockquote
        class="tiktok-embed"
        cite="https://www.tiktok.com/@srhuniversity"
        data-unique-id="srhuniversity"
        data-embed-type="creator"
        style="max-width: 780px; min-width: 288px;"
      >
        <div class="tiktok-placeholder">
          <div class="tiktok-skeleton-header">
            <div class="tiktok-skeleton-avatar"></div>
            <div class="tiktok-skeleton-meta">
              <div class="tiktok-skeleton-text title"></div>
              <div class="tiktok-skeleton-text subtitle"></div>
            </div>
          </div>
          <div class="tiktok-skeleton-body">
            <div class="tiktok-skeleton-stats">
              <div class="tiktok-skeleton-stat"></div>
              <div class="tiktok-skeleton-stat"></div>
              <div class="tiktok-skeleton-stat"></div>
            </div>
            <div class="tiktok-spinner"></div>
          </div>
        </div>
      </blockquote>
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
  <!-- Feature 1: News Preview Cards -->
  <section class="news-cards">
    {#each newsCards as card}
      <a href={card.url} class="news-card" style="--card-accent: {card.color}">
        <div class="news-card-header">
          <span
            class="news-card-icon"
            style="background: color-mix(in srgb, {card.color} 12%, transparent); color: {card.color};"
          >
            {card.emoji}
          </span>
          <span
            class="news-card-tag"
            style="background: color-mix(in srgb, {card.color} 15%, transparent); color: {card.color}; border: 1px solid color-mix(in srgb, {card.color} 25%, transparent);"
          >
            {card.tag}
          </span>
        </div>
        <div class="news-card-content">
          <h3 class="news-card-title">{card.title}</h3>
          <p class="news-card-desc">{card.desc}</p>
        </div>
        <span class="news-card-cta">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
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
</div>

<style>
  /* ─── Layout ──────────────────────────────────────────────────── */
  .feed-container {
    max-width: 1200px;
    margin: 0 auto;
    padding-bottom: calc(var(--spacing-xl) * 2.5);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    /* Use standard container padding to match layout */
    padding-left: var(--spacing-md);
    padding-right: var(--spacing-md);
  }

  .feed-container > *:not(.page-header) {
    animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  }

  .page-header {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    text-align: left;
    padding: var(--spacing-sm) 0;
    margin: var(--spacing-sm) 0;
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
    font-size: 1.3rem;
    line-height: 0.8rem;
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

  /* ─── Feature 1: News Preview Cards ──────────────────────────── */
  .news-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-md);
    margin: var(--spacing-sm) 0;
  }

  @media (max-width: 1024px) {
    .news-cards {
      grid-template-columns: repeat(3, 1fr);
    }
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
    padding-bottom: calc(var(--spacing-lg) + 24px);
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    text-decoration: none;
    color: var(--text-color);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    height: 100%;
    box-sizing: border-box;
  }

  .news-card::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--card-accent);
    opacity: 0.8;
    transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .news-card:hover {
    transform: translateY(-5px);
    border-color: var(--card-accent);
    box-shadow: 0 12px 24px -10px color-mix(in srgb, var(--card-accent) 25%, transparent);
    background: color-mix(in srgb, var(--card-accent) 2%, var(--card-bg));
  }

  .news-card:hover::before {
    width: 6px;
  }

  .news-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-md);
    gap: var(--spacing-sm);
  }

  .news-card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: var(--radius-lg);
    font-size: 1.25rem;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .news-card:hover .news-card-icon {
    transform: scale(1.1) rotate(5deg);
  }

  .news-card-tag {
    padding: 4px 10px;
    border-radius: 99px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .news-card-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    flex: 1;
    padding-right: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }

  .news-card-title {
    font-size: 1.1rem;
    font-weight: 700;
    line-height: 1.35;
    color: var(--text-color);
    margin: 0;
    transition: color 0.2s ease;
  }

  .news-card:hover .news-card-title {
    color: var(--card-accent);
  }

  .news-card-desc {
    font-size: 0.85rem;
    color: var(--text-color-secondary);
    line-height: 1.5;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .news-card-cta {
    position: absolute;
    bottom: var(--spacing-lg);
    right: var(--spacing-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--card-accent) 8%, var(--card-bg));
    border: 1px solid
      color-mix(in srgb, var(--card-accent) 15%, var(--border-color));
    color: var(--card-accent);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .news-card:hover .news-card-cta {
    background: var(--card-accent);
    color: #fff;
    border-color: var(--card-accent);
    transform: scale(1.1) translateX(2px);
    box-shadow: 0 4px 10px
      color-mix(in srgb, var(--card-accent) 30%, transparent);
  }

  /* ─── Embeds ──────────────────────────────────────────────────── */
  .embed-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-md);
  }

  .embed-card {
    flex: 1 1 100%;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }

  @media (min-width: 768px) {
    .embed-card {
      flex: 1 1 calc(50% - var(--spacing-md));
    }
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

  .embed-label {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-color-secondary, #888);
    border-bottom: 1px solid var(--border-color);
    background: rgba(0, 0, 0, 0.02);
  }

  /* TikTok */
  .tiktok-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    overflow: hidden;
    padding: var(--spacing-md);
    display: flex;
    justify-content: center;
  }

  .tiktok-placeholder {
    padding: 24px;
    min-height: 380px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .tiktok-skeleton-header {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .tiktok-skeleton-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: rgba(150, 150, 150, 0.15);
    animation: pulse 1.5s infinite;
  }

  .tiktok-skeleton-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }

  .tiktok-skeleton-text {
    border-radius: 4px;
    background: rgba(150, 150, 150, 0.15);
    animation: pulse 1.5s infinite;
  }

  .tiktok-skeleton-text.title {
    height: 16px;
    width: 140px;
  }

  .tiktok-skeleton-text.subtitle {
    height: 12px;
    width: 90px;
  }

  .tiktok-skeleton-body {
    flex: 1;
    border-radius: var(--radius-lg);
    background: rgba(150, 150, 150, 0.08);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 220px;
    animation: pulse 1.5s infinite;
  }

  .tiktok-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(150, 150, 150, 0.2);
    border-top-color: #ee1d52;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  /* ─── Social Chips ────────────────────────────────────────────── */
  .social-scroll {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 8px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .social-scroll::-webkit-scrollbar {
    display: none;
  }

  .social-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 100px;
    text-decoration: none;
    color: var(--text-color);
    white-space: nowrap;
    transition: all 0.2s ease;
    box-shadow: var(--shadow-sm);
  }

  .social-chip:hover {
    border-color: var(--chip-color);
    background: color-mix(in srgb, var(--chip-color) 8%, var(--card-bg));
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .chip-icon {
    font-size: 1.1rem;
  }

  .chip-name {
    font-size: 0.9rem;
    font-weight: 600;
  }

  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
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
