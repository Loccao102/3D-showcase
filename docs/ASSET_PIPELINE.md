# 3D Asset Pipeline

## Goal

Assets must be portable, inspectable and performant across mobile, tablet and desktop. The engine should not require per-product code edits just because a GLB uses different names or material structure.

The canonical delivery format is **glTF/GLB** with explicit optimization and node naming conventions.

## Source lifecycle

```text
DCC source / provider asset
        ↓
inspection
        ↓
clean + rename + normalize
        ↓
LOD generation
        ↓
texture optimization
        ↓
mesh compression
        ↓
GLB validation
        ↓
showcase manifest binding
        ↓
visual QA on device tiers
```

Never overwrite original source files during normalization.

## Coordinate and scene conventions

- Y-up.
- Product pivot should be stable and meaningful.
- Scene origin should represent the center of the showcased object when practical.
- Keep scale physically plausible and consistent across variants.
- Remove hidden authoring cameras/lights unless intentionally consumed by the runtime.
- Avoid arbitrary nested transforms introduced only by export tooling.

## Naming contract

Use stable semantic names, not Blender defaults such as `Cube.014`.

Suggested prefixes:

```text
ROOT_<product>
MESH_<semantic-name>
MAT_<semantic-name>
ANCHOR_<semantic-name>
HOTSPOT_<semantic-name>
VARIANT_<semantic-name>
```

Automotive example:

```text
ROOT_vehicle
MESH_body
MESH_wheel_fl
MESH_wheel_fr
MESH_wheel_rl
MESH_wheel_rr
MESH_glass
MESH_interior
MAT_body_paint
MAT_glass
MAT_tire
ANCHOR_front_light
ANCHOR_wheel_front
ANCHOR_interior
```

The showcase core still remains product-agnostic; these names belong to the vertical asset contract.

## Material contract

Materials that can be modified by configuration should have stable semantic identities.

Prefer PBR metallic-roughness materials. Avoid baking appearance that should be runtime-configurable directly into base-color textures.

A configurable finish may map to:

```json
{
  "type": "material-color",
  "target": "MAT_body_paint",
  "value": "#141517"
}
```

Future bindings may include:

- base color,
- roughness,
- metalness,
- clearcoat,
- emissive intensity,
- texture replacement,
- node visibility,
- full asset replacement.

## Texture delivery

Production targets:

- KTX2/Basis where browser/device support allows,
- sensible resolution per device tier,
- avoid multiple large maps when a channel-packed map is appropriate,
- mipmaps required for normal production textures,
- color-space metadata must be correct.

Suggested initial texture ceilings:

### High tier

- hero product textures: up to 4K selectively,
- supporting textures usually 2K or lower.

### Medium tier

- typically 2K maximum,
- reduce environment resolution.

### Low tier

- typically 1K or lower,
- aggressive environment and effect reduction.

Actual budgets should be measured against representative devices rather than treated as fixed forever.

## Geometry and LOD

Each complex showcase product should eventually expose at least:

```text
LOD0 — premium desktop / close inspection
LOD1 — normal desktop / tablet
LOD2 — mobile / constrained hardware
```

LOD switching must avoid obvious silhouette collapse at normal viewing distance.

Prefer Meshopt for general glTF optimization. Draco may be evaluated where its decode/performance tradeoff is beneficial.

## Loading strategy

The shell should become interactive before the complete premium asset finishes loading.

Recommended sequence:

1. DOM shell + product metadata.
2. lightweight poster/fallback.
3. low/medium GLB.
4. environment.
5. optional high-detail assets.
6. secondary animations/effects.

Do not block the complete page on the highest-detail GLB.

## Animation clips

Animation names must be semantic.

Examples:

```text
ANIM_door_front_left_open
ANIM_hood_open
ANIM_explode
ANIM_idle_detail
```

Runtime state should reference animation identity through the manifest instead of importing product-specific animation constants into the renderer.

## Hotspot anchors

Prefer explicit anchor nodes inside the asset when hotspot position should track the geometry.

Example:

```text
ANCHOR_headlight
ANCHOR_brake_caliper
ANCHOR_dashboard
```

The vertical adapter translates those anchors into generic `Hotspot` contracts.

## Environment assets

HDRI/environment files are part of the product experience and need their own budgets.

Provide reduced versions for mobile tiers. The lighting design should not depend on a single massive HDRI file.

## Initial performance budgets

These are starting constraints, not guarantees:

### Mobile first-load target

- initial showcase payload should stay as small as reasonably possible,
- low/medium asset should be usable before premium detail arrives,
- avoid mandatory multi-megabyte post-processing resources.

### Runtime

- stable interaction during orbit/zoom,
- no avoidable React renders per frame,
- dynamic DPR and effects may downgrade during sustained load,
- background effects must never have a higher priority than product interaction.

## Validation checklist

Before an asset is considered showcase-ready:

- file parses as valid glTF/GLB,
- scale/origin/orientation are verified,
- node and material names follow the contract,
- unsupported/unnecessary authoring data is removed,
- texture dimensions and color spaces are checked,
- LOD strategy is documented,
- mobile tier has been tested,
- configuration targets are bound successfully,
- animations, if present, are named and tested,
- fallback poster/image exists,
- source and optimized output remain separately reproducible.

## Asset ownership boundary

`packages/showcase-core` describes assets and bindings.

`packages/showcase-three` loads and renders them.

Vertical packages define semantic node/material expectations.

The commerce layer never owns rendering assets.
