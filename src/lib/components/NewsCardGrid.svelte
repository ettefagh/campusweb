<script lang="ts">
  import { t } from "$lib/i18n";

  export let cards: Array<{
    tag: string;
    emoji: string;
    title: string;
    desc: string;
    url: string;
    color: string;
  }>;
</script>

<section class="news-cards">
  {#each cards as card}
    <a href={card.url} class="news-card" style="--card-accent: {card.color}">
      <div class="news-card-header">
        <span
          class="news-card-icon"
          style="background: color-mix(in srgb, {card.color} 12%, transparent); color: {card.color};"
        >
          {card.emoji}
        </span>
        <span
          class="news-card-tag"
          style="background: color-mix(in srgb, {card.color} 15%, transparent); color: {card.color}; border: 1px solid color-mix(in srgb, {card.color} 25%, transparent);"
        >
          {card.tag}
        </span>
      </div>
      <div class="news-card-content">
        <h3 class="news-card-title">{card.title}</h3>
        <p class="news-card-desc">{card.desc}</p>
      </div>
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
    </a>
  {/each}
</section>

<style>
  .news-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-md);
    margin: var(--spacing-sm) 0;
  }

  @media (max-width: 1024px) {
    .news-cards {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 768px) {
    .news-cards {
      grid-template-columns: 1fr;
    }
  }

  .news-card {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: var(--spacing-lg);
    padding-bottom: calc(var(--spacing-lg) + 24px);
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    text-decoration: none;
    color: var(--text-color);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
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
    box-shadow: 0 12px 24px -10px color-mix(in srgb, var(--card-accent) 25%, transparent);
    background: color-mix(in srgb, var(--card-accent) 2%, var(--card-bg));
  }

  .news-card:hover::before {
    width: 6px;
  }

  .news-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-md);
    gap: var(--spacing-sm);
  }

  .news-card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: var(--radius-lg);
    font-size: 1.25rem;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .news-card:hover .news-card-icon {
    transform: scale(1.1) rotate(5deg);
  }

  .news-card-tag {
    padding: 4px 10px;
    border-radius: 99px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .news-card-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    flex: 1;
    padding-right: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
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
    color: var(--card-accent);
  }

  .news-card-desc {
    font-size: 0.85rem;
    color: var(--text-color-secondary);
    line-height: 1.5;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .news-card-cta {
    position: absolute;
    bottom: var(--spacing-lg);
    right: var(--spacing-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--card-accent) 8%, var(--card-bg));
    border: 1px solid
      color-mix(in srgb, var(--card-accent) 15%, var(--border-color));
    color: var(--card-accent);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .news-card:hover .news-card-cta {
    background: var(--card-accent);
    color: #fff;
    border-color: var(--card-accent);
    transform: scale(1.1) translateX(2px);
    box-shadow: 0 4px 10px
      color-mix(in srgb, var(--card-accent) 30%, transparent);
  }
</style>
