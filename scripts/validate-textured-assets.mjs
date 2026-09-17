import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const CONTRACT_PATH = "scripts/showcase-texture-contracts.json";
const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function parseGlb(bytes, path) {
  assert(bytes.readUInt32LE(0) === GLB_MAGIC, `${path}: invalid GLB magic`);
  let offset = 12;
  let document;
  let binary;
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    offset += 8 + length;
    if (type === JSON_CHUNK) document = JSON.parse(chunk.toString("utf8").replace(/[\u0000\u0020]+$/g, ""));
    if (type === BIN_CHUNK) binary = chunk;
  }
  assert(document && binary, `${path}: GLB must contain JSON and BIN chunks`);
  return { document, binary };
}
function pngDimensions(bytes, path, name) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert(bytes.subarray(0, 8).equals(signature), `${path}: ${name} is not PNG`);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}
async function validate(contract) {
  const absolutePath = resolve(process.cwd(), contract.path);
  const bytes = await readFile(absolutePath);
  const { document, binary } = parseGlb(bytes, contract.path);

  const extensions = new Set(document.extensionsUsed ?? []);
  for (const extension of contract.requiredExtensionsUsed ?? []) {
    assert(extensions.has(extension), `${contract.path}: missing extension ${extension}`);
  }

  let primitiveCount = 0;
  for (const [meshIndex, mesh] of (document.meshes ?? []).entries()) {
    for (const [primitiveIndex, primitive] of (mesh.primitives ?? []).entries()) {
      primitiveCount += 1;
      const positionIndex = primitive.attributes?.POSITION;
      const uvIndex = primitive.attributes?.TEXCOORD_0;
      assert(Number.isInteger(uvIndex), `${contract.path}: mesh ${meshIndex} primitive ${primitiveIndex} missing TEXCOORD_0`);
      const position = document.accessors?.[positionIndex];
      const uv = document.accessors?.[uvIndex];
      assert(position && uv, `${contract.path}: invalid POSITION/TEXCOORD_0 accessor`);
      assert(uv.type === "VEC2" && uv.componentType === 5126, `${contract.path}: TEXCOORD_0 must be FLOAT VEC2`);
      assert(uv.count === position.count, `${contract.path}: TEXCOORD_0 vertex count must match POSITION`);
    }
  }
  assert(primitiveCount > 0, `${contract.path}: no mesh primitives`);

  const materials = new Map((document.materials ?? []).map((material) => [material.name, material]));
  const body = materials.get("body");
  assert(body, `${contract.path}: missing body material`);
  assert(Number.isInteger(body.pbrMetallicRoughness?.baseColorTexture?.index), `${contract.path}: body missing baseColorTexture`);
  assert(Number.isInteger(body.pbrMetallicRoughness?.metallicRoughnessTexture?.index), `${contract.path}: body missing metallicRoughnessTexture`);
  assert(Number.isInteger(body.normalTexture?.index), `${contract.path}: body missing normalTexture`);
  assert((body.extensions?.KHR_materials_clearcoat?.clearcoatFactor ?? 0) > 0, `${contract.path}: body missing clearcoat`);

  const glass = materials.get("glass");
  assert((glass?.extensions?.KHR_materials_transmission?.transmissionFactor ?? 0) > 0, `${contract.path}: glass missing transmission`);
  assert((glass?.extensions?.KHR_materials_ior?.ior ?? 0) > 1, `${contract.path}: glass missing IOR`);

  const images = document.images ?? [];
  assert(images.length >= (contract.minImages ?? 3), `${contract.path}: expected at least ${contract.minImages ?? 3} images`);
  let imageBytes = 0;
  for (const image of images) {
    assert(image.mimeType === "image/png", `${contract.path}: ${image.name ?? "image"} must use PNG fallback`);
    const view = document.bufferViews?.[image.bufferView];
    assert(view, `${contract.path}: ${image.name ?? "image"} missing embedded bufferView`);
    const start = view.byteOffset ?? 0;
    const payload = binary.subarray(start, start + view.byteLength);
    imageBytes += payload.length;
    const [width, height] = pngDimensions(payload, contract.path, image.name ?? "image");
    assert(width === contract.expectedTextureSize && height === contract.expectedTextureSize, `${contract.path}: ${image.name ?? "image"} expected ${contract.expectedTextureSize}x${contract.expectedTextureSize}, got ${width}x${height}`);
  }
  assert(imageBytes <= contract.maxEmbeddedImageBytes, `${contract.path}: embedded image bytes ${imageBytes} exceed ${contract.maxEmbeddedImageBytes}`);
  assert(bytes.length <= contract.maxNetworkBytes, `${contract.path}: GLB bytes ${bytes.length} exceed network ceiling ${contract.maxNetworkBytes}`);

  console.log(`✓ ${contract.path} | glb=${bytes.length}B images=${imageBytes}B textures=${images.length} primitives=${primitiveCount}`);
  return { path: contract.path, fileBytes: bytes.length, imageBytes };
}

const contracts = JSON.parse(await readFile(resolve(process.cwd(), CONTRACT_PATH), "utf8")).assets ?? [];
const results = [];
for (const contract of contracts) results.push(await validate(contract));
for (const prefix of ["astra-one-touring", "astra-one-sport"]) {
  const family = results.filter((result) => result.path.includes(prefix));
  assert(family.length === 3, `${prefix}: expected three LOD contracts`);
  assert(family[0].fileBytes > family[1].fileBytes && family[1].fileBytes > family[2].fileBytes, `${prefix}: GLB network bytes must decrease LOD0 -> LOD1 -> LOD2`);
  assert(family[0].imageBytes > family[1].imageBytes && family[1].imageBytes > family[2].imageBytes, `${prefix}: texture bytes must decrease LOD0 -> LOD1 -> LOD2`);
}
console.log(`Validated ${results.length} textured showcase assets.`);
