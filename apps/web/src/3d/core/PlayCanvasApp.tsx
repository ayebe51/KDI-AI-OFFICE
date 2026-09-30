// ==========================================================
// 3d/core/PlayCanvasApp.tsx
// Root PlayCanvas Application Wrapper with React Overlay & Full Digital Twin
// ==========================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Application } from '@playcanvas/react';
import { RESOLUTION_AUTO, FILLMODE_NONE } from 'playcanvas';
import { OfficeWorldStore, type OfficeWorldState } from '../state/OfficeWorldStore.js';
import { OfficeScene } from '../scene/OfficeScene.js';
import type { CameraPresetId } from '../camera/OfficeCamera.js';
import { OfficeHUD } from '../../components/office/OfficeHUD.js';
import { AgentInspectorModal } from '../../components/office/AgentInspectorModal.js';
import { ProjectInspectorModal } from '../../components/office/ProjectInspectorModal.js';
import { PublicProjectShowcaseModal } from '../../components/portfolio/PublicProjectShowcaseModal.js';
import { ServerRoomModal } from '../../components/office/ServerRoomModal.js';
import { WhiteboardModal } from '../../components/office/WhiteboardModal.js';
import { PrayerModal } from '../../components/office/PrayerModal.js';
import { EventReplayModal } from '../../components/office/EventReplayModal.js';
import { Office2DFallback } from '../../components/office/Office2DFallback.js';
import type { OfficeAgentDetail, ServerNode, OfficeProjectItem, OfficeRoom, PublicProject } from '@kdi/types';


export interface PlayCanvasAppProps {
  apiUrl?: string;
  wsUrl?: string;
  demoAgentState?: any;
  demoAgentActivity?: string;
  onOpenAgentDetail?: (agent: any) => void;
}

/**
 * Detect WebGL support in current browser context
 */
function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return (
      Boolean(window.WebGL2RenderingContext && canvas.getContext('webgl2')) ||
      Boolean(
        window.WebGLRenderingContext &&
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      )
    );
  } catch {
    return false;
  }
}

