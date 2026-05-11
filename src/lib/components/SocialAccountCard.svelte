<script lang="ts">
  import { t } from "$lib/i18n";
  import type { SocialAccount } from "$lib/data/socialAccounts";

  export let account: SocialAccount;
  export let layout: "card" | "chip" = "card";

  const platformIcons = {
    instagram: "📸",
    facebook: "📘",
    tiktok: "🎵",
    youtube: "📺",
    linkedin: "🔗",
    whatsapp: "💬",
  };

  const platformColors = {
    instagram: "#E1306C",
    facebook: "#1877F2",
    tiktok: "#000000",
    youtube: "#FF0000",
    linkedin: "#0A66C2",
    whatsapp: "#25D366",
  };
</script>

{#if layout === "chip"}
  <a
    href={account.url}
    target="_blank"
    rel="noopener noreferrer"
    class="social-chip"
    style="--chip-color: {platformColors[account.platform]};"
  >
    <span class="chip-icon">{platformIcons[account.platform]}</span>
    <span class="chip-name">{account.name}</span>
  </a>
{:else}
  <a
    href={account.url}
    target="_blank"
    rel="noopener noreferrer"
    class="social-card"
    style="--accent-color: {platformColors[account.platform]};"
  >
    <div class="card-header">
      <div class="platform-icon" style="background: {platformColors[account.platform]}">
        {platformIcons[account.platform]}
      </div>
      {#if account.verified}
        <span class="verified-badge" title={$t.feed.verifiedBadge || "Verified official page"}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </span>
      {/if}
    </div>
    
    <div class="card-content">
      <h3 class="account-name">{account.name}</h3>
      <p class="account-handle">@{account.handle}</p>
      
      {#if account.type === "club"}
        <div class="tag-row">
          <span class="tag type-tag">{$t.feed.studentRun || "Student-run"}</span>
          {#if account.categories}
            {#each account.categories as cat}
              <span class="tag category-tag">{cat}</span>
            {/each}
          {/if}
        </div>
      {:else}
        <span class="official-label">{$t.feed.officialLabel || "Official Page"}</span>
      {/if}
    </div>

    <div class="card-footer">
      <span class="cta-text">{$t.feed.openInstagram || "Open"}</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
      </svg>
    </div>
  </a>
{/if}

<style>
  /* Social Chip */
  .social-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 100px;
    text-decoration: none;
    color: var(--text-color);
    white-space: nowrap;
    transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    box-shadow: var(--shadow-sm);
  }

  .social-chip:hover {
    border-color: var(--chip-color);
    background: color-mix(in srgb, var(--chip-color) 8%, var(--card-bg));
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .chip-icon {
    font-size: 1.1rem;
  }

  .chip-name {
    font-size: 0.9rem;
    font-weight: 600;
  }

  /* Social Card */
  .social-card {
    display: flex;
    flex-direction: column;
    padding: var(--spacing-md);
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    text-decoration: none;
    color: var(--text-color);
    transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    box-shadow: var(--shadow-sm);
    position: relative;
    overflow: hidden;
    height: 100%;
    box-sizing: border-box;
  }

  .social-card:hover {
    transform: translateY(-4px);
    border-color: var(--accent-color);
    box-shadow: 0 12px 24px -8px color-mix(in srgb, var(--accent-color) 20%, transparent);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-sm);
  }

  .platform-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: white;
  }

  .verified-badge {
    color: #1d9bf0;
    width: 18px;
    height: 18px;
  }

  .card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .account-name {
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
    line-height: 1.2;
  }

  .account-handle {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
    margin: 0 0 8px 0;
  }

  .tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }

  .tag {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .type-tag {
    background: var(--bg-secondary);
    color: var(--text-color-secondary);
  }

  .category-tag {
    background: color-mix(in srgb, var(--accent-color) 10%, transparent);
    color: var(--accent-color);
  }

  .official-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: #1d9bf0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-footer {
    margin-top: var(--spacing-md);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--accent-color);
    opacity: 0.8;
    transition: opacity 0.2s;
  }

  .social-card:hover .card-footer {
    opacity: 1;
  }

  .cta-text {
    margin-right: 4px;
  }
</style>
