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
5. Fresh accounts receive the same compact starter clinic: reception, one treatment room, clear internal passage, small green outdoor area and visible expansion space.
6. Equipment can be placed inside room footprints without treating the room floor itself as an obstacle.
7. Shared room doors are traversable; walls and furniture block movement appropriately.
8. Starter clinic is visually coherent and not an oversized empty shell.

## First-slice acceptance
1. App opens in usable portrait layout.
2. Scene shows the standardized starter property without requiring a build step.
3. Loading has recoverable asset errors and never spins indefinitely.
4. Camera frames the starter clinic and a useful portion of its property on narrow phones.
5. Pan and pinch zoom are stable and bounded.
6. Tapping walkable floor moves the avatar toward the target.
7. Avatar does not pass through walls, closed boundaries or furniture.
8. Avatar can pass through intended room doorways and the internal reception/treatment connection.
9. Grid aligns with the floor.
10. Valid equipment placement updates occupancy and can occur inside rooms.
11. Overlapping/out-of-bounds/path-blocking placement is rejected clearly.
12. Rotation updates footprint correctly.
13. Layout and coin balance survive reload.
14. Invalid/unsupported saves fail safely and fall back to a clean starter state.
15. Low graphics mode reduces costly effects and remains usable.
16. Repeated scene entry/exit does not cause unbounded memory growth.
17. No secrets or real student/patient data exist in repository.

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
