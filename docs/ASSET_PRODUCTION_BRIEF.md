# THERASON CLINIC — 3D Asset Production Brief

**Purpose:** Prepare a coherent, lightweight asset library for the first real visual production pass.
**Runtime:** PlayCanvas | **Branch:** clinic-dev | **World scale:** 1 unit = 1 metre.

## Art direction

- Portrait-first isometric/three-quarter 3D management-game presentation.
- Learn from the visual readability of Two Point Hospital: roofless/cutaway rooms, visible furniture, clear corridors, colorful room identities, friendly small characters, readable activity and an information-rich but compact HUD.
- Do not copy Two Point Hospital characters, architecture, interface, exact room compositions, branding or assets.
- **Stylized 3D cartoon**, not premium photorealism: rounded silhouettes, clean bevels, expressive proportions, bold readable props, saturated but controlled colors, soft shadows and bright daylight.
- THERASON palette: navy framing and signage, cyan/teal highlights, aqua details, warm white walls, with selective cheerful room colors.
- Every room needs distinct floor material, colored wall trim, visible doors/windows, ceiling lights, room sign, furniture and decoration.
- Avoid plain white boxes, dark gloomy hospital corridors, generic stock-room appearance and mismatched art styles.
- Prefer reusing the already imported Shuriken Studio hospital GLB kit and Gobkit CC0 humanoids as one consistent asset family. New additions must match their scale and shading and have a verified license.

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

1. **Physiotherapist player:** one adult physiotherapist with neutral professional clothing and THERASON teal/navy accents, clean rig and idle/walk/turn animations.
2. **Patient visitors:** a small set of adult patient variants with idle/walk/sit animations.
3. **Room architecture kit:** modular cutaway walls, doors, windows, trims, signs, room labels and floor tile variants.
4. **Treatment room kit:** adjustable treatment table, storage, stool, privacy curtain, wall chart and clinical sink.
5. **Reception kit:** reception counter, monitor, waiting chairs, queue markers and optional receptionist character.
6. **Assessment kit:** examination couch, desk, patient chair, measurement props and wall charts.
7. **Exercise kit:** parallel bars, mats, therapy bike, treadmill, wall bars, resistance bands, balance equipment and exercise balls.
8. **Decor kit:** plants, clocks, posters, bins, lamps, wall art, water dispenser and small comfort items.
9. **Outdoor kit:** grass, paths, low hedges, layered trees, shrubs, planters and a clinic entrance sign.

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

- No staff roster, nurses, employed doctors, cleaners, assistants or staff-room assets.
- No crowds or complex NPC workforce simulation.
- No full-size hospital building or multi-floor architecture.
- No high-cost reflections, heavy post-processing or 4K assets.
- No unlicensed downloaded assets.

## Acceptance before an asset enters the game
1. Fits the metre scale and portrait camera composition.
2. Looks correct at the target phone resolution.
3. Has a clean collision footprint and placement origin.
4. Loads independently and has a fallback or graceful failure path.
5. Does not exceed the agreed mobile memory / draw-call budget.
6. Has verified license and provenance.
