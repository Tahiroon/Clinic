# THERASON CLINIC — 3D Asset Production Brief

**Purpose:** Prepare a coherent, lightweight asset library for the first real visual production pass.
**Runtime:** PlayCanvas | **Branch:** clinic-dev | **World scale:** 1 unit = 1 metre.

## Art direction
- Portrait-first, isometric/three-quarter 3D management-game presentation.
- Inspired by the readable rooms, staff scale and management camera of Two Point Hospital, without copying its characters, architecture, UI, branding or layouts.
- Premium stylized realism: believable human proportions, recognizable physiotherapy equipment, readable room partitions, doors and furniture.
- Calm modern rehabilitation-clinic identity: deep navy, teal/cyan accents, warm off-white walls, muted green landscaping and natural daylight.
- Avoid toy-like miniature people, excessive gloss, clutter, oversized empty hospital halls and oversized yard areas.
- Roofless/cutaway rooms should be readable from the camera: consistent wall height, visible door clearance, distinct floor materials and believable furniture scale.

## Starter-world dimensions
- Starter property: approximately 14 m wide × 28 m deep, composed for portrait viewing, with a continuous outdoor lawn and a clear entrance path.
- Starter building: one 4 m × 4 m treatment room only; do not prebuild a reception/waiting wing.
- The treatment room has a clear front entrance opening and enough approach clearance for the patient and player avatar.
- All unbuilt property is outdoor grass. Trees and shrubs stay near the outer landscape edges, outside the building and away from the entrance route.
- Room flooring is limited to constructed rooms; never tile or pave the full property.
- Players add rooms and facilities inside the initial property, then later unlock adjacent land parcels. The first property must feel spacious and expandable, not like a completed clinic or an empty warehouse.
- Human character height target: 1.65–1.80 m.
- Room wall height target: approximately 2.2 m.
- Door clear width target: at least 1.0 m.
- Keep all pivots at ground contact / logical placement center and all models in metre scale.

## Priority A — first production assets
1. **Physiotherapist player:** one adult physiotherapist, neutral professional outfit with THERASON-compatible teal/navy accents, believable body proportions, clean rig, idle/walk/turn animations.
2. **Patient visitor:** one adult patient character with a separate rig and idle/standing/sitting options. Patients are visitors, not employees.
3. **Clinic modular shell:** straight wall, corner wall, shared partition, doorway, door frame, window frame, glass pane, wall cap, plinth and exterior sign.
4. **Treatment table:** recognizable adjustable physiotherapy plinth with legs, mattress, head section and paper roll.
5. **Reception desk:** compact realistic desk with monitor and storage; optional receptionist NPC is a later feature.
6. **Waiting row:** modular 3–4 seat waiting row with correct seat height and enough side-lane clearance for the player.
7. **Storage cabinet:** compact medical storage with doors/handles.
8. **Outdoor kit:** grass ground, path pavers, low hedge segments/corners, one layered low-poly tree, one shrub, planter and simple clinic entrance sign.

## Priority B — first equipment catalogue
- Parallel bars with correct handrail height.
- Exercise mat and treatment step.
- Stationary therapy bike.
- Treadmill / gait-training unit.
- Wall bars.
- Resistance-band rack and light dumbbells.
- Exercise ball and balance pad.
- Walking frame, crutches and cane.
- Privacy screen/curtain.

## Delivery format and optimization
- Preferred: GLB/glTF, one logical object per file or a documented modular kit.
- Use metre units, applied transforms, ground-aligned pivots and consistent forward direction (+Z).
- Provide LOD0 and optional LOD1 for large or frequently repeated objects.
- Reuse materials; avoid unique 4K textures. Start with 512–1024 px texture maps where needed.
- Prefer one atlas/material set per room kit when it reduces draw calls without causing excessive texture memory.
- PBR maps only where they materially improve appearance; avoid expensive transparency except windows.
- Target mobile low-poly geometry; use mesh compression and KTX2/Basis after validating browser support and visual quality.
- Keep textures and meshes separate only when reuse is valuable.
- Include preview render, source/license note, dimensions, pivot description and animation list with each asset delivery.
- No unnecessary rig bones, hidden mesh parts, duplicate materials or embedded demo scenes.

## Naming convention
- `char_physio_player_v01.glb`
- `char_patient_adult_v01.glb`
- `clinic_wall_straight_v01.glb`
- `clinic_doorway_v01.glb`
- `clinic_window_v01.glb`
- `clinic_reception_desk_v01.glb`
- `clinic_waiting_row_v01.glb`
- `pt_treatment_table_v01.glb`
- `pt_parallel_bars_v01.glb`
- `env_grass_plot_v01.glb`

## Exclusions for the first release
- No nurse, employed doctor, cleaner, assistant or staff roster.
- No crowds or complex NPC simulation.
- No full-size hospital building or multi-floor architecture.
- No high-cost real-time reflections, heavy post-processing or 4K assets.
- No unlicensed downloaded assets.

## Acceptance before an asset enters the game
1. Fits the metre scale and portrait camera composition.
2. Looks correct at the target phone resolution.
3. Has a clean collision footprint and placement origin.
4. Loads independently and has a fallback or graceful failure path.
5. Does not exceed the agreed mobile memory / draw-call budget.
6. Has verified license and provenance.
