# THERASON CLINIC 2.0 — Product Vision & Master Design

**Status:** Approved product direction / implementation blueprint  
**Date:** 2026-11-13  
**Working branch:** `clinic-dev`  
**Runtime:** PlayCanvas 2.23.3 (retain unless real-device evidence proves it cannot meet targets)

## 1. Product promise

THERASON CLINIC is a portrait-first mobile clinic-management and physiotherapy simulation game. The learner owns and develops a rehabilitation clinic, manages its space and finances, welcomes patients, and personally acts as the physiotherapist during clinical encounters. It combines the satisfying spatial management and progression loop of hospital-management games with an original physiotherapy identity and evidence-informed clinical reasoning.

It is inspired by the broad management-game language of Two Point Hospital (readable isometric rooms, visible staff/patients, room planning, progression and playful management), but must not copy its characters, art, UI, assets, names, diseases, or exact layouts.

## 2. Product pillars

1. **Build:** draw and shape rooms, furnish them, plan corridors and expand the property.
2. **Manage:** recruit, assign, train and care for staff; organize patient flow, queues, schedules, finances and reputation.
3. **Treat:** patients move through reception, waiting, assessment, intervention and discharge; the player may personally take over a case.
4. **Learn:** evidence-informed physiotherapy cases, clinical reasoning, safety decisions, outcomes and reassessment.
5. **Progress:** unlock specialist services, equipment, larger plots, staff skills and campaign challenges.
6. **Observe:** readable live simulation with visible characters, needs, thoughts, tasks and bottlenecks.

## 3. Character and workforce — management is core gameplay

The player is the clinic owner-manager and can also personally take clinical sessions. Hiring and managing a small team is a first-release gameplay pillar, not a later optional extra. Initial roles:
- **Physiotherapists:** assess and treat patients according to their skills and assigned rooms.
- **Rehabilitation assistants:** support exercise sessions and patient mobility under the physiotherapist's plan; never independently diagnose.
- **Receptionists:** register arrivals, manage appointments and direct patients to waiting areas.
- **Cleaners:** maintain room cleanliness and clinic hygiene.
Each employee has a visible character, skill level, energy, morale, wage, current task and work assignment. Players recruit, assign, train and manage breaks. The player avatar remains available for direct clinical encounters, while hired physiotherapists keep the clinic operating when the player is building or managing. Patients are visible visitors with a readable journey through the clinic.

## 4. Starter property — build the clinic as a management game

Every learner starts on the same generous, portrait-composed property: approximately **14 m × 28 m**. The land is primarily open green lawn, with a clear entrance path, a small outdoor landscape and substantial usable space around the first room.

The player starts with a generous empty, landscaped property, starter capital and a guided management objective—not a prebuilt miniature clinic. The player must plan and construct the first reception, assessment room and treatment room, furnish each room with required equipment, and hire the first staff before opening the clinic. A small starter treatment room may be provided only in a tutorial scenario; the main campaign begins with buildable land. Room floors and walls appear only where rooms are constructed; the unbuilt property remains outdoor ground.

## 5. Land, property and expansion

The clinic sits on a generous 14 m × 28 m starter property with open lawn and room for player-designed facilities. Expansion is a progression system:
- Start with one owned green property and starter capital.
- Build initial functional rooms, then add specialist facilities as finances and campaign progress allow.
- Later unlock or purchase adjacent land parcels with in-game currency and progression requirements.
- Add new rooms, wings or separate buildings as later milestones.
- Outdoor development can include paths, trees, benches, signs, parking and a rehabilitation garden.
- Future specialist facilities may include a larger exercise gym, sports rehabilitation, balance/mobility area, hydrotherapy (only when technically and educationally justified), and learning/research spaces.

Expansion must be spatially meaningful and optional. Do not force players to buy land simply to continue the core clinical loop.

## 6. Camera and visual identity

- Portrait-first Android experience; no forced landscape rotation.
- Isometric-style orthographic camera, inspired by readable management-game views.
- Camera pan and zoom use touch gestures with smoothing and strict bounds.
- Management view: overview of the clinic and plot.
- Build view: closer view with placement preview and clear grid.
- Clinical encounter: a controlled, smooth camera transition to a closer treatment-room composition, then return to management view.
- Stylized realism: believable human proportions, medical equipment silhouettes and materials, modern calm architecture, distinctive THERASON palette and signage.
- No photorealism requirement. Clarity, consistency, mobile performance and visual polish take priority over raw polygon count.

