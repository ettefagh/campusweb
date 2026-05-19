<script lang="ts">
  import { t } from "$lib/i18n";
  import type { Promotion } from "$lib/data/promotions";

  export let promotion: Promotion;
  export let onDismiss: (id: string) => void;

  function getLabel(label: Promotion["label"]) {
    if (label === "Promotion") return $t.feed.promotionLabel;
    if (label === "Student Offer") return $t.feed.studentOfferLabel;
    return $t.feed.officialOfferLabel;
  }
</script>

<div class="promo-card">
  <div class="promo-badge">
    {getLabel(promotion.label)}
  </div>
  
  <button class="dismiss-btn" on:click|preventDefault={() => onDismiss(promotion.id)} aria-label={$t.feed.dismiss}>
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  </button>

  <a href={promotion.linkUrl} target="_blank" rel="noopener noreferrer" class="promo-content">
    {#if promotion.imageUrl}
      <img src={promotion.imageUrl} alt={promotion.title} class="promo-image" />
    {/if}
    
    <div class="promo-text">
      <div class="promo-sponsor">{promotion.sponsorName}</div>
      <h3 class="promo-title">{promotion.title}</h3>
      <p class="promo-subtitle">{promotion.subtitle}</p>
    </div>
    
    <div class="promo-footer">
      <span class="promo-cta">{$t.feed.readMore}</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </div>
  </a>
</div>

<style>
  .promo-card {
    position: relative;
    background: var(--surface-solid);
    border: 1px solid #e5e5e5;
    border-radius: 18px;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    box-shadow: var(--campus-shadow-soft);
  }

  .promo-card:hover {
    transform: translateY(-4px);
    border-color: var(--primary-color);
    box-shadow: var(--campus-shadow);
  }

  .promo-badge {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 2;
    background: var(--primary-color);
    color: white;
    font-size: 0.65rem;
    font-weight: 800;
    padding: 3px 10px;
    border-radius: 99px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .dismiss-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 2;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(4px);
    color: white;
    border: none;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    opacity: 0;
  }

  .promo-card:hover .dismiss-btn {
    opacity: 1;
  }

  .dismiss-btn:hover {
    background: rgba(0, 0, 0, 0.4);
    transform: scale(1.1);
  }

  .promo-content {
    text-decoration: none;
    color: var(--text-color);
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .promo-image {
    width: 100%;
    height: 160px;
    object-fit: cover;
    border-bottom: 1px solid #e5e5e5;
  }

  .promo-text {
    padding: 20px;
    flex: 1;
  }

  .promo-sponsor {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    margin-bottom: 4px;
    text-transform: uppercase;
  }

  .promo-title {
    font-size: 1.1rem;
    font-weight: 800;
    margin: 0 0 8px 0;
    line-height: 1.3;
  }

  .promo-subtitle {
    font-size: 0.85rem;
    color: var(--text-color-secondary);
    margin: 0;
    line-height: 1.5;
  }

  .promo-footer {
    padding: 16px 20px;
    border-top: 1px solid #e5e5e5;
    background: #f5f0e6;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--primary-color);
  }

  .promo-cta {
    opacity: 0.9;
  }

  .promo-card:hover .promo-cta {
    opacity: 1;
    text-decoration: underline;
  }

  :global([data-theme="dark"]) .promo-card,
  :global([data-theme="dark"]) .promo-image,
  :global([data-theme="dark"]) .promo-footer {
    border-color: rgba(255, 255, 255, 0.11);
  }

  :global([data-theme="dark"]) .promo-footer {
    background: rgba(255, 255, 255, 0.08);
  }
</style>
