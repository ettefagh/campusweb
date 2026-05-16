<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "$lib/i18n";
  import {
    settingsStore,
    CAMPUSES,
  } from "$lib/stores/settingsStore";
  import { getEmailUrl } from "$lib/utils/emailHelper";
  import { getTeamsChatUrl } from "$lib/utils/phoneHelper";
  import StoriesSlider from "$lib/components/StoriesSlider.svelte";
  import SectionHeader from "./SectionHeader.svelte";
  import SuggestClubModal from "$lib/components/SuggestClubModal.svelte";

  import PromotionCard from "$lib/components/PromotionCard.svelte";
  import OfficialAccountsSection from "$lib/components/OfficialAccountsSection.svelte";
  import ClubsSection from "$lib/components/ClubsSection.svelte";
  import NewsCardGrid from "$lib/components/NewsCardGrid.svelte";
  import { cachedStories, getStories, storiesLoading } from "$lib/stores/feedCache";
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

  $: officialAccounts = socialAccounts.filter(acc => 
    acc.type === "official" && (acc.campusIds.includes("all") || acc.campusIds.includes(currentCampusId))
  ).sort((a, b) => b.priority - a.priority);

  $: clubAccounts = [...socialAccounts, ...$dynamicClubs]
    .filter(acc => 
      acc.type === "club" && (acc.campusIds.includes("all") || acc.campusIds.includes(currentCampusId))
    ).sort((a, b) => b.priority - a.priority);

  $: instagramEmbeds = officialAccounts
    .filter(acc => acc.platform === "instagram")
    .slice(0, 2);

  const tiktokFeed = {
    title: "TikTok",
    label: "srhuniversity",
    cite: "https://www.tiktok.com/@srhuniversity",
    uniqueId: "srhuniversity"
  };

  let dismissedPromoIds: string[] = [];
  $: activePromotions = promotions.filter(promo => 
    isPromotionActive(promo) &&
    !dismissedPromoIds.includes(promo.id) &&
    (promo.campusIds.includes("all") || promo.campusIds.includes(currentCampusId))
  );

  function dismissPromotion(id: string) {
    dismissedPromoIds = [...dismissedPromoIds, id];
    localStorage.setItem("dismissed_promotions", JSON.stringify(dismissedPromoIds));
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
  <header class="page-header" class:narrow={$settingsStore.headerSize === 'small'}>
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
  <StoriesSlider {stories} loading={isStoriesLoading} />

  <!-- Social Media Embeds -->
  {#if instagramEmbeds.length > 0 || tiktokFeed}
    <section class="embed-section social-media-section" id="social-media">
      <SectionHeader title="Social Media" />
      <div class="embed-wrapper">
        {#each instagramEmbeds as acc}
          <div class="embed-card">
            <div class="embed-label">@{acc.handle}</div>
            <blockquote
              class="instagram-media"
              data-instgrm-permalink={acc.url}
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
        {/each}

        <div class="embed-card tiktok-embed-card">
          <div class="embed-label">#{tiktokFeed.label}</div>
          <div class="tiktok-card">
            <blockquote
              class="tiktok-embed"
              cite={tiktokFeed.cite}
              data-unique-id={tiktokFeed.uniqueId}
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


  <!-- Official Pages Chips -->
  <div id="official-pages">
    <OfficialAccountsSection accounts={officialAccounts} />
  </div>

  <!-- Student Clubs -->
  <div id="clubs">
    <ClubsSection accounts={clubAccounts} onSuggest={() => (clubModalOpen = true)} />
  </div>


  <!-- Promotions Section -->
  {#if activePromotions.length > 0}
    <section class="promotions-section" id="promotions">
      <div class="promotions-grid">
        {#each activePromotions as promotion (promotion.id)}
          <PromotionCard {promotion} onDismiss={dismissPromotion} />
        {/each}
      </div>
    </section>
  {/if}

  <!-- Feature 1: News Preview Cards -->
  <div id="news">
    <NewsCardGrid cards={newsCards} />
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
    gap: var(--spacing-xl);
    /* Use standard container padding to match layout */
    padding-left: var(--spacing-md);
    padding-right: var(--spacing-md);
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

  .social-media-section .embed-card {
    display: flex;
    flex-direction: column;
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
    background: transparent;
    border: 0;
    border-radius: 0;
    overflow: hidden;
    padding: var(--spacing-md);
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
