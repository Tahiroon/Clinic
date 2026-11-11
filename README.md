# THERASON CLINIC

A standalone, mobile-first 3D clinical learning simulator for physiotherapy students.

## Project status

Early development. The first milestone is an evidence-based engine evaluation and a small mobile vertical slice.

## Working agreement

- All development work takes place on `clinic-dev`.
- `main` is the protected baseline; no development changes are made there after this bootstrap commit.
- No integration with the production THERASON platform or Supabase until the architecture, security boundaries, and integration plan are reviewed and approved.
- Engine selection (PlayCanvas vs Babylon.js) will be based on comparable prototypes and measured results, including tests on a real low-end Android device.

## Product direction

The simulator combines clinic ownership and progression with realistic, guided physiotherapy clinical experiences. Its educational core emphasizes assessment, clinical reasoning, justified decision-making, treatment planning, patient response, and reassessment.

## Initial experience

- Portrait-first, isometric, stylized 3D.
- An open-roof clinic with a reception area and one treatment room.
- A customizable avatar with tap-to-move navigation.
- Grid-based placement with collision and space validation.
- Lightweight assets, scalable quality settings, and offline-friendly design.

See the project documentation on `clinic-dev` for the game design, architecture, engine evaluation, and test plan.
