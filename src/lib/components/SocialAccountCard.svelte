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
  } as const;

  const platformColors = {
    instagram: "#E1306C",
    facebook: "#1877F2",
    tiktok: "#111111",
    youtube: "#FF0000",
    linkedin: "#0A66C2",
    whatsapp: "#25D366",
  } as const;

  const platformNames = {
    instagram: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
    youtube: "YouTube",
    linkedin: "LinkedIn",
    whatsapp: "WhatsApp",
  } as const;

  const isOfficialClub = (clubRole?: string) => clubRole === "official";
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
    <span class="chip-copy">
      <span class="chip-name">{account.name}</span>
      <span class="chip-platform">{platformNames[account.platform]}</span>
    </span>
  </a>
{:else}
  <a
    href={account.url}
    target="_blank"
    rel="noopener noreferrer"
    class="social-card"
    class:club-card={account.type === "club"}
    style="--accent-color: {platformColors[account.platform]};"
  >
    {#if account.type === "club"}
      <div class="club-card-surface" class:official-club={isOfficialClub(account.clubRole)}>
        {#if isOfficialClub(account.clubRole)}
          <span class="official-corner-flag">{$t.feed.officialLabel || "Official"}</span>
        {/if}

        <div class="club-card-head">
          <div class="platform-icon" style="background: {platformColors[account.platform]}">
            {#if account.logoUrl}
              <img src={account.logoUrl} alt="" />
            {:else}
              {platformIcons[account.platform]}
            {/if}
          </div>

          <div class="club-head-copy">
            <h3 class="account-name">{account.name}</h3>
            <p class="account-handle">@{account.handle}</p>
          </div>
        </div>

        {#if account.description}
          <p class="account-description">{account.description}</p>
        {/if}

        <div class="club-meta-grid">
          <div class="club-meta-item">
            <span class="club-meta-label">Platform</span>
            <span class="club-meta-value">{platformNames[account.platform]}</span>
          </div>
          <div class="club-meta-item">
            <span class="club-meta-label">Campus</span>
            <span class="club-meta-value">
              {account.campusIds?.includes("all") ? "All" : account.campusIds?.join(", ")}
            </span>
          </div>
        </div>

        {#if account.categories?.length}
          <div class="tag-row">
            {#each account.categories as cat}
              <span class="tag category-tag">{cat}</span>
            {/each}
          </div>
        {/if}

        <div class="card-footer">
          <span class="cta-text">
            {account.platform === "instagram"
              ? ($t.feed.openInstagram || "Open Instagram")
              : `Open ${platformNames[account.platform] || "Page"}`}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </div>
      </div>
    {:else}
      <div class="card-copy">
        <div class="card-header">
          <div class="platform-icon" style="background: {platformColors[account.platform]}">
            {#if account.logoUrl}
              <img src={account.logoUrl} alt="" />
            {:else}
              {platformIcons[account.platform]}
            {/if}
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
          {#if account.description}
            <p class="account-description">{account.description}</p>
          {/if}
          <span class="official-label">{$t.feed.officialLabel || "Official Page"}</span>
        </div>

        <div class="card-footer">
          <span class="cta-text">
            {account.platform === "instagram"
              ? ($t.feed.openInstagram || "Open Instagram")
              : `Open ${platformNames[account.platform] || "Page"}`}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </div>
      </div>
    {/if}
  </a>
{/if}

<style>
  .social-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    text-decoration: none;
    color: var(--text-color);
    transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    box-shadow: var(--shadow-sm);
    min-width: 178px;
  }

  .social-chip:hover {
    border-color: var(--chip-color);
    background: color-mix(in srgb, var(--chip-color) 8%, var(--card-bg));
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .chip-icon {
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .chip-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .chip-name {
    font-size: 0.88rem;
    font-weight: 600;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chip-platform {
    font-size: 0.68rem;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--chip-color);
    opacity: 0.9;
  }

  .social-card {
    display: flex;
    flex-direction: column;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 24px;
    text-decoration: none;
    color: var(--text-color);
    transition: all 0.28s cubic-bezier(0.2, 0, 0, 1);
    box-shadow: var(--shadow-sm);
    position: relative;
    overflow: hidden;
    height: 100%;
    box-sizing: border-box;
  }

  .social-card:hover {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--accent-color) 28%, var(--border-color));
    box-shadow: 0 14px 28px -18px color-mix(in srgb, var(--accent-color) 45%, transparent);
  }

  .club-card {
    background: transparent;
  }

  .club-card-surface {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 220px;
    padding: 14px;
    border-radius: 22px;
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--accent-color) 11%, var(--card-bg)) 0%,
        color-mix(in srgb, var(--accent-color) 4%, var(--bg-secondary)) 100%
      );
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--accent-color) 10%, transparent),
      0 14px 24px -20px color-mix(in srgb, var(--accent-color) 55%, transparent);
  }

  .club-card-surface.official-club {
    padding-top: 38px;
    border-left: 3px solid var(--primary-color);
  }

  .official-corner-flag {
    position: absolute;
    top: 14px;
    left: -3px;
    right: auto;
    display: inline-flex;
    align-items: center;
    min-height: 22px;
    padding: 4px 12px 4px 10px;
    background:
      linear-gradient(90deg, var(--primary-color) 0%, #ff8b52 100%);
    color: #fff;
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    clip-path: none;
    border-radius: 0 999px 999px 0;
    border: 1px solid color-mix(in srgb, var(--primary-color) 72%, #fff);
    border-left: 0;
    box-shadow: 0 10px 16px -12px color-mix(in srgb, var(--primary-color) 75%, transparent);
  }

  .club-card-head,
  .card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .club-head-copy {
    min-width: 0;
    flex: 1;
  }

  .card-copy {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    min-height: 100%;
  }

  .platform-icon {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: white;
    overflow: hidden;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, white 18%, transparent);
  }

  .platform-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .verified-badge {
    color: #1d9bf0;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .account-name {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.25;
    font-weight: 700;
    color: var(--text-color);
  }

  .account-handle {
    margin: 0;
    font-size: 0.76rem;
    line-height: 1.25;
    color: var(--text-color-secondary);
  }

  .account-description {
    margin: 0;
    font-size: 0.74rem;
    line-height: 1.4;
    color: var(--text-color-secondary);
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .club-meta-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 8px;
    margin-top: auto;
  }

  .club-meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .club-meta-label {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-color-secondary);
    opacity: 0.82;
  }

  .club-meta-value {
    font-size: 0.76rem;
    font-weight: 600;
    line-height: 1.25;
    color: var(--text-color);
  }

  .tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag {
    font-size: 0.62rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 999px;
    text-transform: uppercase;
  }

  .category-tag {
    background: color-mix(in srgb, var(--accent-color) 14%, var(--card-bg));
    border: 1px solid color-mix(in srgb, var(--accent-color) 18%, transparent);
    color: var(--accent-color);
  }

  .official-label {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #1d9bf0;
  }

  .card-footer {
    margin-top: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 0.76rem;
    font-weight: 700;
    color: var(--accent-color);
  }

  .cta-text {
    min-width: 0;
  }

  @media (max-width: 560px) {
    .club-card-surface,
    .card-copy {
      padding: 12px;
    }

    .platform-icon {
      width: 38px;
      height: 38px;
      border-radius: 12px;
    }

    .club-meta-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
