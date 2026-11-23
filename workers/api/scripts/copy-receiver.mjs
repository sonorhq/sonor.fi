// Copies the built Cast receiver (cast-receiver/dist) into public/cast/receiver and receiver-next,
// where the Worker serves it from. Run after `pnpm --filter sonor-cast-receiver build`.
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "..", "..", "cast-receiver", "dist");
// Only these files are served (see RECEIVER_TYPES in src/index.ts); a build with anything else is a mistake.
const expected = ["index.html", "main.css", "main.js"];

const found = (await readdir(dist).catch(() => [])).sort();
if (JSON.stringify(found) !== JSON.stringify(expected)) {
  console.error(`cast-receiver/dist holds [${found}], expected [${expected}]: build it with pnpm --filter sonor-cast-receiver build`);
  process.exit(1);
}
for (const dir of ["receiver", "receiver-next"]) {
  const target = join(root, "public", "cast", dir);
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(dist, target, { recursive: true });
}
