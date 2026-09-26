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

Status: **Automotive Vertical V1 delivered**.

The reference automotive screen proves the generic engine with rich vertical content without contaminating `@showcase/core`.

Delivered:

- exterior finish options with perceptual color morphing,
- whole-asset Touring and Sport aero trim replacement with monotonic LOD packages,
- three anchored exterior/detail hotspots with interruptible camera transitions,
- cabin, front lighting, and rear profile detail presets with mobile framing,
- dynamic vehicle specifications panel (0–100 km/h, WLTP range, peak power, top speed) adapting by trim,
- configuration URL search parameter synchronization and one-click share link with live status toasts,
- procedural Studio Day and Night Gallery atmospheric lighting rigs (0 KB network payload),
- shareable/serializable generic configuration snapshot for downstream commerce.

## Phase 3 — Content / Admin Pipeline

Status: **core API and manifest validation delivered**.

The showcase API allows validating manifests and inspecting showcase metadata via structured endpoints.

Delivered:

- Go + Gin API shell with health check (`GET /healthz`) and showcase retrieval (`GET /api/v1/showcases/:slug`),
- manifest structural integrity validation endpoint (`POST /api/v1/showcases/validate`) enforcing required IDs, unique option IDs, and valid camera/hotspot references,
- unit test coverage for validation logic and route handling.

Future pipeline expansion:

- preview and publish lifecycle,
- asset version references,
- hotspot/camera metadata editor or import format,
- configuration option management UI.

## Phase 4 — Optional Commerce

Status: **delivered (decoupled commercial handoff adapter)**.

Delivered:

- decoupled commercial modal gateway (`CommerceModal.tsx`) strictly consuming `ShowcaseSelectionSnapshot`,
- **Reservation Workflow**: refundable allocation deposit ($1,000 auto / $300 furniture), customer info, preferred experience center, and instant reference generation,
- **Private Experience Scheduling**: private test drive / showroom consultation booking with date/time pickers and credential acknowledgement,
- **Itemized Quotation Breakdown**: dynamic build sheet pricing reflecting active finish, aero trim, dynamics packages, factory logistics, and one-click JSON spec export,
- strict architectural isolation: zero Three.js, R3F, or WebGL imports in the commerce adapter layer.

Rule:

```text
commerce → consumes ShowcaseSelectionSnapshot
showcase → never depends on commerce
```

## Phase 5 — Second Vertical Proof

Status: **delivered (Kroma Ergonomic Lounge Chair)**.

Proves definitively that the `@showcase/core` and `@showcase/three` architecture is 100% domain-neutral and reusable without a single automotive rewrite.

Delivered:

- self-authored Kroma Ergonomic Lounge Chair hero model with monotonic LODs (`kroma-chair-lod0.glb` 17 KB, `lod1.glb` 14 KB, `lod2.glb` 12 KB),
- dedicated `/furniture` route and seamless header vertical switcher (`Astra One ↔ Kroma Chair`),
- domain-neutral generic `node-transform` runtime binding support: dynamic recline mechanism articulated via node offsets,
- architectural specifications panel (BIFMA X5.1 certification, 4D active lumbar, 98% recyclable alloy, 12-year warranty),
- anchored hotspots: active lumbar suspension, 5-star die-cast swivel base, and cervical headrest,
- Go API seed manifest & validation coverage for both automotive and furniture verticals.

## Phase 6 — Showcase SDK & Embeddable Web Component

Status: **delivered**.

Delivered:

- zero-dependency custom element `<showcase-viewer>` (`/sdk/showcase-embed.js`) for embedding 3D showcases in any third-party website,
- frameless embed route at `/embed?slug=...&controls=1|0&theme=dark|light`,
- bidirectional `postMessage` protocol:
  - Inbound actions: `showcase:select-option`, `showcase:set-camera-preset`, `showcase:request-snapshot`
  - Outbound events: `showcase:ready`, `showcase:selection-changed`, `showcase:hotspot-clicked`, `showcase:snapshot`
- typed SDK client in `@showcase/core`: `createShowcaseEmbedClient(iframeWindow, targetOrigin)`.

## Phase 7 — Visual 3D CMS Studio (`/admin/editor`)

Status: **delivered**.

Delivered:

- interactive in-canvas hotspot authoring with instant 3D placement, anchor IDs, and preset linkage,
- camera preset framing tool: captures real-time camera position, look-at target, and FOV directly from viewport manipulation,
- multi-vertical switcher for previewing and modifying both Automotive and Furniture manifests,
- live JSON manifest inspector with clipboard export,
- thread-safe Go API backend synchronization (`GET /api/v1/showcases`, `PUT /api/v1/showcases/:slug`).

## Phase 8 — Device Performance Benchmarking & Profiling Suite (`/benchmark`)

Status: **delivered**.

Delivered:

- automated 4-phase stress test runner (High-DPR orbit, variant material cycling, camera preset jumps, idle frame stabilization),
- real-time latency analytics: Average FPS, Min FPS, P50, P90, P95, and P99 frame latency (ms),
- hardware Tier Rating (Tier 1 Ultra, Tier 2 Standard, Tier 3 Constrained) with automated render policy tuning recommendations,
- headless CLI profiler `pnpm benchmark:assets` auditing disk size, geometry buffers, and estimated VRAM into `dist/device-performance-audit.json`.

## Milestone order

Do not reorder these because ecommerce feels easier to demonstrate.

```text
Foundation                                     ✓
   ↓
Showcase Engine V1 core                        ✓
   ↓
Production asset/device hardening              ✓
   ↓
Automotive Vertical V1                         ✓
   ↓
Content / Admin pipeline                       ✓
   ↓
Optional commerce                              ✓
   ↓
Second vertical (Furniture)                    ✓
   ↓
Showcase SDK / Embed Component (Phase 6)       ✓
   ↓
Visual 3D CMS Studio (Phase 7)                 ✓
   ↓
Device Performance Profiling Suite (Phase 8)   ✓
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
