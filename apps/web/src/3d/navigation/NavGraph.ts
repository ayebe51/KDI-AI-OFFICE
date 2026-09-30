// ==========================================================
// 3d/navigation/NavGraph.ts
// Deterministic Waypoint Navigation Graph & Shortest-Path Router
// ==========================================================

export interface NavWaypoint {
  id: string;
  position: [number, number, number];
  connectedTo: string[];
  room?: string;
}

export const NAV_WAYPOINTS: Record<string, NavWaypoint> = {
  // Central corridor spine
  'WP-CORRIDOR-NORTH': {
    id: 'WP-CORRIDOR-NORTH',
    position: [0, 0, -10],
    connectedTo: ['WP-CORRIDOR-MID', 'WP-RESEARCH-ENTRY', 'WP-SERVER-ENTRY', 'WP-QA-ENTRY'],
    room: 'CORRIDOR',
  },
  'WP-CORRIDOR-MID': {
    id: 'WP-CORRIDOR-MID',
    position: [0, 0, 0],
    connectedTo: ['WP-CORRIDOR-NORTH', 'WP-CORRIDOR-SOUTH', 'WP-ENG-ENTRY', 'WP-MEETING-ENTRY', 'WP-ARCH-ENTRY'],
    room: 'CORRIDOR',
  },
  'WP-CORRIDOR-SOUTH': {
    id: 'WP-CORRIDOR-SOUTH',
    position: [0, 0, 10],
    connectedTo: ['WP-CORRIDOR-MID', 'WP-CORRIDOR-RECEPTION', 'WP-PANTRY-ENTRY', 'WP-PM-ENTRY'],
    room: 'CORRIDOR',
  },
  'WP-CORRIDOR-RECEPTION': {
    id: 'WP-CORRIDOR-RECEPTION',
    position: [0, 0, 18],
    connectedTo: ['WP-CORRIDOR-SOUTH', 'WP-RECEPTION-ENTRY', 'WP-PORTFOLIO-ENTRY', 'WP-MGMT-ENTRY', 'WP-BREAK-ENTRY'],
    room: 'CORRIDOR',
  },

  // Reception & Public Lobby
  'WP-RECEPTION-ENTRY': {
    id: 'WP-RECEPTION-ENTRY',
    position: [0, 0, 16],
    connectedTo: ['WP-CORRIDOR-RECEPTION'],
    room: 'RM-RECEPTION',
  },

  // Portfolio Gallery
  'WP-PORTFOLIO-ENTRY': {
    id: 'WP-PORTFOLIO-ENTRY',
    position: [0, 0, 23],
    connectedTo: ['WP-CORRIDOR-RECEPTION'],
    room: 'RM-PORTFOLIO',
  },

  // Management Room
  'WP-MGMT-ENTRY': {
    id: 'WP-MGMT-ENTRY',
    position: [-8, 0, 16],
    connectedTo: ['WP-CORRIDOR-RECEPTION', 'WP-MGMT-DESK'],
    room: 'RM-MANAGEMENT',
  },
  'WP-MGMT-DESK': {
    id: 'WP-MGMT-DESK',
    position: [-12, 0, 16],
    connectedTo: ['WP-MGMT-ENTRY'],
    room: 'RM-MANAGEMENT',
  },

  // Product Management Room
  'WP-PM-ENTRY': {
    id: 'WP-PM-ENTRY',
    position: [-8, 0, 8],
    connectedTo: ['WP-CORRIDOR-SOUTH', 'WP-PM-DESK'],
    room: 'RM-PM',
  },
  'WP-PM-DESK': {
    id: 'WP-PM-DESK',
    position: [-12, 0, 8],
    connectedTo: ['WP-PM-ENTRY'],
    room: 'RM-PM',
  },

  // Architecture Room
  'WP-ARCH-ENTRY': {
    id: 'WP-ARCH-ENTRY',
    position: [-8, 0, 0],
    connectedTo: ['WP-CORRIDOR-MID', 'WP-ARCH-DESK'],
    room: 'RM-ARCHITECTURE',
  },
  'WP-ARCH-DESK': {
    id: 'WP-ARCH-DESK',
    position: [-12, 0, 0],
    connectedTo: ['WP-ARCH-ENTRY'],
    room: 'RM-ARCHITECTURE',
  },

  // Engineering Floor
  'WP-ENG-ENTRY': {
    id: 'WP-ENG-ENTRY',
    position: [-2, 0, 0],
    connectedTo: ['WP-CORRIDOR-MID', 'WP-ENG-DESK-1', 'WP-ENG-DESK-2'],
    room: 'RM-ENGINEERING',
  },
  'WP-ENG-DESK-1': {
    id: 'WP-ENG-DESK-1',
    position: [0, 0, 0.4],
    connectedTo: ['WP-ENG-ENTRY'],
    room: 'RM-ENGINEERING',
  },
  'WP-ENG-DESK-2': {
    id: 'WP-ENG-DESK-2',
    position: [3, 0, 0.4],
    connectedTo: ['WP-ENG-ENTRY'],
    room: 'RM-ENGINEERING',
  },

  // QA Room
  'WP-QA-ENTRY': {
    id: 'WP-QA-ENTRY',
    position: [-8, 0, -8],
    connectedTo: ['WP-CORRIDOR-NORTH', 'WP-QA-DESK'],
    room: 'RM-QA',
  },
  'WP-QA-DESK': {
    id: 'WP-QA-DESK',
    position: [-12, 0, -8],
    connectedTo: ['WP-QA-ENTRY'],
    room: 'RM-QA',
  },

  // Security Room
  'WP-SEC-ENTRY': {
    id: 'WP-SEC-ENTRY',
    position: [-8, 0, -16],
    connectedTo: ['WP-CORRIDOR-NORTH', 'WP-SEC-DESK'],
    room: 'RM-SECURITY',
  },
  'WP-SEC-DESK': {
    id: 'WP-SEC-DESK',
    position: [-12, 0, -16],
    connectedTo: ['WP-SEC-ENTRY'],
    room: 'RM-SECURITY',
  },

  // Research Room
  'WP-RESEARCH-ENTRY': {
    id: 'WP-RESEARCH-ENTRY',
    position: [0, 0, -13],
    connectedTo: ['WP-CORRIDOR-NORTH', 'WP-RESEARCH-DESK'],
    room: 'RM-RESEARCH',
  },
  'WP-RESEARCH-DESK': {
    id: 'WP-RESEARCH-DESK',
    position: [0, 0, -16],
    connectedTo: ['WP-RESEARCH-ENTRY'],
    room: 'RM-RESEARCH',
  },

  // Meeting Room & Whiteboard
  'WP-MEETING-ENTRY': {
    id: 'WP-MEETING-ENTRY',
    position: [7, 0, 0],
    connectedTo: ['WP-CORRIDOR-MID', 'WP-MEETING-TABLE', 'WP-WHITEBOARD'],
    room: 'RM-MEETING',
  },
  'WP-MEETING-TABLE': {
    id: 'WP-MEETING-TABLE',
    position: [12, 0, 0],
    connectedTo: ['WP-MEETING-ENTRY', 'WP-WHITEBOARD'],
    room: 'RM-MEETING',
  },
  'WP-WHITEBOARD': {
    id: 'WP-WHITEBOARD',
    position: [12, 0, -4],
    connectedTo: ['WP-MEETING-TABLE'],
    room: 'RM-MEETING',
  },

  // Pantry Room
  'WP-PANTRY-ENTRY': {
    id: 'WP-PANTRY-ENTRY',
    position: [8, 0, 8],
    connectedTo: ['WP-CORRIDOR-SOUTH', 'WP-COFFEE-MACHINE'],
    room: 'RM-PANTRY',
  },
  'WP-COFFEE-MACHINE': {
    id: 'WP-COFFEE-MACHINE',
    position: [12, 0, 8],
    connectedTo: ['WP-PANTRY-ENTRY'],
    room: 'RM-PANTRY',
  },

  // Break Area
  'WP-BREAK-ENTRY': {
    id: 'WP-BREAK-ENTRY',
    position: [8, 0, 16],
    connectedTo: ['WP-CORRIDOR-RECEPTION', 'WP-BREAK-SOFA'],
    room: 'RM-BREAK',
  },
  'WP-BREAK-SOFA': {
    id: 'WP-BREAK-SOFA',
    position: [12, 0, 16],
    connectedTo: ['WP-BREAK-ENTRY'],
    room: 'RM-BREAK',
  },

  // Musholla
  'WP-MUSHOLLA-ENTRY': {
    id: 'WP-MUSHOLLA-ENTRY',
    position: [8, 0, -8],
    connectedTo: ['WP-CORRIDOR-NORTH', 'WP-SAJADAH-1', 'WP-SAJADAH-2'],
    room: 'RM-MUSHOLLA',
  },
  'WP-SAJADAH-1': {
    id: 'WP-SAJADAH-1',
    position: [12, 0, -8],
    connectedTo: ['WP-MUSHOLLA-ENTRY'],
    room: 'RM-MUSHOLLA',
  },
  'WP-SAJADAH-2': {
    id: 'WP-SAJADAH-2',
    position: [12, 0, -7],
    connectedTo: ['WP-MUSHOLLA-ENTRY'],
    room: 'RM-MUSHOLLA',
  },

  // Server Room
  'WP-SERVER-ENTRY': {
    id: 'WP-SERVER-ENTRY',
    position: [8, 0, -16],
    connectedTo: ['WP-CORRIDOR-NORTH', 'WP-SERVER-AISLE'],
    room: 'RM-SERVER',
  },
  'WP-SERVER-AISLE': {
    id: 'WP-SERVER-AISLE',
    position: [12, 0, -16],
    connectedTo: ['WP-SERVER-ENTRY'],
    room: 'RM-SERVER',
  },
};

