import { access, readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

const REGISTRY_PATH = "config/showcase-assets.json";
const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;
const GLB_BIN_CHUNK = 0x004e4942;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function decodeDataUri(uri, filePath, bufferIndex) {
  const match = /^data:application\/octet-stream;base64,(.+)$/.exec(uri ?? "");
  assert(
    match,
    `${filePath}: buffer ${bufferIndex} must be embedded base64 or delivered through GLB`,
  );
  return Buffer.from(match[1], "base64");
}

function parseGlb(buffer, filePath) {
  assert(buffer.byteLength >= 20, `${filePath}: GLB is too small`);
  assert(buffer.readUInt32LE(0) === GLB_MAGIC, `${filePath}: invalid GLB magic`);
  assert(buffer.readUInt32LE(4) === 2, `${filePath}: GLB version must be 2`);
  assert(
    buffer.readUInt32LE(8) === buffer.byteLength,
    `${filePath}: GLB declared length does not match file size`,
  );

  let offset = 12;
  let document;
  let binaryChunk;

  while (offset + 8 <= buffer.byteLength) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    assert(chunkEnd <= buffer.byteLength, `${filePath}: GLB chunk is out of range`);

    if (chunkType === GLB_JSON_CHUNK) {
      const json = buffer
        .subarray(chunkStart, chunkEnd)
        .toString("utf8")
        .replace(/[\u0000\s]+$/g, "");
      document = JSON.parse(json);
    } else if (chunkType === GLB_BIN_CHUNK) {
      binaryChunk = buffer.subarray(chunkStart, chunkEnd);
    }

    offset = chunkEnd;
  }

  assert(document, `${filePath}: GLB is missing a JSON chunk`);
  return { document, binaryChunk };
}

async function loadGltfDocument(filePath) {
  const absolutePath = resolve(process.cwd(), filePath);
  const extension = extname(filePath).toLowerCase();

  if (extension === ".glb") {
    return parseGlb(await readFile(absolutePath), filePath);
  }

  assert(extension === ".gltf", `${filePath}: expected .gltf or .glb`);
  return {
    document: JSON.parse(await readFile(absolutePath, "utf8")),
    binaryChunk: undefined,
  };
}

function validateDocument(document, binaryChunk, entry, filePath) {
  assert(document.asset?.version === "2.0", `${filePath}: glTF asset.version must be 2.0`);
  assert(Number.isInteger(document.scene), `${filePath}: a default scene is required`);
  assert(document.scenes?.[document.scene], `${filePath}: default scene index is invalid`);

  const decodedBuffers = (document.buffers ?? []).map((buffer, index) => {
    if (!buffer.uri && index === 0 && binaryChunk) {
      assert(
        binaryChunk.byteLength >= buffer.byteLength,
        `${filePath}: GLB BIN chunk is smaller than buffer ${index}`,
      );
      return binaryChunk;
    }

    return decodeDataUri(buffer.uri, filePath, index);
  });

  for (const [index, view] of (document.bufferViews ?? []).entries()) {
    const backingBuffer = decodedBuffers[view.buffer];
    assert(backingBuffer, `${filePath}: bufferView ${index} references missing buffer ${view.buffer}`);
    const start = view.byteOffset ?? 0;
    const end = start + view.byteLength;
    assert(start >= 0 && end <= backingBuffer.byteLength, `${filePath}: bufferView ${index} is out of range`);
  }

  for (const [index, accessor] of (document.accessors ?? []).entries()) {
    if (accessor.bufferView === undefined) continue;
    assert(
      document.bufferViews?.[accessor.bufferView],
      `${filePath}: accessor ${index} references missing bufferView ${accessor.bufferView}`,
    );
  }

  const nodeNames = new Set((document.nodes ?? []).map((node) => node.name).filter(Boolean));
  for (const requiredNode of entry.requiredNodes ?? []) {
    assert(nodeNames.has(requiredNode), `${filePath}: missing semantic node '${requiredNode}'`);
  }

  for (const requiredExtension of entry.requiredExtensions ?? []) {
    assert(
      document.extensionsUsed?.includes(requiredExtension),
      `${filePath}: missing required extension '${requiredExtension}'`,
    );
  }

  if (entry.stage === "fixture" && entry.requiredExtensions?.includes("KHR_materials_unlit")) {
    for (const [index, material] of (document.materials ?? []).entries()) {
      assert(
        material.extensions?.KHR_materials_unlit,
        `${filePath}: fixture material ${index} must be unlit for deterministic rendering`,
      );
    }
  }
}

