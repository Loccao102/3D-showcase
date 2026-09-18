import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const CONTRACT_PATH = "scripts/showcase-asset-contracts.json";
const MODEL_DIR = "apps/web/public/models";
const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;
const GLB_BIN_CHUNK = 0x004e4942;
const MESHOPT_EXTENSION = "EXT_meshopt_compression";
const KTX_EXTENSION = "KHR_texture_basisu";

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

function names(values) {
  return new Set((values ?? []).map((value) => value?.name).filter(Boolean));
}

function assertRequiredNames(document, contract, filePath) {
  const nodeNames = names(document.nodes);
  const materialNames = names(document.materials);
  const animationNames = names(document.animations);

  for (const name of contract.requiredNodes ?? []) {
    assert(nodeNames.has(name), `${filePath}: semantic node '${name}' was lost during Meshopt promotion`);
  }
  for (const name of contract.requiredMaterials ?? []) {
    assert(materialNames.has(name), `${filePath}: material '${name}' was lost during Meshopt promotion`);
  }
  for (const name of contract.requiredAnimations ?? []) {
    assert(animationNames.has(name), `${filePath}: animation '${name}' was lost during Meshopt promotion`);
  }
}

function findMaterial(document, name, filePath) {
  const material = document.materials?.find((candidate) => candidate.name === name);
  assert(material, `${filePath}: missing material '${name}'`);
  return material;
}

function assertMaterialContracts(document, contract, filePath) {
  for (const extension of contract.requiredExtensions ?? []) {
    assert(
      (document.extensionsUsed ?? []).includes(extension),
      `${filePath}: required extension '${extension}' was lost during Meshopt promotion`,
    );
  }

  for (const [materialName, extensions] of Object.entries(
    contract.requiredMaterialExtensions ?? {},
  )) {
    const material = findMaterial(document, materialName, filePath);
    for (const extension of extensions) {
      assert(
        material.extensions?.[extension],
        `${filePath}: material '${materialName}' lost extension '${extension}'`,
      );
    }
  }

  for (const [materialName, alphaMode] of Object.entries(
    contract.requiredAlphaMode ?? {},
  )) {
    const material = findMaterial(document, materialName, filePath);
    assert(
      material.alphaMode === alphaMode,
      `${filePath}: material '${materialName}' expected alphaMode '${alphaMode}', got '${material.alphaMode ?? "OPAQUE"}'`,
    );
  }
}

function validateMeshoptBufferViews(document, binary, filePath) {
  let compressedViews = 0;
  let compressedBytes = 0;

  for (const [index, view] of (document.bufferViews ?? []).entries()) {
    const extension = view.extensions?.[MESHOPT_EXTENSION];
    if (!extension) continue;

    compressedViews += 1;

    assert(Number.isInteger(extension.buffer), `${filePath}: Meshopt view ${index} missing buffer`);
    assert(Number.isInteger(extension.byteLength) && extension.byteLength > 0, `${filePath}: Meshopt view ${index} invalid byteLength`);
    assert(Number.isInteger(extension.byteStride) && extension.byteStride > 0, `${filePath}: Meshopt view ${index} invalid byteStride`);
    assert(Number.isInteger(extension.count) && extension.count > 0, `${filePath}: Meshopt view ${index} invalid count`);
    assert(
      ["ATTRIBUTES", "TRIANGLES", "INDICES"].includes(extension.mode),
      `${filePath}: Meshopt view ${index} invalid mode '${extension.mode}'`,
    );

    const start = extension.byteOffset ?? 0;
    const end = start + extension.byteLength;
    assert(end <= binary.length, `${filePath}: Meshopt view ${index} compressed payload exceeds BIN chunk`);
    compressedBytes += extension.byteLength;
  }

  assert(compressedViews > 0, `${filePath}: no bufferView uses ${MESHOPT_EXTENSION}`);
  return { compressedViews, compressedBytes };
}

function sourceName(variant, lod) {
  return lod < 2
    ? `astra-one-${variant}-lod${lod}-ktx2.glb`
    : `astra-one-${variant}-lod${lod}.glb`;
}

function outputName(variant, lod) {
  return sourceName(variant, lod).replace(/\.glb$/, "-meshopt.glb");
}

const contracts = JSON.parse(
  await readFile(resolve(process.cwd(), CONTRACT_PATH), "utf8"),
).assets ?? [];

const measurements = [];

