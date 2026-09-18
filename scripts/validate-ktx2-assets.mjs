import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const CONTRACT_PATH = "scripts/showcase-asset-contracts.json";
const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;
const GLB_BIN_CHUNK = 0x004e4942;
const KTX_EXTENSION = "KHR_texture_basisu";
const KTX2_IDENTIFIER = Buffer.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]);
const TEXTURE_SIZE_BY_LOD = [64, 32, 16];

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  return { document, binary };
}

function sortedNames(values) {
  return (values ?? []).map((value) => value?.name).filter(Boolean).sort();
}

function assertSameNames(sourceDocument, runtimeDocument, key, filePath) {
  const source = JSON.stringify(sortedNames(sourceDocument[key]));
  const runtime = JSON.stringify(sortedNames(runtimeDocument[key]));
  assert(source === runtime, `${filePath}: ${key} semantic names changed during KTX2 promotion`);
}

function bufferViewBytes(document, binary, bufferViewIndex, filePath) {
  const view = document.bufferViews?.[bufferViewIndex];
  assert(view, `${filePath}: missing bufferView ${bufferViewIndex}`);
  const start = view.byteOffset ?? 0;
  const end = start + view.byteLength;
  assert(end <= binary.length, `${filePath}: bufferView ${bufferViewIndex} exceeds BIN chunk`);
  return binary.subarray(start, end);
}

function validateKtx2(bytes, filePath, imageName, expectedSize) {
  assert(bytes.length >= 68, `${filePath}: image '${imageName}' KTX2 payload too small`);
  assert(
    bytes.subarray(0, KTX2_IDENTIFIER.length).equals(KTX2_IDENTIFIER),
    `${filePath}: image '${imageName}' has invalid KTX2 identifier`,
  );

  const vkFormat = bytes.readUInt32LE(12);
  const typeSize = bytes.readUInt32LE(16);
  const pixelWidth = bytes.readUInt32LE(20);
  const pixelHeight = bytes.readUInt32LE(24);
  const pixelDepth = bytes.readUInt32LE(28);
  const layerCount = bytes.readUInt32LE(32);
  const faceCount = bytes.readUInt32LE(36);
  const levelCount = bytes.readUInt32LE(40);
  const supercompressionScheme = bytes.readUInt32LE(44);
  const expectedLevels = Math.floor(Math.log2(expectedSize)) + 1;

  assert(vkFormat === 0, `${filePath}: image '${imageName}' BasisLZ vkFormat must be undefined (0)`);
  assert(typeSize === 1, `${filePath}: image '${imageName}' typeSize must be 1`);
  assert(pixelWidth === expectedSize && pixelHeight === expectedSize, `${filePath}: image '${imageName}' expected ${expectedSize}x${expectedSize}, got ${pixelWidth}x${pixelHeight}`);
  assert(pixelDepth === 0, `${filePath}: image '${imageName}' must be 2D`);
  assert(layerCount === 0, `${filePath}: image '${imageName}' must not be an array texture`);
  assert(faceCount === 1, `${filePath}: image '${imageName}' faceCount must be 1`);
  assert(levelCount === expectedLevels, `${filePath}: image '${imageName}' expected ${expectedLevels} mip levels, got ${levelCount}`);
  assert(supercompressionScheme === 1, `${filePath}: image '${imageName}' must use BasisLZ supercompression`);
}

const contracts = JSON.parse(
  await readFile(resolve(process.cwd(), CONTRACT_PATH), "utf8"),
).assets ?? [];

const measurements = [];

