# THERASON CLINIC — Technical Architecture

**Status:** Initial proposal | **Branch:** clinic-dev

## Goals
1. Separate 3D runtime from clinical learning rules.
2. Keep game rules independent from rendering engine where practical.
3. Make UI and data contracts testable without loading a scene.
4. Optimize for low-end Android and weak networks.
5. Keep the simulator independently deployable.
6. Delay production identity, persistence, and Supabase until security contracts are reviewed.

## Logical layers
- **Presentation:** portrait screens, HUD, menus, build controls, accessibility, loading/error states. Communicates through typed commands and state.
- **Simulation runtime:** selected engine adapter, scene lifecycle, camera, input, avatar movement, environment rendering, asset loading. Engine objects must not leak into domain models.
- **Game domain:** clinic layout, grid occupancy, footprints, placement validation, progression, local session state. Prefer deterministic pure functions.
- **Clinical domain:** simulated cases, findings, decision options, rationale, safety rules, feedback rubrics, reassessment. Independent of 3D and reviewed by clinical educators.
- **Data/persistence:** versioned local save first. Remote sync later behind an interface with retries and conflict handling.
- **THERASON integration (future):** narrow adapter for identity and approved progress summaries. No second game password.

## Proposed structure
- src/app — entry and screen composition
- src/ui — mobile UI and HUD
- src/simulation — engine adapter, scene, camera, input, avatar
- src/clinic — environment and building interactions
- src/domain/building — grid, footprints, placement rules
- src/domain/progression — rewards and unlock rules
- src/clinical — cases, assessment, reasoning, feedback
- src/data — local persistence and future sync interfaces
- public/assets — optimized assets
- docs — product, architecture, evaluation, and test records

Adjust after the engine spike; do not create empty scaffolding.

## Engine boundary
A small adapter should expose runtime initialization/disposal, canvas sizing, scene loading/unloading, camera configuration, pointer/touch input, performance instrumentation, and asset loading. Domain code receives semantic input, never raw mesh references.

## Data contracts (conceptual)
Clinic layout: schema version, local clinic identifier, room dimensions, placed object IDs/catalog IDs/grid coordinates/rotation, timestamp, engine-independent appearance settings.

Clinical attempt: case version, ordered learner actions, rationale, safety checks, findings and interpretation, goals, interventions, response, reassessment, rubric version, feedback. Store simulated data only; no identifiable patient data.

## Security
- Never ship Supabase service-role credentials or privileged secrets to the browser.
- Never trust client-submitted currency, scores, unlocks, or completion claims.
- Validate remote writes server-side when remote persistence is introduced.
- Use platform identity rather than a second game password.
- Keep production database access out of engine prototypes.
- Do not commit environment files, tokens, private keys, or real student/patient data.

## Offline and performance
First slice stores layout locally in a versioned format. Cache static assets deliberately. Remote sync later uses a queue, retry policy, and conflict strategy. Clearly distinguish locally saved from remotely synced.

Load only active scene assets. Prefer compressed textures, efficient materials, baked static lighting, limited dynamic shadows, instancing for repeated props, no unnecessary frame allocations, capped render resolution on weak devices, and Low/Medium/High presets.

## Failure isolation
The simulator is separately deployable. Platform integration is optional and narrow. Authentication, sync, or runtime failure must not destabilize the THERASON website.

## Open decisions
Engine choice, app shell/deployment, local persistence technology, and platform integration protocol remain open pending prototype evidence and security review.
