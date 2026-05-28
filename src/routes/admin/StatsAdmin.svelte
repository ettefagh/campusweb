<script lang="ts">
  import { onMount } from "svelte";
  import { allLinks } from "$lib/data/links";

  let stats: any = null;
  let loading = true;

  async function loadStats() {
    loading = true;
    try {
      const res = await fetch("/admin/api/stats");
      if (res.ok) {
        stats = await res.json();
      }
    } catch (err) {
      console.error("Failed to fetch stats in dashboard:", err);
    } finally {
      loading = false;
    }
  }

  // Derived metrics
  $: totalSuggestions = stats?.suggestions?.allTime || 0;
  
  $: totalClicks = stats?.links?.allTime 
    ? Object.values(stats.links.allTime).reduce((a: any, b: any) => a + b, 0) as number 
    : 0;

  $: totalStoryViews = stats?.storyViews?.allTime 
    ? Object.values(stats.storyViews.allTime).reduce((a: any, b: any) => a + b, 0) as number 
    : 0;

  $: approvedCount = stats?.actions?.approved || 0;
  $: approvedPercent = totalSuggestions > 0 ? (approvedCount / totalSuggestions) * 100 : 0;
  $: declinedCount = stats?.actions?.declined || 0;
  $: editedCount = stats?.actions?.edited || 0;
  $: directCreatedCount = stats?.actions?.directCreated || 0;

  // Process top links
  $: sortedLinks = stats?.links?.allTime
    ? Object.entries(stats.links.allTime)
        .map(([linkId, clicks]) => {
          const matchedLink = allLinks.find(l => l.id === linkId);
          return {
            id: linkId,
            title: matchedLink?.title || linkId,
            clicks: clicks as number
          };
        })
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5)
    : [];

  $: maxClicks = sortedLinks.length > 0 ? sortedLinks[0].clicks : 1;

  // Process top stories
  $: sortedStories = stats?.storyViews?.allTime
    ? Object.entries(stats.storyViews.allTime)
        .map(([storyId, views]) => ({
          id: storyId,
          title: storyId.replace("story-", "").replace(/-/g, " "),
          views: views as number
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)
    : [];

  $: maxViews = sortedStories.length > 0 ? sortedStories[0].views : 1;

  // Chart Data: Last 7 days suggestion trends
  $: dailyTrends = stats?.suggestions?.daily
    ? Object.entries(stats.suggestions.daily)
        .map(([date, count]) => ({ date, count: count as number }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7)
    : [];

  $: maxTrendValue = dailyTrends.length > 0 ? Math.max(...dailyTrends.map(t => t.count)) : 10;

  // SVG Chart sizing
  const width = 500;
  const height = 180;
  const padding = 30;

  $: chartPoints = dailyTrends.map((t, idx) => {
    const x = padding + (idx * (width - padding * 2)) / Math.max(1, dailyTrends.length - 1);
    const y = height - padding - (t.count * (height - padding * 2)) / Math.max(1, maxTrendValue);
    return { x, y, label: t.count, date: t.date.slice(5) }; // Format MM-DD
  });

  $: polylinePoints = chartPoints.map(p => `${p.x},${p.y}`).join(" ");

  onMount(() => {
    loadStats();
  });
</script>

<div class="admin-section">
  <header class="section-header">
    <h1>📊 Analytics & Metrics</h1>
    <p class="header-sub">Real-time usage analytics, click trends, and campus activity logs.</p>
  </header>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading analytics data...</p>
    </div>
  {:else if stats}
    <!-- High-level Metric Cards -->
    <div class="metrics-grid">
      <div class="metric-card bg-stories">
        <div class="card-icon"><i class="ph-bold ph-eye"></i></div>
        <div class="card-info">
          <h3>Total Story Views</h3>
          <span class="value">{totalStoryViews.toLocaleString()}</span>
        </div>
      </div>
      <div class="metric-card bg-links">
        <div class="card-icon"><i class="ph-bold ph-mouse-pointer"></i></div>
        <div class="card-info">
          <h3>Total Link Clicks</h3>
          <span class="value">{totalClicks.toLocaleString()}</span>
        </div>
      </div>
      <div class="metric-card bg-suggestions">
        <div class="card-icon"><i class="ph-bold ph-lightbulb"></i></div>
        <div class="card-info">
          <h3>Total Suggestions</h3>
          <span class="value">{totalSuggestions.toLocaleString()}</span>
        </div>
      </div>
    </div>

    <!-- Core Breakdown & Trends Section -->
    <div class="trends-grid">
      <!-- 7-day suggestion trend SVG chart -->
      <section class="card trend-card">
        <h2>📈 Weekly Suggestions Trend</h2>
        <p class="card-sub">Daily volume of user-submitted stories and events.</p>
        
        {#if dailyTrends.length > 0}
          <div class="chart-container">
            <svg viewBox="0 0 {width} {height}" class="svg-chart">
              <!-- Grid Lines -->
              {#each Array(4) as _, i}
                {@const y = padding + (i * (height - padding * 2)) / 3}
                <line x1={padding} y1={y} x2={width - padding} y2={y} class="grid-line" />
              {/each}

              <!-- The Line -->
              <polyline fill="none" stroke="var(--primary-color, #e5201e)" stroke-width="3" points={polylinePoints} />
              
              <!-- Points with interactive tooltips -->
              {#each chartPoints as p}
                <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="var(--primary-color, #e5201e)" stroke-width="2" class="chart-dot" />
                <text x={p.x} y={p.y - 10} text-anchor="middle" class="chart-val-lbl">{p.label}</text>
                <text x={p.x} y={height - 10} text-anchor="middle" class="chart-axis-lbl">{p.date}</text>
              {/each}
            </svg>
          </div>
        {:else}
          <div class="empty-chart">No daily suggestion metrics found.</div>
        {/if}
      </section>

      <!-- Moderator Activity Circular chart / progress -->
      <section class="card mod-card">
        <h2>🛠️ Moderator Actions</h2>
        <p class="card-sub">Distribution of curation actions in the Telegram workflow.</p>
        
        <div class="mod-stats-body">
          <div class="circular-progress-wrapper">
            <svg viewBox="0 0 100 100" class="circle-chart">
              <circle cx="50" cy="50" r="40" class="circle-bg" />
              <circle cx="50" cy="50" r="40" class="circle-fg" stroke-dasharray="{approvedPercent * 2.51} 251" />
              <text x="50" y="55" text-anchor="middle" class="circle-txt">{Math.round(approvedPercent)}%</text>
            </svg>
            <span class="circle-sub">Approval Rate</span>
          </div>

          <div class="stats-list">
            <div class="stat-row">
              <span class="stat-indicator green"></span>
              <span class="stat-lbl">Approved</span>
              <span class="stat-val">{approvedCount}</span>
            </div>
            <div class="stat-row">
              <span class="stat-indicator red"></span>
              <span class="stat-lbl">Declined</span>
              <span class="stat-val">{declinedCount}</span>
            </div>
            <div class="stat-row">
              <span class="stat-indicator blue"></span>
              <span class="stat-lbl">Edited</span>
              <span class="stat-val">{editedCount}</span>
            </div>
            <div class="stat-row">
              <span class="stat-indicator gray"></span>
              <span class="stat-lbl">Direct Add</span>
              <span class="stat-val">{directCreatedCount}</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Top Links & Stories Breakdown -->
    <div class="lists-grid">
      <!-- Popular Links -->
      <section class="card">
        <h2>🔥 Top Performing Shortcuts</h2>
        <p class="card-sub">Most frequently clicked campus guide links.</p>
        
        <div class="progress-list">
          {#each sortedLinks as item}
            {@const percent = (item.clicks / maxClicks) * 100}
            <div class="progress-item">
              <div class="progress-header">
                <span class="progress-name">{item.title}</span>
                <span class="progress-count">{item.clicks} clicks</span>
              </div>
              <div class="progress-bar-wrapper">
                <div class="progress-bar bg-primary" style="width: {percent}%;"></div>
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- Popular Stories -->
      <section class="card">
        <h2>📸 Top Stories & Ads</h2>
        <p class="card-sub">Most viewed student-submitted images and news posts.</p>

        <div class="progress-list">
          {#each sortedStories as item}
            {@const percent = (item.views / maxViews) * 100}
            <div class="progress-item">
              <div class="progress-header">
                <span class="progress-name capitalize">{item.title}</span>
                <span class="progress-count">{item.views} views</span>
              </div>
              <div class="progress-bar-wrapper">
                <div class="progress-bar bg-blue" style="width: {percent}%;"></div>
              </div>
            </div>
          {/each}
        </div>
      </section>
    </div>
  {/if}
</div>

<style>
  .admin-section { max-width: 1000px; margin: 0 auto; width: 100%; }
  .section-header { margin-bottom: 28px; }
  .section-header h1 { font-size: 1.8rem; font-weight: 800; margin: 0 0 6px; }
  .header-sub { color: var(--text-color-secondary, #666); font-size: 0.92rem; margin: 0; }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
    color: var(--text-color-secondary);
  }
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #f3f4f6;
    border-top: 3px solid var(--primary-color, #e5201e);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 16px;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .card {
    background: #fff;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .card h2 { font-size: 1.15rem; font-weight: 800; margin: 0 0 4px; }
  .card-sub { color: var(--text-color-secondary, #666); font-size: 0.82rem; margin: 0 0 16px; }

  /* Metrics Grid */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }

  .metric-card {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 24px;
    border-radius: 16px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    border: 1px solid var(--border-color);
  }
  .metric-card.bg-stories { background: rgba(59, 130, 246, 0.03); border-color: rgba(59, 130, 246, 0.1); }
  .metric-card.bg-links { background: rgba(16, 185, 129, 0.03); border-color: rgba(16, 185, 129, 0.1); }
  .metric-card.bg-suggestions { background: rgba(245, 158, 11, 0.03); border-color: rgba(245, 158, 11, 0.1); }

  .metric-card .card-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
  }
  .bg-stories .card-icon { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .bg-links .card-icon { background: rgba(16, 185, 129, 0.1); color: #10b981; }
  .bg-suggestions .card-icon { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

  .metric-card .card-info { display: flex; flex-direction: column; gap: 2px; }
  .metric-card .card-info h3 { margin: 0; font-size: 0.85rem; color: var(--text-color-secondary); font-weight: 700; }
  .metric-card .card-info .value { font-size: 1.6rem; font-weight: 800; color: var(--text-color); }

  /* Trends Grid */
  .trends-grid {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 20px;
    margin-bottom: 24px;
  }
  @media (max-width: 800px) {
    .trends-grid { grid-template-columns: 1fr; }
  }

  .chart-container { width: 100%; overflow: hidden; margin-top: 10px; }
  .svg-chart { width: 100%; height: auto; display: block; overflow: visible; }
  .grid-line { stroke: #f3f4f6; stroke-dasharray: 4 4; stroke-width: 1; }
  .chart-val-lbl { font-size: 0.72rem; font-weight: 700; fill: var(--primary-color); }
  .chart-axis-lbl { font-size: 0.72rem; font-weight: 600; fill: #94a3b8; }
  .empty-chart { display: flex; align-items: center; justify-content: center; height: 180px; color: #94a3b8; font-size: 0.9rem; }

  /* Moderator Card Styles */
  .mod-stats-body {
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 20px;
    padding-top: 10px;
  }
  @media (max-width: 450px) {
    .mod-stats-body { flex-direction: column; }
  }

  .circular-progress-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100px;
  }
  .circle-chart { width: 100px; height: 100px; transform: rotate(-90deg); overflow: visible; }
  .circle-bg { fill: none; stroke: #f3f4f6; stroke-width: 8; }
  .circle-fg {
    fill: none;
    stroke: #10b981;
    stroke-width: 8;
    stroke-linecap: round;
    transition: stroke-dasharray 0.3s ease;
  }
  .circle-txt {
    fill: var(--text-color);
    font-size: 1.3rem;
    font-weight: 800;
    /* Unrotate text inside chart */
    transform: rotate(90deg) translate(0px, -92px);
  }
  .circle-sub { font-size: 0.75rem; font-weight: 700; color: var(--text-color-secondary); }

  .stats-list { display: flex; flex-direction: column; gap: 8px; flex: 1; }
  .stat-row { display: flex; align-items: center; gap: 8px; font-size: 0.88rem; }
  .stat-indicator { width: 10px; height: 10px; border-radius: 50%; }
  .stat-indicator.green { background: #10b981; }
  .stat-indicator.red { background: #ef4444; }
  .stat-indicator.blue { background: #3b82f6; }
  .stat-indicator.gray { background: #94a3b8; }
  .stat-lbl { color: var(--text-color-secondary); font-weight: 600; }
  .stat-val { font-weight: 700; margin-left: auto; color: var(--text-color); }

  /* Lists Grid */
  .lists-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 20px;
  }

  .progress-list { display: flex; flex-direction: column; gap: 14px; }
  .progress-item { display: flex; flex-direction: column; gap: 6px; }
  .progress-header { display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; }
  .progress-name { color: var(--text-color); }
  .progress-count { color: var(--text-color-secondary); }
  
  .progress-bar-wrapper {
    height: 8px;
    background: #f3f4f6;
    border-radius: 99px;
    overflow: hidden;
  }
  .progress-bar { height: 100%; border-radius: 99px; }
  .progress-bar.bg-primary { background: var(--primary-color, #e5201e); }
  .progress-bar.bg-blue { background: #3b82f6; }

  .capitalize { text-transform: capitalize; }
</style>
