import { readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

const CONTRACT_PATH = "scripts/showcase-asset-contracts.json";
const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;
const GLB_BIN_CHUNK = 0x004e4942;
const FLOAT_COMPONENT_TYPE = 5126;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function stripJsonPadding(buffer) {
  return buffer.toString("utf8").replace(/[\u0000\u0020]+$/g, "");
}

function decodeDataUri(uri, filePath, bufferIndex) {
  const match = /^data:application\/(?:octet-stream|gltf-buffer);base64,(.+)$/i.exec(uri ?? "");
  assert(match, `${filePath}: buffer ${bufferIndex} uses an unsupported data URI`);
  return Buffer.from(match[1], "base64");
}

function parseGlb(bytes, filePath) {
  assert(bytes.byteLength >= 20, `${filePath}: GLB is too small`);
  assert(bytes.readUInt32LE(0) === GLB_MAGIC, `${filePath}: invalid GLB magic`);
  assert(bytes.readUInt32LE(4) === 2, `${filePath}: GLB version must be 2`);
  assert(
    bytes.readUInt32LE(8) === bytes.byteLength,
    `${filePath}: GLB header length does not match file size`,
  );

  let offset = 12;
  let jsonChunk;
  let binChunk;

  while (offset < bytes.byteLength) {
    assert(offset + 8 <= bytes.byteLength, `${filePath}: truncated GLB chunk header`);
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    offset += 8;
    assert(offset + chunkLength <= bytes.byteLength, `${filePath}: GLB chunk is out of range`);
    const chunk = bytes.subarray(offset, offset + chunkLength);
    offset += chunkLength;

    if (chunkType === GLB_JSON_CHUNK && !jsonChunk) {
      jsonChunk = chunk;
    } else if (chunkType === GLB_BIN_CHUNK && !binChunk) {
      binChunk = chunk;
    }
  }

  assert(jsonChunk, `${filePath}: GLB must contain a JSON chunk`);
  return {
    document: JSON.parse(stripJsonPadding(jsonChunk)),
    binChunk,
  };
}

async function loadBuffer(document, buffer, bufferIndex, filePath, baseDir, glbBinChunk) {
  if (!buffer.uri) {
    assert(
      bufferIndex === 0 && glbBinChunk,
      `${filePath}: buffer ${bufferIndex} has no URI and no GLB BIN chunk`,
    );
    assert(
      glbBinChunk.byteLength >= buffer.byteLength,
      `${filePath}: GLB BIN chunk is smaller than declared buffer ${bufferIndex}`,
    );
    return glbBinChunk.subarray(0, buffer.byteLength);
  }

  if (buffer.uri.startsWith("data:")) {
    return decodeDataUri(buffer.uri, filePath, bufferIndex);
  }

  const externalPath = resolve(baseDir, decodeURIComponent(buffer.uri));
  const external = await readFile(externalPath);
  assert(
    external.byteLength >= buffer.byteLength,
    `${filePath}: external buffer ${bufferIndex} is smaller than declared byteLength`,
  );
  return external.subarray(0, buffer.byteLength);
}

async function loadAsset(filePath) {
  const absolutePath = resolve(process.cwd(), filePath);
  const bytes = await readFile(absolutePath);
  const extension = extname(filePath).toLowerCase();
  let document;
  let glbBinChunk;

  if (extension === ".glb") {
    ({ document, binChunk: glbBinChunk } = parseGlb(bytes, filePath));
  } else {
    assert(extension === ".gltf", `${filePath}: only .gltf and .glb are supported`);
    document = JSON.parse(bytes.toString("utf8"));
  }

  const baseDir = dirname(absolutePath);
  const decodedBuffers = await Promise.all(
    (document.buffers ?? []).map((buffer, index) =>
      loadBuffer(document, buffer, index, filePath, baseDir, glbBinChunk),
    ),
  );

  return { document, decodedBuffers, fileBytes: bytes.byteLength };
}

function validateBufferRanges(document, decodedBuffers, filePath) {
  for (const [index, view] of (document.bufferViews ?? []).entries()) {
    const buffer = decodedBuffers[view.buffer];
    assert(buffer, `${filePath}: bufferView ${index} references missing buffer ${view.buffer}`);
    const start = view.byteOffset ?? 0;
    const end = start + view.byteLength;
    assert(start >= 0 && end <= buffer.byteLength, `${filePath}: bufferView ${index} is out of range`);
  }

  for (const [index, accessor] of (document.accessors ?? []).entries()) {
    if (accessor.bufferView === undefined) {
      assert(accessor.sparse, `${filePath}: accessor ${index} has neither bufferView nor sparse data`);
      continue;
    }

    assert(
      document.bufferViews?.[accessor.bufferView],
      `${filePath}: accessor ${index} references missing bufferView ${accessor.bufferView}`,
    );
  }
}

function validateAnimations(document, filePath) {
  const animations = document.animations ?? [];

  for (const [animationIndex, animation] of animations.entries()) {
    assert(animation.name, `${filePath}: animation ${animationIndex} must have a semantic name`);

    for (const [samplerIndex, sampler] of (animation.samplers ?? []).entries()) {
      const input = document.accessors?.[sampler.input];
      const output = document.accessors?.[sampler.output];
      assert(input, `${filePath}: animation ${animation.name} sampler ${samplerIndex} has missing input`);
      assert(output, `${filePath}: animation ${animation.name} sampler ${samplerIndex} has missing output`);
      assert(
        input.componentType === FLOAT_COMPONENT_TYPE && input.type === "SCALAR",
        `${filePath}: animation ${animation.name} sampler ${samplerIndex} input must be FLOAT SCALAR`,
      );

      const interpolation = sampler.interpolation ?? "LINEAR";
      const expectedOutputCount = interpolation === "CUBICSPLINE" ? input.count * 3 : input.count;
      assert(
        output.count === expectedOutputCount,
        `${filePath}: animation ${animation.name} sampler ${samplerIndex} output count is invalid`,
      );
    }

    for (const [channelIndex, channel] of (animation.channels ?? []).entries()) {
      const sampler = animation.samplers?.[channel.sampler];
      const targetNode = document.nodes?.[channel.target?.node];
      assert(sampler, `${filePath}: animation ${animation.name} channel ${channelIndex} has missing sampler`);
      assert(targetNode, `${filePath}: animation ${animation.name} channel ${channelIndex} has missing target node`);

      const output = document.accessors?.[sampler.output];
      const expectedType = channel.target.path === "rotation" ? "VEC4" : "VEC3";
      if (channel.target.path !== "weights") {
        assert(
          output?.type === expectedType,
          `${filePath}: animation ${animation.name} channel ${channelIndex} output must be ${expectedType}`,
        );
      }
    }
  }
}

async function validateContract(contract) {
  const { document, decodedBuffers, fileBytes } = await loadAsset(contract.path);

  assert(document.asset?.version === "2.0", `${contract.path}: glTF asset.version must be 2.0`);
  assert(Number.isInteger(document.scene), `${contract.path}: a default scene is required`);
  assert(document.scenes?.[document.scene], `${contract.path}: default scene index is invalid`);

  if (contract.maxFileBytes !== undefined) {
    assert(
      fileBytes <= contract.maxFileBytes,
      `${contract.path}: ${fileBytes} bytes exceeds contract maxFileBytes ${contract.maxFileBytes}`,
    );
  }

  validateBufferRanges(document, decodedBuffers, contract.path);
  validateAnimations(document, contract.path);

  const nodeNames = new Set((document.nodes ?? []).map((node) => node.name).filter(Boolean));
  for (const requiredNode of contract.requiredNodes ?? []) {
    assert(nodeNames.has(requiredNode), `${contract.path}: missing semantic node '${requiredNode}'`);
  }

  const materialNames = new Set((document.materials ?? []).map((material) => material.name).filter(Boolean));
  for (const requiredMaterial of contract.requiredMaterials ?? []) {
    assert(
      materialNames.has(requiredMaterial),
      `${contract.path}: missing semantic material '${requiredMaterial}'`,
    );
  }

  const animationNames = new Set((document.animations ?? []).map((animation) => animation.name).filter(Boolean));
  for (const requiredAnimation of contract.requiredAnimations ?? []) {
    assert(
      animationNames.has(requiredAnimation),
      `${contract.path}: missing animation '${requiredAnimation}'`,
    );
  }

  if (contract.requireUnlit) {
    assert(
      document.extensionsUsed?.includes("KHR_materials_unlit"),
      `${contract.path}: reference fixture must declare KHR_materials_unlit`,
    );

    for (const [index, material] of (document.materials ?? []).entries()) {
      assert(
        material.extensions?.KHR_materials_unlit,
        `${contract.path}: material ${index} must be unlit for deterministic reference rendering`,
      );
    }
  }

  const decodedBufferBytes = decodedBuffers.reduce((total, buffer) => total + buffer.byteLength, 0);
  console.log(
    `✓ ${contract.path} | file=${fileBytes}B buffers=${decodedBufferBytes}B nodes=${document.nodes?.length ?? 0} materials=${document.materials?.length ?? 0} animations=${document.animations?.length ?? 0}`,
  );
}

const contractFile = JSON.parse(
  await readFile(resolve(process.cwd(), CONTRACT_PATH), "utf8"),
);
const configuredContracts = contractFile.assets ?? [];
const extraPaths = process.argv.slice(2);
const adHocContracts = extraPaths.map((path) => ({ path }));

const contracts = [...configuredContracts, ...adHocContracts];
assert(contracts.length > 0, `${CONTRACT_PATH}: at least one asset contract is required`);

for (const contract of contracts) {
  await validateContract(contract);
}

console.log(`Validated ${contracts.length} showcase asset${contracts.length === 1 ? "" : "s"}.`);
