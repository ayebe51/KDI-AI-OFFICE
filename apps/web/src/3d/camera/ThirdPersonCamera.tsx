// ==========================================================
// 3d/camera/ThirdPersonCamera.tsx
// Third-Person Follow Camera — game-like, follows PlayerCharacter
// Mouse drag = rotate camera. Scroll = zoom.
// ==========================================================

import React, { useRef, useEffect } from 'react';
import { Vec3 } from 'playcanvas';
import type { Entity as PcEntity } from 'playcanvas';
import { Entity } from '@playcanvas/react';
import { Camera } from '@playcanvas/react/components';
import { useAppEvent } from '@playcanvas/react/hooks';
import type { PlayerState } from '../character/PlayerController.js';

export interface ThirdPersonCameraProps {
  playerState: PlayerState;
  /** Called each frame with current camera yaw so PlayerController can align movement */
  onYawChange?: (yaw: number) => void;
  fov?: number;
}

const CAMERA_DISTANCE_DEFAULT = 8;
const CAMERA_PITCH_DEFAULT = 28; // degrees above horizontal
const CAMERA_HEIGHT_OFFSET = 1.2;
const MIN_DISTANCE = 3;
const MAX_DISTANCE = 20;
const MIN_PITCH = 5;
const MAX_PITCH = 70;
const LERP_SPEED = 6.0;

export const ThirdPersonCamera: React.FC<ThirdPersonCameraProps> = ({
  playerState,
  onYawChange,
  fov = 50,
}) => {
  const cameraRef = useRef<PcEntity>(null);

  // Camera orbit state (persisted across frames)
  const yawRef = useRef(180);           // horizontal angle
  const pitchRef = useRef(CAMERA_PITCH_DEFAULT);
  const distanceRef = useRef(CAMERA_DISTANCE_DEFAULT);

  // Smoothed target position
  const targetPosRef = useRef(new Vec3(0, 0, 18));
  const currentPosRef = useRef(new Vec3(0, 6, 26));

  // Mouse drag state
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
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
        Math.min(MAX_DISTANCE, distanceRef.current + e.deltaY * 0.015)
      );
    };

    // Touch support
    let lastTouchDist = 0;
    let lastTouch: { x: number; y: number } | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && lastTouch) {
        const dx = e.touches[0].clientX - lastTouch.x;
        const dy = e.touches[0].clientY - lastTouch.y;
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        yawRef.current -= dx * 0.4;
        pitchRef.current = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitchRef.current + dy * 0.35));
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = lastTouchDist - dist;
        lastTouchDist = dist;
        distanceRef.current = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, distanceRef.current + delta * 0.04));
      }
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
      lastTouch = null;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  useAppEvent('update', (dt: number) => {
    const ps = playerState;

    // Target point: player position + height offset
    const targetX = ps.x;
    const targetY = ps.y + CAMERA_HEIGHT_OFFSET;
    const targetZ = ps.z;

    // Lerp target
    const lf = Math.min(dt * LERP_SPEED, 1);
    targetPosRef.current.x += (targetX - targetPosRef.current.x) * lf;
    targetPosRef.current.y += (targetY - targetPosRef.current.y) * lf;
    targetPosRef.current.z += (targetZ - targetPosRef.current.z) * lf;

    // Spherical coordinates
    const yawRad = (yawRef.current * Math.PI) / 180;
    const pitchRad = (pitchRef.current * Math.PI) / 180;
    const dist = distanceRef.current;

    const desiredX = targetPosRef.current.x + dist * Math.sin(yawRad) * Math.cos(pitchRad);
    const desiredY = targetPosRef.current.y + dist * Math.sin(pitchRad);
    const desiredZ = targetPosRef.current.z + dist * Math.cos(yawRad) * Math.cos(pitchRad);

    // Lerp camera position
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

    // Notify current yaw so movement stays camera-relative
    onYawChange?.(yawRef.current);
  });

  return (
    <Entity
      ref={cameraRef}
      name="ThirdPersonCamera"
      position={[currentPosRef.current.x, currentPosRef.current.y, currentPosRef.current.z]}
    >
      <Camera
        fov={fov}
        nearClip={0.1}
        farClip={200}
        clearColor="#d4e8f7"
      />
    </Entity>
  );
};
