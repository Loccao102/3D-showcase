import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const CONTRACT_PATH = "scripts/showcase-asset-contracts.json";
const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseGlbDocument(bytes, filePath) {
  assert(bytes.byteLength >= 20, `${filePath}: GLB is too small`);
  assert(bytes.readUInt32LE(0) === GLB_MAGIC, `${filePath}: invalid GLB magic`);
  assert(bytes.readUInt32LE(4) === 2, `${filePath}: GLB version must be 2`);

  let offset = 12;
  while (offset < bytes.byteLength) {
    assert(offset + 8 <= bytes.byteLength, `${filePath}: truncated GLB chunk header`);
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    offset += 8;
    assert(offset + chunkLength <= bytes.byteLength, `${filePath}: GLB chunk is out of range`);

    const chunk = bytes.subarray(offset, offset + chunkLength);
    offset += chunkLength;

    if (chunkType === GLB_JSON_CHUNK) {
      return JSON.parse(chunk.toString("utf8").replace(/[\u0000\u0020]+$/g, ""));
    }
  }

  throw new Error(`${filePath}: missing GLB JSON chunk`);
}

function countTriangles(document) {
  let triangles = 0;

  for (const mesh of document.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const mode = primitive.mode ?? 4;
      if (mode !== 4) {
        continue;
      }

      if (primitive.indices !== undefined) {
        const accessor = document.accessors?.[primitive.indices];
        assert(accessor, `mesh '${mesh.name ?? "unnamed"}' references a missing index accessor`);
        triangles += Math.floor(accessor.count / 3);
        continue;
      }

      const positionAccessorIndex = primitive.attributes?.POSITION;
      const positionAccessor = document.accessors?.[positionAccessorIndex];
      assert(positionAccessor, `mesh '${mesh.name ?? "unnamed"}' has no POSITION accessor`);
      triangles += Math.floor(positionAccessor.count / 3);
    }
  }

  return triangles;
}

const contracts = JSON.parse(
  await readFile(resolve(process.cwd(), CONTRACT_PATH), "utf8"),
).assets ?? [];

const measurements = [];

for (const contract of contracts) {
  if (!contract.path?.endsWith(".glb")) {
    continue;
  }

  const bytes = await readFile(resolve(process.cwd(), contract.path));
  const document = parseGlbDocument(bytes, contract.path);
  const triangles = countTriangles(document);

  if (contract.maxTriangles !== undefined) {
    assert(
      triangles <= contract.maxTriangles,
      `${contract.path}: ${triangles} unique mesh triangles exceeds maxTriangles ${contract.maxTriangles}`,
    );
  }

  measurements.push({
    id: contract.id,
    path: contract.path,
    fileBytes: bytes.byteLength,
    triangles,
    nodes: document.nodes?.length ?? 0,
  });

  console.log(
    `✓ ${contract.id} | file=${bytes.byteLength}B triangles=${triangles} nodes=${document.nodes?.length ?? 0}`,
  );
}

const lodGroups = new Map();
for (const measurement of measurements) {
  const match = /^(.*)-lod([0-2])$/.exec(measurement.id ?? "");
  if (!match) {
    continue;
  }

  const [, groupId, lodText] = match;
  const group = lodGroups.get(groupId) ?? [];
  group.push({ ...measurement, lod: Number(lodText) });
  lodGroups.set(groupId, group);
}

for (const [groupId, group] of lodGroups) {
  if (group.length !== 3) {
    continue;
  }

  const sorted = group.sort((left, right) => left.lod - right.lod);
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    assert(
      current.triangles < previous.triangles,
      `${groupId}: LOD${current.lod} must have fewer unique mesh triangles than LOD${previous.lod}`,
    );
    assert(
      current.fileBytes < previous.fileBytes,
      `${groupId}: LOD${current.lod} must have a smaller GLB transfer size than LOD${previous.lod}`,
    );
  }

  console.log(
    `✓ ${groupId} LOD monotonicity | triangles ${sorted.map((item) => item.triangles).join(" > ")} | bytes ${sorted.map((item) => item.fileBytes).join(" > ")}`,
  );
}

console.log(`Validated LOD budgets for ${measurements.length} GLB assets.`);
