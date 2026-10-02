# Spatial Office Map: Coordinate Grids & Zone Boundaries

## 1. World Coordinate System
The world uses a standard Cartesian metric system where:
* $+X$ points East (Right across the floor).
* $+Y$ points Upward (Floor elevation).
* $+Z$ points South (Towards the entrance and front yard).
* Grid origin `[0, 0, 0]` is centered at the core central hallway of Ground Floor.

---

## 2. Floor 1: Ground Floor (`GROUND`)

```
   Z = -18 (North End: Infrastructure & Labs)
   ┌───────────────────────┬───────────────────────┐
   │ AI Research Lab       │ Server Cluster        │
   │ [-14 to 0, -18 to -12]│ [0 to 14, -18 to -12] │
   ├───────────────────────┼───────────────────────┤
   │ QA & Testing Suite    │ Musholla Sanctuary    │
   │ [-14 to 0, -12 to -4] │ [0 to 14, -12 to -4]  │
   ├───────────────────────┴───────────────────────┤
   │ Central Engineering Hall & Architecture Lab   │
   │ [-14 to 14, -4 to 6]                          │
   ├───────────────────────┬───────────────────────┤
   │ Product Management    │ Sales Pod (Naya)      │
   │ [-14 to -6, 6 to 12]  │ [4 to 14, 6 to 12]    │
   ├───────────────────────┼───────────┬───────────┤
   │ Executive CEO Office  │ Reception │ Elevator  │
   │ [-14 to -6, 12 to 20] │ [-6 to 4] │ [4 to 14] │
   ├───────────────────────┴───────────┴───────────┤
   │ Office Entrance Glass Portal [Z = 20 to 24]   │
   ├───────────────────────┬───────────────────────┤
   │ Parking Lot           │ Food Cart Pak Joko    │
   │ [-14 to -2, 24 to 32] │ [2 to 14, 24 to 32]   │
   └───────────────────────┴───────────────────────┘
   Z = +32 (South End: Front Yard Gate)
```

### Key Spatial Coordinates
* **Player Spawn Point**: `[0.0, 0.0, 24.0]` (Entrance Walkway)
* **Food Cart "Pak Joko"**: `[5.5, 0.0, 26.5]`
* **Reception Desk & Citra**: `[0.0, 0.0, 16.0]`
* **"Koneksi Digital Inovasi" Soft Neon Sign**: `[0.0, 3.2, 14.2]`
* **Portfolio Display Kiosk**: `[-3.5, 0.0, 17.0]`
* **Elevator Landing**: `[7.5, 0.0, 16.0]`
* **Sales Desk & Naya**: `[7.0, 0.0, 9.0]`
* **CEO Desk & Workstation**: `[-8.5, 0.0, 15.5]`
* **Server Room Clusters**: `[7.0, 0.0, -15.0]`
* **Musholla Sanctuary**: `[7.0, 0.0, -8.0]`
* **Engineering Desks**: `[0.0, 0.0, 1.0]`

---

## 3. Floor 2: Open Space & Creative Studio (`FLOOR_2`)

```
   Z = -14 (North End)
   ┌───────────────────────┬───────────────────────┐
   │ Creative Studio       │ Sleep Capsules        │
   │ Camera, Softbox, Mic  │ 2 Warm Glow Pods      │
   │ [-12 to 0, -14 to -2] │ [0 to 12, -14 to -2]  │
   ├───────────────────────┼───────────────────────┤
   │ Creative Content Pod  │ Finance Workstation   │
   │ Collaborative Bench   │ Filing & Ledgers      │
   │ [-12 to 0, -2 to 10]  │ [0 to 12, -2 to 10]   │
   ├───────────────────────┴───────────────────────┤
   │ Central Open Hall & Floor 2 Elevator Landing  │
   │ [X = 7.5, Z = 14.0]                           │
   └───────────────────────────────────────────────┘
   Z = +16 (South End)
```

---

## 4. Rooftop: Garden, Lounge & Fire Pit (`ROOFTOP`)

```
   Z = -14 (North End: Open Viewport)
   ┌───────────────────────────────────────────────┐
   │ Scenic Observation Railing & City Skyline     │
   ├───────────────────────┬───────────────────────┤
   │ Rooftop Bar Counter   │ Fire Pit & Bean Bags  │
   │ Danang Lounge Host    │ Circular Embers       │
   │ [-12 to -3, -8 to 4]  │ [-2 to 8, -8 to 4]    │
   ├───────────────────────┴───────────────────────┤
   │ Wooden Pergola with Warm Fairy Lights         │
   │ Elevator Landing [X = 7.5, Z = 10.0]          │
   └───────────────────────────────────────────────┘
   Z = +14 (South End)
```
