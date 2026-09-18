# Meshopt Runtime Pipeline

The showcase runtime now has a real geometry-compression path rather than only loader support.

## Encoder pin

CI installs the official meshoptimizer **gltfpack v1.2** Ubuntu binary and verifies the release archive before use.

- release: `v1.2`
- file: `gltfpack-ubuntu.zip`
- SHA-256: `ebc236f5f6c08c7e5c5750476a187d24805d44d8c680449c4b7369c333f817b1`

## Runtime source policy

Meshopt is applied after the texture-delivery decision:

| LOD | Texture source before Meshopt | Reason |
| --- | --- | --- |
| LOD0 | BasisLZ KTX2 GLB | KTX2 materially reduces the 64px runtime package |
| LOD1 | BasisLZ KTX2 GLB | KTX2 is still slightly smaller and browser-decoded |
| LOD2 | PNG GLB | the tiny 16px KTX2 package is larger than the PNG source |

`scripts/promote-meshopt.mjs` writes sibling `*-meshopt.glb` files with:

```text
gltfpack -cc -noq -kn -km -ke -af 0
```

The flags deliberately:

- enable `EXT_meshopt_compression`;
- keep named nodes and meshes used by semantic bindings;
- keep named materials;
- preserve extras;
- disable geometry quantization so V7 measures Meshopt compression independently instead of mixing two optimization experiments;
- disable animation resampling so authored clip timing is preserved.

## Measured V7 runtime bytes

Pinned Linux x86_64 CI produced:

| Tier | Touring source | Touring Meshopt | Savings | Sport source | Sport Meshopt | Savings |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LOD0 | 48,184 B | 24,660 B | 48.8% | 48,448 B | 25,008 B | 48.4% |
| LOD1 | 40,112 B | 20,688 B | 48.4% | 40,284 B | 20,920 B | 48.1% |
| LOD2 | 22,760 B | 14,736 B | 35.3% | 22,932 B | 14,964 B | 34.7% |

Compressed Meshopt payloads measure:

- LOD0: 4,166 B;
- LOD1: 3,351 B;
- LOD2: 2,495 B.

Because every tier is materially smaller, the production runtime profile enables Meshopt on LOD0, LOD1 and LOD2.

## CI ceilings

The asset contract locks ceilings near the measured values:

- Touring LOD0: 25,088 B; Sport LOD0: 25,408 B; Meshopt payload <= 4,352 B; runtime/source ratio <= 0.54.
- Touring LOD1: 21,120 B; Sport LOD1: 21,376 B; Meshopt payload <= 3,584 B; runtime/source ratio <= 0.54.
- Touring LOD2: 15,104 B; Sport LOD2: 15,360 B; Meshopt payload <= 2,688 B; runtime/source ratio <= 0.67.

The validator also requires:

- `EXT_meshopt_compression` in `extensionsUsed` and `extensionsRequired`;
- valid compressed bufferView ranges, modes, strides and counts;
- required semantic node, material and animation names;
- required PBR material extensions and alpha modes;
- KTX2 retained on LOD0/1;
- PNG retained on LOD2;
- monotonic runtime bytes from LOD0 -> LOD1 -> LOD2.

## Runtime build

Production CI builds with:

```bash
NEXT_PUBLIC_SHOWCASE_ASSET_ENCODING=ktx2 \
NEXT_PUBLIC_SHOWCASE_MESHOPT=1 \
pnpm --filter @showcase/web build
```

The manifest therefore resolves:

- desktop/high tier: `astra-one-*-lod0-ktx2-meshopt.glb`;
- medium tier: `astra-one-*-lod1-ktx2-meshopt.glb`;
- mobile/small tier: `astra-one-*-lod2-meshopt.glb`.

The generic Three.js loader path already has Meshopt decoding enabled, so the engine API does not become automotive-specific.

## Browser evidence

The production Chromium smoke gate has successfully reached runtime `ready` with:

- desktop 1440x900 loading `astra-one-touring-lod0-ktx2-meshopt.glb`, including successful Basis transcoding;
- mobile 390x844 loading `astra-one-touring-lod2-meshopt.glb` with the PNG texture policy.

This proves that the built Three.js runtime can decode the combined KTX2 + Meshopt path in Chromium.

## Evidence boundary

CI proves real Meshopt encoding, semantic preservation, size reduction and Chromium decode.

It does not yet prove:

- Meshopt decode cost on a representative mid-range Android CPU/GPU;
- iOS Safari decode behavior and timing;
- whether network savings outweigh decode cost on every target device;
- the optimal quantization settings for a future photoreal production asset.

Those remain device-performance QA tasks.
