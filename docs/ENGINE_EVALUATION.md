# THERASON CLINIC — Engine Decision Record

**Decision:** PlayCanvas is the selected runtime for the first production-oriented clinic slice.
**Date:** 2026-11-11
**Branch:** clinic-dev

## Context
Both PlayCanvas and Babylon.js prototypes were made available to the project owner and tested informally on their phone. The owner reported that both were initially acceptable. The project needs a portrait-first, fixed-isometric, stylized 3D clinic for entry-level Android devices and unreliable connectivity. The initial world is compact: reception, one treatment room, avatar movement, grid-based furnishing, and guided clinical learning.

## Decision
Proceed with PlayCanvas as the single primary engine. Keep Babylon.js prototype code only as a historical comparison during this phase; do not ship two engines or ask students to choose an engine.

## Rationale
- The required scene and interaction scope is a compact stylized 3D environment, not a broad general-purpose high-end simulation.
- PlayCanvas is a capable WebGL engine with a focused web-first workflow.
- The current project spike already has a PlayCanvas scene and touch interaction foundation.
- Choosing one engine reduces duplicated code, testing, payload, and maintenance.

This is a project-fit decision, not a claim that PlayCanvas is universally faster or superior to Babylon.js. Actual low-end Android performance, memory, startup time, and payload must continue to be measured.

## Non-negotiable implementation constraints
- Arabic-first, portrait-first interface; no forced landscape orientation.
- Low-poly/stylized assets, restrained materials, capped device pixel ratio, minimal draw calls.
- Load only assets required by the active room and interaction.
- No remote font or decorative asset dependency for the first screen.
- Local versioned saves first; remote identity/sync only after a security design and explicit approval.
- Keep the simulator independently deployable and isolated from the THERASON platform.
- Do not merge clinic-dev into main without owner approval.

## Revisit criteria
Reconsider the engine only if real-device evidence shows PlayCanvas cannot meet agreed startup, stability, memory, interaction, or maintainability targets and another engine materially improves those outcomes.
