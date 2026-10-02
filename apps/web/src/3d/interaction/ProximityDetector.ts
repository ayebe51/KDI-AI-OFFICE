// ==========================================================
// 3d/interaction/ProximityDetector.ts
// Detects when player is near an NPC / interactable object
// ==========================================================

import type { OfficeAgentDetail } from '@kdi/types';
import type { FloorId, WorldInteractable } from '../world/WorldDefinitions.js';
import { WORLD_INTERACTABLES } from '../world/WorldDefinitions.js';

export interface NearbyAgent {
  agent: OfficeAgentDetail;
  distance: number;
}

export interface NearbyWorldInteractable {
  interactable: WorldInteractable;
  distance: number;
}

const INTERACTION_RADIUS = 3.6; // meters

export class ProximityDetector {
  static findNearbyAgents(
    px: number,
    pz: number,
    agents: OfficeAgentDetail[]
  ): NearbyAgent[] {
    return agents
      .map((agent) => {
        const dx = agent.position[0] - px;
        const dz = agent.position[2] - pz;
        const distance = Math.sqrt(dx * dx + dz * dz);
        return { agent, distance };
      })
      .filter((r) => r.distance <= INTERACTION_RADIUS)
      .sort((a, b) => a.distance - b.distance);
  }

  static findNearbyInteractables(
    px: number,
    pz: number,
    currentFloor: FloorId
  ): NearbyWorldInteractable[] {
    return WORLD_INTERACTABLES
      .filter((item) => item.floor === currentFloor)
      .map((interactable) => {
        const dx = interactable.position[0] - px;
        const dz = interactable.position[2] - pz;
        const distance = Math.sqrt(dx * dx + dz * dz);
        return { interactable, distance };
      })
      .filter((r) => r.distance <= INTERACTION_RADIUS)
      .sort((a, b) => a.distance - b.distance);
  }
}

export const OFFICE_INTERACTABLES = WORLD_INTERACTABLES;
