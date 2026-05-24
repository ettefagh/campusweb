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

  // ── Types ──────────────────────────────────────────────────────────
  type StationType = "hub" | "interchange" | "station";
  type Zone = "A" | "B" | "C";

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
    zone: Zone;
    type: StationType;
    lines: string[];
    score?: number;
  };

  // ── Transit line map (major interchange stations) ──────────────────
  const LINE_MAP: Record<string, string[]> = {
    "hauptbahnhof": ["S3","S5","S7","S9","U5"],
    "alexanderplatz": ["S3","S5","S7","S9","U2","U5","U8"],
    "friedrichstrasse": ["S1","S2","S25","S3","S5","S7","S9","U6"],
    "potsdamer platz": ["S1","S2","S25","U2"],
    "zoologischer garten": ["S3","S5","S7","S9","U2","U9"],
    "ostkreuz": ["S3","S5","S7","S9","S41","S42"],
    "westkreuz": ["S3","S5","S7","S9","S41","S42"],
    "sudkreuz": ["S2","S25","S41","S42"],
    "gesundbrunnen": ["S1","S2","S25","S41","S42","U8"],
    "ostbahnhof": ["S3","S5","S7","S9"],
    "warschauer strasse": ["S3","S5","S7","S9","U1","U3"],
    "jannowitzbrucke": ["S3","S5","S7","S9","U8"],
    "hackescher markt": ["S3","S5","S7","S9"],
    "brandenburger tor": ["S1","S2","S25","U5"],
    "yorckstrasse": ["S1","S2","S25","U7"],
    "hermannstrasse": ["S41","S42","U8"],
    "neukolln": ["S41","S42","U7"],
    "tempelhof": ["S41","S42","U6"],
    "schonhauser allee": ["S41","S42","U2"],
    "pankow": ["S2","S8","U2"],
    "wedding": ["S41","S42","U6"],
    "spandau": ["S3","S9"],
    "wannsee": ["S1","S7"],
    "oranienburg": ["S1"],
    "bernau": ["S2"],
    "lichtenberg": ["S3","S5","S7","U5"],
    "frankfurter allee": ["S41","S42","U5"],
    "nollendorfplatz": ["U1","U2","U3","U4"],
    "wittenbergplatz": ["U1","U2","U3"],
    "gleisdreieck": ["U1","U2"],
    "mehringdamm": ["U6","U7"],
    "stadtmitte": ["U2","U6"],
    "kottbusser tor": ["U1","U8"],
    "leopoldplatz": ["U6","U9"],
    "charlottenburg": ["S3","S5","S7","S9"],
    "bornholmer strasse": ["S1","S2","S25","S8"],
    "treptower park": ["S41","S42","S8","S9"],
    "wittenau": ["S1","U8"],
    "tegel": ["U6"],
    "alt-tegel": ["U6"],
  };

  // ── Config ─────────────────────────────────────────────────────────
  const railmapPdfUrl = "/Documents/berlin-railmap.pdf";
  const railmapDocumentId = "berlin-railmap";
  const pageWidth = railmapIndex.pageWidth as number;
  const pageHeight = railmapIndex.pageHeight as number;
  const PAGE_HEIGHT = pageHeight;
  const CENTER_Y = PAGE_HEIGHT * 0.47;
  const minScale = 0.16;
  const maxScale = 8;
  const zoomStep = 1.25;
  const visibleLimit = 48;

  // ── Text helpers ───────────────────────────────────────────────────
  function normalizeText(value: string) {
    return value
      .toLowerCase()
      .replaceAll("ß", "ss")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s\-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function buildSearchKey(value: string) {
    const n = normalizeText(value);
    const aliases = n.replace(/\bhbf\b/g, "hauptbahnhof").replace(/\bhauptbahnhof\b/g, "hbf").replace(/\bbhf\b/g, "bahnhof");
    return `${n} ${aliases}`.trim();
  }

  function inferZone(y: number): Zone {
    const dist = Math.abs(y - CENTER_Y) / PAGE_HEIGHT;
    if (dist < 0.14) return "A";
    if (dist < 0.30) return "B";
    return "C";
  }

  function inferType(lines: string[]): StationType {
    if (lines.length >= 4) return "hub";
    if (lines.length >= 1) return "interchange";
    return "station";
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function isStation(text: string, size: number): boolean {
    const l = text.toLowerCase();
    if (l.startsWith("richtung")) return false;
    if (text.length <= 2) return false;
    if (l === "hbf" && size === 42) return false;
    if (l === "und schwedt" || l === "(barnim)" || l === "(nordb)") return false;
    if (l === "west" || l === "friedenstal" || l === "nervenklinik") return false;
    if (l === "alt-" || l === "bernau-" || l === "hohen" || l === "neuendorf") return false;
    return true;
  }

  function scoreLabel(label: RailmapLabel, query: string) {
    const key = label.searchKey;
    if (key === query) return 0;
    if (key.startsWith(query)) return 1;
    if (key.includes(query)) return 2;
    const parts = query.split(" ").filter(Boolean);
    if (parts.length > 0 && parts.every((p) => key.includes(p))) return 3;
    if (label.lines.some((l) => l.toLowerCase().includes(query))) return 4;
    return Number.POSITIVE_INFINITY;
  }

  // ── Build enriched label list ──────────────────────────────────────
  const labels: RailmapLabel[] = (railmapIndex.items as Array<{
    text: string; normalizedText: string;
    x: number; y: number; width: number; height: number; size: number;
  }>)
    .filter((item) => isStation(item.text, item.size))
    .map((item, index) => {
      const normalizedText = item.normalizedText || normalizeText(item.text);
      const searchKey = buildSearchKey(item.text);
      const lines = LINE_MAP[normalizeText(item.text)] || [];
      const zone = inferZone(item.y);
      const type = inferType(lines);
      return {
        id: `label-${index}`,
        text: item.text,
        normalizedText,
        searchKey,
        x: item.x, y: item.y,
        width: item.width, height: item.height,
        size: item.size,
        centerX: item.x + item.width / 2,
        centerY: item.y + item.height / 2,
        zone, type, lines,
      };
    })
    .sort((a, b) => a.text.localeCompare(b.text, "de"));

  const featuredLabels = [...labels]
    .sort((a, b) => b.lines.length - a.lines.length || b.size - a.size)
    .slice(0, 24);

  // ── Suggestion chips ───────────────────────────────────────────────
  const CHIPS = [
    { label: "Hubs", zone: null as Zone | null, type: "hub" as StationType | null, query: "" },
    { label: "Zone A", zone: "A" as Zone, type: null, query: "" },
    { label: "Zone B", zone: "B" as Zone, type: null, query: "" },
    { label: "S-Bahn", zone: null, type: null, query: "s" },
    { label: "U-Bahn", zone: null, type: null, query: "u" },
    { label: "Hbf", zone: null, type: null, query: "hauptbahnhof" },
    { label: "Alex", zone: null, type: null, query: "alexanderplatz" },
  ];

  // ── Reactive state ─────────────────────────────────────────────────
  let engine = $state<Awaited<ReturnType<typeof createPdfiumEngine>> | null>(null);
  let documentId = $state("");
  let loadError = $state("");
  let loadState = $state("Loading map engine…");
  let documentReady = $state(false);

  let query = $state("");
  let activeChipIdx = $state<number | null>(null);
  let activeLabelId = $state("");
  let activeLabel = $state<RailmapLabel | null>(null);

  let viewportWidth = $state(0);
  let viewportHeight = $state(0);
  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let focusMode = $state<"page" | "result" | "manual">("page");

  let dragState = $state<{ pointerId: number; startX: number; startY: number; panX: number; panY: number; } | null>(null);
  let activePointers = $state<PointerEvent[]>([]);
  let initialPinchDistance = $state<number | null>(null);
  let initialPinchScale = $state<number | null>(null);
  let initialPinchDoc = $state<{ x: number; y: number } | null>(null);
  let viewportElement = $state<HTMLDivElement | null>(null);

  let panelOpen = $state(false);
  let searchInput = $state<HTMLInputElement | null>(null);

  // ── Derived ────────────────────────────────────────────────────────
  let fitScale = $derived(viewportWidth > 0 ? viewportWidth / pageWidth : 1);
  let scale = $derived(clamp(fitScale * zoom, minScale, maxScale));
  let currentQuery = $derived(normalizeText(query));
  let activeChip = $derived(activeChipIdx !== null ? CHIPS[activeChipIdx] : null);

  let searchResults = $derived.by(() => {
    let base = currentQuery ? labels : featuredLabels;

    // Apply chip zone/type filter
    if (activeChip?.zone) {
      base = base.filter((l) => l.zone === activeChip!.zone);
    }
    if (activeChip?.type) {
      base = base.filter((l) => l.type === activeChip!.type);
    }

    const q = activeChip?.query || currentQuery;
    if (!q) return base.slice(0, visibleLimit);

    return base
      .map((l) => ({ ...l, score: scoreLabel(l, q) }))
      .filter((l) => Number.isFinite(l.score ?? Infinity))
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
      .slice(0, visibleLimit);
  });

  let resultCount = $derived(currentQuery || activeChip ? searchResults.length : labels.length);

  // ── Effects ────────────────────────────────────────────────────────
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

  // ── Zoom / pan ─────────────────────────────────────────────────────
  function updateScale(nextScale: number, anchor?: { x: number; y: number; screenX: number; screenY: number }) {
    const clamped = clamp(nextScale, minScale, maxScale);
    const cur = scale || 1;
    const ref = anchor ?? {
      x: (viewportWidth / 2 - panX) / cur,
      y: (viewportHeight / 2 - panY) / cur,
      screenX: viewportWidth / 2,
      screenY: viewportHeight / 2,
    };
    zoom = clamped / fitScale;
    panX = Math.round(ref.screenX - ref.x * clamped);
    panY = Math.round(ref.screenY - ref.y * clamped);
  }

  function resetView() {
    focusMode = "page";
    updateScale(fitScale, {
      x: pageWidth / 2, y: pageHeight / 2,
      screenX: viewportWidth / 2, screenY: viewportHeight / 2,
    });
  }

  function zoomIn() {
    if (activeLabel && focusMode === "result") {
      updateScale(scale * zoomStep, { x: activeLabel.centerX, y: activeLabel.centerY, screenX: viewportWidth / 2, screenY: viewportHeight / 2 });
    } else {
      updateScale(scale * zoomStep);
      focusMode = "manual";
    }
  }

  function zoomOut() {
    if (activeLabel && focusMode === "result") {
      updateScale(scale / zoomStep, { x: activeLabel.centerX, y: activeLabel.centerY, screenX: viewportWidth / 2, screenY: viewportHeight / 2 });
    } else {
      updateScale(scale / zoomStep);
      focusMode = "manual";
    }
  }

  // ── Station selection ──────────────────────────────────────────────
  function selectLabel(label: RailmapLabel) {
    activeLabel = label;
    activeLabelId = label.id;
    focusMode = "result";

    const nextScale = clamp(
      Math.max(fitScale * 1.8, Math.min(
        (viewportWidth * 0.34) / Math.max(label.width, 1),
        (viewportHeight * 0.26) / Math.max(label.height, 1)
      )),
      minScale, maxScale
    );
    updateScale(nextScale, {
      x: label.centerX, y: label.centerY,
      screenX: viewportWidth / 2, screenY: viewportHeight / 2,
    });
    panelOpen = false;
  }

  function clearSearch() {
    query = "";
    activeLabel = null;
    activeLabelId = "";
    activeChipIdx = null;
    resetView();
    searchInput?.focus();
  }

  function selectChip(i: number) {
    activeChipIdx = activeChipIdx === i ? null : i;
    if (activeChipIdx !== null) query = "";
  }

  function handleQueryInput() {
    if (query.length > 0) activeChipIdx = null;
  }

  // ── Pointer handlers ───────────────────────────────────────────────
  function handlePointerDown(event: PointerEvent) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const idx = activePointers.findIndex((p) => p.pointerId === event.pointerId);
    if (idx !== -1) activePointers[idx] = event;
    else activePointers.push(event);

    focusMode = "manual";
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

    if (activePointers.length === 1) {
      dragState = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, panX, panY };
    } else if (activePointers.length === 2) {
      dragState = null;
      const [p1, p2] = activePointers;
      initialPinchDistance = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
      initialPinchScale = scale;
      const cx = (p1.clientX + p2.clientX) / 2;
      const cy = (p1.clientY + p2.clientY) / 2;
      const rect = viewportElement?.getBoundingClientRect();
      initialPinchDoc = { x: (cx - (rect?.left ?? 0) - panX) / scale, y: (cy - (rect?.top ?? 0) - panY) / scale };
    }
  }

  function handlePointerMove(event: PointerEvent) {
    const idx = activePointers.findIndex((p) => p.pointerId === event.pointerId);
    if (idx !== -1) activePointers[idx] = event;

    if (activePointers.length === 1 && dragState?.pointerId === event.pointerId) {
      panX = Math.round(dragState.panX + (event.clientX - dragState.startX));
      panY = Math.round(dragState.panY + (event.clientY - dragState.startY));
    } else if (activePointers.length === 2 && initialPinchDistance && initialPinchScale && initialPinchDoc) {
      const [p1, p2] = activePointers;
      const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
      const cx = (p1.clientX + p2.clientX) / 2;
      const cy = (p1.clientY + p2.clientY) / 2;
      const rect = viewportElement?.getBoundingClientRect();
      updateScale(initialPinchScale * (dist / initialPinchDistance), {
        x: initialPinchDoc.x, y: initialPinchDoc.y,
        screenX: cx - (rect?.left ?? 0), screenY: cy - (rect?.top ?? 0),
      });
    }
  }

  function endPointer(event: PointerEvent) {
    activePointers = activePointers.filter((p) => p.pointerId !== event.pointerId);
    if (activePointers.length === 1) {
      const p = activePointers[0];
      dragState = { pointerId: p.pointerId, startX: p.clientX, startY: p.clientY, panX, panY };
      initialPinchDistance = null;
      initialPinchDoc = null;
    } else if (activePointers.length === 0) {
      dragState = null;
      initialPinchDistance = null;
      initialPinchDoc = null;
    }
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    const rect = viewportElement?.getBoundingClientRect();
    const screenX = event.clientX - (rect?.left ?? 0);
    const screenY = event.clientY - (rect?.top ?? 0);
    const docX = (screenX - panX) / scale;
    const docY = (screenY - panY) / scale;
    const delta = event.deltaY < 0 ? zoomStep : 1 / zoomStep;
    updateScale(scale * delta, { x: docX, y: docY, screenX, screenY });
    focusMode = "manual";
  }

  // ── PDF viewer init ────────────────────────────────────────────────
  async function initializeViewer(registry: PluginRegistry) {
    loadState = "Opening Berlin rail map…";
    documentReady = false;

    const managerPlugin = registry.getPlugin(DocumentManagerPlugin.id);
    const manager = managerPlugin?.provides?.();
    if (!manager) { loadError = "Document manager unavailable."; return; }

    try {
      const unsubscribe = manager.onDocumentOpened((state: { id: string; status?: string }) => {
        if (state.id === railmapDocumentId && state.status === "loaded") {
          documentId = state.id;
          documentReady = true;
          loadState = "Ready";
          unsubscribe();
        }
      });

      const task = manager.openDocumentUrl({
        url: railmapPdfUrl,
        documentId: railmapDocumentId,
        name: "Berlin rail map",
        mode: "full-fetch",
        autoActivate: true,
        scale: 1,
      });
      const result = await task.toPromise();
      documentId = result.documentId;
    } catch (e) {
      console.error(e);
      loadError = "Failed to load the rail map PDF.";
    }
  }

  onMount(async () => {
    try {
      engine = await createPdfiumEngine(pdfiumWasmUrl, { encoderPoolSize: 1 });
      loadState = "Engine ready — opening map…";
    } catch (e) {
      console.error(e);
      loadError = "Failed to initialize PDF engine.";
    }
  });

  // ── Zone/type helpers for UI ───────────────────────────────────────
  const ZONE_CLR: Record<Zone, string> = { A: "#10b981", B: "#3b82f6", C: "#a855f7" };
  function lineClass(l: string) { return l.startsWith("S") ? "s" : "u"; }
