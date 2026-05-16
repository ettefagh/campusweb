<script lang="ts">
  import { t } from "$lib/i18n";
  import SocialAccountCard from "./SocialAccountCard.svelte";
  import type { SocialAccount } from "$lib/data/socialAccounts";
  import SectionHeader from "./SectionHeader.svelte";

  export let accounts: SocialAccount[];
</script>

{#if accounts.length > 0}
  <section class="social-section">

    <SectionHeader title={$t.feed.officialPages} />
    <div class="social-scroll">
      {#each accounts as account}
        <SocialAccountCard {account} layout="chip" />
      {/each}
    </div>
  </section>
{/if}

<style>

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
