// ==========================================================
// 3d-r3f/hooks/useProximity.ts
// Reusable proximity detection hook for 3D world interactions
// ==========================================================

import { useMemo } from 'react';

export const INTERACT_RADIUS = 2.8;

export interface InteractPoint {
  id: string;
  x: number;
  z: number;
  floor: string;
  prompt: string;
  radius?: number;
}

/**
 * Returns the nearest InteractPoint within radius for the player's current position,
 * or null if nothing is nearby.
 */
export function useProximity(
  playerX: number,
  playerZ: number,
  currentFloor: string,
  points: InteractPoint[],
): InteractPoint | null {
  return useMemo(() => {
    for (const point of points) {
      if (point.floor !== currentFloor) continue;
      const r = point.radius ?? INTERACT_RADIUS;
      if (Math.hypot(playerX - point.x, playerZ - point.z) < r) return point;
    }
    return null;
  }, [playerX, playerZ, currentFloor, points]);
}
