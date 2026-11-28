import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import vike from "vike/plugin";
import { defineConfig, type Plugin } from "vite";
import { routeOf, sitemapXml } from "./src/sitemap.ts";

// The date of the last commit touching these paths; today when git has none (a new page, no git).
function lastCommitDate(root: string, paths: string[]): string {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", ...paths], { cwd: root, encoding: "utf8" }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(out)) return out;
  } catch {}
  return new Date().toISOString().slice(0, 10);
}

// The files outside its own folder that each page's content comes from, so lastmod moves only with that page.
const PAGE_CONTENT: Record<string, string[]> = {
  "/": ["src/features.ts", "src/screenshots.ts", "src/shots.ts", "src/components"],
  "/discover": ["src/features.ts", "src/components/Features.tsx", "src/components/ShotPair.tsx"],
};

// Writes sitemap.xml into the client build from pages/, so a new page is listed with no hand edit.
function sitemap(): Plugin {
  return {
    name: "sonor:sitemap",
    applyToEnvironment: (environment) => environment.name === "client",
    generateBundle() {
      const root = this.environment.config.root;
      const entries = readdirSync(join(root, "pages"), { recursive: true, encoding: "utf8" })
        .map((f) => `pages/${f.split("\\").join("/")}`)
        .flatMap((file) => {
          const path = routeOf(file);
          return path === null ? [] : [{ path, lastmod: lastCommitDate(root, [file.slice(0, file.lastIndexOf("/")), ...(PAGE_CONTENT[path] ?? [])]) }];
        });
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemapXml(entries) });
    },
  };
}

export default defineConfig({
  plugins: [cloudflare({ viteEnvironment: { name: "ssr" } }), vike(), react(), sitemap()],
});
