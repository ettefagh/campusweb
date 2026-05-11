<script lang="ts">
  import { onMount } from "svelte";
  import StoriesAdmin from "./StoriesAdmin.svelte";
  import ClubsAdmin from "./ClubsAdmin.svelte";
  import PromotionsAdmin from "./PromotionsAdmin.svelte";

  let activeTab = "stories";

  const tabs = [
    { id: "stories", label: "Stories", icon: "📸" },
    { id: "clubs", label: "Clubs", icon: "🤝" },
    { id: "promotions", label: "Promotions", icon: "🎁" },
    { id: "stats", label: "Analytics", icon: "📊" }
  ];

  function setTab(id: string) {
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
  <title>Admin Dashboard – SRH CampusWeb</title>
</svelte:head>

<div class="admin-layout">
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">🔴</div>
      <h2>CampusWeb Admin</h2>
    </div>
    
    <nav class="sidebar-nav">
      {#each tabs as tab}
        <button 
          class="nav-item" 
          class:active={activeTab === tab.id}
          on:click={() => setTab(tab.id)}
        >
          <span class="nav-icon">{tab.icon}</span>
          <span class="nav-label">{tab.label}</span>
        </button>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <a href="/feed" class="exit-btn">Exit to Feed</a>
    </div>
  </aside>

  <main class="content">
    {#if activeTab === "stories"}
      <StoriesAdmin />
    {:else if activeTab === "clubs"}
      <ClubsAdmin />
    {:else if activeTab === "promotions"}
      <PromotionsAdmin />
    {:else if activeTab === "stats"}
      <div class="stats-placeholder">
        <h1>📊 Analytics Dashboard</h1>
        <p>Live metrics and usage statistics coming soon.</p>
      </div>
    {/if}
  </main>
</div>

<style>
  :global(:root) {
    --sidebar-width: 260px;
  }

  .admin-layout {
    display: flex;
    min-height: 100vh;
    background: var(--bg-color, #f5f7f9);
    color: var(--text-color, #111);
  }

  .sidebar {
    width: var(--sidebar-width);
    background: #fff;
    border-right: 1px solid var(--border-color, #e5e7eb);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0; bottom: 0;
  }

  .sidebar-header {
    padding: 32px 24px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .sidebar-header h2 {
    font-size: 1.1rem;
    font-weight: 800;
    margin: 0;
  }

  .sidebar-nav {
    flex: 1;
    padding: 0 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 12px;
    border: none;
    background: transparent;
    color: var(--text-color-secondary, #666);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .nav-item:hover {
    background: var(--bg-color, #f3f4f6);
    color: var(--text-color);
  }

  .nav-item.active {
    background: var(--primary-color, #e5201e);
    color: #fff;
  }

  .nav-icon {
    font-size: 1.2rem;
  }

  .sidebar-footer {
    padding: 24px;
    border-top: 1px solid var(--border-color, #e5e7eb);
  }

  .exit-btn {
    display: block;
    width: 100%;
    padding: 12px;
    text-align: center;
    background: var(--bg-color, #f3f4f6);
    border-radius: 10px;
    text-decoration: none;
    color: var(--text-color);
    font-size: 0.9rem;
    font-weight: 700;
  }

  .content {
    flex: 1;
    margin-left: var(--sidebar-width);
    padding: 40px;
  }

  .stats-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 60vh;
    text-align: center;
    color: var(--text-color-secondary);
  }

  @media (max-width: 900px) {
    :global(:root) {
      --sidebar-width: 80px;
    }
    .nav-label, .sidebar-header h2, .exit-btn { display: none; }
    .sidebar-header, .sidebar-footer { justify-content: center; padding: 24px 0; }
    .nav-item { justify-content: center; padding: 16px 0; }
  }
</style>
