<script lang="ts">
  import { t } from "$lib/i18n";

  export let cards: Array<{
    tag: string;
    emoji: string;
    iconClass?: string;
    title: string;
    desc: string;
    url: string;
    color: string;
  }>;
</script>

<section class="news-cards">
  {#each cards as card}
    <a href={card.url} class="news-card" style="--card-accent: {card.color}">
      <div class="news-card-main">
        <span class="news-card-icon" style="background: {card.color};">
          {#if card.iconClass}
            <i class="ph-fill {card.iconClass}" aria-hidden="true"></i>
          {:else}
            {card.emoji}
          {/if}
        </span>
        <div class="news-card-content">
          <h3 class="news-card-title">{card.title}</h3>
          <p class="news-card-desc">{card.desc}</p>
        </div>
      </div>
      <div class="news-card-side">
        <span class="news-card-tag">
          {card.tag}
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
  {/each}
</section>

<style>
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
</style>
