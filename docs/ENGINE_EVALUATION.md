# THERASON CLINIC — Engine Decision Record

**Decision:** PlayCanvas is the single selected runtime.  
**Decision date:** 2026-11-11; product scope reaffirmed 2026-11-13.  
**Working branch:** clinic-dev.

## Context

The project needs a portrait-first, isometric-style clinic-management and physiotherapy simulation for entry-level Android devices and unreliable connectivity. The target is a stylized 3D world with a small standardized starter clinic, outdoor property, progressive expansion, one player physiotherapist avatar, an optional receptionist later, patients as visitors, grid-based furnishing and close clinical-session camera transitions.

## Decision

Continue with PlayCanvas as the one runtime. Babylon.js remains a historical comparison prototype and must not be included in the shipped game. This is a project-fit decision, not a claim that PlayCanvas is universally superior.

## Current dependency and upgrade policy

The repository currently uses PlayCanvas 2.23.3. As of 2026-11-13, PlayCanvas 2.24.0 has been released (2026-11-09). It introduces a modular CameraFrameEffect pipeline and additional rendering effects, along with engine improvements. The project should not upgrade simply to gain visual effects: post-processing such as bloom, SSAO, depth of field, lens flare and temporal effects can increase GPU cost and are not first-release requirements.

Evaluate 2.24.0 in a controlled branch after the first scene cleanup. Upgrade only if:
- existing APIs and GLB assets pass smoke tests;
- build output and startup do not regress;
- sustained low-end Android frame time and memory are equal or better;
- no new rendering feature is enabled by default without a measured benefit.

WebGPU is an optional future backend, not a requirement. WebGL 2 remains the compatibility baseline. Feature detection and fallback must be tested before WebGPU is enabled.

## Why PlayCanvas fits

- Web-first engine with WebGL 2 and WebGPU backends.
- glTF/GLB loading and animation support.
- Texture and geometry compression options.
- TypeScript support and existing project foundation.
- Can render the isometric environment while DOM/CSS handles lightweight mobile menus and HUD.

## Non-negotiable constraints

- Arabic-first, portrait-first interface; no forced landscape.
- One runtime only; no dual-engine shipping.
- Stylized, believable proportions; avoid photorealistic asset cost.
- Small active scene and progressive asset loading.
- Low-end Android is a first-class target.
- Local versioned saves first; remote identity/sync only after security review.
- Keep the simulator independently deployable.
- All development stays on clinic-dev; do not merge to main without owner approval.

## Optimization strategy

Use measured GLB compression (Draco or Meshopt according to runtime support), KTX2/Basis texture compression where pipeline support is verified, LOD for assets with meaningful screen-size changes, instancing for repeated props, shared materials/meshes, baked static lighting, limited dynamic shadows and effects, adaptive render resolution, and no per-frame allocation churn.

Do not add dependencies or fashionable rendering features without benchmark evidence. The visual target is attractive stylized realism, not expensive post-processing.

## Revisit criteria

Reconsider the engine only if repeatable real-device evidence shows PlayCanvas cannot meet startup, stability, memory, interaction or maintainability targets and another option materially improves those results.
