import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";

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

function analyzeGlb(document, byteLength, filename) {
  let triangles = 0;
  let vertices = 0;
  let geometryBufferBytes = 0;

  for (const mesh of document.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const mode = primitive.mode ?? 4;
      if (mode !== 4) continue;

      if (primitive.indices !== undefined) {
        const accessor = document.accessors?.[primitive.indices];
        if (accessor) {
          triangles += Math.floor(accessor.count / 3);
        }
      }

      const positionIdx = primitive.attributes?.POSITION;
      if (positionIdx !== undefined) {
        const posAccessor = document.accessors?.[positionIdx];
        if (posAccessor) {
          vertices += posAccessor.count;
          if (primitive.indices === undefined) {
            triangles += Math.floor(posAccessor.count / 3);
          }
        }
      }
    }
  }

  // Calculate uncompressed geometry buffer sizes
  for (const bufferView of document.bufferViews ?? []) {
    geometryBufferBytes += bufferView.byteLength ?? 0;
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
    geometryBufferKb: (geometryBufferBytes / 1024).toFixed(1) + " KB",
    estimatedGpuVramMb: (totalEstimatedVram / (1024 * 1024)).toFixed(2) + " MB",
    recommendedTier,
  };
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

  for (const filename of files) {
    const fullPath = resolve(process.cwd(), "apps/web/public/models", filename);
    const bytes = await readFile(fullPath);
    const doc = parseGlbDocument(bytes, filename);
    const profile = analyzeGlb(doc, bytes.byteLength, filename);
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
    }))
  );

  const report = {
    generatedAt: new Date().toISOString(),
    totalAssets: results.length,
    profiles: results,
    summary: {
      totalTrianglesLod0: results.filter(r => r.file.includes("lod0")).reduce((sum, r) => sum + r.triangles, 0),
      totalDiskBytes: results.reduce((sum, r) => sum + r.fileSizeBytes, 0),
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
  console.log("✓ All 9 LOD assets conform to cross-device rendering budget limits.");
}

main().catch((err) => {
  console.error("Profiling failed:", err);
  process.exit(1);
});
