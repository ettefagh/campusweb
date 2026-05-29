<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { calculateRoute, type RouteResult } from "$lib/utils/pathfinder";
  import { ROOMS, type Room } from "$lib/data/campusData";
  import MapOverlay from "$lib/components/MapOverlay.svelte";
  import { t } from "$lib/i18n";

  let activeFloor = 0;
  let selectedRoomId: string | null = null;
  let startRoomId: string | null = null;
  let endRoomId: string | null = null;
  let requireAccessible = false;
  let activeRoute: RouteResult | null = null;

  let searchQuery = "";
  let selectedBuilding: string = "all";

  // Re-calculate route automatically when inputs change
  $: if (startRoomId && endRoomId) {
    activeRoute = calculateRoute(startRoomId, endRoomId, requireAccessible);
  } else {
    activeRoute = null;
  }

  // Auto-set floor to selected room's floor
  $: if (selectedRoomId) {
    const room = ROOMS.find(r => r.id === selectedRoomId);
    if (room) {
      activeFloor = room.floor;
    }
  }

  // Filtered rooms list for search
  $: filteredRooms = ROOMS.filter(room => {
    const matchesSearch = 
      room.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBuilding = 
      selectedBuilding === "all" || 
      room.building.toLowerCase() === selectedBuilding.toLowerCase();
    
    return matchesSearch && matchesBuilding;
  });

  function selectRoom(roomId: string) {
    selectedRoomId = roomId;
  }

  function setAsStart(roomId: string) {
    startRoomId = roomId;
  }

  function setAsEnd(roomId: string) {
    endRoomId = roomId;
  }

  function swapStartEnd() {
    const temp = startRoomId;
    startRoomId = endRoomId;
    endRoomId = temp;
  }

  function clearRoute() {
    startRoomId = null;
    endRoomId = null;
    activeRoute = null;
  }
</script>

<svelte:head>
  <title>Interactive Campus Map & Indoor Wayfinding</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/bold/style.css" />
</svelte:head>

