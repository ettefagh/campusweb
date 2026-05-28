<script lang="ts">
  import { onMount, createEventDispatcher, tick } from "svelte";
  import { spring } from "svelte/motion";
  import { fade, slide } from "svelte/transition";
  import { browser } from "$app/environment";
  
  export let tabs: { id: string; label: string; icon?: string }[] = [];
  export let activeTab: string;

  const dispatch = createEventDispatcher<{ change: { id: string } }>();

  let isMobile = false;
  let mounted = false;

  // Spring physics for the sliding underline
  const indicator = spring(
    { left: 0, width: 0 },
    { damping: 22, stiffness: 200 }
  );

  let tabElements: Record<string, HTMLElement> = {};
  let container: HTMLElement;

  let canScrollLeft = false;
  let canScrollRight = false;

  let bottomSheetOpen = false;

  $: activeIndex = tabs.findIndex(t => t.id === activeTab);
  
  $: if (mounted && activeTab && !isMobileMode(tabs.length, isMobile)) {
    updateIndicator();
  }

  function isMobileMode(count: number, mobile: boolean) {
    return mobile;
  }

  function isSegmented(count: number, mobile: boolean) {
    return mobile && count < 5;
  }

  function isBottomSheet(count: number, mobile: boolean) {
    return mobile && count >= 5;
  }

  async function updateIndicator() {
    await tick();
    const activeEl = tabElements[activeTab];
    if (activeEl && container) {
      // Get position relative to the scroll container
      const left = activeEl.offsetLeft;
      const width = activeEl.offsetWidth;
      indicator.set({ left, width });
      
      // Ensure the active tab is visible (scroll into view if needed)
      scrollToTab(activeEl);
    }
  }

  function scrollToTab(el: HTMLElement) {
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    if (elRect.left < containerRect.left) {
      container.scrollBy({ left: elRect.left - containerRect.left - 20, behavior: 'smooth' });
    } else if (elRect.right > containerRect.right) {
      container.scrollBy({ left: elRect.right - containerRect.right + 20, behavior: 'smooth' });
    }
  }

  function checkScroll() {
    if (!container) return;
    canScrollLeft = container.scrollLeft > 0;
    // Use a small 1px epsilon for floating point scrollWidth
    canScrollRight = Math.ceil(container.scrollLeft + container.clientWidth) < container.scrollWidth - 1;
  }

  function scrollBy(amount: number) {
    if (!container) return;
    container.scrollBy({ left: amount, behavior: "smooth" });
  }

  function setActive(id: string) {
    if (activeTab !== id) {
      activeTab = id;
      dispatch("change", { id });
      if (bottomSheetOpen) bottomSheetOpen = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (isSegmented(tabs.length, isMobile) || isBottomSheet(tabs.length, isMobile)) {
      // In bottom sheet or segmented control, standard keyboard nav works fine or we can customize.
      // We'll focus mainly on the desktop tab list for complex keyboard nav.
    }
    
    let targetIndex = activeIndex;
    let handled = false;

    switch (e.key) {
      case "ArrowRight":
        targetIndex = (activeIndex + 1) % tabs.length;
        handled = true;
        break;
      case "ArrowLeft":
        targetIndex = (activeIndex - 1 + tabs.length) % tabs.length;
        handled = true;
        break;
      case "Home":
        targetIndex = 0;
        handled = true;
        break;
      case "End":
        targetIndex = tabs.length - 1;
        handled = true;
        break;
    }

    if (handled) {
      e.preventDefault();
      const targetId = tabs[targetIndex].id;
      setActive(targetId);
      // Focus the new element so focus ring updates
      tick().then(() => {
        tabElements[targetId]?.focus();
      });
    }
  }

  onMount(() => {
    mounted = true;
    
    const checkMobile = () => {
      isMobile = window.innerWidth <= 768;
      // Re-trigger indicator positioning when leaving mobile mode
      if (!isMobile) {
        setTimeout(updateIndicator, 50);
        setTimeout(checkScroll, 50);
      }
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    // Setup resize observer for container to update scroll state and indicator
    const ro = new ResizeObserver(() => {
      if (!isMobile) {
        updateIndicator();
        checkScroll();
      }
    });
    
    if (container) ro.observe(container);
    
    return () => {
      window.removeEventListener("resize", checkMobile);
      ro.disconnect();
    };
  });
</script>

<div class="tabs-wrapper" class:is-mobile={isMobile}>
  {#if isSegmented(tabs.length, isMobile)}
    <!-- MOBILE: < 5 Tabs -> Segmented Control -->
    <div class="segmented-control" role="tablist">
      {#each tabs as tab}
        <button
          role="tab"
          aria-selected={activeTab === tab.id}
          tabindex={activeTab === tab.id ? 0 : -1}
          class="segmented-btn"
          class:active={activeTab === tab.id}
          on:click={() => setActive(tab.id)}
        >
          {#if tab.icon}<span class="tab-icon">{tab.icon}</span>{/if}
          <span class="tab-label">{tab.label}</span>
        </button>
      {/each}
    </div>

  {:else if isBottomSheet(tabs.length, isMobile)}
    <!-- MOBILE: >= 5 Tabs -> Bottom Sheet Trigger -->
    <div class="bottom-sheet-trigger-wrapper">
      <button 
        class="bottom-sheet-trigger" 
        on:click={() => (bottomSheetOpen = true)}
        aria-haspopup="dialog"
      >
        <span class="trigger-content">
          {#if tabs[activeIndex]?.icon}
            <span class="tab-icon">{tabs[activeIndex].icon}</span>
          {/if}
          <span class="tab-label">{tabs[activeIndex]?.label || 'Menu'}</span>
        </span>
        <i class="ph ph-caret-up-down"></i>
      </button>
    </div>

    <!-- Bottom Sheet Overlay -->
    {#if bottomSheetOpen}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div 
        class="bottom-sheet-backdrop" 
        on:click={() => (bottomSheetOpen = false)}
        on:keydown={(e) => e.key === 'Escape' && (bottomSheetOpen = false)}
        transition:fade={{ duration: 200 }}
      ></div>
      <div 
        class="bottom-sheet popup-panel-safe" 
        role="dialog" 
        transition:slide={{ duration: 250, axis: 'y' }}
      >
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <h3>Menu</h3>
          <button class="sheet-close" on:click={() => (bottomSheetOpen = false)}>
            <i class="ph ph-x"></i>
          </button>
        </div>
        <div class="sheet-options" role="tablist">
          {#each tabs as tab}
            <button
              role="tab"
              aria-selected={activeTab === tab.id}
              class="sheet-option"
              class:active={activeTab === tab.id}
              on:click={() => setActive(tab.id)}
            >
              {#if tab.icon}<span class="tab-icon">{tab.icon}</span>{/if}
              <span class="tab-label">{tab.label}</span>
              {#if activeTab === tab.id}
                <i class="ph-fill ph-check-circle check-icon"></i>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}

  {:else}
    <!-- DESKTOP / DEFAULT: Sliding Tabs -->
    <div class="desktop-tabs-container">
      {#if canScrollLeft}
        <div class="fade-edge edge-left" transition:fade={{ duration: 150 }}></div>
        <button class="chevron chevron-left" on:click={() => scrollBy(-150)} aria-label="Scroll left">
          <i class="ph ph-caret-left"></i>
        </button>
      {/if}

      <div 
        class="tabs-scroll-area" 
        bind:this={container} 
        on:scroll={checkScroll}
        role="tablist"
        on:keydown={handleKeydown}
        tabindex="-1"
      >
        <div class="tabs-track">
          <!-- Animated Indicator -->
          <div 
            class="tab-indicator" 
            style="left: {$indicator.left}px; width: {$indicator.width}px;"
            aria-hidden="true"
          ></div>
          
          {#each tabs as tab}
            <button
              bind:this={tabElements[tab.id]}
              role="tab"
              aria-selected={activeTab === tab.id}
              tabindex={activeTab === tab.id ? 0 : -1}
              class="desktop-tab"
              class:active={activeTab === tab.id}
              on:click={() => setActive(tab.id)}
            >
              {#if tab.icon}<span class="tab-icon">{tab.icon}</span>{/if}
              <span class="tab-label">{tab.label}</span>
            </button>
          {/each}
        </div>
      </div>

      {#if canScrollRight}
        <div class="fade-edge edge-right" transition:fade={{ duration: 150 }}></div>
        <button class="chevron chevron-right" on:click={() => scrollBy(150)} aria-label="Scroll right">
          <i class="ph ph-caret-right"></i>
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .tabs-wrapper {
    position: relative;
    width: 100%;
    /* Let the tabs breathe */
    margin-bottom: 24px;
  }

  /* ── Desktop Tabs (Default) ── */
  .desktop-tabs-container {
    position: relative;
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
  }

  .tabs-scroll-area {
    flex: 1;
    overflow-x: auto;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE */
    scroll-behavior: smooth;
  }
  .tabs-scroll-area::-webkit-scrollbar {
    display: none;
  }

  .tabs-track {
    display: inline-flex;
    position: relative;
    padding: 0 4px; /* Slight padding to avoid cutting focus rings */
  }

  .desktop-tab {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: transparent;
    border: none;
    color: var(--text-color-secondary, #666);
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    min-height: 44px; /* Touch target size */
    min-width: 44px;
    white-space: nowrap;
    transition: color 0.15s ease;
    z-index: 1;
  }

  .desktop-tab:hover {
    color: var(--text-color, #111);
  }

  .desktop-tab.active {
    color: var(--primary-color, #e5201e);
    font-weight: 600;
  }

  /* Focus Ring distinct from Active state */
  .desktop-tab:focus-visible {
    outline: 2px solid #3b82f6; /* Blue outline, distinctly NOT the active color */
    outline-offset: -2px;
    border-radius: 6px;
  }

  .tab-indicator {
    position: absolute;
    bottom: -1px; /* Align with border-bottom */
    height: 3px;
    background: var(--primary-color, #e5201e);
    border-radius: 3px 3px 0 0;
    z-index: 2;
  }

  /* ── Overflows & Chevrons ── */
  .fade-edge {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 40px;
    pointer-events: none;
    z-index: 3;
  }
  .edge-left {
    left: 0;
    background: linear-gradient(to right, var(--bg-color, #fff) 0%, transparent 100%);
  }
  .edge-right {
    right: 0;
    background: linear-gradient(to left, var(--bg-color, #fff) 0%, transparent 100%);
  }

  .chevron {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 4;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--bg-color, #fff);
    border: 1px solid var(--border-color, #e5e7eb);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    color: var(--text-color);
  }
  .chevron:hover {
    background: #f9fafb;
  }
  .chevron-left {
    left: 4px;
  }
  .chevron-right {
    right: 4px;
  }

  /* ── Segmented Control (Mobile < 5) ── */
  .segmented-control {
    display: flex;
    background: rgba(15, 23, 42, 0.05);
    padding: 4px;
    border-radius: 12px;
    width: 100%;
  }

  :global([data-theme="dark"]) .segmented-control {
    background: rgba(255, 255, 255, 0.08);
  }

  .segmented-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 8px;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: var(--text-color-secondary, #666);
    font-size: 0.9rem;
    font-weight: 500;
    min-height: 44px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .segmented-btn.active {
    background: var(--bg-color, #fff);
    color: var(--text-color, #111);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    font-weight: 600;
  }
  
  .segmented-btn:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  /* ── Bottom Sheet (Mobile >= 5) ── */
  .bottom-sheet-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: var(--bg-color, #fff);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color);
    min-height: 48px;
    cursor: pointer;
  }

  .trigger-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .bottom-sheet-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.4);
    z-index: 100;
  }

  .bottom-sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg-color, #fff);
    border-radius: 20px 20px 0 0;
    z-index: 101;
    padding: 16px 20px 32px;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.1);
    max-height: 85vh;
    display: flex;
    flex-direction: column;
  }

  .sheet-handle {
    width: 40px;
    height: 4px;
    background: rgba(148, 163, 184, 0.3);
    border-radius: 4px;
    margin: 0 auto 16px;
  }

  .sheet-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .sheet-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-color-secondary);
  }

  .sheet-close {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(148, 163, 184, 0.1);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-color);
  }

  .sheet-options {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .sheet-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: rgba(148, 163, 184, 0.05);
    border: 1px solid transparent;
    border-radius: 12px;
    color: var(--text-color);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    min-height: 48px;
    text-align: left;
  }

  .sheet-option.active {
    background: rgba(229, 32, 30, 0.08); /* Primary color low alpha */
    border-color: rgba(229, 32, 30, 0.2);
    color: var(--primary-color, #e5201e);
    font-weight: 600;
  }

  .check-icon {
    margin-left: auto;
    font-size: 1.2rem;
  }
</style>