</script>

<svelte:head>
  <title>Berlin Rail Map</title>
  <meta name="description" content="Offline Berlin S-Bahn & U-Bahn rail map. Zoomable, searchable, with station finder." />
</svelte:head>

<!-- Full-viewport shell, escapes content-area constraints -->
<div class="railmap-shell">

  <!-- ── Interactive map canvas ───────────────────────── -->
  <section class="map-canvas" aria-label="Berlin rail map">
    {#if loadError}
      <div class="map-state">
        <i class="ph ph-warning" aria-hidden="true"></i>
        <p>{loadError}</p>
      </div>
    {:else if !engine}
      <div class="map-state">
        <span class="spinner" aria-hidden="true"></span>
        <p>{loadState}</p>
      </div>
    {:else}
      <EmbedPDF
        {engine}
        plugins={[
          { package: DocumentManagerPluginPackage },
          { package: RenderPluginPackage },
          { package: ViewportPluginPackage } as any,
        ] as any}
        autoMountDomElements={true}
        onInitialized={initializeViewer}
      >
        {#snippet children()}
          {#if documentReady && documentId}
            <Viewport {documentId}>
              <div
                class="viewport"
                bind:this={viewportElement}
                bind:clientWidth={viewportWidth}
                bind:clientHeight={viewportHeight}
                role="application"
                aria-label="Rail map canvas – drag to pan, pinch or scroll to zoom"
                style:cursor={dragState ? "grabbing" : "grab"}
                onpointerdown={handlePointerDown}
                onpointermove={handlePointerMove}
                onpointerup={endPointer}
                onpointercancel={endPointer}
                onpointerleave={endPointer}
                onwheel={handleWheel}
              >
                <div
                  class="stage"
                  style:width="{pageWidth}px"
                  style:height="{pageHeight}px"
                  style:transform="translate3d({panX}px,{panY}px,0) scale({scale})"
                >
                  {#if viewportWidth > 0}
                    <RenderLayer documentId={documentId} pageIndex={0} {scale} draggable="false" />
                  {/if}

                  <!-- Active result highlight -->
                  {#if activeLabel}
                    <div
                      class="highlight"
                      style:left="{activeLabel.x}px"
                      style:top="{activeLabel.y}px"
                      style:width="{activeLabel.width}px"
                      style:height="{activeLabel.height}px"
                    ></div>
                  {/if}

                  <!-- Hotspot dots for visible results -->
                  {#each searchResults as label}
                    <button
                      class="hotspot"
                      class:active={activeLabelId === label.id}
                      type="button"
                      aria-label="Jump to {label.text}"
                      title={label.text}
                      style:left="{label.x}px"
                      style:top="{label.y}px"
                      style:width="{Math.max(label.width, 20)}px"
                      style:height="{Math.max(label.height, 20)}px"
                      onpointerdown={(e) => e.stopPropagation()}
                      onclick={(e) => { e.stopPropagation(); selectLabel(label); }}
                    >
                      <span class="hotspot-dot"></span>
                    </button>
                  {/each}
                </div>
              </div>
            </Viewport>
          {:else}
            <div class="map-state">
              <span class="spinner" aria-hidden="true"></span>
              <p>{loadError || loadState}</p>
            </div>
          {/if}
        {/snippet}
      </EmbedPDF>
    {/if}
  </section>

  <!-- ── Floating top bar: back + search + zoom controls ── -->
  <div class="topbar-float">
    <!-- Back -->
    <button class="fab fab-sm" type="button" onclick={() => goto("/explore")} aria-label="Back">
      <i class="ph ph-arrow-left" aria-hidden="true"></i>
    </button>

    <!-- Search -->
    <label class="search-pill glass" aria-label="Search stations">
      <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
      <input
        bind:this={searchInput}
        bind:value={query}
        oninput={handleQueryInput}
        type="search"
        placeholder="Search a station…"
        autocomplete="off"
        spellcheck="false"
      />
      {#if query}
        <button class="clear-btn" type="button" onclick={clearSearch} aria-label="Clear">
          <i class="ph ph-x" aria-hidden="true"></i>
        </button>
      {/if}
    </label>

    <!-- Stations list toggle -->
    <button
      class="fab fab-sm"
      class:fab-active={panelOpen}
      type="button"
      onclick={() => panelOpen = !panelOpen}
      aria-label="Toggle station list"
      aria-expanded={panelOpen}
    >
      <i class="ph {panelOpen ? 'ph-x' : 'ph-list'}" aria-hidden="true"></i>
    </button>
  </div>

  <!-- ── Zoom controls (bottom-right) ── -->
  <div class="zoom-controls glass">
    <button class="zoom-btn" type="button" onclick={zoomIn} aria-label="Zoom in">
      <i class="ph ph-plus" aria-hidden="true"></i>
    </button>
    <hr class="zoom-divider" />
    <button class="zoom-btn" type="button" onclick={zoomOut} aria-label="Zoom out">
      <i class="ph ph-minus" aria-hidden="true"></i>
    </button>
    <hr class="zoom-divider" />
    <button class="zoom-btn" type="button" onclick={resetView} aria-label="Reset view" title="Fit map">
      <i class="ph ph-arrows-out" aria-hidden="true"></i>
    </button>
  </div>

  <!-- ── Active station tooltip (bottom-left) ── -->
  {#if activeLabel}
    <div class="active-card glass" role="status" aria-live="polite">
      <div class="active-name">{activeLabel.text}</div>
      <div class="active-meta">
        <span class="zone-dot" style:background={ZONE_CLR[activeLabel.zone]}>Zone {activeLabel.zone}</span>
        {#if activeLabel.lines.length > 0}
          {#each activeLabel.lines.slice(0, 5) as line}
            <span class="line-badge line-{lineClass(line)}">{line}</span>
          {/each}
        {/if}
      </div>
      <button class="active-dismiss" type="button" onclick={clearSearch} aria-label="Clear selection">
        <i class="ph ph-x" aria-hidden="true"></i>
      </button>
    </div>
  {/if}

  <!-- ── Slide-in station panel ── -->
  <aside
    class="station-panel glass"
    class:panel-open={panelOpen}
    aria-label="Station list"
    aria-hidden={!panelOpen}
  >
    <!-- Panel header -->
    <div class="panel-header">
      <div class="panel-title">
        <span class="panel-eyebrow">Berlin Transit</span>
        <strong>
          {currentQuery || activeChip ? `${resultCount} result${resultCount !== 1 ? "s" : ""}` : `${labels.length} stations`}
        </strong>
      </div>
      {#if query || activeChipIdx !== null}
        <button class="ghost-btn" type="button" onclick={clearSearch}>Clear</button>
      {/if}
    </div>

    <!-- Suggestion chips -->
    <div class="chip-row">
      {#each CHIPS as chip, i}
        <button
          class="chip"
          class:chip-active={activeChipIdx === i}
          type="button"
          onclick={() => selectChip(i)}
        >{chip.label}</button>
      {/each}
    </div>

    <!-- Station list -->
    <div class="station-list" role="list">
      {#if searchResults.length === 0}
        <div class="empty-state">
          <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
          <p>No stations match <strong>{query}</strong></p>
        </div>
      {:else}
        {#each searchResults as label}
          <button
            class="station-row"
            class:station-active={activeLabelId === label.id}
            type="button"
            role="listitem"
            onclick={() => selectLabel(label)}
          >
            <div class="station-row-left">
              <span class="stn-name">{label.text}</span>
              <div class="stn-meta">
                <span class="zone-dot" style:background={ZONE_CLR[label.zone]}>Zone {label.zone}</span>
                {#if label.lines.length > 0}
                  {#each label.lines.slice(0, 4) as line}
                    <span class="line-badge line-{lineClass(line)}">{line}</span>
                  {/each}
                {/if}
              </div>
            </div>
            <i class="ph ph-arrow-right station-row-arrow" aria-hidden="true"></i>
          </button>
        {/each}
      {/if}
    </div>
  </aside>

</div>

<style>
  /* ── Shell: escape the content-area and fill remaining viewport ── */
  .railmap-shell {
    position: fixed;
    /* Respect top nav on desktop, bottom nav on mobile */
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    /* On desktop, top nav pushes us down */
    padding-top: var(--topbar-height, 0px);
    /* On mobile, bottom nav is above */
    padding-bottom: env(safe-area-inset-bottom, 0px);
    isolation: isolate;
    overflow: hidden;
  }

  @media (max-width: 1023px) {
    .railmap-shell {
      padding-top: 0;
      /* leave space for bottom nav — 74px nav + safe area */
      padding-bottom: calc(74px + env(safe-area-inset-bottom, 0px));
    }
  }

  /* ── Map canvas fills the whole shell ── */
  .map-canvas {
    position: absolute;
    inset: 0;
    background: transparent;
    overflow: hidden;
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

  /* ── Map state (loading / error) ── */
  .map-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: var(--text-color-secondary);
    font-size: 0.9rem;
  }

  .map-state p { margin: 0; }

  .spinner {
    display: block;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    border: 2px solid rgba(212,68,7,0.15);
    border-top-color: var(--primary-color);
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Floating topbar ── */
  .topbar-float {
    position: absolute;
    top: clamp(0.6rem, 2vw, 1rem);
    left: clamp(0.6rem, 2vw, 1rem);
    right: clamp(0.6rem, 2vw, 1rem);
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    pointer-events: none;
  }

  .topbar-float > * { pointer-events: auto; }

  /* ── FAB buttons ── */
  .fab {
    flex-shrink: 0;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    background: var(--glass-bg-strong);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    display: grid;
    place-items: center;
    font-size: 1.1rem;
    color: var(--text-color);
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
  }

  .fab:hover { transform: scale(1.06); box-shadow: var(--glass-shadow-hover); }
  .fab:active { transform: scale(0.94); }

  .fab.fab-active {
    background: var(--primary-color);
    color: #fff;
    border-color: transparent;
  }

  /* ── Search pill ── */
  .search-pill {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    height: 2.75rem;
    border-radius: 999px;
    padding: 0 0.9rem;
    cursor: text;
    transition: box-shadow 0.2s, border-color 0.2s;
  }

  .search-pill:focus-within {
    border-color: var(--primary-color);
    box-shadow: var(--glass-shadow-hover), 0 0 0 3px rgba(212,68,7,0.12);
  }

  .search-pill i { font-size: 1.05rem; color: var(--text-color-secondary); flex-shrink: 0; }

  .search-pill input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    font: inherit;
    font-size: 0.95rem;
    color: var(--text-color);
    padding: 0;
  }

  .search-pill input::placeholder { color: var(--text-color-secondary); opacity: 0.65; }

  .clear-btn {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: var(--surface-border);
    border: none;
    display: grid;
    place-items: center;
    font-size: 0.78rem;
    color: var(--text-color-secondary);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .clear-btn:hover { background: rgba(212,68,7,0.15); color: var(--primary-color); }

  /* ── Zoom controls ── */
  .zoom-controls {
    position: absolute;
    bottom: clamp(0.75rem, 2vw, 1.25rem);
    right: clamp(0.75rem, 2vw, 1.25rem);
    z-index: 20;
    border-radius: 1rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .zoom-btn {
    width: 2.6rem;
    height: 2.6rem;
    border: none;
    background: transparent;
    display: grid;
    place-items: center;
    font-size: 1rem;
    color: var(--text-color);
    cursor: pointer;
    transition: background 0.15s;
  }
  .zoom-btn:hover { background: rgba(212,68,7,0.1); color: var(--primary-color); }

  .zoom-divider { margin: 0; border: none; border-top: 1px solid var(--glass-border); }

  /* ── Active station card (bottom-left) ── */
  .active-card {
    position: absolute;
    bottom: clamp(0.75rem, 2vw, 1.25rem);
    left: clamp(0.75rem, 2vw, 1.25rem);
    z-index: 20;
    border-radius: 1rem;
    padding: 0.7rem 0.85rem;
    max-width: min(calc(100vw - 6rem), 22rem);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .active-name {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--text-color);
    line-height: 1.2;
    padding-right: 1.5rem;
  }

  .active-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    align-items: center;
  }

  .active-dismiss {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: var(--surface-border);
    border: none;
    display: grid;
    place-items: center;
    font-size: 0.78rem;
    color: var(--text-color-secondary);
    cursor: pointer;
  }
  .active-dismiss:hover { background: rgba(212,68,7,0.15); color: var(--primary-color); }

  /* ── Highlight overlay on map ── */
  .highlight {
    position: absolute;
    border: 2.5px solid rgba(212,68,7,0.9);
    border-radius: 0.3rem;
    background: rgba(212,68,7,0.15);
    box-shadow: 0 0 0 3px rgba(255,255,255,0.7), 0 0 0 6px rgba(212,68,7,0.1);
    pointer-events: none;
    animation: pulse-ring 1.6s ease-out infinite;
  }

  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 3px rgba(255,255,255,0.7), 0 0 0 6px rgba(212,68,7,0.12); }
    60%  { box-shadow: 0 0 0 3px rgba(255,255,255,0.5), 0 0 0 18px rgba(212,68,7,0); }
    100% { box-shadow: 0 0 0 3px rgba(255,255,255,0.7), 0 0 0 6px rgba(212,68,7,0.12); }
  }

  /* ── Hotspot dots ── */
  .hotspot {
    position: absolute;
    border: 0;
    background: transparent;
    padding: 0;
    cursor: pointer;
  }

  .hotspot-dot {
    position: absolute;
    left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    width: 8px; height: 8px;
    background: var(--primary-color);
    border-radius: 50%;
    box-shadow: 0 0 0 2px white;
    opacity: 0;
    transition: opacity 0.12s;
  }

  .hotspot:hover .hotspot-dot,
  .hotspot.active .hotspot-dot { opacity: 1; }

  /* ── Station panel ── */
  .station-panel {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(22rem, 90vw);
    z-index: 30;
    border-radius: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    overflow: hidden;
  }

  .station-panel.panel-open { transform: translateX(0); }

  /* Mobile: bottom sheet */
  @media (max-width: 639px) {
    .station-panel {
      top: auto;
      left: 0;
      right: 0;
      width: 100%;
      height: 68dvh;
      border-radius: 1.25rem 1.25rem 0 0;
      transform: translateY(100%);
    }
    .station-panel.panel-open { transform: translateY(0); }
  }

  /* ── Panel header ── */
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1rem 0.6rem;
    flex-shrink: 0;
    gap: 0.5rem;
    border-bottom: 1px solid var(--surface-border);
  }

  .panel-title { display: flex; flex-direction: column; gap: 0.1rem; }

  .panel-eyebrow {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--text-color-secondary);
  }

  .panel-title strong { font-size: 1rem; color: var(--text-color); }

  .ghost-btn {
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    border: 1px solid var(--surface-border);
    background: transparent;
    font-size: 0.82rem;
    color: var(--text-color-secondary);
    cursor: pointer;
    transition: background 0.15s;
    flex-shrink: 0;
  }
  .ghost-btn:hover { background: rgba(212,68,7,0.08); color: var(--primary-color); }

  /* ── Chips ── */
  .chip-row {
    display: flex;
    gap: 0.35rem;
    padding: 0.65rem 1rem;
    overflow-x: auto;
    scrollbar-width: none;
    flex-shrink: 0;
    border-bottom: 1px solid var(--surface-border);
  }
  .chip-row::-webkit-scrollbar { display: none; }

  .chip {
    flex-shrink: 0;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 600;
    border: 1px solid var(--surface-border);
    background: transparent;
    color: var(--text-color);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
  }
  .chip:hover { border-color: rgba(212,68,7,0.3); background: rgba(212,68,7,0.06); }
  .chip.chip-active { background: var(--primary-color); color: #fff; border-color: transparent; }

  /* ── Station list ── */
  .station-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0;
    overscroll-behavior: contain;
  }

  .station-row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.65rem 1rem;
    border: none;
    background: transparent;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s;
    border-bottom: 1px solid transparent;
  }

  .station-row:hover { background: rgba(212,68,7,0.05); }
  .station-row.station-active { background: rgba(212,68,7,0.08); }
  .station-row.station-active .stn-name { color: var(--primary-color); }

  .station-row-left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.25rem; }

  .stn-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stn-meta { display: flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; }

  .station-row-arrow {
    font-size: 0.85rem;
    color: var(--text-color-secondary);
    opacity: 0.4;
    flex-shrink: 0;
    transition: opacity 0.12s, transform 0.12s;
  }
  .station-row:hover .station-row-arrow { opacity: 1; transform: translateX(2px); }

  /* ── Zone dot ── */
  .zone-dot {
    display: inline-flex;
    align-items: center;
    padding: 0.08rem 0.42rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 700;
    color: #fff;
    line-height: 1.5;
  }

  /* ── Line badges ── */
  .line-badge {
    padding: 0.1rem 0.38rem;
    border-radius: 4px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1.5;
  }

  .line-badge.line-s {
    background: rgba(16,185,129,0.12);
    color: #059669;
    border: 1px solid rgba(16,185,129,0.2);
  }
  .line-badge.line-u {
    background: rgba(59,130,246,0.12);
    color: #2563eb;
    border: 1px solid rgba(59,130,246,0.2);
  }

  /* dark mode adjustments */
  :global([data-theme="dark"]) .line-badge.line-s { background: rgba(16,185,129,0.18); color: #34d399; border-color: rgba(16,185,129,0.28); }
  :global([data-theme="dark"]) .line-badge.line-u { background: rgba(59,130,246,0.18); color: #60a5fa; border-color: rgba(59,130,246,0.28); }

  /* ── Empty state ── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 2.5rem 1rem;
    gap: 0.5rem;
    color: var(--text-color-secondary);
  }
  .empty-state i { font-size: 1.8rem; opacity: 0.3; }
  .empty-state p { font-size: 0.88rem; margin: 0; }
</style>
