# Production Asset Gate

This gate prevents a showcase asset from being treated as production-ready merely because Three.js can load it.

## CI contract

`pnpm validate:assets` reads `scripts/showcase-asset-contracts.json` and validates every configured asset.

The validator supports both `.gltf` and binary `.glb` files. It checks:

- glTF 2.0/default-scene structure,
- embedded, external and GLB BIN buffers,
- bufferView/accessor ranges,
- semantic node names required by the vertical,
- semantic material names,
- required animation clip names,
- animation sampler/channel references and accessor shape,
- optional file-size budgets,
- deterministic unlit-material requirements for reference fixtures.

The command prints file bytes, decoded buffer bytes and node/material/animation counts so CI logs contain a basic asset footprint.

## Adding a production asset

1. Keep the source/DCC file outside the optimized delivery file and preserve ownership/license evidence.
2. Export the candidate GLB without overwriting the source.
3. Add an entry to `scripts/showcase-asset-contracts.json`.
4. Set the semantic nodes/materials/animations that the manifest expects.
5. Set an explicit `maxFileBytes` only after the delivery budget is agreed.
6. Run the validator locally and in CI.
7. Bind the accepted asset through the generic showcase manifest.
8. Repeat for LOD0, LOD1 and LOD2.

Example contract:

```json
{
  "id": "vehicle-production-lod1",
  "path": "apps/web/public/models/vehicle-lod1.glb",
  "profile": "production",
  "requiredNodes": [
    "MESH_body",
    "ANCHOR_front_light",
    "ANCHOR_interior"
  ],
  "requiredMaterials": ["MAT_body_paint"],
  "requiredAnimations": ["ANIM_door_front_left_open"],
  "maxFileBytes": 6291456
}
```

The byte value above is only an example. Production budgets must be measured and committed from the actual asset/device matrix.

## Ad-hoc inspection

A candidate that is not yet in the contract file can still be structurally inspected:

```bash
pnpm validate:assets -- apps/web/public/models/candidate.glb
```

Configured reference assets are validated first, followed by the candidate.

## Animation proof fixture

Both current Astra reference assets contain a small semantic clip named `ANIM_signature_pulse`. This keeps an authored animation available for exercising the already-implemented `animation-state` runtime path without pretending the fixture is a production vehicle asset.

A production vertical still needs a real authored clip bound through its manifest before the production animation acceptance item is complete.

## What this gate does not prove

Passing this script does **not** prove:

- visual quality,
- correct scale/origin by human inspection,
- correct PBR appearance,
- KTX2/Basis behavior on target browsers,
- Meshopt decode cost,
- LOD transition quality,
- mobile/iOS memory behavior,
- sustained frame time,
- accessibility of the complete host experience.

Those remain measured browser/device QA gates. The validator is deliberately strict about structural evidence and deliberately does not manufacture device evidence.
