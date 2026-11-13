# THERASON CLINIC

A portrait-first mobile clinic-management and physiotherapy simulation game.

## Product direction

Build and expand a rehabilitation clinic, manage its small economy and patient flow, and personally act as the physiotherapist during evidence-informed clinical encounters. The broad inspiration is the readable isometric management experience of Two Point Hospital, with an original THERASON identity and no copied assets, characters, interface or layouts.

## Management gameplay

The player owns and manages a physiotherapy clinic. Recruit physiotherapists, rehabilitation assistants, receptionists and cleaners; build and furnish functional rooms; manage patient arrivals, waiting queues, assessment, treatment, staff energy, morale, payroll, reputation and clinic growth. The player can personally take over clinical cases.

## Starter clinic

The campaign begins with a generous 14 m × 28 m landscaped property, starter capital and a build-your-own-clinic objective. The player constructs reception, assessment, treatment and exercise spaces, hires a small team and opens the clinic. All unbuilt land remains outdoor grass; floors and walls appear only inside constructed rooms.

## Technical direction

- Single 3D runtime: PlayCanvas.
- Portrait-first, isometric-style orthographic camera.
- Lightweight UI, optimized GLB assets, progressive loading and local-first saves.
- Designed for low-end Android and unreliable connectivity.
- Clinical cases are versioned data, separate from the 3D runtime, and require qualified review.

## Working agreement

- All development takes place on `clinic-dev`.
- `main` remains untouched unless the owner explicitly approves a merge.
- Keep the clinic independently deployable; do not connect production THERASON or Supabase until the security and integration design is approved.
- Measure performance on real Android devices; do not claim performance targets are achieved before testing.

## Documentation

- `docs/PRODUCT_VISION_2.0.md` — master product direction.
- `docs/GAME_DESIGN.md` — approved gameplay direction.
- `docs/ARCHITECTURE.md` — runtime and technical architecture.
- `docs/ENGINE_EVALUATION.md` — engine decision and upgrade policy.
- `docs/TEST_PLAN.md` — validation and device-test requirements.
