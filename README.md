# 3D Showcase

A reusable, 3D-first product showcase platform built around a domain-neutral rendering engine.

The **showcase engine is the product**. Automotive is the first reference vertical used to prove the platform. Commerce, lead generation, reservations and checkout are optional consumers layered on top instead of being baked into the renderer.

## Current status

**Showcase Engine V1 core is complete.**

The current reference experience proves the full generic loop:

```text
manifest
   ↓
asset + LOD resolution
   ↓
semantic scene registry
   ↓
generic bindings
   ↓
3D explore / guided hotspots / camera director
   ↓
selection snapshot
   ↓
optional commerce or other host consumer
```

Implemented V1 capabilities include:

- manifest-driven glTF/primitive assets by stable IDs,
- responsive LOD URL resolution and generic asset slots,
- semantic node/material/anchor lookup,
- `material-color`, `node-visibility`, `asset-replacement` and `animation-state` runtime paths,
- cloned runtime materials and safe mutable-state restoration,
- interruptible named camera presets with target/position/FOV tweening,
- separate mobile camera framing,
- reduced-motion behavior,
- anchored DOM hotspots with basic occlusion,
- fallback poster and loading/ready/error states,
- capability-based render/DPR policy,
- demand rendering while idle,
- responsive desktop/tablet/mobile configurator,
- generic `ShowcaseSelectionSnapshot` for downstream consumers,
- CI validation for the committed reference glTF fixtures.

Production vehicle assets, real LOD geometry, KTX2/Meshopt benchmarking and physical-device profiling are tracked as **production hardening**, not missing core architecture.

## Reference vertical: automotive

The reference screen demonstrates a premium vehicle showcase where visitors can:

- orbit and zoom the product,
- switch finish colors,
- switch Touring/Sport assets through a generic asset slot,
- toggle scene-node visibility,
- open three semantic hotspots,
- enter interruptible guided camera views,
- return directly to free exploration,
- produce a configuration snapshot independent of commerce.

The same engine is intended to support furniture, electronics, industrial equipment, fashion products, museum objects and other products without adding those domain concepts to `@showcase/core`.

## Architecture at a glance

```text
apps/web (Next.js)
  ├─ responsive DOM experience
  ├─ reference vertical manifest/content
  └─ mounts showcase renderer
        │
        ├─ packages/showcase-core
        │    ├─ domain-neutral contracts
        │    ├─ selection + snapshot helpers
        │    ├─ asset/LOD resolution
        │    └─ device render policy
        │
        └─ packages/showcase-three
             ├─ R3F canvas/runtime
             ├─ semantic scene registry
             ├─ asset loader
             ├─ binding execution
             ├─ camera director
             └─ hotspot overlay runtime

apps/api (Go + Gin)
  ├─ showcase manifest API shell
  └─ future product/content services

optional commerce
  └─ consumes ShowcaseSelectionSnapshot only
```

### Dependency rule

```text
vertical content → generic showcase manifest → showcase engine
commerce → consumes ShowcaseSelectionSnapshot
showcase engine -X→ commerce/domain business objects
```

## Experience model

```text
Arrival / fallback
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

Direct interaction always outranks cinematic or ambient motion. Guided camera movement can be interrupted immediately, and reduced-motion users receive fast repositioning instead of long flights.

See `docs/EXPERIENCE_SPEC.md`.

## Visual direction

The current direction is **Dark Precision Gallery + Adaptive Environment**:

- the 3D subject remains visually dominant,
- editorial typography and DOM UI frame the scene,
- controls stay contextual rather than covering the canvas,
- mobile receives its own composition instead of a compressed desktop sidebar,
- motion must explain state or spatial context rather than exist as decoration.

See `docs/VISUAL_DIRECTION.md` and `docs/MOTION_TYPOGRAPHY.md`.

## Technology

- Next.js 16 + TypeScript
- React 19
- Three.js + React Three Fiber + Drei
- pnpm workspace
- Go + Gin API
- glTF/GLB production target
- Meshopt/Draco and KTX2/Basis planned for measured production-asset optimization

## Run locally

```bash
pnpm install
pnpm dev
```

Useful validation commands:

```bash
pnpm validate:assets
pnpm typecheck
pnpm --filter @showcase/web build
```

API validation:

```bash
cd apps/api
go test ./...
```

## Asset philosophy

Production assets follow a reproducible pipeline:

```text
source asset
   ↓
inspect / normalize
   ↓
stable semantic node + material + anchor names
   ↓
LOD + texture optimization
   ↓
validation
   ↓
manifest bindings
   ↓
real-device QA
```

Reference glTF fixtures live in `apps/web/public/models` and are deliberately tiny. CI validates their embedded buffers and semantic nodes so engine tests do not depend on a third-party asset license.

See `docs/ASSET_PIPELINE.md`.

## Roadmap

```text
Foundation                        ✓
   ↓
Showcase Engine V1 core           ✓
   ↓
Production asset/device hardening ← current
   ↓
Automotive Vertical V1
   ↓
Content / Admin pipeline
   ↓
Optional Commerce
   ↓
Second Vertical Proof
   ↓
Showcase SDK / Platform
```

Commerce deliberately stays behind the reusable showcase engine.

See `docs/ROADMAP.md` and `docs/NEXT_TASKS.md`.

## Core documentation

- `docs/ARCHITECTURE.md`
- `docs/SHOWCASE_CONTRACT.md`
- `docs/DEVICE_STRATEGY.md`
- `docs/EXPERIENCE_SPEC.md`
- `docs/ASSET_PIPELINE.md`
- `docs/DESIGN_RESEARCH.md`
- `docs/VISUAL_DIRECTION.md`
- `docs/MOTION_TYPOGRAPHY.md`
- `docs/ROADMAP.md`
- `docs/NEXT_TASKS.md`
