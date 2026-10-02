// ==========================================================
// 3d/core/GameOfficeApp.tsx
// Final Frontend Rebuild: Cozy Isometric 3D Virtual Office
// Game-Like Exploration, Chibi Characters, Pastel Aesthetics,
// Multi-Floor System (Ground, Floor 2, Rooftop), Sinta Account Manager,
// KDI Neon Sign, and Integrated Owner Mode
// ==========================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Application } from '@playcanvas/react';
import { RESOLUTION_AUTO, FILLMODE_NONE } from 'playcanvas';
import { useAppEvent } from '@playcanvas/react/hooks';

import { OfficeWorldStore, type OfficeWorldState } from '../state/OfficeWorldStore.js';
import { OfficeLighting } from '../scene/OfficeLighting.js';
import { PlayerAvatar } from '../character/PlayerAvatar.js';
import { PlayerController, type PlayerState } from '../character/PlayerController.js';
import { CozyIsometricCamera } from '../camera/CozyIsometricCamera.js';
import { ProximityDetector, type NearbyAgent, type NearbyWorldInteractable } from '../interaction/ProximityDetector.js';
import { Office2DFallback } from '../../components/office/Office2DFallback.js';

import { GroundFloor } from '../floors/GroundFloor.js';
import { Floor2OpenSpace } from '../floors/Floor2OpenSpace.js';
import { RooftopGarden } from '../floors/RooftopGarden.js';
import { FLOOR_METAS, type FloorId } from '../world/WorldDefinitions.js';

import { CozyGameHUD } from '../../components/game/CozyGameHUD.js';
import { ElevatorModal } from '../../components/game/ElevatorModal.js';
import { NayaDialogueModal } from '../../components/game/NayaDialogueModal.js';
import { CozyPortfolioModal } from '../../components/game/CozyPortfolioModal.js';
import { FoodCartModal } from '../../components/game/FoodCartModal.js';
import { CEORoomModal } from '../../components/game/CEORoomModal.js';
import { OwnerControlPanel } from '../../components/game/OwnerControlPanel.js';
import { GameConversationUI } from '../../components/game/GameConversationUI.js';
import { AgentInspectorModal } from '../../components/office/AgentInspectorModal.js';
import { ServerRoomModal } from '../../components/office/ServerRoomModal.js';
import { WhiteboardModal } from '../../components/office/WhiteboardModal.js';
import { PrayerModal } from '../../components/office/PrayerModal.js';

import type { PlayableCharacter } from '../character/CharacterTypes.js';
import type { OfficeAgentDetail, ServerNode, OfficeProjectItem, OfficeRoom } from '@kdi/types';

function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return (
      Boolean(window.WebGL2RenderingContext && canvas.getContext('webgl2')) ||
      Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
    );
  } catch {
    return false;
  }
}

/** Determine which room the player is currently in based on floor & position */
function getDetailedRoomLabel(floor: FloorId, x: number, z: number): string {
  if (floor === 'ROOFTOP') {
    if (x < -3) return 'Rooftop Bar & Lounge';
    if (x >= -3 && x <= 3) return 'Fire Pit & Area Bean Bags';
    return 'Teras Rooftop & Fairy Lights';
  }

  if (floor === 'FLOOR_2') {
    if (x < -2 && z > 4) return 'Hub Media Sosial & Konten';
    if (x >= -2 && z > 4) return 'Area Finansial & Administrasi';
    if (x < -2 && z <= 4) return 'Kapsul Istirahat & Relaksasi';
    return 'Studio Produksi Konten & Podcast';
  }

  // GROUND FLOOR
  if (z > 24) return 'Halaman Depan & Gerobak Kopi';
  if (z > 20 && z <= 24) return 'Pintu Masuk Kantor KDI';
  if (z > 12 && z <= 20 && x >= 4) return 'Area Lift Lantai 1';
  if (z > 12 && z <= 20 && x <= -6) return 'Ruang Eksekutif CEO';
  if (z > 12 && z <= 20) return 'Resepsionis & Lobi Utama';
  if (z > 4 && z <= 12 && x >= 4) return 'Area Sales & Account Manager (Naya)';
  if (z > 4 && z <= 12 && x <= -6) return 'Product Management Room';
  if (z > -4 && z <= 6 && Math.abs(x) < 6) return 'Lantai Rekayasa Software (Engineering)';
  if (z > -4 && z <= 6 && x <= -6) return 'Lab Arsitektur Sistem';
  if (z > -4 && z <= 6 && x >= 6) return 'Ruang Pertemuan & Whiteboard';
  if (z <= -12 && x >= 6) return 'Cluster Server & Database';
  if (z <= -12 && x < 0) return 'Lab Riset AI & GraphRAG';
  if (z > -12 && z <= -4 && x >= 6) return 'Musholla & Ruang Doa';
  if (z > -12 && z <= -4 && x < 0) return 'Ruang QA & Testing';
  if (z > 4 && z <= 12 && x >= 6) return 'Pantry & Coffee Station';

  return 'Koneksi Digital Inovasi';
}

