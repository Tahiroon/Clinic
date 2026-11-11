# Engine Spike — First Implementation Notes

**Status:** Prototype code committed; validation pending  
**Branch:** clinic-dev

## Scope implemented
Two separate routes are provided:
- /playcanvas.html
- /babylon.html

Each route contains a primitive clinic scene with a floor, two perimeter walls, reception desk, treatment bed, avatar, orthographic/isometric-style camera, tap-to-move behavior, build-mode block placement, simple occupied-area rejection, reset control, and an on-screen FPS estimate.

## Deliberate parity
Both prototypes use the same approximate room dimensions, object footprints, avatar start point, movement speed, grid spacing, build-mode interaction, and visual palette. They use primitive meshes and no downloaded assets so initial asset-transfer size is not distorted by art assets.

## Important limitations
- These are first-pass engineering spikes, not production architecture.
- Placement validation currently checks a small set of hard-coded occupied zones. It is not yet a general grid occupancy system.
- The avatar is a primitive placeholder; pathfinding is not implemented.
- FPS shown is a simple application-side frame counter, not a complete performance profile.
- No real-device measurements have been collected.
- No build or browser test result is claimed until CI or local execution reports it.

## Next validation
1. Run the automated TypeScript check and production build.
2. Fix compile/runtime issues without changing parity between prototypes.
3. Test both routes on the same physical Android device, same browser, same screen size, same scene and test route.
4. Record cold/warm startup, FPS/frame time, memory, touch response, and device thermal behavior.
5. Only then score the engine comparison.

## Reproduction
Install dependencies with npm install, then run npm run dev. Use the root page to open either prototype. Run npm run build for type-checking and production bundling.
