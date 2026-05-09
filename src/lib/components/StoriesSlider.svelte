<!--
  StoriesSlider.svelte
  Instagram-style stories bar. Each story shows a thumbnail ring, opens a
  fullscreen viewer on click, auto-advances with a progress bar, and supports
  swipe gestures on mobile.
-->
<script lang="ts">
  import { onDestroy } from "svelte";
  import StorySuggestionModal from "./StorySuggestionModal.svelte";

  export interface Story {
    id: string;
    title: string;
    subtitle: string;
    imageUrl: string;
    linkUrl: string;
    seen: boolean;
    createdAt: string;
    expiresAt?: string;
  }

  export let stories: Story[] = [];
  export let allowSuggestions: boolean = true;
  
  let isSuggestionModalOpen = false;

  // Reactive filtering of expired stories
  $: storiesToShow = stories.filter((story) => {
    if (!story.expiresAt) return true;
    return new Date(story.expiresAt) > new Date();
  });

  // ── Viewer state ────────────────────────────────────────────────
  let viewerOpen = false;
  let activeIndex = 0;
  let progressPct = 0;
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  let imageLoaded = false;

  const STORY_DURATION_MS = 6000;
  const TICK_MS = 50;

  // ── Open / close ─────────────────────────────────────────────────
  function openStory(index: number) {
    activeIndex = index;
    imageLoaded = false;
    viewerOpen = true;
    markSeen(index);
    startProgress();
  }

  function closeViewer() {
    viewerOpen = false;
    stopProgress();
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

  function goNext() {
    if (activeIndex < storiesToShow.length - 1) {
      activeIndex += 1;
      imageLoaded = false;
      markSeen(activeIndex);
      startProgress();
    } else {
      closeViewer();
    }
  }

  function goPrev() {
    if (activeIndex > 0) {
      activeIndex -= 1;
      imageLoaded = false;
      startProgress();
    }
  }

  // ── Swipe support ─────────────────────────────────────────────────
  let touchStartX = 0;
  let touchStartTime = 0;
  function onTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchStartTime = Date.now();
    pauseStory();
  }
  function onTouchEnd(e: TouchEvent) {
    resumeStory();
    const diff = e.changedTouches[0].clientX - touchStartX;
    const timeDiff = Date.now() - touchStartTime;
    // Only register as swipe if it was relatively fast and moved enough
    if (Math.abs(diff) > 50 && timeDiff < 500) {
      diff < 0 ? goNext() : goPrev();
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

  $: if (typeof window !== "undefined" && stories.length > 0 && !initialSortDone) {
    try {
      const seenIds = JSON.parse(
        localStorage.getItem("srh-stories-seen") || "[]",
      ) as string[];
      
      // Update seen status based on localStorage
      let updatedStories = stories.map((s) => ({ ...s, seen: seenIds.includes(s.id) }));
      
      // Sort unseen stories first, then sort by newest
      updatedStories.sort((a, b) => {
        if (a.seen === b.seen) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
      }
    };
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- ── Stories bar ───────────────────────────────────────────────── -->
<div class="stories-bar" role="list" aria-label="SRH Campus Stories">
  {#if allowSuggestions}
    <button
      class="story-bubble add-story-btn"
      on:click={() => (isSuggestionModalOpen = true)}
      aria-label="Suggest a Story"
    >
      <div class="story-ring add-ring">
        <div class="add-icon">+</div>
      </div>
      <span class="story-label">Add Story</span>
    </button>
  {/if}

  {#each storiesToShow as story, idx}
    <button
      class="story-bubble"
      on:click={() => openStory(idx)}
      aria-label="Open story: {story.title}"
      role="listitem"
    >
      <div class="story-ring {story.seen ? 'seen' : 'unseen'}">
        <img
          src={story.imageUrl}
          alt={story.title}
          class="story-avatar"
          loading={idx < 5 ? 'eager' : 'lazy'}
          fetchpriority={idx < 3 ? 'high' : 'auto'}
          draggable="false"
          on:contextmenu|preventDefault
          on:error={(e) => {
            // Fallback to SRH logo on broken image
            const img = e.currentTarget as HTMLImageElement;
            img.src = "/icon-light.png";
          }}
        />
      </div>
      <span class="story-label">{story.title}</span>
    </button>
  {/each}
</div>

<!-- ── Fullscreen viewer overlay ─────────────────────────────────── -->
{#if viewerOpen && storiesToShow[activeIndex]}
  <div
    class="story-overlay"
    use:portal
    role="dialog"
    aria-modal="true"
    aria-label="Viewing story: {storiesToShow[activeIndex].title}"
    on:touchstart={onTouchStart}
    on:touchend={onTouchEnd}
    on:mousedown={pauseStory}
    on:mouseup={resumeStory}
    on:mouseleave={resumeStory}
    on:contextmenu|preventDefault
  >
    <!-- Progress bars -->
    <div class="story-progress-bars">
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
            {new Date(
              storiesToShow[activeIndex].createdAt,
            ).toLocaleDateString()}
          </div>
        </div>
      </div>
      <button
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
        src={storiesToShow[activeIndex].imageUrl}
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
        src={storiesToShow[activeIndex].imageUrl}
        alt={storiesToShow[activeIndex].title}
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
        <div class="story-title">{storiesToShow[activeIndex].title}</div>
        <div class="story-subtitle">{storiesToShow[activeIndex].subtitle}</div>
      </div>
      {#if storiesToShow[activeIndex].linkUrl}
        <a
          href={storiesToShow[activeIndex].linkUrl}
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

<style>
  /* ── Stories bar ────────────────────────────────────────────── */
  .stories-bar {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 8px 16px 12px;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
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

  .story-ring {
    width: 68px;
    height: 68px;
    border-radius: 50%;
    padding: 1.5px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .story-bubble:hover .story-ring,
  .story-bubble:focus-visible .story-ring {
    transform: scale(1.08);
  }

  .story-ring.unseen {
    background: linear-gradient(
      135deg,
      #f09433 0%,
      #e6683c 25%,
      #dc2743 50%,
      #cc2366 75%,
      #bc1888 100%
    );
  }

  .story-ring.seen {
    background: var(--border-color, #ccc);
  }

  .add-ring {
    background: linear-gradient(
      135deg,
      var(--primary-color, #e5201e),
      color-mix(in srgb, var(--primary-color, #e5201e) 60%, #000)
    );
  }

  .story-avatar {
    width: 65px;
    height: 65px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--card-bg, #fff);
    border: 1.5px solid var(--card-bg, #fff);
    -webkit-touch-callout: none;
    user-select: none;
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

<StorySuggestionModal bind:isOpen={isSuggestionModalOpen} />
