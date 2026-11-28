// Run after a deploy with the built sitemap: node --experimental-strip-types site/scripts/indexnow.ts <sitemap.xml>.
// Always exits 0, so a failed ping never fails the deploy.
import { readFile } from "node:fs/promises";
import { NO_URLS, submitToIndexNow } from "../src/indexnow.ts";

try {
  const xml = await readFile(process.argv[2], "utf8");
  const result = await submitToIndexNow(xml);
  // A refusal is printed as a workflow warning, so the run shows an annotation; the exit code stays 0.
  const warn = !result.startsWith("IndexNow accepted") && result !== NO_URLS;
  console.log(warn ? `::warning::${result}` : result);
} catch (error) {
  console.log(`::warning::IndexNow skipped: ${error instanceof Error ? error.message : String(error)}`);
}
