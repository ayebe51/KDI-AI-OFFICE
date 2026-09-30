# Musholla Sanctuary & Prayer Visualization

## 1. Cultural & Architectural Context
The Musholla serves as an authentic Islamic prayer sanctuary within KDI AI Office:
- Positioned on the East wing (`[12, 0, -8]`).
- Includes a marble Mihrab arch on the West wall (Qiblah orientation).
- Arranged with green emerald Sajadah prayer rugs in neat saff rows.
- Teak Qur'an shelf and carved privacy partition screens.
- Foot-wash wudu basin area.

## 2. Non-Blocking Task Intermission Principle
When scheduled prayer time arrives (Fajr, Dhuhr, Asr, Maghrib, Isha):
1. **Task State Preserved:** Running engineering tasks are **NOT** cancelled or failed. Working memory, AST diffs, and container worktrees are serialized cleanly.
2. **Congregational Navigation (Jamaah):** Participating agents navigate together along corridor waypoints to `RM-MUSHOLLA`.
3. **Salah Posture Execution:** Avatars position themselves on the sajadah rugs and execute the coordinated prayer cycle (`PRAY`).
4. **Resumption:** When the prayer session concludes, agents return to their respective workstations and resume coding, testing, or planning without loss of progress.
