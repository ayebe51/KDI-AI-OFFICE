// ==========================================================
// 3d/agents/AgentAvatar.tsx
// Reusable 3D Agent Avatar with Waypoint Pathfinding & State Machine
// ==========================================================

import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import type { Entity as PcEntity } from 'playcanvas';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial, useAppEvent } from '@playcanvas/react/hooks';
import type { OfficeActivityState, OfficeAgentDetail } from '@kdi/types';
import { AgentAnimationController } from '../animation/AgentAnimationController.js';
import { NavGraph } from '../navigation/NavGraph.js';
import { Agent3DStateAdapter } from '../adapters/Agent3DStateAdapter.js';

export interface AgentAvatarProps {
  agent: OfficeAgentDetail;
  selected?: boolean;
  onSelect?: (agent: OfficeAgentDetail) => void;
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  agent,
  selected = false,
  onSelect,
}) => {
  const avatarGroupRef = useRef<PcEntity>(null);
  const timeRef = useRef<number>(0);

  // Position & Pathfinding state
  const currentPosRef = useRef<[number, number, number]>([...agent.position]);
  const currentRotYRef = useRef<number>(agent.rotation[1] || 0);
  const pathWaypointsRef = useRef<[number, number, number][]>([]);
  const isMovingRef = useRef<boolean>(false);

  // Animation controller
  const animController = useMemo(
    () => new AgentAnimationController(agent.activityState),
    []
  );

  // Update animation activity when agent activity changes
  useEffect(() => {
    animController.setActivity(agent.activityState, isMovingRef.current);
  }, [agent.activityState, animController]);

  // Compute waypoint path when targetLocation is updated
  useEffect(() => {
    if (agent.targetLocation) {
      const computedPath = NavGraph.findPath(currentPosRef.current, agent.targetLocation);
      if (computedPath.length > 0) {
        pathWaypointsRef.current = computedPath;
        isMovingRef.current = true;
        animController.setMoving(true, agent.activityState);
      }
    }
  }, [agent.targetLocation, agent.activityState, animController]);

  // Role based visual palette
  const roleColor = useMemo(() => {
    switch (agent.role) {
      case 'AI_MANAGER':
        return '#eab308'; // Amber gold
      case 'SYSTEM_ARCHITECT':
        return '#8b5cf6'; // Violet
      case 'RESEARCHER':
        return '#a855f7'; // Purple
      case 'QA_ENGINEER':
        return '#06b6d4'; // Cyan
      case 'SECURITY_ENGINEER':
        return '#ef4444'; // Red
      case 'SOFTWARE_ENGINEER':
      default:
        return '#10b981'; // Emerald
    }
  }, [agent.role]);

  // Activity visual config
  const visualConfig = useMemo(
    () => Agent3DStateAdapter.toVisualConfig(agent.currentState || agent.activityState),
    [agent.currentState, agent.activityState]
  );

  // Torso material
  const torsoMat = useMaterial({
    diffuse: roleColor,
    metalness: 0.2,
    gloss: 0.65,
  });

  // Stylized head material
  const headMat = useMaterial({
    diffuse: '#fcd34d',
    gloss: 0.5,
  });

  // Emissive visor material
  const visorMat = useMaterial({
    diffuse: visualConfig.emissiveColor,
    emissive: visualConfig.emissiveColor,
    emissiveIntensity: visualConfig.emissiveIntensity,
    gloss: 0.9,
  });

  // Overhead holographic halo
  const haloMat = useMaterial({
    diffuse: visualConfig.color,
    emissive: visualConfig.color,
    emissiveIntensity: 0.8,
    gloss: 0.8,
  });

  // Ground selection ring
  const selectionRingMat = useMaterial({
    diffuse: '#38bdf8',
    emissive: '#0284c7',
    emissiveIntensity: 0.9,
  });

  // Per-frame physics and animation update loop
  useAppEvent('update', (dt: number) => {
    timeRef.current += dt;
    const t = timeRef.current;

    // 1. Waypoint movement traversal
    if (pathWaypointsRef.current.length > 0) {
      const targetPoint = pathWaypointsRef.current[0];
      const cur = currentPosRef.current;

      const dx = targetPoint[0] - cur[0];
      const dz = targetPoint[2] - cur[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.15) {
        // Reached current waypoint, pop next
        pathWaypointsRef.current.shift();
        if (pathWaypointsRef.current.length === 0) {
          isMovingRef.current = false;
          animController.setMoving(false, agent.activityState);
        }
      } else {
        // Step forward at 2.6 m/s
        const speed = 2.6;
        const step = Math.min(speed * dt, dist);
        const vx = (dx / dist) * step;
        const vz = (dz / dist) * step;

        cur[0] += vx;
        cur[2] += vz;

        // Smoothly rotate towards heading
        const targetAngle = Math.atan2(dx, dz) * (180 / Math.PI);
        currentRotYRef.current = targetAngle;
      }
    }

    // 2. Procedural animation
    const pose = animController.update(dt, t);

    // 3. Apply position & rotation to 3D Entity
    if (avatarGroupRef.current) {
      const cur = currentPosRef.current;
      avatarGroupRef.current.setLocalPosition(
        cur[0],
        cur[1] + pose.offsetY,
        cur[2]
      );
      avatarGroupRef.current.setLocalEulerAngles(
        0,
        currentRotYRef.current + pose.rotationY,
        0
      );
    }
  });

  const handleClick = useCallback(
    (e: any) => {
      e?.stopPropagation?.();
      onSelect?.(agent);
    },
    [agent, onSelect]
  );

  return (
    <Entity
      ref={avatarGroupRef}
      name={`Avatar-${agent.agentId}`}
      position={agent.position}
      onClick={handleClick}
      onPointerDown={handleClick}
    >
      {/* 1. Torso Capsule */}
      <Entity name="Torso" position={[0, 0.85, 0]} scale={[0.36, 0.6, 0.28]}>
        <Render type="capsule" material={torsoMat} castShadows={true} />
      </Entity>

      {/* 2. Stylized Head */}
      <Entity name="Head" position={[0, 1.25, 0]} scale={[0.26, 0.26, 0.26]}>
        <Render type="sphere" material={headMat} castShadows={true} />
      </Entity>

      {/* 3. Glowing Visor */}
      <Entity name="Visor" position={[0, 1.26, 0.12]} scale={[0.2, 0.05, 0.08]}>
        <Render type="box" material={visorMat} />
      </Entity>

      {/* 4. Overhead Holographic Halo Ring */}
      <Entity name="StatusHalo" position={[0, 1.5, 0]} scale={[0.32, 0.025, 0.32]}>
        <Render type="cylinder" material={haloMat} />
      </Entity>

      {/* 5. Ground Selection Halo (visible when selected) */}
      {selected && (
        <Entity name="GroundSelectionRing" position={[0, 0.02, 0]} scale={[0.9, 0.02, 0.9]}>
          <Render type="cylinder" material={selectionRingMat} />
        </Entity>
      )}
    </Entity>
  );
};
