# 3D Showcase

A reusable, 3D-first product showcase platform.

The **showcase engine is the product**. Automotive is only the first vertical used to prove the platform. Commerce, lead generation, reservations, and checkout are optional modules layered on top of the showcase instead of being baked into it.

## First vertical: automotive

The first experience is a premium car showroom where visitors can inspect a vehicle, rotate and zoom it, discover hotspots, switch configurable variants, and later continue into quote / reservation flows.

The same core should be reusable for furniture, electronics, real-estate units, industrial equipment, fashion products, museum objects, or other products that benefit from interactive 3D presentation.

## Visual direction

The current direction is **Dark Precision Gallery + Adaptive Environment**:

- the 3D product is the dominant visual element,
- oversized editorial typography sits around the scene,
- UI stays lightweight, contextual and accessible DOM,
- environment/lighting can adapt per product or vertical,
- motion explains state and spatial context instead of acting as decoration,
- mobile uses its own composition rather than a compressed desktop sidebar.

Typography candidates:

- **Darker Grotesque** for large display/editorial text,
- **Be Vietnam Pro** for Vietnamese UI and body copy.

See `docs/VISUAL_DIRECTION.md` and `docs/MOTION_TYPOGRAPHY.md`.

## Architecture at a glance

```text
apps/web (Next.js)
  ├─ product pages / navigation / SEO
  ├─ responsive DOM interface
  └─ mounts showcase renderer
        │
        ├─ packages/showcase-core     # product-agnostic contracts + runtime state
        ├─ packages/showcase-three    # Three.js / React Three Fiber renderer
        └─ vertical adapters          # automotive first, others later

apps/api (Go + Gin)
  ├─ showcase manifests
  ├─ product/catalog metadata
  └─ optional commerce capabilities later
```

## Principles

- 3D showcase core is domain-neutral.
- Automotive-specific concepts never leak into the rendering core.
- Commerce is optional and replaceable.
- Progressive enhancement: a useful non-3D fallback must exist.
- Mobile, tablet, desktop, touch, mouse and keyboard are first-class targets.
- 3D assets have explicit budgets, LODs and compressed delivery paths.
- UI remains normal accessible DOM; the canvas is not the entire application.
- Direct interaction has higher priority than cinematic or ambient effects.
- A feature is not complete until its low-capability and reduced-motion behavior are defined.

## Showcase experience

The target interaction grammar is:

```text
Arrival
   ↓
Free Explore
   ↓
Guided Detail / Hotspot
   ↓
Configure
   ↓
Optional Technical / Exploded View
   ↓
Optional Commerce Handoff
```

The renderer should support interruptible camera transitions, generic material/asset bindings, hotspots, capability-aware quality tiers and responsive motion.

See `docs/EXPERIENCE_SPEC.md`.

## Technology

- Next.js + TypeScript
- React Three Fiber + Three.js + Drei
- Zustand for local experience state when needed
- Go + Gin for the API
- GLB/glTF, Meshopt/Draco and KTX2 as the intended production asset pipeline

## Asset philosophy

Production assets follow a reproducible pipeline:

```text
source asset
   ↓
inspect / normalize
   ↓
stable semantic node + material names
   ↓
LOD + texture optimization
   ↓
GLB validation
   ↓
manifest bindings
   ↓
real-device QA
```

See `docs/ASSET_PIPELINE.md`.

## Roadmap priority

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
SDK / platform
```

Commerce deliberately comes after the reusable showcase engine.

See `docs/ROADMAP.md`.

## Repository status

Foundation work is being developed on `foundation/automotive-commerce`.

### Documentation

- `docs/ARCHITECTURE.md`
- `docs/SHOWCASE_CONTRACT.md`
- `docs/DEVICE_STRATEGY.md`
- `docs/SKILLS.md`
- `docs/DESIGN_RESEARCH.md`
- `docs/VISUAL_DIRECTION.md`
- `docs/MOTION_TYPOGRAPHY.md`
- `docs/EXPERIENCE_SPEC.md`
- `docs/ASSET_PIPELINE.md`
- `docs/ROADMAP.md`
