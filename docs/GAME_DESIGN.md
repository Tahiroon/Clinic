# THERASON CLINIC — Game Design Document

**Status:** Approved direction 2.0 | **Date:** 2026-11-13 | **Branch:** clinic-dev

## Product promise
A portrait-first mobile clinic-management game with an original physiotherapy identity. The player owns and grows a rehabilitation clinic, personally acts as its physiotherapist, manages patient flow and a simple economy, and develops clinical reasoning through evidence-informed simulated encounters.

The broad inspiration is the readable isometric management experience of Two Point Hospital—not its protected characters, artwork, interface, names, assets, diseases or exact layouts.

## Design lessons adapted from Two Point Studios

These are design principles to learn from, not assets, characters, UI layouts or systems to copy:

- **Start simple, layer gradually:** introduce one room and one clear task first; unlock more decisions only after the learner understands the current loop. Two Point's developers described deliberately reducing early friction before layering features over time ([NME interview](https://www.nme.com/features/doing-things-the-two-point-way-3199369)).
- **Make the space itself strategic:** room shape, doors, corridors, waiting areas and equipment placement should visibly change patient flow. Functional and decorative objects should later affect room quality and patient comfort, not just fill space ([official Steam overview](https://store.steampowered.com/app/535930/Two_Point_Hospital/)).
- **Keep camera and controls effortless:** provide a readable overview for planning, a closer build view and smooth, predictable touch gestures. The studio discussed rebuilding controls around quick, simple interactions and smooth camera movement for console play ([developer interview](https://www.pushsquare.com/news/2020/02/interview_two_point_hospital_devs_talk_diseases_dad_jokes_and_dualshock_4)).
- **Make the world feel alive through small details:** purposeful idle/walk animations, patient reactions, short ambient moments and clear visual feedback make a small population feel present ([development retrospective](https://mcvuk.com/development-news/when-we-made-two-point-hospital/)).
- **Keep a grounded reality anchor:** use a warm, lightly playful THERASON world, but keep physiotherapy cases, safety decisions, assessment and feedback evidence-informed. Humour must never trivialise patient safety or turn the simulator into a substitute for clinical supervision.

**THERASON's distinction:** the learner is the physiotherapist. The central reward is better clinical reasoning and a better-designed rehabilitation clinic—not managing a large workforce or maximising cures per minute.

## Cross-game design research and THERASON adaptations

The goal is to borrow proven design principles, never protected art, characters, UI layouts, names or assets.

- **Two Point Hospital — handcrafted warmth and readable humor:** use a distinctive, warm visual identity with clear silhouettes and a little personality, while keeping clinical content respectful. The development retrospective describes the team's deliberate handcrafted, clay-like visual direction ([MCV/Develop](https://mcvuk.com/development-news/when-we-made-two-point-hospital/)).
- **Planet Zoo — readable cause and effect:** every visible problem should communicate what is happening, why it is happening and what the player can do. Patient routes, waiting comfort, room access and rehabilitation equipment should influence the simulation in understandable ways ([GamesRadar developer interview](https://www.gamesradar.com/games/simulation/we-dont-want-to-simplify-it-and-make-it-easy-thats-not-where-were-at-planet-zoo-2-developer-on-approachability-animal-improvements-and-all-new-habitats/); [Game Developer interview](https://www.gamedeveloper.com/game-platforms/designing-the-simulation-of-the-wild-and-wonderful-i-planet-zoo-i-)).
- **Hay Day — ownership and creative expression:** players should be proud of the clinic they arrange. Decorations, paths, outdoor gardens and themed spaces should support a coherent personal style, not just act as score modifiers ([Supercell decoration guide](https://support.supercell.com/hay-day/en/articles/custom-decorations.html)).
- **Clash of Clans — interface clarity at scale:** the most-used actions should remain easy to locate, with fewer taps and less visual crowding as systems grow. The 2026 UI refresh explicitly focuses on reducing friction for both new and experienced players ([Supercell UI update, 8 Oct 2026](https://supercell.com/en/games/clashofclans/blog/news/weve-revamped-the-clash-of-clans-user-interface/)).
- **Two Point console controls — accessible camera and building:** quick, simple room-building actions and smooth camera controls are core interaction goals, especially when adapting management games to touch and controller play ([Push Square developer interview](https://www.pushsquare.com/news/2020/02/interview_two_point_hospital_devs_talk_diseases_dad_jokes_and_dualshock_4)).

**THERASON translation:** the clinic should feel warm and alive, but its signature systems are physiotherapy-specific: patient mobility, functional goals, safe assessment, evidence-informed treatment, progress reassessment and accessible rehabilitation spaces.

## Core pillars
1. Build and expand a beautiful clinic and its outdoor property.
2. Manage appointments, patient flow, money, reputation and equipment.
3. Personally assess and treat patients as the physiotherapist.
4. Learn through justified decisions, evidence, feedback and reassessment.
5. Progress through new spaces, equipment, case series and challenges.

## Characters and clinic roles

- One player-controlled physiotherapist is the clinic's only clinical worker.
- Patients are visitors with needs, patience, mood and individual fictional cases.
- One receptionist may be purchased after the player completes three patient sessions. This upgrade improves registration and queue flow.
- No additional hireable physiotherapists, nurses, rehabilitation assistants, cleaners, doctors, payroll, energy, morale, staff schedules or staff rooms.

## Starter property and player-built clinic

Every new clinic begins on an empty 14 m × 28 m landscaped buildable plot. The player constructs the first treatment room, buys its equipment, then builds reception, assessment, exercise space and additional treatment rooms as the clinic grows. Unbuilt land remains outdoor grass; room floors and walls exist only inside constructed rooms.

## Core management loop

1. Inspect the property and plan the room layout, doors and patient corridors.
2. Draw rooms with adjustable rectangular dimensions; furnish each room with required equipment.
3. Add optional decoration, windows, lighting, plants, wall art and comfort items to improve room quality and visual appeal.
4. Open the clinic; patients arrive, register, wait and move through the clinic.
5. The player physiotherapist personally starts and completes each clinical encounter.
6. Track queues, patient patience, reputation, income and clinic progression.
7. Resolve bottlenecks by changing room layout, adding equipment/seating or buying the optional receptionist.
8. Unlock specialist rehabilitation spaces and new decoration/equipment collections.

The game must feel alive through patient movement, animated characters, visible room activities, status indicators and small events—not through a complex staff roster. The simulation runs at pause/1×/2×/3× speed. Patient journeys are visible in the world and management panel.

## World and expansion
The clinic begins on an open 14 m × 28 m property with substantial lawn around the first treatment room. Players first construct rooms and facilities within this property, then may unlock or purchase adjacent land parcels using in-game progression and currency. Expansion can add rooms, wings or separate buildings, plus outdoor paths, trees, benches, signs, parking and a rehabilitation garden. Later specialist spaces may include a larger exercise gym, sports rehabilitation, balance/mobility facilities, and other justified facilities.

Expansion is optional and meaningful; it must not block the core clinical loop.

## Outdoor rehabilitation identity

The surrounding property is not decorative filler. The entrance garden, planted edges, benches and lighting establish a welcoming rehabilitation setting. A short outdoor gait-training lane with visible distance markers connects to the entrance approach and remains outside the buildable plot. Later it can support outdoor walking challenges, balance tasks and functional mobility scenarios, but it must not become a prerequisite for opening the starter clinic.

## Camera and visual direction

- Portrait-first Android; no forced landscape. Portrait is a spatial advantage, not a cropped desktop layout: the initial mobile camera frames the complete 14×28 m starter property with a small margin, while wide screens use a closer management composition.
- The map is deliberately organized along its long axis: arrival garden and approach, clinic entrance, player-buildable treatment campus, then the far garden edge. Important play zones remain readable without requiring a landscape rotation.
- Readable three-quarter orthographic camera with room interiors visible from above, one-handed zoom and pan, and a zoom range that supports both whole-property planning and close equipment placement.
- A restrained THERASON architectural language: warm plaster wall bodies, shallow inset wall panels, fine shadow reveals, a simple protective base and a clean coping line. Depth comes from small offsets and real light, not busy trim or excessive glass. A compact starter-clinic pavilion anchors the property with a recessed glazed entry, framed side windows, a layered canopy and a clear THERASON sign.
- Lighting uses real soft dynamic shadows on capable devices (2048 PCSS map, tuned penumbra/bias and a restrained ambient fill) and lightweight layered contact shadows on entry-level phones. Fine wall reveals and tiny trim do not cast expensive dynamic shadows; major architectural masses, trees, furniture and equipment do.
- The front property edge is opened into a low, welcoming gate aligned to the approach path. A wider stone arrival court at the clinic entrance creates a readable destination, while remaining property edges use layered low stone curbs rather than tall fences.
- Outdoor grounds are composed as designed landscape zones rather than one flat green slab: a clear paved arrival route, raised path edges, repeated paver rhythm, layered tree canopies, planted beds, benches, lighting and a functional gait-training lane. All garden and grass geometry remains outside the buildable plot.
- Readable isometric/three-quarter orthographic view with room interiors visible from above.
- Stylized 3D management-game art: rounded silhouettes, clean geometry, friendly proportions, bright room identities, soft daylight and playful but professional props.
- Strong visual hierarchy like a polished theme-park/hospital management game: compact HUD, objective card, contextual build/store catalog, readable room labels and patient status.
- THERASON palette: navy interface framing, cyan/teal accents, aqua details, warm white architecture and selective cheerful accent colors.
- Rooms need visible floors, wall trims, windows, doors, lighting, furniture, signage and decorative items. Avoid empty box rooms.
- Management overview, closer build mode and smooth clinical-session camera.
- Learn from Two Point Hospital's readability and presentation patterns without copying its assets, characters, exact UI, room layouts or branding.

## Core loops
**Clinic day:** open clinic → review appointments/status → receive patient → player performs session → receive appropriate revenue/reputation/progression → resolve a small operational decision → improve clinic.

**Build:** earn coins → inspect needs/space → purchase object or land → preview → validate footprint, collision and access → place → observe improvement.

**Clinical encounter:** patient arrives → history and priorities → safety screening → select and justify assessment → gather findings → interpret → form hypotheses → set functional goals → select intervention/dosage → observe response → reassess → receive feedback and references.

**Long-term progression:** improve clinic and clinical capability as two distinct progress tracks.

## Economy

- Coins buy rooms, furniture, equipment, decoration and later land.
- Reputation reflects patient experience and clinic quality.
- XP records learning progress and unlocks.
- The optional receptionist is a one-time purchase unlocked after three completed clinical sessions. No recurring wages.
- No staff energy, morale, payroll, breaks, staff-room requirements or recruitment roster.
- No pay-to-win clinical advantages or rewards for unsafe speed/overtreatment.

## Patients and movement

Patients arrive only after the clinic opens. Without a receptionist, the player handles basic registration; after the receptionist upgrade, registration is faster and queues are easier to manage. Patients wait, lose patience over time, move to the assessment/treatment area, then leave after the player completes the case. The player physiotherapist is the only worker character. Use a small active patient cap, authored animations and obstacle-aware pathfinding; simplify distant characters for mobile performance.

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

- Generous landscaped property with one starter treatment room.
- Variable-size reception, assessment, treatment and exercise rooms.
- Furnishing and decoration store using licensed GLB equipment assets.
- One animated physiotherapist controlled by the player.
- Patient arrival, registration, waiting, player-led clinical session and discharge.
- One optional receptionist purchase unlocked after three completed sessions.
- Coins, reputation, XP, patient patience and clinic events.
- Isometric overview, build mode and close clinical-session transition.
- Grid placement, collision/path checks and local save/reload.

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

No staff roster, recruitable physiotherapists, nurses, employed doctors, rehabilitation assistants, cleaners, payroll, staff energy/morale/break systems, staff rooms, large crowd simulation, multiplayer editing, chat, trading, real patient records, photorealism or unrelated hospital departments.



## Real equipment marketplace

The clinic shop is a data-driven catalog backed by the exact bundled GLB assets used by placement. Every catalog entry declares its source file, verified node (or full scene), price, footprint, target scale, category, intended room and clinical/use description. The catalog is split into physiotherapy, assessment, mobility, furnishing, safety, finishing/decor, specialty expansion and ready-made kits. Search filters the active category without loading every model.

The selected product is previewed as the same GLB scene/node used when it is placed. The player can rotate the selected item before placement. Product thumbnails are captured from a downsampled post-render frame only after a player inspects that product; the shop does not create a separate WebGL renderer or load every product at once. Uninspected products show a clear 3D-inspection prompt rather than a fake illustration.

New stock includes wayfinding/signage, clinic amenities, patient-bed bay, lab and imaging expansion sets, plus interior partitions, door leaf and floor tile modules. These are optional expansions: specialist suites and large kits require a suitable built room and enough floor area. All new models remain lazy-loaded through the shared container cache, and the original asset-source/license notices stay with the bundled GLBs.
