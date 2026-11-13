# THERASON CLINIC — Visual Direction & World Foundation

Status: approved working direction for the clinic-dev redesign
Scope: visual world, camera, architecture, environment, readability, and future extensibility.
Reference principles: Two Point Hospital / Two Point Campus; do not copy protected art, characters, UI, names, or assets.

## 1. Product promise

THERASON CLINIC is a small, personal physiotherapy-clinic management game presented with the visual richness and readability of a premium management sim. It is not a hospital reskin and not a static 3D diorama. The player owns a clinic property inside a larger, believable game world. The clinic is the playable focus; the world around it provides place, scale, atmosphere, and room for future expansion.

The first release deliberately has a smaller operational scope than Two Point Hospital. It must not look like a tiny prototype. Visual quality, scene composition, character scale, architectural consistency, animation, and tactile interaction must feel intentional from the first minute.

## 2. Non-negotiable world hierarchy

Three nested spaces must remain visually and technically distinct:

1. **World / district** — the broad environment beyond the clinic property: distant terrain, roads, neighboring low-detail buildings, trees, landscape features, sky and ambient life. It is not buildable in the first release.
2. **Clinic property** — a clearly legible plot with an entrance and boundary cues. It is surrounded by the world, not by a small decorative lawn strip. The property can expand into adjacent plots in later progression.
3. **Clinic construction area** — the player's actual buildable footprint. Room floors, walls, doors, corridors and equipment exist here. Nothing from the decorative world layer may be mistaken for buildable clinic floor.

The current flat rectangular green slab, symmetric row of primitive trees, perimeter edging, and thousands of visible blade tufts do not meet this hierarchy and must not be treated as the target art direction.

## 3. Visual target

Use a **handcrafted, stylized 3D management-sim look**:
- Soft, rounded but architecturally readable silhouettes.
- Warm daylight, controlled ambient fill, soft contact shadows, restrained highlights.
- A cohesive palette: warm off-white and muted stone architecture; teal/cyan identity accents; natural but varied greens; warm timber; restrained terracotta and paving tones.
- Strong value separation between ground, paths, plot boundary, building, rooms, and props.
- Slightly exaggerated proportions for readability on a phone, but credible physiotherapy equipment and room scale.
- Visual density comes from composed clusters and purposeful landmarks, not random clutter or repeated primitive shapes.
- Avoid photorealistic mixed asset packs. All imported assets must be reviewed for scale, style, material response, and licensing before entering the scene.

Do not imitate Two Point's exact proportions, colourways, character designs, UI, or models. Build a distinct THERASON visual identity.

## 4. Environment redesign

### 4.1 Remove the fake-lawn treatment

The current repeated triangular grass tufts are not a grass solution. Remove them from the primary view. Do not replace them with a denser particle field.

The ground should read as a designed landscape:
- Use a continuous, broad terrain surface with gentle height/colour variation and a few broad material zones.
- Use grass as a quiet base material, not as thousands of individually readable blades.
- Add irregular planting beds, layered shrubs, trees with varied silhouettes, rocks/low landscape forms, and small environmental details in deliberate clusters.
- Use believable paved paths and road connections with coherent widths, curbs, intersections, and transitions.
- Avoid perfect left/right symmetry and repeated evenly spaced decorations.
- Add a few distant building silhouettes and environmental landmarks to communicate a larger district without rendering expensive detail.
- The clinic property must remain the clear focal point; surrounding scenery must frame it, not compete with it.

### 4.2 Outdoor composition

Compose the initial scene as a small clinic campus inside a larger district:
- A readable approach road or arrival lane connects to the clinic entrance.
- A clear pedestrian route leads from the property entrance to the clinic front door.
- Landscaping sits outside the buildable plot and never blocks movement.
- A small public/arrival forecourt can support a sign, drop-off point, seating, and planted islands.
- Distant context continues beyond the visible playable property; do not end the world at the property fence.
- The gait-training garden is a purposeful clinic amenity, placed as part of the campus plan rather than a random strip of pavement.
- Future plot expansion should be possible at one or more property edges without rebuilding the world coordinate system.

## 5. Clinic architecture

