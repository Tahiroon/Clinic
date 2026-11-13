# THERASON CLINIC — Game Design Document

**Status:** Approved direction 2.0 | **Date:** 2026-11-13 | **Branch:** clinic-dev

## Product promise
A portrait-first mobile clinic-management game with an original physiotherapy identity. The player owns and grows a rehabilitation clinic, personally acts as its physiotherapist, manages patient flow and a simple economy, and develops clinical reasoning through evidence-informed simulated encounters.

The broad inspiration is the readable isometric management experience of Two Point Hospital—not its protected characters, artwork, interface, names, assets, diseases or exact layouts.

## Core pillars
1. Build and expand a beautiful clinic and its outdoor property.
2. Manage appointments, patient flow, money, reputation and equipment.
3. Personally assess and treat patients as the physiotherapist.
4. Learn through justified decisions, evidence, feedback and reassessment.
5. Progress through new spaces, equipment, case series and challenges.

## Strict character scope for the first release
- One player avatar: the physiotherapist. The player personally welcomes, assesses and treats patients.
- One optional purchasable/hireable receptionist. The receptionist is non-clinical and helps organize appointments and arrivals.
- No nurses, employed doctors, cleaners, assistants or other staff roles in the first release.
- Patients are visitors/case characters, not employees.
- The starter clinic works fully without hiring a receptionist.

## Starter property and player-built clinic
All players begin on the same generous 14 m × 28 m property, composed for portrait play. The land is continuous green outdoor space with a clear entrance path and landscaping around the edges. The only prebuilt interior is one compact 4 m × 4 m treatment room with one treatment table and one storage unit.

Do not spawn a finished reception/waiting wing or pave the whole property with clinic tiles. The player builds the clinic gradually: additional treatment rooms, reception, waiting, exercise areas and specialist facilities are constructed on the open property as progression permits. Floors and walls belong to player-built rooms only; all unbuilt land remains outdoor lawn.

The starter state should look like the beginning of a clinic-development game, not a completed miniature hospital.

## World and expansion
The clinic begins on an open 14 m × 28 m property with substantial lawn around the first treatment room. Players first construct rooms and facilities within this property, then may unlock or purchase adjacent land parcels using in-game progression and currency. Expansion can add rooms, wings or separate buildings, plus outdoor paths, trees, benches, signs, parking and a rehabilitation garden. Later specialist spaces may include a larger exercise gym, sports rehabilitation, balance/mobility facilities, and other justified facilities.

Expansion is optional and meaningful; it must not block the core clinical loop.

## Camera and visual direction
- Portrait-first Android; no forced landscape rotation.
- Isometric-style orthographic camera inspired by management games.
- Smooth, bounded touch pan and pinch zoom.
- Management overview, closer build mode, and a controlled close clinical-session camera.
- Smooth transitions between modes; no scene reload for every activity.
- Original THERASON visual identity: modern stylized realism, believable proportions, readable equipment, calm medical architecture and consistent materials.
- Prefer clarity and stable performance over photorealism.

## Core loops
**Clinic day:** open clinic → review appointments/status → receive patient → player performs session → receive appropriate revenue/reputation/progression → resolve a small operational decision → improve clinic.

**Build:** earn coins → inspect needs/space → purchase object or land → preview → validate footprint, collision and access → place → observe improvement.

**Clinical encounter:** patient arrives → history and priorities → safety screening → select and justify assessment → gather findings → interpret → form hypotheses → set functional goals → select intervention/dosage → observe response → reassess → receive feedback and references.

**Long-term progression:** improve clinic and clinical capability as two distinct progress tracks.

## Economy
Keep the visible economy to three primary resources:
- Coins: clinic revenue and spending.
- Reputation: reflects service quality, patient experience and clinic standards.
- Research/learning points: unlock educational content and advanced equipment through validated milestones.

Internal dashboard metrics may include care quality, patient satisfaction and financial health. The optional receptionist is a meaningful investment that improves appointment organization; do not make it mandatory.