/**
 * Room to primary destination waypoint mapping
 */
export const ROOM_PRIMARY_WAYPOINT: Record<string, string> = {
  'RM-RECEPTION': 'WP-RECEPTION-ENTRY',
  'RM-MANAGEMENT': 'WP-MGMT-DESK',
  'RM-PM': 'WP-PM-DESK',
  'RM-ARCHITECTURE': 'WP-ARCH-DESK',
  'RM-ENGINEERING': 'WP-ENG-DESK-1',
  'RM-QA': 'WP-QA-DESK',
  'RM-SECURITY': 'WP-SEC-DESK',
  'RM-RESEARCH': 'WP-RESEARCH-DESK',
  'RM-MEETING': 'WP-MEETING-TABLE',
  'RM-PANTRY': 'WP-COFFEE-MACHINE',
  'RM-BREAK': 'WP-BREAK-SOFA',
  'RM-MUSHOLLA': 'WP-SAJADAH-1',
  'RM-SERVER': 'WP-SERVER-AISLE',
  'RM-PORTFOLIO': 'WP-PORTFOLIO-ENTRY',
};

/**
 * Deterministic Navigation Graph Solver
 */
export class NavGraph {
  private static adjacencyMap: Map<string, Set<string>> | null = null;

  public static getAdjacencyMap(): Map<string, Set<string>> {
    if (!this.adjacencyMap) {
      const map = new Map<string, Set<string>>();
      for (const wp of Object.values(NAV_WAYPOINTS)) {
        if (!map.has(wp.id)) map.set(wp.id, new Set());
        for (const neighbor of wp.connectedTo) {
          if (!map.has(neighbor)) map.set(neighbor, new Set());
          map.get(wp.id)!.add(neighbor);
          map.get(neighbor)!.add(wp.id); // ensure bidirectional
        }
      }
      this.adjacencyMap = map;
    }
    return this.adjacencyMap;
  }

