// ==========================================================
// 3d/character/PlayerController.ts
// Player Character State & WASD Movement Logic
// Third-Person, game-like control
// ==========================================================

import type { PlayableCharacter } from './CharacterTypes.js';

export interface PlayerState {
  character: PlayableCharacter;
  /** World position */
  x: number;
  y: number;
  z: number;
  /** Y rotation in degrees */
  rotY: number;
  /** Current movement animation */
  animation: 'idle' | 'walk' | 'run' | 'interact';
  /** Whether player is currently interacting */
  isInteracting: boolean;
  /** Current speed scalar */
  speed: number;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
  interact: boolean;
}

const WALK_SPEED = 3.5;
const RUN_SPEED = 6.5;

export class PlayerController {
  private state: PlayerState;
  private input: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    run: false,
    interact: false,
  };

  private listeners: Array<(state: PlayerState) => void> = [];

  constructor(character: PlayableCharacter, startX = 0, startZ = 18) {
    this.state = {
      character,
      x: startX,
      y: 0,
      z: startZ,
      rotY: 180,
      animation: 'idle',
      isInteracting: false,
      speed: 0,
    };
  }

  getState(): PlayerState {
    return { ...this.state };
  }

  subscribe(listener: (state: PlayerState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }

  setInput(partial: Partial<InputState>) {
    this.input = { ...this.input, ...partial };
  }

  /**
   * Called each frame with delta time (seconds).
   * cameraYaw: current camera horizontal angle in degrees (used for directional movement)
   */
  update(dt: number, cameraYaw: number) {
    const { forward, backward, left, right, run } = this.input;
    const moving = forward || backward || left || right;

    if (!moving) {
      this.state.animation = 'idle';
      this.state.speed = 0;
      this.notify();
      return;
    }

    const speed = run ? RUN_SPEED : WALK_SPEED;
    this.state.speed = speed;
    this.state.animation = run ? 'run' : 'walk';

    // Build movement vector in camera space
    let dx = 0;
    let dz = 0;
    if (forward) dz -= 1;
    if (backward) dz += 1;
    if (left) dx -= 1;
    if (right) dx += 1;

    // Normalize diagonal
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
    }

    // Rotate by camera yaw
    const camRad = (cameraYaw * Math.PI) / 180;
    const worldDx = dx * Math.cos(camRad) + dz * Math.sin(camRad);
    const worldDz = -dx * Math.sin(camRad) + dz * Math.cos(camRad);

    // Update position
    this.state.x += worldDx * speed * dt;
    this.state.z += worldDz * speed * dt;

    // Clamp within world bounds (generous office area)
    this.state.x = Math.max(-22, Math.min(22, this.state.x));
    this.state.z = Math.max(-20, Math.min(30, this.state.z));

    // Face movement direction
    if (len > 0) {
      const angle = Math.atan2(worldDx, worldDz) * (180 / Math.PI);
      // Smooth rotation
      let diff = angle - this.state.rotY;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      this.state.rotY += diff * Math.min(dt * 12, 1);
    }

    this.notify();
  }

  teleportTo(x: number, z: number) {
    this.state.x = x;
    this.state.z = z;
    this.notify();
  }

  setInteracting(val: boolean) {
    this.state.isInteracting = val;
    this.state.animation = val ? 'interact' : 'idle';
    this.notify();
  }
}
