import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const modelDir = resolve(process.cwd(), process.argv[2] ?? "apps/web/public/models");
const ktxBin = process.env.KTX_BIN ?? "ktx";
const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;
const GLB_BIN_CHUNK = 0x004e4942;
const KTX_EXTENSION = "KHR_texture_basisu";
const KTX_VERSION = "4.4.2";

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
  assert(document.buffers?.length === 1, `${filePath}: expected one GLB buffer`);

  const declaredBytes = document.buffers[0].byteLength;
  assert(declaredBytes <= binary.byteLength, `${filePath}: declared buffer exceeds BIN chunk`);
  return { document, binary: Buffer.from(binary.subarray(0, declaredBytes)) };
}

function buildGlb(document, binary) {
  const paddedBinary = align4(binary);
  document.buffers[0].byteLength = binary.length;
  const json = align4(Buffer.from(JSON.stringify(document)), 0x20);
  const totalLength = 12 + 8 + json.length + 8 + paddedBinary.length;

  const header = Buffer.alloc(12);
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(json.length, 0);
  jsonHeader.writeUInt32LE(GLB_JSON_CHUNK, 4);

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(paddedBinary.length, 0);
  binHeader.writeUInt32LE(GLB_BIN_CHUNK, 4);

  return Buffer.concat([header, jsonHeader, json, binHeader, paddedBinary]);
}

function runKtx(args, label) {
  const result = spawnSync(ktxBin, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    throw new Error(`${label}: unable to execute '${ktxBin}': ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${label}: ktx exited ${result.status}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    );
  }
  return (result.stdout ?? "").trim();
}

function imageBytes(document, binary, image, fileName) {
  assert(Number.isInteger(image.bufferView), `${fileName}: image '${image.name}' must be embedded`);
  const view = document.bufferViews?.[image.bufferView];
  assert(view, `${fileName}: image '${image.name}' references missing bufferView`);
  const start = view.byteOffset ?? 0;
  return Buffer.from(binary.subarray(start, start + view.byteLength));
}

function isLinearTexture(name) {
  return name === "paint-metallic-roughness";
}

async function encodeImage(tempDir, image, pngBytes) {
  const safeName = (image.name ?? "texture").replace(/[^a-zA-Z0-9._-]/g, "-");
  const pngPath = join(tempDir, `${safeName}.png`);
  const ktxPath = join(tempDir, `${safeName}.ktx2`);
  await writeFile(pngPath, pngBytes);

  const linear = isLinearTexture(image.name);
  const args = [
    "create",
    "--format",
    linear ? "R8G8B8A8_UNORM" : "R8G8B8A8_SRGB",
    "--assign-tf",
    linear ? "linear" : "srgb",
    "--assign-primaries",
    linear ? "none" : "bt709",
    "--generate-mipmap",
    "--encode",
    "basis-lz",
    "--qlevel",
    "160",
    "--clevel",
    "2",
    "--threads",
    "1",
    pngPath,
    ktxPath,
  ];

  runKtx(args, `encode ${image.name}`);
  runKtx(
    ["validate", "--gltf-basisu", "--warnings-as-errors", ktxPath],
    `validate ${image.name}`,
  );
  return readFile(ktxPath);
}

function rebuildBufferViews(document, binary, replacements) {
  let rebuilt = Buffer.alloc(0);

  for (const [index, view] of (document.bufferViews ?? []).entries()) {
    const sourceStart = view.byteOffset ?? 0;
    const sourceBytes = binary.subarray(sourceStart, sourceStart + view.byteLength);
    const payload = replacements.get(index) ?? sourceBytes;

    rebuilt = align4(rebuilt);
    view.byteOffset = rebuilt.length;
    view.byteLength = payload.length;
    rebuilt = Buffer.concat([rebuilt, payload]);
  }

  return rebuilt;
}

function addRequiredExtension(document, extension) {
  document.extensionsUsed = [...new Set([...(document.extensionsUsed ?? []), extension])];
  document.extensionsRequired = [
    ...new Set([...(document.extensionsRequired ?? []), extension]),
  ];
}

async function promoteAsset(fileName) {
  const sourcePath = resolve(modelDir, fileName);
  const outputPath = resolve(modelDir, fileName.replace(/\.glb$/, "-ktx2.glb"));
  const sourceBytes = await readFile(sourcePath);
  const { document, binary } = parseGlb(sourceBytes, fileName);

  assert(
    document.extras?.textureStage === "production-v4-texture-lod",
    `${fileName}: source must pass through V4 PNG texture stage before KTX2 promotion`,
  );
  assert(document.images?.length > 0, `${fileName}: no embedded PNG images to promote`);

  const tempDir = await mkdtemp(join(tmpdir(), "showcase-ktx2-"));
  const replacements = new Map();
  let ktxPayloadBytes = 0;

  try {
    for (const image of document.images) {
      assert(image.mimeType === "image/png", `${fileName}: image '${image.name}' must be PNG source`);
      const pngBytes = imageBytes(document, binary, image, fileName);
      const ktxBytes = await encodeImage(tempDir, image, pngBytes);
      replacements.set(image.bufferView, ktxBytes);
      ktxPayloadBytes += ktxBytes.length;
      image.mimeType = "image/ktx2";
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }

  for (const texture of document.textures ?? []) {
    assert(Number.isInteger(texture.source), `${fileName}: texture '${texture.name}' has no PNG source`);
    texture.extensions ??= {};
    texture.extensions[KTX_EXTENSION] = { source: texture.source };
    delete texture.source;
  }

  addRequiredExtension(document, KTX_EXTENSION);
  document.extras ??= {};
  document.extras.textureStage = "production-v5-ktx2-basis-lz";
  document.extras.textureEncoding = "basis-lz";
  document.extras.textureEncoder = `KTX-Software ${KTX_VERSION}`;
  document.extras.textureSourceStage = "production-v4-texture-lod";
  document.extras.ktxPayloadBytes = ktxPayloadBytes;

  const rebuiltBinary = rebuildBufferViews(document, binary, replacements);
  const output = buildGlb(document, rebuiltBinary);
  await writeFile(outputPath, output);

  console.log(
    `ktx2 ${basename(outputPath)} | source=${sourceBytes.length}B runtime=${output.length}B ktx=${ktxPayloadBytes}B maps=${document.images.length}`,
  );
}

runKtx(["--version"], "KTX version check");

for (const variant of ["touring", "sport"]) {
  for (const lod of [0, 1, 2]) {
    await promoteAsset(`astra-one-${variant}-lod${lod}.glb`);
  }
}
