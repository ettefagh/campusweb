<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { EmbedPDF } from "@embedpdf/core/svelte";
  import { createPdfiumEngine } from "@embedpdf/engines/pdfium-worker-engine";
  import { DocumentManagerPlugin, DocumentManagerPluginPackage } from "@embedpdf/plugin-document-manager";
  import { RenderLayer } from "@embedpdf/plugin-render/svelte";
  import { RenderPluginPackage } from "@embedpdf/plugin-render";
  import { Viewport } from "@embedpdf/plugin-viewport/svelte";
  import { ViewportPluginPackage } from "@embedpdf/plugin-viewport";
  import pdfiumWasmUrl from "@embedpdf/pdfium/pdfium.wasm?url";
  import type { PluginRegistry } from "@embedpdf/core";
  import railmapIndex from "$lib/data/berlinRailmapStations.json";

  type RailmapLabel = {
    id: string;
    text: string;
    normalizedText: string;
    searchKey: string;
    x: number;
    y: number;
    width: number;
    height: number;
    size: number;
    centerX: number;
    centerY: number;
    score?: number;
  };

  const railmapPdfUrl = "/Documents/berlin-railmap.pdf";
  const railmapDocumentId = "berlin-railmap";
  const pageWidth = railmapIndex.pageWidth as number;
  const pageHeight = railmapIndex.pageHeight as number;
  const minScale = 0.16;
  const maxScale = 8;
  const zoomStep = 1.25;
  const visibleLimit = 42;

  function normalizeText(value: string) {
    return value
      .toLowerCase()
      .replaceAll("ß", "ss")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function aliasText(value: string) {
    return value
      .replace(/\bhbf\b/g, "hauptbahnhof")
      .replace(/\bhauptbahnhof\b/g, "hbf")
      .replace(/\bbhf\b/g, "bahnhof");
  }

  function buildSearchKey(value: string) {
    const normalized = normalizeText(value);
    const aliases = aliasText(normalized);
    return `${normalized} ${aliases}`.trim();
  }

  function scoreLabel(label: RailmapLabel, query: string) {
    const key = label.searchKey;
    if (key === query) return 0;
    if (key.startsWith(query)) return 1;
    if (key.includes(query)) return 2;

    const queryParts = query.split(" ").filter(Boolean);
    if (queryParts.length > 0 && queryParts.every((part) => key.includes(part))) {
      return 3 + queryParts.length * 0.05;
    }

    return Number.POSITIVE_INFINITY;
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  const labels: RailmapLabel[] = (railmapIndex.items as Array<{
    text: string;
    normalizedText: string;
    x: number;
    y: number;
    width: number;
    height: number;
    size: number;
  }>)
    .map((item, index) => {
      const normalizedText = item.normalizedText || normalizeText(item.text);
      return {
        id: `label-${index}`,
        text: item.text,
        normalizedText,
        searchKey: buildSearchKey(item.text),
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        size: item.size,
        centerX: item.x + item.width / 2,
        centerY: item.y + item.height / 2
      };
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const featuredLabels = [...labels]
    .sort((a, b) => b.size - a.size || a.y - b.y || a.x - b.x)
    .slice(0, 18);

  let engine = $state<Awaited<ReturnType<typeof createPdfiumEngine>> | null>(null);
  let documentId = $state("");
  let loadError = $state("");
  let loadState = $state("Preparing viewer");
  let documentReady = $state(false);
  let query = $state("");
  let activeLabelId = $state("");
  let activeLabel = $state<RailmapLabel | null>(null);
  let viewportWidth = $state(0);
  let viewportHeight = $state(0);
  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let focusMode = $state<"page" | "result" | "manual">("page");
  let dragState = $state<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);
  let activePointers = $state<PointerEvent[]>([]);
  let initialPinchDistance = $state<number | null>(null);
  let initialPinchScale = $state<number | null>(null);
  let initialPinchDoc = $state<{x: number, y: number} | null>(null);
  let viewportElement = $state<HTMLDivElement | null>(null);
  let isSidebarOpen = $state(false);

  let fitScale = $derived(viewportWidth > 0 ? viewportWidth / pageWidth : 1);
  let scale = $derived(clamp(fitScale * zoom, minScale, maxScale));
  let currentQuery = $derived(normalizeText(query));
  let searchResults = $derived((currentQuery ? labels : featuredLabels)
    .map((label) => ({
      ...label,
      score: currentQuery ? scoreLabel(label, buildSearchKey(currentQuery)) : 0
    }))
    .filter((label) => (currentQuery ? Number.isFinite(label.score ?? Number.POSITIVE_INFINITY) : true))
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0) || a.y - b.y || a.x - b.x)
    .slice(0, visibleLimit));
  let resultCount = $derived(currentQuery ? searchResults.length : labels.length);
  $effect(() => {
    if (focusMode === "page" && viewportWidth > 0 && viewportHeight > 0) {
      panX = Math.round((viewportWidth - pageWidth * scale) / 2);
      panY = Math.round((viewportHeight - pageHeight * scale) / 2);
    }
  });
  $effect(() => {
    if (focusMode === "result" && activeLabel && viewportWidth > 0 && viewportHeight > 0) {
      panX = Math.round(viewportWidth / 2 - activeLabel.centerX * scale);
      panY = Math.round(viewportHeight / 2 - activeLabel.centerY * scale);
    }
  });

  function updateScale(nextScale: number, anchor?: { x: number; y: number; screenX: number; screenY: number }) {
    const clampedScale = clamp(nextScale, minScale, maxScale);
    const currentScale = scale || 1;
    const reference =
      anchor ??
      ({
        x: (viewportWidth / 2 - panX) / currentScale,
        y: (viewportHeight / 2 - panY) / currentScale,
        screenX: viewportWidth / 2,
        screenY: viewportHeight / 2
      } as const);

    zoom = clampedScale / fitScale;
    panX = Math.round(reference.screenX - reference.x * clampedScale);
    panY = Math.round(reference.screenY - reference.y * clampedScale);
  }

  function resetView() {
    focusMode = "page";
    updateScale(fitScale, {
      x: pageWidth / 2,
      y: pageHeight / 2,
      screenX: viewportWidth / 2,
      screenY: viewportHeight / 2
    });
  }

  function zoomIn() {
    if (activeLabel && focusMode === "result") {
      updateScale(scale * zoomStep, {
        x: activeLabel.centerX,
        y: activeLabel.centerY,
        screenX: viewportWidth / 2,
        screenY: viewportHeight / 2
      });
      return;
    }

    updateScale(scale * zoomStep);
    focusMode = "manual";
  }

  function zoomOut() {
    if (activeLabel && focusMode === "result") {
      updateScale(scale / zoomStep, {
        x: activeLabel.centerX,
        y: activeLabel.centerY,
        screenX: viewportWidth / 2,
        screenY: viewportHeight / 2
      });
      return;
    }

    updateScale(scale / zoomStep);
    focusMode = "manual";
  }

  function selectLabel(label: RailmapLabel) {
    activeLabel = label;
    activeLabelId = label.id;
    focusMode = "result";

    const nextScale = clamp(
      Math.max(
        fitScale * 1.6,
        Math.min((viewportWidth * 0.34) / Math.max(label.width, 1), (viewportHeight * 0.26) / Math.max(label.height, 1))
      ),
      minScale,
      maxScale
    );

    updateScale(nextScale, {
      x: label.centerX,
      y: label.centerY,
      screenX: viewportWidth / 2,
      screenY: viewportHeight / 2
    });
    
    // Auto-close sidebar after selecting a station
    isSidebarOpen = false;
  }

  function clearSearch() {
    query = "";
    activeLabel = null;
    activeLabelId = "";
    resetView();
  }

  function handleViewportPointerDown(event: PointerEvent) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const index = activePointers.findIndex(p => p.pointerId === event.pointerId);
    if (index !== -1) activePointers[index] = event;
    else activePointers.push(event);

    focusMode = "manual";
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

    if (activePointers.length === 1) {
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        panX,
        panY
      };
    } else if (activePointers.length === 2) {
      dragState = null;
      const p1 = activePointers[0];
      const p2 = activePointers[1];
      initialPinchDistance = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
      initialPinchScale = scale;
      
      const centerX = (p1.clientX + p2.clientX) / 2;
      const centerY = (p1.clientY + p2.clientY) / 2;
      
      const rect = viewportElement?.getBoundingClientRect();
      const screenX = centerX - (rect?.left || 0);
      const screenY = centerY - (rect?.top || 0);
      
      initialPinchDoc = {
        x: (screenX - panX) / scale,
        y: (screenY - panY) / scale
      };
    }
  }

  function handleViewportPointerMove(event: PointerEvent) {
    const index = activePointers.findIndex(p => p.pointerId === event.pointerId);
    if (index !== -1) {
      activePointers[index] = event;
    }

    if (activePointers.length === 1 && dragState && dragState.pointerId === event.pointerId) {
      panX = Math.round(dragState.panX + (event.clientX - dragState.startX));
      panY = Math.round(dragState.panY + (event.clientY - dragState.startY));
    } else if (activePointers.length === 2 && initialPinchDistance && initialPinchScale && initialPinchDoc) {
      const p1 = activePointers[0];
      const p2 = activePointers[1];
      const currentDistance = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
      const centerX = (p1.clientX + p2.clientX) / 2;
      const centerY = (p1.clientY + p2.clientY) / 2;
      
      const nextScale = initialPinchScale * (currentDistance / initialPinchDistance);
      const rect = viewportElement?.getBoundingClientRect();
      const screenX = centerX - (rect?.left || 0);
      const screenY = centerY - (rect?.top || 0);
      
      updateScale(nextScale, {
        x: initialPinchDoc.x,
        y: initialPinchDoc.y,
        screenX,
        screenY
      });
    }
  }

  function endDrag(event: PointerEvent) {
    activePointers = activePointers.filter(p => p.pointerId !== event.pointerId);
    
    if (activePointers.length === 1) {
      const p = activePointers[0];
      dragState = {
        pointerId: p.pointerId,
        startX: p.clientX,
        startY: p.clientY,
        panX,
        panY
      };
      initialPinchDistance = null;
      initialPinchDoc = null;
    } else if (activePointers.length === 0) {
      dragState = null;
      initialPinchDistance = null;
      initialPinchDoc = null;
    }
  }

  async function initializeViewer(registry: PluginRegistry) {
    loadState = "Opening Berlin rail map";
    documentReady = false;

    const managerPlugin = registry.getPlugin(DocumentManagerPlugin.id);
    const manager = managerPlugin?.provides?.();

    if (!manager) {
      loadError = "EmbedPDF document manager is unavailable.";
      loadState = "Ready";
      return;
    }

    try {
      const unsubscribe = manager.onDocumentOpened((state: { id: string; status?: string }) => {
        if (state.id === railmapDocumentId && state.status === "loaded") {
          documentId = state.id;
          documentReady = true;
          loadState = "Map ready";
          unsubscribe();
        }
      });

      const task = manager.openDocumentUrl({
        url: railmapPdfUrl,
        documentId: railmapDocumentId,
        name: "Berlin rail map",
        mode: "full-fetch",
        autoActivate: true,
        scale: 1
      });

      const result = await task.toPromise();
      documentId = result.documentId;
    } catch (error) {
      console.error(error);
      loadError = "Failed to open the Berlin rail map PDF.";
      loadState = "Ready";
    }
  }

  onMount(async () => {
    try {
      loadState = "Loading EmbedPDF engine";
      engine = await createPdfiumEngine(pdfiumWasmUrl, {
        encoderPoolSize: 1
      });
      loadState = "Engine ready";
    } catch (error) {
      console.error(error);
      loadError = "Failed to initialize the PDF engine.";
      loadState = "Ready";
    }
  });
