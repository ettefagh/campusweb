<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { ROOMS, BUILDING_COORDS, type Room, type NavigationNode } from '../data/campusData';

  // Svelte 5 Runes for Props
  let {
    activeFloor = $bindable(0),
    selectedRoomId = $bindable<string | null>(null),
    startRoomId = $bindable<string | null>(null),
    endRoomId = $bindable<string | null>(null),
    activeRoute = null
  }: {
    activeFloor: number;
    selectedRoomId: string | null;
    startRoomId: string | null;
    endRoomId: string | null;
    activeRoute: any;
  } = $props();

  let mapElement: HTMLDivElement;
  let map: any = null;
  let L: any = null;

  // Layer groups for clean updates
  let footprintLayerGroup: any = null;
  let roomLayerGroup: any = null;
  let routeLayerGroup: any = null;
  let markerLayerGroup: any = null;

  // Campus coordinates and boundaries
  const CAMPUS_CENTER: [number, number] = [52.4756, 13.4560]; 
  const MAP_BOUNDS = [
    [52.4720, 13.4500], // SW
    [52.4790, 13.4720]  // NE
  ];

  // Georeferenced Footprints for Buildings
  // 1. The SHED (Sections A, B, C, D)
  const SHED_FOOTPRINT: [number, number][] = [
    [52.47565, 13.45465],
    [52.47585, 13.45460],
    [52.47642, 13.45490],
    [52.47638, 13.45525],
    [52.47580, 13.45500],
    [52.47560, 13.45495]
  ];

  // 2. The Hall
  const HALL_FOOTPRINT: [number, number][] = [
    [52.47495, 13.45730],
    [52.47515, 13.45730],
    [52.47515, 13.45755],
    [52.47495, 13.45755]
  ];

  // 3. The Cube
  const CUBE_FOOTPRINT: [number, number][] = [
    [52.47505, 13.46810],
    [52.47525, 13.46810],
    [52.47525, 13.46830],
    [52.47505, 13.46830]
  ];

  onMount(async () => {
    if (!browser) return;

    // ── Load Leaflet 1.9.4 from CDN (bypasses the outdated v0.7.3 in node_modules) ──
    await loadLeafletFromCDN();
    L = (window as any).L;
    if (!L) {
      console.error('[MapOverlay] Leaflet failed to load from CDN');
      return;
    }

    // Fix default marker icon paths broken by Vite asset hashing
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    // Initialize Leaflet Map
    map = L.map(mapElement, {
      center: CAMPUS_CENTER,
      zoom: 17,
      maxBounds: MAP_BOUNDS,
      minZoom: 15,
      zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Dark Mode Tile Layer — CartoDB Dark Matter (no subdomains required)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Create Layer Groups
    footprintLayerGroup = L.layerGroup().addTo(map);
    roomLayerGroup      = L.layerGroup().addTo(map);
    routeLayerGroup     = L.layerGroup().addTo(map);
    markerLayerGroup    = L.layerGroup().addTo(map);

    drawBuildingFootprints();
    updateMapState();
  });

  /**
   * Injects Leaflet 1.9.4 CSS + JS from unpkg CDN into the document head,
   * only once. Returns a promise that resolves once the script is loaded.
   */
  function loadLeafletFromCDN(): Promise<void> {
    return new Promise((resolve, reject) => {
      // If already loaded, resolve immediately
      if ((window as any).L && (window as any).L.version?.startsWith('1.')) {
        resolve();
        return;
      }

      // Inject CSS
      if (!document.querySelector('link[data-leaflet-cdn]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.setAttribute('data-leaflet-cdn', '1');
        document.head.appendChild(link);
      }

      // Inject JS
      if (!document.querySelector('script[data-leaflet-cdn]')) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.setAttribute('data-leaflet-cdn', '1');
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Leaflet from CDN'));
        document.head.appendChild(script);
      } else {
        // Script tag exists but may still be loading — poll for L
        const poll = setInterval(() => {
          if ((window as any).L) { clearInterval(poll); resolve(); }
        }, 50);
      }
    });
  }

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });

  function drawBuildingFootprints() {
    if (!L || !footprintLayerGroup) return;

    // SHED Footprint Style
    L.polygon(SHED_FOOTPRINT, {
      color: '#00f2fe',
      weight: 2,
      fillColor: '#1e293b',
      fillOpacity: 0.35,
      dashArray: '4, 4'
    }).addTo(footprintLayerGroup).bindTooltip('The SHED (A, B, C, D)', { sticky: true, className: 'custom-map-tooltip' });

    // HALL Footprint Style
    L.polygon(HALL_FOOTPRINT, {
      color: '#3b82f6',
      weight: 2,
      fillColor: '#1e293b',
      fillOpacity: 0.35,
      dashArray: '4, 4'
    }).addTo(footprintLayerGroup).bindTooltip('The HALL', { sticky: true, className: 'custom-map-tooltip' });

    // CUBE Footprint Style
    L.polygon(CUBE_FOOTPRINT, {
      color: '#a855f7',
      weight: 2,
      fillColor: '#1e293b',
      fillOpacity: 0.35,
      dashArray: '4, 4'
    }).addTo(footprintLayerGroup).bindTooltip('The CUBE', { sticky: true, className: 'custom-map-tooltip' });
  }

  // Draw rooms and route whenever floor or active route changes
  function updateMapState() {
    if (!L || !map) return;

    // Clear dynamic layers
    roomLayerGroup.clearLayers();
    routeLayerGroup.clearLayers();
    markerLayerGroup.clearLayers();

    // 1. Draw Rooms on the Active Floor
    const activeRooms = ROOMS.filter(r => r.floor === activeFloor);
    activeRooms.forEach(room => {
      const isSelected = room.id === selectedRoomId;
      const isStart = room.id === startRoomId;
      const isEnd = room.id === endRoomId;

      let color = '#475569'; // default slate
      let radius = 6;
      let fillOpacity = 0.6;

      if (isSelected) {
        color = '#00f2fe'; // neon cyan
        radius = 8;
        fillOpacity = 0.9;
      } else if (isStart) {
        color = '#22c55e'; // green
        radius = 8;
        fillOpacity = 0.9;
      } else if (isEnd) {
        color = '#ef4444'; // red
        radius = 8;
        fillOpacity = 0.9;
      } else {
        // Categorized room styling
        if (room.type === 'seminar') color = '#3b82f6'; // blue
        else if (room.type === 'lab') color = '#a855f7'; // purple
        else if (room.type === 'office') color = '#eab308'; // yellow
        else if (room.type === 'social') color = '#ec4899'; // pink
      }

      // Draw stylized glowing circles for rooms
      const marker = L.circleMarker(room.coords, {
        radius,
        fillColor: color,
        color: isSelected ? '#ffffff' : '#0f172a',
        weight: isSelected ? 2 : 1,
        opacity: 1,
        fillOpacity
      }).addTo(roomLayerGroup);

      // Room click selection
      marker.on('click', () => {
        selectedRoomId = room.id;
      });

      // Tooltip label
      marker.bindTooltip(`<strong>${room.id}</strong>: ${room.name}`, {
        className: 'custom-room-tooltip',
        direction: 'top',
        offset: [0, -5]
      });
    });

    // 2. Draw Start/Destination Indicators
    if (startRoomId) {
      const startRoom = ROOMS.find(r => r.id === startRoomId);
      if (startRoom && startRoom.floor === activeFloor) {
        L.marker(startRoom.coords, {
          icon: L.divIcon({
            html: `<div class="pulse-marker green-pulse"><i class="ph-bold ph-map-pin"></i></div>`,
            className: 'custom-div-icon',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        }).addTo(markerLayerGroup);
      }
    }

    if (endRoomId) {
      const endRoom = ROOMS.find(r => r.id === endRoomId);
      if (endRoom && endRoom.floor === activeFloor) {
        L.marker(endRoom.coords, {
          icon: L.divIcon({
            html: `<div class="pulse-marker red-pulse"><i class="ph-bold ph-flag-flagpole"></i></div>`,
            className: 'custom-div-icon',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        }).addTo(markerLayerGroup);
      }
    }

    // 3. Draw Active Pathfinder Route (Sleek animated neon polyline)
    if (activeRoute && activeRoute.path && activeRoute.path.length > 1) {
      const pathNodes: NavigationNode[] = activeRoute.path;
      
      // Separate route segments by floor to only render the segment on the active floor
      const activeFloorSegments: [number, number][][] = [];
      let currentSegment: [number, number][] = [];

      for (let i = 0; i < pathNodes.length; i++) {
        const node = pathNodes[i];
        if (node.floor === activeFloor) {
          currentSegment.push(node.coords);
        } else {
          if (currentSegment.length > 1) {
            activeFloorSegments.push(currentSegment);
          }
          currentSegment = [];
        }
      }
      if (currentSegment.length > 1) {
        activeFloorSegments.push(currentSegment);
      }

      // Draw actual path segments on this floor
      activeFloorSegments.forEach(segment => {
        // Glowing Background Line
        L.polyline(segment, {
          color: '#00f2fe',
          weight: 7,
          opacity: 0.35
        }).addTo(routeLayerGroup);

        // Core Glowing Line
        L.polyline(segment, {
          color: '#00f2fe',
          weight: 4,
          opacity: 0.9,
          dashArray: '8, 8',
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(routeLayerGroup);
      });

      // Highlight floor transition nodes (Stairs/Elevator) that are active in route
      pathNodes.forEach((node, idx) => {
        if (node.floor === activeFloor && (node.type === 'elevator' || node.type === 'stairs')) {
          let iconHtml = '';
          let colorClass = 'blue-pulse';
          let iconClass = 'ph-arrow-up-down';

          if (node.type === 'elevator') {
            iconHtml = `<i class="ph-bold ph-elevator"></i>`;
            colorClass = 'purple-pulse';
          } else {
            iconHtml = `<i class="ph-bold ph-stairs"></i>`;
            colorClass = 'orange-pulse';
          }

          L.marker(node.coords, {
            icon: L.divIcon({
              html: `<div class="pulse-marker ${colorClass}">${iconHtml}</div>`,
              className: 'custom-div-icon',
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            })
          }).addTo(markerLayerGroup)
            .bindTooltip(`Use ${node.label} to change floors`, { className: 'custom-map-tooltip' });
        }
      });
    }
  }

  // React to prop changes using Svelte 5 effects
  $effect(() => {
    // Rely on these state dependencies:
    activeFloor;
    selectedRoomId;
    startRoomId;
    endRoomId;
    activeRoute;

    // Trigger map updates
    updateMapState();
  });
</script>

<div class="map-wrapper">
  <div bind:this={mapElement} class="campus-map"></div>
</div>

<style>
  .map-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .campus-map {
    width: 100%;
    height: 100%;
    background-color: #0f172a;
  }

  /* Custom Leaflet Tooltips & Overlays styles */
  :global(.custom-map-tooltip) {
    background-color: rgba(15, 23, 42, 0.95) !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    color: #e2e8f0 !important;
    font-family: 'Inter', sans-serif !important;
    font-weight: 500 !important;
    border-radius: 0.375rem !important;
    padding: 0.25rem 0.5rem !important;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important;
  }

  :global(.custom-room-tooltip) {
    background-color: rgba(15, 23, 42, 0.95) !important;
    border: 1px solid var(--primary-color, #00f2fe) !important;
    color: #e2e8f0 !important;
    font-family: 'Inter', sans-serif !important;
    font-size: 0.75rem !important;
    border-radius: 0.375rem !important;
    padding: 0.15rem 0.35rem !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3) !important;
  }

  /* DivIcon markers styling */
  :global(.custom-div-icon) {
    background: transparent !important;
    border: none !important;
  }

  :global(.pulse-marker) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    color: white;
    font-size: 1.1rem;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
    border: 2px solid white;
  }

  :global(.green-pulse) {
    background-color: #22c55e;
    animation: pulse-green 2s infinite;
  }

  :global(.red-pulse) {
    background-color: #ef4444;
    animation: pulse-red 2s infinite;
  }

  :global(.blue-pulse) {
    background-color: #3b82f6;
    animation: pulse-blue 2s infinite;
  }

  :global(.purple-pulse) {
    background-color: #a855f7;
    animation: pulse-purple 2s infinite;
  }

  :global(.orange-pulse) {
    background-color: #f97316;
    animation: pulse-orange 2s infinite;
  }

  @keyframes pulse-green {
    0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
    100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
  }

  @keyframes pulse-red {
    0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
    100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  }

  @keyframes pulse-blue {
    0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); }
    100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
  }

  @keyframes pulse-purple {
    0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(168, 85, 247, 0); }
    100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); }
  }

  @keyframes pulse-orange {
    0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); }
    100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
  }
</style>
