import test from "node:test";
import assert from "node:assert/strict";
import { parseGlbDocument, analyzeGlb, validateProfileContracts } from "./profile-device-performance.mjs";

function glb(json) {
  const data = Buffer.from(JSON.stringify(json));
  const padded = Buffer.concat([data, Buffer.alloc((4 - data.byteLength % 4) % 4, 0x20)]);
  const output = Buffer.alloc(20 + padded.byteLength);
  output.writeUInt32LE(0x46546c67, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.byteLength, 8);
  output.writeUInt32LE(padded.byteLength, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(output, 20);
  return output;
}

test("required vehicle asset contracts cannot silently disappear or lose their budgets", () => {
  const vehicle = "astra-one-sport-lod0.glb";
  const furniture = "kroma-chair-lod0.glb";
  const valid = {
    path: "apps/web/public/models/" + vehicle,
    maxFileBytes: 60000,
    maxTriangles: 500,
  };
  assert.equal(
    validateProfileContracts([vehicle, furniture], { assets: [valid] }).get(vehicle),
    valid
  );
  assert.throws(
    () => validateProfileContracts([vehicle, furniture], { assets: [] }),
    /missing required vehicle asset budget contract/
  );
  assert.throws(
    () => validateProfileContracts([vehicle], { assets: [valid, { ...valid }] }),
    /Duplicate asset budget contract/
  );
  for (const broken of [
    { ...valid, maxFileBytes: 0 },
    { ...valid, maxTriangles: undefined },
    { ...valid, maxTriangles: -5 },
  ]) {
    assert.throws(
      () => validateProfileContracts([vehicle], { assets: [broken] }),
      /contract must specify/
    );
  }
  assert.equal(
    validateProfileContracts([furniture], { assets: [] }).size,
    0,
    "unbudgeted furniture remains a supported audit outcome"
  );
});

test("accepts valid GLB with an exact header length", () => {
  const bytes = glb({ asset: { version: "2.0" }, meshes: [] });
  assert.equal(parseGlbDocument(bytes, "test.glb").asset.version, "2.0");
});

test("rejects a GLB with a forged length, truncated chunk, or missing magic", () => {
  const valid = glb({ asset: { version: "2.0" } });
  const forged = Buffer.from(valid);
  forged.writeUInt32LE(valid.byteLength + 4, 8);
  assert.throws(() => parseGlbDocument(forged, "bad.glb"), /declared GLB file length/);

  const truncated = Buffer.from(valid);
  truncated.writeUInt32LE(valid.byteLength, 12);
  assert.throws(() => parseGlbDocument(truncated, "bad.glb"), /out of range/);

  const wrongMagic = Buffer.from(valid);
  wrongMagic.writeUInt32LE(0, 0);
  assert.throws(() => parseGlbDocument(wrongMagic, "bad.glb"), /invalid GLB magic/);
});

test("rejects corrupt trailing BIN chunks even when the JSON chunk is valid", () => {
  const doc = glb({ asset: { version: "2.0" } });
  const corrupt = Buffer.concat([doc, Buffer.alloc(8)]);
  corrupt.writeUInt32LE(corrupt.byteLength, 8);
  corrupt.writeUInt32LE(16, doc.byteLength);
  corrupt.writeUInt32LE(0x004e4942, doc.byteLength + 4);
  assert.throws(
    () => parseGlbDocument(corrupt, "truncated-bin.glb"),
    /GLB chunk is out of range/
  );
});

test("rejects BIN-first, unaligned and duplicate JSON chunks", () => {
  const original = glb({ asset: { version: "2.0" } });
  const binFirst = Buffer.from(original);
  binFirst.writeUInt32LE(0x004e4942, 16);
  assert.throws(
    () => parseGlbDocument(binFirst, "bin-first.glb"),
    /first GLB chunk must be JSON/
  );

  const unaligned = Buffer.from(original);
  unaligned.writeUInt32LE(unaligned.readUInt32LE(12) - 1, 12);
  assert.throws(
    () => parseGlbDocument(unaligned, "unaligned.glb"),
    /four-byte aligned/
  );

  const jsonLength = original.readUInt32LE(12);
  const duplicate = Buffer.concat([
    original,
    Buffer.alloc(8),
    original.subarray(20, 20 + jsonLength),
  ]);
  duplicate.writeUInt32LE(duplicate.byteLength, 8);
  duplicate.writeUInt32LE(jsonLength, original.byteLength);
  duplicate.writeUInt32LE(0x4e4f534a, original.byteLength + 4);
  assert.throws(
    () => parseGlbDocument(duplicate, "duplicate-json.glb"),
    /duplicate GLB JSON chunk/
  );
});

test("GLB embedded buffers need a BIN chunk with correct size and padding", () => {
  const addBin = (json, byteLength) => {
    const original = glb(json);
    const binary = Buffer.alloc(8 + byteLength);
    binary.writeUInt32LE(byteLength, 0);
    binary.writeUInt32LE(0x004e4942, 4);
    const output = Buffer.concat([original, binary]);
    output.writeUInt32LE(output.byteLength, 8);
    return output;
  };
  const declaredFour = { asset: { version: "2.0" }, buffers: [{ byteLength: 4 }] };

  assert.throws(
    () => parseGlbDocument(glb(declaredFour), "missing-bin.glb"),
    /GLB BIN chunk does not match embedded buffer byteLength/
  );
  assert.throws(
    () => parseGlbDocument(addBin({
      asset: { version: "2.0" }, buffers: [{ byteLength: 8 }]
    }, 4), "short-bin.glb"),
    /GLB BIN chunk does not match embedded buffer byteLength/
  );
  assert.throws(
    () => parseGlbDocument(addBin(declaredFour, 8), "oversized-bin.glb"),
    /GLB BIN chunk does not match embedded buffer byteLength/
  );
  assert.equal(parseGlbDocument(
    addBin(declaredFour, 4), "matching-bin.glb"
  ).buffers[0].byteLength, 4);
  assert.equal(parseGlbDocument(
    addBin({ asset: { version: "2.0" }, buffers: [{ byteLength: 1 }] }, 4),
    "padded-bin.glb"
  ).buffers[0].byteLength, 1);
  assert.throws(
    () => parseGlbDocument(glb({
      asset: { version: "2.0" }, buffers: [{ byteLength: -4 }]
    }), "invalid-bin-length.glb"),
    /invalid embedded buffer byteLength/
  );
});

test("accepts a correctly encoded binary chunk after the JSON document", () => {
  const original = glb({ asset: { version: "2.0" } });
  const full = Buffer.concat([original, Buffer.alloc(8), Buffer.alloc(8)]);
  full.writeUInt32LE(full.byteLength, 8);
  full.writeUInt32LE(8, original.byteLength);
  full.writeUInt32LE(0x004e4942, original.byteLength + 4);
  assert.equal(parseGlbDocument(full, "valid-bin.glb").asset.version, "2.0");
});

test("rejects a duplicate GLB BIN chunk or a BIN chunk after extensions", () => {
  const json = glb({ asset: { version: "2.0" }, meshes: [] });
  const binChunk = Buffer.alloc(12);
  binChunk.writeUInt32LE(4, 0);
  binChunk.writeUInt32LE(0x004e4942, 4);

  const duplicate = Buffer.concat([json, binChunk, binChunk]);
  duplicate.writeUInt32LE(duplicate.byteLength, 8);
  assert.throws(
    () => parseGlbDocument(duplicate, "duplicate-bin.glb"),
    /duplicate or misplaced GLB BIN chunk/
  );

  const extensionChunk = Buffer.alloc(12);
  extensionChunk.writeUInt32LE(4, 0);
  extensionChunk.writeUInt32LE(0x12345678, 4);
  const misplaced = Buffer.concat([json, extensionChunk, binChunk]);
  misplaced.writeUInt32LE(misplaced.byteLength, 8);
  assert.throws(
    () => parseGlbDocument(misplaced, "misplaced-bin.glb"),
    /duplicate or misplaced GLB BIN chunk/
  );

  // Unknown extension chunks after a valid BIN chunk remain permitted.
  const allowed = Buffer.concat([json, binChunk, extensionChunk]);
  allowed.writeUInt32LE(allowed.byteLength, 8);
  assert.equal(parseGlbDocument(allowed, "extension.glb").asset.version, "2.0");
});

test("rejects unrelated JSON documents and unsupported glTF asset versions", () => {
  for (const value of [[], null, {}, { asset: { version: "1.0" } }, { asset: { version: "2.1" } }]) {
    assert.throws(
      () => parseGlbDocument(glb(value), "not-gltf.glb"),
      /glTF asset version 2.0/
    );
  }
});

test("null JSON chunk followed by another JSON chunk is still a duplicate", () => {
  const nullDocument = glb(null);
  const validDocument = glb({ asset: { version: "2.0" } });
  const duplicate = Buffer.concat([nullDocument, validDocument.subarray(12)]);
  duplicate.writeUInt32LE(duplicate.byteLength, 8);
  assert.throws(
    () => parseGlbDocument(duplicate, "duplicate-null.glb"),
    /duplicate GLB JSON chunk/
  );
});

test("unknown geometry primitive modes must not escape the triangle budget", () => {
  for (const invalidMode of [-1, 7, 10, 4.5, "4"]) {
    assert.throws(() => analyzeGlb({
      meshes: [{ primitives: [{ mode: invalidMode, attributes: { POSITION: 0 } }] }],
      accessors: [{ count: 300000 }]
    }, 1000, "bad-mode.glb"), /invalid glTF primitive mode/);
  }
  for (const nonTriangleMode of [0, 1, 2, 3]) {
    assert.equal(analyzeGlb({
      meshes: [{ primitives: [{ mode: nonTriangleMode, attributes: { POSITION: 0 } }] }],
      accessors: [{ count: 6 }]
    }, 1000, "lines-or-points.glb").triangles, 0);
  }
});

test("geometry budget counts triangle strips and fans, not just TRIANGLES", () => {
  const doc = {
    meshes: [{
      primitives: [
        { mode: 4, attributes: { POSITION: 0 } },
        { mode: 5, indices: 1, attributes: { POSITION: 2 } },
        { mode: 6, attributes: { POSITION: 3 } },
        { mode: 1, indices: 4, attributes: { POSITION: 5 } },
      ],
    }],
    accessors: [
      { count: 9 },   // TRIANGLES: 3
      { count: 7 },   // STRIP: 5
      { count: 7 },
      { count: 6 },   // FAN: 4
      { count: 60 },  // LINES: zero triangles
      { count: 60 },
    ],
  };
  const profile = analyzeGlb(doc, 5000, "mixed-primitive.glb");
  assert.equal(profile.triangles, 12);
  assert.equal(profile.vertices, 9 + 7 + 6 + 60);
});

test("geometry estimate includes sparse accessor buffers without double counting", () => {
  const doc = {
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    accessors: [
      { count: 4, sparse: { count: 2, indices: { bufferView: 2 }, values: { bufferView: 3 } } },
      { count: 6, bufferView: 0 },
    ],
    bufferViews: [
      { byteLength: 12 }, // main indices
      { byteLength: 4096 }, // unrelated embedded image
      { byteLength: 8 }, // sparse override indices
      { byteLength: 24 }, // sparse override positions
    ],
    images: [{ bufferView: 1 }],
  };
  const result = analyzeGlb(doc, 5000, "sparse-mesh.glb");
  assert.equal(result.triangles, 2);
  // Exact bytes are required: rounding small sparse buffers to "0.0 KB"
  // would make this regression test pass even if the buffers were missing.
  assert.equal(result.geometryBufferBytes, 44);
  assert.equal(result.geometryBufferKb, (44 / 1024).toFixed(1) + " KB");
});

test("geometry estimate deduplicates mesh views and excludes embedded texture bytes", () => {
  const doc = {
    meshes: [{
      primitives: [{
        indices: 0,
        attributes: { POSITION: 1, NORMAL: 2 }
      }, {
        indices: 0,
        attributes: { POSITION: 1 }
      }]
    }],
    accessors: [
      { count: 6, bufferView: 0 },
      { count: 4, bufferView: 1 },
      { count: 4, bufferView: 1 },
    ],
    bufferViews: [
      { byteLength: 12 },
      { byteLength: 48 },
      { byteLength: 4096 }
    ],
    textures: [{ source: 0 }],
    images: [{ bufferView: 2 }]
  };
  const profile = analyzeGlb(doc, 4200, "fixture.glb");
  assert.equal(profile.triangles, 4);
  assert.equal(profile.geometryBufferBytes, 60);
  assert.equal(profile.geometryBufferKb, (60 / 1024).toFixed(1) + " KB");
  assert.equal(profile.imagesCount, 1);
});


test("rejects bad accessor references and geometry byte lengths instead of undercounting", () => {
  const profile = doc => analyzeGlb(doc, 4096, "broken-mesh.glb");
  assert.throws(() => profile({
    meshes: [{ primitives: [{ indices: 4, attributes: { POSITION: 0 } }] }],
    accessors: [{ count: 12 }],
  }), /missing or invalid mesh accessor count/);

  assert.throws(() => profile({
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ count: -100 }],
  }), /missing or invalid mesh accessor count/);

  assert.throws(() => profile({
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ count: 12, bufferView: 3 }],
    bufferViews: [{ byteLength: 48 }],
  }), /missing or invalid geometry buffer view/);

  assert.throws(() => profile({
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ count: 12, bufferView: 0 }],
    bufferViews: [{ byteLength: -48 }],
  }), /missing or invalid geometry buffer view/);
});

