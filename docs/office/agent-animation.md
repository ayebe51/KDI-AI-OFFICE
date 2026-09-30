# Agent Animation State Machine & Transitions

## 1. Animation Controller (`AgentAnimationController`)
Governs procedural motion and smooth blending:

```text
Current Clip ──(400ms transition blend)──> Target Clip
```

## 2. Transition Sequences
Abrupt visual snapping between incompatible postures is strictly avoided by passing through transitional states:

- **Walking to Prayer:**
  $$\text{WALK} \rightarrow \text{ARRIVE} \rightarrow \text{IDLE} \rightarrow \text{PRAY}$$
- **Walking to Meeting:**
  $$\text{WALK} \rightarrow \text{ARRIVE} \rightarrow \text{SIT} \rightarrow \text{MEETING}$$
- **Walking to Coffee:**
  $$\text{WALK} \rightarrow \text{PANTRY} \rightarrow \text{COFFEE} \rightarrow \text{BREAK}$$
- **Walking to Engineering Desk:**
  $$\text{WALK} \rightarrow \text{ARRIVE} \rightarrow \text{SIT} \rightarrow \text{TYPE (CODING)}$$

## 3. Islamic Prayer Cycle (`PRAY`)
In the Musholla sanctuary, agents execute a 12-second respectful Salah cycle:
1. **$t \in [0, 4\text{s})$ (Qiyam):** Standing upright, lowered head tilt ($0.15\text{ rad}$) gazing towards sajadah spot.
2. **$t \in [4, 7\text{s})$ (Ruku):** Bowing forward at the waist (head tilt $0.45\text{ rad}$, seated offset $-0.15\text{m}$).
3. **$t \in [7, 12\text{s})$ (Sujood):** Full prostration on the sajadah rug (offset $-0.55\text{m}$, head tilt $0.8\text{ rad}$).
