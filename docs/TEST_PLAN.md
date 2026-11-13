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
3. One optional receptionist may be hired later; no receptionist NPC is required for the first playable slice.
4. No nurses, employed doctors, cleaners, assistants or staff roster in the first release.
5. Every fresh account receives the same portrait-oriented starter property, approximately 6.5 m × 14 m, with one reception room at the front, one treatment room behind it, a direct internal doorway and an outdoor lawn/path around the building.
6. Trees, planters and shrubs remain outdoors, outside the building walls and away from the entrance and main walking route.
7. Starter reception includes a real licensed reception desk and a four-seat GLB waiting row, with procedural fallback seats if the asset fails.
8. Starter treatment room loads the individual licensed physiotherapy treatment-table and storage-cabinet GLB objects; it must not scale an entire hospital-room scene into a single prop.
9. Equipment can be placed inside room footprints without treating the room floor itself as an obstacle.
10. Room wall rendering and navigation collision must derive from the same wall/door dimensions.
11. The outside property hedge, trees and planters are collision obstacles; the avatar cannot pass through the plot boundary.
12. Babylon.js is not a shipped dependency or build entry; PlayCanvas is the only runtime in the game build.
13. Bottom toolbar remains hidden during the current world-foundation pass.

## First-slice acceptance
1. App opens in usable portrait layout and the building, yard and player remain visible at the initial camera zoom.
2. Camera angle shows the front and side walls clearly; the long axis of the plot reads vertically on a phone.
3. Scene shows the standardized starter property without requiring a build step.
4. Loading has recoverable asset errors and never spins indefinitely.
5. Pan and pinch zoom are stable, bounded and damped rather than snapping.
6. Long frame stalls do not teleport the avatar.
7. Tapping an open floor point moves the avatar to the actual selected point, not a nearby arbitrary waypoint.
8. Tapping a blocked point selects the nearest reachable approach point on the same connected side of obstacles.
9. A blocked target on the far side of a wall must never cause the avatar to stop at an arbitrary point on the near side.
10. The avatar can walk from the outside entrance through reception and the internal doorway into the treatment room.
11. The avatar can approach the patient beside the treatment table without intersecting the table or wall.
12. The avatar routes around the waiting-seat row, reception desk, table, cabinet, trees, planters and boundary hedge.
13. Avatar does not pass through walls, closed boundaries, built-in furniture or placed furniture.
14. Grid aligns with the floor.
15. Valid equipment placement updates occupancy and can occur inside rooms.
16. Overlapping/out-of-bounds/path-blocking placement is rejected clearly.
17. Rotation updates footprint correctly.
18. Layout and coin balance survive reload.
19. Invalid, duplicated, out-of-bounds or unsupported save records are ignored safely; unrecoverable saves fall back to a clean starter clinic.
20. Repeated scene entry/exit does not cause unbounded memory growth.
21. No secrets or real student/patient data exist in repository.

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
