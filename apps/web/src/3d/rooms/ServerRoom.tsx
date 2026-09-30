// ==========================================================
// 3d/rooms/ServerRoom.tsx
// Server Infrastructure Room with 10 Active Server Racks & Realtime LEDs
// ==========================================================

import React, { useMemo } from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import type { ServerNode } from '@kdi/types';

export interface ServerRoomProps {
  position?: [number, number, number];
  serverNodes?: ServerNode[];
  onSelectServer?: (node: ServerNode) => void;
  onSelectRoom?: () => void;
}

export const ServerRoom: React.FC<ServerRoomProps> = ({
  position = [12, 0, -16],
  serverNodes = [],
  onSelectServer,
  onSelectRoom,
}) => {
  // Industrial anti-static server room tile floor
  const floorMat = useMaterial({
    diffuse: '#090d16',
    metalness: 0.6,
    gloss: 0.6,
  });

  // Black perforated steel rack enclosure
  const rackMat = useMaterial({
    diffuse: '#020617',
    metalness: 0.85,
    gloss: 0.7,
  });

  // Status LED materials
  const onlineLedMat = useMaterial({
    diffuse: '#10b981',
    emissive: '#10b981',
    emissiveIntensity: 0.9,
    gloss: 0.9,
  });

  const degradedLedMat = useMaterial({
    diffuse: '#f59e0b',
    emissive: '#f59e0b',
    emissiveIntensity: 1.0,
    gloss: 0.9,
  });

  const errorLedMat = useMaterial({
    diffuse: '#ef4444',
    emissive: '#ef4444',
    emissiveIntensity: 1.2,
    gloss: 0.9,
  });

  // Map server node serviceIds to positions (2 rows of 5 racks)
  const rackLayout = useMemo(() => {
    const layout = [
      // Row A (North aisle)
      { id: 'srv-postgres', name: 'PostgreSQL 16', pos: [-2.4, 0, -1.8] },
      { id: 'srv-redis', name: 'Redis 7', pos: [-1.2, 0, -1.8] },
      { id: 'srv-neo4j', name: 'Neo4j Graph', pos: [0, 0, -1.8] },
      { id: 'srv-ollama', name: 'Ollama LLM', pos: [1.2, 0, -1.8] },
      { id: 'srv-ai-router', name: 'AI Router', pos: [2.4, 0, -1.8] },
      // Row B (South aisle)
      { id: 'srv-metagpt', name: 'MetaGPT SOP', pos: [-2.4, 0, 1.8] },
      { id: 'srv-antigravity', name: 'Antigravity', pos: [-1.2, 0, 1.8] },
      { id: 'srv-workers', name: 'Worker Pool', pos: [0, 0, 1.8] },
      { id: 'srv-websocket', name: 'WebSocket', pos: [1.2, 0, 1.8] },
      { id: 'srv-api', name: 'API Gateway', pos: [2.4, 0, 1.8] },
    ];
    return layout;
  }, []);

  const getNodeData = (serviceId: string): ServerNode => {
    const found = serverNodes.find((n) => n.serviceId === serviceId);
    return (
      found || {
        serviceId,
        name: serviceId,
        status: 'ONLINE',
        health: 'UP',
        latency: 5,
        load: 10,
        lastChecked: new Date().toISOString(),
        subsystem: 'Core Infrastructure',
      }
    );
  };

  const getLedMat = (status: ServerNode['status']) => {
    switch (status) {
      case 'DEGRADED':
        return degradedLedMat;
      case 'ERROR':
      case 'OFFLINE':
        return errorLedMat;
      case 'ONLINE':
      default:
        return onlineLedMat;
    }
  };

  return (
    <Entity
      name="Room-RM-SERVER"
      position={position}
      onClick={onSelectRoom}
      onPointerDown={onSelectRoom}
    >
      {/* 1. Raised Anti-Static Server Floor */}
      <Entity name="ServerFloor" position={[0, 0.015, 0]} scale={[7.6, 0.02, 7.6]}>
        <Render type="box" material={floorMat} receiveShadows={true} />
      </Entity>

      {/* 2. 10 High-Density Server Racks */}
      {rackLayout.map((rack) => {
        const node = getNodeData(rack.id);
        const ledMaterial = getLedMat(node.status);

        return (
          <Entity
            key={rack.id}
            name={`Rack-${rack.id}`}
            position={rack.pos as [number, number, number]}
            onClick={(e) => {
              e?.stopPropagation?.();
              onSelectServer?.(node);
            }}
            onPointerDown={(e) => {
              e?.stopPropagation?.();
              onSelectServer?.(node);
            }}
          >
            {/* Outer 42U Server Cabinet */}
            <Entity name="CabinetChassis" position={[0, 1.25, 0]} scale={[0.85, 2.5, 0.95]}>
              <Render type="box" material={rackMat} castShadows={true} />
            </Entity>

            {/* Front Glass / Perforated Door with status LED array */}
            <Entity
              name="RackDoorBezel"
              position={[0, 1.25, rack.pos[2] < 0 ? 0.49 : -0.49]}
              scale={[0.78, 2.38, 0.02]}
            >
              <Render type="box" material={rackMat} />
            </Entity>

            {/* Top Status Pilot Indicator Lamp */}
            <Entity
              name="StatusIndicatorLed"
              position={[0.28, 2.35, rack.pos[2] < 0 ? 0.51 : -0.51]}
              scale={[0.08, 0.08, 0.04]}
            >
              <Render type="box" material={ledMaterial} />
            </Entity>

            {/* Blinking Drive Activity LED Bar 1 */}
            <Entity
              name="ActivityLed1"
              position={[-0.1, 1.6, rack.pos[2] < 0 ? 0.51 : -0.51]}
              scale={[0.3, 0.03, 0.03]}
            >
              <Render type="box" material={ledMaterial} />
            </Entity>

            {/* Blinking Drive Activity LED Bar 2 */}
            <Entity
              name="ActivityLed2"
              position={[-0.1, 1.1, rack.pos[2] < 0 ? 0.51 : -0.51]}
              scale={[0.3, 0.03, 0.03]}
            >
              <Render type="box" material={ledMaterial} />
            </Entity>
          </Entity>
        );
      })}
    </Entity>
  );
};
