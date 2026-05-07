<script lang="ts">
  import { idCardsStore } from '$lib/stores/idStore';
  import IdCard from './IdCard.svelte';
  import IdModal from './IdModal.svelte';

  let isEditMode = false;
  let activeIndex = 0;
  let sliderEl: HTMLElement;

  let showModal = false;
  let editingCardId: string | null = null;

  function handleScroll() {
    if (!sliderEl) return;
    const width = sliderEl.clientWidth;
    const scrollLeft = sliderEl.scrollLeft;
    activeIndex = Math.round(scrollLeft / width);
  }

  function scrollToSlide(index: number) {
    if (!sliderEl) return;
    const width = sliderEl.clientWidth;
    sliderEl.scrollTo({
      left: index * width,
      behavior: 'smooth'
    });
    activeIndex = index;
  }

  function handleAddCard() {
    editingCardId = null;
    showModal = true;
  }

  function handleEditCard(id: string) {
    editingCardId = id;
    showModal = true;
  }

  function handleDeleteCard(id: string) {
    if (confirm('Are you sure you want to delete this card?')) {
      idCardsStore.remove(id);
      // Reset active index if needed
      if (activeIndex >= $idCardsStore.length) {
        activeIndex = Math.max(0, $idCardsStore.length - 1);
      }
    }
  }

  function toggleEditMode() {
    isEditMode = !isEditMode;
  }
</script>

<div class="id-slider-section">
  <div class="slider-header">
    <div class="slider-title-group">
      <h2>🪪 Digital ID Wallet</h2>
      <p class="slider-subtitle">Tap cards to flip & scan barcode</p>
    </div>
    
    <div class="slider-actions">
      <button 
        class="slider-action-btn"
        class:active={isEditMode}
        on:click={toggleEditMode}
      >
        {isEditMode ? 'Done' : 'Manage'}
      </button>
    </div>
  </div>

  <!-- Cards Slider Container -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="slider-outer">
    <div 
      class="slider-container" 
      bind:this={sliderEl}
      on:scroll={handleScroll}
    >
      {#each $idCardsStore as card, i (card.id)}
        <div class="slide">
          <IdCard 
            {card} 
            editMode={isEditMode}
            onEdit={handleEditCard}
            onDelete={handleDeleteCard}
          />
        </div>
      {/each}

      <!-- Add New Card Slide -->
      <div class="slide">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="add-card-placeholder glass" on:click={handleAddCard}>
          <div class="add-card-inner">
            <span class="plus-icon">➕</span>
            <h3>Add Digital Card</h3>
            <p>Import student ID, semester ticket, or library card</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Dot Navigation Indicators -->
  <div class="slider-dots">
    {#each Array($idCardsStore.length + 1) as _, i}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="dot" 
        class:active={activeIndex === i}
        on:click={() => scrollToSlide(i)}
      ></div>
    {/each}
  </div>
</div>

<!-- Modal Dialog -->
{#if showModal}
  <IdModal 
    cardId={editingCardId} 
    onClose={() => showModal = false} 
  />
{/if}

<style>
  .id-slider-section {
    margin: var(--spacing-lg) var(--spacing-md);
    display: flex;
    flex-direction: column;
  }

  .slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
    padding: 0 var(--spacing-xs);
  }

  .slider-title-group h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 2px 0;
  }

  .slider-subtitle {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
    margin: 0;
  }

  .slider-action-btn {
    background: var(--glass-bg-light);
    border: 1px solid var(--glass-border-subtle);
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    color: var(--text-color);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .slider-action-btn:hover {
    background: rgba(212, 68, 7, 0.1);
    color: var(--primary-color);
    border-color: rgba(212, 68, 7, 0.2);
  }

  .slider-action-btn.active {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
    box-shadow: 0 2px 8px rgba(212, 68, 7, 0.3);
  }

  .slider-outer {
    position: relative;
    width: 100%;
    margin: 0 auto;
    overflow: visible;
  }

  .slider-container {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none;  /* IE and Edge */
    width: 100%;
    gap: 0px;
  }

  .slider-container::-webkit-scrollbar {
    display: none; /* Chrome, Safari and Opera */
  }

  .slide {
    flex: 0 0 100%;
    scroll-snap-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
  }

  .add-card-placeholder {
    width: 380px;
    height: 236px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed var(--border-color);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--glass-shadow);
    background: var(--glass-bg-light);
    box-sizing: border-box;
    padding: 20px;
    margin: 15px auto;
  }

  @media (max-width: 400px) {
    .add-card-placeholder {
      width: 320px;
      height: 198px;
    }
  }

  .add-card-placeholder:hover {
    border-color: var(--primary-color);
    background: rgba(212, 68, 7, 0.03);
    transform: translateY(-2px);
  }

  .add-card-inner {
    text-align: center;
    color: var(--text-color-secondary);
  }

  .plus-icon {
    font-size: 1.8rem;
    display: block;
    margin-bottom: 8px;
  }

  .add-card-inner h3 {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0 0 6px 0;
    color: var(--text-color);
  }

  .add-card-inner p {
    font-size: 0.75rem;
    margin: 0;
    line-height: 1.4;
    max-width: 240px;
  }

  .slider-dots {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-top: 10px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.15);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  :global([data-theme="dark"]) .dot {
    background: rgba(255, 255, 255, 0.2);
  }

  .dot.active {
    background: var(--primary-color);
    transform: scale(1.2);
    width: 16px;
    border-radius: 4px;
  }
</style>
