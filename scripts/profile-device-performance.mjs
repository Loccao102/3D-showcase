import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";

const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;
const GLB_BIN_CHUNK = 0x004e4942;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseGlbDocument(bytes, filePath) {
  assert(bytes.byteLength >= 20, `${filePath}: GLB is too small`);
  assert(bytes.readUInt32LE(0) === GLB_MAGIC, `${filePath}: invalid GLB magic`);
  assert(bytes.readUInt32LE(4) === 2, `${filePath}: GLB version must be 2`);
  assert(bytes.readUInt32LE(8) === bytes.byteLength,
    `${filePath}: declared GLB file length disagrees with actual bytes`);

  let offset = 12;
  let chunkNumber = 0;
  let document = null;
  let sawJsonChunk = false;
  let sawBinChunk = false;
  while (offset < bytes.byteLength) {
    assert(offset + 8 <= bytes.byteLength, `${filePath}: truncated GLB chunk header`);
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    assert(chunkLength % 4 === 0, `${filePath}: GLB chunk must be four-byte aligned`);
    assert(chunkNumber !== 0 || chunkType === GLB_JSON_CHUNK,
      `${filePath}: the first GLB chunk must be JSON`);
    offset += 8;
    assert(offset + chunkLength <= bytes.byteLength, `${filePath}: GLB chunk is out of range`);

    const chunk = bytes.subarray(offset, offset + chunkLength);
    offset += chunkLength;
    chunkNumber += 1;

    if (chunkType === GLB_JSON_CHUNK) {
      assert(!sawJsonChunk, `${filePath}: duplicate GLB JSON chunk`);
      sawJsonChunk = true;
      document = JSON.parse(chunk.toString("utf8").replace(/[\u0000\u0020]+$/g, ""));
    } else if (chunkType === GLB_BIN_CHUNK) {
      // The glTF 2.0 binary body, when present, must be the second chunk.
      // Other extension chunks may follow it, but cannot replace or duplicate it.
      assert(!sawBinChunk && chunkNumber === 2,
        `${filePath}: duplicate or misplaced GLB BIN chunk`);
      sawBinChunk = true;
    }
  }

  assert(sawJsonChunk, `${filePath}: missing GLB JSON chunk`);
  // A parseable JSON chunk is not necessarily a valid glTF asset. Reject
  // unrelated or unsupported JSON instead of reporting tiny triangle counts.
  assert(document && typeof document === "object" && !Array.isArray(document)
    && document.asset?.version === "2.0",
    `${filePath}: GLB JSON must contain glTF asset version 2.0`);
  return document;
}