The visual direction must be original. Do not reproduce Two Point Hospital's exact art style, characters, UI or room compositions.

## 7. Core game loops

### Daily clinic loop
Open clinic → review appointments and clinic status → receive patients → personally conduct sessions → collect revenue/reputation/progression → resolve small operational decisions → improve the clinic.

### Build and management loop
Earn currency → inspect needs and available space → buy equipment/decor/land → preview placement → validate footprint and access → commit → observe the improved clinic.

### Clinical loop
Patient arrives → history and priorities → safety screening → choose and justify assessment → gather findings → interpret and form hypotheses → set functional goals → choose intervention and dosage → observe response → reassess → receive reasoning feedback and references.

### Long-term progression
Improve clinical capability and clinic reputation independently. Unlock content through meaningful milestones, not repetitive grinding or unsafe shortcuts.

## 8. Economy and progression

Keep the visible economy simple at launch:
- **Coins:** clinic revenue and spending (equipment, decor, property and approved operating costs).
- **Reputation:** reflects patient experience, clinic quality and reliable service.
- **Research/learning points:** unlock educational content and advanced equipment through learning and validated milestones.

Internal dashboard metrics can include care quality, patient satisfaction, staff satisfaction only where relevant, cleanliness only if later simulated, and financial health. Do not introduce many currencies.

No energy timers, pay-to-win clinical advantages, loot boxes, or punishment for taking breaks. Rewards must not incentivize rushing, overtreatment, unsafe decisions or patient volume over care quality.

Recruitment is a core management system. Receptionists manage registration and appointments; physiotherapists deliver assessment and treatment; rehabilitation assistants support exercise sessions; cleaners maintain hygiene. The clinic can open only when its essential rooms and minimum staffing are ready.

## 9. Patient and character simulation

- The player is the owner-manager and may personally take clinical sessions.
- Hired physiotherapists, rehabilitation assistants, receptionists and cleaners are active staff with skills, needs, tasks and schedules.
- Patients are individual visitors with distinct presentation, goals, needs and case data.
- Begin with a small visible population and limited simultaneous activity, then increase the cap as performance allows.
- Use authored animation states and lightweight navigation; do not simulate a large crowd.
- Nearby visible characters use full animation and path navigation. Distant/off-screen activity is simplified or paused.
- Movement must respect walls, furniture, doors and walkable areas. Avoid jitter and frame-by-frame object allocation.

## 10. Clinical case platform

Clinical content is data-driven and separate from the 3D engine. New approved cases must be publishable as content updates without rebuilding the entire game client.

A case package should include:
- Stable case ID and semantic version.
- Intended learner level and learning objectives.
- Patient profile and simulated history.
- Safety screening and referral logic.
- Assessment options, findings and measurement rules.
- Expected reasoning pathways and acceptable alternatives.
- Functional goals, intervention options and dosage constraints.
- Simulated response and reassessment branches.
- Scoring rubric that evaluates process, justification and safety—not only the final answer.
- Source references, evidence notes, review date, reviewers and revision history.

### Clinical publishing workflow
Draft → evidence attachment → physiotherapy educator review → additional specialist/medical review where appropriate → clinical safety and logic review → playtest → approval → publish → monitor/revise/withdraw.

AI may assist with structuring drafts and checking completeness. AI must not independently approve, authoritatively validate, or publish clinical content. A qualified physiotherapy reviewer is required; other experts are included when the case requires them. Use de-identified fictional/synthetic patient information only.

A clinical case is educational simulation, not a diagnosis or treatment recommendation for a real person, and does not replace supervised clinical practice.

## 11. Retention without compulsion

Use meaningful short-, medium- and long-term goals:
- Short: finish a session, arrange a room, solve a small clinic issue.
- Medium: unlock equipment, improve clinic layout, complete a case series, improve a skill.
- Long: expand property, open a specialism, build a strong reputation, master a clinical domain.

Later systems:
- Scenario-driven events and weekly design/management challenges.
- Research and equipment unlocks.
- Multi-visit patient stories and longitudinal rehabilitation cases.
- Clinic history and milestones ("first patient", "first completed program", "first expansion").
- Read-only clinic visits and fair competitions.
- Adaptive case recommendations based on learner gaps, with transparent educational rationale.

