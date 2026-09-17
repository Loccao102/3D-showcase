# Visual Production V2 — Astra One

This pass upgrades the self-authored hero from structural PBR proof to a richer physically-based material and cabin presentation while keeping the asset deterministic and reproducible from source.

## What changed

- body paint now uses `KHR_materials_clearcoat` with a high clearcoat factor and low clearcoat roughness
- glazing uses alpha blending plus `KHR_materials_transmission`, `KHR_materials_ior` and `KHR_materials_volume`
- signature lamps keep `KHR_materials_emissive_strength` and use a stronger authored emissive response
- wheels use a more reflective clear-coated metal material
- LOD0/LOD1 gain brake calipers, dashboard, console, seats and steering-wheel geometry
- LOD0 gains emissive instrument and center display surfaces
- wheel segment counts increase to 24 / 16 / 10 for LOD0 / LOD1 / LOD2

## Delivery boundary

The generated GLBs still contain factor-driven materials rather than authored bitmap texture maps. This is intentional for this pass: it improves physical response and cabin readability without pretending that texture compression has been validated.

KTX2/Basis support remains available in the generic loader, but the backlog item for KTX2 browser validation stays open until the hero actually contains authored texture maps encoded as KTX2.

## CI contract

`validate-material-contracts.mjs` now asserts the material extensions that make this pass visually meaningful:

- body -> `KHR_materials_clearcoat`
- glass -> `KHR_materials_transmission`, `KHR_materials_ior`, `KHR_materials_volume`
- light -> `KHR_materials_emissive_strength`
- glass -> `alphaMode: BLEND`

LOD0/LOD1 contracts also require the new interior and brake material/node set. LOD2 intentionally remains cheaper and omits the cabin-detail geometry.

## Next visual step

The next asset-production milestone is UV + authored texture maps (paint microflake/roughness variation, tire normal/roughness, trim detail and cabin materials), followed by KTX2 encoding and representative-browser validation. That work should preserve the current semantic node/material names and LOD monotonicity gates.
