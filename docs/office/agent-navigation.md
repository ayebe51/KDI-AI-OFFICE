# Agent Navigation & Pathfinding

## 1. Deterministic Navigation Architecture
To guarantee that avatar movements are 100% deterministic and reproducible, navigation relies on a pre-computed bidirectional waypoint graph (`NavGraph`):

```text
Backend sets target_location (e.g. 'RM-MEETING')
            ↓
Frontend finds start & destination waypoints
            ↓
BFS Shortest-Path Graph Solver computes waypoint sequence
            ↓
Agent steps forward at smooth 2.6 m/s walking speed
            ↓
Rotates smoothly towards heading angle
            ↓
Pops waypoints on arrival (< 0.15m threshold)
            ↓
Arrives at destination and transitions to target room activity
```

## 2. Waypoint Topology
The office layout utilizes 24 strategic anchor waypoints:
- **Central Spine:** `WP-CORRIDOR-NORTH`, `WP-CORRIDOR-MID`, `WP-CORRIDOR-SOUTH`, `WP-CORRIDOR-RECEPTION`.
- **Room Entries:** Reception, Portfolio, Management, PM, Architecture, Engineering, QA, Security, Research, Meeting, Pantry, Break, Musholla, Server Room.
- **Specific Destination Anchors:** Engineering Desks, Conference Table, Whiteboard, Coffee Station, Sajadah Mats, Server Rack Aisle.
