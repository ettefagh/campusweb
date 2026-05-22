<script lang="ts">
  import { browser } from "$app/environment";
  import { onDestroy, onMount } from "svelte";

  type LatLng = [number, number];
  type BuildingKey = "SHED" | "HALL" | "CUBE";
  type Pin = {
    id: string;
    label: string;
    building: BuildingKey;
    coords: LatLng;
  };

  const baseFootprints: Record<BuildingKey, LatLng[]> = {
    SHED: [
      [52.47565, 13.45465],
      [52.47585, 13.4546],
      [52.47642, 13.4549],
      [52.47638, 13.45525],
      [52.4758, 13.455],
      [52.4756, 13.45495]
    ],
    HALL: [
      [52.47495, 13.4573],
      [52.47515, 13.4573],
      [52.47515, 13.45755],
      [52.47495, 13.45755]
    ],
    CUBE: [
      [52.47505, 13.4681],
      [52.47525, 13.4681],
      [52.47525, 13.4683],
      [52.47505, 13.4683]
    ]
  };

  const mapCenter: LatLng = [52.4756, 13.456];

  let mapElement: HTMLDivElement;
  let map: any = null;
  let L: any = null;
  let polygonLayer: any = null;
  let footprintPointLayer: any = null;
  let pinLayer: any = null;

  let selectedBuilding: BuildingKey = "SHED";
  let editorMode: "footprint" | "pin" = "footprint";
  let pinLabel = "";

  let footprintDraft: LatLng[] = [...baseFootprints.SHED];
  let footprintJson = "";
  let pins: Pin[] = [];
  let pinsJson = "";

  let selectedVertexIndex: number | null = null;
  let selectedPinId: string | null = null;

  $: footprintJson = JSON.stringify(footprintDraft, null, 2);
  $: pinsJson = JSON.stringify(pins, null, 2);

  $: if (browser) {
    footprintDraft = [...baseFootprints[selectedBuilding]];
    selectedVertexIndex = null;
    selectedPinId = null;
    requestAnimationFrame(redrawOverlays);
  }

  onMount(async () => {
    if (!browser) return;
    await loadLeafletFromCDN();
    L = (window as any).L;
    if (!L) return;

    map = L.map(mapElement, {
      center: mapCenter,
      zoom: 17,
      minZoom: 15,
      maxZoom: 20
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    polygonLayer = L.layerGroup().addTo(map);
    footprintPointLayer = L.layerGroup().addTo(map);
    pinLayer = L.layerGroup().addTo(map);

    map.on("click", (event: any) => {
      const lat: number = Number(event.latlng.lat.toFixed(6));
      const lng: number = Number(event.latlng.lng.toFixed(6));
      if (editorMode === "footprint") {
        footprintDraft = [...footprintDraft, [lat, lng]];
      } else {
        const name = pinLabel.trim() || `Pin ${pins.length + 1}`;
        pins = [
          ...pins,
          {
            id: `pin-${Date.now()}-${pins.length}`,
            label: name,
            building: selectedBuilding,
            coords: [lat, lng]
          }
        ];
      }
      redrawOverlays();
    });

    redrawOverlays();
  });

  onDestroy(() => {
    if (map) map.remove();
  });

  async function loadLeafletFromCDN(): Promise<void> {
    if ((window as any).L?.version?.startsWith("1.")) return;

    if (!document.querySelector("link[data-editor-leaflet]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.setAttribute("data-editor-leaflet", "1");
      document.head.appendChild(link);
    }

    if (!document.querySelector("script[data-editor-leaflet]")) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.setAttribute("data-editor-leaflet", "1");
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Leaflet"));
        document.head.appendChild(script);
      });
      return;
    }

    if (!(window as any).L) {
      await new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          if ((window as any).L) {
            clearInterval(timer);
            resolve();
          }
        }, 50);
      });
    }
  }

  function redrawOverlays() {
    if (!map || !L || !polygonLayer || !footprintPointLayer || !pinLayer) return;
    polygonLayer.clearLayers();
    footprintPointLayer.clearLayers();
    pinLayer.clearLayers();

    if (footprintDraft.length >= 3) {
      L.polygon(footprintDraft, {
        color: "#0ea5e9",
        weight: 2,
        fillColor: "#0ea5e9",
        fillOpacity: 0.15
      }).addTo(polygonLayer);
    }

    footprintDraft.forEach((point, index) => {
      const marker = L.circleMarker(point, {
        radius: selectedVertexIndex === index ? 8 : 6,
        color: "#1e293b",
        fillColor: selectedVertexIndex === index ? "#22c55e" : "#f59e0b",
        fillOpacity: 0.95,
        weight: 2
      }).addTo(footprintPointLayer);

      marker.on("click", () => {
        selectedVertexIndex = index;
      });
      marker.bindTooltip(`V${index + 1}: ${point[0]}, ${point[1]}`, { direction: "top" });
    });

    pins
      .filter((pin) => pin.building === selectedBuilding)
      .forEach((pin) => {
        const marker = L.marker(pin.coords, {
          draggable: true
        }).addTo(pinLayer);
        marker.on("dragend", () => {
          const ll = marker.getLatLng();
          pins = pins.map((entry) =>
            entry.id === pin.id
              ? { ...entry, coords: [Number(ll.lat.toFixed(6)), Number(ll.lng.toFixed(6))] }
              : entry
          );
        });
        marker.on("click", () => {
          selectedPinId = pin.id;
        });
        marker.bindTooltip(pin.label, { direction: "top" });
      });
  }

  function removeSelectedVertex() {
    if (selectedVertexIndex === null) return;
    footprintDraft = footprintDraft.filter((_, idx) => idx !== selectedVertexIndex);
    selectedVertexIndex = null;
    redrawOverlays();
  }

  function moveVertex(index: number, axis: "lat" | "lng", delta: number) {
    footprintDraft = footprintDraft.map((point, idx) => {
      if (idx !== index) return point;
      const lat = axis === "lat" ? Number((point[0] + delta).toFixed(6)) : point[0];
      const lng = axis === "lng" ? Number((point[1] + delta).toFixed(6)) : point[1];
      return [lat, lng];
    });
    redrawOverlays();
  }

  function resetFootprint() {
    footprintDraft = [...baseFootprints[selectedBuilding]];
    selectedVertexIndex = null;
    redrawOverlays();
  }

  function removeSelectedPin() {
    if (!selectedPinId) return;
    pins = pins.filter((pin) => pin.id !== selectedPinId);
    selectedPinId = null;
    redrawOverlays();
  }