  /**
   * Find nearest waypoint in the network to a given 3D coordinate
   */
  public static findNearestWaypoint(position: [number, number, number]): NavWaypoint {
    let nearest: NavWaypoint = NAV_WAYPOINTS['WP-CORRIDOR-MID'];
    let minDistanceSq = Number.MAX_VALUE;

    for (const wp of Object.values(NAV_WAYPOINTS)) {
      const dx = wp.position[0] - position[0];
      const dy = wp.position[1] - position[1];
      const dz = wp.position[2] - position[2];
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        nearest = wp;
      }
    }

    return nearest;
  }

  /**
   * Find shortest path using BFS on waypoint graph
   */
  public static findPath(
    startPos: [number, number, number],
    destination: string | [number, number, number]
  ): [number, number, number][] {
    let targetWpId: string | undefined;

    if (typeof destination === 'string') {
      targetWpId = ROOM_PRIMARY_WAYPOINT[destination] || destination;
    } else {
      targetWpId = this.findNearestWaypoint(destination).id;
    }

    const startWp = this.findNearestWaypoint(startPos);
    if (!NAV_WAYPOINTS[targetWpId]) {
      targetWpId = 'WP-CORRIDOR-MID';
    }

    if (startWp.id === targetWpId) {
      const finalPos: [number, number, number] =
        typeof destination !== 'string' ? destination : NAV_WAYPOINTS[targetWpId].position;
      return [finalPos];
    }

    // BFS shortest path traversal using bidirectional adjacency map
    const adj = this.getAdjacencyMap();
    const queue: string[][] = [[startWp.id]];
    const visited = new Set<string>([startWp.id]);
    let pathFound: string[] | null = null;

    while (queue.length > 0) {
      const currentPath = queue.shift()!;
      const currentId = currentPath[currentPath.length - 1];

      if (currentId === targetWpId) {
        pathFound = currentPath;
        break;
      }

      const neighbors = adj.get(currentId) || new Set();
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId) && NAV_WAYPOINTS[neighborId]) {
          visited.add(neighborId);
          queue.push([...currentPath, neighborId]);
        }
      }
    }

    if (!pathFound) {
      // Fallback: direct line to target waypoint
      return [NAV_WAYPOINTS[targetWpId].position];
    }

    // Convert waypoint IDs to positions
    const resultPositions = pathFound.map((id) => NAV_WAYPOINTS[id].position);

    // If destination was a custom coordinate, append it as the final stop
    if (typeof destination !== 'string') {
      resultPositions.push(destination);
    }

    return resultPositions;
  }
}
