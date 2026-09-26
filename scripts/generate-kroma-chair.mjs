import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outDir = resolve(process.cwd(), process.argv[2] ?? "apps/web/public/models");
await mkdir(outDir, { recursive: true });

function align4(buffer) {
  const pad = (4 - (buffer.length % 4)) % 4;
  return pad ? Buffer.concat([buffer, Buffer.alloc(pad)]) : buffer;
}

function padJson(buffer) {
  const pad = (4 - (buffer.length % 4)) % 4;
  return pad ? Buffer.concat([buffer, Buffer.alloc(pad, 0x20)]) : buffer;
}

function packFloats(values) {
  const buffer = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => buffer.writeFloatLE(value, index * 4));
  return buffer;
}

function packU16(values) {
  const buffer = Buffer.alloc(values.length * 2);
  values.forEach((value, index) => buffer.writeUInt16LE(value, index * 2));
  return buffer;
}

function makeBox() {
  const faces = [
    [[1, 0, 0], [[0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [0.5, -0.5, 0.5]]],
    [[-1, 0, 0], [[-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5], [-0.5, -0.5, -0.5]]],
    [[0, 1, 0], [[-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5]]],
    [[0, -1, 0], [[-0.5, -0.5, 0.5], [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5]]],
    [[0, 0, 1], [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]]],
    [[0, 0, -1], [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]]],
  ];

  const positions = [];
  const normals = [];
  const indices = [];

  for (const [normal, vertices] of faces) {
    const start = positions.length / 3;
    for (const vertex of vertices) {
      positions.push(...vertex);
      normals.push(...normal);
    }
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }

  return { positions, normals, indices };
}

function makeCylinder(segments) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let index = 0; index < segments; index += 1) {
    const angle0 = (Math.PI * 2 * index) / segments;
    const angle1 = (Math.PI * 2 * (index + 1)) / segments;
    const x0 = 0.5 * Math.cos(angle0);
    const y0 = 0.5 * Math.sin(angle0);
    const x1 = 0.5 * Math.cos(angle1);
    const y1 = 0.5 * Math.sin(angle1);
    const start = positions.length / 3;
    const vertices = [[x0, y0, -0.5], [x1, y1, -0.5], [x1, y1, 0.5], [x0, y0, 0.5]];
    const sideNormals = [
      [Math.cos(angle0), Math.sin(angle0), 0],
      [Math.cos(angle1), Math.sin(angle1), 0],
      [Math.cos(angle1), Math.sin(angle1), 0],
      [Math.cos(angle0), Math.sin(angle0), 0],
    ];

    vertices.forEach((vertex, vertexIndex) => {
      positions.push(...vertex);
      normals.push(...sideNormals[vertexIndex]);
    });
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }

  for (const [z, normalZ, reverse] of [[-0.5, -1, true], [0.5, 1, false]]) {
    const center = positions.length / 3;
    positions.push(0, 0, z);
    normals.push(0, 0, normalZ);
    const ring = [];

    for (let index = 0; index < segments; index += 1) {
      const angle = (Math.PI * 2 * index) / segments;
      ring.push(positions.length / 3);
      positions.push(0.5 * Math.cos(angle), 0.5 * Math.sin(angle), z);
      normals.push(0, 0, normalZ);
    }

    for (let index = 0; index < segments; index += 1) {
      const current = ring[index];
      const next = ring[(index + 1) % segments];
      if (reverse) indices.push(center, next, current);
      else indices.push(center, current, next);
    }
  }

  return { positions, normals, indices };
}

function findMinMax(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < positions.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], positions[index + axis]);
      max[axis] = Math.max(max[axis], positions[index + axis]);
    }
  }
  return [min, max];
}

