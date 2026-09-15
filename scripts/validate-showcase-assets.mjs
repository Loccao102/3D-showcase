import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const fixtures = [
  {
    path: "apps/web/public/models/astra-one-base.gltf",
    requiredNodes: [
      "body",
      "cabin",
      "front-light",
      "rear-light",
      "anchor:front-light",
      "anchor:cabin",
      "anchor:rear",
    ],
  },
  {
    path: "apps/web/public/models/astra-one-sport.gltf",
    requiredNodes: [
      "body",
      "cabin",
      "front-light",
      "rear-light",
      "sport-aero",
      "anchor:front-light",
      "anchor:cabin",
      "anchor:rear",
    ],
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function decodeDataUri(uri, filePath, bufferIndex) {
  const match = /^data:application\/octet-stream;base64,(.+)$/.exec(uri ?? "");
  assert(match, `${filePath}: buffer ${bufferIndex} must use an embedded base64 octet-stream URI`);
  return Buffer.from(match[1], "base64");
}

async function validateFixture(fixture) {
  const absolutePath = resolve(process.cwd(), fixture.path);
  const raw = await readFile(absolutePath, "utf8");
  const document = JSON.parse(raw);

  assert(document.asset?.version === "2.0", `${fixture.path}: glTF asset.version must be 2.0`);
  assert(Number.isInteger(document.scene), `${fixture.path}: a default scene is required`);
  assert(document.scenes?.[document.scene], `${fixture.path}: default scene index is invalid`);

  const buffers = document.buffers ?? [];
  const decodedBuffers = buffers.map((buffer, index) => {
    const decoded = decodeDataUri(buffer.uri, fixture.path, index);
    assert(
      decoded.byteLength === buffer.byteLength,
      `${fixture.path}: buffer ${index} declares ${buffer.byteLength} bytes but decodes to ${decoded.byteLength}`,
    );
    return decoded;
  });

  for (const [index, view] of (document.bufferViews ?? []).entries()) {
    const buffer = decodedBuffers[view.buffer];
    assert(buffer, `${fixture.path}: bufferView ${index} references missing buffer ${view.buffer}`);
    const start = view.byteOffset ?? 0;
    const end = start + view.byteLength;
    assert(start >= 0 && end <= buffer.byteLength, `${fixture.path}: bufferView ${index} is out of range`);
  }

  for (const [index, accessor] of (document.accessors ?? []).entries()) {
    assert(
      document.bufferViews?.[accessor.bufferView],
      `${fixture.path}: accessor ${index} references missing bufferView ${accessor.bufferView}`,
    );
  }

  const nodeNames = new Set((document.nodes ?? []).map((node) => node.name).filter(Boolean));
  for (const requiredNode of fixture.requiredNodes) {
    assert(nodeNames.has(requiredNode), `${fixture.path}: missing semantic node '${requiredNode}'`);
  }

  assert(
    document.extensionsUsed?.includes("KHR_materials_unlit"),
    `${fixture.path}: reference fixture must declare KHR_materials_unlit`,
  );

  for (const [index, material] of (document.materials ?? []).entries()) {
    assert(
      material.extensions?.KHR_materials_unlit,
      `${fixture.path}: material ${index} must be unlit for deterministic reference rendering`,
    );
  }

  console.log(`✓ ${fixture.path}`);
}

for (const fixture of fixtures) {
  await validateFixture(fixture);
}

console.log(`Validated ${fixtures.length} showcase glTF fixtures.`);
