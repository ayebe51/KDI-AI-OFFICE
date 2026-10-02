// ==========================================================
// 3d/character/PlayerAvatar.tsx
// PlayCanvas Entity — Renders the Player Character as Cozy Chibi Avatar
// ==========================================================

import React from 'react';
import type { PlayerState } from './PlayerController.js';
import { ChibiCharacterModel } from './ChibiCharacterModel.js';

export interface PlayerAvatarProps {
  playerState: PlayerState;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ playerState }) => {
  return (
    <ChibiCharacterModel
      name={playerState.character.name}
      roleBadge={playerState.character.role}
      appearance={playerState.character.appearance}
      x={playerState.x}
      y={playerState.y}
      z={playerState.z}
      rotY={playerState.rotY}
      animation={playerState.animation}
      speed={playerState.speed}
      isPlayer={true}
      showBadge={false}
    />
  );
};