for (const contract of contracts) {
  const lodMatch = /-lod([0-2])$/.exec(contract.id ?? "");
  assert(lodMatch, `${contract.id}: expected contract id ending in LOD tier`);

  const lod = Number(lodMatch[1]);
  const variant = contract.id.includes("sport") ? "sport" : "touring";
  const sourceFile = sourceName(variant, lod);
  const outputFile = outputName(variant, lod);
  const sourcePath = resolve(process.cwd(), MODEL_DIR, sourceFile);
  const outputPath = resolve(process.cwd(), MODEL_DIR, outputFile);

  const [sourceBytes, outputBytes] = await Promise.all([
    readFile(sourcePath),
    readFile(outputPath),
  ]);
  const source = parseGlb(sourceBytes, sourceFile);
  const output = parseGlb(outputBytes, outputFile);
  const document = output.document;

  assert(
    (document.extensionsUsed ?? []).includes(MESHOPT_EXTENSION),
    `${outputFile}: ${MESHOPT_EXTENSION} missing from extensionsUsed`,
  );
  assert(
    (document.extensionsRequired ?? []).includes(MESHOPT_EXTENSION),
    `${outputFile}: ${MESHOPT_EXTENSION} missing from extensionsRequired`,
  );

  assertRequiredNames(document, contract, outputFile);
  assertMaterialContracts(document, contract, outputFile);

  const { compressedViews, compressedBytes } = validateMeshoptBufferViews(
    document,
    output.binary,
    outputFile,
  );

  assert(
    outputBytes.length < sourceBytes.length,
    `${outputFile}: Meshopt runtime asset must be smaller than its source asset`,
  );

  if (contract.maxMeshoptFileBytes !== undefined) {
    assert(
      outputBytes.length <= contract.maxMeshoptFileBytes,
      `${outputFile}: ${outputBytes.length}B exceeds maxMeshoptFileBytes ${contract.maxMeshoptFileBytes}`,
    );
  }
  if (contract.maxMeshoptPayloadBytes !== undefined) {
    assert(
      compressedBytes <= contract.maxMeshoptPayloadBytes,
      `${outputFile}: ${compressedBytes}B exceeds maxMeshoptPayloadBytes ${contract.maxMeshoptPayloadBytes}`,
    );
  }
  if (contract.maxMeshoptRuntimeRatio !== undefined) {
    const ratio = outputBytes.length / sourceBytes.length;
    assert(
      ratio <= contract.maxMeshoptRuntimeRatio,
      `${outputFile}: runtime/source ratio ${ratio.toFixed(3)} exceeds ${contract.maxMeshoptRuntimeRatio}`,
    );
  }

  if (lod < 2) {
    assert(
      (document.extensionsUsed ?? []).includes(KTX_EXTENSION),
      `${outputFile}: KTX2 runtime tier lost ${KTX_EXTENSION}`,
    );
    assert(
      (document.images ?? []).every((image) => image.mimeType === "image/ktx2"),
      `${outputFile}: KTX2 runtime tier contains a non-KTX2 image`,
    );
  } else {
    assert(
      !(document.extensionsUsed ?? []).includes(KTX_EXTENSION),
      `${outputFile}: PNG LOD2 unexpectedly gained ${KTX_EXTENSION}`,
    );
    assert(
      (document.images ?? []).every((image) => image.mimeType === "image/png"),
      `${outputFile}: PNG LOD2 contains a non-PNG image`,
    );
  }

  measurements.push({
    variant,
    lod,
    sourceBytes: sourceBytes.length,
    outputBytes: outputBytes.length,
    compressedBytes,
  });

  const delta = outputBytes.length - sourceBytes.length;
  const percent = ((delta / sourceBytes.length) * 100).toFixed(1);
  console.log(
    `✓ ${contract.id} Meshopt | source=${sourceBytes.length}B runtime=${outputBytes.length}B delta=${delta}B (${percent}%) compressedViews=${compressedViews} codecBytes=${compressedBytes}B`,
  );
}

for (const variant of ["touring", "sport"]) {
  const tiers = measurements
    .filter((measurement) => measurement.variant === variant)
    .sort((a, b) => a.lod - b.lod);

  assert(tiers.length === 3, `${variant}: expected three Meshopt LOD measurements`);
  assert(
    tiers[0].outputBytes > tiers[1].outputBytes && tiers[1].outputBytes > tiers[2].outputBytes,
    `${variant}: Meshopt runtime bytes must decrease LOD0 > LOD1 > LOD2`,
  );

  console.log(
    `✓ ${variant} Meshopt monotonicity | ${tiers.map((tier) => tier.outputBytes).join(" > ")}`,
  );
}

console.log("Validated EXT_meshopt_compression runtime assets and semantic preservation.");
