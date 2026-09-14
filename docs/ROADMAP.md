# Roadmap

## Guiding rule

The showcase engine is the product. Automotive is the proving vertical. Commerce comes later and remains optional.

The roadmap therefore prioritizes renderer quality, generic interaction contracts, asset delivery and device performance before cart/order/payment features.

## Phase 0 — Foundation

Status: in progress on `foundation/automotive-commerce`.

Deliverables:

- monorepo boundaries,
- `@showcase/core` product-agnostic contracts,
- `@showcase/three` renderer boundary,
- Next.js host application,
- Go + Gin API shell,
- device capability policy,
- design research,
- typography/motion direction,
- CI.

Exit criteria:

- frontend typecheck/build passes,
- backend tests pass,
- core contains no automotive/commerce concepts,
- design direction and interaction constraints are documented.

## Phase 1 — Showcase Engine V1

Priority: highest.

### 1. Real GLB pipeline

- import first production-quality vehicle asset,
- normalize node/material naming,
- produce at least low/medium/high delivery tiers,
- fallback poster,
- initial KTX2/Meshopt pipeline.

### 2. Generic scene registry

- resolve manifest assets by stable IDs,
- find semantic nodes/materials,
- expose anchors,
- isolate asset-specific traversal from UI code.

### 3. Binding engine

Implement generic runtime bindings:

- material color,
- node visibility,
- asset replacement,
- animation state.

Then extend cautiously with:

- material parameters,
- texture replacement,
- transforms if a real vertical requires them.

### 4. Hotspot system

- 3D anchors,
- DOM annotation overlays,
- occlusion-aware behavior where practical,
- active hotspot state,
- mobile-safe interaction.

### 5. Camera director

- named presets,
- interruptible transitions,
- orbit handoff,
- desktop/mobile framing,
- reduced-motion fallback.

### 6. Motion system

Implement the approved vocabulary:

- light-cut reveal,
- camera flight,
- material morph,
- spatial swap,
- depth typography,
- ambient drift by capability tier.

### 7. Performance controller

- capability-based quality policy,
- DPR limits,
- optional adaptive degradation,
- effect priorities,
- loading telemetry,
- real-device profiling.

Exit criteria for V1 are defined in `EXPERIENCE_SPEC.md`.

## Phase 2 — Automotive Vertical V1

The first production vertical proves the engine without contaminating it.

Deliverables:

- automotive manifest adapter,
- exterior colors,
- at least one wheel/trim replacement,
- exterior hotspots,
- interior camera/detail scene,
- product specification panel,
- shareable configuration state,
- responsive mobile configurator.

Possible later additions:

- door/hood animations,
- exploded technical mode,
- multiple vehicle models,
- compare experience,
- day/night environments.

## Phase 3 — Content / Admin Pipeline

The showcase must eventually be manageable without editing source files for every product.

Deliverables:

- manifest validation,
- product/asset metadata API,
- preview and publish lifecycle,
- asset version references,
- environment/theme controls,
- hotspot/camera metadata editor or import format,
- configuration option management.

An admin UI is optional until repeated content operations justify it.

## Phase 4 — Optional Commerce

Only begin this phase after the showcase loop is compelling and reusable.

Potential modules:

- inquiry / quote request,
- booking / test drive,
- reservation deposit,
- cart,
- checkout,
- inventory/dealer integration,
- order tracking.

Rule:

```text
commerce → consumes showcase selection snapshot
showcase → never depends on commerce
```

If the commerce domain becomes enterprise-scale, it may be extracted into separate services without changing the showcase packages.

## Phase 5 — Second Vertical Proof

This phase proves that the architecture is genuinely reusable.

Choose a product with interaction needs different from automotive, for example:

- premium chair / furniture,
- sneaker,
- laptop / electronics,
- industrial machine.

Success condition:

- `showcase-core` needs no domain-specific rewrite,
- renderer remains unchanged or only gains generic capability,
- most work occurs in assets, manifest and vertical adapter.

## Phase 6 — Showcase SDK / Platform

Longer-term direction if the engine proves valuable:

- reusable package/API contract,
- configurable themes,
- vertical adapters,
- embeddable showcase runtime,
- CMS/asset integrations,
- analytics hooks,
- documented plugin extension points.

## Milestone order

Do not reorder these because ecommerce feels easier to demonstrate.

```text
Foundation
   ↓
Real 3D asset
   ↓
Binding + hotspot + camera engine
   ↓
Performance + mobile
   ↓
Automotive vertical
   ↓
Content pipeline
   ↓
Commerce
   ↓
Second vertical
   ↓
SDK/platform
```

## Definition of done philosophy

A feature is not done because it works on one powerful desktop.

For showcase features, definition of done includes:

- touch behavior,
- responsive composition,
- reduced-motion behavior,
- low capability fallback,
- asset loading failure behavior,
- no domain leakage into the core,
- measurable performance impact.
