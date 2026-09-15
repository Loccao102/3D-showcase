# Architecture

## Goal

Build a reusable 3D showcase platform whose core knows nothing about cars, checkout, dealers, or any future sales vertical.

Automotive is the first adapter and demo domain. The core must remain usable for any product represented by a scene, configurable options, viewpoints and hotspots.

## Bounded areas

### 1. Showcase Core

`packages/showcase-core`

Headless TypeScript contracts and runtime rules. No React, no Three.js, no automotive terminology.

Responsibilities:

- showcase manifest schema
- scene asset descriptors
- camera presets
- hotspot definitions
- generic option groups and option selections
- node/material bindings
- device/render quality policy
- configuration state contracts
- analytics event contracts

Examples of concepts that belong here:

- `ShowcaseManifest`
- `AssetSource`
- `OptionGroup`
- `VariantBinding`
- `Hotspot`
- `CameraPreset`
- `RenderQuality`

Examples that must NOT live here:

- vehicle engine size
- wheel size
- dealer inventory
- test drive
- cart / order / payment

### 2. Three Renderer

`packages/showcase-three`

React + React Three Fiber implementation of the core contracts.

Responsibilities:

- Canvas lifecycle
- cameras and controls
- lighting/environment
- GLB loading
- material/node visibility bindings
- hotspot projection
- loading/error/fallback behavior
- render quality application
- optional post-processing

The renderer consumes a `ShowcaseManifest`. It should not care whether the displayed product is a car, chair or apartment.

### 3. Web Host

`apps/web`

Next.js application hosting the product experience.

Responsibilities:

- routing and SEO
- product information
- responsive DOM UI
- loading the correct showcase manifest
- mounting the renderer client-side
- future vertical and commerce composition

The page shell remains usable before the 3D runtime is ready.

### 4. Vertical adapters

Automotive is the first vertical. A vertical adapter may provide:

- domain labels and metadata
- product-specific option grouping
- product-specific content panels
- camera presets
- recommended asset conventions
- commerce mapping

It must translate domain concepts into generic showcase contracts rather than adding car-specific behavior to `showcase-core`.

### 5. API

`apps/api`

Go + Gin service. Initially a thin API that returns showcase/product manifests. Later modules may add:

- catalog persistence
- accounts
- saved configurations
- leads
- quote requests
- reservations
- inventory
- orders

Commerce remains a sibling capability, not a dependency of the renderer.

## Suggested repository layout

```text
3D-showcase/
├─ apps/
│  ├─ web/
│  └─ api/
├─ packages/
│  ├─ showcase-core/
│  ├─ showcase-three/
│  ├─ showcase-ui/          # later when shared UI stabilizes
│  ├─ vertical-automotive/  # later
│  └─ commerce-client/      # later
├─ docs/
└─ assets/                  # metadata/examples only; large binaries use object storage/CDN
```

## Data direction

```text
API / static manifest
        ↓
ShowcaseManifest
        ↓
showcase-core validates/interprets
        ↓
showcase-three renders scene
        ↕
DOM controls / configuration state
        ↓
optional vertical + commerce adapters
```

## Why Go + Gin

The first backend requirement is intentionally small: deliver manifests, catalog metadata and later write-side workflows. Gin keeps startup time, memory usage and service complexity low. If the commerce domain later becomes very large, it can still be split into services without changing the showcase contracts.

## Non-negotiable dependency rule

```text
commerce → may depend on showcase identifiers
vertical → may depend on showcase-core
showcase-three → depends on showcase-core
showcase-core → depends on neither vertical nor commerce
```

This rule is what lets the project switch from cars to another product category without rewriting the engine.
