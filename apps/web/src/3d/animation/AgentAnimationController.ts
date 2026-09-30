// ==========================================================
// 3d/animation/AgentAnimationController.ts
// Animation State Machine & Procedural Transition Controller
// ==========================================================

import type { OfficeActivityState } from '@kdi/types';

export type AgentAnimClip =
  | 'IDLE'
  | 'WALK'
  | 'SIT'
  | 'TYPE'
  | 'THINK'
  | 'READ'
  | 'MEETING'
  | 'COFFEE'
  | 'PRAY'
  | 'ERROR'
  | 'CELEBRATE';

export interface ProceduralPose {
  offsetY: number;
  rotationY: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  headTilt: number;
  visorIntensity: number;
  statusRingPulse: number;
}

export class AgentAnimationController {
  private currentClip: AgentAnimClip = 'IDLE';
  private targetClip: AgentAnimClip = 'IDLE';
  private transitionTimer = 0;
  private transitionDuration = 0.4; // 400ms smooth blend

  constructor(initialActivity?: OfficeActivityState) {
    if (initialActivity) {
      this.currentClip = this.mapActivityToClip(initialActivity);
      this.targetClip = this.currentClip;
    }
  }

  public mapActivityToClip(activity: OfficeActivityState | string): AgentAnimClip {
    switch (activity) {
      case 'CODING':
      case 'TESTING':
      case 'DEBUGGING':
        return 'TYPE';
      case 'THINKING':
      case 'PLANNING':
      case 'TRAINING':
        return 'THINK';
      case 'READING':
        return 'READ';
      case 'MEETING':
        return 'MEETING';
      case 'PRAYING':
        return 'PRAY';
      case 'COFFEE':
        return 'COFFEE';
      case 'BREAK':
      case 'LUNCH':
        return 'SIT';
      case 'ERROR':
        return 'ERROR';
      case 'COMPLETED':
        return 'CELEBRATE';
      case 'MOVING':
        return 'WALK';
      case 'IDLE':
      case 'OFFLINE':
      case 'WORKING':
      case 'WAITING_APPROVAL':
      default:
        return 'IDLE';
    }
  }

  public getCurrentClip(): AgentAnimClip {
    return this.currentClip;
  }

  public getTargetClip(): AgentAnimClip {
    return this.targetClip;
  }

  /**
   * Set target activity state and trigger sequenced transition
   */
  public setActivity(activity: OfficeActivityState, isMoving = false) {
    const nextClip = isMoving ? 'WALK' : this.mapActivityToClip(activity);
    if (nextClip !== this.targetClip) {
      this.targetClip = nextClip;
      this.transitionTimer = 0;
    }
  }

  /**
   * Immediate override for walking mode
   */
  public setMoving(moving: boolean, activity: OfficeActivityState) {
    if (moving) {
      this.targetClip = 'WALK';
    } else {
      this.targetClip = this.mapActivityToClip(activity);
    }
  }

  /**
   * Update animation clock and compute procedural pose
   */
  public update(dt: number, time: number): ProceduralPose {
    if (this.currentClip !== this.targetClip) {
      this.transitionTimer += dt;
      if (this.transitionTimer >= this.transitionDuration) {
        this.currentClip = this.targetClip;
        this.transitionTimer = 0;
      }
    }

    const t = time;
    const pose: ProceduralPose = {
      offsetY: 0,
      rotationY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      headTilt: 0,
      visorIntensity: 0.5,
      statusRingPulse: 0.8,
    };

    switch (this.currentClip) {
      case 'WALK': {
        // Fast energetic bipedal bobbing rhythm and footstep bounce
        pose.offsetY = Math.abs(Math.sin(t * 8)) * 0.05;
        pose.headTilt = Math.sin(t * 8) * 0.04;
        pose.visorIntensity = 0.7;
        pose.statusRingPulse = 0.9;
        break;
      }

      case 'TYPE': {
        // Seated typing cadence with subtle rapid micro-motion
        pose.offsetY = -0.22 + Math.sin(t * 12) * 0.012; // seated height
        pose.headTilt = 0.12 + Math.sin(t * 4) * 0.02; // leaning slightly towards screen
        pose.visorIntensity = 0.85 + Math.sin(t * 6) * 0.15;
        pose.statusRingPulse = 1.0;
        break;
      }

      case 'THINK': {
        // Subtle rhythmic floating / contemplative head tilt
        pose.offsetY = Math.sin(t * 2) * 0.025;
        pose.headTilt = Math.sin(t * 1.5) * 0.08;
        pose.visorIntensity = 0.6 + Math.sin(t * 4) * 0.35; // glowing pulse
        pose.statusRingPulse = 0.7 + Math.sin(t * 3) * 0.3;
        break;
      }

      case 'READ': {
        // Lower head tilt reading documentation
        pose.offsetY = -0.05;
        pose.headTilt = 0.18 + Math.sin(t * 1) * 0.02;
        pose.visorIntensity = 0.5;
        break;
      }

      case 'MEETING': {
        // Seated conference posture with occasional nod
        pose.offsetY = -0.22 + Math.sin(t * 1.8) * 0.008;
        pose.headTilt = Math.sin(t * 2.5) * 0.05;
        pose.visorIntensity = 0.75;
        break;
      }

      case 'SIT':
      case 'COFFEE': {
        // Relaxed seated posture
        pose.offsetY = -0.22 + Math.sin(t * 1.2) * 0.006;
        pose.headTilt = 0.04;
        pose.visorIntensity = 0.45;
        break;
      }

      case 'PRAY': {
        // Respectful Islamic Salah sequence: Qiyam (standing) -> Ruku (bow) -> Sujood (prostration)
        // 12-second cycle
        const cycleTime = t % 12;
        if (cycleTime < 4) {
          // Qiyam (Standing upright in reverence)
          pose.offsetY = Math.sin(cycleTime * 1.5) * 0.005;
          pose.headTilt = 0.15; // Eyes lowered towards prayer spot
          pose.visorIntensity = 0.6;
        } else if (cycleTime < 7) {
          // Ruku (Bowing forward at waist)
          pose.offsetY = -0.15;
          pose.headTilt = 0.45;
          pose.visorIntensity = 0.5;
        } else {
          // Sujood (Full prostration on sajadah)
          pose.offsetY = -0.55;
          pose.headTilt = 0.8;
          pose.visorIntensity = 0.4;
        }
        pose.statusRingPulse = 0.6;
        break;
      }

      case 'ERROR': {
        // Urgent alert strobe flashing
        pose.offsetY = Math.sin(t * 16) * 0.02;
        pose.visorIntensity = Math.sin(t * 10) > 0 ? 1.0 : 0.1;
        pose.statusRingPulse = 1.0;
        break;
      }

      case 'CELEBRATE': {
        // Upbeat victory bounce
        pose.offsetY = Math.abs(Math.sin(t * 6)) * 0.06;
        pose.visorIntensity = 0.9;
        pose.statusRingPulse = 1.0;
        break;
      }

      case 'IDLE':
      default: {
        // Relaxed breathing cadence
        pose.offsetY = Math.sin(t * 1.5) * 0.008;
        pose.headTilt = 0;
        pose.visorIntensity = 0.4;
        pose.statusRingPulse = 0.7;
        break;
      }
    }

    return pose;
  }
}
