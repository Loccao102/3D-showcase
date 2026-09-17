import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const modelDir = resolve(process.cwd(), process.argv[2] ?? "apps/web/public/models");
const textureDir = resolve(process.cwd(), process.argv[3] ?? "apps/web/public/textures/astra");
await mkdir(textureDir, { recursive: true });

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function align4(buffer) {
  const pad = (4 - (buffer.length % 4)) % 4;
  return pad ? Buffer.concat([buffer, Buffer.alloc(pad)]) : buffer;
}
function padJson(buffer) {
  const pad = (4 - (buffer.length % 4)) % 4;
  return pad ? Buffer.concat([buffer, Buffer.alloc(pad, 0x20)]) : buffer;
}
function packFloats(values) {
  const buffer = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => buffer.writeFloatLE(value, index * 4));
  return buffer;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const header = Buffer.alloc(4);
  header.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([header, typeBuffer, data, crc]);
}
function makePng(width, height, pixel) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    raw[offset++] = 0;
    for (let x = 0; x < width; x += 1) {
      const rgba = pixel(x, y, width, height);
      raw[offset++] = rgba[0]; raw[offset++] = rgba[1]; raw[offset++] = rgba[2]; raw[offset++] = rgba[3] ?? 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}
function hash2d(x, y, seed) {
  let value = Math.imul(x + seed * 17, 374761393) ^ Math.imul(y + seed * 31, 668265263);
  value = (value ^ (value >>> 13)) >>> 0;
  value = Math.imul(value, 1274126177) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
}
function createTextureSet(lod) {
  const size = [128, 64, 32][lod];
  const paint = makePng(size, size, (x, y) => {
    const n = hash2d(x, y, 11);
    const sparkle = n > 0.965 ? 26 : Math.round((n - 0.5) * 10);
    const sweep = Math.round(8 * Math.sin((x / size) * Math.PI * 6 + y * 0.035));
    const value = Math.max(188, Math.min(255, 228 + sparkle + sweep));
    return [value, value, Math.min(255, value + 4), 255];
  });
  const orm = makePng(size, size, (x, y) => {
    const n = hash2d(x, y, 29);
    return [255, Math.round(62 + (n - 0.5) * 24), Math.round(242 + (n - 0.5) * 14), 255];
  });
  const normal = makePng(size, size, (x, y) => [
    128 + Math.round((hash2d(x, y, 47) - 0.5) * 10),
    128 + Math.round((hash2d(x, y, 53) - 0.5) * 10),
    255,
    255,
  ]);
  return { size, paint, orm, normal };
}

