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

  $: if (activeTabId !== renderedTabId && browser) {
    processTransitions();
  } else if (!browser) {
    renderedTabId = activeTabId;
  }

  async function processTransitions() {
    if (isTransitioning) return;
    isTransitioning = true;
    
    try {
      while (renderedTabId !== activeTabId) {
        const targetTabId = activeTabId;
        
        // Fix current height
        if (contentWrapper) {
          containerHeight = contentWrapper.offsetHeight;
        }

        // Step 1: Fade out
        opacity = 0;
        await new Promise(r => setTimeout(r, 80));

        // Step 2: Swap content
        renderedTabId = targetTabId;
        await tick();
        
        // Measure new height
        if (contentWrapper) {
          containerHeight = contentWrapper.offsetHeight;
        }

        await new Promise(r => setTimeout(r, 80));

        // Step 3: Fade in
        opacity = 1;
        await new Promise(r => setTimeout(r, 80));
        
        containerHeight = "auto";
      }
    } catch (err) {
      console.error("Tab transition error:", err);
      renderedTabId = activeTabId;
      opacity = 1;
      containerHeight = "auto";
    } finally {
      isTransitioning = false;
    }
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
