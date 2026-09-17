# Texture LOD V4

The hero already had geometry LODs. V4 makes texture delivery follow the same rule instead of shipping the same texture payload to every viewport tier.

## Texture tiers

| Geometry LOD | Texture resolution | Maps |
| --- | ---: | --- |
| LOD0 | 64×64 | paint microflake, paint metallic/roughness, tire tread, interior weave |
| LOD1 | 32×32 | paint microflake, paint metallic/roughness, tire tread, interior weave |
| LOD2 | 16×16 | paint microflake, paint metallic/roughness, tire tread |

LOD2 intentionally omits the interior weave texture because the mobile geometry tier does not instantiate interior primitives. The material table may still contain an unused `interior` material, but it must not retain a texture reference.

## CI contract

`validate-textured-assets.mjs` now verifies both texture correctness and LOD behavior:

- V4 stage marker and LOD tier match the asset contract,
- texture resolution is exactly 64 / 32 / 16 for LOD0 / LOD1 / LOD2,
- map count is 4 / 4 / 3,
- every primitive still has valid `TEXCOORD_0`,
- only materials actually used by a tier are required to retain tier-specific textures,
- embedded image payload is measured from unique image bufferViews,
- texture payload and texture resolution must both decrease monotonically LOD0 → LOD1 → LOD2,
- per-asset `maxEmbeddedTextureBytes` remains available as a hard ceiling.

This gives mobile a real texture-memory/network reduction rather than geometry-only LOD.

## KTX2 boundary

V4 still uses PNG as the authored/reference source inside GLB. KTX2/Basis is a delivery transform to do next. The project should only declare `KHR_texture_basisu` after a real KTX2 encoder produces ETC1S/UASTC payloads and representative browsers load them successfully.
