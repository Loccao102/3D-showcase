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
- `material-color`, `node-visibility`, `node-transform`, `asset-replacement` and `animation-state` runtime paths,
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
- decoupled commercial adapter (`CommerceModal`) for reservations, test drives, and itemized quotes,
- CI validation for the committed reference glTF fixtures.

Production vehicle assets, real LOD geometry, KTX2/Meshopt benchmarking and physical-device profiling are tracked as **production hardening**, not missing core architecture.

## Reference verticals

### 1. Automotive — Astra One
The flagship automotive showcase demonstrates:
- interactive 3D orbit and zoom,
- dynamic exterior finish perceptual color morphing,
- whole-asset Touring and Sport aero trim replacement with monotonic LOD packages,
- interactive Exploded Technical Mode (`mode: "technical"`) elevating canopy +0.35m, offsetting wheels, with 800V SiC and 102 kWh battery HUD overlay,
- anchored semantic hotspots and guided camera views,
- decoupled commercial reservation, test drive scheduling, and itemized pricing quotation.

### 2. Furniture — Kroma Lounge Chair (`/furniture`)
Proves definitively that the engine is 100% domain-neutral and reusable:
- architectural ergonomics showcase with monotonic LOD models,
- upholstery color bindings and architectural base finish options,
- dynamic recline postural mode articulated via domain-neutral `node-transform`,
- active lumbar, 5-star swivel base, and cervical headrest hotspots,
- identical decoupled commerce adapter consuming chair selection snapshots.

## Platform Extensions & Tools

### 1. Showcase Embed SDK & Web Component (`/embed` & `/sdk/showcase-embed.js`)
- Frameless embeddable 3D viewport at `/embed?slug=...&controls=1|0`
- Zero-dependency custom element `<showcase-viewer slug="automotive-concept-01" controls="1" height="600px">`
- Bidirectional `postMessage` protocol:
  - Inbound actions: `showcase:select-option`, `showcase:set-camera-preset`, `showcase:request-snapshot`
  - Outbound events: `showcase:ready`, `showcase:selection-changed`, `showcase:hotspot-clicked`, `showcase:snapshot`
- Typed embed client helper in `@showcase/core`: `createShowcaseEmbedClient(iframeWindow, targetOrigin)`

### 2. Visual 3D CMS Studio (`/admin/editor`)
- Interactive authoring studio for 3D manifests across all verticals
- Real-time multi-vertical switching between Automotive (Astra One) and Furniture (Kroma Chair)
- Hotspot authoring: anchor positions, labels, and linked camera presets with live in-canvas updates
- Camera preset capture: record real-time viewport framing, position, look-at target, and FOV
- Live JSON manifest inspector with instant clipboard export
- Full backend persistence via Go Gin REST API (`GET /api/v1/showcases`, `PUT /api/v1/showcases/:slug`)

### 3. Device Performance Benchmarking & Profiling (`/benchmark` & `pnpm benchmark:assets`)
- Interactive 4-phase stress test runner:
  - Phase 1: High DPR & Rapid Orbit Pacing
  - Phase 2: Rapid Variant & Material Uniform Rebinding (250ms cadence)
  - Phase 3: Camera Frustum Jump Stress
  - Phase 4: Idle Quiescent Recovery & VRAM Stabilization
- Latency profiling metrics: Average FPS, Min FPS, P50, P90, P95, and P99 frame latency (ms)
- Hardware Tier Scoring (Tier 1 Ultra, Tier 2 Standard, Tier 3 Constrained/Mobile) with automated render policy recommendations
- Headless CLI profiler: `pnpm benchmark:assets` audits disk size, triangle counts, vertex buffers, and estimated VRAM across all production LODs into `dist/device-performance-audit.json`

## Architecture at a glance

