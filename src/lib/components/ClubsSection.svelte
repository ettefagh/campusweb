<script lang="ts">
  import { t } from "$lib/i18n";
  import SocialAccountCard from "./SocialAccountCard.svelte";
  import type { SocialAccount } from "$lib/data/socialAccounts";

  export let accounts: SocialAccount[];
  export let onSuggest: () => void;

  let selectedCategory = "all";
  $: allCategories = ["all", ...new Set(accounts.flatMap(acc => acc.categories || []))];
  $: displayedClubs = selectedCategory === "all" 
    ? accounts 
    : accounts.filter(acc => acc.categories?.includes(selectedCategory));
</script>

{#if accounts.length > 0}
  <section class="clubs-section">
    <div class="section-header">
      <h2 class="section-title">{$t.feed.studentClubs}</h2>
      <button class="suggest-btn" on:click={onSuggest}>
        {$t.feed.suggestClub}
      </button>
    </div>

    <!-- Category Filter Bar -->
    <div class="category-filter-scroll">
      {#each allCategories as cat}
        <button 
          class="filter-chip" 
          class:active={selectedCategory === cat}
          on:click={() => selectedCategory = cat}
        >
          {cat === "all" ? ($t.feed.allCategories || "All") : cat}
        </button>
      {/each}
    </div>

    <div class="clubs-grid">
      {#each displayedClubs as account (account.id)}
        <SocialAccountCard {account} layout="card" />
      {/each}
    </div>
  </section>
{/if}

<style>
  .clubs-section {
    margin-bottom: var(--spacing-sm);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }

  .section-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-color);
  }

  .suggest-btn {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 6px 12px;
    background: color-mix(in srgb, var(--primary-color) 10%, transparent);
    color: var(--primary-color);
    border: 1px solid color-mix(in srgb, var(--primary-color) 20%, transparent);
    border-radius: 99px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .suggest-btn:hover {
    background: var(--primary-color);
    color: white;
  }

  .category-filter-scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .category-filter-scroll::-webkit-scrollbar {
    display: none;
  }

  .filter-chip {
    padding: 6px 14px;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 99px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-chip.active {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
    box-shadow: 0 4px 12px color-mix(in srgb, var(--primary-color) 30%, transparent);
  }

  .filter-chip:hover:not(.active) {
    border-color: var(--primary-color);
    color: var(--primary-color);
    background: color-mix(in srgb, var(--primary-color) 5%, transparent);
  }

  .clubs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--spacing-md);
  }

  @media (max-width: 600px) {
    .clubs-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
