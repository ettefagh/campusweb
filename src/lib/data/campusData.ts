export interface Room {
  id: string;
  name: string;
  building: string;
  section?: string;
  floor: number; // -1 for S/Basement, 0 for Ground, 1 for 1st, 2 for 2nd
  type: 'seminar' | 'office' | 'lab' | 'service' | 'social' | 'other';
  coords: [number, number];
}

export interface NavigationNode {
  id: string;
  floor: number;
  building: string;
  coords: [number, number];
  type: 'room' | 'corridor' | 'stairs' | 'elevator' | 'door';
  label: string;
}

export interface NavigationEdge {
  from: string;
  to: string;
  weight: number;      // Distance in meters
  accessible: boolean; // Accessible via wheelchair/elevator?
}

// Building Base Coordinates from src/lib/ical-enhancer.ts
export const BUILDING_COORDS = {
  SHED_A: [52.4758038, 13.4549394] as [number, number],
  SHED_B: [52.4758038, 13.4549394] as [number, number],
  SHED_C: [52.4760266, 13.4549741] as [number, number],
  SHED_D: [52.4762398, 13.4550747] as [number, number],
  CUBE: [52.475147, 13.468200] as [number, number],
  HALL: [52.475064, 13.457422] as [number, number]
};

// Complete Room list parsed from page 1 and page 2 maps
export const ROOMS: Room[] = [
  // --- THE SHED SECTION A ---
  // Floor -1 (S)
  { id: 'AS.01', name: 'Community Space', building: 'The SHED', section: 'A', floor: -1, type: 'social', coords: [52.47575, 13.45480] },
  { id: 'AS.03', name: 'Creative Space', building: 'The SHED', section: 'A', floor: -1, type: 'social', coords: [52.47576, 13.45483] },
  { id: 'AS.06', name: 'Seminar Room', building: 'The SHED', section: 'A', floor: -1, type: 'seminar', coords: [52.47578, 13.45485] },
  { id: 'AS.07', name: 'Seminar Room', building: 'The SHED', section: 'A', floor: -1, type: 'seminar', coords: [52.47579, 13.45487] },
  { id: 'AS.08', name: 'Conference Room', building: 'The SHED', section: 'A', floor: -1, type: 'office', coords: [52.47580, 13.45489] },
  // Floor 0
  { id: 'A0.01', name: 'Broadcast Studio', building: 'The SHED', section: 'A', floor: 0, type: 'lab', coords: [52.47576, 13.45490] },
  { id: 'A0.02', name: 'Meeting Room', building: 'The SHED', section: 'A', floor: 0, type: 'office', coords: [52.47577, 13.45492] },
  { id: 'A0.03', name: 'Seminar A0.03', building: 'The SHED', section: 'A', floor: 0, type: 'seminar', coords: [52.47579, 13.45494] },
  { id: 'A0.04', name: 'Seminar A0.04', building: 'The SHED', section: 'A', floor: 0, type: 'seminar', coords: [52.47580, 13.45495] },
  { id: 'A0.05', name: 'Seminar A0.05', building: 'The SHED', section: 'A', floor: 0, type: 'seminar', coords: [52.47581, 13.45496] },
  { id: 'A0.06', name: 'Working Space', building: 'The SHED', section: 'A', floor: 0, type: 'office', coords: [52.47582, 13.45498] },
  // Floor 1
  { id: 'A1.01', name: 'Meeting Room 101', building: 'The SHED', section: 'A', floor: 1, type: 'office', coords: [52.47575, 13.45488] },
  { id: 'A1.02', name: 'Meeting Room 102', building: 'The SHED', section: 'A', floor: 1, type: 'office', coords: [52.47576, 13.45490] },
  { id: 'A1.03', name: 'Meeting Room 103', building: 'The SHED', section: 'A', floor: 1, type: 'office', coords: [52.47577, 13.45491] },
  { id: 'A1.04', name: 'Meeting Room 104', building: 'The SHED', section: 'A', floor: 1, type: 'office', coords: [52.47578, 13.45492] },
  { id: 'A1.05', name: 'Meeting Room 105', building: 'The SHED', section: 'A', floor: 1, type: 'office', coords: [52.47579, 13.45493] },
  { id: 'A1.09', name: 'Mail / Storage', building: 'The SHED', section: 'A', floor: 1, type: 'service', coords: [52.47582, 13.45496] },
  { id: 'A1.10', name: 'Meeting Room 110', building: 'The SHED', section: 'A', floor: 1, type: 'office', coords: [52.47583, 13.45497] },
  { id: 'A1.11', name: 'Meeting Room 111', building: 'The SHED', section: 'A', floor: 1, type: 'office', coords: [52.47584, 13.45498] },
  { id: 'A1.12', name: 'Meeting Room 112', building: 'The SHED', section: 'A', floor: 1, type: 'office', coords: [52.47585, 13.45499] },
  { id: 'A1.13', name: 'Meeting Room 113', building: 'The SHED', section: 'A', floor: 1, type: 'office', coords: [52.47586, 13.45500] },

  // --- THE SHED SECTION B ---
  // Floor 0
  { id: 'B0.07', name: 'Seminar Room B07', building: 'The SHED', section: 'B', floor: 0, type: 'seminar', coords: [52.47588, 13.45480] },
  { id: 'B0.08', name: 'Seminar Room B08', building: 'The SHED', section: 'B', floor: 0, type: 'seminar', coords: [52.47589, 13.45481] },
  { id: 'B0.09', name: 'Seminar Room B09', building: 'The SHED', section: 'B', floor: 0, type: 'seminar', coords: [52.47590, 13.45482] },
  { id: 'B0.10', name: 'Seminar Room B10', building: 'The SHED', section: 'B', floor: 0, type: 'seminar', coords: [52.47591, 13.45483] },
  { id: 'B0.11', name: 'Seminar Room B11', building: 'The SHED', section: 'B', floor: 0, type: 'seminar', coords: [52.47592, 13.45484] },
  { id: 'B0.12', name: 'Media Technology', building: 'The SHED', section: 'B', floor: 0, type: 'lab', coords: [52.47594, 13.45486] },
  { id: 'B0.13', name: 'Studio Film', building: 'The SHED', section: 'B', floor: 0, type: 'lab', coords: [52.47595, 13.45488] },
  { id: 'B0.14', name: 'Studio Photo', building: 'The SHED', section: 'B', floor: 0, type: 'lab', coords: [52.47596, 13.45490] },
  { id: 'B0.15', name: 'Studio Film / Photo', building: 'The SHED', section: 'B', floor: 0, type: 'lab', coords: [52.47597, 13.45492] },
  // Floor 1
  { id: 'B1.14', name: 'Meeting Room B14', building: 'The SHED', section: 'B', floor: 1, type: 'office', coords: [52.47589, 13.45486] },
  { id: 'B1.15', name: 'Meeting Room B15', building: 'The SHED', section: 'B', floor: 1, type: 'office', coords: [52.47590, 13.45487] },
  { id: 'B1.16', name: 'Meeting Room B16', building: 'The SHED', section: 'B', floor: 1, type: 'office', coords: [52.47591, 13.45488] },
  { id: 'B1.17', name: 'Meeting Room B17', building: 'The SHED', section: 'B', floor: 1, type: 'office', coords: [52.47592, 13.45489] },
  { id: 'B1.18', name: 'Meeting Room B18', building: 'The SHED', section: 'B', floor: 1, type: 'office', coords: [52.47593, 13.45490] },
  { id: 'B1.19', name: 'Meeting Room B19', building: 'The SHED', section: 'B', floor: 1, type: 'office', coords: [52.47594, 13.45491] },

  // --- THE SHED SECTION C ---
  // Floor 0
  { id: 'C0.16', name: 'AVM / Sound 16', building: 'The SHED', section: 'C', floor: 0, type: 'lab', coords: [52.47600, 13.45485] },
  { id: 'C0.27', name: 'Mechatronic Lab', building: 'The SHED', section: 'C', floor: 0, type: 'lab', coords: [52.47603, 13.45490] },
  { id: 'C0.28', name: 'Energy Flex Lab', building: 'The SHED', section: 'C', floor: 0, type: 'lab', coords: [52.47605, 13.45492] },
  { id: 'C0.29', name: 'Practice Room 29', building: 'The SHED', section: 'C', floor: 0, type: 'seminar', coords: [52.47608, 13.45494] },
  { id: 'C0.30', name: 'Practice Room 30', building: 'The SHED', section: 'C', floor: 0, type: 'seminar', coords: [52.47609, 13.45496] },
  // Floor 1
  { id: 'C1.20', name: 'Design Studio 20', building: 'The SHED', section: 'C', floor: 1, type: 'seminar', coords: [52.47598, 13.45490] },
  { id: 'C1.21', name: 'Editing Room 21', building: 'The SHED', section: 'C', floor: 1, type: 'lab', coords: [52.47600, 13.45491] },
  { id: 'C1.22', name: 'Editing Room 22', building: 'The SHED', section: 'C', floor: 1, type: 'lab', coords: [52.47601, 13.45492] },
  { id: 'C1.23', name: 'Studio / Atelier 23', building: 'The SHED', section: 'C', floor: 1, type: 'lab', coords: [52.47602, 13.45493] },
  { id: 'C1.24', name: 'Studio / Atelier 24', building: 'The SHED', section: 'C', floor: 1, type: 'lab', coords: [52.47603, 13.45494] },
  { id: 'C1.26', name: 'Editing Booth 26', building: 'The SHED', section: 'C', floor: 1, type: 'lab', coords: [52.47605, 13.45495] },
  { id: 'C1.27', name: 'Darkroom', building: 'The SHED', section: 'C', floor: 1, type: 'lab', coords: [52.47606, 13.45496] },
  { id: 'C1.28', name: 'Editing Booth 28', building: 'The SHED', section: 'C', floor: 1, type: 'lab', coords: [52.47607, 13.45497] },
  { id: 'C1.29', name: 'Editing Booth 29', building: 'The SHED', section: 'C', floor: 1, type: 'lab', coords: [52.47608, 13.45498] },
  { id: 'C1.30', name: 'Editing Booth 30', building: 'The SHED', section: 'C', floor: 1, type: 'lab', coords: [52.47609, 13.45499] },
  { id: 'C1.31', name: 'Development Lab', building: 'The SHED', section: 'C', floor: 1, type: 'lab', coords: [52.47611, 13.45501] },
  { id: 'C1.32', name: 'Workspace / Printer', building: 'The SHED', section: 'C', floor: 1, type: 'service', coords: [52.47612, 13.45502] },
  { id: 'C1.33', name: 'Post Production', building: 'The SHED', section: 'C', floor: 1, type: 'lab', coords: [52.47614, 13.45504] },
  { id: 'C1.34', name: 'Design Studio 34', building: 'The SHED', section: 'C', floor: 1, type: 'seminar', coords: [52.47615, 13.45505] },
  { id: 'C1.35', name: 'Data Lab', building: 'The SHED', section: 'C', floor: 1, type: 'lab', coords: [52.47616, 13.45506] },
  { id: 'C1.36', name: 'Editing Room 36', building: 'The SHED', section: 'C', floor: 1, type: 'lab', coords: [52.47617, 13.45507] },
  { id: 'C1.37', name: 'Editing Room 37', building: 'The SHED', section: 'C', floor: 1, type: 'lab', coords: [52.47618, 13.45508] },

  // --- THE SHED SECTION D ---
  // Floor 0
  { id: 'D0.31', name: 'Tinker Lab', building: 'The SHED', section: 'D', floor: 0, type: 'lab', coords: [52.47620, 13.45500] },
  { id: 'D0.32', name: 'Seminar D32', building: 'The SHED', section: 'D', floor: 0, type: 'seminar', coords: [52.47622, 13.45502] },
  { id: 'D0.33', name: 'Robotic Lab', building: 'The SHED', section: 'D', floor: 0, type: 'lab', coords: [52.47624, 13.45504] },
  { id: 'D0.34', name: 'Automotive Lab', building: 'The SHED', section: 'D', floor: 0, type: 'lab', coords: [52.47626, 13.45506] },
  { id: 'D0.35', name: 'Rehearsal Stage', building: 'The SHED', section: 'D', floor: 0, type: 'social', coords: [52.47628, 13.45508] },
  // Floor 1
  { id: 'D1.38', name: 'IT Solutions', building: 'The SHED', section: 'D', floor: 1, type: 'service', coords: [52.47621, 13.45502] },
  { id: 'D1.39', name: 'BTZ Office 39', building: 'The SHED', section: 'D', floor: 1, type: 'office', coords: [52.47623, 13.45504] },
  { id: 'D1.40', name: 'BTZ Office 40', building: 'The SHED', section: 'D', floor: 1, type: 'office', coords: [52.47624, 13.45505] },
  { id: 'D1.41', name: 'BTZ Office 41', building: 'The SHED', section: 'D', floor: 1, type: 'office', coords: [52.47625, 13.45506] },
  { id: 'D1.42', name: 'BTZ Office 42', building: 'The SHED', section: 'D', floor: 1, type: 'office', coords: [52.47626, 13.45507] },
  { id: 'D1.43', name: 'Seminar D43', building: 'The SHED', section: 'D', floor: 1, type: 'seminar', coords: [52.47627, 13.45508] },
  { id: 'D1.44', name: 'Seminar D44', building: 'The SHED', section: 'D', floor: 1, type: 'seminar', coords: [52.47628, 13.45509] },
  { id: 'D1.45', name: 'Your Service Desk', building: 'The SHED', section: 'D', floor: 1, type: 'service', coords: [52.47630, 13.45511] },
  { id: 'D1.46', name: 'Music Room 46', building: 'The SHED', section: 'D', floor: 1, type: 'lab', coords: [52.47632, 13.45513] },
  { id: 'D1.47', name: 'Music Room 47', building: 'The SHED', section: 'D', floor: 1, type: 'lab', coords: [52.47633, 13.45514] },
  { id: 'D1.48', name: 'Music Room 48', building: 'The SHED', section: 'D', floor: 1, type: 'lab', coords: [52.47634, 13.45515] },
  { id: 'D1.49', name: 'Sequencing Room 49', building: 'The SHED', section: 'D', floor: 1, type: 'lab', coords: [52.47636, 13.45517] },
  { id: 'D1.50', name: 'Sequencing Room 50', building: 'The SHED', section: 'D', floor: 1, type: 'lab', coords: [52.47637, 13.45518] },
  { id: 'D1.51', name: 'Sequencing Room 51', building: 'The SHED', section: 'D', floor: 1, type: 'lab', coords: [52.47638, 13.45519] },

  // --- THE CUBE ---
  // Floor 0
  { id: 'Cube-0.01', name: 'Community Space', building: 'The Cube', floor: 0, type: 'social', coords: [52.47510, 13.46815] },
  { id: 'Cube-0.02', name: 'Stage', building: 'The Cube', floor: 0, type: 'social', coords: [52.47512, 13.46818] },
  { id: 'Cube-0.03', name: 'Community Space 0.03', building: 'The Cube', floor: 0, type: 'social', coords: [52.47514, 13.46820] },
  { id: 'Cube-0.05', name: 'Storage Bar', building: 'The Cube', floor: 0, type: 'service', coords: [52.47517, 13.46823] },
  { id: 'Cube-0.06', name: 'Furniture Store', building: 'The Cube', floor: 0, type: 'service', coords: [52.47519, 13.46825] },
  { id: 'Cube-0.07', name: 'Green Room', building: 'The Cube', floor: 0, type: 'social', coords: [52.47521, 13.46827] },
  // Floor 1
  { id: 'Cube-1.01', name: 'Writing Center', building: 'The Cube', floor: 1, type: 'service', coords: [52.47511, 13.46816] },
  { id: 'Cube-1.02', name: 'Seminar Cube-1.02', building: 'The Cube', floor: 1, type: 'seminar', coords: [52.47513, 13.46818] },
  { id: 'Cube-1.03', name: 'Seminar Cube-1.03', building: 'The Cube', floor: 1, type: 'seminar', coords: [52.47514, 13.46819] },
  { id: 'Cube-1.04', name: 'Sound and Video Control', building: 'The Cube', floor: 1, type: 'lab', coords: [52.47516, 13.46822] },
  { id: 'Cube-1.05', name: 'Seminar Cube-1.05', building: 'The Cube', floor: 1, type: 'seminar', coords: [52.47518, 13.46824] },
  { id: 'Cube-1.06', name: 'Seminar Cube-1.06', building: 'The Cube', floor: 1, type: 'seminar', coords: [52.47519, 13.46825] },
  { id: 'Cube-1.07', name: 'Seminar Cube-1.07', building: 'The Cube', floor: 1, type: 'seminar', coords: [52.47520, 13.46826] },
  // Floor 2
  { id: 'Cube-2.01', name: 'Library', building: 'The Cube', floor: 2, type: 'service', coords: [52.47515, 13.46820] },

  // --- THE HALL ---
  // Floor 1
  { id: 'Hall-1.01', name: 'Design Thinking Lab', building: 'The Hall', floor: 1, type: 'lab', coords: [52.47504, 13.45740] },
  { id: 'Hall-1.02', name: 'Seminar Hall-1.02', building: 'The Hall', floor: 1, type: 'seminar', coords: [52.47506, 13.45742] },
  // Floor 2
  { id: 'Hall-2.01', name: 'Seminar Hall-2.01', building: 'The Hall', floor: 2, type: 'seminar', coords: [52.47505, 13.45741] },
  { id: 'Hall-2.02', name: 'Seminar Hall-2.02', building: 'The Hall', floor: 2, type: 'seminar', coords: [52.47507, 13.45743] },
  { id: 'Hall-2.03', name: 'Seminar Hall-2.03', building: 'The Hall', floor: 2, type: 'seminar', coords: [52.47508, 13.45744] }
];

