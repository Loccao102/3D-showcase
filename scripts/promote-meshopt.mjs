import { stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const modelDir = resolve(process.cwd(), "apps/web/public/models");
const gltfpackBin = process.env.GLTFPACK_BIN ?? "gltfpack";
const sourceProfile = process.argv[2] ?? "ktx2-hybrid";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runtimeSourceName(variant, lod) {
  if (sourceProfile === "ktx2-hybrid" && lod < 2) {
    return `astra-one-${variant}-lod${lod}-ktx2.glb`;
  }
  return `astra-one-${variant}-lod${lod}.glb`;
}

function meshoptOutputName(sourceName) {
  return sourceName.replace(/\.glb$/, "-meshopt.glb");
}

function runGltfpack(args, label) {
  const result = spawnSync(gltfpackBin, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    throw new Error(`${label}: unable to execute '${gltfpackBin}': ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${label}: gltfpack exited ${result.status}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    );
  }

  return (result.stdout ?? "").trim();
}

runGltfpack(["-v"], "gltfpack version check");

for (const variant of ["touring", "sport"]) {
  for (const lod of [0, 1, 2]) {
    const sourceName = runtimeSourceName(variant, lod);
    const outputName = meshoptOutputName(sourceName);
    const sourcePath = resolve(modelDir, sourceName);
    const outputPath = resolve(modelDir, outputName);

    const source = await stat(sourcePath).catch(() => null);
    assert(source, `${sourceName}: source runtime asset does not exist`);

    runGltfpack(
      [
        "-i",
        sourcePath,
        "-o",
        outputPath,
        "-cc",
        "-noq",
        "-kn",
        "-km",
        "-ke",
      ],
      `meshopt ${sourceName}`,
    );

    const output = await stat(outputPath);
    console.log(
      `meshopt ${basename(outputPath)} | source=${source.size}B runtime=${output.size}B delta=${output.size - source.size}B`,
    );
  }
}
