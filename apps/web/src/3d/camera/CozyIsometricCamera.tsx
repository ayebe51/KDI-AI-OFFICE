// ==========================================================
// 3d/camera/CozyIsometricCamera.tsx
// Top-Down Cozy Isometric Camera Rig with Smooth Follow,
// Mouse/Touch Orbit, Pinch Zoom, and Owner Overview Mode
// ==========================================================

import React, { useRef, useEffect } from 'react';
import { Vec3 } from 'playcanvas';
import type { Entity as PcEntity } from 'playcanvas';
import { Entity } from '@playcanvas/react';
import { Camera } from '@playcanvas/react/components';
import { useAppEvent } from '@playcanvas/react/hooks';
import type { PlayerState } from '../character/PlayerController.js';

export interface CozyIsometricCameraProps {
  playerState: PlayerState;
  followedTarget?: { x: number; y: number; z: number } | null;
  isOverviewMode?: boolean;
  onYawChange?: (yaw: number) => void;
  fov?: number;
}

const DEFAULT_DISTANCE = 14.0;
const OVERVIEW_DISTANCE = 28.0;
const DEFAULT_PITCH = 35; // classic isometric tilt
const DEFAULT_YAW = 135;  // 45-degree angle
const MIN_DISTANCE = 6;
const MAX_DISTANCE = 35;
const MIN_PITCH = 18;
const MAX_PITCH = 70;
const LERP_SPEED = 5.5;

export const CozyIsometricCamera: React.FC<CozyIsometricCameraProps> = ({
  playerState,
  followedTarget = null,
  isOverviewMode = false,
  onYawChange,
  fov = 32, // low FOV gives near-orthographic, cozy isometric game look
}) => {
  const cameraRef = useRef<PcEntity>(null);

  // Camera angles
  const yawRef = useRef(DEFAULT_YAW);
  const pitchRef = useRef(DEFAULT_PITCH);
  const distanceRef = useRef(isOverviewMode ? OVERVIEW_DISTANCE : DEFAULT_DISTANCE);

  // Smoothed focus target and camera position
  const targetPosRef = useRef(new Vec3(playerState.x, playerState.y + 1.0, playerState.z));
  const currentPosRef = useRef(new Vec3(playerState.x + 10, playerState.y + 14, playerState.z + 10));

  // Mouse drag state
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    distanceRef.current = isOverviewMode ? OVERVIEW_DISTANCE : DEFAULT_DISTANCE;
    if (isOverviewMode) {
      pitchRef.current = 50;
    } else {
      pitchRef.current = DEFAULT_PITCH;
    }
  }, [isOverviewMode]);

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      // Right-click or middle-click or Left-click with alt
      if (e.button === 2 || e.button === 1 || (e.button === 0 && e.altKey)) {
        isDraggingRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };

      yawRef.current -= dx * 0.35;
      pitchRef.current = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitchRef.current + dy * 0.3));
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      canvas.style.cursor = 'default';
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      distanceRef.current = Math.max(
        MIN_DISTANCE,
        Math.min(MAX_DISTANCE, distanceRef.current + e.deltaY * 0.02)
      );
    };

    // Touch support (1 finger or 2 finger pinch)
    let lastTouchDist = 0;
    let lastTouch: { x: number; y: number } | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = lastTouchDist - dist;
        lastTouchDist = dist;
        distanceRef.current = Math.max(
          MIN_DISTANCE,
          Math.min(MAX_DISTANCE, distanceRef.current + delta * 0.05)
        );
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  useAppEvent('update', (dt: number) => {
    // Determine focal target (either followed agent or player)
    const focusX = followedTarget ? followedTarget.x : playerState.x;
    const focusY = (followedTarget ? followedTarget.y : playerState.y) + 1.1;
    const focusZ = followedTarget ? followedTarget.z : playerState.z;

    const lf = Math.min(dt * LERP_SPEED, 1);
    targetPosRef.current.x += (focusX - targetPosRef.current.x) * lf;
    targetPosRef.current.y += (focusY - targetPosRef.current.y) * lf;
    targetPosRef.current.z += (focusZ - targetPosRef.current.z) * lf;

    const yawRad = (yawRef.current * Math.PI) / 180;
    const pitchRad = (pitchRef.current * Math.PI) / 180;
    const dist = distanceRef.current;

    const desiredX = targetPosRef.current.x + dist * Math.sin(yawRad) * Math.cos(pitchRad);
    const desiredY = targetPosRef.current.y + dist * Math.sin(pitchRad);
    const desiredZ = targetPosRef.current.z + dist * Math.cos(yawRad) * Math.cos(pitchRad);

    currentPosRef.current.x += (desiredX - currentPosRef.current.x) * lf;
    currentPosRef.current.y += (desiredY - currentPosRef.current.y) * lf;
    currentPosRef.current.z += (desiredZ - currentPosRef.current.z) * lf;

    if (cameraRef.current) {
      cameraRef.current.setLocalPosition(
        currentPosRef.current.x,
        currentPosRef.current.y,
        currentPosRef.current.z
      );
      cameraRef.current.lookAt(
        new Vec3(targetPosRef.current.x, targetPosRef.current.y, targetPosRef.current.z)
      );
    }

    onYawChange?.(yawRef.current);
  });

  return (
    <Entity
      ref={cameraRef}
      name="CozyIsometricCamera"
      position={[currentPosRef.current.x, currentPosRef.current.y, currentPosRef.current.z]}
    >
      <Camera
        fov={fov}
        nearClip={0.2}
        farClip={180}
        clearColor="#eaf2f8"
      />
    </Entity>
  );
};
