// ==========================================================
// KDI AI OFFICE — MUNDER DIFFLIN UI MIGRATION
// OfficeCanvas: Interactive 2D Pixel Office Floor (Pixi.js v8)
// ==========================================================

import React, { useEffect, useRef, useState } from 'react';
import { Application, Assets, Container, Texture } from 'pixi.js';
import { TiledMapRenderer } from './TiledMapRenderer';
import { Camera } from './Camera';
import { Character, type CharacterOptions } from './Character';
import { DeskScreen } from './DeskScreen';
import { resolveThemeMap, themeTilesetUrls, loadKdiTheme } from './themeLoader';
import { getCastFrames, hexToNumber, KDI_CAST, type KdiCharacterName } from './kdiCast';
import { useKdiOfficeStore } from '../state/kdiOfficeStore';

interface OfficeCanvasProps {
  onSelectAgent?: (agentId: string) => void;
  className?: string;
}

export const OfficeCanvas: React.FC<OfficeCanvasProps> = ({ onSelectAgent, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const charactersRef = useRef<Map<string, Character>>(new Map());
  const deskScreensRef = useRef<DeskScreen[]>([]);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const snapshot = useKdiOfficeStore((s) => s.snapshot);
  const selectedAgentId = useKdiOfficeStore((s) => s.selectedAgentId);
  const selectAgentInStore = useKdiOfficeStore((s) => s.selectAgent);

  useEffect(() => {
    let destroyed = false;
    const container = containerRef.current;
    if (!container) return;

    async function initPixi() {
      try {
        const app = new Application();
        await app.init({
          width: container.clientWidth || 960,
          height: container.clientHeight || 700,
          backgroundColor: 0x0f172a, // Slate 900
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
          antialias: false,
        });

        if (destroyed) {
          app.destroy(true);
          return;
        }

        appRef.current = app;
        container.appendChild(app.canvas);
        app.canvas.style.display = 'block';
        app.canvas.style.width = '100%';
        app.canvas.style.height = '100%';
        app.canvas.style.imageRendering = 'pixelated';

        // Load KDI Theme assets
        const theme = await loadKdiTheme();
        const urls = themeTilesetUrls(theme);
        const textures: Texture[] = await Promise.all(
          urls.map((url) => Assets.load(url))
        );

        if (destroyed) {
          app.destroy(true);
          return;
        }

        const mapData = resolveThemeMap(theme);
        const mapRenderer = new TiledMapRenderer(mapData, textures);

        const worldContainer = mapRenderer.getContainer();
        app.stage.addChild(worldContainer);

        // Setup camera
        const camera = new Camera(worldContainer);
        camera.setMapSize(mapData.width * mapData.tilewidth, mapData.height * mapData.tileheight);
        camera.setViewSize(app.screen.width, app.screen.height);
        camera.fitToScreen();
        cameraRef.current = camera;

        // Setup Desk Monitors at prominent work stations
        const monitorPositions = [
          { x: 8, y: 10 },
          { x: 13, y: 10 },
          { x: 18, y: 10 },
          { x: 8, y: 17 },
          { x: 13, y: 17 },
          { x: 18, y: 17 },
        ];
        const deskScreens: DeskScreen[] = [];
        for (const pos of monitorPositions) {
          try {
            const screen = new DeskScreen(mapRenderer, pos);
            mapRenderer.getCharacterContainer().addChild(screen.container);
            deskScreens.push(screen);
          } catch {
            // ignore tile index boundary fallback
          }
        }
        deskScreensRef.current = deskScreens;

        // Spawn KDI Characters
        const charContainer = mapRenderer.getCharacterContainer();
        const charsMap = new Map<string, Character>();

        for (const member of KDI_CAST) {
          const charKey = member.name as KdiCharacterName;
          const frames = await getCastFrames(charKey);

          // Resolve seat tile from map spawn points
          const SEAT_MAP: Record<string, string> = {
            orchestrator: 'desk-ceo',
            farhan: 'desk-jim',
            rian: 'desk-pam',
            ahmad: 'desk-dwight',
            nadia: 'desk-angela',
            maya: 'desk-kevin',
            naya: 'desk-oscar',
          };
          const seatName = SEAT_MAP[charKey] || 'desk-jim';
          const spawn = mapRenderer.getSpawnPoint(seatName);
          const deskPos = spawn ? mapRenderer.pixelToTile(spawn.x, spawn.y) : { x: 14, y: 11 };
          const seatFacing: 'up' | 'down' | 'left' | 'right' =
            charKey === 'orchestrator' || charKey === 'nadia' || charKey === 'maya' || charKey === 'naya'
              ? 'down'
              : 'up';

          const charOptions: CharacterOptions = {
            agentId: member.name,
            mapRenderer,
            frames,
            seatTile: { x: deskPos.x, y: deskPos.y },
            glowColor: hexToNumber(member.shirt),
            seatDirection: seatFacing,
            onClick: (id: string) => {
              // Map character key back to full agent id
              const matchingAgent = Object.values(snapshot.agents).find(
                (a) => a.characterKey === id || a.id.toLowerCase().includes(id)
              );
              const targetId = matchingAgent ? matchingAgent.id : id;
              selectAgentInStore(targetId);
              onSelectAgent?.(targetId);
            },
          };

          const character = new Character(charOptions);
          character.show(charContainer);
          character.sitAtDesk(true);
          charsMap.set(charKey, character);
        }

        charactersRef.current = charsMap;

        // Main game ticker loop
        app.ticker.add((ticker) => {
          const dt = ticker.deltaTime / 60;
          camera.update(dt);
          for (const char of charsMap.values()) {
            char.update(dt);
          }
          for (const scr of deskScreens) {
            scr.update(dt);
          }
        });

        setLoading(false);
      } catch (err: unknown) {
        console.error('Failed to initialize Pixi office canvas:', err);
        setInitError(err instanceof Error ? err.message : 'Unknown canvas initialization error');
        setLoading(false);
      }
    }

    initPixi();

    // Resize observer
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (appRef.current && cameraRef.current && width > 0 && height > 0) {
          appRef.current.renderer.resize(width, height);
          cameraRef.current.setViewSize(width, height);
        }
      }
    });
    ro.observe(container);

    return () => {
      destroyed = true;
      ro.disconnect();
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: false });
        appRef.current = null;
      }
    };
  }, []);

  // Update character states when snapshot updates
  useEffect(() => {
    if (!charactersRef.current.size) return;

    let index = 0;
    for (const [charKey, char] of charactersRef.current.entries()) {
      // Find matching agent projection from KDI snapshot
      const agent = Object.values(snapshot.agents).find(
        (a) => a.characterKey === charKey || a.id.toLowerCase().includes(charKey)
      );

      if (agent) {
        const isWorking =
          agent.status === 'CODING' ||
          agent.status === 'WORKING' ||
          agent.status === 'TESTING' ||
          agent.status === 'DEBUGGING' ||
          agent.status === 'REVIEWING' ||
          agent.status === 'PLANNING';

        if (isWorking) {
          char.sitAtDesk(true);
          if (deskScreensRef.current[index]) {
            deskScreensRef.current[index].setOn(true);
          }
        } else if (agent.status === 'BLOCKED') {
          char.setStatusGlyph('blocked');
        } else if (agent.status === 'COMPLETED') {
          char.setStatusGlyph('success');
          char.cheer();
        } else {
          // IDLE or WAITING
          char.sitAtDesk(false);
          if (deskScreensRef.current[index]) {
            deskScreensRef.current[index].setOn(false);
          }
        }

        // Show activity or task as thought bubble
        if (agent.activity) {
          const tool = agent.toolsInUse?.[0] || (agent.status === 'CODING' ? 'Edit' : undefined);
          char.showThought(agent.activity, tool);
        } else {
          char.hideThought();
        }
      }
      index++;
    }
  }, [snapshot]);

  // Focus camera when an agent is selected
  useEffect(() => {
    if (!selectedAgentId || !cameraRef.current) return;

    const agent = snapshot.agents[selectedAgentId];
    if (agent && agent.seatLocation) {
      const tileSize = 16;
      cameraRef.current.focusOn(
        agent.seatLocation.x * tileSize + tileSize / 2,
        agent.seatLocation.y * tileSize + tileSize / 2,
        2.5
      );
    }
  }, [selectedAgentId, snapshot.agents]);

  // Mouse pan and zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !cameraRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    const zoom = cameraRef.current.getZoom();
    // Nudge target position proportionally
    cameraRef.current.nudgeToward(
      (dx / zoom),
      (dy / zoom),
      100
    );
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!cameraRef.current) return;
    e.preventDefault();
    const currentZoom = cameraRef.current.getZoom();
    const zoomDelta = e.deltaY < 0 ? 0.2 : -0.2;
    const targetZoom = Math.min(4.0, Math.max(1.0, currentZoom + zoomDelta));
    cameraRef.current.focusOn(
      e.nativeEvent.offsetX,
      e.nativeEvent.offsetY,
      targetZoom
    );
  };

  const handleDoubleClick = () => {
    if (cameraRef.current) {
      cameraRef.current.fitToScreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-slate-950 select-none cursor-grab active:cursor-grabbing ${className || ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      title="Click and drag to pan • Scroll to zoom • Double-click to reset view"
    >
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20 text-slate-300">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-mono uppercase tracking-widest text-cyan-400">Loading KDI Office Projection...</p>
        </div>
      )}

      {initError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/90 z-20 text-red-200 p-6 text-center">
          <p className="font-bold text-sm mb-1">Canvas Render Error</p>
          <p className="text-xs font-mono text-red-400 max-w-md">{initError}</p>
        </div>
      )}

      {/* Floating View Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center space-x-1 bg-slate-900/90 border border-slate-700/60 rounded-lg p-1 text-slate-300 shadow-xl backdrop-blur-sm">
        <button
          type="button"
          onClick={() => {
            if (cameraRef.current) {
              const z = cameraRef.current.getZoom();
              cameraRef.current.focusOn(480, 400, Math.min(4, z + 0.3));
            }
          }}
          className="px-2 py-1 text-xs font-bold hover:bg-slate-800 rounded transition"
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            if (cameraRef.current) {
              const z = cameraRef.current.getZoom();
              cameraRef.current.focusOn(480, 400, Math.max(1, z - 0.3));
            }
          }}
          className="px-2 py-1 text-xs font-bold hover:bg-slate-800 rounded transition"
          title="Zoom Out"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => cameraRef.current?.fitToScreen()}
          className="px-2.5 py-1 text-[11px] font-mono hover:bg-slate-800 rounded transition border-l border-slate-800"
          title="Reset View"
        >
          Reset
        </button>
      </div>
    </div>
  );
};
