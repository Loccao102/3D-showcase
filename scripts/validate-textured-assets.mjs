import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const CONTRACT_PATH = "scripts/showcase-asset-contracts.json";
const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;
const TEXTURE_SIZE_BY_LOD = [64, 32, 16];

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

function usedMaterialIndexes(document) {
  const indexes = new Set();
  for (const mesh of document.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      if (Number.isInteger(primitive.material)) indexes.add(primitive.material);
    }
  }
  return indexes;
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

const measurements = [];

for (const contract of contracts) {
  if (!contract.path?.endsWith(".glb")) continue;

  const lodMatch = /-lod([0-2])$/.exec(contract.id ?? "");
  assert(lodMatch, `${contract.id}: texture contract id must end in -lod0/-lod1/-lod2`);
  const lod = Number(lodMatch[1]);
  const bytes = await readFile(resolve(process.cwd(), contract.path));
  const document = parseGlbDocument(bytes, contract.path);

  assert(
    document.extras?.textureStage === "production-v4-texture-lod",
    `${contract.path}: missing V4 texture LOD stage marker`,
  );
  assert(document.extras?.textureLod === lod, `${contract.path}: textureLod marker must equal ${lod}`);
  assert(
    document.extras?.textureResolution === TEXTURE_SIZE_BY_LOD[lod],
    `${contract.path}: expected ${TEXTURE_SIZE_BY_LOD[lod]}px texture tier`,
  );
  const expectedTextureCount = lod === 2 ? 3 : 4;
  assert(
    document.extras?.textureCount === expectedTextureCount,
    `${contract.path}: expected ${expectedTextureCount} texture maps for LOD${lod}`,
  );
  assert(document.images?.length === expectedTextureCount, `${contract.path}: unexpected embedded image count`);
  assert(document.textures?.length === expectedTextureCount, `${contract.path}: unexpected glTF texture count`);
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
  validateTextureReference(document, body.pbrMetallicRoughness?.baseColorTexture, contract.path, "body baseColor");
  validateTextureReference(
    document,
    body.pbrMetallicRoughness?.metallicRoughnessTexture,
    contract.path,
    "body metallicRoughness",
  );
  validateTextureReference(document, tire.pbrMetallicRoughness?.baseColorTexture, contract.path, "tire baseColor");

  const usedMaterials = usedMaterialIndexes(document);
  const interiorIndex = document.materials?.findIndex((candidate) => candidate.name === "interior") ?? -1;
  const interior = interiorIndex >= 0 ? document.materials[interiorIndex] : undefined;
  if (interior && usedMaterials.has(interiorIndex)) {
    validateTextureReference(
      document,
      interior.pbrMetallicRoughness?.baseColorTexture,
      contract.path,
      "interior baseColor",
    );
  } else if (interior) {
    assert(
      interior.pbrMetallicRoughness?.baseColorTexture === undefined,
      `${contract.path}: unused interior material must not retain a mobile texture`,
    );
  }

  const uniqueImageViews = new Set((document.images ?? []).map((image) => image.bufferView));
  let textureBytes = 0;
  for (const viewIndex of uniqueImageViews) {
    assert(Number.isInteger(viewIndex), `${contract.path}: image is missing an embedded bufferView`);
    const view = document.bufferViews?.[viewIndex];
    assert(view && view.byteLength > 0, `${contract.path}: image bufferView ${viewIndex} is invalid`);
    textureBytes += view.byteLength;
  }

  if (contract.maxEmbeddedTextureBytes !== undefined) {
    assert(
      textureBytes <= contract.maxEmbeddedTextureBytes,
      `${contract.path}: ${textureBytes}B texture payload exceeds maxEmbeddedTextureBytes ${contract.maxEmbeddedTextureBytes}`,
    );
  }

  measurements.push({
    id: contract.id,
    groupId: contract.id.replace(/-lod[0-2]$/, ""),
    lod,
    textureBytes,
    textureCount: document.images.length,
    textureResolution: document.extras.textureResolution,
  });

  console.log(
    `✓ ${contract.id} texture LOD | ${document.extras.textureResolution}px maps=${document.images.length} payload=${textureBytes}B`,
  );
}

const groups = new Map();
for (const measurement of measurements) {
  const group = groups.get(measurement.groupId) ?? [];
  group.push(measurement);
  groups.set(measurement.groupId, group);
}

for (const [groupId, group] of groups) {
  if (group.length !== 3) continue;
  const sorted = group.sort((left, right) => left.lod - right.lod);
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    assert(
      current.textureBytes < previous.textureBytes,
      `${groupId}: LOD${current.lod} texture payload must be smaller than LOD${previous.lod}`,
    );
    assert(
      current.textureResolution < previous.textureResolution,
      `${groupId}: LOD${current.lod} texture resolution must be smaller than LOD${previous.lod}`,
    );
  }
  console.log(
    `✓ ${groupId} texture monotonicity | px ${sorted.map((item) => item.textureResolution).join(" > ")} | bytes ${sorted.map((item) => item.textureBytes).join(" > ")}`,
  );
}

console.log("Validated textured hero UV, material maps and texture LOD budgets.");
