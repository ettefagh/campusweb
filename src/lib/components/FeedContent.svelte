<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "$lib/i18n";
  import { settingsStore, CAMPUSES } from "$lib/stores/settingsStore";
  import { getEmailUrl } from "$lib/utils/emailHelper";
  import { getTeamsChatUrl } from "$lib/utils/phoneHelper";
  import StoriesSlider from "$lib/components/StoriesSlider.svelte";
  import SectionHeader from "./SectionHeader.svelte";
  import SuggestClubModal from "$lib/components/SuggestClubModal.svelte";
  import SuggestPromoModal from "$lib/components/SuggestPromoModal.svelte";
  import Tabs from "$lib/components/ui/Tabs.svelte";
  import TabContent from "$lib/components/ui/TabContent.svelte";

  import PromotionCard from "$lib/components/PromotionCard.svelte";
  import OfficialAccountsSection from "$lib/components/OfficialAccountsSection.svelte";
  import ClubsSection from "$lib/components/ClubsSection.svelte";
  import NewsCardGrid from "$lib/components/NewsCardGrid.svelte";
  import {
    cachedStories,
    getStories,
    storiesLoading,
  } from "$lib/stores/feedCache";
  import { socialAccounts } from "$lib/data/socialAccounts";
  import { isPromotionActive } from "$lib/data/promotions";
  import { getNormalizedFeed } from "$lib/data/feedItems";
  import { dynamicClubs, fetchClubs } from "$lib/stores/clubStore";
  import { dynamicPromotions, fetchPromotions } from "$lib/stores/promoStore";

  export let active = false;

  // ── Stories state automatically reacts to cached store changes ──
  $: stories = $cachedStories;
  $: isStoriesLoading = $storiesLoading;

  let innerWidth = 0;
  let contactSheetOpen = false;
  let clubModalOpen = false;
  let promoModalOpen = false;
  $: isPortraitMobile = innerWidth < 600;

  // ── Tab navigation state ──────────────────────────────────────
  let activeTab = "overview";
  let socialTabVisited = false;

  const feedTabs = [
    { id: "overview", label: "Overview", icon: "📡" },
    { id: "social",   label: "Social",   icon: "📸" },
    { id: "pages",    label: "Pages",    icon: "✓" },
    { id: "clubs",    label: "Clubs",    icon: "👥" },
  ];

  function handleTabChange(e: CustomEvent<{ id: string }>) {
    activeTab = e.detail.id;
    if (activeTab === "social" && !socialTabVisited) {
      socialTabVisited = true;
      loadSocialEmbeds();
    }
  }

  function loadSocialEmbeds() {
    if (typeof window === "undefined") return;
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
    if (!document.querySelector('script[src="https://www.tiktok.com/embed.js"]')) {
      const tiktokScript = document.createElement("script");
      tiktokScript.src = "https://www.tiktok.com/embed.js";
      tiktokScript.async = true;
      document.body.appendChild(tiktokScript);
    }
  }

  // ── Directory state ──────────────────────────────────────────

  $: currentCampusId = $settingsStore.campusId ?? "all";
  $: feedItems = getNormalizedFeed(currentCampusId);
  $: currentCampusName =
    CAMPUSES.find((campus) => campus.id === currentCampusId)?.name ||
    $t.feed.allCampuses;

  $: officialAccounts = socialAccounts
    .filter(
      (acc) =>
        acc.type === "official" &&
        (acc.campusIds.includes("all") ||
          acc.campusIds.includes(currentCampusId)),
    )
    .sort((a, b) => b.priority - a.priority);

  $: clubAccounts = [...socialAccounts, ...$dynamicClubs]
    .filter(
      (acc) =>
        acc.type === "club" &&
        (acc.campusIds.includes("all") ||
          acc.campusIds.includes(currentCampusId)),
    )
    .sort((a, b) => b.priority - a.priority);

  $: instagramEmbeds = officialAccounts
    .filter((acc) => acc.platform === "instagram")
    .slice(0, 2);

  const tiktokFeed = {
    title: "TikTok",
    label: "srhuniversity",
    cite: "https://www.tiktok.com/@srhuniversity",
  };

  let dismissedPromoIds: string[] = [];
  $: activePromotions = $dynamicPromotions.filter(
    (promo) =>
      isPromotionActive(promo) &&
      !dismissedPromoIds.includes(promo.id) &&
      (promo.campusIds.includes("all") ||
        promo.campusIds.includes(currentCampusId)),
  );

  let interleavedFeed: Array<{ type: 'news' | 'promo'; data: any }> = [];
  $: interleavedFeed = (() => {
    let result: Array<{ type: 'news' | 'promo'; data: any }> = [];
    let promoIndex = 0;
    newsCards.forEach((card, index) => {
      result.push({ type: 'news', data: card });
      // Interleave a promotion card after every 2 news cards
      if ((index + 1) % 2 === 0 && promoIndex < activePromotions.length) {
        result.push({ type: 'promo', data: activePromotions[promoIndex] });
        promoIndex++;
      }
    });
    // Append remaining active promotions
    while (promoIndex < activePromotions.length) {
      result.push({ type: 'promo', data: activePromotions[promoIndex] });
      promoIndex++;
    }
    return result;
  })();

  function dismissPromotion(id: string) {
    dismissedPromoIds = [...dismissedPromoIds, id];
    localStorage.setItem(
      "dismissed_promotions",
      JSON.stringify(dismissedPromoIds),
    );
  }

  onMount(() => {
    getStories(); // Only hits network if last load > refreshRate
    fetchClubs(); // Load dynamic clubs from KV
    fetchPromotions(); // Load dynamic promotions from KV

    // Load dismissed promotions
    const stored = localStorage.getItem("dismissed_promotions");
    if (stored) {
      try {
        dismissedPromoIds = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse dismissed promotions", e);
      }
    }

    // Social media embeds are now deferred until the Social tab is first visited
    // via handleTabChange → loadSocialEmbeds()
  });

  // Re-process embeds when the component becomes active and social tab was visited
  $: if (active && socialTabVisited && typeof window !== "undefined") {
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
    iconClass?: string;
    title: string;
    desc: string;
    url: string;
    color: string;
  }> = [];
  $: newsCards = [
    {
      tag: $t.feed.eventsTag,
      emoji: "📅",
      iconClass: "ph-calendar-dots",
      title: $t.feed.eventsTitle,
      desc: $t.feed.eventsDesc,
      url: "/viewer?url=https://www.srh-university.de/en/events/",
      color: "#2FA4D7",
    },
    {
      tag: $t.feed.newsTag,
      emoji: "📰",
      iconClass: "ph-newspaper",
      title: $t.feed.newsTitle,
      desc: $t.feed.newsDesc,
      url: "/viewer?url=https://www.srh-university.de/en/news/",
      color: "#D44407",
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
      label: $t.feed.teams,
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

<div class="feed-container" style:display={active ? "flex" : "none"}>
  <header class="feed-hero">
    <div class="feed-hero-copy">
      <span class="feed-eyebrow">{$t.feed.campusPulse}</span>
      <h1>{$t.feed.title}</h1>
      <p class="feed-subtitle">{$t.feed.subtitle}</p>
    </div>

    <div class="feed-status-card" aria-label={$t.feed.currentScope}>
      <span class="status-icon"
        ><i class="ph-fill ph-broadcast" aria-hidden="true"></i></span
      >
      <div class="status-copy">
        <span>{currentCampusName}</span>
        <strong>{feedItems.length} {$t.feed.sources}</strong>
      </div>
    </div>
  </header>

  <!-- ── Tab Navigation ──────────────────────────────────────── -->
  <Tabs tabs={feedTabs} bind:activeTab on:change={handleTabChange} />

  <TabContent activeTabId={activeTab} let:renderedTabId>
    {#if renderedTabId === "overview"}
      <!-- ── OVERVIEW TAB ── -->
      <div class="feed-tab-panel">
        <!-- Stories bar -->
        <section class="feed-stories-section" id="stories">
          <div class="feed-section-heading">
            <h2>{$t.feed.campusStories}</h2>
            <span>{stories.length || 0} {$t.feed.active}</span>
          </div>
          <StoriesSlider {stories} loading={isStoriesLoading} variant="rectangular" />
        </section>

        <!-- Campus Updates & Promotions Interleaved -->
        <section class="feed-section" id="news">
          <SectionHeader title={$t.feed.campusUpdates} />
          <div class="news-cards">
            {#each interleavedFeed as item}
              {#if item.type === 'news'}
                <a href={item.data.url} class="news-card" style="--card-accent: {item.data.color}">
                  <div class="news-card-main">
                    <span class="news-card-icon" style="background: {item.data.color};">
                      {#if item.data.iconClass}
                        <i class="ph-fill {item.data.iconClass}" aria-hidden="true"></i>
                      {:else}
                        {item.data.emoji}
                      {/if}
                    </span>
                    <div class="news-card-content">
                      <h3 class="news-card-title">{item.data.title}</h3>
                      <p class="news-card-desc">{item.data.desc}</p>
                    </div>
                  </div>
                  <div class="news-card-side">
                    <span class="news-card-tag">
                      {item.data.tag}
                    </span>
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
                  </div>
                </a>
              {:else if item.type === 'promo'}
                <PromotionCard promotion={item.data} onDismiss={dismissPromotion} />
              {/if}
            {/each}
          </div>
          <div class="suggest-action-wrap" style="margin-top: 24px; display: flex; justify-content: center;">
            <button class="suggest-btn" on:click={() => (promoModalOpen = true)}>
              + Suggest Promotion
            </button>
          </div>
        </section>
      </div>

    {:else if renderedTabId === "social"}
      <!-- ── SOCIAL TAB ── -->
      <div class="feed-tab-panel">
        {#if instagramEmbeds.length > 0 || tiktokFeed}
          <section class="embed-section social-media-section feed-section" id="social-media">
            <SectionHeader title={$t.feed.socialMedia} />
            <div class="embed-wrapper">
              {#each instagramEmbeds as acc}
                <div class="embed-card">
                  <div class="embed-label">@{acc.handle}</div>
                  <blockquote
                    class="instagram-media"
                    data-instgrm-permalink={acc.url}
                    data-instgrm-version="14"
                    style="background:#FFF; border:0; border-radius:8px; box-shadow:none; margin: 0; max-width:100%; min-width:280px; padding:8px; width:100%; margin-bottom: -18px;"
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
              {/each}

              <div class="embed-card tiktok-embed-card">
                <div class="embed-label">#{tiktokFeed.label}</div>
                <div class="tiktok-card">
                  <blockquote
                    class="tiktok-embed"
                    cite={tiktokFeed.cite}
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
              </div>
            </div>
          </section>
        {/if}
      </div>

    {:else if renderedTabId === "pages"}
      <!-- ── PAGES TAB ── -->
      <div class="feed-tab-panel">
        <div id="official-pages" class="feed-section">
          <OfficialAccountsSection accounts={officialAccounts} />
        </div>
      </div>

    {:else if renderedTabId === "clubs"}
      <!-- ── CLUBS TAB ── -->
      <div class="feed-tab-panel">
        <div id="clubs" class="feed-section">
          <ClubsSection
            accounts={clubAccounts}
            onSuggest={() => (clubModalOpen = true)}
          />
        </div>
      </div>
    {/if}
  </TabContent>

  <SuggestClubModal bind:isOpen={clubModalOpen} />
  <SuggestPromoModal bind:isOpen={promoModalOpen} />
</div>

<style>
  .feed-container {
    max-width: 1200px;
    margin: 0 auto;
    padding-bottom: calc(var(--spacing-xl) * 2.5);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-lg);
    padding-left: var(--spacing-md);
    padding-right: var(--spacing-md);
  }

  .feed-tab-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  @media (max-width: 560px) {
    .feed-tab-panel {
      gap: var(--spacing-md);
    }
  }

  .feed-hero {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-md);
    padding-top: calc(env(safe-area-inset-top) + var(--spacing-sm));
  }

  .feed-hero-copy {
    min-width: 0;
  }

  .feed-eyebrow {
    display: block;
    color: var(--primary-color);
    font-size: 1rem;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 3px;
  }

  .feed-hero h1 {
    color: var(--text-color);
    font-size: clamp(2rem, 5vw, 2.55rem);
    line-height: 1;
    letter-spacing: 0;
    margin: 0;
  }

  .feed-subtitle {
    color: var(--text-color-secondary);
    font-size: 0.96rem;
    line-height: 1.35;
    margin: 8px 0 0;
    max-width: 34rem;
  }

  .feed-status-card {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 178px;
    padding: 12px 14px;
    background: var(--surface-solid);
    border: 1px solid #e5e5e5;
    border-radius: 18px;
    box-shadow: var(--campus-shadow-soft);
  }

  .status-icon {
    width: 42px;
    height: 42px;
    border-radius: 13px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #f35b04;
    color: #ffffff;
    font-size: 1.25rem;
    flex: 0 0 auto;
  }

  .status-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 2px;
  }

  .status-copy span {
    color: var(--text-color-secondary);
    font-size: 0.76rem;
    font-weight: 700;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .status-copy strong {
    color: var(--text-color);
    font-size: 0.95rem;
    line-height: 1.15;
  }



  .feed-section,
  .feed-stories-section {
    animation: reveal 0.55s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  }

  .feed-stories-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .feed-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
  }

  .feed-section-heading h2 {
    color: var(--text-color);
    font-size: 1.32rem;
    line-height: 1.1;
    margin: 0;
  }

  .feed-section-heading span {
    color: var(--primary-color);
    font-size: 0.86rem;
    font-weight: 800;
    white-space: nowrap;
  }

  .news-cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-md);
    margin: var(--spacing-sm) 0;
    align-items: stretch;
  }

  @media (max-width: 1024px) {
    .news-cards {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 768px) {
    .news-cards {
      grid-template-columns: 1fr;
    }
  }

  .news-card {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: stretch;
    gap: var(--spacing-md);
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--surface-solid);
    border: 1px solid #e5e5e5;
    border-radius: 18px;
    text-decoration: none;
    color: var(--text-color);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    overflow: hidden;
    box-shadow: var(--campus-shadow-soft);
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
    box-shadow: var(--campus-shadow);
    background: #ffffff;
  }

  .news-card:hover::before {
    width: 6px;
  }

  .news-card-main {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    min-width: 0;
  }

  .news-card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    border-radius: var(--radius-lg);
    font-size: 1.35rem;
    color: #ffffff;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .news-card:hover .news-card-icon {
    transform: scale(1.1) rotate(5deg);
  }

  .news-card-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    min-width: 0;
    justify-content: center;
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
    color: var(--primary-color);
  }

  .news-card-desc {
    font-size: 0.85rem;
    color: var(--text-color-secondary);
    line-height: 1.5;
    margin: 0;
    line-clamp: 3;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .news-card-side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--spacing-md);
    min-width: 92px;
  }

  .news-card-tag {
    background: #fff6dc;
    border: 1px solid #f7b801;
    color: var(--primary-color);
    padding: 4px 10px;
    border-radius: 99px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: center;
    white-space: nowrap;
  }

  .news-card-cta {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #ffffff;
    border: 1px solid #e5e5e5;
    color: var(--card-accent);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .news-card:hover .news-card-cta {
    background: var(--card-accent);
    color: #fff;
    border-color: var(--card-accent);
    transform: scale(1.1) translateX(2px);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
  }

  :global([data-theme="dark"]) .news-card,
  :global([data-theme="dark"]) .news-card-cta {
    border-color: rgba(255, 255, 255, 0.11);
  }

  @media (max-width: 640px) {
    .news-card {
      grid-template-columns: 1fr;
    }

    .news-card-side {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      min-width: 0;
      padding-left: calc(42px + var(--spacing-md));
    }
  }

  :global([data-theme="dark"]) .feed-status-card {
    border-color: rgba(255, 255, 255, 0.11);
  }

  @media (max-width: 700px) {
    .feed-hero {
      align-items: stretch;
      flex-direction: column;
    }

    .feed-status-card {
      width: 100%;
    }
  }

  @media (max-width: 560px) {
    .feed-container {
      gap: var(--spacing-md);
    }

    .promotions-grid {
      grid-template-columns: 1fr;
    }
  }

  /* ─── Embeds ──────────────────────────────────────────────────── */
  .embed-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-md);
    align-items: stretch;
  }

  .embed-card {
    flex: 1 1 100%;
    background: var(--surface-solid);
    border: 1px solid #e5e5e5;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: var(--campus-shadow-soft);
  }

  @media (min-width: 768px) {
    .embed-card {
      flex: 1 1 calc(50% - var(--spacing-md));
    }
  }

  .social-media-section .embed-card {
    display: flex;
    flex-direction: column;
  }

  .insta-placeholder {
    padding: 16px;
    min-height: 450px;
    background: var(--surface-solid);
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
    font-weight: 800;
    color: var(--text-color-secondary, #888);
    border-bottom: 1px solid #e5e5e5;
    background: #f5f0e6;
  }

  :global([data-theme="dark"]) .embed-card,
  :global([data-theme="dark"]) .embed-label {
    border-color: rgba(255, 255, 255, 0.11);
  }

  :global([data-theme="dark"]) .embed-label {
    background: rgba(255, 255, 255, 0.08);
  }

  /* TikTok */
  .tiktok-card {
    background: transparent;
    border: 0;
    border-radius: 0;
    overflow: hidden;
    margin-top: -19px;
    margin-bottom: -18px;
    display: flex;
    justify-content: center;
    flex: 1;
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
