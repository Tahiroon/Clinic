# THERASON CLINIC — Test Plan

**Status:** Active validation plan | **Branch:** clinic-dev

## Test layers
- Unit: grid coordinates, footprints, rotations, room bounds, doorway clearance, placement, save-schema validation, economy transactions and progression.
- Integration: PlayCanvas lifecycle, canvas resize, camera modes, scene load/unload, UI-to-domain commands and asset loading.
- Browser: portrait layout, touch, back/visibility behavior, reload recovery and offline cache.
- Device: real entry-level Android and a stronger Android reference device.
- Visual: room proportions, avatar scale, readability, lighting, materials, outdoor composition and camera framing.
- Clinical review: educator validation of case facts, red flags, reasoning paths and feedback before publication.

## Product scope checks

1. The player physiotherapist is the only clinical worker character.
2. Patients appear as visitors with individual fictional cases.
3. One optional receptionist can be purchased only after three completed patient sessions; it is never required to open the clinic.
4. No recruitable physiotherapists, nurses, employed doctors, rehabilitation assistants, cleaners, staff roster, payroll, energy, morale, breaks or staff rooms.
5. A fresh clinic begins on the 14 m × 28 m landscaped property with one 4 m × 4 m treatment room, one treatment table and one storage unit.
6. Grass remains on unbuilt outdoor land; room flooring appears only inside built rooms.
7. The player builds reception, assessment and exercise rooms as progression requires.
8. Licensed GLB physiotherapy and reception assets load independently with fallbacks.
9. Patients arrive after clinic opening; without a receptionist the player registers them manually, while the purchased receptionist handles registration automatically. Patients then wait, move to assessment, complete a player-led session and leave.
10. Patient patience, reputation, session income and XP update consistently.
11. The receptionist upgrade costs one-time coins, unlocks after three completed sessions and persists after reload.
12. Pause and 1×/2×/3× controls advance simulation time deterministically.
13. Variable-size room drawing, cost, bounds, collision and rendered walls use the same dimensions.
14. Save/reload preserves rooms, patient queue, currency, receptionist unlock, clinic time and progression.

## Management-game acceptance
1. App opens in usable portrait layout and the property, constructed rooms and active characters remain visible at the initial camera zoom.
2. Camera angle shows the front and side walls clearly; the long axis of the plot reads vertically on a phone.
3. Scene shows the landscaped buildable property and a guided first-clinic construction objective.
4. Loading has recoverable asset errors and never spins indefinitely.
5. Pan and pinch zoom are stable, bounded and damped rather than snapping.
6. Long frame stalls do not teleport the avatar.
7. Tapping an open floor point moves the avatar to the actual selected point, not a nearby arbitrary waypoint.
8. Tapping a blocked point selects the nearest reachable approach point on the same connected side of obstacles.
9. A blocked target on the far side of a wall must never cause the avatar to stop at an arbitrary point on the near side.
10. The avatar can walk from the outdoor property path through the single starter-room entrance and approach the patient safely.
11. The avatar can approach the patient beside the treatment table without intersecting the table or wall.
12. The avatar routes around the treatment table, storage unit, trees, shrubs, player-built rooms and property boundary.
13. Avatar does not pass through walls, closed boundaries, built-in furniture or placed furniture.
14. Grid aligns with the floor.
15. Valid equipment placement updates occupancy and can occur inside rooms.
16. Overlapping/out-of-bounds/path-blocking placement is rejected clearly.
17. Rotation updates footprint correctly.
18. Layout and coin balance survive reload.
19. Invalid, duplicated, out-of-bounds or unsupported save records are ignored safely; unrecoverable saves fall back to a clean starter clinic.
20. Repeated scene entry/exit does not cause unbounded memory growth.
21. No secrets or real student/patient data exist in repository.

## Camera, touch and performance acceptance

1. One-finger drag pans the world without accidentally issuing a movement command.
2. Two-finger pinch zooms smoothly within safe minimum and maximum limits.
3. On-screen +/− controls provide one-handed zoom; the recenter control restores the portrait overview.
4. Desktop mouse wheel zooms without scrolling the page.
5. Camera pan bounds keep the clinic property reachable while allowing the surrounding garden to be inspected.
6. On entry-level Android, render scale is capped below native device pixel ratio; capable devices may use a higher cap.
7. Camera controls remain reachable above the bottom dock and do not block the patient/build interaction area.

## Store and outdoor presentation checks

1. Selecting a store item loads its exact registered GLB model into the 3D preview stand; no CSS illustration is presented as the real product.
2. The placement action stays disabled until the GLB preview has loaded successfully.
3. Switching products cancels stale preview results; closing the store destroys the preview entity and restores the management camera.
4. The selected preview model is the same GLB/node specification used when the item is placed in the clinic.
5. The store remains usable in portrait mode while the real model is visible in the upper scene area.
6. Trees, shrubs, benches, flower beds and garden lamps remain outside the buildable plot; grass tufts do not intersect these props.

## Performance conditions
Test at least one real entry-level Android phone and one stronger device. Record exact models and browser versions. Test cold and warm cache, constrained network where possible, and a sustained three-minute interaction loop.

Record:
- cold/warm time to first usable frame;
- frame-time distribution (not FPS average alone);
- draw calls and visible mesh instances;
- JS heap and GPU/texture memory estimates where available;
- first-scene and total asset transfer size;
- touch-to-response latency;
- camera stability and resize events;
- crashes, reloads and thermal symptoms.

Target 30 FPS baseline on the agreed low-end device and 60 FPS on capable devices, subject to actual device measurements. Do not claim targets are met until recorded.

## Regression
Changes to camera, assets, movement, building, save schema or room geometry rerun relevant acceptance tests. Add dated physical-device results under `docs/test-results/` when testing begins.

## Clinical safety (later)
Before release, each case must have reputable references, qualified physiotherapy educator review, specialist review where warranted, verified red-flag/referral logic, plausible alternative reasoning paths, versioned rubrics and an explicit review date.