<div class="map-page-container">
  <main class="wayfinding-grid">
    <!-- Left Drawer / Control Panel -->
    <aside class="control-panel glass">
      <header class="panel-header">
        <div class="header-main">
          <i class="ph-bold ph-map-trifold title-icon" aria-hidden="true"></i>
          <h1>Campus Wayfinding</h1>
        </div>
        <p class="panel-subtitle">SRH Berlin Campus Indoor Navigation</p>
      </header>

      <!-- Navigation & Routing Card -->
      <section class="routing-section">
        <h2 class="section-title">Indoor Directions</h2>
        
        <div class="input-stack">
          <!-- Start Point -->
          <div class="input-group">
            <label for="start-room-select">
              <span class="dot-indicator green"></span> Start Location
            </label>
            <div class="select-wrapper">
              <select id="start-room-select" bind:value={startRoomId}>
                <option value={null}>-- Select Start Room --</option>
                {#each ROOMS as room}
                  <option value={room.id}>{room.id} ({room.name})</option>
                {/each}
              </select>
            </div>
          </div>

          <!-- Action row (Swap / Clear) -->
          <div class="action-row">
            <button class="action-btn text-btn" on:click={swapStartEnd} disabled={!startRoomId && !endRoomId}>
              <i class="ph-bold ph-arrows-down-up"></i> Swap
            </button>
            <button class="action-btn text-btn" on:click={clearRoute} disabled={!startRoomId && !endRoomId}>
              <i class="ph-bold ph-trash"></i> Clear Route
            </button>
          </div>

          <!-- Destination Point -->
          <div class="input-group">
            <label for="end-room-select">
              <span class="dot-indicator red"></span> Destination
            </label>
            <div class="select-wrapper">
              <select id="end-room-select" bind:value={endRoomId}>
                <option value={null}>-- Select Destination --</option>
                {#each ROOMS as room}
                  <option value={room.id}>{room.id} ({room.name})</option>
                {/each}
              </select>
            </div>
          </div>

          <!-- Accessibility Toggle -->
          <label class="accessibility-switch">
            <input type="checkbox" bind:checked={requireAccessible} />
            <span class="slider"></span>
            <span class="switch-label">
              <i class="ph-bold ph-wheelchair"></i> Wheelchair / Stroller Accessible
            </span>
          </label>
        </div>
      </section>

      <!-- Step-by-Step Directions -->
      {#if activeRoute}
        <section class="directions-section">
          <div class="directions-header">
            <h3>Directions</h3>
            <span class="distance-badge">{activeRoute.totalDistance}m</span>
          </div>
          
          <ol class="steps-list">
            {#each activeRoute.steps as step, idx}
              <li class="step-item">
                <span class="step-icon-wrap">
                  {#if step.type === 'start'}
                    <i class="ph-bold ph-map-pin green-text"></i>
                  {:else if step.type === 'end'}
                    <i class="ph-bold ph-flag-flagpole red-text"></i>
                  {:else if step.type === 'elevator'}
                    <i class="ph-bold ph-elevator purple-text"></i>
                  {:else if step.type === 'stairs'}
                    <i class="ph-bold ph-stairs orange-text"></i>
                  {:else if step.type === 'door'}
                    <i class="ph-bold ph-door"></i>
                  {:else}
                    <i class="ph-bold ph-navigation-arrow"></i>
                  {/if}
                </span>
                <span class="step-text">{step.text}</span>
              </li>
            {/each}
          </ol>
        </section>
      {/if}

      <!-- Directory & Search -->
      <section class="directory-section">
        <h2 class="section-title">Campus Directory</h2>
        
        <div class="directory-filters">
          <!-- Search Bar (No box-shadow per rules) -->
          <div class="search-wrap">
            <i class="ph-bold ph-magnifying-glass search-icon"></i>
            <input 
              type="text" 
              placeholder="Search classrooms, labs, offices..." 
              bind:value={searchQuery}
              class="flat-search"
            />
          </div>

          <div class="select-wrapper">
            <select bind:value={selectedBuilding}>
              <option value="all">All Buildings</option>
              <option value="The SHED">The SHED</option>
              <option value="The Cube">The Cube</option>
              <option value="The Hall">The Hall</option>
            </select>
          </div>
        </div>

        <ul class="directory-results">
          {#each filteredRooms as room}
            <li class="directory-item" class:selected={selectedRoomId === room.id}>
              <button class="room-selector-btn" on:click={() => selectRoom(room.id)}>
                <span class="room-id {room.type}">{room.id}</span>
                <div class="room-meta">
                  <strong class="room-name">{room.name}</strong>
                  <span class="room-building-text">{room.building} • Floor {room.floor}</span>
                </div>
              </button>
              
              <div class="quick-actions">
                <button on:click={() => setAsStart(room.id)} title="Set as Start" class="quick-action-btn">
                  <i class="ph-bold ph-map-pin"></i>
                </button>
                <button on:click={() => setAsEnd(room.id)} title="Set as Destination" class="quick-action-btn">
                  <i class="ph-bold ph-flag-flagpole"></i>
                </button>
              </div>
            </li>
          {/each}
        </ul>
      </section>
    </aside>

    <!-- Map Canvas & Interactive Overlays -->
    <section class="map-wrapper-panel">
      <!-- Floor Selector -->
      <div class="floor-selector glass">
        <span class="floor-label">Floor</span>
        <button class:active={activeFloor === 2} on:click={() => activeFloor = 2}>2</button>
        <button class:active={activeFloor === 1} on:click={() => activeFloor = 1}>1</button>
        <button class:active={activeFloor === 0} on:click={() => activeFloor = 0}>G</button>
        <button class:active={activeFloor === -1} on:click={() => activeFloor = -1}>S</button>
      </div>

      {#if browser}
        <MapOverlay 
          bind:activeFloor={activeFloor}
          bind:selectedRoomId={selectedRoomId}
          bind:startRoomId={startRoomId}
          bind:endRoomId={endRoomId}
          activeRoute={activeRoute}
        />
      {:else}
        <div class="map-placeholder">
          <div class="spinner"></div>
          <span>Loading interactive map...</span>
        </div>
      {/if}
    </section>
  </main>
</div>

<style>
  .map-page-container {
    width: 100%;
    height: 100vh;
    background: var(--bg-primary, #0b0f19);
    color: var(--text-color, #e2e8f0);
    overflow: hidden;
  }

  .wayfinding-grid {
    display: grid;
    grid-template-columns: 380px 1fr;
    height: 100%;
    width: 100%;
  }

  /* Control Panel / Sidebar styling */
  .control-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md, 16px);
    background: var(--glass-bg-light, rgba(255, 255, 255, 0.03));
    backdrop-filter: var(--glass-blur, blur(12px));
    border-right: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
    padding: var(--spacing-md, 16px);
    overflow-y: auto;
    height: 100%;
    box-sizing: border-box;
  }

  .panel-header {
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 12px;
  }

  .header-main {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .title-icon {
    font-size: 1.5rem;
    color: var(--primary-color, #00f2fe);
  }

  .panel-header h1 {
    font-size: 1.35rem;
    font-weight: 800;
    margin: 0;
  }

  .panel-subtitle {
    font-size: 0.78rem;
    color: var(--text-color-secondary, #94a3b8);
    margin: 4px 0 0 0;
  }

  .section-title {
    font-size: 0.85rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--primary-color, #00f2fe);
    margin: 0 0 10px 0;
  }

  /* Input fields styling */
  .input-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .input-group label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-color, #e2e8f0);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .dot-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
  }

  .dot-indicator.green { background: #22c55e; }
  .dot-indicator.red { background: #ef4444; }

  .select-wrapper {
    position: relative;
    width: 100%;
  }

  select {
    width: 100%;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    color: white;
    font-size: 0.88rem;
    appearance: none;
    cursor: pointer;
    box-sizing: border-box;
  }

  .select-wrapper::after {
    content: "▼";
    font-size: 0.6rem;
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.5);
    pointer-events: none;
  }

  .action-row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  .action-btn {
    padding: 6px 12px;
    font-size: 0.78rem;
    font-weight: 700;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    color: #cbd5e1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s;
  }

  .action-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Slider switch styling */
  .accessibility-switch {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-size: 0.8rem;
    user-select: none;
    margin-top: 4px;
  }

  .accessibility-switch input {
    display: none;
  }

  .slider {
    position: relative;
    width: 32px;
    height: 18px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 99px;
    transition: 0.3s;
    flex-shrink: 0;
  }

  .slider::before {
    content: "";
    position: absolute;
    height: 14px;
    width: 14px;
    left: 2px;
    bottom: 2px;
    background: white;
    border-radius: 50%;
    transition: 0.3s;
  }

  input:checked + .slider {
    background: var(--primary-color, #00f2fe);
  }

  input:checked + .slider::before {
    transform: translateX(14px);
  }

  .switch-label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #94a3b8;
  }

  input:checked ~ .switch-label {
    color: white;
  }

  /* Directions block styling */
  .directions-section {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 12px;
  }

  .directions-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .directions-header h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 700;
  }

  .distance-badge {
    background: rgba(0, 242, 254, 0.15);
    color: #00f2fe;
    font-size: 0.75rem;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 99px;
  }

  .steps-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;
  }

  .step-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 0.8rem;
    line-height: 1.4;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  .step-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .step-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .green-text { color: #22c55e; }
  .red-text { color: #ef4444; }
  .purple-text { color: #a855f7; }
  .orange-text { color: #f97316; }

  /* Directory & Search styles (No box shadow as per global rules) */
  .directory-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 220px;
  }

  .directory-filters {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }

  .search-wrap {
    position: relative;
    width: 100%;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.4);
    font-size: 1rem;
  }

  .flat-search {
    width: 100%;
    padding: 10px 14px 10px 36px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    color: white;
    font-size: 0.85rem;
    box-sizing: border-box;
  }

  .directory-results {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    flex: 1;
    max-height: 280px;
  }

  .directory-item {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    overflow: hidden;
    transition: all 0.2s;
  }

  .directory-item:hover,
  .directory-item.selected {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(0, 242, 254, 0.4);
  }

  .room-selector-btn {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    background: transparent;
    border: none;
    padding: 8px 12px;
    color: white;
    cursor: pointer;
    text-align: left;
  }

  .room-id {
    font-size: 0.72rem;
    font-weight: 800;
    padding: 3px 6px;
    border-radius: 6px;
    color: white;
    min-width: 48px;
    text-align: center;
  }

  /* Room categories colors */
  .room-id.seminar { background: #3b82f6; }
  .room-id.lab { background: #a855f7; }
  .room-id.office { background: #eab308; }
  .room-id.social { background: #ec4899; }
  .room-id.service { background: #f97316; }
  .room-id.other { background: #64748b; }

  .room-meta {
    display: flex;
    flex-direction: column;
  }

  .room-name {
    font-size: 0.85rem;
    font-weight: 700;
  }

  .room-building-text {
    font-size: 0.7rem;
    color: #94a3b8;
  }

  .quick-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    padding-right: 8px;
  }

  .quick-action-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    padding: 6px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .quick-action-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  /* Map Panel / Canvas */
  .map-wrapper-panel {
    position: relative;
    width: 100%;
    height: 100%;
  }

  /* Floor Selector styles (No box shadow, frosted backdrop border) */
  .floor-selector {
    position: absolute;
    right: 20px;
    bottom: 30px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 6px;
    gap: 4px;
  }

  .floor-label {
    font-size: 0.6rem;
    font-weight: 800;
    text-transform: uppercase;
    text-align: center;
    color: #64748b;
    padding-bottom: 2px;
  }

  .floor-selector button {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    color: #94a3b8;
    font-weight: 700;
    font-size: 0.88rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .floor-selector button:hover {
    background: rgba(255, 255, 255, 0.05);
    color: white;
  }

  .floor-selector button.active {
    background: var(--primary-color, #00f2fe);
    border-color: var(--primary-color, #00f2fe);
    color: #0f172a;
  }

  .map-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #0f172a;
    gap: 12px;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--primary-color, #00f2fe);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .wayfinding-grid {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
    }

    .control-panel {
      height: 320px;
      border-right: none;
      border-bottom: 1px solid var(--glass-border);
    }
  }
</style>
