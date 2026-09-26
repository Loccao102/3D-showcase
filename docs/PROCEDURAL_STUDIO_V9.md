# Procedural Studio Environment Pipeline (V9)

The showcase runtime now uses a self-contained procedural studio lighting rig instead of external HDRI network fetches.

## Motivation & Problem Statement

In earlier versions, Drei's preset-based environment (`<Environment preset="studio" />`) relied on fetching remote HDR/EXR equirectangular textures from GitHub or unpinned CDNs (`raw.githubusercontent.com/pmndrs/drei-assets` / jsdelivr).

This caused multiple production and mobile delivery problems:
1. **Unbudgeted network payloads**: A single HDR image adds 1.2 MB to 5 MB over the wire, dwarfing our carefully optimized GLB/KTX2/Meshopt assets (which are compressed down to 14 KB - 25 KB).
2. **Fragile external network dependency**: Offline usage, local testing, and restricted corporate networks failed or timed out when fetching external CDN textures.
3. **No adaptive quality control**: External static HDR maps cannot adapt their texture footprint to low-end or mobile memory constraints without downloading separate files.
4. **Violation of Asset Pipeline guidelines**: As stated in `docs/ASSET_PIPELINE.md`, *"The lighting design should not depend on a single massive HDRI file. Provide reduced versions for mobile tiers."*

## Procedural Rig Architecture

`ProceduralStudioEnvironment` inside `packages/showcase-three/src/ShowcaseCanvas.tsx` replaces external presets with an authored procedural studio rig built using `@react-three/drei`'s `<Lightformer />` primitives within an `<Environment>` component.

### 4-Point Lightformer Composition

The rig defines a dedicated art-directed vehicle lighting stage:

| Lightformer | Shape | Intensity | Color | Position `[x, y, z]` | Purpose |
| --- | --- | ---: | --- | --- | --- |
| **Top / Overhead** | `rect` (8 × 3.2) | 4.8 | `#f6f9ff` | `[0, 5.5, -4.5]` | Highlights roof loft, hood contours, and windscreen reflections |
| **Right / Shoulder** | `rect` (5.5 × 2.2) | 3.2 | `#dceaff` | `[5.5, 2.4, 1.2]` | Defines passenger-side shoulder line, rocker panel, and wheel rims |
| **Left / Rim** | `rect` (4.5 × 2.0) | 2.6 | `#b9d8ff` | `[-5.5, 2.1, -1.8]` | Provides cool rim accentuation and silhouette separation on driver side |
| **Front / Eyelight** | `ring` (scale 2.2) | 2.4 | `#ffffff` | `[0, 1.4, 5.5]` | Creates clean circular catchlights in headlamps and front badge |

Complementing the procedural environment map:
- **Primary Directional Light**: `intensity=2.6`, `position=[5, 8, 4]`, casts contact shadows when enabled by the active render policy.
- **Secondary Fill Light**: `intensity=0.85`, `position=[-4, 3.5, -5]`, ensures underbody and rear quarter panels remain legible.
- **Base Ambient Light**: `intensity=0.42`, soft baseline illumination preventing crushed blacks in cabin interiors.

### Adaptive Resolution Scaling

The PMREM environment cube resolution scales dynamically based on the active device capability policy (`effectivePolicy.quality`):

```typescript
const resolution = quality === "high" ? 256 : 128;
```

- **High tier (Desktop / High-end)**: 256px cube faces (~384 KB uncompressed GPU VRAM during generation).
- **Medium / Low tier (Mobile / Constrained GPU)**: 128px cube faces (~96 KB uncompressed GPU VRAM).
- **Network payload**: **0 B (0 KB)** across all tiers.

## Measured Performance & Budgets

| Metric | Drei Preset (Previous) | Procedural Studio V9 (Current) | Difference |
| --- | ---: | ---: | ---: |
| **Network Transfer (Desktop)** | ~1,280,000 B | **0 B** | -100% |
| **Network Transfer (Mobile)** | ~1,280,000 B | **0 B** | -100% |
| **External CDN Requests** | 1 (jsdelivr / github) | **0** | Eliminated |
| **LOD0 Hero + Environment Total** | ~1.3 MB | **~24.6 KB (Meshopt)** | **~98% reduction** |
| **Mobile LOD2 + Environment Total**| ~1.3 MB | **~14.7 KB (Meshopt)** | **~98.8% reduction** |

## Validation & Verification

1. **Browser Smoke Suite (`scripts/smoke-ktx2-browser.mjs`)**:
   - Enforces an automated assertion that zero requests to `.hdr`, `.exr`, `raw.githubusercontent.com`, or `jsdelivr.net/gh/pmndrs` occur during runtime.
   - Logs `environment=procedural(0KB)` during Chromium desktop and mobile passes.
2. **Quality Fallback**:
   - Manifests specifying `"studio"` or `"neutral"` presets automatically route to `ProceduralStudioEnvironment`.
   - Custom presets remain supported if future vertical manifests supply explicit environment definitions.
