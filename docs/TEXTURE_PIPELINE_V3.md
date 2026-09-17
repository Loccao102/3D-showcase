# Textured Hero V3

This pass adds a deterministic texture stage to the self-authored Astra One hero family.

## What is generated

`scripts/generate-astra-concept.mjs` still owns geometry, materials, semantic nodes, LOD structure and animation. `scripts/texture-astra-concept.mjs` then augments every generated GLB with:

- `TEXCOORD_0` on every mesh primitive,
- embedded PNG images inside the GLB BIN chunk,
- one reusable sampler,
- glTF texture objects,
- paint microflake base-color modulation,
- a paint metallic/roughness map,
- an interior weave map on LOD0/LOD1 where the interior material exists,
- a tire tread base-color map.

All maps are generated from deterministic code and have no third-party asset dependency.

## Why PNG first

The current stage intentionally uses standard embedded PNG sources. This gives us a browser-compatible visual reference and lets CI validate UVs, material assignments and image payloads before compression changes the delivery format.

KTX2 is the next delivery stage, not a label applied to PNG data. The ratified `KHR_texture_basisu` extension requires KTX2 images containing Basis Universal ETC1S or UASTC payloads. The existing runtime already has `KTX2Loader` and a self-hosted Basis transcoder, but the generated hero should only opt into that path after real KTX2 files are produced and validated.

## UV strategy

The current generated geometry is intentionally simple and procedural. V3 creates a planar UV projection per primitive using the two largest local-space extents. This is deterministic and sufficient for micro-detail/tread/weave maps without changing semantic nodes or LOD topology.

A future art-directed asset may replace these UVs with manually authored islands while keeping the same runtime contracts.

## CI gates

`validate-textured-assets.mjs` verifies:

- every primitive has `TEXCOORD_0`,
- UV accessors are FLOAT/VEC2,
- UV and POSITION vertex counts match,
- embedded images are PNG bufferViews,
- body paint has base-color and metallic/roughness textures,
- tire has a base-color texture,
- interior receives its texture wherever that material exists,
- optional per-asset embedded texture byte ceilings can be enforced from `showcase-asset-contracts.json`.

The existing semantic, material-extension, LOD triangle/byte, typecheck and production-build gates remain active.

## Evidence boundary

This stage proves authored texture data and UV plumbing. It does **not** prove:

- final photoreal art quality,
- KTX2/Basis compression quality or browser compatibility,
- mip-chain quality,
- GPU texture-memory savings,
- Meshopt encode/decode tradeoffs,
- physical-device frame-time targets.

Those remain separate measured tasks.
