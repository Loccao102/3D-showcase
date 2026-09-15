# Production Hardening

Showcase Engine V1 is domain-neutral and complete. This document defines the production gate for real showcase assets and representative devices.

## Delivery metadata

Asset delivery tuning stays outside product-specific UI code. A glTF asset can opt into loader behavior through `AssetSource.metadata.delivery`:

```ts
{
  id: "vehicle-lod0",
  kind: "gltf",
  url: "/models/vehicle-lod0.glb",
  metadata: {
    delivery: {
      meshopt: true,
      draco: false,
      ktx2TranscoderPath: "/basis/"
    }
  }
}
```

Rules:

- Meshopt decode is enabled by default through Drei `useGLTF`.
- KTX2 is enabled only when `ktx2TranscoderPath` is supplied.
- The web app copies the Basis transcoder bundled with the installed Three.js version into `public/basis` before `dev` and `build`, avoiding a mismatched CDN decoder.
- A single KTX2 loader instance is reused per renderer/transcoder path.
- Draco remains available when a source asset requires it, but Meshopt is the preferred default for the showcase pipeline.

## LOD production gate

A production hero product should ship with three measured outputs:

| Tier | Intended use | Starting target |
| --- | --- | --- |
| LOD0 | premium desktop / close inspection | preserve authored silhouette and hero details |
| LOD1 | normal desktop / tablet | materially lower triangles and texture pressure |
| LOD2 | mobile / constrained hardware | aggressive geometry and texture reduction |

The current tiny Astra glTF files are deterministic fixtures, not production LODs.

Each real LOD must record:

- triangle count,
- geometry bytes before/after compression,
- texture bytes before/after KTX2,
- total network transfer size,
- decode/load time on representative devices,
- semantic node/material/anchor validation results.

## Runtime frame telemetry

The renderer now samples active rendered frames rather than idle wall-clock time. This matters because the canvas uses `frameloop="demand"`.

Current degradation rule:

- sample 45 active frames,
- ignore invalid/background deltas below 1 ms or above 100 ms,
- calculate average frame time and p95 frame time,
- if average >= 24 ms or p95 >= 34 ms for the sample window, request one quality step down,
- enforce a 5 second cooldown between quality reductions,
- never degrade below `low`.

Quality degradation changes renderer cost, not domain state:

- high -> medium: cap DPR at 1.5 and disable post-processing,
- medium -> low: cap DPR at 1, disable shadows and post-processing.

Direct interaction, selection and camera state remain intact.

## Device matrix

Before a production vertical is called ready, capture results for at least:

1. mid-range Android Chrome,
2. iOS Safari,
3. tablet portrait,
4. tablet landscape,
5. normal desktop integrated GPU,
6. stronger desktop discrete GPU.

Record:

- first useful DOM paint,
- first fallback poster display,
- first interactive 3D frame,
- asset transfer/decode time,
- sustained orbit frame time,
- p95 frame time,
- peak memory where tooling allows,
- selected starting quality tier,
- whether adaptive degradation occurred.

## Production asset acceptance

A real asset is accepted only when:

- source/license or ownership is documented,
- LOD0/1/2 are reproducible from the source,
- semantic names match the manifest contract,
- KTX2 output loads through the self-hosted Basis transcoder,
- Meshopt decode is verified on representative browsers,
- at least one real animation clip exercises `animation-state`,
- fallback imagery exists,
- the asset passes mobile and iOS Safari QA,
- measured budgets are committed to documentation.

Do not mark KTX2, Meshopt, LOD or device validation complete merely because loader support exists. The gate closes only with a real production asset and measured device evidence.
