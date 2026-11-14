# THERASON CLINIC — Reference-Led Starter Map & Visual Baseline

**Status:** Owner-confirmed direction — implementation baseline  
**Date:** 2026-11-14  
**Branch:** `clinic-dev` only  
**Reference:** User-provided portrait THERASON clinic gameplay screenshot in the project conversation.

## 1. Non-negotiable product direction

The first playable map must be designed around the user's supplied screenshot. The goal is a close match to its overall gameplay presentation and visual grammar: portrait isometric 3D, open-roof cutaway rooms, readable white/teal architecture, tiled floors, visible doors and windows, furnished clinical spaces, small animated people, a landscaped outdoor edge, a compact top HUD, and a fixed bottom action dock.

This is a real interactive 3D game scene, not a screenshot used as a background, a static mock-up, or a generic architectural visualization. Build original THERASON assets and interface elements; do not copy Two Point Hospital's proprietary models, characters, branding, exact UI artwork, or exact protected layouts.

## 2. Starter map and room ownership

- Every new learner sees one complete, coherent clinic map from the first launch.
- Exactly one **general starter room** is unlocked and usable at the beginning.
- Other room spaces are already visible in the map from the beginning, but are closed/locked and cannot be entered, furnished, or used.
- Locked spaces must read visually as part of the same clinic architecture, not as blank holes or arbitrary empty grass.
- The player unlocks/purchases a room with in-game coins.
- A newly unlocked room is a neutral, uncommitted room slot. The learner chooses its specialization and purpose later; the game must not force a permanent room type before the learner makes that choice.
- The room's name, specialization options, equipment requirements, and clinical details are intentionally deferred. Do not hard-code the current reception/assessment/gym labels as the fixed identity of future map rooms.
- Room geometry and room ownership state must be separate from room specialization. A room slot can be unlocked first and configured afterward.

## 3. First-screen composition

The first playable portrait screen should preserve the reference's composition principles:
- top: compact game HUD with pause/settings and readable resources/status;
- central area: the clinic occupies most of the visible screen, with the open general room as the first active space and other closed room spaces clearly visible;
- surrounding edge: a small but legible outdoor environment (path, lawn, trees/planting) that establishes a place beyond the clinic;
- bottom: fixed, thumb-reachable primary actions for Store, Build, Furniture, Equipment, and Objectives/Tasks;
- controls and panels must not cover the essential clinic view.

The camera is orthographic/isometric-style, portrait-first, and framed for the actual phone viewport. Pan and zoom remain smooth and bounded.

## 4. Visual quality target

Match the reference as closely as practical in:
- overall isometric angle and room readability;
- room proportions and composition density;
- open-roof/cutaway wall treatment;
- white/light neutral walls with teal lower trim and glazed openings;
- pale tiled interior floors and a distinct outdoor surface;
- believable clinical furniture/equipment silhouettes;
- small human characters with readable scale and natural placement;
- soft daylight, contact shadows, coherent materials, and a polished mobile-game HUD.

Do not regress to a sparse greybox as the delivered visual result. A greybox may be used privately as a construction step, but the first reviewable visual milestone must already communicate the target composition and material direction.

## 5. Interaction baseline

- The general starter room is accessible and is the initial active play space.
- Locked room slots are visible and communicate their locked state; tapping one may show its coin unlock cost, but must not open or configure it.
- Unlocking a room changes its ownership state without rebuilding the whole map.
- After unlocking, the learner chooses the room's purpose/specialization; detailed options can be added in a later milestone.
- The bottom dock opens real functional panels. Store/build actions must not be decorative buttons.
- Furniture and equipment are modular placed objects, not baked permanently into one room mesh.
- Save/load preserves unlocked room slots, chosen room purpose when later implemented, placed objects, and currency.

## 6. Performance and delivery constraints

- Keep PlayCanvas as the selected runtime unless measured device evidence justifies a change.
- Portrait-first Android; low-end device and intermittent connectivity are primary constraints.
- Reuse modular meshes/materials, load assets progressively, keep the initial scene payload small, and preserve local-first play.
- Test on an actual Android phone; never claim a performance target has passed without a recorded test.

## 7. Acceptance criteria for the first visual milestone

The milestone is accepted only when:
1. It opens in portrait and the map composition reads like the supplied reference.
2. One general room is open and usable.
3. Multiple additional room spaces are visibly present and locked from the start.
4. The player can distinguish the outdoor area from the clinic interior.
5. The top HUD and bottom dock are visible without overwhelming the map.
6. The scene uses coherent, polished assets/materials rather than unrelated primitive placeholders.
7. The first screen is a live PlayCanvas scene with working touch/camera interaction, not a static image.

## 8. Superseding older starter-map notes

This owner-confirmed baseline supersedes earlier notes that proposed an empty plot where the player constructs reception, assessment, treatment, and exercise rooms as fixed named room types from the start. The new baseline is one open general room plus visible locked neutral room slots; the learner decides each unlocked room's specialization later.

