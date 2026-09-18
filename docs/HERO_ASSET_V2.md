# Astra One — Self-authored Hero Asset V2

## Purpose

Hero V2 raises the live automotive proof from a primitive-heavy pipeline fixture into a deliberately art-directed original concept while keeping the asset deterministic, self-authored and independent from the showcase engine API.

It is still a stylized concept asset, not a claim of final photoreal production automotive art.

## Provenance

- ownership: self-authored for this repository;
- generator: `scripts/generate-astra-concept.mjs`;
- generator marker: `OpenAI self-authored Astra One concept generator v3`;
- art stage: `hero-v2-art-direction`;
- canonical source delivery: binary glTF 2.0;
- texture stage: generated PNG -> BasisLZ KTX2 where measured beneficial;
- geometry delivery: `EXT_meshopt_compression` for all runtime LODs;
- no third-party branded vehicle geometry or external model is embedded.

## Art-direction changes

### Silhouette

The V1 body and cabin used single wedge primitives. Hero V2 replaces them with LOD-specific multi-section lofts:

- the body tapers independently at nose, shoulder, cabin transition and rear;
- the canopy is a separate loft with narrower roof width and longitudinal taper;
- hood and rear deck are reduced to thin panel accents instead of defining the main volume.

This produces a clearer automotive shoulder and roofline without requiring Blender-authored source files.

### Exterior graphic

Hero V2 adds a stronger visual hierarchy:

- continuous front and rear signature light bars;
- grille slats and front corner intakes;
- B-pillars;
- shoulder lines and door handles;
- larger wheel/rim proportions;
- authored wheel spokes and hubs on LOD0/1;
- refined mirrors and splitter;
- Sport spoiler supports and LOD0 diffuser strakes.

### Interior

The existing semantic dashboard, console, front/rear seats and steering wheel remain. LOD0 adds front-seat headrests and a steering hub while preserving the same engine-facing semantic names.

## LOD measurements

CI measurements after UV/texturing:

| Variant | LOD | GLB bytes | Nodes | Unique triangles |
| --- | ---: | ---: | ---: | ---: |
| Touring | 0 | 70,424 | 82 | 484 |
| Touring | 1 | 48,508 | 67 | 364 |
| Touring | 2 | 24,688 | 27 | 176 |
| Sport | 0 | 71,328 | 91 | 484 |
| Sport | 1 | 48,900 | 71 | 364 |
| Sport | 2 | 24,864 | 29 | 176 |

Triangle counts measure unique glTF mesh primitives. Reused mesh nodes can increase rendered instance work; device profiling remains the runtime authority.

## Production runtime measurements

### KTX2 stage

| Variant | LOD0 | LOD1 | LOD2 reference |
| --- | ---: | ---: | ---: |
| Touring | 57,788 B | 47,180 B | 25,572 B |
| Sport | 58,692 B | 47,572 B | 25,748 B |

The established delivery policy remains unchanged: LOD0/1 use KTX2, while LOD2 retains PNG because the tiny KTX2 package has more container/mipmap overhead than the PNG source.

### Meshopt stage

| Variant | LOD0 | LOD1 | LOD2 |
| --- | ---: | ---: | ---: |
| Touring | 32,772 B | 26,776 B | 16,040 B |
| Sport | 34,028 B | 27,320 B | 16,284 B |

Against each tier's chosen texture source, Meshopt saves approximately 42–43% on LOD0/1 and 34–35% on LOD2.

## Semantic compatibility

Hero V2 deliberately preserves the semantic contract used by the generic engine:

- `body` remains the target of `material-color`;
- `front-light` and `rear-light` remain visibility targets;
- `ANIM_signature_pulse` remains the animation-state clip;
- `anchor:front-light`, `anchor:cabin`, `anchor:rear` and `anchor:wheel-front` remain hotspot anchors;
- Touring/Sport remain whole-asset replacements in the `subject` slot;
- required PBR material names and extensions remain unchanged.

CI validates those contracts after source generation, KTX2 promotion and Meshopt promotion.

## Visual review evidence

The production-browser smoke test now optionally captures full-page desktop and mobile screenshots. GitHub CI uploads them as the `showcase-visual-evidence` artifact with a 14-day retention window.

This provides a human-review surface for art changes while keeping browser decode readiness as a separate automated gate.

## Evidence boundary

Hero V2 proves a more deliberate original silhouette, detail hierarchy, production delivery pipeline and browser-load path.

It does not prove:

- final photoreal quality;
- automotive surfacing suitable for marketing close-ups;
- physically measured mobile GPU performance;
- visual approval by an automotive art director.

Those remain later production-art/device-review stages.