function buildChair(lod) {
  const cylinderSegments = [24, 16, 10][lod];
  const document = {
    asset: { version: "2.0", generator: "Showcase Kroma Ergonomic Chair Generator" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [],
    meshes: [],
    materials: [],
    accessors: [],
    bufferViews: [],
    buffers: [],
    extras: {
      product: "Kroma Ergonomic Lounge Chair",
      lod,
      vertical: "furniture",
    },
  };

  let binary = Buffer.alloc(0);

  const appendAccessor = (bytes, componentType, count, type, target, min, max) => {
    binary = align4(binary);
    const byteOffset = binary.length;
    binary = Buffer.concat([binary, bytes]);
    const bufferView = { buffer: 0, byteOffset, byteLength: bytes.length };
    if (target) bufferView.target = target;
    const bufferViewIndex = document.bufferViews.push(bufferView) - 1;
    const accessor = { bufferView: bufferViewIndex, componentType, count, type };
    if (min) accessor.min = min;
    if (max) accessor.max = max;
    return document.accessors.push(accessor) - 1;
  };

  const addMaterial = (name, color, metallicFactor, roughnessFactor) => {
    const material = {
      name,
      pbrMetallicRoughness: { baseColorFactor: color, metallicFactor, roughnessFactor },
    };
    return document.materials.push(material) - 1;
  };

  const materials = {
    upholstery: addMaterial("upholstery", [0.12, 0.13, 0.15, 1], 0.05, 0.65),
    metal: addMaterial("metal", [0.85, 0.86, 0.88, 1], 0.92, 0.22),
    trim: addMaterial("trim", [0.08, 0.09, 0.11, 1], 0.25, 0.55),
    casters: addMaterial("casters", [0.05, 0.05, 0.06, 1], 0.05, 0.85),
  };

  const meshCache = new Map();
  const addMesh = (shape, materialIndex, name) => {
    const key = `${shape}:${materialIndex}:${cylinderSegments}`;
    if (meshCache.has(key)) return meshCache.get(key);

    const geometry = shape === "box" ? makeBox() : makeCylinder(cylinderSegments);
    const [min, max] = findMinMax(geometry.positions);
    const positionAccessor = appendAccessor(
      packFloats(geometry.positions), 5126, geometry.positions.length / 3, "VEC3", 34962, min, max,
    );
    const normalAccessor = appendAccessor(
      packFloats(geometry.normals), 5126, geometry.normals.length / 3, "VEC3", 34962,
    );
    const indexAccessor = appendAccessor(
      packU16(geometry.indices), 5123, geometry.indices.length, "SCALAR", 34963,
      [Math.min(...geometry.indices)], [Math.max(...geometry.indices)],
    );
    const meshIndex = document.meshes.push({
      name,
      primitives: [{
        attributes: { POSITION: positionAccessor, NORMAL: normalAccessor },
        indices: indexAccessor,
        material: materialIndex,
      }],
    }) - 1;
    meshCache.set(key, meshIndex);
    return meshIndex;
  };

  const children = [];
  document.nodes.push({ name: "ROOT_chair", children });
  const addNode = (name, meshIndex, translation, scale, rotation, extras) => {
    const node = { name };
    if (meshIndex !== null) node.mesh = meshIndex;
    if (translation) node.translation = translation;
    if (scale) node.scale = scale;
    if (rotation) node.rotation = rotation;
    if (extras) node.extras = extras;
    const nodeIndex = document.nodes.push(node) - 1;
    children.push(nodeIndex);
    return nodeIndex;
  };

  const box = (material, name) => addMesh("box", material, name);
  const cylinder = (material, name) => addMesh("cylinder", material, name);

  // Seat cushion & pan
  addNode("seat", box(materials.upholstery, "MESH_seat"), [0, 0.48, 0.05], [0.62, 0.09, 0.58], null, { showcaseId: "seat" });
  addNode("seat_pan", box(materials.trim, "MESH_seat_pan"), [0, 0.43, 0.05], [0.58, 0.04, 0.54]);

  // Backrest & Lumbar & Headrest
  addNode("backrest", box(materials.upholstery, "MESH_backrest"), [0, 0.98, -0.24], [0.54, 0.74, 0.08], null, { showcaseId: "backrest" });
  addNode("lumbar", box(materials.upholstery, "MESH_lumbar"), [0, 0.72, -0.21], [0.44, 0.16, 0.06], null, { showcaseId: "lumbar" });
  addNode("headrest", box(materials.upholstery, "MESH_headrest"), [0, 1.42, -0.27], [0.36, 0.18, 0.09], null, { showcaseId: "headrest" });
  addNode("spine", box(materials.metal, "MESH_spine"), [0, 0.94, -0.3], [0.08, 0.82, 0.06], null, { showcaseId: "metal" });

  // Armrests
  addNode("armrest_l", box(materials.trim, "MESH_armpad_l"), [0.34, 0.72, -0.02], [0.1, 0.035, 0.28]);
  addNode("armrest_l_post", box(materials.metal, "MESH_armpost_l"), [0.34, 0.58, -0.02], [0.035, 0.25, 0.035], null, { showcaseId: "metal" });
  addNode("armrest_r", box(materials.trim, "MESH_armpad_r"), [-0.34, 0.72, -0.02], [0.1, 0.035, 0.28]);
  addNode("armrest_r_post", box(materials.metal, "MESH_armpost_r"), [-0.34, 0.58, -0.02], [0.035, 0.25, 0.035], null, { showcaseId: "metal" });

  // Mechanism & Stem
  addNode("mechanism", box(materials.metal, "MESH_mechanism"), [0, 0.38, 0], [0.26, 0.08, 0.26], null, { showcaseId: "metal" });
  addNode("stem", cylinder(materials.metal, "MESH_stem"), [0, 0.26, 0], [0.06, 0.06, 0.22], [Math.PI / 2, 0, 0], { showcaseId: "metal" });
  addNode("base_hub", cylinder(materials.metal, "MESH_hub"), [0, 0.12, 0], [0.18, 0.18, 0.08], [Math.PI / 2, 0, 0], { showcaseId: "metal" });

  // 5-Star Base Spokes & Casters
  const spokeRadius = 0.36;
  for (let i = 0; i < 5; i += 1) {
    const angle = (Math.PI * 2 * i) / 5;
    const x = Math.sin(angle) * (spokeRadius * 0.5);
    const z = Math.cos(angle) * (spokeRadius * 0.5);
    const tipX = Math.sin(angle) * spokeRadius;
    const tipZ = Math.cos(angle) * spokeRadius;

    // Spoke bar
    addNode(
      `base_spoke_${i}`,
      box(materials.metal, `MESH_spoke_${i}`),
      [x, 0.09, z],
      [0.05, 0.04, spokeRadius],
      [0, angle, 0],
      { showcaseId: "metal" },
    );

    // Caster wheel
    addNode(
      `caster_${i}`,
      cylinder(materials.casters, `MESH_caster_${i}`),
      [tipX, 0.05, tipZ],
      [0.07, 0.07, 0.04],
      [0, 0, Math.PI / 2],
    );
  }

  // Named semantic anchors for hotspots
  addNode("anchor:lumbar", null, [0, 0.72, -0.19], null, null, { showcaseAnchor: "lumbar" });
  addNode("anchor:base", null, [0, 0.12, 0], null, null, { showcaseAnchor: "base" });
  addNode("anchor:headrest", null, [0, 1.42, -0.24], null, null, { showcaseAnchor: "headrest" });

  // Assemble GLB
  const jsonText = JSON.stringify(document);
  const jsonBuffer = padJson(Buffer.from(jsonText, "utf8"));
  const binaryAligned = align4(binary);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // "glTF"
  header.writeUInt32LE(2, 4); // version 2
  header.writeUInt32LE(12 + 8 + jsonBuffer.length + 8 + binaryAligned.length, 8);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonBuffer.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4); // "JSON"

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binaryAligned.length, 0);
  binChunkHeader.writeUInt32LE(0x004e4942, 4); // "BIN"

  return Buffer.concat([
    header,
    jsonChunkHeader,
    jsonBuffer,
    binChunkHeader,
    binaryAligned,
  ]);
}

for (let lod = 0; lod < 3; lod += 1) {
  const glb = buildChair(lod);
  const targetPath = resolve(outDir, `kroma-chair-lod${lod}.glb`);
  await writeFile(targetPath, glb);
  console.log(`Generated Kroma Chair LOD${lod} (${glb.length} bytes) -> ${targetPath}`);
}
