// ==========================================================
// 3d/scene/OfficeScene.tsx
// Complete Living Office Scene Composition with 14 Modular Rooms & Live Avatars
// ==========================================================

import React, { useMemo } from 'react';
import type { OfficeWorldState } from '../state/OfficeWorldStore.js';
import type { OfficeAgentDetail, ServerNode, OfficeProjectItem, OfficeRoom } from '@kdi/types';
import { OfficeCamera, type CameraPresetId } from '../camera/OfficeCamera.js';
import { OfficeLighting } from './OfficeLighting.js';
import { Corridors } from '../rooms/Corridors.js';
import { ReceptionRoom } from '../rooms/ReceptionRoom.js';
import { ManagementRoom } from '../rooms/ManagementRoom.js';
import { PMRoom } from '../rooms/PMRoom.js';
import { ArchitectureRoom } from '../rooms/ArchitectureRoom.js';
import { EngineeringFloor } from '../rooms/EngineeringFloor.js';
import { QARoom } from '../rooms/QARoom.js';
import { SecurityRoom } from '../rooms/SecurityRoom.js';
import { ResearchRoom } from '../rooms/ResearchRoom.js';
import { MeetingRoom } from '../rooms/MeetingRoom.js';
import { PantryRoom } from '../rooms/PantryRoom.js';
import { BreakRoom } from '../rooms/BreakRoom.js';
import { MushollaRoom } from '../rooms/MushollaRoom.js';
import { ServerRoom } from '../rooms/ServerRoom.js';
import { PortfolioGallery } from '../rooms/PortfolioGallery.js';
import { AgentAvatar } from '../agents/AgentAvatar.js';

export interface OfficeSceneProps {
  worldState: OfficeWorldState;
  cameraPreset?: CameraPresetId;
  onSelectAgent?: (agent: OfficeAgentDetail) => void;
  onSelectRoom?: (room: OfficeRoom) => void;
  onSelectServer?: (server: ServerNode) => void;
  onSelectProject?: (project: OfficeProjectItem) => void;
  onSelectWhiteboard?: () => void;
}

export const OfficeScene: React.FC<OfficeSceneProps> = ({
  worldState,
  cameraPreset = 'RECEPTION',
  onSelectAgent,
  onSelectRoom,
  onSelectServer,
  onSelectProject,
  onSelectWhiteboard,
}) => {
  const agentsList = useMemo(
    () => Array.from(worldState.agents.values()),
    [worldState.agents]
  );

  const activeMeeting = useMemo(
    () => worldState.meetings.find((m) => m.status === 'ACTIVE') || null,
    [worldState.meetings]
  );

  // Determine if camera is following a selected agent
  const followedAgent = useMemo(() => {
    if (worldState.selectedEntity.type === 'AGENT' && worldState.selectedEntity.id) {
      return worldState.agents.get(worldState.selectedEntity.id) || null;
    }
    return null;
  }, [worldState.selectedEntity, worldState.agents]);

  const handleRoomSelect = (roomId: string) => {
    const room = worldState.rooms.get(roomId);
    if (room) onSelectRoom?.(room);
  };

  return (
    <>
      {/* 1. Dynamic Camera with Room Presets and Agent Follow Mode */}
      <OfficeCamera
        preset={cameraPreset}
        followedAgent={followedAgent}
        fov={45}
      />

      {/* 2. Office Illumination Rig */}
      <OfficeLighting />

      {/* 3. Architectural Corridors, Floor Stripes & Foundation */}
      <Corridors />

      {/* 4. 14 Canonical Modular Office Rooms */}
      <ReceptionRoom onSelectRoom={() => handleRoomSelect('RM-RECEPTION')} />
      <ManagementRoom onSelectRoom={() => handleRoomSelect('RM-MANAGEMENT')} />
      <PMRoom onSelectRoom={() => handleRoomSelect('RM-PM')} />
      <ArchitectureRoom onSelectRoom={() => handleRoomSelect('RM-ARCHITECTURE')} />
      <EngineeringFloor
        agents={agentsList}
        onSelectRoom={() => handleRoomSelect('RM-ENGINEERING')}
      />
      <QARoom onSelectRoom={() => handleRoomSelect('RM-QA')} />
      <SecurityRoom onSelectRoom={() => handleRoomSelect('RM-SECURITY')} />
      <ResearchRoom onSelectRoom={() => handleRoomSelect('RM-RESEARCH')} />
      <MeetingRoom
        activeMeeting={activeMeeting}
        onSelectWhiteboard={onSelectWhiteboard}
        onSelectRoom={() => handleRoomSelect('RM-MEETING')}
      />
      <PantryRoom onSelectRoom={() => handleRoomSelect('RM-PANTRY')} />
      <BreakRoom onSelectRoom={() => handleRoomSelect('RM-BREAK')} />
      <MushollaRoom
        activePrayer={worldState.activePrayer}
        onSelectRoom={() => handleRoomSelect('RM-MUSHOLLA')}
      />
      <ServerRoom
        serverNodes={worldState.serverNodes}
        onSelectServer={onSelectServer}
        onSelectRoom={() => handleRoomSelect('RM-SERVER')}
      />
      <PortfolioGallery
        projects={worldState.projects}
        onSelectProject={onSelectProject}
        onSelectRoom={() => handleRoomSelect('RM-PORTFOLIO')}
      />

      {/* 5. Live Digital Employee Agent Avatars */}
      {agentsList.map((agent) => (
        <AgentAvatar
          key={agent.agentId}
          agent={agent}
          selected={worldState.selectedEntity.type === 'AGENT' && worldState.selectedEntity.id === agent.agentId}
          onSelect={onSelectAgent}
        />
      ))}
    </>
  );
};
