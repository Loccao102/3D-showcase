# Roadmap

## Guiding rule

The showcase engine is the product. Automotive is the proving vertical. Commerce comes later and remains optional.

The roadmap therefore prioritizes renderer quality, generic interaction contracts, asset delivery and device performance before cart/order/payment features.

## Phase 0 — Foundation

Status: **complete**.

Delivered:

- monorepo boundaries,
- `@showcase/core` product-agnostic contracts,
- `@showcase/three` renderer boundary,
- Next.js host application,
- Go + Gin API shell,
- device capability policy,
- design research,
- typography/motion direction,
- CI.

Exit criteria met:

- frontend typecheck/build passes,
- backend tests pass,
- core contains no automotive/commerce concepts,
- design direction and interaction constraints are documented.

## Phase 1 — Showcase Engine V1

Status: **core complete**.

The generic engine interaction loop is implemented. Production-quality asset optimization and physical-device profiling continue as hardening work rather than blockers for the engine architecture.

### 1. Asset runtime

Delivered:

- manifest-driven glTF/primitive loading by stable asset ID,
- responsive LOD URL resolution,
- generic asset slots,
- loading/ready/error states,
- fallback poster behavior,
- self-owned reference glTF fixtures,
- CI validation for embedded buffers and required semantic nodes/anchors.

Production hardening still required:

- production-quality licensed/self-created vehicle asset,
- real LOD0/LOD1/LOD2 geometry,
- KTX2/Basis validation,
- Meshopt benchmarking,
- measured production asset budgets.

### 2. Generic scene registry

Delivered:

- resolve manifest assets by stable IDs,
- find semantic nodes/materials,
- expose anchors,
- isolate asset-specific traversal from UI code,
- clone mutable runtime materials so loader cache is not mutated.

### 3. Binding engine

Delivered generic runtime paths:

- material color,
- node visibility,
- asset replacement,
- animation state.

The engine restores mutable defaults safely and reports missing scene mutation targets without crashing the experience.

Extend only when a real vertical requires it, for example:

- material parameters,
- texture replacement,
- transforms.

### 4. Hotspot system

Delivered:

- 3D semantic anchors,
- DOM annotation overlays,
- basic occlusion behavior,
- active hotspot state,
- mobile-safe interaction,
- guided detail handoff without product-specific renderer logic.

### 5. Camera director

Delivered:

- named presets,
- target/position/FOV tweening,
- interruptible transitions,
- orbit handoff,
- desktop/mobile framing,
- reduced-motion fallback,
- explicit return-to-explore flow.

### 6. Motion system

Core motion requirement delivered:

- interruptible camera flight,
- reduced-motion equivalent,
- direct input always outranks cinematic motion.

Visual polish remains iterative:

- light-cut reveal,
- perceptual material morph,
- richer spatial swap,
- depth typography,
- optional ambient drift by capability tier.

### 7. Performance controller

Delivered:

- capability-based quality policy,
- DPR limits,
- `frameloop="demand"` idle strategy,
- effect priority rules,
- fallback/error behavior,
- responsive/mobile composition.

Hardening still required on production assets:

- loading telemetry,
- sustained frame-time measurements,
- representative Android/iOS/tablet profiling,
- optional adaptive degradation if measurements justify it.

The V1 acceptance loop in `EXPERIENCE_SPEC.md` is now represented by the automotive reference experience: fallback/progressive loading, free orbit/zoom, three guided hotspots, interruptible camera presets, generic bindings, asset swap, capability quality policy, reduced motion and selection snapshot output.

## Phase 2 — Automotive Vertical V1

Status: **reference proof implemented; production vertical next**.

The current fixture proves the generic engine without contaminating it. Production vertical work now focuses on content fidelity rather than renderer architecture.

Delivered reference proof:

- exterior colors,
- whole-asset trim replacement,
- three exterior/detail hotspots,
- cabin/detail camera preset,
- responsive mobile configurator,
- shareable/serializable generic configuration snapshot.

Production deliverables:

- production automotive manifest adapter/content set,
- production vehicle asset and real wheel/trim variants,
- interior-quality scene/content,
- product specification panel sourced from real product metadata,
- configuration URL/share persistence if required.

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
commerce → consumes ShowcaseSelectionSnapshot
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
Foundation                        ✓
   ↓
Showcase Engine V1 core           ✓
   ↓
Production asset/device hardening ← current
   ↓
Automotive Vertical V1
   ↓
Content pipeline
   ↓
Optional commerce
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
- measurable performance impact for production content.
