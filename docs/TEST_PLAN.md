# THERASON CLINIC — Test Plan

**Status:** Initial plan | **Branch:** clinic-dev

## Test layers
- Unit: grid coordinates, footprints, rotations, placement, save-schema validation, progression.
- Integration: engine lifecycle, canvas resize, scene load/unload, UI-to-domain commands.
- Browser: portrait layout, touch, back/visibility behavior, reload recovery.
- Device: real Android phones at low and medium capability.
- Clinical review: educator validation of case facts, red flags, reasoning paths, and feedback.

## First-slice acceptance
1. App opens in usable portrait layout.
2. Scene reports loading progress and has recoverable asset errors.
3. Camera frames the clinic at supported portrait sizes.
4. Tapping walkable floor moves avatar toward target.
5. Avatar does not pass through walls or furniture.
6. Grid aligns with floor.
7. Valid placement updates occupancy.
8. Overlapping/out-of-bounds placement is rejected clearly.
9. Rotation updates footprint correctly.
10. Layout survives reload.
11. Corrupt/unsupported saves fail safely and can be reset.
12. Low graphics mode reduces costly effects and remains usable.
13. Repeated scene entry/exit does not cause unbounded memory growth.
14. No secrets or real student/patient data exist in repository.

## Performance conditions
Test at least one real entry-level Android device and one stronger device. Record exact models/software. Test cold and warm cache, normal/constrained network where possible, and a sustained three-minute interaction loop.

Capture startup time, frame-time distribution/FPS, memory, asset transfer size, touch response, thermal symptoms, crashes, and browser reloads.

## Regression
Changes to camera, assets, movement, building, or persistence rerun relevant acceptance tests. Add dated physical-device results under docs/test-results/ when testing begins.

## Clinical safety (later)
Before releasing a case, verify facts against reputable references, obtain qualified physiotherapy educator review, verify red-flag/referral logic, test plausible alternative reasoning, and ensure feedback is educational rather than a substitute for supervision.