function analyzeGlb(document, byteLength, filename) {
  // A malformed accessor can otherwise silently contribute zero triangles
  // and make an oversized or corrupted asset appear to satisfy its budget.
  const accessorAt = (index) => {
    assert(Number.isSafeInteger(index) && index >= 0,
      `${filename}: invalid mesh accessor index ${String(index)}`);
    const accessor = document.accessors?.[index];
    assert(accessor && Number.isSafeInteger(accessor.count) && accessor.count >= 0,
      `${filename}: missing or invalid mesh accessor count at index ${index}`);
    return accessor;
  };

  let triangles = 0;
  let vertices = 0;
  let geometryBufferBytes = 0;

  for (const mesh of document.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const mode = primitive.mode ?? 4;
      // The glTF primitive modes are integer enums 0..6. Unsupported modes
      // would silently bypass triangle accounting and pass an asset budget.
      assert(Number.isSafeInteger(mode) && mode >= 0 && mode <= 6,
        `${filename}: invalid glTF primitive mode`);
      const indexCount = primitive.indices === undefined
        ? null
        : accessorAt(primitive.indices).count;
      const positionCount = primitive.attributes?.POSITION === undefined
        ? null
        : accessorAt(primitive.attributes.POSITION).count;
      if (positionCount !== null) vertices += positionCount;
      const count = indexCount ?? positionCount ?? 0;
      // glTF supports TRIANGLES (4), TRIANGLE_STRIP (5) and TRIANGLE_FAN
      // (6). Ignoring strips/fans would underreport the geometry budget.
      if (mode === 4) triangles += Math.floor(count / 3);
      if (mode === 5 || mode === 6) triangles += Math.max(0, count - 2);
    }
  }

  // Only count buffer views reachable from mesh accessors. Summing every
  // buffer view incorrectly included embedded image textures as geometry.
  const geometryViews = new Set();
  for (const mesh of document.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const accessors = [
        primitive.indices,
        ...Object.values(primitive.attributes ?? {}),
        ...(primitive.targets ?? []).flatMap(target => Object.values(target)),
      ];
      for (const accessorIndex of accessors) {
        if (accessorIndex === undefined) continue;
        const accessor = accessorAt(accessorIndex);
        if (accessor.bufferView !== undefined) {
          assert(Number.isSafeInteger(accessor.bufferView) && accessor.bufferView >= 0,
            `${filename}: invalid mesh buffer view index`);
          geometryViews.add(accessor.bufferView);
        }
        // Sparse glTF accessors store geometry overrides in separate index
        // and value buffers. Omitting those buffers undercounts GPU geometry.
        const sparse = accessor.sparse;
        if (sparse !== undefined) {
          assert(Number.isSafeInteger(sparse.count) &&
            sparse.count >= 0 && sparse.count <= accessor.count,
            `${filename}: invalid sparse accessor count`);
          for (const part of ["indices", "values"]) {
            const viewIndex = sparse[part]?.bufferView;
            assert(Number.isSafeInteger(viewIndex) && viewIndex >= 0,
              `${filename}: missing or invalid sparse ${part} buffer view`);
            geometryViews.add(viewIndex);
          }
        }
      }
    }
  }
  for (const viewIndex of geometryViews) {
    const view = document.bufferViews?.[viewIndex];
    assert(view && Number.isSafeInteger(view.byteLength) && view.byteLength >= 0,
      `${filename}: missing or invalid geometry buffer view at index ${viewIndex}`);
    geometryBufferBytes += view.byteLength;
  }

  const materialsCount = document.materials?.length ?? 0;
  const texturesCount = document.textures?.length ?? 0;
  const imagesCount = document.images?.length ?? 0;

  // Approximate GPU VRAM:
  // Vertex buffers + Index buffers + textures (avg 2048x2048 or 1024x1024 uncompressed 4 bytes/pixel if any)
  const textureEstimatedVram = texturesCount * (1024 * 1024 * 4); // ~4MB per texture uncompressed
  const totalEstimatedVram = geometryBufferBytes + textureEstimatedVram;

  // Assess recommended device tier
  let recommendedTier = "Tier 1 (High Performance)";
  if (triangles <= 20000 && byteLength < 35000) {
    recommendedTier = "Tier 3 (Budget / Mobile)";
  } else if (triangles <= 60000 && byteLength < 60000) {
    recommendedTier = "Tier 2 (Standard)";
  }

  return {
    file: filename,
    fileSizeBytes: byteLength,
    fileSizeKb: (byteLength / 1024).toFixed(1) + " KB",
    triangles,
    vertices,
    materialsCount,
    texturesCount,
    imagesCount,
    geometryBufferBytes,
    geometryBufferKb: (geometryBufferBytes / 1024).toFixed(1) + " KB",
    estimatedGpuVramMb: (totalEstimatedVram / (1024 * 1024)).toFixed(2) + " MB",
    recommendedTier,
  };
}

function validateProfileContracts(files, contracts) {
  assert(Array.isArray(contracts?.assets),
    "Asset budget contracts must provide an assets array");
  const budgets = new Map();
  for (const contract of contracts.assets) {
    assert(contract && typeof contract.path === "string" && contract.path.trim(),
      "Asset budget contract has an invalid path");
    const filename = contract.path.split("/").at(-1);
    assert(!budgets.has(filename),
      `Duplicate asset budget contract for ${filename}`);
    assert(Number.isSafeInteger(contract.maxFileBytes) && contract.maxFileBytes > 0,
      `${filename}: contract must specify positive maxFileBytes`);
    assert(Number.isSafeInteger(contract.maxTriangles) && contract.maxTriangles >= 0,
      `${filename}: contract must specify nonnegative maxTriangles`);
    budgets.set(filename, contract);
  }

  for (const filename of files) {
    // Vehicle models have established performance budgets. Furniture can be
    // profiled without a contract, but a missing car budget must fail CI.
    if (filename.startsWith("astra-one-")) {
      assert(budgets.has(filename),
        `${filename}: missing required vehicle asset budget contract`);
    }
  }
  return budgets;
}

