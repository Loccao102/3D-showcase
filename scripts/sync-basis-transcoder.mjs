import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(resolve(process.cwd(), "package.json"));
const threeEntry = require.resolve("three");
const threeRoot = resolve(dirname(threeEntry), "..");
const source = resolve(threeRoot, "examples/jsm/libs/basis");
const destination = resolve(process.cwd(), "public/basis");

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });

console.log(`Synced Three.js Basis transcoder to ${destination}`);