No energy lockouts, loot boxes, pay-to-win clinical advantage, coercive streaks or rewards for unsafe speed/overtreatment. Taking a break must not punish the player.

## Patients and movement
Begin with a small number of visible patients and one active player clinician. The player avatar must navigate around walls, doors and furniture. Use authored animation states and lightweight pathfinding. Nearby characters receive full updates; distant/off-screen activity is simplified or paused. No large crowd simulation in the first release.

## Clinical cases
Cases are versioned data packages independent of PlayCanvas. Each contains learner level, objectives, fictional patient profile, history, safety logic, assessment choices/findings, acceptable reasoning pathways, goals, interventions, simulated response, reassessment, scoring rubric, references, review date and reviewer history.

Publishing workflow: draft → evidence attached → qualified physiotherapy educator review → additional specialist/medical review when needed → safety/logic review → playtest → approval → publish → monitor/revise/withdraw.

AI may help structure drafts but cannot independently validate or publish clinical content. Use fictional/de-identified data only. Simulations do not replace supervised practice or professional judgment.

## Retention and progression
- Short goals: complete a session, arrange a room, resolve a small clinic issue.
- Medium goals: unlock equipment, improve layout, complete a case series, strengthen a skill.
- Long goals: expand property, open a specialism, develop reputation, master a clinical domain.

Later: scenario events, weekly design/management challenges, research unlocks, longitudinal patient stories, clinic history/milestones, read-only clinic visits, fair competitions and adaptive case recommendations with transparent educational rationale.

## Mobile and technical principles
- PlayCanvas remains the single 3D runtime.
- Keep UI lightweight and separate from the 3D scene where practical.
- Use optimized GLB/glTF, compressed textures, LOD, instancing, material/mesh reuse, baked static lighting, limited dynamic shadows and progressive loading.
- Load only active/nearby assets; maintain explicit memory and download budgets.
- Avoid per-frame allocations; pool frequently reused objects.
- Adapt render resolution and offer Low/Medium/High profiles.
- Pause/reduce work when the tab is hidden.
- Cache versioned static assets for unreliable networks.
- Local versioned save first; cloud sync later through a resilient queue.
- Test on low-end Android throughout development.

## Social features (later)
First milestone is read-only clinic visits. No chat, trading, shared editing or real-time multiplayer initially. Privacy and abuse controls must precede public visits.

## Accessibility
Arabic-first, readable UI with English medical terminology where useful, strong contrast, scalable text, large touch targets, non-color-only feedback, reduced motion and low-graphics mode.

## First playable vertical slice
- Standard starter plot with small clinic and outdoor green area.
- Player physiotherapist avatar only; receptionist can follow after core stability.
- Reception/waiting zone and one treatment room.
- One patient and a short clinically reviewed encounter.
- Management, build and close clinical camera modes.
- Small object catalog, grid placement, rotation and collision/path checks.
- One purchase and a basic coin loop.
- Local save/reload.
- Stable touch interaction on a low-end Android device.

## Acceptance gates
Do not expand content until:
1. Portrait layout is attractive and readable on narrow phones.
2. Camera and avatar movement show no visible jitter.
3. Human proportions are credible against doors, beds and equipment.
4. Navigation respects walls and furniture.
5. Placement prevents overlap, out-of-bounds objects and blocked access.
6. Starter clinic feels polished, coherent and expandable.
7. A short loop is understandable without a long tutorial.
8. Save/reload is reliable and validates old/corrupt data.
9. Sustained low-end Android test reaches the agreed baseline (target 30 FPS; 60 FPS on capable devices).
10. Startup, frame-time distribution, memory, transfer size and touch latency are recorded.

## Explicit first-release non-goals
No nurses, employed doctors, cleaners, assistants, large staff roster, massive open world, crowd simulation, photorealism, multiplayer editing, chat, trading, real patient records, real-world clinical decision support or coercive monetization.