async function validateAssetFile(entry, filePath) {
  const absolutePath = resolve(process.cwd(), filePath);
  assert(await exists(absolutePath), `${filePath}: asset file does not exist`);
  const { document, binaryChunk } = await loadGltfDocument(filePath);
  validateDocument(document, binaryChunk, entry, filePath);
  return stat(absolutePath);
}

function validateProductionMetadata(entry, policy) {
  const source = entry.source;
  assert(source && typeof source === "object", `${entry.id}: production asset requires source metadata`);
  assert(
    source.ownership === "self-created" || source.ownership === "licensed",
    `${entry.id}: source.ownership must be 'self-created' or 'licensed'`,
  );
  assert(
    typeof source.license === "string" && source.license.trim().length > 0,
    `${entry.id}: production asset requires a non-empty source.license`,
  );

  const lodEntries = entry.lod ?? [];
  const tierSet = new Set(lodEntries.map((lod) => lod.tier));
  for (const tier of policy.requiredLodTiers ?? []) {
    assert(tierSet.has(tier), `${entry.id}: production asset is missing required ${tier}`);
  }

  for (const lod of lodEntries) {
    assert(typeof lod.path === "string" && lod.path, `${entry.id}/${lod.tier}: missing asset path`);
    for (const field of policy.requiredBudgetFields ?? []) {
      const value = lod.budget?.[field];
      assert(
        Number.isFinite(value) && value > 0,
        `${entry.id}/${lod.tier}: budget.${field} must be a positive measured number`,
      );
    }
  }

  if (policy.requireFallbackImage) {
    assert(
      typeof entry.fallbackImage === "string" && entry.fallbackImage,
      `${entry.id}: production asset requires fallbackImage`,
    );
  }
}

async function validateRegistryEntry(entry, policy) {
  assert(typeof entry.id === "string" && entry.id, "Every asset registry entry requires an id");
  assert(
    entry.stage === "fixture" || entry.stage === "production",
    `${entry.id}: stage must be fixture or production`,
  );

  if (entry.fallbackImage) {
    assert(
      await exists(resolve(process.cwd(), entry.fallbackImage)),
      `${entry.id}: fallback image '${entry.fallbackImage}' does not exist`,
    );
  }

  if (entry.stage === "production") {
    validateProductionMetadata(entry, policy);
    for (const lod of entry.lod ?? []) {
      await validateAssetFile(entry, lod.path);
    }
    console.log(`✓ ${entry.id} production policy + ${entry.lod.length} LODs`);
    return;
  }

  assert(typeof entry.path === "string" && entry.path, `${entry.id}: fixture requires path`);
  await validateAssetFile(entry, entry.path);
  console.log(`✓ ${entry.id} fixture`);
}

function verifyProductionPolicyIsActive(policy) {
  const invalidExample = {
    id: "policy-self-test",
    stage: "production",
    source: { ownership: "self-created", license: "internal" },
    lod: [{ tier: "lod0", path: "example.glb", budget: {} }],
    fallbackImage: "example.webp",
  };

  let failed = false;
  try {
    validateProductionMetadata(invalidExample, policy);
  } catch {
    failed = true;
  }
  assert(failed, "Production policy self-test did not reject an incomplete asset");
}

const registryAbsolutePath = resolve(process.cwd(), REGISTRY_PATH);
const registry = JSON.parse(await readFile(registryAbsolutePath, "utf8"));
assert(registry.version === 1, `${REGISTRY_PATH}: unsupported registry version`);
assert(Array.isArray(registry.assets), `${REGISTRY_PATH}: assets must be an array`);

const assetIds = new Set();
for (const entry of registry.assets) {
  assert(!assetIds.has(entry.id), `${REGISTRY_PATH}: duplicate asset id '${entry.id}'`);
  assetIds.add(entry.id);
}

verifyProductionPolicyIsActive(registry.productionPolicy ?? {});

for (const entry of registry.assets) {
  await validateRegistryEntry(entry, registry.productionPolicy ?? {});
}

console.log(
  `Validated ${registry.assets.length} registered showcase assets; production policy gate is active.`,
);