No streak loss, energy lockouts or coercive notifications. The player should return because the clinic and goals are engaging.

## 12. Mobile performance and modern implementation strategy

Treat low-end Android as a first-class target from the first prototype.

- Keep PlayCanvas as the single 3D runtime. Do not ship PlayCanvas and Babylon.js together.
- Separate engine runtime, game domain, UI, clinical case data and persistence.
- Keep UI lightweight and preferably DOM/CSS-based where that is cheaper and more accessible than 3D UI.
- Use compressed glTF/GLB assets; evaluate meshopt/Draco where supported by the asset pipeline and runtime.
- Use GPU texture compression/transcoding (Basis/KTX2 where supported by the chosen pipeline) and size textures for actual on-screen use.
- Use LODs, instancing for repeated props, mesh/material reuse, atlases where beneficial, and baked lighting for static geometry.
- Limit real-time shadows, post-processing, transparent surfaces and dynamic lights.
- Load only the active scene/room and nearby assets; use progressive loading and explicit asset budgets.
- Use object pooling for frequently reused simulation objects; avoid per-frame allocations.
- Cap render resolution/device pixel ratio adaptively. Provide Low/Medium/High profiles.
- Pause or reduce updates when the tab is hidden; avoid continuous network polling.
- Keep the initial boot path tiny; cache versioned static assets for unreliable networks.
- Store core clinic layout and session state locally first. Sync later through a queue with retries and conflict handling.
- Use deterministic, testable domain rules for grid, placement, economy and progression.

Potential advanced features should be adopted only after a measured prototype shows they reduce payload, memory, frame time or maintenance. Avoid adding libraries/frameworks without a concrete benefit.

## 13. Architecture boundaries

1. **App/UI:** portrait navigation, menus, HUD, accessibility and feedback.
2. **Simulation runtime:** PlayCanvas lifecycle, scene, camera, touch, animation and asset streaming.
3. **Clinic domain:** plot, rooms, layout, grid, placement, object catalog and expansion.
4. **Game domain:** economy, appointments, progression, reputation and events.
5. **Clinical domain:** case schema, actions, findings, reasoning, feedback and rubric.
6. **Persistence:** versioned local save; remote sync adapter later.
7. **THERASON bridge:** later secure identity and approved progress summaries; no second game password.

The game must remain independently deployable and must not touch THERASON production or repository `main`. All development stays on `clinic-dev` unless the owner explicitly approves another branch.

## 14. First playable vertical slice

The first proof must demonstrate quality, not feature count:
- Generous landscaped property with buildable land and a guided campaign objective.
- Room construction and furnishing for reception, assessment and treatment.
- Hire at least one receptionist and one physiotherapist before opening the clinic.
- Live patient arrival, queue, assessment, treatment and discharge flow.
- Visible staff tasks, energy/morale and operating expenses.
- One patient encounter with a short, reviewed clinical flow (can be stubbed until content review).
- Camera overview, build camera and close clinical camera transition.
- Small validated object catalog, grid placement, rotation and collision/path checks.
- Basic currency and one purchase.
- Local save/reload.
- Stable touch interaction on low-end Android.

## 15. Acceptance criteria and gates

Do not scale content until the vertical slice passes:
- Portrait composition is legible and attractive on narrow phones.
- Camera pan/zoom and avatar movement have no visible jitter.
- Avatar proportions are credible relative to doors, bed and equipment.
- Walkable navigation respects obstacles and doors.
- Build placement cannot overlap objects, walls or block required access.
- Starter clinic feels intentionally designed, not oversized or empty.
- A user can understand and complete a short loop without a tutorial wall.
- Local save survives reload and handles invalid data safely.
- Sustained test on a low-end Android target is stable at an agreed frame-time target; target 30 FPS baseline, 60 FPS on capable devices.
- Cold/warm startup, frame-time distribution, memory, asset transfer size and touch latency are recorded.
- No production THERASON credentials, real patient data or secrets enter the client/repository.

## 16. Explicit non-goals for initial release

No multiplayer editing, chat, trading, nurse/doctor staff, large staff roster, complex crowd simulation, photorealistic graphics, massive open world, real patient records, real clinical decision support, or monetization mechanics that compromise learning or fairness.
