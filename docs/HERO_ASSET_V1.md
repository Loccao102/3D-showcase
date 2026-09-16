# Astra One — Self-authored Hero Asset V1

## Purpose

Astra One Hero V1 replaces the tiny cube-based reference fixture in the live automotive proof with a reproducible, self-authored GLB family. It exists to exercise the real showcase runtime with PBR materials, semantic nodes, responsive LOD selection, trim replacement and animation without introducing third-party asset licensing ambiguity.

This is a production-pipeline hero asset, not a claim of final photoreal automotive art quality.

## Ownership and reproducibility

- ownership: self-authored for this repository
- generator: `scripts/generate-astra-concept.mjs`
- canonical delivery format: binary glTF 2.0 (`.glb`)
- generated destination: `apps/web/public/models/`
- no external model, texture or HDR asset is embedded in these files
- generation uses Node built-ins only

`pnpm generate:assets` regenerates all six files deterministically. `pnpm validate:assets` regenerates them before validation, and the web app regenerates them before `dev` and `build`.

## Asset family

| Variant | LOD | File | File bytes | Nodes | Triangles | Intended tier |
| --- | ---: | --- | ---: | ---: | ---: | --- |
| Touring | 0 | `astra-one-touring-lod0.glb` | 20,076 | 35 | 232 | large desktop / hero inspection |
| Touring | 1 | `astra-one-touring-lod1.glb` | 16,912 | 30 | 168 | tablet / normal desktop |
| Touring | 2 | `astra-one-touring-lod2.glb` | 15,104 | 25 | 136 | mobile / constrained viewport |
| Sport | 0 | `astra-one-sport-lod0.glb` | 20,340 | 38 | 232 | large desktop / hero inspection |
| Sport | 1 | `astra-one-sport-lod1.glb` | 17,084 | 32 | 168 | tablet / normal desktop |
| Sport | 2 | `astra-one-sport-lod2.glb` | 15,276 | 27 | 136 | mobile / constrained viewport |

The current manifest resolves LOD2 at `<= 720px`, LOD1 at `<= 1200px`, and otherwise uses LOD0.

The triangle counts above count unique mesh primitives in the GLB definition. Several semantic nodes instance shared meshes, so rendered instance triangle work is higher than the unique geometry count. Device profiling remains the authority for runtime cost.

## Geometry and material contract

The concept is approximately 4.6m long and uses Y-up coordinates. Semantic content includes:

- `body`, `cabin`, `hood`, `rear-deck`,
- four named wheel nodes plus rim nodes,
- `front-light` and `rear-light`,
- Touring/Sport full-asset replacement,
- Sport-specific aero/spoiler nodes,
- explicit front-light, cabin, rear and front-wheel anchors.

PBR material identities include:

- `body`,
- `glass`,
- `tire`,
- `rim`,
- `trim`,
- `light`,
- `rear-light`.

The `body` material remains compatible with the generic `material-color` binding. Lighting nodes remain compatible with `node-visibility`.

## LOD differences

LOD is not filename-only duplication:

- LOD0 uses 20-segment wheel geometry and retains body character lines, roof accent and lower grille.
- LOD1 uses 12-segment wheels and removes the smallest hero-only body details while retaining mirrors, glass frames and splitter.
- LOD2 uses 8-segment wheels and removes those secondary details while preserving the semantic nodes, materials and anchors required by interaction.

Sport keeps its semantic aero/spoiler identity at every tier so trim replacement does not change host contracts.

## Animation

Every LOD includes `ANIM_signature_pulse`. The manifest exposes it through an `animation-state` option named **Signature pulse**. Static remains the default so the demand-rendered canvas can idle when the visitor does not request animation.

## What is still open

Hero V1 closes the structural/reproducibility gap, but it does not close these production gates:

- photoreal/final art-direction quality,
- authored UV texture maps and KTX2/Basis delivery,
- Meshopt encode/decode measurements on this hero family,
- representative Android/iOS/tablet GPU profiling,
- production HDR/environment budgets,
- final human visual QA and accessibility audit.

Those require measured browser/device evidence rather than structural validation alone.
