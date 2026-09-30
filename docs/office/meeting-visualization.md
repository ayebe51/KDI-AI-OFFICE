# Meeting Room & Whiteboard Visualization

## 1. Meeting Lifecycle
When an autonomous cross-agent collaboration or human alignment meeting is created:
1. **Context Serialization:** Participating agents' active tasks, code worktrees, and current room locations are saved to `savedContexts`.
2. **Navigation:** Agents set `target_location = 'RM-MEETING'`, traverse corridor waypoints, and arrive at the conference table.
3. **Conference Seating:** Avatars sit at the mahogany conference table in the `MEETING` pose.
4. **Whiteboard Activation:** The 3D magnetic whiteboard illuminates with an emissive blue glow and displays structured agenda, diagrams, and task decompositions.
5. **Meeting Conclusion:** When the meeting ends, decisions are appended to the ADR log, and all agents are restored to their previous working locations and activities.
