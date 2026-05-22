<!--
  StoriesSlider.svelte
  Instagram-style stories bar. Each story shows a thumbnail ring, opens a
  fullscreen viewer on click, auto-advances with a progress bar, and supports
  swipe gestures on mobile.
-->
<script module lang="ts">
  export interface StorySlide {
    imageUrl?: string;
    subtitle?: string;
    tag?: string;
    linkUrl?: string;
  }

  export interface Story {
    id: string;
    title: string;
    subtitle: string;
    tag?: string;
    imageUrl: string;
    linkUrl: string;
    seen: boolean;
    createdAt: string;
    expiresAt?: string;
    slides?: StorySlide[];
  }
</script>

<script lang="ts">
  import { onDestroy, tick } from "svelte";
  import StorySuggestionModal from "./StorySuggestionModal.svelte";

  export let stories: Story[] = [];
  export let allowSuggestions: boolean = true;
  export let loading: boolean = false;
  export let variant: "bubble" | "rectangular" = "bubble";

  let isSuggestionModalOpen = false;

  // Reactive filtering of expired stories
  $: storiesToShow = stories.filter((story) => {
    if (!story.expiresAt) return true;
    return new Date(story.expiresAt) > new Date();
  });

  // ── Viewer state ────────────────────────────────────────────────
  let viewerOpen = false;
  let activeIndex = 0;
  let activeSlideIndex = 0;
  let progressPct = 0;
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  let imageLoaded = false;
  let currentStory: Story | undefined;
  let currentSlides: StorySlide[] = [];
  let currentSlide: StorySlide | undefined;
  let currentSlideCount = 0;
  let sessionViewedStoryIds = new Set<string>();
  let storyCloseButton: HTMLButtonElement | undefined;
  let storyOpener: HTMLElement | undefined;

  const STORY_DURATION_MS = 6000;
  const TICK_MS = 50;

  function clampStripeCount(count: number) {
    return Math.max(2, Math.min(6, count));
  }

  function tagClass(tag?: string) {
    if (!tag) return "";
    return `tag-${tag.toLowerCase().replace(/\s+/g, "-")}`;
  }

  function getRenderableSlides(story?: Story) {
    if (!story || !Array.isArray(story.slides)) return [];
    return story.slides.filter(
      (slide) =>
        typeof slide.imageUrl === "string" && slide.imageUrl.trim().length > 0,
    );
  }

  function getStorySlideCount(story?: Story) {
    return getRenderableSlides(story).length;
  }

  function getStorySlides(story?: Story) {
    if (!story) return [];
    const renderableSlides = getRenderableSlides(story);
    if (renderableSlides.length > 0) return renderableSlides;
    return [
      {
        imageUrl: story.imageUrl,
        subtitle: story.subtitle || "",
        tag: story.tag,
        linkUrl: story.linkUrl,
      },
    ];
  }

  function recordStoryView(storyId: string) {
    if (!storyId || sessionViewedStoryIds.has(storyId)) return;

    sessionViewedStoryIds.add(storyId);
    const payload = JSON.stringify({ storyId });

    try {
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/stats/story-view", blob);
        return;
      }
    } catch {}

    if (typeof fetch !== "undefined") {
      fetch("/api/stats/story-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }

  $: currentStory = storiesToShow[activeIndex];
  $: currentSlides = getStorySlides(currentStory);
  $: currentSlide = currentSlides[activeSlideIndex] || currentSlides[0];
  $: currentSlideCount = currentSlides.length;
  $: loadingPlaceholderCount = loading
    ? storiesToShow.length === 0
      ? 6
      : 3
    : 0;

  // ── Open / close ─────────────────────────────────────────────────
  async function openStory(index: number, opener?: HTMLElement) {
    storyOpener = opener;
    sessionViewedStoryIds = new Set<string>();
    activeIndex = index;
    activeSlideIndex = 0;
    imageLoaded = false;
    viewerOpen = true;
    markSeen(index);
    if (storiesToShow[index]?.id) {
      recordStoryView(storiesToShow[index].id);
    }
    startProgress();
    await tick();
    storyCloseButton?.focus();
  }

  function closeViewer() {
    viewerOpen = false;
    sessionViewedStoryIds = new Set<string>();
    stopProgress();
    storyOpener?.focus();
    storyOpener = undefined;
  }

  function markSeen(index: number) {
    if (storiesToShow[index]) {
      const targetId = storiesToShow[index].id;
      stories = stories.map((s) =>
        s.id === targetId ? { ...s, seen: true } : s,
      );
      // Persist seen state to localStorage
      try {
        const seenIds = JSON.parse(
          localStorage.getItem("srh-stories-seen") || "[]",
        ) as string[];
        if (!seenIds.includes(targetId)) {
          seenIds.push(targetId);
          localStorage.setItem("srh-stories-seen", JSON.stringify(seenIds));
        }
      } catch {}
    }
  }

  // ── Progress bar ─────────────────────────────────────────────────
  let isPaused = false;

  function startProgress(reset = true) {
    if (reset) progressPct = 0;
    isPaused = false;
    stopProgress();

    progressInterval = setInterval(() => {
      if (isPaused) return;
      progressPct += (TICK_MS / STORY_DURATION_MS) * 100;
      if (progressPct >= 100) {
        progressPct = 100;
        goNext();
      }
    }, TICK_MS);
  }

  function stopProgress() {
    if (progressInterval !== null) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }

  function pauseStory() {
    isPaused = true;
  }

  function resumeStory() {
    isPaused = false;
  }

  function goNextStory() {
    if (activeIndex < storiesToShow.length - 1) {
      activeIndex += 1;
      activeSlideIndex = 0;
      imageLoaded = false;
      markSeen(activeIndex);
      if (storiesToShow[activeIndex]?.id) {
        recordStoryView(storiesToShow[activeIndex].id);
      }
      startProgress();
    } else {
      closeViewer();
    }
  }

  function goNext() {
    if (activeSlideIndex < currentSlides.length - 1) {
      activeSlideIndex += 1;
      imageLoaded = false;
      startProgress();
      return;
    }

    goNextStory();
  }

  function goPrev() {
    if (activeSlideIndex > 0) {
      activeSlideIndex -= 1;
      imageLoaded = false;
      startProgress();
      return;
    }

    if (activeIndex > 0) {
      activeIndex -= 1;
      const previousSlides = getStorySlides(storiesToShow[activeIndex]);
      activeSlideIndex = Math.max(previousSlides.length - 1, 0);
      imageLoaded = false;
      markSeen(activeIndex);
      if (storiesToShow[activeIndex]?.id) {
        recordStoryView(storiesToShow[activeIndex].id);
      }
      startProgress();
    }
  }

  // ── Swipe support ─────────────────────────────────────────────────
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerStartTime = 0;
  function onPointerDown(e: PointerEvent) {
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
    pointerStartTime = Date.now();
    pauseStory();
  }

  function onPointerUp(e: PointerEvent) {
    resumeStory();
    const diffX = e.clientX - pointerStartX;
    const diffY = e.clientY - pointerStartY;
    const timeDiff = Date.now() - pointerStartTime;
    // Only register as swipe if it was relatively fast and moved enough
    if (timeDiff < 500) {
      if (diffY > 70 && Math.abs(diffY) > Math.abs(diffX) * 1.2) {
        closeViewer();
      } else if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
        diffX < 0 ? goNext() : goPrev();
      }
    }
  }

  // ── Keyboard support ─────────────────────────────────────────────
  function onKeydown(e: KeyboardEvent) {
    if (!viewerOpen) return;
    if (e.key === "ArrowRight") goNext();
    else if (e.key === "ArrowLeft") goPrev();
    else if (e.key === "Escape") closeViewer();
  }

  // ── Restore seen state and sort ──────────────────────────────────
  let initialSortDone = false;

  $: if (
    typeof window !== "undefined" &&
    stories.length > 0 &&
    !initialSortDone
  ) {
    try {
      const seenIds = JSON.parse(
        localStorage.getItem("srh-stories-seen") || "[]",
      ) as string[];

      // Update seen status based on localStorage
      let updatedStories = stories.map((s) => ({
        ...s,
        seen: seenIds.includes(s.id),
      }));

      // Sort unseen stories first, then sort by newest
      updatedStories.sort((a, b) => {
        if (a.seen === b.seen) {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        return a.seen ? 1 : -1;
      });

      stories = updatedStories;
      initialSortDone = true;
    } catch {}
  }

  onDestroy(stopProgress);

  // Action to teleport fullscreen viewer to document.body to override stacked nav containers
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        if (node.parentNode) node.parentNode.removeChild(node);
      },
    };
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- ── Stories bar ───────────────────────────────────────────────── -->
<div
  class="stories-bar"
  class:rectangular={variant === "rectangular"}
  role="region"
  aria-label="Campusweb Stories"