test("sparse geometry cannot bypass asset accounting with malformed view indices", () => {
  const base = {
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    bufferViews: [{ byteLength: 64 }, { byteLength: 16 }, { byteLength: 24 }],
    accessors: [{
      count: 12,
      bufferView: 0,
      sparse: { count: 2, indices: { bufferView: 1 }, values: { bufferView: 2 } },
    }],
  };
  const analyze = document => analyzeGlb(document, 500, "sparse-check.glb");
  assert.equal(analyze(base).geometryBufferBytes, 104);

  for (const count of [-1, 13, 1.2]) {
    const broken = structuredClone(base);
    broken.accessors[0].sparse.count = count;
    assert.throws(() => analyze(broken), /invalid sparse accessor count/);
  }
  for (const part of ["indices", "values"]) {
    const missing = structuredClone(base);
    delete missing.accessors[0].sparse[part].bufferView;
    assert.throws(() => analyze(missing), new RegExp(`missing or invalid sparse ${part} buffer view`));

    const invalid = structuredClone(base);
    invalid.accessors[0].sparse[part].bufferView = -1;
    assert.throws(() => analyze(invalid), /missing or invalid sparse/);
  }
  const outOfRange = structuredClone(base);
  outOfRange.accessors[0].sparse.values.bufferView = 99;
  assert.throws(() => analyze(outOfRange), /missing or invalid geometry buffer view/);
});
