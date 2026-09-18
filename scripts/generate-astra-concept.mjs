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

function appendQuad(positions, normals, indices, vertices) {
  const [v0, v1, v2] = vertices;
  const a = v1.map((value, index) => value - v0[index]);
  const b = v2.map((value, index) => value - v0[index]);
  let normal = [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const length = Math.max(1e-8, Math.hypot(...normal));
  normal = normal.map((value) => value / length);

  const start = positions.length / 3;
  for (const vertex of vertices) {
    positions.push(...vertex);
    normals.push(...normal);
  }
  indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
}

function makeLoft(sections) {
  const positions = [];
  const normals = [];
  const indices = [];

  const ring = (section) => [
    [section.x, section.bottom, -section.halfWidth],
    [section.x, section.top, -section.topHalfWidth],
    [section.x, section.top, section.topHalfWidth],
    [section.x, section.bottom, section.halfWidth],
  ];

  for (let index = 0; index < sections.length - 1; index += 1) {
    const current = ring(sections[index]);
    const next = ring(sections[index + 1]);

    appendQuad(positions, normals, indices, [current[0], next[0], next[1], current[1]]);
    appendQuad(positions, normals, indices, [current[1], next[1], next[2], current[2]]);
    appendQuad(positions, normals, indices, [current[2], next[2], next[3], current[3]]);
    appendQuad(positions, normals, indices, [current[3], next[3], next[0], current[0]]);
  }

  const first = ring(sections[0]);
  const last = ring(sections.at(-1));
  appendQuad(positions, normals, indices, [first[3], first[2], first[1], first[0]]);
  appendQuad(positions, normals, indices, [last[0], last[1], last[2], last[3]]);

  return { positions, normals, indices };
}

function makeBodyProfile(lod) {
  const profiles = [
    [
      { x: -0.5, bottom: -0.5, top: -0.18, halfWidth: 0.38, topHalfWidth: 0.33 },
      { x: -0.43, bottom: -0.5, top: 0.12, halfWidth: 0.49, topHalfWidth: 0.43 },
      { x: -0.28, bottom: -0.5, top: 0.3, halfWidth: 0.5, topHalfWidth: 0.45 },
      { x: -0.04, bottom: -0.5, top: 0.42, halfWidth: 0.5, topHalfWidth: 0.44 },
      { x: 0.22, bottom: -0.5, top: 0.36, halfWidth: 0.5, topHalfWidth: 0.45 },
      { x: 0.42, bottom: -0.5, top: 0.14, halfWidth: 0.48, topHalfWidth: 0.42 },
      { x: 0.5, bottom: -0.5, top: -0.12, halfWidth: 0.36, topHalfWidth: 0.31 },
    ],
    [
      { x: -0.5, bottom: -0.5, top: -0.16, halfWidth: 0.38, topHalfWidth: 0.33 },
      { x: -0.4, bottom: -0.5, top: 0.16, halfWidth: 0.49, topHalfWidth: 0.43 },
      { x: 0, bottom: -0.5, top: 0.4, halfWidth: 0.5, topHalfWidth: 0.44 },
      { x: 0.4, bottom: -0.5, top: 0.16, halfWidth: 0.48, topHalfWidth: 0.42 },
      { x: 0.5, bottom: -0.5, top: -0.12, halfWidth: 0.36, topHalfWidth: 0.31 },
    ],
    [
      { x: -0.5, bottom: -0.5, top: -0.14, halfWidth: 0.38, topHalfWidth: 0.33 },
      { x: -0.32, bottom: -0.5, top: 0.24, halfWidth: 0.49, topHalfWidth: 0.43 },
      { x: 0.3, bottom: -0.5, top: 0.28, halfWidth: 0.49, topHalfWidth: 0.43 },
      { x: 0.5, bottom: -0.5, top: -0.1, halfWidth: 0.36, topHalfWidth: 0.31 },
    ],
  ];
  return makeLoft(profiles[lod]);
}

function makeCanopyProfile(lod) {
  const profiles = [
    [
      { x: -0.5, bottom: -0.36, top: -0.12, halfWidth: 0.42, topHalfWidth: 0.28 },
      { x: -0.34, bottom: -0.38, top: 0.28, halfWidth: 0.46, topHalfWidth: 0.34 },
      { x: -0.02, bottom: -0.4, top: 0.48, halfWidth: 0.47, topHalfWidth: 0.31 },
      { x: 0.34, bottom: -0.38, top: 0.3, halfWidth: 0.44, topHalfWidth: 0.32 },
      { x: 0.5, bottom: -0.34, top: -0.08, halfWidth: 0.39, topHalfWidth: 0.27 },
    ],
    [
      { x: -0.5, bottom: -0.36, top: -0.1, halfWidth: 0.42, topHalfWidth: 0.28 },
      { x: -0.28, bottom: -0.39, top: 0.38, halfWidth: 0.46, topHalfWidth: 0.33 },
      { x: 0.27, bottom: -0.39, top: 0.39, halfWidth: 0.45, topHalfWidth: 0.33 },
      { x: 0.5, bottom: -0.34, top: -0.06, halfWidth: 0.39, topHalfWidth: 0.27 },
    ],
    [
      { x: -0.5, bottom: -0.35, top: -0.08, halfWidth: 0.41, topHalfWidth: 0.28 },
      { x: 0, bottom: -0.4, top: 0.42, halfWidth: 0.46, topHalfWidth: 0.32 },
      { x: 0.5, bottom: -0.34, top: -0.05, halfWidth: 0.39, topHalfWidth: 0.27 },
    ],
  ];
  return makeLoft(profiles[lod]);
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
    asset: { version: "2.0", generator: "OpenAI self-authored Astra One concept generator v3" },
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
      materialStage: "production-v3",
      artStage: "hero-v2-art-direction",
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
        : shape === "body-profile"
          ? makeBodyProfile(lod)
          : shape === "canopy-profile"
            ? makeCanopyProfile(lod)
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
  const bodyProfile = (material, name) => addMesh("body-profile", material, name);
  const canopyProfile = (material, name) => addMesh("canopy-profile", material, name);

  addNode("body", bodyProfile(materials.body, "MESH_body"), [0, 0.76, 0], [4.7, 0.92, 1.96], { showcaseId: "body" });
  addNode("cabin", canopyProfile(materials.glass, "MESH_cabin"), [-0.16, 1.34, 0], [2.62, 0.72, 1.62]);
  addNode("hood", box(materials.body, "MESH_body_panel"), [1.48, 1.025, 0], [1.42, 0.075, 1.62]);
  addNode("rear-deck", box(materials.body, "MESH_rear_deck"), [-1.68, 1.0, 0], [0.86, 0.07, 1.62]);
  addNode("front-bumper", box(materials.trim, "MESH_trim"), [2.23, 0.62, 0], [0.12, 0.35, 1.76]);
  addNode("rear-bumper", box(materials.trim, "MESH_trim"), [-2.23, 0.62, 0], [0.12, 0.34, 1.75]);
  addNode("side-skirt-left", box(materials.trim, "MESH_trim"), [0, 0.48, 0.93], [3.7, 0.16, 0.08]);
  addNode("side-skirt-right", box(materials.trim, "MESH_trim"), [0, 0.48, -0.93], [3.7, 0.16, 0.08]);

  const frontLight = addNode("front-light", box(materials.frontLight, "MESH_front_light"), [2.31, 0.98, 0.64], [0.055, 0.13, 0.46]);
  addNode("front-light-secondary", box(materials.frontLight, "MESH_front_light"), [2.31, 0.98, -0.64], [0.055, 0.13, 0.46]);
  addNode("front-light-bar", box(materials.frontLight, "MESH_front_light_bar"), [2.325, 1.035, 0], [0.04, 0.035, 1.28]);
  addNode("rear-light", box(materials.rearLight, "MESH_rear_light"), [-2.31, 0.96, 0.64], [0.05, 0.12, 0.44]);
  addNode("rear-light-secondary", box(materials.rearLight, "MESH_rear_light"), [-2.31, 0.96, -0.64], [0.05, 0.12, 0.44]);
  addNode("rear-light-bar", box(materials.rearLight, "MESH_rear_light_bar"), [-2.325, 1.015, 0], [0.035, 0.035, 1.3]);

  const wheelPositions = [
    [-1.45, 0.48, 0.96], [1.42, 0.48, 0.96], [-1.45, 0.48, -0.96], [1.42, 0.48, -0.96],
  ];
  const wheelNames = ["wheel_rl", "wheel_fl", "wheel_rr", "wheel_fr"];
  wheelPositions.forEach((position, index) => {
    addNode(wheelNames[index], cylinder(materials.tire, "MESH_tire"), position, [0.68, 0.68, 0.3]);
    addNode(`${wheelNames[index]}_rim`, cylinder(materials.rim, "MESH_rim"), position, [0.43, 0.43, 0.315]);

    const side = position[2] > 0 ? 1 : -1;
    const faceZ = position[2] + 0.018 * side;
    if (lod <= 1) {
      addNode(
        `${wheelNames[index]}_caliper`,
        box(materials.caliper, "MESH_caliper"),
        [position[0] + 0.05, position[1], position[2] + 0.012 * side],
        [0.17, 0.3, 0.035],
      );
      addNode(`${wheelNames[index]}_spoke_h`, box(materials.rim, "MESH_wheel_spoke"), [position[0], position[1], faceZ], [0.5, 0.07, 0.035]);
      addNode(`${wheelNames[index]}_spoke_v`, box(materials.rim, "MESH_wheel_spoke"), [position[0], position[1], faceZ], [0.07, 0.5, 0.035]);
      addNode(`${wheelNames[index]}_hub`, cylinder(materials.rim, "MESH_wheel_hub"), [position[0], position[1], faceZ], [0.14, 0.14, 0.34]);
    }
  });

  if (lod <= 1) {
    addNode("windshield-frame", box(materials.trim, "MESH_pillar"), [0.62, 1.47, 0.77], [0.075, 0.56, 0.045]);
    addNode("windshield-frame-right", box(materials.trim, "MESH_pillar"), [0.62, 1.47, -0.77], [0.075, 0.56, 0.045]);
    addNode("rear-glass-frame", box(materials.trim, "MESH_pillar"), [-1.0, 1.44, 0.74], [0.075, 0.5, 0.045]);
    addNode("rear-glass-frame-right", box(materials.trim, "MESH_pillar"), [-1.0, 1.44, -0.74], [0.075, 0.5, 0.045]);
    addNode("b-pillar-left", box(materials.trim, "MESH_pillar"), [-0.2, 1.42, 0.79], [0.08, 0.5, 0.035]);
    addNode("b-pillar-right", box(materials.trim, "MESH_pillar"), [-0.2, 1.42, -0.79], [0.08, 0.5, 0.035]);
    addNode("mirror-left", box(materials.body, "MESH_mirror"), [0.56, 1.24, 1.0], [0.28, 0.1, 0.12]);
    addNode("mirror-right", box(materials.body, "MESH_mirror"), [0.56, 1.24, -1.0], [0.28, 0.1, 0.12]);
    addNode("front-splitter", box(materials.trim, "MESH_aero"), [2.31, 0.38, 0], [0.24, 0.065, 1.88]);

    for (const side of [-1, 1]) {
      addNode(`door-handle-front-${side > 0 ? "left" : "right"}`, box(materials.trim, "MESH_door_handle"), [0.38, 1.02, 0.925 * side], [0.2, 0.025, 0.018]);
      addNode(`door-handle-rear-${side > 0 ? "left" : "right"}`, box(materials.trim, "MESH_door_handle"), [-0.72, 1.02, 0.925 * side], [0.18, 0.025, 0.018]);
      addNode(`shoulder-line-${side > 0 ? "left" : "right"}`, box(materials.body, "MESH_body_crease"), [0.0, 0.96, 0.94 * side], [3.25, 0.035, 0.03]);
    }

    const grilleSlats = lod === 0 ? 7 : 5;
    for (let index = 0; index < grilleSlats; index += 1) {
      const z = grilleSlats === 1 ? 0 : -0.62 + (1.24 * index) / (grilleSlats - 1);
      addNode(`grille-slat-${index}`, box(materials.trim, "MESH_grille_slat"), [2.335, 0.69, z], [0.035, 0.27, 0.025]);
    }

    addNode("dashboard", box(materials.interior, "MESH_dashboard"), [0.48, 1.12, 0], [0.34, 0.18, 1.2]);
    addNode("center-console", box(materials.accent, "MESH_console"), [-0.15, 0.93, 0], [1.15, 0.15, 0.22]);
    addNode("seat-front-left", wedge(materials.interior, "MESH_seat"), [0.05, 0.98, 0.46], [0.42, 0.62, 0.42]);
    addNode("seat-front-right", wedge(materials.interior, "MESH_seat"), [0.05, 0.98, -0.46], [0.42, 0.62, 0.42]);
    addNode("seat-rear", wedge(materials.interior, "MESH_seat_rear"), [-0.82, 0.98, 0], [0.46, 0.58, 1.05]);
    addNode("steering-wheel", cylinder(materials.accent, "MESH_steering"), [0.42, 1.18, 0.48], [0.24, 0.24, 0.06]);
  }

  if (lod === 0) {
    [-1.15, -0.35, 0.55, 1.3].forEach((x) => {
      addNode(`body-line-${x}`, box(materials.trim, "MESH_detail"), [x, 0.82, 0.945], [0.48, 0.028, 0.018]);
    });
    addNode("roof-accent", box(materials.trim, "MESH_trim"), [-0.12, 1.69, 0], [1.28, 0.05, 1.18]);
    addNode("lower-grille", box(materials.trim, "MESH_grille"), [2.325, 0.67, 0], [0.04, 0.19, 0.88]);
    addNode("front-intake-left", box(materials.trim, "MESH_intake"), [2.33, 0.55, 0.72], [0.04, 0.16, 0.24]);
    addNode("front-intake-right", box(materials.trim, "MESH_intake"), [2.33, 0.55, -0.72], [0.04, 0.16, 0.24]);
    addNode("instrument-screen", box(materials.frontLight, "MESH_screen"), [0.43, 1.2, 0.24], [0.025, 0.17, 0.39]);
    addNode("center-screen", box(materials.frontLight, "MESH_screen"), [0.31, 1.2, -0.17], [0.022, 0.24, 0.31]);
    addNode("seat-front-left-headrest", box(materials.interior, "MESH_headrest"), [-0.03, 1.28, 0.46], [0.22, 0.22, 0.28]);
    addNode("seat-front-right-headrest", box(materials.interior, "MESH_headrest"), [-0.03, 1.28, -0.46], [0.22, 0.22, 0.28]);
    addNode("steering-hub", cylinder(materials.accent, "MESH_steering_hub"), [0.42, 1.18, 0.49], [0.08, 0.08, 0.08]);
  }

  if (sport) {
    addNode("sport-aero", box(materials.trim, "MESH_sport_aero"), [-1.92, 1.34, 0], [0.58, 0.07, 1.68]);
    addNode("sport-spoiler", box(materials.body, "MESH_sport_spoiler"), [-2.02, 1.4, 0], [0.76, 0.06, 1.72]);
    if (lod <= 1) {
      addNode("sport-spoiler-support-left", box(materials.trim, "MESH_spoiler_support"), [-1.93, 1.34, 0.62], [0.09, 0.16, 0.05]);
      addNode("sport-spoiler-support-right", box(materials.trim, "MESH_spoiler_support"), [-1.93, 1.34, -0.62], [0.09, 0.16, 0.05]);
    }
    if (lod === 0) {
      addNode("sport-diffuser", box(materials.trim, "MESH_sport_diffuser"), [-2.31, 0.45, 0], [0.15, 0.2, 1.58]);
      [-0.58, -0.2, 0.2, 0.58].forEach((z, index) => {
        addNode(`sport-diffuser-strake-${index}`, box(materials.trim, "MESH_diffuser_strake"), [-2.34, 0.42, z], [0.12, 0.16, 0.035]);
      });
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
