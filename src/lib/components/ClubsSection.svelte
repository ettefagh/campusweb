<script lang="ts">
  import { t } from "$lib/i18n";
  import SocialAccountCard from "./SocialAccountCard.svelte";
  import type { SocialAccount } from "$lib/data/socialAccounts";
  import SectionHeader from "./SectionHeader.svelte";

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

    <SectionHeader title={$t.feed.studentClubs}>
      <button class="section-action-btn" on:click={onSuggest}>
        {$t.feed.suggestClub}
      </button>
    </SectionHeader>

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
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-md);
  }

  @media (min-width: 960px) {
    .clubs-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 380px) {
    .clubs-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
