<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "$lib/i18n";
  import { settingsStore, CAMPUSES } from "$lib/stores/settingsStore";
  import { getEmailUrl } from "$lib/utils/emailHelper";
  import { getTeamsChatUrl } from "$lib/utils/phoneHelper";
  import StoriesSlider from "$lib/components/StoriesSlider.svelte";
  import SectionHeader from "./SectionHeader.svelte";
  import SuggestClubModal from "$lib/components/SuggestClubModal.svelte";

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
  import { promotions, isPromotionActive } from "$lib/data/promotions";
  import { getNormalizedFeed } from "$lib/data/feedItems";
  import { dynamicClubs, fetchClubs } from "$lib/stores/clubStore";

  export let active = false;

  // ── Stories state automatically reacts to cached store changes ──
  $: stories = $cachedStories;
  $: isStoriesLoading = $storiesLoading;

  let innerWidth = 0;
  let contactSheetOpen = false;
  let clubModalOpen = false;
  $: isPortraitMobile = innerWidth < 600;

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
  $: activePromotions = promotions.filter(
    (promo) =>
      isPromotionActive(promo) &&
      !dismissedPromoIds.includes(promo.id) &&
      (promo.campusIds.includes("all") ||
        promo.campusIds.includes(currentCampusId)),
  );

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

    // Load dismissed promotions
    const stored = localStorage.getItem("dismissed_promotions");
    if (stored) {
      try {
        dismissedPromoIds = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse dismissed promotions", e);
      }
    }

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
        if (
          !document.querySelector(
            'script[src="https://www.tiktok.com/embed.js"]',
          )
        ) {
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

  <nav class="feed-jump-row" aria-label={$t.feed.sections}>
    <a href="#stories"
      ><i class="ph-fill ph-play-circle" aria-hidden="true"></i>
      {$t.feed.campusStories}</a
    >
    <a href="#social-media"
      ><i class="ph-fill ph-instagram-logo" aria-hidden="true"></i>
      {$t.feed.socialMedia}</a
    >
    <a href="#news"
      ><i class="ph-fill ph-newspaper" aria-hidden="true"></i>
      {$t.feed.newsTag}</a
    >
    <a href="#official-pages"
      ><i class="ph-fill ph-seal-check" aria-hidden="true"></i>
      {$t.feed.officialLabel}</a
    >
    <a href="#clubs"
      ><i class="ph-fill ph-users-three" aria-hidden="true"></i>
      {$t.feed.studentClubs}</a
    >
  </nav>

  <!-- Stories bar -->
  <section class="feed-stories-section" id="stories">
    <div class="feed-section-heading">
      <h2>{$t.feed.campusStories}</h2>
      <span>{stories.length || 0} {$t.feed.active}</span>
    </div>
    <StoriesSlider {stories} loading={isStoriesLoading} variant="rectangular" />
  </section>

  <!-- Social Media Embeds -->
  {#if instagramEmbeds.length > 0 || tiktokFeed}
    <section
      class="embed-section social-media-section feed-section"
      id="social-media"
    >
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

  <!-- Feature 1: News Preview Cards -->
  <section class="feed-section" id="news">
    <SectionHeader title={$t.feed.campusUpdates} />
    <NewsCardGrid cards={newsCards} />
  </section>

  <!-- Promotions Section -->
  {#if activePromotions.length > 0}
    <section class="promotions-section feed-section" id="promotions">
      <SectionHeader title={$t.feed.offersForStudents} />
      <div class="promotions-grid">
        {#each activePromotions as promotion (promotion.id)}
          <PromotionCard {promotion} onDismiss={dismissPromotion} />
        {/each}
      </div>
    </section>
  {/if}

  <!-- Official Pages Chips -->
  <div id="official-pages" class="feed-section">
    <OfficialAccountsSection accounts={officialAccounts} />
  </div>

  <!-- Student Clubs -->
  <div id="clubs" class="feed-section">
    <ClubsSection
      accounts={clubAccounts}
      onSuggest={() => (clubModalOpen = true)}
    />
  </div>

  <SuggestClubModal bind:isOpen={clubModalOpen} />
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

  .feed-jump-row {
    display: flex;
    gap: var(--spacing-sm);
    overflow-x: auto;
    padding: 1px 0 8px;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .feed-jump-row::-webkit-scrollbar {
    display: none;
  }

  .feed-jump-row a {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 42px;
    padding: 0 13px;
    background: var(--surface-solid);
    border: 1px solid #e5e5e5;
    border-radius: 999px;
    color: var(--text-color);
    text-decoration: none;
    font-size: 0.86rem;
    font-weight: 800;
    white-space: nowrap;
    box-shadow: var(--campus-shadow-soft);
  }

  .feed-jump-row a i {
    color: var(--primary-color);
    font-size: 1.05rem;
  }

  .feed-jump-row a:hover {
    border-color: rgba(212, 68, 7, 0.28);
    color: var(--primary-color);
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

  .promotions-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-md);
  }

  :global([data-theme="dark"]) .feed-status-card,
  :global([data-theme="dark"]) .feed-jump-row a {
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
