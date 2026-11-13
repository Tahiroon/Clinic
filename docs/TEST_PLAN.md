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
1. Only the player physiotherapist is an employed/active clinic character in the first release.
2. Patients appear as visitors/case characters.
3. Optional receptionist is deferred until the core world, movement and save loop are stable.
4. No nurses, employed doctors, cleaners, assistants or staff roster in the first release.
5. Fresh accounts receive the same compact starter clinic: reception, one treatment room, clear internal passage, landscaped 12×10 m starter property with expansion parcels deferred outside the initial boundary and visible expansion margin.
6. Starter treatment room loads licensed 3D treatment-table and storage-cabinet assets, with procedural fallbacks if the network is unavailable.
7. Equipment can be placed inside room footprints without treating the room floor itself as an obstacle.
8. Shared room doors are traversable; walls, built-in furniture and placed equipment block movement appropriately.
9. Starter clinic is visually coherent and not an oversized empty shell.
10. Clinical session activation smoothly frames the treatment area; closing the session restores the overview.
11. Session controls remain compact enough to leave a meaningful portion of the 3D world visible.
12. Bottom toolbar is absent during the world-foundation phase; the scene uses the full phone viewport.
13. Babylon.js is not a shipped dependency or build entry; PlayCanvas is the only runtime in the game build.

## First-slice acceptance
1. App opens in usable portrait layout.
2. Scene shows the standardized starter property without requiring a build step.
3. Loading has recoverable asset errors and never spins indefinitely.
4. Camera frames the starter clinic and a useful portion of its property on narrow phones.
5. Pan and pinch zoom are stable, bounded and damped rather than snapping.
6. Long frame stalls do not teleport the avatar.
7. Tapping walkable floor moves the avatar to the selected point or the nearest reachable point when the tapped location is occupied.
8. A blocked target on the far side of a wall must never cause the avatar to stop at an arbitrary point on the near side; route search must choose the closest reachable endpoint.
9. Avatar does not pass through walls, closed boundaries, built-in furniture or placed furniture.
10. Avatar can pass through intended room doorways and the internal reception/treatment connection.
11. Grid aligns with the floor.
12. Valid equipment placement updates occupancy and can occur inside rooms.
13. Overlapping/out-of-bounds/path-blocking placement is rejected clearly.
14. Rotation updates footprint correctly.
15. Layout and coin balance survive reload.
16. Invalid, duplicated, out-of-bounds or unsupported save records are ignored safely; unrecoverable saves fall back to a clean starter clinic.
17. Low graphics mode reduces costly effects and remains usable.
18. Repeated scene entry/exit does not cause unbounded memory growth.
19. No secrets or real student/patient data exist in repository.

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