>
  {#if allowSuggestions}
    <button
      class="story-bubble add-story-btn"
      class:rectangular={variant === "rectangular"}
      on:click={() => (isSuggestionModalOpen = true)}
    >
      {#if variant === "rectangular"}
        <div class="story-card add-card">
          <div class="add-card-icon"><i class="ph-bold ph-plus"></i></div>
          <span>Suggest</span>
          <strong>Campus Story</strong>
        </div>
      {:else}
        <div class="story-ring add-ring">
          <div class="add-icon">+</div>
        </div>
        <span class="story-label">Add Story</span>
      {/if}
    </button>
  {/if}

  {#if loadingPlaceholderCount > 0 && storiesToShow.length === 0}
    {#each Array(loadingPlaceholderCount) as _, idx}
      <div
        class="story-bubble placeholder"
        class:rectangular={variant === "rectangular"}
        aria-hidden="true"
      >
        {#if variant === "rectangular"}
          <div class="story-card placeholder-card"></div>
        {:else}
          <div class="story-ring seen placeholder-ring">
            <div class="story-avatar placeholder-avatar"></div>
          </div>
          <span class="story-label placeholder-label">Loading</span>
        {/if}
      </div>
    {/each}
  {/if}

  {#each storiesToShow as story, idx}
    <button
      class="story-bubble"
      class:rectangular={variant === "rectangular"}
      on:click={(event) => openStory(idx, event.currentTarget as HTMLElement)}
    >
      {#if variant === "rectangular"}
        <article class="story-card" class:seen={story.seen}>
          <div class="story-card-media">
            <img
              src={getStorySlides(story)[0]?.imageUrl || story.imageUrl}
              alt=""
              loading={idx < 5 ? "eager" : "lazy"}
              fetchpriority={idx < 3 ? "high" : "auto"}
              draggable="false"
              on:contextmenu|preventDefault
              on:error={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.src = "/icon-light.png";
              }}
            />
            {#if story.tag}
              <span class="story-tag {tagClass(story.tag)}">{story.tag}</span>
            {/if}
          </div>
          <div class="story-card-body">
            <strong>{story.title}</strong>
            <!-- <span>{story.subtitle}</span> -->
          </div>
        </article>
      {:else}
        <div
          class="story-ring {story.seen ? 'seen' : 'unseen'}"
          class:has-tag={!!story.tag}
          class:sequence={getStorySlideCount(story) > 1}
          style:--story-stripes={getStorySlideCount(story) > 1
            ? clampStripeCount(getStorySlideCount(story))
            : 0}
        >
          <img
            src={getStorySlides(story)[0]?.imageUrl || story.imageUrl}
            alt=""
            class="story-avatar"
            loading={idx < 5 ? "eager" : "lazy"}
            fetchpriority={idx < 3 ? "high" : "auto"}
            draggable="false"
            on:contextmenu|preventDefault
            on:error={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.src = "/icon-light.png";
            }}
          />
          {#if story.tag}
            <span class="story-tag {tagClass(story.tag)}">{story.tag}</span>
          {/if}
        </div>
        <span class="story-label">{story.title}</span>
      {/if}
    </button>
  {/each}

  {#if loadingPlaceholderCount > 0 && storiesToShow.length > 0}
    {#each Array(loadingPlaceholderCount) as _, idx}
      <div
        class="story-bubble placeholder"
        class:rectangular={variant === "rectangular"}
        aria-hidden="true"
      >
        {#if variant === "rectangular"}
          <div class="story-card placeholder-card"></div>
        {:else}
          <div class="story-ring seen placeholder-ring">
            <div class="story-avatar placeholder-avatar"></div>
          </div>
          <span class="story-label placeholder-label">Loading</span>
        {/if}
      </div>
    {/each}
  {/if}
</div>

<!-- ── Fullscreen viewer overlay ─────────────────────────────────── -->
{#if viewerOpen && storiesToShow[activeIndex]}
  <div
    class="story-overlay"
    use:portal
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    aria-labelledby="story-viewer-title"
    aria-describedby="story-viewer-subtitle"
    on:pointerdown={onPointerDown}
    on:pointerup={onPointerUp}
    on:mouseleave={resumeStory}
    on:contextmenu|preventDefault
  >
    <!-- Progress bars -->
    <div class="story-progress-bars" aria-hidden="true">
      {#each storiesToShow as _, i}
        <div class="story-progress-track">
          <div
            class="story-progress-fill"
            style="width: {i < activeIndex
              ? 100
              : i === activeIndex
                ? progressPct
                : 0}%"
          ></div>
        </div>
      {/each}
    </div>

    <!-- Header -->
    <div class="story-header">
      <div class="story-author">
        <img src="/icon-light.png" alt="SRH" class="story-author-avatar" />
        <div class="story-author-info">
          <div class="story-author-name">SRH University Berlin</div>
          <div class="story-author-time">
            {new Date(currentStory.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
      <button
        bind:this={storyCloseButton}
        class="story-close"
        on:click={closeViewer}
        aria-label="Close stories">✕</button
      >
    </div>

    <!-- Navigation taps -->
    <button
      class="story-tap-zone left"
      on:click={goPrev}
      aria-label="Previous story"
    ></button>
    <button
      class="story-tap-zone right"
      on:click={goNext}
      aria-label="Next story"
    ></button>

    <!-- Story image -->
    <div class="story-image-wrapper">
      {#if !imageLoaded}
        <div class="story-image-skeleton"></div>
      {/if}

      <!-- Blurred background for images smaller than viewport -->
      <img
        src={currentSlide?.imageUrl || currentStory.imageUrl}
        alt=""
        class="story-blurred-bg {imageLoaded ? 'loaded' : ''}"
        aria-hidden="true"
        draggable="false"
        on:contextmenu|preventDefault
        on:error={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/icon-light.png";
        }}
      />

      <img
        src={currentSlide?.imageUrl || currentStory.imageUrl}
        alt={currentStory.title}
        class="story-image {imageLoaded ? 'loaded' : ''}"
        draggable="false"
        on:contextmenu|preventDefault
        on:load={() => {
          imageLoaded = true;
        }}
        on:error={(e) => {
          imageLoaded = true;
          (e.currentTarget as HTMLImageElement).src = "/icon-light.png";
        }}
      />
    </div>

    <!-- Footer -->
    <div class="story-footer">
      <div class="story-text">
        <div id="story-viewer-title" class="story-title">
          {currentStory.title}
        </div>
        <div id="story-viewer-subtitle" class="story-subtitle">
          {currentStory.subtitle || currentSlide?.subtitle}
        </div>
      </div>
      {#if currentSlide?.linkUrl || currentStory.linkUrl}
        <a
          href={currentSlide?.linkUrl || currentStory.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="story-cta"
          on:click={closeViewer}
        >
          View Post ↗
        </a>
      {/if}
    </div>
  </div>
{/if}

<StorySuggestionModal bind:isOpen={isSuggestionModalOpen} />

<style>
  /* ── Stories bar ────────────────────────────────────────────── */
  .stories-bar {
    display: flex;
    gap: 11px;
    overflow-x: auto;
    padding: 8px 18px 12px;
    margin-inline: -18px;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .stories-bar.rectangular {
    gap: 14px;
    padding: 8px 18px 0px;
    margin-inline: -18px;
    scroll-snap-type: x proximity;
  }
  .stories-bar::-webkit-scrollbar {
    display: none;
  }

  .story-bubble {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    width: 76px;
    text-decoration: none;
    color: inherit;
  }

  .story-bubble.rectangular {
    width: 104px;
    display: block;
    text-align: left;
    scroll-snap-align: start;
  }

  .story-card {
    width: 106px;
    min-height: 184px;
    overflow: hidden;
    border-radius: 12px;
    background: var(--surface-solid, #fff);
    border: 1px solid var(--surface-border, rgba(7, 19, 47, 0.08));
    box-shadow: var(--campus-shadow-soft, 0 10px 28px rgba(15, 23, 42, 0.07));
    color: var(--text-color);
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
  }

  .story-bubble.rectangular:hover .story-card,
  .story-bubble.rectangular:focus-visible .story-card {
    transform: translateY(-3px);
    box-shadow: var(--campus-shadow, 0 18px 45px rgba(15, 23, 42, 0.08));
  }

  .story-card.seen {
    opacity: 0.86;
  }

  .story-card-media {
    position: relative;
    height: 96px;
    overflow: hidden;
    background: linear-gradient(
      135deg,
      rgba(255, 116, 36, 0.12),
      rgba(132, 92, 255, 0.11)
    );
  }

  .story-card-media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .story-card-body {
    padding: 8px 6px 7px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .story-card-body strong {
    font-size: 0.98rem;
    line-height: 1.12;
    font-weight: 900;
    color: var(--text-color);
  }

  .add-card {
    display: flex;
    min-height: 184px;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
    gap: 4px;
    padding: 14px;
  }

  .add-card-icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: #fff;
    background: linear-gradient(135deg, var(--primary-color), #ff7a2f);
    margin-bottom: auto;
    box-shadow: 0 10px 22px rgba(var(--primary-color-rgb, 212, 68, 7), 0.22);
  }

  .add-card span {
    font-size: 0.82rem;
    font-weight: 750;
    color: var(--text-color-secondary);
  }

  .add-card strong {
    font-size: 1rem;
    line-height: 1.12;
  }

  .placeholder-card {
    min-height: 184px;
    background: linear-gradient(
      90deg,
      rgba(148, 163, 184, 0.1),
      rgba(255, 255, 255, 0.46),
      rgba(148, 163, 184, 0.1)
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
  }

  .story-ring {
    width: 68px;
    height: 68px;
    border-radius: 50%;
    padding: 3.2px; /* 5% thicker */
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
  }

  .story-ring::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 50%;
    z-index: 0;
    /* Make the ring truly transparent in the middle */
    mask-image: radial-gradient(circle, transparent 30px, black 30.5px);
    -webkit-mask-image: radial-gradient(circle, transparent 30px, black 30.5px);
  }

  .story-ring.has-tag::before {
    /* Intersection cropping: creates a "notch" for the tag AND keeps the inner hole */
    mask-image: radial-gradient(
        circle at 50% 100%,
        transparent 22px,
        black 22.5px
      ),
      radial-gradient(circle, transparent 30px, black 30.5px);
    -webkit-mask-image: radial-gradient(
        circle at 50% 100%,
        transparent 22px,
        black 22.5px
      ),
      radial-gradient(circle, transparent 30px, black 30.5px);
    mask-composite: intersect;
    -webkit-mask-composite: source-in;
  }

  .story-tag {
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--primary-color, #e5201e);
    color: white;
    font-size: 0.58rem;
    font-weight: 900;
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border: 2px solid var(--card-bg, #fff);
    z-index: 5;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    white-space: nowrap;
    line-height: 1;
    overflow: visible;
  }

  .story-card .story-tag {
    border-style: solid;
    left: 5px;
    bottom: 4px;
    transform: none;
    border: none;
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 0.64rem;
    letter-spacing: 0;
    box-shadow: 0 5px 12px rgba(15, 23, 42, 0.16);
  }

  .story-tag {
    background: #eff6ff;
    color: #1d4ed8;
  }

  .story-tag.tag-live {
    background: #dc2626;
    color: #fff;
    padding: 3px 12px;
    border-radius: 4px;
    bottom: -5px;
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.28);
  }

  .story-tag.tag-event {
    background: #22c55e;
    color: #fff;
  }

  .story-tag.tag-promo {
    background: #1d4ed8;
    color: #fff;
  }

  .story-tag.tag-ad {
    background: #e0e7ff;
    color: #3730a3;
  }

  .story-tag.tag-rent {
    background: #fae8ff;
    color: #86198f;
  }

  .story-tag.tag-living {
    background: #cffafe;
    color: #155e75;
  }

  .story-bubble:hover .story-ring,
  .story-bubble:focus-visible .story-ring {
    transform: scale(1.08);
  }

  .story-ring.unseen::before {
    background: linear-gradient(
      135deg,
      #f09433 0%,
      #e6683c 25%,
      #dc2743 50%,
      #cc2366 75%,
      #bc1888 100%
    );
  }

  .story-ring.sequence.unseen::before {
    background: repeating-conic-gradient(
      from -90deg,
      #e6683c 0 calc((360deg / var(--story-stripes)) * 0.58),
      transparent calc((360deg / var(--story-stripes)) * 0.58)
        calc(360deg / var(--story-stripes))
    );
  }

  .story-ring.seen::before {
    background: var(--border-color, #ccc);
  }

  .story-ring.sequence.seen::before {
    background: repeating-conic-gradient(
      from -90deg,
      #94a3b8 0 calc((360deg / var(--story-stripes)) * 0.58),
      transparent calc((360deg / var(--story-stripes)) * 0.58)
        calc(360deg / var(--story-stripes))
    );
  }

  .add-ring::before {
    background: linear-gradient(
      135deg,
      var(--primary-color, #e5201e) 0%,
      #cc2366 100%
    );
    opacity: 0.15;
  }

  .story-avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    background: none;
    border: 2.5px solid transparent; /* The truly transparent gap */
    -webkit-touch-callout: none;
    user-select: none;
    z-index: 1;
    position: relative;
  }

  .add-icon {
    width: 65px;
    height: 65px;
    border-radius: 50%;
    background: var(--card-bg, #fff);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.8rem;
    font-weight: 300;
    color: var(--primary-color, #e5201e);
    line-height: 1;
  }

  .story-label {
    font-size: 0.68rem;
    font-weight: 500;
    color: var(--text-color, #111);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 72px;
  }

  .story-bubble.placeholder {
    cursor: default;
    pointer-events: none;
  }

  .story-ring.placeholder-ring::before {
    background: #e7e5e4;
    animation: storyPulse 1.3s ease-in-out infinite;
  }

  .story-avatar.placeholder-avatar {
    border-color: transparent;
    background: linear-gradient(180deg, #ffffff 0%, #f5f5f4 100%);
  }

  .story-label.placeholder-label {
    width: 58px;
    height: 10px;
    border-radius: 999px;
    background: #e7e5e4;
    color: transparent;
    animation: storyPulse 1.3s ease-in-out infinite;
  }

  @keyframes storyPulse {
    0%,
    100% {
      opacity: 0.55;
    }
    50% {
      opacity: 1;
    }
  }

  /* ── Fullscreen viewer ─────────────────────────────────────── */
  .story-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: #000;
    display: flex;
    flex-direction: column;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none; /* Disables default browser long-press context menu */
    touch-action: none; /* Prevent browser pull-to-refresh / swipe-back default behaviors */
  }

  .story-progress-bars {
    display: flex;
    gap: 4px;
    padding: 12px 12px 6px;
    position: relative;
    z-index: 10;
  }

  .story-progress-track {
    flex: 1;
    height: 3px;
    background: rgba(255, 255, 255, 0.35);
    border-radius: 2px;
    overflow: hidden;
  }

  .story-progress-fill {
    height: 100%;
    background: #fff;
    border-radius: 2px;
    transition: width 0.05s linear;
  }

  .story-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 14px 12px;
    position: relative;
    z-index: 10;
  }

  .story-author {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .story-author-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.7);
    object-fit: contain;
    background: #fff;
  }

  .story-author-name {
    font-size: 0.88rem;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  .story-author-time {
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.8);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .story-close {
    background: rgba(0, 0, 0, 0.4);
    border: none;
    color: #fff;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }

  .story-close:hover {
    background: rgba(0, 0, 0, 0.65);
  }

  /* tap zones for prev / next */
  .story-tap-zone {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 35%;
    background: none;
    border: none;
    cursor: pointer;
    z-index: 8;
    -webkit-tap-highlight-color: transparent;
  }
  .story-tap-zone.left {
    left: 0;
  }
  .story-tap-zone.right {
    right: 0;
  }

  /* Story image */
  .story-image-wrapper {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .story-image-skeleton {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    animation: pulse 1.5s infinite;
  }

  .story-blurred-bg {
    position: absolute;
    inset: -20px;
    width: calc(100% + 40px);
    height: calc(100% + 40px);
    object-fit: cover;
    filter: blur(28px) brightness(0.55);
    will-change: filter, opacity;
    transform: translate3d(0, 0, 0);
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: 1;
    pointer-events: none;
  }

  .story-blurred-bg.loaded {
    opacity: 0.85;
  }

  .story-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: 2;
    pointer-events: none; /* Lets touch events pass through to the main overlay handler */
    -webkit-user-drag: none;
    -webkit-touch-callout: none;
    user-select: none;
  }

  .story-image.loaded {
    opacity: 1;
  }

  /* Story footer */
  .story-footer {
    padding: 16px 16px 32px;
    background: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.85) 0%,
      transparent 100%
    );
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    position: relative;
    z-index: 10;
  }

  .story-text {
    flex: 1;
  }

  .story-title {
    font-size: 1rem;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
    margin-bottom: 3px;
  }

  .story-subtitle {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.85);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    line-height: 1.35;
    white-space: pre-wrap;
  }

  .story-cta {
    display: inline-flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.35);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 700;
    padding: 8px 14px;
    border-radius: 30px;
    text-decoration: none;
    white-space: nowrap;
    transition: background 0.2s;
    flex-shrink: 0;
  }

  .story-cta:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  /* ── Mobile portrait fullscreen ─────────────────────────────── */
  @media (max-width: 1023px) {
    .story-footer {
      padding-bottom: calc(90px + env(safe-area-inset-bottom, 16px));
    }
  }

  @media (max-width: 600px) {
    .story-image {
      object-fit: contain;
    }
  }
</style>