</script>

<svelte:head>
  <title>Berlin Railmap</title>
</svelte:head>

<div class="page-shell">
  <header class="topbar">
    <button class="back-button" type="button" on:click={() => goto("/explore")} aria-label="Back">
      <i class="ph ph-arrow-left" aria-hidden="true"></i>
    </button>

    <div class="heading">
      <p class="eyebrow">Berlin rail map</p>
      <h1>Search the map like a canvas</h1>
      <p class="subline">Search runs against the precomputed coordinate index. Click a result to jump to the exact label.</p>
    </div>

    <div class="status-chip" aria-live="polite">{loadError || loadState}</div>
  </header>

  <div class="workspace" class:sidebar-closed={!isSidebarOpen}>
    <aside class="sidebar glass" aria-hidden={!isSidebarOpen}>
      <div class="sidebar-actions">
        {#if query}
          <button class="ghost-button" type="button" on:click={clearSearch}>Clear</button>
        {/if}
        <button class="ghost-button" type="button" on:click={resetView}>Reset view</button>
      </div>

      <section class="results-section">
        <div class="section-head">
          <h2>{currentQuery ? "Matches" : "Featured labels"}</h2>
          <span>{currentQuery ? `${resultCount} shown` : `${labels.length} indexed`}</span>
        </div>

        <div class="results-list" role="list" aria-label="Search results">
          {#if searchResults.length === 0}
            <div class="empty-state">
              No labels match <strong>{query}</strong>.
            </div>
          {:else}
            {#each searchResults as label}
              <button
                class:active={activeLabelId === label.id}
                class="result-item"
                type="button"
                on:click={() => selectLabel(label)}
              >
                <span class="result-title">{label.text}</span>
                <span class="result-meta">
                  <span>{label.x.toFixed(0)}, {label.y.toFixed(0)}</span>
                  <span>{label.width.toFixed(0)}×{label.height.toFixed(0)}</span>
                </span>
              </button>
            {/each}
          {/if}
        </div>
      </section>

      <section class="controls">
        <button class="control-button" type="button" on:click={zoomOut} aria-label="Zoom out">
          <i class="ph ph-magnifying-glass-minus" aria-hidden="true"></i>
        </button>
        <button class="control-button" type="button" on:click={zoomIn} aria-label="Zoom in">
          <i class="ph ph-magnifying-glass-plus" aria-hidden="true"></i>
        </button>
        <button class="control-button wide" type="button" on:click={resetView}>Reset</button>
      </section>
    </aside>

    <section class="viewer glass" aria-label="Berlin rail map viewer">
      <div class="map-overlay-top">
        <button class="map-fab" on:click={() => isSidebarOpen = !isSidebarOpen} aria-label="Toggle stations list">
          <i class={isSidebarOpen ? "ph-bold ph-x" : "ph-bold ph-list"} aria-hidden="true"></i>
        </button>
        
        <label class="search-field map-search glass">
          <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
          <input
            bind:value={query}
            type="search"
            placeholder="Search a station"
            autocomplete="off"
            spellcheck="false"
          />
        </label>
      </div>

      {#if loadError}
        <div class="error-card">
          <h2>Viewer unavailable</h2>
          <p>{loadError}</p>
        </div>
      {:else if !engine}
        <div class="loading-card">
          <div class="spinner" aria-hidden="true"></div>
          <p>{loadState}</p>
        </div>
      {:else}
        <EmbedPDF
          {engine}
          plugins={[
            { package: DocumentManagerPluginPackage },
            { package: RenderPluginPackage },
            { package: ViewportPluginPackage } as any
          ] as any}
          autoMountDomElements={true}
          onInitialized={initializeViewer}
        >
          {#snippet children(context)}
            {#if documentReady && documentId}
              <Viewport documentId={documentId}>
                <div
                  class="viewport"
                  bind:this={viewportElement}
                  bind:clientWidth={viewportWidth}
                  bind:clientHeight={viewportHeight}
                  role="application"
                  aria-label="Rail map canvas"
                  on:pointerdown={handleViewportPointerDown}
                  on:pointermove={handleViewportPointerMove}
                  on:pointerup={endDrag}
                  on:pointercancel={endDrag}
                  on:pointerleave={endDrag}
                  style={`cursor: ${dragState ? "grabbing" : "grab"};`}
                >
                  <div
                    class="stage"
                    style={`width:${pageWidth}px;height:${pageHeight}px;transform:translate3d(${panX}px, ${panY}px, 0) scale(${scale});`}
                  >
                    {#if viewportWidth > 0}
                      <RenderLayer
                        documentId={documentId}
                        pageIndex={0}
                        scale={scale}
                        draggable="false"
                      />
                    {/if}

                    {#if activeLabel}
                      <div
                        class="result-highlight"
                        style={`left:${activeLabel.x}px;top:${activeLabel.y}px;width:${activeLabel.width}px;height:${activeLabel.height}px;`}
                      ></div>
                    {/if}

                    {#each searchResults as label}
                      <button
                        class:active={activeLabelId === label.id}
                        class="hotspot"
                        type="button"
                        aria-label={`Jump to ${label.text}`}
                        title={`Jump to ${label.text}`}
                        style={`left:${label.x}px;top:${label.y}px;width:${Math.max(label.width, 18)}px;height:${Math.max(label.height, 18)}px;`}
                        on:pointerdown|stopPropagation
                        on:click|stopPropagation={() => selectLabel(label)}
                      >
                        <span class="hotspot-dot"></span>
                      </button>
                    {/each}
                  </div>
                </div>
              </Viewport>
            {:else}
              <div class="loading-card">
                <div class="spinner" aria-hidden="true"></div>
                <p>{loadError || loadState}</p>
              </div>
            {/if}
          {/snippet}
        </EmbedPDF>
      {/if}
    </section>
  </div>
</div>

<style>
  .page-shell {
    min-height: calc(100dvh - 78px);
    padding: clamp(0.9rem, 2.2vw, 1.5rem);
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 0.9rem;
    background:
      radial-gradient(circle at 15% 0%, rgba(224, 58, 4, 0.14), transparent 34rem),
      radial-gradient(circle at 100% 10%, rgba(38, 99, 235, 0.14), transparent 30rem),
      linear-gradient(180deg, #f7f8fb 0%, #f4f6fa 100%);
    color: #10213a;
  }

  .topbar {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.85rem;
    align-items: center;
    padding: 0.95rem;
    border-radius: 1.4rem;
  }

  .glass {
    background: color-mix(in srgb, white 84%, transparent);
    border: 1px solid color-mix(in srgb, #d6dae3 80%, transparent);
    box-shadow: 0 1.1rem 2.8rem rgba(15, 23, 42, 0.08);
    backdrop-filter: blur(18px);
  }

  .back-button,
  .ghost-button,
  .control-button {
    border: 1px solid color-mix(in srgb, #d6dae3 82%, transparent);
    background: white;
    color: #10213a;
    cursor: pointer;
    font: inherit;
  }

  .back-button {
    width: 3rem;
    height: 3rem;
    border-radius: 999px;
    display: grid;
    place-items: center;
    font-size: 1.3rem;
  }

  .heading {
    min-width: 0;
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.72rem;
    color: #6b7280;
    font-weight: 700;
  }

  h1 {
    margin: 0.18rem 0 0;
    font-size: clamp(1.3rem, 2vw, 1.9rem);
    line-height: 1.1;
    letter-spacing: -0.05em;
  }

  .subline {
    margin: 0.3rem 0 0;
    color: #5c6677;
    max-width: 66ch;
  }

  .status-chip {
    min-height: 2.75rem;
    padding: 0 1rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, #d6dae3 82%, transparent);
    background: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.92rem;
    color: #475569;
    white-space: nowrap;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(18rem, 22rem) minmax(0, 1fr);
    gap: 0.9rem;
    min-height: 0;
    transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .workspace.sidebar-closed {
    grid-template-columns: 0px minmax(0, 1fr);
  }

  .sidebar,
  .viewer {
    border-radius: 1.4rem;
    min-height: 0;
  }

  .sidebar {
    padding: 0.95rem;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 0.85rem;
    overflow: hidden;
    opacity: 1;
    transition: opacity 0.3s ease, padding 0.3s ease;
  }

  .workspace.sidebar-closed .sidebar {
    opacity: 0;
    padding: 0;
    pointer-events: none;
  }

  .search-field {
    min-height: 3rem;
    border-radius: 999px;
    padding: 0 1rem;
    display: flex;
    align-items: center;
    gap: 0.7rem;
    border: 1px solid color-mix(in srgb, #d6dae3 82%, transparent);
    background: #fff;
  }

  .search-field i {
    color: #64748b;
    font-size: 1.2rem;
  }

  .search-field input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: #10213a;
    font: inherit;
    font-size: 1rem;
  }

  .sidebar-actions {
    display: flex;
    gap: 0.55rem;
    flex-wrap: wrap;
  }

  .ghost-button {
    min-height: 2.6rem;
    padding: 0 0.95rem;
    border-radius: 999px;
    color: #334155;
  }

  .results-section {
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 0.7rem;
  }

  .section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .section-head h2 {
    margin: 0;
    font-size: 1rem;
  }

  .section-head span {
    color: #64748b;
    font-size: 0.9rem;
  }

  .results-list {
    min-height: 0;
    overflow: auto;
    display: grid;
    gap: 0.5rem;
    padding-right: 0.1rem;
  }

  .result-item {
    text-align: left;
    border-radius: 1rem;
    border: 1px solid color-mix(in srgb, #d6dae3 80%, transparent);
    background: #fff;
    padding: 0.85rem 0.9rem;
    display: grid;
    gap: 0.4rem;
    cursor: pointer;
    transition:
      transform 120ms ease,
      border-color 120ms ease,
      box-shadow 120ms ease,
      background 120ms ease;
  }

  .result-item:hover,
  .result-item.active {
    transform: translateY(-1px);
    border-color: rgba(224, 58, 4, 0.35);
    box-shadow: 0 0.9rem 1.8rem rgba(15, 23, 42, 0.08);
  }

  .result-item.active {
    background: linear-gradient(180deg, #fff 0%, #fff8f5 100%);
  }

  .result-title {
    font-weight: 700;
    color: #10213a;
  }

  .result-meta {
    display: flex;
    gap: 0.55rem;
    flex-wrap: wrap;
    color: #64748b;
    font-size: 0.86rem;
  }

  .empty-state {
    padding: 1rem;
    border-radius: 1rem;
    border: 1px dashed color-mix(in srgb, #d6dae3 82%, transparent);
    color: #64748b;
    background: #fff;
  }

  .controls {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .control-button {
    min-height: 2.8rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
  }

  .control-button.wide {
    font-weight: 700;
  }

  .viewer {
    min-height: 0;
    overflow: hidden;
    position: relative;
  }
  
  .viewport {
    touch-action: none;
  }

  .map-overlay-top {
    position: absolute;
    top: 1rem;
    left: 1rem;
    right: 1rem;
    z-index: 10;
    display: flex;
    gap: 0.8rem;
    pointer-events: none;
  }

  .map-fab, .map-search {
    pointer-events: auto;
  }

  .map-fab {
    flex-shrink: 0;
    width: 3rem;
    height: 3rem;
    border-radius: 999px;
    background: white;
    border: 1px solid color-mix(in srgb, #d6dae3 82%, transparent);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
    display: grid;
    place-items: center;
    font-size: 1.3rem;
    color: #10213a;
    cursor: pointer;
    transition: transform 0.2s ease, background 0.2s ease;
  }
  
  .map-search {
    flex-grow: 1;
    max-width: 24rem;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
  }
  
  .map-fab:active {
    transform: scale(0.95);
    background: #f7f8fb;
  }

  .loading-card,
  .error-card {
    min-height: 100%;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    text-align: center;
    color: #475569;
  }

  .error-card h2,
  .loading-card p {
    margin: 0;
  }

  .loading-card {
    gap: 0.8rem;
  }

  .spinner {
    width: 1.3rem;
    height: 1.3rem;
    border-radius: 50%;
    border: 2px solid rgba(100, 116, 139, 0.2);
    border-top-color: rgba(224, 58, 4, 0.9);
    animation: spin 0.8s linear infinite;
  }

  .viewport {
    position: absolute;
    inset: 0;
    overflow: hidden;
    touch-action: none;
    user-select: none;
  }

  .stage {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
    will-change: transform;
  }

  .result-highlight {
    position: absolute;
    border: 2px solid rgba(224, 58, 4, 0.92);
    border-radius: 0.3rem;
    background: rgba(224, 58, 4, 0.14);
    box-shadow:
      0 0 0 3px rgba(255, 255, 255, 0.8),
      0 0 0 6px rgba(224, 58, 4, 0.08);
    pointer-events: none;
  }

  .hotspot {
    position: absolute;
    border: 0;
    background: transparent;
    padding: 0;
    cursor: pointer;
    pointer-events: auto;
  }

  .hotspot-dot {
    position: absolute;
    left: 50%;
    top: 50%;
    display: block;
    width: 8px;
    height: 8px;
    background: rgba(224, 58, 4, 0.9);
    border-radius: 50%;
    margin: auto;
    box-shadow: 0 0 0 2px white;
    opacity: 0;
    transition: opacity 120ms;
  }

  .hotspot:hover .hotspot-dot,
  .hotspot.active .hotspot-dot {
    opacity: 1;
  }
  
  @media (max-width: 768px) {
    .workspace {
      grid-template-columns: 1fr;
      grid-template-rows: minmax(0, 1fr);
    }
    
    .sidebar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60vh;
      z-index: 20;
      border-radius: 1.4rem 1.4rem 0 0;
      transform: translateY(0);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(24px);
    }
    
    .workspace.sidebar-closed .sidebar {
      transform: translateY(110%);
      opacity: 1; 
      padding: 0.95rem; 
      pointer-events: none;
    }
    
    .workspace.sidebar-closed {
      grid-template-columns: 1fr;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 980px) {
    .page-shell {
      min-height: calc(100dvh - 72px);
      padding: 0.8rem;
    }

    .topbar {
      grid-template-columns: 1fr auto;
      align-items: start;
    }

    .status-chip {
      grid-column: 1 / -1;
      justify-self: start;
    }

    .workspace {
      grid-template-columns: 1fr;
    }

    .sidebar {
      grid-template-rows: auto auto auto auto;
    }

    .viewer {
      min-height: 60dvh;
    }
  }

  @media (max-width: 560px) {
    .topbar {
      padding: 0.8rem;
      gap: 0.65rem;
    }

    .heading h1 {
      font-size: 1.2rem;
    }

    .subline {
      font-size: 0.95rem;
    }

    .controls {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .controls .wide {
      grid-column: 1 / -1;
    }
  }
</style>