The first clinic should look like a coherent, designed building, not a collection of unrelated boxes:
- Establish a clear main entrance, façade rhythm, roofline, windows, signage, and material palette.
- Room walls must connect cleanly and use consistent thickness, height, corners, door openings, and skirting.
- Doors must align to wall openings and be visually legible.
- Floors should use room-specific but coordinated materials.
- Rooms begin empty. The player creates rooms and places equipment; no hidden prebuilt furniture or invisible collision blockers.
- Equipment must be scaled against a common human-height reference and sit on the floor correctly.
- Composite GLB kits must not be used as oversized room substitutes. Use only verified submodels or treat a true room kit as a separately sized, clearly labelled prefab.
- Windows, wall signage, wall-mounted equipment and lighting need proper wall attachment points rather than arbitrary floating placement.

## 6. Camera and composition

The camera must support a premium management-sim overview while remaining usable in portrait:
- Default to a three-quarter/isometric-like view with visible room interiors and readable character silhouettes.
- Do not force the entire property into the initial portrait frame if doing so makes the clinic tiny. Frame the clinic as the hero subject and allow the player to pan/zoom out to discover the surrounding district.
- Provide smooth pan, zoom, and restrained rotation with predictable touch gestures.
- Use camera bounds based on the world/plot hierarchy, not a hard crop around the clinic plot.
- Add contextual camera presets: overview, clinic/build focus, and selected room focus.
- Keep all key interactions reachable with one hand; overlays must not cover the central playable view.
- On low-end devices, preserve composition while reducing render resolution, shadow quality, distant detail, and visible prop count.

## 7. Characters and life

Characters are a major part of the visual experience, not optional decoration:
- Use consistent character scale and a small, coherent cast.
- Idle, walk, turn, stop, interact, sit, and treatment poses must be readable.
- Character paths must connect actual entrances, doors, queues, waiting points, equipment interaction points, and exits.
- A character must never walk through walls, counters, beds, equipment, or landscape obstacles.
- Avoid spawning many characters before the core navigation and animation loop is stable.
- The first visual milestone can use a small number of patients and one physiotherapist; staff expansion is intentionally later.

## 8. Rendering and performance rules

Target a stable 30 FPS baseline on the agreed entry-level Android device; verify rather than claim.
- Prefer shared materials, instancing/batched geometry, merged static environment meshes, and low draw-call counts.
- Use LOD or distance-based visibility for district context.
- Do not create one WebGL context per asset or one high-cost mesh per grass blade.
- Use baked/stylized ambient shading and contact shadows where dynamic shadows are too expensive.
- Load optional environment detail lazily; the initial scene must remain usable with weak or intermittent internet.
- Keep the world art local/bundled and deterministic; no network dependency for the core scene.
- Record physical-device performance and screenshots for every visual milestone.

## 9. Design and implementation sequence

Do not mix all systems into one large visual patch. Implement and validate in this order:

### Milestone A — World composition
- Replace the flat lawn presentation and repeated tufts.
- Establish a broad world/district ground, road, approach path, distant context, and irregular landscape clusters.
- Reframe the camera so the clinic is prominent and the world is discoverable.
- Preserve the buildable plot as a separate coordinate layer.
- Acceptance: a screenshot reads immediately as a clinic in a larger living place, not a small plot sitting on a green slab.

### Milestone B — Clinic building quality
- Rework the exterior building façade and room wall/door/window language as one consistent architectural kit.
- Verify room footprints, walls, floor surfaces, entrances and roof visibility.
- Acceptance: rooms read as functional spaces and the clinic building looks like one designed facility.

### Milestone C — Build-mode presentation
- Add clean room-drawing previews, wall/door snapping, object placement ghosts, valid/invalid placement states, and clear selection feedback.
- Acceptance: building feels tactile and predictable on touch.

### Milestone D — Character life
- Validate navigation and animation against real room layouts and collision footprints.
- Add patient arrivals and meaningful movement only after path correctness is proven.
- Acceptance: every visible character has a destination and reaches it without clipping.

### Milestone E — Visual polish
- Add controlled lighting, environmental animation, subtle ambient motion, room identity, and visual feedback.
- Acceptance: polish supports gameplay and does not hide structural problems.

## 10. Review gates

Every milestone requires:
1. Build/type/asset validation.
2. Before/after screenshots at portrait phone size and desktop size.
3. A recorded interaction walkthrough, not just a successful compile.
4. Low-end performance check or an explicit statement that physical-device testing is still pending.
5. No main-branch changes without explicit approval.

A green build is necessary but never sufficient evidence of visual quality or playability.
