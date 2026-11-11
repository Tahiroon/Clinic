# 3D Engine Evaluation — PlayCanvas vs Babylon.js

**Status:** Evaluation plan; no engine selected | **Branch:** clinic-dev

## Decision rule
Build equivalent prototypes and compare on the same devices, browsers, scene content, and test procedure. Do not select based on familiarity, marketing, or desktop demonstrations.

## Candidates
- PlayCanvas
- Babylon.js

Both remain candidates.

## Prototype parity
Each prototype must include the same portrait canvas, isometric-style camera, room geometry/materials/lighting, avatar placeholder, tap-to-move, grid highlighting, object placement, invalid-placement feedback, asset formats, and instrumentation.

## Weighted scorecard
| Criterion | Weight | Evidence |
|---|---:|---|
| Low-end phone performance | 25% | Sustained frame time/FPS, spikes, thermal behavior |
| Startup and asset size | 15% | Cold/warm startup, transferred and decoded sizes |
| Visual quality and lighting | 15% | Comparable screenshots and quality |
| Camera and movement | 10% | Touch accuracy, responsiveness, stability |
| Grid placement | 10% | Correctness, collision handling, complexity |
| Next.js integration | 10% | Build, routing, lifecycle, resize, cleanup |
| Maintenance/workflow | 10% | Documentation, tooling, debugging, clarity |
| Offline potential | 5% | Cacheability and offline behavior |

Score each category 1–5 only after evidence is collected; normalize weighted total to 100.

## Measurement protocol
Record device model, Android/browser versions, network/cache condition, startup duration, transferred asset bytes, average FPS and frame-time percentiles during a fixed three-minute route, memory before/after repeated scene entry/exit, touch response, placement latency, crashes, reloads, and thermal symptoms.

Repeat each test at least three times where practical; report median and range. Never claim physical-device results until a real device has been tested.

## Initial target
Aim for a stable experience near 30 FPS on a representative entry-level Android phone. This is a test target, not a guarantee. Responsiveness, thermal stability, and frame-time spikes matter too.

## Decision record
Final selection must include raw measurements, device/browser details, limitations, weighted score, rationale, risks, and mitigations.

## Research checklist
Verify current official documentation for mobile WebGL/WebGPU/browser compatibility, texture compression, touch input, lifecycle/memory cleanup, instancing, baked lighting, offline/PWA support, licensing, and deployment.