async function main() {
  console.log("================================================================================");
  console.log(" 3D SHOWCASE ENGINE — DEVICE PERFORMANCE & ASSET PROFILER");
  console.log("================================================================================");
  console.log("Scanning production GLB assets in apps/web/public/models/...\n");

  const files = [
    "astra-one-touring-lod0.glb",
    "astra-one-touring-lod1.glb",
    "astra-one-touring-lod2.glb",
    "astra-one-sport-lod0.glb",
    "astra-one-sport-lod1.glb",
    "astra-one-sport-lod2.glb",
    "kroma-chair-lod0.glb",
    "kroma-chair-lod1.glb",
    "kroma-chair-lod2.glb",
  ];

  const results = [];
  const contracts = JSON.parse(await readFile(
    resolve(process.cwd(), "scripts/showcase-asset-contracts.json"), "utf8"
  ));
  const budgetByFilename = validateProfileContracts(files, contracts);
  const budgetFailures = [];

  for (const filename of files) {
    const fullPath = resolve(process.cwd(), "apps/web/public/models", filename);
    const bytes = await readFile(fullPath);
    const doc = parseGlbDocument(bytes, filename);
    const profile = analyzeGlb(doc, bytes.byteLength, filename);
    const contract = budgetByFilename.get(filename);
    if (contract) {
      const failures = [];
      if (bytes.byteLength > contract.maxFileBytes) {
        failures.push(`file size ${bytes.byteLength} exceeds ${contract.maxFileBytes}`);
      }
      if (profile.triangles > contract.maxTriangles) {
        failures.push(`triangles ${profile.triangles} exceeds ${contract.maxTriangles}`);
      }
      profile.budget = {
        status: failures.length === 0 ? "pass" : "fail",
        maxFileBytes: contract.maxFileBytes,
        maxTriangles: contract.maxTriangles,
        failures
      };
      if (failures.length > 0) {
        budgetFailures.push(`${filename}: ${failures.join(", ")}`);
      }
    } else {
      // Furniture lacks explicit asset contract budgets; do not claim pass
      // simply because the profiler finished reading the file.
      profile.budget = { status: "not-contracted" };
    }
    results.push(profile);
  }

  // Print Formatted Console Table
  console.table(
    results.map((r) => ({
      Asset: r.file,
      "Disk Size": r.fileSizeKb,
      Triangles: r.triangles.toLocaleString(),
      Vertices: r.vertices.toLocaleString(),
      Materials: r.materialsCount,
      "VRAM Est.": r.estimatedGpuVramMb,
      "Target Tier": r.recommendedTier,
      "Budget": r.budget.status,
    }))
  );

  const report = {
    generatedAt: new Date().toISOString(),
    totalAssets: results.length,
    profiles: results,
    summary: {
      totalTrianglesLod0: results.filter(r => r.file.includes("lod0")).reduce((sum, r) => sum + r.triangles, 0),
      totalDiskBytes: results.reduce((sum, r) => sum + r.fileSizeBytes, 0),
      budgetedAssets: results.filter(r => r.budget.status !== "not-contracted").length,
      unbudgetedAssets: results.filter(r => r.budget.status === "not-contracted").map(r => r.file),
      budgetViolations: budgetFailures,
      tierDistribution: {
        tier1: results.filter(r => r.recommendedTier.includes("Tier 1")).length,
        tier2: results.filter(r => r.recommendedTier.includes("Tier 2")).length,
        tier3: results.filter(r => r.recommendedTier.includes("Tier 3")).length,
      },
    },
  };

  const outputDir = resolve(process.cwd(), "dist");
  await mkdir(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, "device-performance-audit.json");
  await writeFile(outputPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`\n✓ Performance profile audit successfully written to: ${outputPath}`);
  console.log(`Contract budgets: ${results.filter(r => r.budget.status === "pass").length} pass, ${budgetFailures.length} fail, ${results.filter(r => r.budget.status === "not-contracted").length} not assessed.`);
  if (budgetFailures.length) {
    throw new Error("Production asset budgets exceeded: " + budgetFailures.join(" | "));
  }
}

export { parseGlbDocument, analyzeGlb, validateProfileContracts };

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error("Profiling failed:", err);
    process.exitCode = 1;
  });
}
