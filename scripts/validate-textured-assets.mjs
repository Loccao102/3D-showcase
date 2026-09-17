import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const CONTRACT_PATH = "scripts/showcase-asset-contracts.json";
const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseGlbDocument(bytes, filePath) {
  assert(bytes.byteLength >= 20, `${filePath}: GLB is too small`);
  assert(bytes.readUInt32LE(0) === GLB_MAGIC, `${filePath}: invalid GLB magic`);
  assert(bytes.readUInt32LE(4) === 2, `${filePath}: GLB version must be 2`);

  let offset = 12;
  while (offset < bytes.byteLength) {
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    offset += 8;
    const chunk = bytes.subarray(offset, offset + chunkLength);
    offset += chunkLength;
    if (chunkType === GLB_JSON_CHUNK) {
      return JSON.parse(chunk.toString("utf8").replace(/[\u0000\u0020]+$/g, ""));
    }
  }

  throw new Error(`${filePath}: missing GLB JSON chunk`);
}

function findMaterial(document, name, filePath) {
  const material = document.materials?.find((candidate) => candidate.name === name);
  assert(material, `${filePath}: missing material '${name}'`);
  return material;
}

function validateTextureReference(document, textureInfo, filePath, label) {
  assert(textureInfo && Number.isInteger(textureInfo.index), `${filePath}: ${label} texture is missing`);
  const texture = document.textures?.[textureInfo.index];
  assert(texture, `${filePath}: ${label} references missing texture ${textureInfo.index}`);
  assert(Number.isInteger(texture.source), `${filePath}: ${label} texture has no source image`);
  const image = document.images?.[texture.source];
  assert(image, `${filePath}: ${label} references missing image ${texture.source}`);
  assert(image.mimeType === "image/png", `${filePath}: ${label} image must be embedded PNG before KTX2 promotion`);
  assert(Number.isInteger(image.bufferView), `${filePath}: ${label} image must be embedded in a bufferView`);
  const view = document.bufferViews?.[image.bufferView];
  assert(view && view.byteLength > 0, `${filePath}: ${label} image bufferView is invalid`);
  return view.byteLength;
}

const contracts = JSON.parse(
  await readFile(resolve(process.cwd(), CONTRACT_PATH), "utf8"),
).assets ?? [];

for (const contract of contracts) {
  if (!contract.path?.endsWith(".glb")) continue;

  const bytes = await readFile(resolve(process.cwd(), contract.path));
  const document = parseGlbDocument(bytes, contract.path);

  assert(
    document.extras?.textureStage === "production-v3-embedded-png",
    `${contract.path}: missing V3 texture stage marker`,
  );
  assert(document.images?.length >= 4, `${contract.path}: expected at least four embedded texture images`);
  assert(document.textures?.length >= 4, `${contract.path}: expected at least four glTF textures`);
  assert(document.samplers?.length >= 1, `${contract.path}: expected a texture sampler`);

  for (const [meshIndex, mesh] of (document.meshes ?? []).entries()) {
    for (const [primitiveIndex, primitive] of (mesh.primitives ?? []).entries()) {
      const positionIndex = primitive.attributes?.POSITION;
      const uvIndex = primitive.attributes?.TEXCOORD_0;
      assert(Number.isInteger(positionIndex), `${contract.path}: mesh ${meshIndex}/${primitiveIndex} has no POSITION`);
      assert(Number.isInteger(uvIndex), `${contract.path}: mesh ${meshIndex}/${primitiveIndex} has no TEXCOORD_0`);
      const position = document.accessors?.[positionIndex];
      const uv = document.accessors?.[uvIndex];
      assert(position && uv, `${contract.path}: mesh ${meshIndex}/${primitiveIndex} has invalid accessors`);
      assert(uv.componentType === 5126, `${contract.path}: TEXCOORD_0 must use FLOAT`);
      assert(uv.type === "VEC2", `${contract.path}: TEXCOORD_0 must be VEC2`);
      assert(uv.count === position.count, `${contract.path}: TEXCOORD_0 count must match POSITION count`);
    }
  }

  const body = findMaterial(document, "body", contract.path);
  const tire = findMaterial(document, "tire", contract.path);
  let textureBytes = 0;
  textureBytes += validateTextureReference(
    document,
    body.pbrMetallicRoughness?.baseColorTexture,
    contract.path,
    "body baseColor",
  );
  textureBytes += validateTextureReference(
    document,
    body.pbrMetallicRoughness?.metallicRoughnessTexture,
    contract.path,
    "body metallicRoughness",
  );
  textureBytes += validateTextureReference(
    document,
    tire.pbrMetallicRoughness?.baseColorTexture,
    contract.path,
    "tire baseColor",
  );

  const interior = document.materials?.find((candidate) => candidate.name === "interior");
  if (interior) {
    textureBytes += validateTextureReference(
      document,
      interior.pbrMetallicRoughness?.baseColorTexture,
      contract.path,
      "interior baseColor",
    );
  }

  if (contract.maxEmbeddedTextureBytes !== undefined) {
    assert(
      textureBytes <= contract.maxEmbeddedTextureBytes,
      `${contract.path}: ${textureBytes}B referenced texture payload exceeds maxEmbeddedTextureBytes ${contract.maxEmbeddedTextureBytes}`,
    );
  }

  console.log(
    `✓ ${contract.id} texture contract | images=${document.images.length} textures=${document.textures.length} referenced=${textureBytes}B`,
  );
}

console.log("Validated textured hero UV and embedded PNG contracts.");