// ===========================
// Inner 3D Scene View
// ===========================
interface GameSceneProps {
  currentFloor: FloorId;
  worldState: OfficeWorldState;
  playerController: PlayerController;
  playerState: PlayerState;
  followedAgent: OfficeAgentDetail | null;
  isOverviewMode: boolean;
  onYawChange: (yaw: number) => void;
  onCallLift: () => void;
  onTalkNaya: () => void;
  onTalkSinta?: () => void;
  onOpenPortfolio: () => void;
  onOpenFoodCart: () => void;
  onOpenCEOCommand: () => void;
  onSelectAgent: (agent: OfficeAgentDetail) => void;
  onSelectRoom: (room: OfficeRoom) => void;
  onSelectServer: (server: ServerNode) => void;
  onSelectProject: (project: OfficeProjectItem) => void;
  onSelectWhiteboard: () => void;
}

const GameScene: React.FC<GameSceneProps> = ({
  currentFloor,
  worldState,
  playerController,
  playerState,
  followedAgent,
  isOverviewMode,
  onYawChange,
  onCallLift,
  onTalkNaya,
  onTalkSinta,
  onOpenPortfolio,
  onOpenFoodCart,
  onOpenCEOCommand,
  onSelectAgent,
  onSelectRoom,
  onSelectServer,
  onSelectProject,
  onSelectWhiteboard,
}) => {
  const cameraYawRef = useRef(135);

  useAppEvent('update', (dt: number) => {
    playerController.update(dt, cameraYawRef.current);
  });

  const handleYaw = useCallback((yaw: number) => {
    cameraYawRef.current = yaw;
    onYawChange(yaw);
  }, [onYawChange]);

  const followedPos = useMemo(() => {
    if (!followedAgent) return null;
    return {
      x: followedAgent.position[0],
      y: followedAgent.position[1],
      z: followedAgent.position[2],
    };
  }, [followedAgent]);

  const talkNayaHandler = onTalkNaya || onTalkSinta;

  return (
    <>
      {/* 1. Cozy Top-Down Isometric Camera */}
      <CozyIsometricCamera
        playerState={playerState}
        followedTarget={followedPos}
        isOverviewMode={isOverviewMode}
        onYawChange={handleYaw}
        fov={32}
      />

      {/* 2. Cozy Lighting Rig */}
      <OfficeLighting />

      {/* 3. Player Chibi Character */}
      <PlayerAvatar playerState={playerState} />

      {/* 4. Active Floor Environment */}
      {currentFloor === 'GROUND' && (
        <GroundFloor
          worldState={worldState}
          onCallLift={onCallLift}
          onTalkNaya={talkNayaHandler}
          onTalkSinta={talkNayaHandler}
          onOpenPortfolio={onOpenPortfolio}
          onOpenFoodCart={onOpenFoodCart}
          onOpenCEOCommand={onOpenCEOCommand}
          onSelectAgent={onSelectAgent}
          onSelectRoom={onSelectRoom}
          onSelectServer={onSelectServer}
          onSelectProject={onSelectProject}
          onSelectWhiteboard={onSelectWhiteboard}
        />
      )}

      {currentFloor === 'FLOOR_2' && (
        <Floor2OpenSpace
          onCallLift={onCallLift}
          onInspectStudio={talkNayaHandler}
          onInspectSleepPod={() => {}}
        />
      )}

      {currentFloor === 'ROOFTOP' && (
        <RooftopGarden
          onCallLift={onCallLift}
          onSitFirepit={() => {}}
          onOrderDrink={() => {}}
        />
      )}
    </>
  );
};

