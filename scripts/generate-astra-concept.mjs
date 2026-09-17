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

function makeWedge() {
  const vertices = [
    [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5],
    [-0.36, 0.5, -0.34], [0.36, 0.5, -0.34], [0.36, 0.5, 0.34], [-0.36, 0.5, 0.34],
  ];
  const faces = [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
  const positions = [];
  const normals = [];
  const indices = [];

  for (const face of faces) {
    const [v0, v1, v2] = face.slice(0, 3).map((index) => vertices[index]);
    const a = v1.map((value, index) => value - v0[index]);
    const b = v2.map((value, index) => value - v0[index]);
    let normal = [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
    const length = Math.hypot(...normal);
    normal = normal.map((value) => value / length);
    const start = positions.length / 3;
    for (const vertexIndex of face) {
      positions.push(...vertices[vertexIndex]);
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

function buildCar(lod, sport) {
  const wheelSegments = [24, 16, 10][lod];
  const document = {
    asset: { version: "2.0", generator: "OpenAI self-authored Astra One concept generator v2" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [],
    meshes: [],
    materials: [],
    accessors: [],
    bufferViews: [],
    buffers: [],
    animations: [],
    extensionsUsed: [
      "KHR_materials_clearcoat",
      "KHR_materials_emissive_strength",
      "KHR_materials_ior",
      "KHR_materials_transmission",
      "KHR_materials_volume",
    ],
    extras: {
      ownership: "self-authored",
      vehicle: "Astra One",
      lod,
      variant: sport ? "sport" : "touring",
      materialStage: "production-v2",
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

  const addMaterial = (name, color, metallicFactor, roughnessFactor, options = {}) => {
    const material = {
      name,
      pbrMetallicRoughness: { baseColorFactor: color, metallicFactor, roughnessFactor },
    };

    if (options.alphaMode) material.alphaMode = options.alphaMode;
    if (options.doubleSided) material.doubleSided = true;

    const extensions = {};
    if (options.clearcoat) {
      extensions.KHR_materials_clearcoat = {
        clearcoatFactor: options.clearcoat.factor,
        clearcoatRoughnessFactor: options.clearcoat.roughness,
      };
    }
    if (options.transmission) {
      extensions.KHR_materials_transmission = { transmissionFactor: options.transmission };
    }
    if (options.ior) {
      extensions.KHR_materials_ior = { ior: options.ior };
    }
    if (options.volume) {
      extensions.KHR_materials_volume = {
        thicknessFactor: options.volume.thickness,
        attenuationDistance: options.volume.distance,
        attenuationColor: options.volume.color,
      };
    }
    if (options.emissive) {
      material.emissiveFactor = options.emissive.color;
      extensions.KHR_materials_emissive_strength = {
        emissiveStrength: options.emissive.strength,
      };
    }
    if (Object.keys(extensions).length) material.extensions = extensions;

    return document.materials.push(material) - 1;
  };

  const materials = {
    body: addMaterial("body", [0.075, 0.105, 0.16, 1], 0.72, 0.2, {
      clearcoat: { factor: 1, roughness: 0.08 },
    }),
    glass: addMaterial("glass", [0.035, 0.065, 0.09, 0.28], 0.02, 0.08, {
      alphaMode: "BLEND",
      doubleSided: true,
      transmission: 0.78,
      ior: 1.45,
      volume: { thickness: 0.012, distance: 3.5, color: [0.16, 0.28, 0.36] },
    }),
    tire: addMaterial("tire", [0.012, 0.014, 0.018, 1], 0.02, 0.86),
    rim: addMaterial("rim", [0.27, 0.3, 0.34, 1], 0.9, 0.16, {
      clearcoat: { factor: 0.35, roughness: 0.12 },
    }),
    trim: addMaterial("trim", [0.025, 0.03, 0.035, 1], 0.45, 0.28),
    interior: addMaterial("interior", [0.025, 0.028, 0.033, 1], 0.02, 0.72),
    accent: addMaterial("interior-accent", [0.16, 0.17, 0.18, 1], 0.62, 0.24),
    caliper: addMaterial("brake-caliper", [0.72, 0.045, 0.025, 1], 0.55, 0.28, {
      clearcoat: { factor: 0.55, roughness: 0.16 },
    }),
    frontLight: addMaterial("light", [0.72, 0.84, 1, 1], 0.15, 0.14, {
      emissive: { color: [0.48, 0.7, 1], strength: 3.2 },
    }),
    rearLight: addMaterial("rear-light", [0.8, 0.03, 0.04, 1], 0.1, 0.18, {
      emissive: { color: [1, 0.02, 0.02], strength: 3 },
    }),
  };

  const meshCache = new Map();
  const addMesh = (shape, materialIndex, name) => {
    const key = `${shape}:${materialIndex}:${wheelSegments}`;
    if (meshCache.has(key)) return meshCache.get(key);

    const geometry = shape === "box"
      ? makeBox()
      : shape === "wedge"
        ? makeWedge()
        : makeCylinder(wheelSegments);
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
  document.nodes.push({ name: "ROOT_vehicle", children });
  const addNode = (name, meshIndex, translation, scale, extras) => {
    const node = { name };
    if (meshIndex !== null) node.mesh = meshIndex;
    if (translation) node.translation = translation;
    if (scale) node.scale = scale;
    if (extras) node.extras = extras;
    const nodeIndex = document.nodes.push(node) - 1;
    children.push(nodeIndex);
    return nodeIndex;
  };

  const box = (material, name) => addMesh("box", material, name);
  const wedge = (material, name) => addMesh("wedge", material, name);
  const cylinder = (material, name) => addMesh("cylinder", material, name);

  addNode("body", wedge(materials.body, "MESH_body"), [0, 0.78, 0], [4.45, 0.72, 1.82], { showcaseId: "body" });
  addNode("cabin", wedge(materials.glass, "MESH_cabin"), [-0.15, 1.28, 0], [2.35, 0.74, 1.55]);
  addNode("hood", box(materials.body, "MESH_body_panel"), [1.45, 1.02, 0], [1.35, 0.18, 1.68]);
  addNode("rear-deck", box(materials.body, "MESH_rear_deck"), [-1.65, 0.98, 0], [0.9, 0.2, 1.7]);
  addNode("front-bumper", box(materials.trim, "MESH_trim"), [2.23, 0.62, 0], [0.12, 0.35, 1.76]);
  addNode("rear-bumper", box(materials.trim, "MESH_trim"), [-2.23, 0.62, 0], [0.12, 0.34, 1.75]);
  addNode("side-skirt-left", box(materials.trim, "MESH_trim"), [0, 0.48, 0.93], [3.7, 0.16, 0.08]);
  addNode("side-skirt-right", box(materials.trim, "MESH_trim"), [0, 0.48, -0.93], [3.7, 0.16, 0.08]);

  const frontLight = addNode("front-light", box(materials.frontLight, "MESH_front_light"), [2.26, 0.94, 0.62], [0.07, 0.16, 0.5]);
  addNode("front-light-secondary", box(materials.frontLight, "MESH_front_light"), [2.26, 0.94, -0.62], [0.07, 0.16, 0.5]);
  addNode("rear-light", box(materials.rearLight, "MESH_rear_light"), [-2.25, 0.92, 0.62], [0.06, 0.14, 0.48]);
  addNode("rear-light-secondary", box(materials.rearLight, "MESH_rear_light"), [-2.25, 0.92, -0.62], [0.06, 0.14, 0.48]);

  const wheelPositions = [
    [-1.45, 0.48, 0.96], [1.42, 0.48, 0.96], [-1.45, 0.48, -0.96], [1.42, 0.48, -0.96],
  ];
  const wheelNames = ["wheel_rl", "wheel_fl", "wheel_rr", "wheel_fr"];
  wheelPositions.forEach((position, index) => {
    addNode(wheelNames[index], cylinder(materials.tire, "MESH_tire"), position, [0.66, 0.66, 0.28]);
    addNode(`${wheelNames[index]}_rim`, cylinder(materials.rim, "MESH_rim"), position, [0.41, 0.41, 0.3]);
    if (lod <= 1) {
      const side = position[2] > 0 ? 1 : -1;
      addNode(
        `${wheelNames[index]}_caliper`,
        box(materials.caliper, "MESH_caliper"),
        [position[0] + 0.05, position[1], position[2] + 0.012 * side],
        [0.17, 0.3, 0.035],
      );
    }
  });

  if (lod <= 1) {
    addNode("windshield-frame", box(materials.trim, "MESH_trim"), [0.58, 1.48, 0], [0.09, 0.63, 1.52]);
    addNode("rear-glass-frame", box(materials.trim, "MESH_trim"), [-0.94, 1.46, 0], [0.09, 0.56, 1.47]);
    addNode("mirror-left", box(materials.body, "MESH_mirror"), [0.52, 1.24, 0.99], [0.25, 0.12, 0.11]);
    addNode("mirror-right", box(materials.body, "MESH_mirror"), [0.52, 1.24, -0.99], [0.25, 0.12, 0.11]);
    addNode("front-splitter", box(materials.trim, "MESH_aero"), [2.23, 0.39, 0], [0.22, 0.07, 1.9]);

    addNode("dashboard", box(materials.interior, "MESH_dashboard"), [0.48, 1.12, 0], [0.34, 0.18, 1.2]);
    addNode("center-console", box(materials.accent, "MESH_console"), [-0.15, 0.93, 0], [1.15, 0.15, 0.22]);
    addNode("seat-front-left", wedge(materials.interior, "MESH_seat"), [0.05, 0.98, 0.46], [0.42, 0.62, 0.42]);
    addNode("seat-front-right", wedge(materials.interior, "MESH_seat"), [0.05, 0.98, -0.46], [0.42, 0.62, 0.42]);
    addNode("seat-rear", wedge(materials.interior, "MESH_seat_rear"), [-0.82, 0.98, 0], [0.46, 0.58, 1.05]);
    addNode("steering-wheel", cylinder(materials.accent, "MESH_steering"), [0.42, 1.18, 0.48], [0.24, 0.24, 0.06]);
  }

  if (lod === 0) {
    [-0.9, 0.2, 1.1].forEach((x) => {
      addNode(`body-line-${x}`, box(materials.trim, "MESH_detail"), [x, 0.82, 0.925], [0.7, 0.035, 0.025]);
    });
    addNode("roof-accent", box(materials.trim, "MESH_trim"), [-0.1, 1.67, 0], [1.2, 0.055, 1.25]);
    addNode("lower-grille", box(materials.trim, "MESH_grille"), [2.285, 0.68, 0], [0.045, 0.2, 0.9]);
    addNode("instrument-screen", box(materials.frontLight, "MESH_screen"), [0.41, 1.18, 0.22], [0.03, 0.18, 0.4]);
    addNode("center-screen", box(materials.frontLight, "MESH_screen"), [0.33, 1.19, -0.16], [0.025, 0.23, 0.3]);
  }

  if (sport) {
    addNode("sport-aero", box(materials.trim, "MESH_sport_aero"), [-1.9, 1.35, 0], [0.55, 0.08, 1.72]);
    addNode("sport-spoiler", box(materials.body, "MESH_sport_spoiler"), [-2.0, 1.38, 0], [0.72, 0.07, 1.74]);
    if (lod === 0) {
      addNode("sport-diffuser", box(materials.trim, "MESH_sport_diffuser"), [-2.28, 0.46, 0], [0.16, 0.2, 1.62]);
    }
  }

  addNode("anchor:front-light", null, [2.25, 1.02, 0.68]);
  addNode("anchor:cabin", null, [-0.05, 1.58, 0]);
  addNode("anchor:rear", null, [-2.18, 0.98, 0.68]);
  addNode("anchor:wheel-front", null, [1.42, 0.48, 0.96]);

  const animationInput = appendAccessor(
    packFloats([0, 0.45, 0.9]), 5126, 3, "SCALAR", undefined, [0], [0.9],
  );
  const animationOutput = appendAccessor(
    packFloats([0.07, 0.16, 0.5, 0.085, 0.19, 0.56, 0.07, 0.16, 0.5]), 5126, 3, "VEC3",
  );
  document.animations.push({
    name: "ANIM_signature_pulse",
    samplers: [{ input: animationInput, output: animationOutput, interpolation: "LINEAR" }],
    channels: [{ sampler: 0, target: { node: frontLight, path: "scale" } }],
  });

  binary = align4(binary);
  document.buffers = [{ byteLength: binary.length }];

  const json = padJson(Buffer.from(JSON.stringify(document)));
  const paddedBinary = align4(binary);
  const totalLength = 12 + 8 + json.length + 8 + paddedBinary.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(json.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binaryHeader = Buffer.alloc(8);
  binaryHeader.writeUInt32LE(paddedBinary.length, 0);
  binaryHeader.writeUInt32LE(0x004e4942, 4);

  return Buffer.concat([header, jsonHeader, json, binaryHeader, paddedBinary]);
}

for (const sport of [false, true]) {
  const variant = sport ? "sport" : "touring";
  for (const lod of [0, 1, 2]) {
    const bytes = buildCar(lod, sport);
    const fileName = `astra-one-${variant}-lod${lod}.glb`;
    await writeFile(resolve(outDir, fileName), bytes);
    console.log(`generated ${fileName} (${bytes.length} bytes)`);
  }
}