```text
apps/web (Next.js 16)
  ├─ /                     (Automotive showcase)
  ├─ /furniture            (Furniture vertical proof)
  ├─ /admin/editor         (Visual 3D CMS Studio)
  ├─ /benchmark            (Device Performance Profiler)
  ├─ /embed                (Frameless embeddable viewport)
  ├─ /sdk/showcase-embed.js (Web Component SDK)
  └─ mounts showcase renderer
        │
        ├─ packages/showcase-core
        │    ├─ domain-neutral contracts
        │    ├─ selection + snapshot helpers
        │    ├─ asset/LOD resolution
        │    ├─ device render policy
        │    └─ embed SDK postMessage contracts
        │
        └─ packages/showcase-three
             ├─ R3F canvas/runtime
             ├─ semantic scene registry
             ├─ asset loader
             ├─ binding execution
             ├─ camera director
             └─ hotspot overlay runtime

apps/api (Go + Gin)
  ├─ GET /api/v1/showcases       (List registered showcase manifests)
  ├─ GET /api/v1/showcases/:slug  (Retrieve specific showcase manifest)
  └─ PUT /api/v1/showcases/:slug  (Thread-safe persist showcase manifest)

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
Optional Commerce Handoff / Visual CMS / Embed SDK
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
- Go + Gin API (Thread-safe manifest repository)
- glTF/GLB production target
- Meshopt/Draco and KTX2/Basis with automated promotion pipelines

## Run locally

```bash
pnpm install
pnpm dev
```

Useful validation commands:

```bash
pnpm validate:assets
pnpm typecheck
pnpm build
pnpm benchmark:assets
```

API validation:

```bash
cd apps/api
go vet ./...
go build ./...
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
Foundation                                    ✓
   ↓
Showcase Engine V1 core                       ✓
   ↓
Production asset/device hardening             ✓
   ↓
Automotive Vertical V1                        ✓
   ↓
Second Vertical Proof (Furniture)             ✓
   ↓
Optional Commerce Adapter                     ✓
   ↓
Visual 3D CMS / Manifest Editor (/admin)      ✓
   ↓
Showcase Embed SDK & Web Component (/sdk)     ✓
   ↓
Device Performance Profiling Suite (/benchmark)✓
```

Commerce deliberately stays behind the reusable showcase engine.

See `docs/ROADMAP.md` and `docs/NEXT_TASKS.md`.

## Core documentation

- [ARCHITECTURE.md](file:///c:/Users/Admin/3D-showcase-1/docs/ARCHITECTURE.md)
- [SHOWCASE_CONTRACT.md](file:///c:/Users/Admin/3D-showcase-1/docs/SHOWCASE_CONTRACT.md)
- [DEVICE_STRATEGY.md](file:///c:/Users/Admin/3D-showcase-1/docs/DEVICE_STRATEGY.md)
- [EXPERIENCE_SPEC.md](file:///c:/Users/Admin/3D-showcase-1/docs/EXPERIENCE_SPEC.md)
- [ASSET_PIPELINE.md](file:///c:/Users/Admin/3D-showcase-1/docs/ASSET_PIPELINE.md)
- [DESIGN_RESEARCH.md](file:///c:/Users/Admin/3D-showcase-1/docs/DESIGN_RESEARCH.md)
- [VISUAL_DIRECTION.md](file:///c:/Users/Admin/3D-showcase-1/docs/VISUAL_DIRECTION.md)
- [MOTION_TYPOGRAPHY.md](file:///c:/Users/Admin/3D-showcase-1/docs/MOTION_TYPOGRAPHY.md)
- [PROCEDURAL_STUDIO_V9.md](file:///c:/Users/Admin/3D-showcase-1/docs/PROCEDURAL_STUDIO_V9.md)
- [ACCESSIBILITY_AUDIT.md](file:///c:/Users/Admin/3D-showcase-1/docs/ACCESSIBILITY_AUDIT.md)
- [ROADMAP.md](file:///c:/Users/Admin/3D-showcase-1/docs/ROADMAP.md)
- [NEXT_TASKS.md](file:///c:/Users/Admin/3D-showcase-1/docs/NEXT_TASKS.md)