</script>

<svelte:head>
  <title>Map Editorial Workspace</title>
</svelte:head>

<div class="editor-layout">
  <aside class="control-panel">
    <h1>Map Editorial</h1>
    <p>Customize building boundaries and manually pinpoint locations.</p>

    <label>
      Building
      <select bind:value={selectedBuilding}>
        <option value="SHED">The SHED</option>
        <option value="HALL">The HALL</option>
        <option value="CUBE">The CUBE</option>
      </select>
    </label>

    <div class="mode-row">
      <button class:active={editorMode === "footprint"} onclick={() => (editorMode = "footprint")} type="button">
        Footprint Mode
      </button>
      <button class:active={editorMode === "pin"} onclick={() => (editorMode = "pin")} type="button">
        Pin Mode
      </button>
    </div>

    <label>
      Pin Label
      <input bind:value={pinLabel} placeholder="Seminar Entrance / Main Door" />
    </label>

    <div class="actions">
      <button type="button" onclick={resetFootprint}>Reset Building Footprint</button>
      <button type="button" onclick={removeSelectedVertex} disabled={selectedVertexIndex === null}>Remove Selected Vertex</button>
      <button type="button" onclick={removeSelectedPin} disabled={!selectedPinId}>Remove Selected Pin</button>
    </div>

    <h2>Footprint Vertices</h2>
    <div class="vertex-list">
      {#each footprintDraft as vertex, index}
        <div class="vertex-row" class:selected={selectedVertexIndex === index}>
          <button type="button" onclick={() => (selectedVertexIndex = index)}>V{index + 1}</button>
          <span>{vertex[0]}, {vertex[1]}</span>
          <div class="nudge">
            <button type="button" onclick={() => moveVertex(index, "lat", 0.00001)}>N</button>
            <button type="button" onclick={() => moveVertex(index, "lat", -0.00001)}>S</button>
            <button type="button" onclick={() => moveVertex(index, "lng", 0.00001)}>E</button>
            <button type="button" onclick={() => moveVertex(index, "lng", -0.00001)}>W</button>
          </div>
        </div>
      {/each}
    </div>

    <h2>Export: Footprint JSON</h2>
    <textarea readonly value={footprintJson}></textarea>

    <h2>Export: Pins JSON</h2>
    <textarea readonly value={pinsJson}></textarea>
  </aside>

  <section class="map-panel">
    <div class="toolbar-note">
      Click map in <strong>{editorMode === "footprint" ? "Footprint Mode" : "Pin Mode"}</strong> to place
      {editorMode === "footprint" ? " a new boundary vertex." : " a new pin."}
    </div>
    <div bind:this={mapElement} class="map-canvas"></div>
  </section>
</div>

<style>
  .editor-layout {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 1rem;
    min-height: calc(100vh - 5rem);
    padding: 1rem;
  }

  .control-panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1rem;
    overflow: auto;
  }

  .control-panel h1 {
    margin: 0;
    font-size: 1.2rem;
  }

  .control-panel p {
    margin: 0;
    color: #475569;
    font-size: 0.9rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.85rem;
    color: #0f172a;
  }

  select,
  input,
  textarea {
    border: 1px solid #cbd5e1;
    border-radius: 0.5rem;
    padding: 0.5rem;
    font: inherit;
  }

  .mode-row,
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem;
  }

  .actions {
    grid-template-columns: 1fr;
  }

  button {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    border-radius: 0.5rem;
    padding: 0.45rem 0.55rem;
    cursor: pointer;
  }

  button.active {
    background: #0f172a;
    border-color: #0f172a;
    color: #fff;
  }

  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .vertex-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    max-height: 220px;
    overflow: auto;
  }

  .vertex-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.35rem;
    align-items: center;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 0.3rem;
  }

  .vertex-row.selected {
    border-color: #22c55e;
    box-shadow: 0 0 0 1px #22c55e inset;
  }

  .vertex-row span {
    font-size: 0.8rem;
    color: #334155;
  }

  .nudge {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.2rem;
  }

  .nudge button {
    font-size: 0.7rem;
    padding: 0.2rem 0.25rem;
  }

  textarea {
    min-height: 110px;
    resize: vertical;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
      monospace;
    font-size: 0.75rem;
  }

  .map-panel {
    position: relative;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    overflow: hidden;
    background: #f8fafc;
  }

  .toolbar-note {
    position: absolute;
    z-index: 600;
    top: 0.75rem;
    left: 0.75rem;
    background: rgba(15, 23, 42, 0.88);
    color: #f8fafc;
    padding: 0.35rem 0.55rem;
    border-radius: 0.45rem;
    font-size: 0.8rem;
  }

  .map-canvas {
    width: 100%;
    height: 100%;
    min-height: calc(100vh - 7rem);
  }

  @media (max-width: 980px) {
    .editor-layout {
      grid-template-columns: 1fr;
    }

    .map-canvas {
      min-height: 58vh;
    }
  }
</style>