// Graph Nodes representing points in corridors, lift hubs, stairs and doors
export const GRAPH_NODES: NavigationNode[] = [
  // --- Nodes inside The SHED ---
  // Floor 0
  { id: 'node-shed0-lobby-a', floor: 0, building: 'The SHED', coords: [52.47576, 13.45492], type: 'corridor', label: 'Section A Corridor Lobby' },
  { id: 'node-shed0-elevator-a', floor: 0, building: 'The SHED', coords: [52.47578, 13.45491], type: 'elevator', label: 'Section A Elevator' },
  { id: 'node-shed0-stairs-a', floor: 0, building: 'The SHED', coords: [52.47579, 13.45490], type: 'stairs', label: 'Section A Stairs' },
  { id: 'node-shed0-corridor-ab', floor: 0, building: 'The SHED', coords: [52.47585, 13.45488], type: 'corridor', label: 'Corridor A-B Link' },
  { id: 'node-shed0-lobby-b', floor: 0, building: 'The SHED', coords: [52.47592, 13.45486], type: 'corridor', label: 'Section B Corridor Lobby' },
  { id: 'node-shed0-elevator-b', floor: 0, building: 'The SHED', coords: [52.47594, 13.45485], type: 'elevator', label: 'Section B Elevator' },
  { id: 'node-shed0-stairs-b', floor: 0, building: 'The SHED', coords: [52.47595, 13.45484], type: 'stairs', label: 'Section B Stairs' },
  { id: 'node-shed0-corridor-bc', floor: 0, building: 'The SHED', coords: [52.47598, 13.45488], type: 'corridor', label: 'Corridor B-C Link' },
  { id: 'node-shed0-lobby-c', floor: 0, building: 'The SHED', coords: [52.47604, 13.45492], type: 'corridor', label: 'Section C Corridor Lobby' },
  { id: 'node-shed0-elevator-c', floor: 0, building: 'The SHED', coords: [52.47606, 13.45491], type: 'elevator', label: 'Section C Elevator' },
  { id: 'node-shed0-stairs-c', floor: 0, building: 'The SHED', coords: [52.47607, 13.45490], type: 'stairs', label: 'Section C Stairs' },
  { id: 'node-shed0-corridor-cd', floor: 0, building: 'The SHED', coords: [52.47615, 13.45496], type: 'corridor', label: 'Corridor C-D Link' },
  { id: 'node-shed0-lobby-d', floor: 0, building: 'The SHED', coords: [52.47624, 13.45502], type: 'corridor', label: 'Section D Corridor Lobby' },
  { id: 'node-shed0-elevator-d', floor: 0, building: 'The SHED', coords: [52.47626, 13.45501], type: 'elevator', label: 'Section D Elevator' },
  { id: 'node-shed0-stairs-d', floor: 0, building: 'The SHED', coords: [52.47627, 13.45500], type: 'stairs', label: 'Section D Stairs' },

  // Floor 1
  { id: 'node-shed1-lobby-a', floor: 1, building: 'The SHED', coords: [52.47576, 13.45492], type: 'corridor', label: 'Section A Floor 1 Lobby' },
  { id: 'node-shed1-elevator-a', floor: 1, building: 'The SHED', coords: [52.47578, 13.45491], type: 'elevator', label: 'Section A Floor 1 Elevator' },
  { id: 'node-shed1-stairs-a', floor: 1, building: 'The SHED', coords: [52.47579, 13.45490], type: 'stairs', label: 'Section A Floor 1 Stairs' },
  { id: 'node-shed1-corridor-ab', floor: 1, building: 'The SHED', coords: [52.47585, 13.45488], type: 'corridor', label: 'Floor 1 Corridor A-B Link' },
  { id: 'node-shed1-lobby-b', floor: 1, building: 'The SHED', coords: [52.47592, 13.45486], type: 'corridor', label: 'Section B Floor 1 Lobby' },
  { id: 'node-shed1-elevator-b', floor: 1, building: 'The SHED', coords: [52.47594, 13.45485], type: 'elevator', label: 'Section B Floor 1 Elevator' },
  { id: 'node-shed1-stairs-b', floor: 1, building: 'The SHED', coords: [52.47595, 13.45484], type: 'stairs', label: 'Section B Floor 1 Stairs' },
  { id: 'node-shed1-corridor-bc', floor: 1, building: 'The SHED', coords: [52.47598, 13.45488], type: 'corridor', label: 'Floor 1 Corridor B-C Link' },
  { id: 'node-shed1-lobby-c', floor: 1, building: 'The SHED', coords: [52.47604, 13.45492], type: 'corridor', label: 'Section C Floor 1 Lobby' },
  { id: 'node-shed1-elevator-c', floor: 1, building: 'The SHED', coords: [52.47606, 13.45491], type: 'elevator', label: 'Section C Floor 1 Elevator' },
  { id: 'node-shed1-stairs-c', floor: 1, building: 'The SHED', coords: [52.47607, 13.45490], type: 'stairs', label: 'Section C Floor 1 Stairs' },
  { id: 'node-shed1-corridor-cd', floor: 1, building: 'The SHED', coords: [52.47615, 13.45496], type: 'corridor', label: 'Floor 1 Corridor C-D Link' },
  { id: 'node-shed1-lobby-d', floor: 1, building: 'The SHED', coords: [52.47624, 13.45502], type: 'corridor', label: 'Section D Floor 1 Lobby' },
  { id: 'node-shed1-elevator-d', floor: 1, building: 'The SHED', coords: [52.47626, 13.45501], type: 'elevator', label: 'Section D Floor 1 Elevator' },
  { id: 'node-shed1-stairs-d', floor: 1, building: 'The SHED', coords: [52.47627, 13.45500], type: 'stairs', label: 'Section D Floor 1 Stairs' },

  // Floor -1 (S) - Section A
  { id: 'node-sheds-lobby-a', floor: -1, building: 'The SHED', coords: [52.47576, 13.45480], type: 'corridor', label: 'Section A Basement Lobby' },
  { id: 'node-sheds-elevator-a', floor: -1, building: 'The SHED', coords: [52.47578, 13.45479], type: 'elevator', label: 'Section A Basement Elevator' },
  { id: 'node-sheds-stairs-a', floor: -1, building: 'The SHED', coords: [52.47579, 13.45478], type: 'stairs', label: 'Section A Basement Stairs' },

  // --- Nodes inside The CUBE ---
  { id: 'node-cube0-lobby', floor: 0, building: 'The Cube', coords: [52.47515, 13.46820], type: 'corridor', label: 'Cube Ground Lobby' },
  { id: 'node-cube0-elevator', floor: 0, building: 'The Cube', coords: [52.47513, 13.46821], type: 'elevator', label: 'Cube Ground Elevator' },
  { id: 'node-cube0-stairs', floor: 0, building: 'The Cube', coords: [52.47512, 13.46822], type: 'stairs', label: 'Cube Ground Stairs' },

  { id: 'node-cube1-lobby', floor: 1, building: 'The Cube', coords: [52.47515, 13.46820], type: 'corridor', label: 'Cube Floor 1 Lobby' },
  { id: 'node-cube1-elevator', floor: 1, building: 'The Cube', coords: [52.47513, 13.46821], type: 'elevator', label: 'Cube Floor 1 Elevator' },
  { id: 'node-cube1-stairs', floor: 1, building: 'The Cube', coords: [52.47512, 13.46822], type: 'stairs', label: 'Cube Floor 1 Stairs' },

  { id: 'node-cube2-lobby', floor: 2, building: 'The Cube', coords: [52.47515, 13.46820], type: 'corridor', label: 'Cube Floor 2 Lobby' },
  { id: 'node-cube2-elevator', floor: 2, building: 'The Cube', coords: [52.47513, 13.46821], type: 'elevator', label: 'Cube Floor 2 Elevator' },
  { id: 'node-cube2-stairs', floor: 2, building: 'The Cube', coords: [52.47512, 13.46822], type: 'stairs', label: 'Cube Floor 2 Stairs' },

  // --- Nodes inside The HALL ---
  { id: 'node-hall1-lobby', floor: 1, building: 'The Hall', coords: [52.47506, 13.45742], type: 'corridor', label: 'Hall Floor 1 Lobby' },
  { id: 'node-hall1-elevator', floor: 1, building: 'The Hall', coords: [52.47505, 13.45741], type: 'elevator', label: 'Hall Floor 1 Elevator' },
  { id: 'node-hall1-stairs', floor: 1, building: 'The Hall', coords: [52.47504, 13.45740], type: 'stairs', label: 'Hall Floor 1 Stairs' },

  { id: 'node-hall2-lobby', floor: 2, building: 'The Hall', coords: [52.47506, 13.45742], type: 'corridor', label: 'Hall Floor 2 Lobby' },
  { id: 'node-hall2-elevator', floor: 2, building: 'The Hall', coords: [52.47505, 13.45741], type: 'elevator', label: 'Hall Floor 2 Elevator' },
  { id: 'node-hall2-stairs', floor: 2, building: 'The Hall', coords: [52.47504, 13.45740], type: 'stairs', label: 'Hall Floor 2 Stairs' },

  // --- Main Campus Outdoors Ground Links ---
  { id: 'node-outdoor-shed-main', floor: 0, building: 'Outdoors', coords: [52.47570, 13.45500], type: 'corridor', label: 'SHED Main Square' },
  { id: 'node-outdoor-hall-main', floor: 0, building: 'Outdoors', coords: [52.47500, 13.45730], type: 'corridor', label: 'The Hall Entrance Square' },
  { id: 'node-outdoor-cube-main', floor: 0, building: 'Outdoors', coords: [52.47505, 13.46800], type: 'corridor', label: 'The Cube Entrance Square' }
];