// ===========================
// Main Game Office App Props
// ===========================
export interface GameOfficeAppProps {
  character: PlayableCharacter;
  apiUrl?: string;
  wsUrl?: string;
  token?: string | null;
  username?: string;
  wsConnected?: boolean;
  isOwner?: boolean;
  onExitGame?: () => void;
  onLoginOwner?: () => void;
  onChangeCharacter?: () => void;
  onOpenModuleDirect?: (mod: string) => void;
}

export const GameOfficeApp: React.FC<GameOfficeAppProps> = ({
  character,
  apiUrl = 'http://localhost:3000',
  wsUrl = 'ws://localhost:3000/ws/v1/events',
  token,
  username = 'Operator',
  wsConnected = false,
  isOwner = true,
  onExitGame,
  onLoginOwner,
  onChangeCharacter,
  onOpenModuleDirect,
}) => {
  const [isSupported] = useState(checkWebGLSupport);
  const [currentFloor, setCurrentFloor] = useState<FloorId>('GROUND');
  const [worldState, setWorldState] = useState<OfficeWorldState>(() =>
    OfficeWorldStore.getInstance().getState()
  );
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [, setCameraYaw] = useState(135);

  // Camera & Mode states
  const [isOverviewMode, setIsOverviewMode] = useState(false);
  const [followedAgent, setFollowedAgent] = useState<OfficeAgentDetail | null>(null);

  // Modals state
  const [showElevatorModal, setShowElevatorModal] = useState(false);
  const [showNayaModal, setShowNayaModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showFoodCartModal, setShowFoodCartModal] = useState(false);
  const [showCEORoomModal, setShowCEORoomModal] = useState(false);
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);
  const [showAgentInspector, setShowAgentInspector] = useState(false);
  const [inspectingAgent, setInspectingAgent] = useState<OfficeAgentDetail | null>(null);

  // Legacy preserved modals
  const [conversationAgent, setConversationAgent] = useState<OfficeAgentDetail | null>(null);
  const [showServerModal, setShowServerModal] = useState(false);
  const [showWhiteboardModal, setShowWhiteboardModal] = useState(false);
  const [showPrayerModal, setShowPrayerModal] = useState(false);

  const playerControllerRef = useRef<PlayerController | null>(null);
  const inputRef = useRef({ forward: false, backward: false, left: false, right: false, run: false, interact: false });

  // Initialize PlayerController at Floor 1 entrance
  useEffect(() => {
    const controller = new PlayerController(character, 0, 24);
    playerControllerRef.current = controller;

    const unsub = controller.subscribe((state) => {
      setPlayerState({ ...state });
    });
    setPlayerState(controller.getState());

    return () => { unsub(); };
  }, [character]);

  // Initialize OfficeWorldStore
  useEffect(() => {
    const store = OfficeWorldStore.getInstance();
    store.init(apiUrl, wsUrl);
    const unsub = store.subscribe((s) => setWorldState(s));
    return () => { unsub(); };
  }, [apiUrl, wsUrl]);

  // Switch Floor logic: teleports player to floor spawn point smoothly
  const handleSwitchFloor = useCallback((targetFloor: FloorId) => {
    setCurrentFloor(targetFloor);
    const meta = FLOOR_METAS[targetFloor];
    playerControllerRef.current?.teleportTo(meta.spawnPoint[0], meta.spawnPoint[2]);
  }, []);

  // Keyboard input
  useEffect(() => {
    const KEY_MAP: Record<string, keyof typeof inputRef.current> = {
      KeyW: 'forward', ArrowUp: 'forward',
      KeyS: 'backward', ArrowDown: 'backward',
      KeyA: 'left', ArrowLeft: 'left',
      KeyD: 'right', ArrowRight: 'right',
      ShiftLeft: 'run', ShiftRight: 'run',
      KeyE: 'interact',
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      const key = KEY_MAP[e.code];
      if (!key) return;
      e.preventDefault();

      if (key === 'interact' && !inputRef.current.interact) {
        handleInteractTrigger();
      } else if (key !== 'interact') {
        inputRef.current[key] = true;
        playerControllerRef.current?.setInput({ [key]: true });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = KEY_MAP[e.code];
      if (!key || key === 'interact') return;
      inputRef.current[key] = false;
      playerControllerRef.current?.setInput({ [key]: false });
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [currentFloor]);

  // Proximity Detection
  const agentsList = useMemo(() => Array.from(worldState.agents.values()), [worldState.agents]);

  const nearbyAgents: NearbyAgent[] = useMemo(() => {
    if (!playerState || currentFloor !== 'GROUND') return [];
    return ProximityDetector.findNearbyAgents(playerState.x, playerState.z, agentsList);
  }, [playerState, currentFloor, agentsList]);

  const nearbyInteractables: NearbyWorldInteractable[] = useMemo(() => {
    if (!playerState) return [];
    return ProximityDetector.findNearbyInteractables(playerState.x, playerState.z, currentFloor);
  }, [playerState, currentFloor]);

  const nearestInteractable = nearbyInteractables[0]?.interactable || null;
  const nearestAgent = nearbyAgents[0]?.agent || null;

  // Compute active prompt string for HUD
  const activePromptString = useMemo(() => {
    if (nearestInteractable) return nearestInteractable.prompt;
    if (nearestAgent) return `Bicara dengan ${nearestAgent.name}`;
    return null;
  }, [nearestInteractable, nearestAgent]);

  // Trigger interaction based on nearest object or agent
  const handleInteractTrigger = useCallback(() => {
    if (nearestInteractable) {
      switch (nearestInteractable.type) {
        case 'LIFT':
          setShowElevatorModal(true);
          break;
        case 'NAYA':
          setShowNayaModal(true);
          break;
        case 'PORTFOLIO':
          setShowPortfolioModal(true);
          break;
        case 'FOOD_CART':
          setShowFoodCartModal(true);
          break;
        case 'CEO_DESK':
          setShowCEORoomModal(true);
          break;
        case 'SERVER':
          setShowServerModal(true);
          break;
        case 'WHITEBOARD':
          setShowWhiteboardModal(true);
          break;
        case 'PRAYER':
          setShowPrayerModal(true);
          break;
        case 'COFFEE':
          setShowFoodCartModal(true);
          break;
        default:
          break;
      }
      return;
    }

    if (nearestAgent) {
      if (isOwner) {
        setInspectingAgent(nearestAgent);
        setShowAgentInspector(true);
      } else {
        setConversationAgent(nearestAgent);
      }
    }
  }, [nearestInteractable, nearestAgent, isOwner]);

  const locationLabel = useMemo(
    () => playerState ? getDetailedRoomLabel(currentFloor, playerState.x, playerState.z) : 'KDI AI Office',
    [currentFloor, playerState]
  );

  const canvasStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
    display: 'block',
    outline: 'none',
  }), []);

  if (!playerState) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 space-y-3">
        <span className="text-3xl animate-bounce">🏢</span>
        <div className="text-sm font-semibold tracking-wide text-slate-300">
          Memuat Kantor Virtual KDI…
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950" style={{ minHeight: '100vh' }}>
      {/* 3D Viewport or 2D Fallback */}
      {!isSupported || worldState.is2DMode ? (
        <Office2DFallback
          worldState={worldState}
          onSelectAgent={(agent) => {
            setConversationAgent(agent);
          }}
          onSelectServer={() => setShowServerModal(true)}
          onSelectRoom={() => {}}
        />
      ) : (
        <Application
          style={canvasStyle}
          fillMode={FILLMODE_NONE}
          resolutionMode={RESOLUTION_AUTO}
          usePhysics={false}
        >
          <GameScene
            currentFloor={currentFloor}
            worldState={worldState}
            playerController={playerControllerRef.current!}
            playerState={playerState}
            followedAgent={followedAgent}
            isOverviewMode={isOverviewMode}
            onYawChange={setCameraYaw}
            onCallLift={() => setShowElevatorModal(true)}
            onTalkNaya={() => setShowNayaModal(true)}
            onTalkSinta={() => setShowNayaModal(true)}
            onOpenPortfolio={() => setShowPortfolioModal(true)}
            onOpenFoodCart={() => setShowFoodCartModal(true)}
            onOpenCEOCommand={() => setShowCEORoomModal(true)}
            onSelectAgent={(agent) => {
              if (isOwner) {
                setInspectingAgent(agent);
                setShowAgentInspector(true);
              } else {
                setConversationAgent(agent);
              }
            }}
            onSelectRoom={() => {}}
            onSelectServer={() => setShowServerModal(true)}
            onSelectProject={() => setShowPortfolioModal(true)}
            onSelectWhiteboard={() => setShowWhiteboardModal(true)}
          />
        </Application>
      )}

      {/* Ultra-Clean Game HUD Overlay */}
      <CozyGameHUD
        playerCharacter={character}
        currentFloor={currentFloor}
        locationLabel={locationLabel}
        nearbyPrompt={activePromptString}
        onInteract={handleInteractTrigger}
        onOpenElevator={() => setShowElevatorModal(true)}
        onSwitchFloor={handleSwitchFloor}
        wsConnected={wsConnected}
        isOwner={isOwner}
        onOpenOwnerPanel={() => setShowOwnerPanel(true)}
        onLoginOwner={onLoginOwner}
        onChangeCharacter={() => onChangeCharacter?.()}
        isOverviewMode={isOverviewMode}
        onToggleOverviewMode={() => setIsOverviewMode((prev) => !prev)}
      />

      {/* ── MODALS ── */}
      {/* 1. Elevator Lift Modal */}
      {showElevatorModal && (
        <ElevatorModal
          currentFloor={currentFloor}
          onSelectFloor={handleSwitchFloor}
          onClose={() => setShowElevatorModal(false)}
        />
      )}

      {/* 2. Naya Account Manager Dedicated Dialogue Modal */}
      {showNayaModal && (
        <NayaDialogueModal
          apiUrl={apiUrl}
          token={token}
          onClose={() => setShowNayaModal(false)}
        />
      )}

      {/* 3. Portfolio Showcase Modal */}
      {showPortfolioModal && (
        <CozyPortfolioModal
          onClose={() => setShowPortfolioModal(false)}
          onOpenNayaOffer={() => {
            setShowPortfolioModal(false);
            setShowNayaModal(true);
          }}
          onOpenSintaOffer={() => {
            setShowPortfolioModal(false);
            setShowNayaModal(true);
          }}
        />
      )}

      {/* 4. Pak Joko Food Cart Modal */}
      {showFoodCartModal && (
        <FoodCartModal onClose={() => setShowFoodCartModal(false)} />
      )}

      {/* 5. CEO Room Workstation Modal */}
      {showCEORoomModal && (
        <CEORoomModal
          isOwner={isOwner}
          onOpenModule={(mod) => {
            setShowCEORoomModal(false);
            if (mod === 'command') {
              setShowOwnerPanel(true);
            } else if (onOpenModuleDirect) {
              onOpenModuleDirect(mod);
            }
          }}
          onClose={() => setShowCEORoomModal(false)}
        />
      )}

      {/* 6. Owner Suite & Command Center Panel */}
      {showOwnerPanel && (
        <OwnerControlPanel
          apiUrl={apiUrl}
          token={token}
          username={username}
          isOverviewMode={isOverviewMode}
          onToggleOverviewMode={() => setIsOverviewMode((prev) => !prev)}
          onClose={() => setShowOwnerPanel(false)}
        />
      )}

      {/* 7. Agent Inspector Modal (Owner inspects specific agent) */}
      {showAgentInspector && inspectingAgent && (
        <AgentInspectorModal
          agent={inspectingAgent}
          isInternalMode={true}
          onFollowAgent={(agent) => {
            setFollowedAgent(agent);
            setShowAgentInspector(false);
          }}
          onClose={() => {
            setShowAgentInspector(false);
            setInspectingAgent(null);
          }}
        />
      )}

      {/* 8. Regular Agent Chat Modal (Public or Non-Owner conversation) */}
      {conversationAgent && (
        <GameConversationUI
          agent={conversationAgent}
          isInternalMode={false}
          apiUrl={apiUrl}
          token={token}
          onClose={() => setConversationAgent(null)}
        />
      )}

      {/* 9. Server Room Health Modal */}
      {showServerModal && (
        <ServerRoomModal
          serverNodes={worldState.serverNodes}
          selectedNode={null}
          onClose={() => setShowServerModal(false)}
        />
      )}

      {/* 10. Whiteboard Collaboration Modal */}
      {showWhiteboardModal && (
        <WhiteboardModal
          meeting={worldState.meetings.find((m) => m.status === 'ACTIVE') || null}
          onClose={() => setShowWhiteboardModal(false)}
        />
      )}

      {/* 11. Musholla Prayer Sanctuary Modal */}
      {showPrayerModal && (
        <PrayerModal
          activePrayer={worldState.activePrayer}
          onClose={() => setShowPrayerModal(false)}
        />
      )}
    </div>
  );
};
