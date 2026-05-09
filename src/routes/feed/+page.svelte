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
  import type { Story } from "$lib/components/StoriesSlider.svelte";
  import storiesJson from "$lib/data/stories.json";

  // ── Stories ──────────────────────────────────────────────────
  let stories: Story[] = (storiesJson as Story[]);

  async function loadGoogleSheetStories() {
    try {
      const response = await fetch("/api/stories");
      if (!response.ok) throw new Error("Could not load stories");
      const fetchedStories = await response.json();
      if (fetchedStories && fetchedStories.length > 0) {
        stories = fetchedStories;
      }
    } catch (err) {
      console.warn("Failed to load stories, falling back to local stories.json:", err);
    }
  }

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
    loadGoogleSheetStories();

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

  // ── LinkedIn RSS state ───────────────────────────────────────
  let linkedinPosts: Array<{
    id: string;
    url: string;
    title: string;
    content: string;
    image: string;
    date: string;
    likes: number;
    comments: number;
  }> = [];

  let loadingLinkedIn = true;
  let linkedinError = false;

  async function translateText(text: string, toLang: string): Promise<string> {
    if (!text) return "";
    const cleanText = text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '');
    try {
      const queryText = cleanText.substring(0, 400);
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(queryText)}&langpair=de|${toLang}`);
      const data = await res.json();
      if (data && data.responseData && data.responseData.translatedText) {
        let translated = data.responseData.translatedText;
        if (cleanText.length < text.length) {
          translated += "...";
        }
        return translated;
      }
    } catch (err) {
      console.error("Translation error:", err);
    }
    return text;
  }

  async function fetchLinkedInFeed(lang: "en" | "de") {
    try {
      loadingLinkedIn = true;
      const response = await fetch("https://rss.app/feeds/v1.1/7pSXm6fTcatUllMR.json");
      const data = await response.json();
      const items = (data.items || []).slice(0, 4);

      const postsPromises = items.map(async (item: any) => {
        let title = item.title || "";
        let content = item.content_text || "";

        if (content.length > 250) {
          content = content.substring(0, 250) + "...";
        }


        const seed = item.id ? item.id.charCodeAt(0) + item.id.charCodeAt(1) : 42;
        const likes = (seed % 90) + 30;
        const comments = (seed % 15) + 3;

        return {
          id: item.id,
          url: item.url || "https://www.linkedin.com/school/srh-university/posts/",
          title,
          content,
          image: item.image || "",
          date: item.date_published ? new Date(item.date_published).toLocaleDateString(lang === "de" ? "de-DE" : "en-US", {
            day: "numeric",
            month: "short",
            year: "numeric"
          }) : "Recent",
          likes,
          comments
        };
      });

      linkedinPosts = await Promise.all(postsPromises);
      if (linkedinPosts.length > 0 && linkedinPosts[0].image && typeof document !== "undefined") {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = linkedinPosts[0].image;
        link.fetchPriority = "high";
        document.head.appendChild(link);
      }
      linkedinError = false;
    } catch (err) {
      console.error("Error fetching LinkedIn RSS:", err);
      linkedinError = true;
    } finally {
      loadingLinkedIn = false;
    }
  }

  $: if (typeof window !== "undefined" && $settingsStore.language) {
    fetchLinkedInFeed($settingsStore.language);
  }

  let activePostIndex = 0;

  function nextSlide() {
    activePostIndex = (activePostIndex + 1) % linkedinPosts.length;
  }

  function prevSlide() {
    activePostIndex = (activePostIndex - 1 + linkedinPosts.length) % linkedinPosts.length;
  }

  function selectSlide(index: number) {
    activePostIndex = index;
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

  <!-- Feature 7: LinkedIn Embed Wrapper -->
  <section class="linkedin-section">
    <div class="linkedin-section-header">
      <h2 class="section-title">{($t.feed as any)?.linkedinFeed || "LinkedIn Updates"}</h2>
      <a href="https://www.linkedin.com/school/srh-university/posts/" target="_blank" rel="noopener noreferrer" class="linkedin-view-all-btn">
        <span>View on LinkedIn</span>
        <svg viewBox="0 0 24 24" class="btn-arrow"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
      </a>
    </div>
    
    {#if loadingLinkedIn}
      <div class="linkedin-grid">
        {#each Array(2) as _}
          <div class="linkedin-custom-card skeleton">
            <div class="skeleton-header">
              <div class="skeleton-avatar"></div>
              <div class="skeleton-meta">
                <div class="skeleton-line short"></div>
                <div class="skeleton-line medium"></div>
              </div>
            </div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-image"></div>
          </div>
        {/each}
      </div>
    {:else if linkedinError}
      <div class="linkedin-error-card">
        <p>Could not load live LinkedIn updates at this time.</p>
        <a href="https://www.linkedin.com/school/srh-university/posts/" target="_blank" rel="noopener noreferrer" class="linkedin-view-all-btn">
          View on LinkedIn
        </a>
      </div>
    {:else}
      <div class="linkedin-slider-container">
        <!-- Main Featured Slide -->
        <div class="linkedin-main-slide-wrapper">
          <button class="slider-arrow prev" on:click={prevSlide} aria-label="Previous Post">
            <svg viewBox="0 0 24 24" class="arrow-icon"><path d="M15 19l-7-7 7-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          </button>
          
          <div class="linkedin-custom-card active-slide">
            <div class="linkedin-card-header">
              <div class="linkedin-author-info">
                <div class="linkedin-avatar-container">
                  <img src="/icon-light.png" alt="SRH Logo" class="linkedin-avatar-img" />
                  <div class="linkedin-sub-icon">
                    <svg viewBox="0 0 24 24" class="linkedin-icon-mini"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" fill="currentColor"/></svg>
                  </div>
                </div>
                <div class="linkedin-meta-details">
                  <div class="linkedin-author-name">SRH University</div>
                  <div class="linkedin-author-desc">Education Administration Programs • Berlin</div>
                  <div class="linkedin-post-time">{linkedinPosts[activePostIndex]?.date || "Recent"} • 🌐</div>
                </div>
              </div>
              <a href={linkedinPosts[activePostIndex]?.url || "https://www.linkedin.com/school/srh-university/posts/"} target="_blank" rel="noopener noreferrer" class="linkedin-card-follow">
                <span>Read More</span>
              </a>
            </div>
            
            <div class="linkedin-post-text">
              {linkedinPosts[activePostIndex]?.content || ""}
            </div>
            
            {#if linkedinPosts[activePostIndex]?.image}
              <div class="linkedin-post-image-container">
                <img src={linkedinPosts[activePostIndex].image} alt="LinkedIn Post Visual" class="linkedin-post-image-img" fetchpriority="high" decoding="sync" />
              </div>
            {/if}
            
            <div class="linkedin-engagement-stats">
              <div class="linkedin-reactions">
                <span class="reaction-emoji">👍</span>
                <span class="reaction-emoji">❤️</span>
                <span class="reaction-count">{linkedinPosts[activePostIndex]?.likes || 0}</span>
              </div>
              <div class="linkedin-replies">
                <span>{linkedinPosts[activePostIndex]?.comments || 0} comments • {Math.round((linkedinPosts[activePostIndex]?.comments || 0) / 2)} reposts</span>
              </div>
            </div>
            
            <div class="linkedin-card-actions">
              <a href={linkedinPosts[activePostIndex]?.url || "https://www.linkedin.com/school/srh-university/posts/"} target="_blank" rel="noopener noreferrer" class="linkedin-action-btn-link primary-action">
                <span>🔗 {$t.feed.readMore || "Read More"}</span>
              </a>
            </div>
          </div>
          
          <button class="slider-arrow next" on:click={nextSlide} aria-label="Next Post">
            <svg viewBox="0 0 24 24" class="arrow-icon"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          </button>
        </div>

        <!-- Small Previews Bar -->
        <div class="linkedin-previews-bar">
          {#each linkedinPosts as post, idx}
            <button 
              class="linkedin-preview-chip {activePostIndex === idx ? 'active' : ''}" 
              on:click={() => selectSlide(idx)}
              aria-label="View post {idx + 1}"
            >
              <div class="preview-thumbnail">
                <img src={post.image || '/icon-light.png'} alt="Preview thumbnail" class="preview-thumb-img" />
              </div>
              <div class="preview-chip-meta">
                <div class="preview-chip-title">{post.title || 'SRH Post'}</div>
                <div class="preview-chip-date">{post.date}</div>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/if}
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
    gap: var(--spacing-md);
    margin: var(--spacing-sm) var(--spacing-md);
    grid-auto-columns: 33.3339%;
  }

  @media (max-width: 1024px) {
    .news-cards {
      grid-template-columns: repeat(3, 1fr);
      grid-auto-columns: 33.3339%;
    }
  }

  @media (max-width: 768px) {
    .news-cards {
      grid-template-columns: 1fr;
      gap: var(--spacing-md);
      margin: var(--spacing-sm) 0;
      grid-auto-columns: 33.3339%;
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
    margin: 0px 0px 0px;
  }

  @media (prefers-color-scheme: dark) {
    .embed-label {
      background: rgba(255, 255, 255, 0.03);
    }
  }

  /* ─── Feature 6: TikTok Feed ─────────────────────────────────── */
  .tiktok-section {
    margin-bottom: var(--spacing-xl);
  }

  .tiktok-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    padding: var(--spacing-md);
    display: flex;
    justify-content: center;
    transition: all 0.3s ease;
  }

  .tiktok-card:hover {
    box-shadow: var(--shadow-md);
    border-color: #ee1d52; /* TikTok Brand Color */
  }

  .tiktok-placeholder {
    padding: 24px;
    min-height: 380px;
    width: 100%;
    max-width: 780px;
    background: var(--card-bg);
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-sizing: border-box;
    margin: -2px auto;
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
    gap: 16px;
    min-height: 220px;
    animation: pulse 1.5s infinite;
    position: relative;
  }

  .tiktok-skeleton-stats {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .tiktok-skeleton-stat {
    height: 14px;
    width: 60px;
    border-radius: 4px;
    background: rgba(150, 150, 150, 0.15);
  }

  .tiktok-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid rgba(150, 150, 150, 0.2);
    border-top-color: #ee1d52; /* TikTok Brand Pink */
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @media (min-width: 1024px) {
    .tiktok-section {
      width: 100%;
    }
  }

  /* ─── Feature 7: LinkedIn Feed ───────────────────────────────── */
  .linkedin-section {
    margin-bottom: var(--spacing-xl);
    padding: 0 var(--spacing-md);
  }

  .linkedin-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }

  .linkedin-view-all-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: color-mix(in srgb, #0077b5 10%, transparent);
    color: #0077b5;
    border: 1px solid color-mix(in srgb, #0077b5 20%, transparent);
    padding: var(--spacing-xs) var(--spacing-md);
    border-radius: 30px;
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .linkedin-view-all-btn:hover {
    background: #0077b5;
    color: #fff;
    border-color: #0077b5;
  }

  .linkedin-view-all-btn .btn-arrow {
    width: 14px;
    height: 14px;
    transition: transform 0.2s ease;
  }

  .linkedin-view-all-btn:hover .btn-arrow {
    transform: translateX(3px);
  }

  .linkedin-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
    max-width: 1200px;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .linkedin-grid {
      grid-template-columns: 1fr;
    }
  }

  .linkedin-custom-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .linkedin-custom-card:hover {
    box-shadow: var(--shadow-md);
    border-color: #0077b5;
    transform: translateY(-2px);
  }

  .linkedin-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .linkedin-author-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .linkedin-avatar-container {
    position: relative;
    width: 48px;
    height: 48px;
  }

  .linkedin-avatar-img {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: contain;
    background: #fff;
    border: 1px solid var(--border-color);
  }

  .linkedin-sub-icon {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 18px;
    height: 18px;
    background: #0077b5;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid var(--card-bg);
  }

  .linkedin-icon-mini {
    width: 10px;
    height: 10px;
  }

  .linkedin-meta-details {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .linkedin-author-name {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--text-color);
  }

  .linkedin-author-desc {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
  }

  .linkedin-post-time {
    font-size: 0.7rem;
    color: var(--text-color-secondary);
  }

  .linkedin-card-follow {
    font-size: 0.82rem;
    font-weight: 700;
    color: #0077b5;
    text-decoration: none;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.2s ease;
  }

  .linkedin-card-follow:hover {
    background: color-mix(in srgb, #0077b5 10%, transparent);
  }

  .linkedin-post-text {
    font-size: 0.88rem;
    line-height: 1.45;
    color: var(--text-color);
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .linkedin-hashtag {
    color: #0077b5;
    font-weight: 500;
  }

  .linkedin-post-image-container {
    height: 200px;
    border-radius: var(--radius-lg);
    overflow: hidden;
    position: relative;
    border: 1px solid var(--border-color);
    background: rgba(0, 0, 0, 0.02);
  }

  .linkedin-post-image-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .linkedin-engagement-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px solid var(--border-color);
    font-size: 0.78rem;
    color: var(--text-color-secondary);
  }

  .linkedin-reactions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .reaction-emoji {
    font-size: 0.9rem;
  }

  .reaction-count {
    margin-left: 4px;
  }

  .linkedin-card-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 4px;
    padding-top: 4px;
  }

  .linkedin-action-btn-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, #0077b5 8%, transparent);
    border: 1px solid color-mix(in srgb, #0077b5 20%, transparent);
    color: #0077b5;
    font-size: 0.85rem;
    font-weight: 700;
    padding: 10px var(--spacing-md);
    border-radius: var(--radius-lg);
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    text-align: center;
    width: 100%;
    box-sizing: border-box;
    gap: var(--spacing-xs);
  }

  .linkedin-action-btn-link:hover {
    background: #0077b5;
    color: #fff;
    border-color: #0077b5;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 119, 181, 0.2);
  }

  .linkedin-action-btn-link:active {
    transform: translateY(0);
  }

  .linkedin-error-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    text-align: center;
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
  }

  /* Skeleton loaders */
  .linkedin-custom-card.skeleton {
    pointer-events: none;
  }

  .skeleton-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    width: 100%;
  }

  .skeleton-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--border-color);
    animation: pulse 1.5s infinite;
  }

  .skeleton-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }

  .skeleton-line {
    height: 12px;
    background: var(--border-color);
    border-radius: 4px;
    animation: pulse 1.5s infinite;
  }

  .skeleton-line.short {
    width: 40%;
  }

  .skeleton-line.medium {
    width: 70%;
  }

  .skeleton-text {
    height: 14px;
    background: var(--border-color);
    border-radius: 4px;
    width: 100%;
    animation: pulse 1.5s infinite;
  }

  .skeleton-image {
    height: 200px;
    background: var(--border-color);
    border-radius: var(--radius-lg);
    width: 100%;
    animation: pulse 1.5s infinite;
  }

  /* ─── LinkedIn Slider & Small Previews Styles ─────────────────── */
  .linkedin-slider-container {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .linkedin-main-slide-wrapper {
    position: relative;
    width: 100%;
  }

  .active-slide {
    width: 100%;
    animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .slider-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    color: var(--text-color);
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: var(--shadow-md);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    flex-shrink: 0;
    z-index: 10;
  }

  .slider-arrow.prev {
    left: -21px;
  }

  .slider-arrow.next {
    right: -21px;
  }

  .slider-arrow:hover {
    background: var(--primary-color);
    color: #fff;
    border-color: var(--primary-color);
    transform: translateY(-50%) scale(1.08);
  }

  .slider-arrow:active {
    transform: translateY(-50%) scale(0.95);
  }

  @media (max-width: 600px) {
    .slider-arrow.prev {
      left: 6px;
    }
    .slider-arrow.next {
      right: 6px;
    }
  }

  .slider-arrow .arrow-icon {
    width: 20px;
    height: 20px;
  }

  .linkedin-previews-bar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-sm);
    width: 100%;
  }

  @media (max-width: 768px) {
    .linkedin-previews-bar {
      grid-template-columns: repeat(2, 1fr);
    }
    .slider-arrow {
      width: 36px;
      height: 36px;
    }
  }

  .linkedin-preview-chip {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
    width: 100%;
  }

  .linkedin-preview-chip:hover {
    background: rgba(0, 119, 181, 0.05);
    border-color: #0077b5;
  }

  .linkedin-preview-chip.active {
    background: rgba(0, 119, 181, 0.08);
    border-color: #0077b5;
    box-shadow: 0 0 0 1px #0077b5;
  }

  .preview-thumbnail {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    overflow: hidden;
    flex-shrink: 0;
    border: 1px solid var(--border-color);
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .preview-thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .preview-chip-meta {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;
  }

  .preview-chip-title {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .preview-chip-date {
    font-size: 0.65rem;
    color: var(--text-color-secondary);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
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

    .social-section {
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
