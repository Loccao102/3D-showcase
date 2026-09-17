import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const CONTRACT_PATH = "scripts/showcase-asset-contracts.json";
const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stripJsonPadding(buffer) {
  return buffer.toString("utf8").replace(/[\u0000\u0020]+$/g, "");
}

function parseGlb(bytes, filePath) {
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
      return JSON.parse(stripJsonPadding(chunk));
    }
  }

  throw new Error(`${filePath}: missing GLB JSON chunk`);
}

const contractFile = JSON.parse(
  await readFile(resolve(process.cwd(), CONTRACT_PATH), "utf8"),
);

for (const contract of contractFile.assets ?? []) {
  const bytes = await readFile(resolve(process.cwd(), contract.path));
  const document = parseGlb(bytes, contract.path);
  const extensionsUsed = new Set(document.extensionsUsed ?? []);

  for (const extension of contract.requiredExtensions ?? []) {
    assert(
      extensionsUsed.has(extension),
      `${contract.path}: missing required extension '${extension}'`,
    );
  }

  const materialsByName = new Map(
    (document.materials ?? []).map((material) => [material.name, material]),
  );

  for (const [materialName, extensions] of Object.entries(
    contract.requiredMaterialExtensions ?? {},
  )) {
    const material = materialsByName.get(materialName);
    assert(material, `${contract.path}: missing material '${materialName}'`);

    for (const extension of extensions) {
      assert(
        material.extensions?.[extension],
        `${contract.path}: material '${materialName}' missing '${extension}'`,
      );
    }
  }

  if (contract.requiredAlphaMode) {
    for (const [materialName, alphaMode] of Object.entries(contract.requiredAlphaMode)) {
      const material = materialsByName.get(materialName);
      assert(material, `${contract.path}: missing material '${materialName}'`);
      assert(
        material.alphaMode === alphaMode,
        `${contract.path}: material '${materialName}' alphaMode must be '${alphaMode}'`,
      );
    }
  }

  console.log(
    `✓ material contract ${contract.id} | extensions=${extensionsUsed.size} materials=${document.materials?.length ?? 0}`,
  );
}
