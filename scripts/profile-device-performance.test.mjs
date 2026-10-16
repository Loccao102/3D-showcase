import test from "node:test";
import assert from "node:assert/strict";
import { parseGlbDocument, analyzeGlb } from "./profile-device-performance.mjs";

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
  assert.equal(profile.geometryBufferKb, (60 / 1024).toFixed(1) + " KB");
  assert.equal(profile.imagesCount, 1);
});
