<script lang="ts">
  import { onMount, tick } from "svelte";
  import { browser } from "$app/environment";
  
  export let activeTabId: string;

  let container: HTMLElement;
  let contentWrapper: HTMLElement;
  let containerHeight: number | string = "auto";
  
  // Track the actual rendered active tab to perform transitions
  let renderedTabId: string = activeTabId;
  let isTransitioning = false;
  let opacity = 1;

  $: if (activeTabId !== renderedTabId && browser && !isTransitioning) {
    transitionContent(activeTabId);
  } else if (!browser) {
    renderedTabId = activeTabId;
  }

  async function transitionContent(newTabId: string) {
    isTransitioning = true;
    
    // Fix current height
    if (contentWrapper) {
      containerHeight = contentWrapper.offsetHeight;
    }

    // Step 1: Fade out (80ms)
    opacity = 0;
    await new Promise(r => setTimeout(r, 80));

    // Step 2: Pause (80ms) & Swap content
    renderedTabId = newTabId;
    
    // Wait for Svelte to render new content
    await tick();
    
    // Measure new height
    if (contentWrapper) {
      const newHeight = contentWrapper.offsetHeight;
      containerHeight = newHeight;
    }

    await new Promise(r => setTimeout(r, 80));

    // Step 3: Fade in (80ms)
    opacity = 1;
    
    // Wait for fade in, then set height back to auto to let content breathe
    await new Promise(r => setTimeout(r, 80));
    containerHeight = "auto";
    isTransitioning = false;
  }

  onMount(() => {
    // Initial setup if needed
  });
</script>

<div 
  class="tab-content-container" 
  bind:this={container}
  style="height: {typeof containerHeight === 'number' ? containerHeight + 'px' : containerHeight};"
>
  <div 
    class="tab-content-wrapper" 
    bind:this={contentWrapper}
    style="opacity: {opacity};"
  >
    <slot {renderedTabId}></slot>
  </div>
</div>

<style>
  .tab-content-container {
    position: relative;
    width: 100%;
    /* The container's height is animated */
    transition: height 0.24s cubic-bezier(0.25, 1, 0.5, 1);
    overflow: hidden; /* Prevent content spilling during shrink */
  }

  /* When height is auto, we want to allow overflow to show dropdowns/popups properly */
  .tab-content-container[style*="height: auto"] {
    overflow: visible;
  }

  .tab-content-wrapper {
    /* The wrapper handles the fade transition */
    transition: opacity 0.08s ease-out;
  }
</style>
