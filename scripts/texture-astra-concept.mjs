import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const modelDir = resolve(process.cwd(), process.argv[2] ?? "apps/web/public/models");
const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;
const GLB_BIN_CHUNK = 0x004e4942;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function align4(buffer, fill = 0) {
  const pad = (4 - (buffer.length % 4)) % 4;
  return pad ? Buffer.concat([buffer, Buffer.alloc(pad, fill)]) : buffer;
}

function parseGlb(bytes, filePath) {
  assert(bytes.byteLength >= 20, `${filePath}: GLB is too small`);
  assert(bytes.readUInt32LE(0) === GLB_MAGIC, `${filePath}: invalid GLB magic`);
  assert(bytes.readUInt32LE(4) === 2, `${filePath}: GLB version must be 2`);
  assert(bytes.readUInt32LE(8) === bytes.byteLength, `${filePath}: GLB length header mismatch`);

  let offset = 12;
  let document;
  let binary;

  while (offset < bytes.byteLength) {
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    offset += 8;
    const chunk = bytes.subarray(offset, offset + chunkLength);
    offset += chunkLength;

    if (chunkType === GLB_JSON_CHUNK) {
      document = JSON.parse(chunk.toString("utf8").replace(/[\u0000\u0020]+$/g, ""));
    } else if (chunkType === GLB_BIN_CHUNK) {
      binary = Buffer.from(chunk);
    }
  }

  assert(document, `${filePath}: missing JSON chunk`);
  assert(binary, `${filePath}: missing BIN chunk`);
  assert(document.buffers?.length === 1, `${filePath}: expected exactly one GLB buffer`);

  const declaredBytes = document.buffers[0].byteLength;
  assert(declaredBytes <= binary.byteLength, `${filePath}: declared buffer exceeds BIN chunk`);

  return {
    document,
    binary: Buffer.from(binary.subarray(0, declaredBytes)),
  };
}

function packFloats(values) {
  const buffer = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => buffer.writeFloatLE(value, index * 4));
  return buffer;
}

function readVec3Accessor(document, binary, accessorIndex, filePath) {
  const accessor = document.accessors?.[accessorIndex];
  assert(accessor, `${filePath}: missing accessor ${accessorIndex}`);
  assert(accessor.componentType === 5126, `${filePath}: POSITION accessor must use FLOAT`);
  assert(accessor.type === "VEC3", `${filePath}: POSITION accessor must be VEC3`);
  const view = document.bufferViews?.[accessor.bufferView];
  assert(view, `${filePath}: POSITION accessor is missing bufferView`);
  const stride = view.byteStride ?? 12;
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const values = [];

  for (let index = 0; index < accessor.count; index += 1) {
    const offset = start + index * stride;
    values.push([
      binary.readFloatLE(offset),
      binary.readFloatLE(offset + 4),
      binary.readFloatLE(offset + 8),
    ]);
  }

  return values;
}

function createPlanarUvs(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const position of positions) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], position[axis]);
      max[axis] = Math.max(max[axis], position[axis]);
    }
  }

  const axes = [0, 1, 2].sort(
    (left, right) => (max[right] - min[right]) - (max[left] - min[left]),
  );
  const [uAxis, vAxis] = axes;
  const uRange = Math.max(1e-6, max[uAxis] - min[uAxis]);
  const vRange = Math.max(1e-6, max[vAxis] - min[vAxis]);
  const uvs = [];

  for (const position of positions) {
    uvs.push(
      (position[uAxis] - min[uAxis]) / uRange,
      (position[vAxis] - min[vAxis]) / vRange,
    );
  }

  return uvs;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function makePng(width, height, pixel) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    raw[offset++] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a = 255] = pixel(x, y);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function hashNoise(x, y, seed) {
  let value = Math.imul(x + 17 + seed, 0x45d9f3b) ^ Math.imul(y + 31, 0x119de1f3);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 0xffffffff;
}

const textureImages = [
  {
    name: "paint-microflake",
    bytes: makePng(64, 64, (x, y) => {
      const grain = hashNoise(x, y, 11);
      const sparkle = hashNoise(x, y, 73) > 0.982 ? 24 : 0;
      const value = Math.min(255, 222 + Math.round(grain * 20) + sparkle);
      return [value, value, Math.min(255, value + 3), 255];
    }),
  },
  {
    name: "paint-metallic-roughness",
    bytes: makePng(64, 64, (x, y) => {
      const grain = hashNoise(x, y, 29);
      const roughness = 174 + Math.round(grain * 34);
      const metallic = 222 + Math.round(hashNoise(x, y, 47) * 22);
      return [255, roughness, metallic, 255];
    }),
  },
  {
    name: "interior-weave",
    bytes: makePng(64, 64, (x, y) => {
      const weave = ((x + y) % 8 < 2 || (x - y + 64) % 8 < 2) ? 214 : 238;
      const grain = Math.round(hashNoise(x, y, 101) * 8);
      const value = Math.max(0, weave - grain);
      return [value, value, value, 255];
    }),
  },
  {
    name: "tire-tread",
    bytes: makePng(64, 64, (x, y) => {
      const groove = ((x + y * 2) % 14 < 4) || ((x - y * 2 + 256) % 19 < 3);
      const base = groove ? 172 : 226;
      const value = Math.max(0, base - Math.round(hashNoise(x, y, 151) * 14));
      return [value, value, value, 255];
    }),
  },
];

