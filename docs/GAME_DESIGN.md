# THERASON CLINIC — Game Design Document

**Status:** Draft 0.1 | **Branch:** clinic-dev

## Product promise
A mobile-first 3D physiotherapy clinic simulator where learners inhabit the role of a developing physiotherapist: welcome patients, gather information, examine safely, form and test hypotheses, plan care, observe responses, reassess, and improve their clinic.

Three connected pillars:
1. Clinic life: create, furnish, organize, and progressively improve a personal clinic.
2. Clinical experience: coherent patient encounters with meaningful decisions and consequences.
3. Learning intelligence: feedback on reasoning quality, identification of knowledge gaps, and adaptive progression.

## Target experience
- Android phones, including entry-level devices; portrait-first with no forced landscape rotation.
- Unreliable or expensive connectivity is assumed.
- Detailed stylized 3D with readable silhouettes and restrained materials; not photorealistic.
- Isometric-style camera, touch-first interaction, large targets, short flows, minimal typing.
- Short, saveable steps; core local play should not require continuous connectivity.

## First playable clinic
A small reception zone, one treatment room, floor and perimeter walls with roof omitted, essential furniture placeholders, one initial avatar, tap-to-move on walkable floor, grid-based furniture placement, and a compact portrait HUD. Multiplayer, advanced economy, and the full clinical case system are out of scope for this slice.

## Core loops
**Clinic:** enter → inspect → build/rearrange → save → earn progression through learning → unlock options.

**Clinical (later):** patient arrives → establish priorities and safety → subjective assessment → select objective tests with rationale → interpret findings → formulate problems/hypotheses → goals → intervention → observe response → reassess → feedback.

**Progress:** complete meaningful tasks → receive transparent feedback and rewards → strengthen skills → unlock suitable cases and customization. Rewards must never encourage unsafe shortcuts.

## Clinical learning principles
- Assess reasoning process, not only final diagnosis.
- Ask learners to justify tests and interventions.
- Reward prioritization, safety screening, and appropriate uncertainty.
- Feedback explains why an action was useful, unnecessary, premature, or unsafe.
- Cases and rubrics require qualified physiotherapy educator review before release.
- The simulator does not replace supervised practice or professional judgment.

## Avatar and building
Avatar customization is gradual. Tap-to-move respects walls and furniture. Building uses a logical grid independent of mesh dimensions. Each object defines footprint, rotations, and constraints. Reject out-of-bounds, overlapping, or path-blocking placements. Preview validity before committing. Save an engine-independent layout.

## Social features
First social milestone: read-only visits to another learner's clinic. No chat, trading, shared editing, or real-time multiplayer initially. Privacy and abuse controls are prerequisites for public visits.

## Accessibility
Arabic-first readable UI with room for English terminology, strong contrast, scalable text, touch targets for small screens, non-color-only feedback, reduced-motion, and low-graphics settings.

## First-slice success
On a real low-end Android phone, a learner can load the scene, understand the room, move the avatar, place and rotate a small set of objects, receive clear validation, and retain the layout locally. Startup, frame time, memory, download size, and usability must be measured.
