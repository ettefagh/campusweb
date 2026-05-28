<script lang="ts">
  import { onMount } from "svelte";
  import StoriesAdmin from "./StoriesAdmin.svelte";
  import ClubsAdmin from "./ClubsAdmin.svelte";
  import PromotionsAdmin from "./PromotionsAdmin.svelte";
  import StatsAdmin from "./StatsAdmin.svelte";
  
  import Tabs from "$lib/components/ui/Tabs.svelte";
  import TabContent from "$lib/components/ui/TabContent.svelte";

  let activeTab = "stories";

  const tabs = [
    { id: "stories", label: "Stories", icon: "📸" },
    { id: "clubs", label: "Clubs", icon: "🤝" },
    { id: "promotions", label: "Promotions", icon: "🎁" },
    { id: "stats", label: "Analytics", icon: "📊" }
  ];

  function handleTabChange(event: CustomEvent<{ id: string }>) {
    const id = event.detail.id;
    activeTab = id;
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `?tab=${id}`);
    }
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && tabs.find(t => t.id === tab)) {
      activeTab = tab;
    }
  });
</script>

<svelte:head>
  <title>Admin Dashboard – CampusWeb</title>
</svelte:head>

<div class="admin-layout">
  <header class="admin-header">
    <div class="header-top">
      <div class="logo">🔴 CampusWeb Admin</div>
      <a href="/feed" class="exit-btn">Exit to Feed</a>
    </div>
    
    <div class="tabs-container">
      <Tabs {tabs} bind:activeTab on:change={handleTabChange} />
    </div>
  </header>

  <main class="content">
    <TabContent activeTabId={activeTab} let:renderedTabId>
      {#if renderedTabId === "stories"}
        <StoriesAdmin />
      {:else if renderedTabId === "clubs"}
        <ClubsAdmin />
      {:else if renderedTabId === "promotions"}
        <PromotionsAdmin />
      {:else if renderedTabId === "stats"}
        <StatsAdmin />
      {/if}
    </TabContent>
  </main>
</div>

<style>
  .admin-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--bg-color, #f5f7f9);
    color: var(--text-color, #111);
  }

  .admin-header {
    background: #fff;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
    padding-top: 24px;
  }

  .header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40px;
    margin-bottom: 24px;
  }

  .logo {
    font-size: 1.1rem;
    font-weight: 800;
  }

  .exit-btn {
    padding: 8px 16px;
    background: var(--bg-color, #f3f4f6);
    border-radius: 10px;
    text-decoration: none;
    color: var(--text-color);
    font-size: 0.9rem;
    font-weight: 700;
  }

  .tabs-container {
    padding: 0 40px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .content {
    flex: 1;
    padding: 40px;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .stats-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 40vh;
    text-align: center;
    color: var(--text-color-secondary);
  }

  @media (max-width: 768px) {
    .header-top {
      padding: 0 20px;
    }
    .tabs-container {
      padding: 0 20px;
    }
    .content {
      padding: 20px;
    }
  }
</style>