function buildGlb(document, binary) {
  const logicalBinary = align4(binary);
  document.buffers[0].byteLength = binary.length;
  const json = align4(Buffer.from(JSON.stringify(document)), 0x20);
  const totalLength = 12 + 8 + json.length + 8 + logicalBinary.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(json.length, 0);
  jsonHeader.writeUInt32LE(GLB_JSON_CHUNK, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(logicalBinary.length, 0);
  binHeader.writeUInt32LE(GLB_BIN_CHUNK, 4);
  return Buffer.concat([header, jsonHeader, json, binHeader, logicalBinary]);
}

function findMaterial(document, name, filePath) {
  const material = document.materials?.find((candidate) => candidate.name === name);
  assert(material, `${filePath}: missing material '${name}'`);
  return material;
}

async function textureAsset(fileName) {
  const filePath = resolve(modelDir, fileName);
  const bytes = await readFile(filePath);
  const { document, binary: initialBinary } = parseGlb(bytes, fileName);
  let binary = initialBinary;

  document.bufferViews ??= [];
  document.accessors ??= [];
  document.images ??= [];
  document.textures ??= [];
  document.samplers ??= [];

  const appendBufferView = (payload, target) => {
    binary = align4(binary);
    const byteOffset = binary.length;
    binary = Buffer.concat([binary, payload]);
    const view = { buffer: 0, byteOffset, byteLength: payload.length };
    if (target !== undefined) view.target = target;
    return document.bufferViews.push(view) - 1;
  };

  for (const mesh of document.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      if (primitive.attributes?.TEXCOORD_0 !== undefined) continue;
      const positionAccessorIndex = primitive.attributes?.POSITION;
      assert(positionAccessorIndex !== undefined, `${fileName}: mesh '${mesh.name}' has no POSITION accessor`);
      const positions = readVec3Accessor(document, binary, positionAccessorIndex, fileName);
      const uvBytes = packFloats(createPlanarUvs(positions));
      const viewIndex = appendBufferView(uvBytes, 34962);
      const uvAccessorIndex = document.accessors.push({
        bufferView: viewIndex,
        componentType: 5126,
        count: positions.length,
        type: "VEC2",
        min: [0, 0],
        max: [1, 1],
      }) - 1;
      primitive.attributes.TEXCOORD_0 = uvAccessorIndex;
    }
  }

  const samplerIndex = document.samplers.push({
    magFilter: 9729,
    minFilter: 9987,
    wrapS: 10497,
    wrapT: 10497,
  }) - 1;

  const textureIndexes = new Map();
  for (const textureImage of textureImages) {
    const viewIndex = appendBufferView(textureImage.bytes);
    const imageIndex = document.images.push({
      name: textureImage.name,
      bufferView: viewIndex,
      mimeType: "image/png",
    }) - 1;
    const textureIndex = document.textures.push({
      name: textureImage.name,
      sampler: samplerIndex,
      source: imageIndex,
    }) - 1;
    textureIndexes.set(textureImage.name, textureIndex);
  }

  const body = findMaterial(document, "body", fileName);
  body.pbrMetallicRoughness.baseColorTexture = { index: textureIndexes.get("paint-microflake") };
  body.pbrMetallicRoughness.metallicRoughnessTexture = {
    index: textureIndexes.get("paint-metallic-roughness"),
  };

  const tire = findMaterial(document, "tire", fileName);
  tire.pbrMetallicRoughness.baseColorTexture = { index: textureIndexes.get("tire-tread") };

  const interior = document.materials?.find((candidate) => candidate.name === "interior");
  if (interior) {
    interior.pbrMetallicRoughness.baseColorTexture = { index: textureIndexes.get("interior-weave") };
  }

  document.extras ??= {};
  document.extras.textureStage = "production-v3-embedded-png";
  document.extras.textureOwnership = "self-authored-procedural";
  document.extras.textureCount = textureImages.length;
  document.extras.uvStrategy = "generated-planar-per-primitive";

  const output = buildGlb(document, binary);
  await writeFile(filePath, output);
  console.log(
    `textured ${fileName} (${bytes.length}B -> ${output.length}B, ${textureImages.length} embedded PNG maps)`,
  );
}

for (const variant of ["touring", "sport"]) {
  for (const lod of [0, 1, 2]) {
    await textureAsset(`astra-one-${variant}-lod${lod}.glb`);
  }
}
