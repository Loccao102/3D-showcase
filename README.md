# 3D Showcase

A reusable, 3D-first product showcase platform.

The **showcase engine is the product**. Automotive is only the first vertical used to prove the platform. Commerce, lead generation, reservations, and checkout are optional modules layered on top of the showcase instead of being baked into it.

## First vertical: automotive

The first experience is a premium car showroom where visitors can inspect a vehicle, rotate and zoom it, discover hotspots, switch configurable variants, and later continue into quote / reservation flows.

The same core should be reusable for furniture, electronics, real-estate units, industrial equipment, fashion products, museum objects, or other products that benefit from interactive 3D presentation.

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

## Technology

- Next.js + TypeScript
- React Three Fiber + Three.js + Drei
- Zustand for local experience state when needed
- Go + Gin for the API
- GLB/glTF, Meshopt/Draco and KTX2 as the intended production asset pipeline

## Repository status

Foundation work is being developed on `foundation/automotive-commerce`.

See:

- `docs/ARCHITECTURE.md`
- `docs/SHOWCASE_CONTRACT.md`
- `docs/DEVICE_STRATEGY.md`
- `docs/SKILLS.md`
