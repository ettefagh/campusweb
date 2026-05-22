import { getFullNodesAndEdges, type NavigationNode, type NavigationEdge } from '../data/campusData';

export interface RouteStep {
  type: 'start' | 'walk' | 'stairs' | 'elevator' | 'door' | 'end';
  text: string;
  distance?: number;
  fromFloor?: number;
  toFloor?: number;
}

export interface RouteResult {
  path: NavigationNode[];
  totalDistance: number;
  steps: RouteStep[];
}

/**
 * Calculates the shortest path between two campus locations using Dijkstra's algorithm.
 * Supports accessible routing (wheelchair-friendly) which avoids stairs.
 */
export function calculateRoute(
  startId: string,
  endId: string,
  requireAccessible: boolean = false
): RouteResult | null {
  const { nodes, edges } = getFullNodesAndEdges();

  // Create lookup maps
  const nodeMap = new Map<string, NavigationNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const startNode = nodeMap.get(startId);
  const endNode = nodeMap.get(endId);

  if (!startNode || !endNode) {
    console.error(`Start (${startId}) or End (${endId}) node not found in campus database.`);
    return null;
  }

  // If start and end are the same
  if (startId === endId) {
    return {
      path: [startNode],
      totalDistance: 0,
      steps: [{ type: 'start', text: `You are already at ${startNode.label || startNode.id}.` }]
    };
  }

  // Build Adjacency List
  const adj = new Map<string, NavigationEdge[]>();
  nodes.forEach(n => adj.set(n.id, []));
  
  edges.forEach(edge => {
    // Skip non-accessible edges if accessible route is requested
    if (requireAccessible && !edge.accessible) {
      return;
    }

    // Bidirectional graph
    const fromEdges = adj.get(edge.from) || [];
    fromEdges.push(edge);
    adj.set(edge.from, fromEdges);

    const toEdges = adj.get(edge.to) || [];
    toEdges.push({
      from: edge.to,
      to: edge.from,
      weight: edge.weight,
      accessible: edge.accessible
    });
    adj.set(edge.to, toEdges);
  });

  // Dijkstra's State variables
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  nodes.forEach(n => {
    distances.set(n.id, Infinity);
    previous.set(n.id, null);
    unvisited.add(n.id);
  });

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    // Find node with minimum distance in unvisited set
    let minNodeId: string | null = null;
    let minDistance = Infinity;

    unvisited.forEach(nodeId => {
      const dist = distances.get(nodeId) ?? Infinity;
      if (dist < minDistance) {
        minDistance = dist;
        minNodeId = nodeId;
      }
    });

    if (minNodeId === null || minDistance === Infinity) {
      break; // All reachable nodes visited
    }

    if (minNodeId === endId) {
      break; // Found destination!
    }

    unvisited.delete(minNodeId);

    // Relax neighbors
    const neighbors = adj.get(minNodeId) || [];
    for (const edge of neighbors) {
      if (!unvisited.has(edge.to)) continue;

      const alt = minDistance + edge.weight;
      const currentDist = distances.get(edge.to) ?? Infinity;
      if (alt < currentDist) {
        distances.set(edge.to, alt);
        previous.set(edge.to, minNodeId);
      }
    }
  }

  // Reconstruct path
  const pathIds: string[] = [];
  let curr: string | null = endId;

  while (curr !== null) {
    pathIds.unshift(curr);
    curr = previous.get(curr) ?? null;
  }

  // If path reconstruction failed to connect to start
  if (pathIds[0] !== startId) {
    return null; // Route not found (disconnected graph under constraints)
  }

  // Build path node details
  const pathNodes = pathIds.map(id => nodeMap.get(id) as NavigationNode);
  const totalDistance = distances.get(endId) || 0;

  // Build Step-by-Step Instructions
  const steps: RouteStep[] = [];
  steps.push({
    type: 'start',
    text: `Start from ${startNode.label || startNode.id}`
  });

  for (let i = 0; i < pathNodes.length - 1; i++) {
    const current = pathNodes[i];
    const next = pathNodes[i + 1];

    // Find the edge weight
    const edgesList = adj.get(current.id) || [];
    const edge = edgesList.find(e => e.to === next.id);
    const distance = edge ? edge.weight : 0;

    // Detect transitions
    if (current.type === 'elevator' && next.type === 'elevator' && current.floor !== next.floor) {
      steps.push({
        type: 'elevator',
        text: `Take the elevator from Floor ${formatFloor(current.floor)} to Floor ${formatFloor(next.floor)}`,
        fromFloor: current.floor,
        toFloor: next.floor
      });
    } else if (current.type === 'stairs' && next.type === 'stairs' && current.floor !== next.floor) {
      steps.push({
        type: 'stairs',
        text: `Take the stairs from Floor ${formatFloor(current.floor)} to Floor ${formatFloor(next.floor)}`,
        fromFloor: current.floor,
        toFloor: next.floor
      });
    } else {
      // Normal floor traversal or room entry
      let text = '';
      if (next.type === 'room') {
        text = `Enter ${next.label || next.id}`;
      } else if (next.type === 'door') {
        text = `Go through the door to ${next.label || next.id}`;
      } else {
        text = `Walk ${distance}m towards ${next.label || next.id}`;
      }

      steps.push({
        type: next.type === 'room' ? 'end' : next.type === 'door' ? 'door' : 'walk',
        text,
        distance
      });
    }
  }

  // Consolidate consecutive walk steps on the same floor to make instructions more readable
  const consolidatedSteps: RouteStep[] = [];
  consolidatedSteps.push(steps[0]);

  let walkAccumulator = 0;
  for (let i = 1; i < steps.length; i++) {
    const step = steps[i];
    if (step.type === 'walk') {
      walkAccumulator += step.distance || 0;
    } else {
      if (walkAccumulator > 0) {
        consolidatedSteps.push({
          type: 'walk',
          text: `Walk ${walkAccumulator}m along the corridor`,
          distance: walkAccumulator
        });
        walkAccumulator = 0;
      }
      consolidatedSteps.push(step);
    }
  }
  if (walkAccumulator > 0) {
    consolidatedSteps.push({
      type: 'walk',
      text: `Walk ${walkAccumulator}m along the corridor`,
      distance: walkAccumulator
    });
  }

  return {
    path: pathNodes,
    totalDistance,
    steps: consolidatedSteps
  };
}

function formatFloor(floor: number): string {
  if (floor === -1) return 'S (Basement)';
  if (floor === 0) return 'Ground Floor';
  if (floor === 1) return '1st Floor';
  if (floor === 2) return '2nd Floor';
  return `${floor}th Floor`;
}