// Topological Edges linking corridor nodes and connecting elevators/stairs across floors
export const GRAPH_EDGES: NavigationEdge[] = [
  // --- SHED Ground (Floor 0) Corridor Links ---
  { from: 'node-shed0-lobby-a', to: 'node-shed0-elevator-a', weight: 3, accessible: true },
  { from: 'node-shed0-lobby-a', to: 'node-shed0-stairs-a', weight: 4, accessible: true },
  { from: 'node-shed0-lobby-a', to: 'node-shed0-corridor-ab', weight: 15, accessible: true },
  
  { from: 'node-shed0-corridor-ab', to: 'node-shed0-lobby-b', weight: 15, accessible: true },
  { from: 'node-shed0-lobby-b', to: 'node-shed0-elevator-b', weight: 3, accessible: true },
  { from: 'node-shed0-lobby-b', to: 'node-shed0-stairs-b', weight: 4, accessible: true },
  { from: 'node-shed0-lobby-b', to: 'node-shed0-corridor-bc', weight: 10, accessible: true },
  
  { from: 'node-shed0-corridor-bc', to: 'node-shed0-lobby-c', weight: 10, accessible: true },
  { from: 'node-shed0-lobby-c', to: 'node-shed0-elevator-c', weight: 3, accessible: true },
  { from: 'node-shed0-lobby-c', to: 'node-shed0-stairs-c', weight: 4, accessible: true },
  { from: 'node-shed0-lobby-c', to: 'node-shed0-corridor-cd', weight: 20, accessible: true },
  
  { from: 'node-shed0-corridor-cd', to: 'node-shed0-lobby-d', weight: 20, accessible: true },
  { from: 'node-shed0-lobby-d', to: 'node-shed0-elevator-d', weight: 3, accessible: true },
  { from: 'node-shed0-lobby-d', to: 'node-shed0-stairs-d', weight: 4, accessible: true },

  // --- SHED Floor 1 Corridor Links ---
  { from: 'node-shed1-lobby-a', to: 'node-shed1-elevator-a', weight: 3, accessible: true },
  { from: 'node-shed1-lobby-a', to: 'node-shed1-stairs-a', weight: 4, accessible: true },
  { from: 'node-shed1-lobby-a', to: 'node-shed1-corridor-ab', weight: 15, accessible: true },
  
  { from: 'node-shed1-corridor-ab', to: 'node-shed1-lobby-b', weight: 15, accessible: true },
  { from: 'node-shed1-lobby-b', to: 'node-shed1-elevator-b', weight: 3, accessible: true },
  { from: 'node-shed1-lobby-b', to: 'node-shed1-stairs-b', weight: 4, accessible: true },
  { from: 'node-shed1-lobby-b', to: 'node-shed1-corridor-bc', weight: 10, accessible: true },
  
  { from: 'node-shed1-corridor-bc', to: 'node-shed1-lobby-c', weight: 10, accessible: true },
  { from: 'node-shed1-lobby-c', to: 'node-shed1-elevator-c', weight: 3, accessible: true },
  { from: 'node-shed1-lobby-c', to: 'node-shed1-stairs-c', weight: 4, accessible: true },
  { from: 'node-shed1-lobby-c', to: 'node-shed1-corridor-cd', weight: 20, accessible: true },
  
  { from: 'node-shed1-corridor-cd', to: 'node-shed1-lobby-d', weight: 20, accessible: true },
  { from: 'node-shed1-lobby-d', to: 'node-shed1-elevator-d', weight: 3, accessible: true },
  { from: 'node-shed1-lobby-d', to: 'node-shed1-stairs-d', weight: 4, accessible: true },

  // --- SHED Basement (Floor -1) links ---
  { from: 'node-sheds-lobby-a', to: 'node-sheds-elevator-a', weight: 3, accessible: true },
  { from: 'node-sheds-lobby-a', to: 'node-sheds-stairs-a', weight: 4, accessible: true },

  // --- SHED Vertical elevator connections (Accessible) ---
  { from: 'node-sheds-elevator-a', to: 'node-shed0-elevator-a', weight: 10, accessible: true },
  { from: 'node-shed0-elevator-a', to: 'node-shed1-elevator-a', weight: 10, accessible: true },
  { from: 'node-shed0-elevator-b', to: 'node-shed1-elevator-b', weight: 10, accessible: true },
  { from: 'node-shed0-elevator-c', to: 'node-shed1-elevator-c', weight: 10, accessible: true },
  { from: 'node-shed0-elevator-d', to: 'node-shed1-elevator-d', weight: 10, accessible: true },

  // --- SHED Vertical stair connections (NOT accessible) ---
  { from: 'node-sheds-stairs-a', to: 'node-shed0-stairs-a', weight: 15, accessible: false },
  { from: 'node-shed0-stairs-a', to: 'node-shed1-stairs-a', weight: 15, accessible: false },
  { from: 'node-shed0-stairs-b', to: 'node-shed1-stairs-b', weight: 15, accessible: false },
  { from: 'node-shed0-stairs-c', to: 'node-shed1-stairs-c', weight: 15, accessible: false },
  { from: 'node-shed0-stairs-d', to: 'node-shed1-stairs-d', weight: 15, accessible: false },

  // --- CUBE Corridor & Vertical links ---
  { from: 'node-cube0-lobby', to: 'node-cube0-elevator', weight: 3, accessible: true },
  { from: 'node-cube0-lobby', to: 'node-cube0-stairs', weight: 4, accessible: true },
  { from: 'node-cube1-lobby', to: 'node-cube1-elevator', weight: 3, accessible: true },
  { from: 'node-cube1-lobby', to: 'node-cube1-stairs', weight: 4, accessible: true },
  { from: 'node-cube2-lobby', to: 'node-cube2-elevator', weight: 3, accessible: true },
  { from: 'node-cube2-lobby', to: 'node-cube2-stairs', weight: 4, accessible: true },

  // CUBE Lifts (Accessible)
  { from: 'node-cube0-elevator', to: 'node-cube1-elevator', weight: 10, accessible: true },
  { from: 'node-cube1-elevator', to: 'node-cube2-elevator', weight: 10, accessible: true },

  // CUBE Stairs (NOT accessible)
  { from: 'node-cube0-stairs', to: 'node-cube1-stairs', weight: 15, accessible: false },
  { from: 'node-cube1-stairs', to: 'node-cube2-stairs', weight: 15, accessible: false },

  // --- HALL Corridor & Vertical links ---
  { from: 'node-hall1-lobby', to: 'node-hall1-elevator', weight: 3, accessible: true },
  { from: 'node-hall1-lobby', to: 'node-hall1-stairs', weight: 4, accessible: true },
  { from: 'node-hall2-lobby', to: 'node-hall2-elevator', weight: 3, accessible: true },
  { from: 'node-hall2-lobby', to: 'node-hall2-stairs', weight: 4, accessible: true },

  // HALL Lifts (Accessible)
  { from: 'node-hall1-elevator', to: 'node-hall2-elevator', weight: 10, accessible: true },

  // HALL Stairs (NOT accessible)
  { from: 'node-hall1-stairs', to: 'node-hall2-stairs', weight: 15, accessible: false },

  // --- Outdoor Ground Level Links (Accessible) ---
  { from: 'node-outdoor-shed-main', to: 'node-shed0-lobby-a', weight: 8, accessible: true },
  { from: 'node-outdoor-shed-main', to: 'node-outdoor-hall-main', weight: 120, accessible: true },
  
  { from: 'node-outdoor-hall-main', to: 'node-outdoor-cube-main', weight: 300, accessible: true },
  
  // Outdoor connectors to CUBE and HALL ground lobbies
  { from: 'node-outdoor-hall-main', to: 'node-hall1-lobby', weight: 10, accessible: true }, // HALL ground lobby is labeled as floor 0 or floor 1 (the seminar starts on floor 1)
  { from: 'node-outdoor-cube-main', to: 'node-cube0-lobby', weight: 12, accessible: true }
];