function parseGlb(bytes, fileName) {
  if (bytes.readUInt32LE(0) !== GLB_MAGIC || bytes.readUInt32LE(4) !== 2) throw new Error(`${fileName}: invalid GLB`);
  let offset = 12;
  let json;
  let bin = Buffer.alloc(0);
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    offset += 8 + length;
    if (type === JSON_CHUNK) json = JSON.parse(chunk.toString("utf8").replace(/[\u0000\u0020]+$/g, ""));
    if (type === BIN_CHUNK) bin = Buffer.from(chunk);
  }
  if (!json) throw new Error(`${fileName}: missing JSON chunk`);
  return { document: json, binary: bin };
}
function buildGlb(document, binary) {
  const paddedBinary = align4(binary);
  document.buffers = [{ byteLength: binary.length }];
  const json = padJson(Buffer.from(JSON.stringify(document)));
  const totalLength = 12 + 8 + json.length + 8 + paddedBinary.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(GLB_MAGIC, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(json.length, 0); jsonHeader.writeUInt32LE(JSON_CHUNK, 4);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(paddedBinary.length, 0); binHeader.writeUInt32LE(BIN_CHUNK, 4);
  return Buffer.concat([header, jsonHeader, json, binHeader, paddedBinary]);
}
function readPositions(document, binary, accessorIndex) {
  const accessor = document.accessors[accessorIndex];
  const view = document.bufferViews[accessor.bufferView];
  if (accessor.componentType !== 5126 || accessor.type !== "VEC3") throw new Error(`POSITION accessor ${accessorIndex} is not FLOAT VEC3`);
  const base = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride ?? 12;
  const values = [];
  for (let i = 0; i < accessor.count; i += 1) {
    const at = base + i * stride;
    values.push([binary.readFloatLE(at), binary.readFloatLE(at + 4), binary.readFloatLE(at + 8)]);
  }
  return values;
}
function planarUvs(positions) {
  const min = [Infinity, Infinity];
  const max = [-Infinity, -Infinity];
  for (const [x, y] of positions) {
    min[0] = Math.min(min[0], x); min[1] = Math.min(min[1], y);
    max[0] = Math.max(max[0], x); max[1] = Math.max(max[1], y);
  }
  const dx = max[0] - min[0] || 1;
  const dy = max[1] - min[1] || 1;
  return positions.flatMap(([x, y]) => [(x - min[0]) / dx, (y - min[1]) / dy]);
}

async function enhance(fileName, lod, textureSet) {
  const path = resolve(modelDir, fileName);
  const { document, binary: originalBinary } = parseGlb(await readFile(path), fileName);
  let binary = Buffer.from(originalBinary.subarray(0, document.buffers?.[0]?.byteLength ?? originalBinary.length));
  document.accessors ??= []; document.bufferViews ??= []; document.images = []; document.textures = []; document.samplers = [];

  const appendBufferView = (bytes, target) => {
    binary = align4(binary);
    const byteOffset = binary.length;
    binary = Buffer.concat([binary, bytes]);
    const view = { buffer: 0, byteOffset, byteLength: bytes.length };
    if (target) view.target = target;
    return document.bufferViews.push(view) - 1;
  };
  const appendUvAccessor = (positions) => {
    const uvs = planarUvs(positions);
    const bufferView = appendBufferView(packFloats(uvs), 34962);
    return document.accessors.push({ bufferView, componentType: 5126, count: positions.length, type: "VEC2", min: [0, 0], max: [1, 1] }) - 1;
  };

  const uvByPositionAccessor = new Map();
  for (const mesh of document.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const positionAccessor = primitive.attributes?.POSITION;
      if (!Number.isInteger(positionAccessor)) continue;
      let uvAccessor = uvByPositionAccessor.get(positionAccessor);
      if (uvAccessor === undefined) {
        uvAccessor = appendUvAccessor(readPositions(document, originalBinary, positionAccessor));
        uvByPositionAccessor.set(positionAccessor, uvAccessor);
      }
      primitive.attributes.TEXCOORD_0 = uvAccessor;
    }
  }

  document.samplers.push({ name: "SAMPLER_astra", magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 });
  for (const [name, bytes] of [["IMG_paint", textureSet.paint], ["IMG_orm", textureSet.orm], ["IMG_normal", textureSet.normal]]) {
    const bufferView = appendBufferView(bytes);
    const source = document.images.push({ name, mimeType: "image/png", bufferView }) - 1;
    document.textures.push({ name: name.replace("IMG_", "TEX_"), sampler: 0, source });
  }

  const body = (document.materials ?? []).find((material) => material.name === "body");
  if (!body) throw new Error(`${fileName}: missing body material`);
  body.pbrMetallicRoughness ??= {};
  body.pbrMetallicRoughness.baseColorTexture = { index: 0 };
  body.pbrMetallicRoughness.metallicRoughnessTexture = { index: 1 };
  body.pbrMetallicRoughness.metallicFactor = 0.82;
  body.pbrMetallicRoughness.roughnessFactor = 0.34;
  body.normalTexture = { index: 2, scale: 0.22 };
  body.extensions = { ...(body.extensions ?? {}), KHR_materials_clearcoat: { clearcoatFactor: 0.9, clearcoatRoughnessFactor: 0.1 } };

  const glass = (document.materials ?? []).find((material) => material.name === "glass");
  if (glass) {
    glass.pbrMetallicRoughness ??= {};
    glass.pbrMetallicRoughness.baseColorFactor = [0.04, 0.08, 0.11, 1];
    glass.pbrMetallicRoughness.metallicFactor = 0.02;
    glass.pbrMetallicRoughness.roughnessFactor = 0.08;
    glass.doubleSided = true;
    glass.extensions = { ...(glass.extensions ?? {}), KHR_materials_transmission: { transmissionFactor: 0.68 }, KHR_materials_ior: { ior: 1.45 } };
  }

  const extensions = new Set(document.extensionsUsed ?? []);
  ["KHR_materials_clearcoat", "KHR_materials_transmission", "KHR_materials_ior"].forEach((name) => extensions.add(name));
  document.extensionsUsed = [...extensions];
  document.asset.generator = "OpenAI self-authored Astra One concept generator v2 textured pipeline";
  document.extras = { ...(document.extras ?? {}), texturePipeline: "procedural-png-v1", textureSize: textureSet.size, ktx2Ready: true };

  const output = buildGlb(document, binary);
  await writeFile(path, output);
  console.log(`textured ${fileName} (${output.length} bytes, ${textureSet.size}x${textureSet.size})`);
}

const textureSets = [];
for (const lod of [0, 1, 2]) {
  const set = createTextureSet(lod);
  textureSets[lod] = set;
  await Promise.all([
    writeFile(resolve(textureDir, `astra-paint-lod${lod}.png`), set.paint),
    writeFile(resolve(textureDir, `astra-orm-lod${lod}.png`), set.orm),
    writeFile(resolve(textureDir, `astra-normal-lod${lod}.png`), set.normal),
  ]);
}
for (const variant of ["touring", "sport"]) {
  for (const lod of [0, 1, 2]) await enhance(`astra-one-${variant}-lod${lod}.glb`, lod, textureSets[lod]);
}
