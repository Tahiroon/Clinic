# THERASON CLINIC — Technical Architecture

**Status:** Active implementation blueprint | **Runtime:** PlayCanvas 2.23.3 | **Branch:** clinic-dev

## Engineering goals
1. Deliver a polished portrait-first isometric management game on low-end Android.
2. Separate rendering, input, game rules, clinical content and persistence.
3. Keep the first boot path and active scene payload small.
4. Make core play work offline after initial assets are cached.
5. Keep the game independently deployable; do not touch THERASON production or repository `main`.
6. Introduce platform identity/cloud sync only after security contracts are reviewed and approved.

## Runtime decision
PlayCanvas is the single selected 3D runtime. Babylon.js remains only as a historical comparison prototype and must not be bundled into the shipped game. Revisit the engine only if measured low-end Android tests show PlayCanvas cannot meet the acceptance targets and a replacement materially improves them.

## Character and simulation scope
The first playable release is a management simulation, not a single-avatar walking demo. It includes a player-owner/physiotherapist, hireable physiotherapists, rehabilitation assistants, receptionists, cleaners and a live patient flow. Characters have finite state machines, tasks, room assignments, energy, morale and navigation goals. Nearby characters use authored animations and obstacle-aware navigation; distant characters are simplified or paused. Use deterministic simulation ticks and cap active agents for low-end Android.

## Logical layers
- **App/UI:** portrait navigation, HUD, menus, accessibility and feedback. Prefer lightweight DOM/CSS for interface elements when appropriate; keep 3D interaction in the canvas.
- **Simulation runtime:** PlayCanvas lifecycle, scene, camera modes, touch, avatar animation/navigation, environment rendering and asset loading.
- **Clinic domain:** starter plot, parcels, rooms, layout, grid, footprints, placement constraints, object catalog and expansion.
- **Game domain:** clock, speed controls, patient journey/queues, staff scheduling and tasks, energy/morale, appointments, finances, reputation, campaign objectives and events.
- **Clinical domain:** versioned cases, actions, findings, reasoning, safety rules, rubrics and feedback. No dependency on PlayCanvas.
- **Persistence:** versioned local saves first; remote sync later behind a queue/retry/conflict interface.
- **THERASON bridge (future):** narrow identity and approved progress-summary adapter. No second game password.

## Proposed code organization
- `src/app` — entry and screen composition
- `src/ui` — mobile HUD, menus and accessible controls
- `src/simulation` — PlayCanvas adapter, lifecycle, camera, input, avatar and asset streaming
- `src/world` — plot, environment, rooms and outdoor areas
- `src/clinic` — clinic state and build interactions
- `src/domain/building` — grid, footprints, placement and collision rules
- `src/domain/economy` — wallet, costs, revenue and transaction rules
- `src/domain/progression` — unlocks, reputation and milestones
- `src/clinical` — case schemas, assessment, reasoning, feedback and rubrics
- `src/data` — local save and future sync interfaces
- `public/assets` — optimized versioned assets
- `docs` — product, architecture, performance and test records

Do not create empty folders or speculative abstractions. Introduce modules only when the next vertical-slice requirement needs them.

## Camera modes
One world and one runtime, with controlled camera states:
1. Management overview: frame the starter clinic and property.
2. Build mode: closer view, grid and placement preview.
3. Clinical encounter: smooth close composition focused on the patient/treatment area.
Transitions must not reload the whole scene. Touch pan/zoom must be smoothed, bounded and tested against Android viewport/resize behavior.

## Domain contracts
**Clinic layout:** schema version, plot/parcel IDs, room bounds, object catalog IDs, grid coordinates, rotation, appearance choices and timestamp. Engine-independent.

**Object catalog item:** stable ID, asset ID, footprint, allowed rotations, cost, unlock rule, placement tags, access constraints, performance budget and preview asset.

**Economy transaction:** stable transaction ID, source, sink, amount, reason, timestamp and resulting local balance. Client state is not trusted for future server-authoritative currency.

**Clinical case:** stable ID, semantic version, learner level, objectives, fictional patient profile, safety rules, decision graph, findings, rubric, references, reviewers and review date.

**Clinical attempt:** case version, ordered actions, learner rationale, safety checks, findings/interpretation, goals, intervention, response, reassessment and rubric version. Simulated data only.

## Mobile performance strategy
- Explicit budgets for initial JS, first scene assets, textures, geometry, draw calls and memory.
- Load only the active clinic/room and nearby content; defer optional assets.
- Optimize GLB/glTF with mesh reuse and measured meshopt/Draco pipeline choices.
- Use KTX2/Basis texture transcoding where the target browser/device support and build pipeline justify it.
- Use LOD for assets whose screen size changes materially.
- Use instancing for repeated props where it reduces draw calls without harming culling.
- Reuse materials and meshes; use atlases only where they reduce state changes and memory.
- Bake static lighting where appropriate; limit dynamic shadows, transparent surfaces, post-processing and dynamic lights.
- Adapt render resolution/device pixel ratio by device capability and sustained frame-time measurements.
- Use object pooling for frequently created simulation objects; no per-frame array/object churn.
- Reduce or pause nonessential simulation while backgrounded.
- Profile on actual entry-level Android devices, not desktop emulation alone.

Do not add a new framework, physics library, ECS, AI SDK or asset pipeline merely because it is fashionable. Adopt a dependency only after a small benchmark demonstrates a clear benefit in payload, memory, stability or maintainability.

## Offline and persistence
The core local clinic loop must not require continuous network access. Save versioned layout, local progression and session state locally. Cache versioned static assets. Future remote sync uses an outbox queue, retry/backoff and conflict handling, with visible local-saved/synced states. Remote authority validates important currency, unlock and progress claims.

## Security and clinical safety
- Never ship Supabase service-role credentials or privileged secrets to the browser.
- Do not trust client-submitted currency, scores, unlocks or completion claims.
- Keep production database access out of engine prototypes.
- Use platform identity rather than a second game password.
- Do not store real patient-identifiable data.
- AI may assist with case drafting but cannot independently approve or publish cases.
- Clinical cases require qualified physiotherapy educator review and additional experts when warranted.

## Failure isolation
The simulator remains separately deployable. Auth, sync, content delivery or engine failure must not destabilize the THERASON website. Keep all current development on `clinic-dev`; do not merge to `main` without explicit owner approval.

## First vertical-slice technical gate
Prove: stable portrait management camera; readable rooms and characters; room-drawing/building; staff hiring and assignment; patient arrival-to-discharge flow; queue and morale/economy simulation; pause and time speed; local save/reload; low-end Android frame-time/memory/startup measurements.
