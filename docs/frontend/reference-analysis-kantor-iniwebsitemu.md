# Reference Analysis: kantor.iniwebsitemu.com

**Date**: 2026-09-30  
**Analyzed By**: KDI AI Office Engineering

---

## Overview

The reference site at `https://kantor.iniwebsitemu.com/` is a **browser-based virtual office game** that provides an interactive, explorable 3D environment. This document records the experience model observed, which forms the basis of the KDI AI Office 3D Game Experience Rework.

---

## 1. Entry Flow

- The site opens directly into a virtual office world or a character selection/lobby screen
- No traditional login required for public access
- Transition into the world is animated (fade/load sequence)
- Immediate spatial context: user knows they are "inside" a place

## 2. Camera Model

- **Type**: Third-person perspective, character is visible from behind/above
- **Angle**: Approximately 30–45° pitch, looking down at a slight angle (isometric-ish but with perspective)
- **Control**: Mouse drag rotates the camera around the character
- **Zoom**: Scroll wheel adjusts camera distance
- **Follow**: Camera smoothly follows the player character with lerp/lag
- **Feel**: The user always feels "inside" the space, not observing from outside

## 3. Character System

- Characters are selectable avatars (humanoid figures)
- Each character has a name, role, and visual appearance
- Selection happens before entering the world
- Character persists through the session
- The user's character is clearly distinguished from NPCs

## 4. Movement

- **Controls**: WASD or arrow keys for movement
- **Direction**: Movement is camera-relative (pressing W moves in the camera's forward direction)
- **Speed**: Walk by default, Shift to run (or auto-run when far)
- **Turning**: Character rotates to face movement direction smoothly
- **Feel**: Responsive, game-like. Not instant teleportation.

## 5. Office Environment

- **Layout**: Multiple rooms connected by corridors
- **Scale**: Human-scale — furniture is proportioned so character walking through feels natural
- **Density**: Moderate — offices have desks, chairs, computers, not empty
- **Collision**: Characters cannot walk through walls or furniture
- **Navigation**: Natural exploration — you discover rooms by walking

## 6. NPCs / Employees

- NPCs are visible in rooms at their workstations
- They have idle animations (typing, looking around)
- NPCs have name labels above them or show on hover
- No random wandering — they are positioned purposefully (at desks, in meeting rooms)

## 7. Interaction Model

- **Proximity trigger**: When player walks near an NPC, an interaction prompt appears
- **Prompt format**: `[E] Talk` or similar on-screen hint (NOT requiring pixel-perfect clicks)
- **Interaction radius**: ~3 meters (game units)
- **Conversation trigger**: Pressing the key or clicking the prompt opens a dialog

## 8. Conversation UI

- **Format**: Game-style dialog panel
- **Contains**: Agent portrait/avatar, agent name, role, message text
- **Player input**: Text field at the bottom
- **Presentation**: Speech bubble / dialog box (NOT a full-screen dashboard)
- **Closing**: Escape key or X button

## 9. Object Interaction

- Computers, whiteboards, and other props are interactable
- Same proximity+prompt model as NPCs
- Clicking/pressing opens a contextual overlay (not a separate page)

## 10. HUD (Heads-Up Display)

- **Minimal** — not a dashboard
- Shows: interaction prompt (when near NPC/object), movement hints, room name
- Character information is shown subtly (small card bottom-left)
- No permanent analytics panels, status tables, or large UI components

## 11. Rooms

- Reception/lobby — spawn point for new players
- Individual department rooms (engineering, design, etc.)
- Meeting rooms with whiteboards
- Break room / pantry area
- Transitions are seamless spatial movement (no separate page loads)

---

## Key Design Principles (to Apply to KDI)

| Principle | Reference Pattern | KDI Application |
|-----------|-------------------|-----------------|
| **Primary view** | 3D world is the main screen | 3D tab fills full viewport |
| **Entry** | Character select → world | CharacterSelectScreen → GameOfficeApp |
| **Camera** | Third-person follow | ThirdPersonCamera (orbit + follow) |
| **Movement** | WASD camera-relative | PlayerController.update() |
| **Interaction** | Proximity + [E] prompt | ProximityDetector + GameHUD |
| **Conversation** | Dialog panel with portrait | GameConversationUI |
| **HUD** | Minimal overlay | GameHUD (no dashboards) |
| **Rooms** | Walk-through spatial | OfficeScene rooms, no page transitions |
| **NPCs** | Desk-positioned with idle | AgentAvatar at backend positions |
