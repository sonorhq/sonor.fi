// Run after a deploy with the built sitemap: node --experimental-strip-types site/scripts/indexnow.ts <sitemap.xml>.
// Always exits 0, so a failed ping never fails the deploy.
import { readFile } from "node:fs/promises";
import { submitToIndexNow } from "../src/indexnow.ts";

try {
  const xml = await readFile(process.argv[2], "utf8");
  console.log(await submitToIndexNow(xml));
} catch (error) {
  console.log(`IndexNow skipped: ${error instanceof Error ? error.message : String(error)}`);
}