export const PlayCanvasApp: React.FC<PlayCanvasAppProps> = ({
  apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000',
  wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws/v1/events',
}) => {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [worldState, setWorldState] = useState<OfficeWorldState>(() =>
    OfficeWorldStore.getInstance().getState()
  );
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('RECEPTION');
  const [showReplayModal, setShowReplayModal] = useState<boolean>(false);
  const [showPrayerModal, setShowPrayerModal] = useState<boolean>(false);
  const [showWhiteboardModal, setShowWhiteboardModal] = useState<boolean>(false);
  const [showProjectGraphView, setShowProjectGraphView] = useState<boolean>(false);

  const adaptToPublicProject = useCallback((item: OfficeProjectItem): PublicProject => {
    return {
      projectId: item.id,
      slug: item.id.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: item.name,
      shortDescription: item.description,
      description: item.description,
      category: item.category,
      projectType: 'WEB_APP',
      status: item.status,
      year: item.year || '2026',
      clientType: 'Higher Education / Enterprise Client',
      problem: 'Operational bottleneck requiring modern architecture and automated AI engineering.',
      solution: 'Engineered a high-availability reactive solution with real-time telemetry and automated regression testing.',
      role: 'Fullstack & Autonomous AI Engineering',
      technologies: item.techStack,
      features: [
        { featureId: 'ft_1', projectId: item.id, name: 'Core Engine & APIs', description: 'High-throughput transactional services.', status: 'PRODUCTION', sortOrder: 1 },
        { featureId: 'ft_2', projectId: item.id, name: 'Reactive Interface', description: 'Responsive presentation layer.', status: 'PRODUCTION', sortOrder: 2 },
      ],
      aiContribution: {
        humanContribution: 'Platform architecture, business governance, and stakeholder alignment.',
        aiContribution: 'Autonomous code generation, automated regression suites, and schema optimization.',
        engineeringAgents: ['Farhan (Software Engineer)', 'Nadia (QA Engineer)'],
      },
      screenshots: ['https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80'],
      videos: [],
      media: [],
      demoUrl: 'https://demo.kdi-office.id',
      repositoryUrl: 'https://github.com/kdi-ai-office/showcase',
      isRepositoryPublic: true,
      timeline: [],
      team: [
        { memberId: 'm1', name: 'Principal Human Architect', role: 'Architect', isAi: false, responsibilities: ['Architecture'] },
        { memberId: 'm2', name: 'Farhan', role: 'Lead Software Engineer', isAi: true, responsibilities: ['Development'] },
      ],
      results: [
        { metricId: 'r1', label: 'Processing Efficiency', value: '+85%', unit: 'Gain', verified: true },
        { metricId: 'r2', label: 'Automated Test Coverage', value: '98%', unit: 'Regression', verified: true },
      ],
      featured: Boolean(item.featured),
      sortOrder: 1,
      updatedAt: new Date().toISOString(),
    };
  }, []);

  // Initialize Store and subscribe
  useEffect(() => {
    const supported = checkWebGLSupport();
    setIsSupported(supported);

    const store = OfficeWorldStore.getInstance();
    store.init(apiUrl, wsUrl);

    const unsubscribe = store.subscribe((newState) => {
      setWorldState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, [apiUrl, wsUrl]);

  // Demo Trigger Handler
  const handleTriggerDemo = useCallback(
    async (scenario: string) => {
      try {
        const res = await fetch(`${apiUrl}/office/demo/${scenario}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) console.warn(`Demo ${scenario} returned ${res.status}`);
      } catch (err) {
        console.error(`Failed to trigger demo ${scenario}:`, err);
      }
    },
    [apiUrl]
  );

  // Selection handlers
  const handleSelectAgent = useCallback((agent: OfficeAgentDetail) => {
    OfficeWorldStore.getInstance().selectEntity('AGENT', agent.agentId, agent);
  }, []);

  const handleSelectProject = useCallback((project: OfficeProjectItem) => {
    OfficeWorldStore.getInstance().selectEntity('PROJECT', project.id, project);
  }, []);

  const handleSelectServer = useCallback((server: ServerNode) => {
    OfficeWorldStore.getInstance().selectEntity('SERVER', server.serviceId, server);
  }, []);

  const handleSelectRoom = useCallback((room: OfficeRoom) => {
    if (room.type === 'MUSHOLLA') {
      setShowPrayerModal(true);
    } else if (room.type === 'MEETING') {
      setShowWhiteboardModal(true);
    } else if (room.type === 'SERVER') {
      OfficeWorldStore.getInstance().selectEntity('SERVER', null, null);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    OfficeWorldStore.getInstance().clearSelection();
    setShowPrayerModal(false);
    setShowWhiteboardModal(false);
  }, []);

  const canvasStyle = useMemo(
    () => ({
      width: '100%',
      height: '100%',
      display: 'block',
      outline: 'none',
    }),
    []
  );

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
      {/* 1. Master HUD Toolbar */}
      <OfficeHUD
        worldState={worldState}
        activeCamera={cameraPreset}
        onSelectCamera={(p) => setCameraPreset(p)}
        onToggleInternalMode={(internal) =>
          OfficeWorldStore.getInstance().setInternalMode(internal)
        }
        onToggle2DMode={(is2D) => OfficeWorldStore.getInstance().set2DMode(is2D)}
        onTriggerDemo={handleTriggerDemo}
        onOpenReplay={() => setShowReplayModal(true)}
      />

      {/* 2. Visual Viewport: 3D PlayCanvas Scene OR 2D Fallback */}
      {!isSupported || worldState.is2DMode ? (
        <Office2DFallback
          worldState={worldState}
          onSelectAgent={handleSelectAgent}
          onSelectServer={handleSelectServer}
          onSelectRoom={handleSelectRoom}
        />
      ) : (
        <Application
          style={canvasStyle}
          fillMode={FILLMODE_NONE}
          resolutionMode={RESOLUTION_AUTO}
          usePhysics={false}
        >
          <OfficeScene
            worldState={worldState}
            cameraPreset={cameraPreset}
            onSelectAgent={handleSelectAgent}
            onSelectRoom={handleSelectRoom}
            onSelectServer={handleSelectServer}
            onSelectProject={handleSelectProject}
            onSelectWhiteboard={() => setShowWhiteboardModal(true)}
          />
        </Application>
      )}

      {/* 3. Modal Overlays */}
      {/* Agent Inspector Modal */}
      {worldState.selectedEntity.type === 'AGENT' && worldState.selectedEntity.data && (
        <AgentInspectorModal
          agent={worldState.selectedEntity.data}
          isInternalMode={worldState.isInternalMode}
          onClose={handleCloseModal}
        />
      )}

      {/* Project Inspector & Showcase Modal */}
      {worldState.selectedEntity.type === 'PROJECT' && worldState.selectedEntity.data && (
        showProjectGraphView ? (
          <ProjectInspectorModal
            project={worldState.selectedEntity.data}
            isInternalMode={worldState.isInternalMode}
            onClose={() => {
              setShowProjectGraphView(false);
              handleCloseModal();
            }}
          />
        ) : (
          <PublicProjectShowcaseModal
            project={adaptToPublicProject(worldState.selectedEntity.data)}
            isInternalOperator={worldState.isInternalMode}
            onOpenGraphView={() => setShowProjectGraphView(true)}
            onClose={handleCloseModal}
          />
        )
      )}


      {/* Server Room Inspector Modal */}
      {worldState.selectedEntity.type === 'SERVER' && (
        <ServerRoomModal
          serverNodes={worldState.serverNodes}
          selectedNode={worldState.selectedEntity.data}
          onClose={handleCloseModal}
        />
      )}

      {/* Whiteboard Modal */}
      {showWhiteboardModal && (
        <WhiteboardModal
          meeting={worldState.meetings.find((m) => m.status === 'ACTIVE') || null}
          onClose={handleCloseModal}
        />
      )}

      {/* Prayer Modal */}
      {showPrayerModal && (
        <PrayerModal
          activePrayer={worldState.activePrayer}
          onClose={handleCloseModal}
        />
      )}

      {/* Event Replay Modal */}
      {showReplayModal && (
        <EventReplayModal
          apiUrl={apiUrl}
          onClose={() => setShowReplayModal(false)}
        />
      )}
    </div>
  );
};
