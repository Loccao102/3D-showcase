import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const useKtx2 =
  process.env.SHOWCASE_ASSET_ENCODING === "ktx2" ||
  process.env.NEXT_PUBLIC_SHOWCASE_ASSET_ENCODING === "ktx2";

function runNode(script) {
  const scriptPath = resolve(projectRoot, script);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

runNode("scripts/generate-astra-concept.mjs");
runNode("scripts/texture-astra-concept.mjs");

if (useKtx2) {
  console.log("Preparing KTX2/BasisLZ runtime hero assets.");
  runNode("scripts/promote-ktx2.mjs");
} else {
  console.log(
    "Preparing PNG-textured hero assets. Set SHOWCASE_ASSET_ENCODING=ktx2 to promote runtime GLBs.",
  );
}