for (const contract of contracts) {
  if (!contract.path?.endsWith(".glb")) continue;

  const lodMatch = /-lod([0-2])$/.exec(contract.id ?? "");
  assert(lodMatch, `${contract.id}: KTX2 contract id must end in -lod0/-lod1/-lod2`);
  const lod = Number(lodMatch[1]);
  const expectedSize = TEXTURE_SIZE_BY_LOD[lod];
  const expectedTextureCount = lod === 2 ? 3 : 4;

  const sourcePath = resolve(process.cwd(), contract.path);
  const runtimePath = sourcePath.replace(/\.glb$/, "-ktx2.glb");
  const [sourceBytes, runtimeBytes] = await Promise.all([
    readFile(sourcePath),
    readFile(runtimePath),
  ]);
  const source = parseGlb(sourceBytes, contract.path);
  const runtimeLabel = contract.path.replace(/\.glb$/, "-ktx2.glb");
  const runtime = parseGlb(runtimeBytes, runtimeLabel);
  const document = runtime.document;

  assert(
    document.extras?.textureStage === "production-v5-ktx2-basis-lz",
    `${runtimeLabel}: missing V5 KTX2 stage marker`,
  );
  assert(document.extras?.textureEncoding === "basis-lz", `${runtimeLabel}: textureEncoding must be basis-lz`);
  assert((document.extensionsUsed ?? []).includes(KTX_EXTENSION), `${runtimeLabel}: ${KTX_EXTENSION} missing from extensionsUsed`);
  assert((document.extensionsRequired ?? []).includes(KTX_EXTENSION), `${runtimeLabel}: ${KTX_EXTENSION} missing from extensionsRequired`);
  assert(document.images?.length === expectedTextureCount, `${runtimeLabel}: expected ${expectedTextureCount} KTX2 images`);
  assert(document.textures?.length === expectedTextureCount, `${runtimeLabel}: expected ${expectedTextureCount} texture objects`);

  assertSameNames(source.document, document, "nodes", runtimeLabel);
  assertSameNames(source.document, document, "meshes", runtimeLabel);
  assertSameNames(source.document, document, "materials", runtimeLabel);
  assertSameNames(source.document, document, "animations", runtimeLabel);
  assert(source.document.accessors?.length === document.accessors?.length, `${runtimeLabel}: accessor count changed during promotion`);

  let ktxPayloadBytes = 0;
  for (const image of document.images ?? []) {
    assert(image.mimeType === "image/ktx2", `${runtimeLabel}: image '${image.name}' must use image/ktx2`);
    assert(Number.isInteger(image.bufferView), `${runtimeLabel}: image '${image.name}' must be embedded`);
    const bytes = bufferViewBytes(document, runtime.binary, image.bufferView, runtimeLabel);
    validateKtx2(bytes, runtimeLabel, image.name, expectedSize);
    ktxPayloadBytes += bytes.length;
  }

  for (const texture of document.textures ?? []) {
    assert(texture.source === undefined, `${runtimeLabel}: texture '${texture.name}' must not retain PNG fallback source`);
    const basisSource = texture.extensions?.[KTX_EXTENSION]?.source;
    assert(Number.isInteger(basisSource), `${runtimeLabel}: texture '${texture.name}' missing ${KTX_EXTENSION}.source`);
    assert(document.images?.[basisSource], `${runtimeLabel}: texture '${texture.name}' references missing KTX2 image`);
  }

  assert(
    document.extras?.ktxPayloadBytes === ktxPayloadBytes,
    `${runtimeLabel}: ktxPayloadBytes marker does not match embedded payload`,
  );

  if (contract.maxKtx2FileBytes !== undefined) {
    assert(
      runtimeBytes.length <= contract.maxKtx2FileBytes,
      `${runtimeLabel}: ${runtimeBytes.length}B exceeds maxKtx2FileBytes ${contract.maxKtx2FileBytes}`,
    );
  }
  if (contract.maxKtx2PayloadBytes !== undefined) {
    assert(
      ktxPayloadBytes <= contract.maxKtx2PayloadBytes,
      `${runtimeLabel}: ${ktxPayloadBytes}B exceeds maxKtx2PayloadBytes ${contract.maxKtx2PayloadBytes}`,
    );
  }

  measurements.push({
    variant: contract.id.includes("sport") ? "sport" : "touring",
    lod,
    runtimeBytes: runtimeBytes.length,
    ktxPayloadBytes,
  });

  console.log(
    `✓ ${contract.id} KTX2 | runtime=${runtimeBytes.length}B ktx=${ktxPayloadBytes}B maps=${expectedTextureCount} ${expectedSize}px`,
  );
}

for (const variant of ["touring", "sport"]) {
  const tiers = measurements
    .filter((measurement) => measurement.variant === variant)
    .sort((a, b) => a.lod - b.lod);

  assert(tiers.length === 3, `${variant}: expected three KTX2 LOD measurements`);
  assert(
    tiers[0].runtimeBytes > tiers[1].runtimeBytes && tiers[1].runtimeBytes > tiers[2].runtimeBytes,
    `${variant}: KTX2 runtime GLB bytes must decrease LOD0 > LOD1 > LOD2`,
  );
  assert(
    tiers[0].ktxPayloadBytes > tiers[1].ktxPayloadBytes && tiers[1].ktxPayloadBytes > tiers[2].ktxPayloadBytes,
    `${variant}: KTX2 payload bytes must decrease LOD0 > LOD1 > LOD2`,
  );

  console.log(
    `✓ ${variant} KTX2 monotonicity | runtime ${tiers.map((tier) => tier.runtimeBytes).join(" > ")} | ktx ${tiers.map((tier) => tier.ktxPayloadBytes).join(" > ")}`,
  );
}

console.log("Validated KHR_texture_basisu runtime GLBs and embedded BasisLZ KTX2 payloads.");
