<script lang="ts">
  import { t } from "$lib/i18n";
  import SocialAccountCard from "./SocialAccountCard.svelte";
  import type { SocialAccount } from "$lib/data/socialAccounts";

  export let accounts: SocialAccount[];
</script>

{#if accounts.length > 0}
  <section class="social-section">
    <h2 class="section-title">{$t.feed.officialPages}</h2>
    <div class="social-scroll">
      {#each accounts as account}
        <SocialAccountCard {account} layout="chip" />
      {/each}
    </div>
  </section>
{/if}

<style>
  .social-section {
    margin-bottom: var(--spacing-sm);
  }
  
  .section-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: var(--spacing-sm);
    color: var(--text-color);
  }

  .social-scroll {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 8px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .social-scroll::-webkit-scrollbar {
    display: none;
  }
</style>