// Dynamically auto-generate connections from each room to its nearest lobby corridor node
export function getFullNodesAndEdges() {
  const finalNodes = [...GRAPH_NODES];
  const finalEdges = [...GRAPH_EDGES];

  ROOMS.forEach(room => {
    // Add the room as a physical node in the pathfinding graph
    finalNodes.push({
      id: room.id,
      floor: room.floor,
      building: room.building,
      coords: room.coords,
      type: 'room',
      label: `Room ${room.id} (${room.name})`
    });

    // Find the closest corridor lobby node on the same floor/building to connect it
    let targetLobbyId = '';

    if (room.building === 'The SHED') {
      if (room.floor === -1) {
        targetLobbyId = 'node-sheds-lobby-a';
      } else if (room.floor === 0) {
        if (room.section === 'A') targetLobbyId = 'node-shed0-lobby-a';
        else if (room.section === 'B') targetLobbyId = 'node-shed0-lobby-b';
        else if (room.section === 'C') targetLobbyId = 'node-shed0-lobby-c';
        else if (room.section === 'D') targetLobbyId = 'node-shed0-lobby-d';
      } else if (room.floor === 1) {
        if (room.section === 'A') targetLobbyId = 'node-shed1-lobby-a';
        else if (room.section === 'B') targetLobbyId = 'node-shed1-lobby-b';
        else if (room.section === 'C') targetLobbyId = 'node-shed1-lobby-c';
        else if (room.section === 'D') targetLobbyId = 'node-shed1-lobby-d';
      }
    } else if (room.building === 'The Cube') {
      if (room.floor === 0) targetLobbyId = 'node-cube0-lobby';
      else if (room.floor === 1) targetLobbyId = 'node-cube1-lobby';
      else if (room.floor === 2) targetLobbyId = 'node-cube2-lobby';
    } else if (room.building === 'The Hall') {
      if (room.floor === 1) targetLobbyId = 'node-hall1-lobby';
      else if (room.floor === 2) targetLobbyId = 'node-hall2-lobby';
    }

    if (targetLobbyId) {
      // Connect room to lobby door
      finalEdges.push({
        from: room.id,
        to: targetLobbyId,
        weight: 5, // Lobbies are adjacent to their floor rooms
        accessible: true // Doors are generally accessible
      });
    }
  });

  return { nodes: finalNodes, edges: finalEdges };
}
