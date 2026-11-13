# THERASON CLINIC — 3D Asset Production Brief

**Purpose:** Prepare a coherent, lightweight asset library for the first real visual production pass.
**Runtime:** PlayCanvas | **Branch:** clinic-dev | **World scale:** 1 unit = 1 metre.

## Art direction
- Isometric 3D management-game presentation, viewed in portrait on a phone.
- Inspired by the clarity and readability of Two Point Hospital, without copying its characters, architecture, UI, branding or assets.
- Premium stylized realism: believable human proportions and recognizable physiotherapy equipment, with simplified clean geometry.
- Calm modern rehabilitation-clinic identity: deep navy, teal/cyan accents, warm off-white walls, muted green landscaping and natural daylight.
- Avoid toy-like miniature people, extreme saturation, excessive gloss, clutter and oversized empty hospital halls.
- Rooms should read clearly from the isometric cutaway camera: open roof, readable wall thickness, visible doors/windows, distinct floor materials and believable furniture scale.

## Fixed starter-world dimensions
- Maximum plot: 20 m × 20 m.
- Starter building: two adjoining rooms, each approximately 4 m × 4 m; reception plus one treatment room.
- Property includes a small entrance apron, paved walkway, lawn, low perimeter hedge, a few planters and trees.
- Expansion is limited to the visible property boundary; no infinite world.
- Human character height target: 1.65–1.80 m.
- Room wall height target: approximately 2.2 m.
- Door clear width target: at least 0.9 m.
- Keep all pivots at ground contact / logical placement center and all models in metre scale.

## Priority A — first production assets
1. **Physiotherapist player:** one adult physiotherapist, neutral professional outfit with THERASON-compatible teal/navy accents, realistic body proportions, clean rig, idle/walk/turn animations.
2. **Patient visitor:** one adult patient character with a separate rig and idle/standing/sitting options. Patients are visitors, not employees.
3. **Clinic modular shell:** straight wall, corner wall, shared partition, doorway, door frame, window frame, glass pane, wall cap, plinth and exterior sign.
4. **Treatment table:** recognizable adjustable physiotherapy plinth with legs, mattress, head section and paper roll.
5. **Reception desk:** realistic compact desk with monitor and storage; no receptionist NPC required for the first pass.
6. **Storage cabinet:** compact medical storage with doors/handles.
7. **Waiting chair:** one modular chair with correct seat height and backrest.
8. **Outdoor kit:** grass ground, path pavers, low hedge segments/corners, one tree, one shrub, planter and a simple clinic entrance sign.

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
- Target low-poly mobile geometry; use mesh compression and KTX2/Basis after validating browser support and visual quality.
- Keep textures and meshes separate only when reuse is valuable.
- Include a preview render, source/license note, dimensions, pivot description and animation list with each asset delivery.
- No unnecessary rig bones, hidden mesh parts, duplicate materials or embedded demo scenes.

## Naming convention
- `char_physio_player_v01.glb`
- `char_patient_adult_v01.glb`
- `clinic_wall_straight_v01.glb`
- `clinic_doorway_v01.glb`
- `clinic_window_v01.glb`
- `clinic_reception_desk_v01.glb`
- `pt_treatment_table_v01.glb`
- `pt_parallel_bars_v01.glb`
- `env_grass_plot_v01.glb`

## Exclusions for the first release
- No nurse, employed doctor, cleaner, assistant or staff roster.
- No crowds or complex NPC simulation.
- No full-size hospital building or oversized multi-floor architecture.
- No high-cost real-time reflections, heavy post-processing or 4K assets.
- No unlicensed downloaded assets.

## Acceptance before an asset enters the game
1. Fits the documented metre scale and camera angle.
2. Looks correct in portrait at the target phone resolution.
3. Has a clean collision footprint and placement origin.
4. Loads independently and has a fallback or graceful failure path.
5. Does not exceed the agreed mobile memory / draw-call budget.
6. Has verified license and provenance.
