# KTX2 / BasisLZ Runtime Pipeline

This repository keeps the authored PNG-textured GLBs as deterministic source assets and promotes them into separate KTX2 runtime GLBs for production validation and builds.

## Encoder pin

The production CI pipeline installs Khronos KTX-Software **v4.4.2** for Linux x86_64 and verifies the release package with SHA-256 before installation.

Pinned package:

- release: `v4.4.2`
- file: `KTX-Software-4.4.2-Linux-x86_64.deb`
- SHA-256: `ca635ed489d8bf54fac8d7687056c651193de0740830a7738cc034adc63e3027`

The project intentionally uses the stable 4.4.2 release instead of a release-candidate encoder.

## Stages

1. `scripts/generate-astra-concept.mjs`
   - generates the self-authored geometry GLBs.

2. `scripts/texture-astra-concept.mjs`
   - adds generated UVs;
   - embeds the PNG source maps;
   - applies the 64 / 32 / 16 px texture LOD policy.

3. `scripts/promote-ktx2.mjs`
   - extracts each embedded PNG map to a temporary file;
   - encodes it with `ktx create`;
   - uses BasisLZ / ETC1S, mipmaps and one encoder thread;
   - validates every generated KTX2 file with `ktx validate --gltf-basisu --warnings-as-errors`;
   - replaces the image payloads in a sibling runtime GLB;
   - writes `KHR_texture_basisu` as a required glTF extension;
   - writes `*-ktx2.glb` without retaining the PNG fallback payload.

4. `scripts/validate-ktx2-assets.mjs`
   - checks the glTF extension wiring;
   - checks the KTX2 file identifier and BasisLZ header fields;
   - checks expected texture resolution and full mip chains;
   - checks semantic node / mesh / material / animation names are unchanged;
   - checks runtime and KTX2 payloads remain monotonic from LOD0 -> LOD1 -> LOD2.

## Color-space policy

Color textures use `R8G8B8A8_SRGB` with an sRGB transfer function:

- paint microflake;
- tire tread;
- interior weave.

The metallic / roughness data texture uses `R8G8B8A8_UNORM` with a linear transfer function.

## Build modes

Default local development remains PNG-based and has no native KTX encoder dependency.

```bash
pnpm dev
pnpm build
```

Production KTX2 builds opt in through the public build-time environment variable:

```bash
NEXT_PUBLIC_SHOWCASE_ASSET_ENCODING=ktx2 pnpm --filter @showcase/web build
```

When KTX2 is enabled, the prebuild stage runs the real promotion step and the runtime manifest points to the `*-ktx2.glb` assets. The manifest also enables the self-hosted Three.js Basis transcoder through `delivery.ktx2TranscoderPath=/basis/`.

## CI gates

`pnpm validate:assets:production` runs:

- source GLB generation;
- PNG texture / UV validation;
- geometry and file budgets;
- material contracts;
- KTX2 promotion;
- KTX2 / `KHR_texture_basisu` validation.

The web build then runs again with `NEXT_PUBLIC_SHOWCASE_ASSET_ENCODING=ktx2`, so a green CI run proves that the final Next.js build is produced from the KTX2 runtime asset path rather than only validating an unused side artifact.

## Evidence boundary

This pipeline proves real KTX2 encoding, glTF extension wiring, structural validation and production-build integration.

It does **not** by itself prove:

- decode/transcode behavior on Safari or Android GPUs;
- measured upload/decode time on representative devices;
- visual quality equivalence at final art resolution;
- whether BasisLZ or UASTC is the best final codec for a future photoreal asset;
- final production network budgets.

Those remain device/browser QA tasks and must not be marked complete from CI-only evidence.
