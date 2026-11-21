// Maps the release's asset names to platforms and picks the file a visitor should get.
// Matching is by name pattern, so arm64 builds or new formats show up without code changes
// as long as the name follows the same shape: sonor-<version>-<hash>-<platform>[-<arch>].<ext>.

import type { OS, Platform } from "./platform";

export const RELEASES_PAGE = "https://github.com/sonorhq/sonor/releases";
/** The public TestFlight link for the iPhone beta (1,000 testers at most). */
export const TESTFLIGHT = "https://testflight.apple.com/join/4wTvkRjG";

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size?: number;
}

export interface Release {
  tag_name: string;
  html_url: string;
  assets: ReleaseAsset[];
}

export type Format = "apk" | "dmg" | "zip" | "setup" | "appimage" | "arch-package";

export interface DownloadFile {
  os: Exclude<OS, "ios" | "unknown">;
  format: Format;
  /** "x64", "arm64", "universal", or "any" when the name has no arch. Other tokens are kept as they are. */
  arch: string;
  name: string;
  href: string;
  size?: number;
}

const RULES: { pattern: RegExp; os: DownloadFile["os"]; format: Format }[] = [
  { pattern: /-android\.apk$/, os: "android", format: "apk" },
  { pattern: /-macos\.dmg$/, os: "macos", format: "dmg" },
  { pattern: /-macos\.zip$/, os: "macos", format: "zip" },
  { pattern: /-windows(?:-(\w+))?-setup\.exe$/, os: "windows", format: "setup" },
  { pattern: /-(\w+)\.AppImage$/, os: "linux", format: "appimage" },
  { pattern: /-(\w+)\.pkg\.tar\.zst$/, os: "linux", format: "arch-package" },
];

/** Labels for the formats, as shown in the list. */
export const FORMAT_LABELS: Record<Format, string> = {
  apk: "APK",
  dmg: "Disk image",
  zip: "Zip archive",
  setup: "Installer",
  appimage: "AppImage",
  "arch-package": "Arch package",
};

/** Formats in the order the primary button tries them. */
const PRIMARY_FORMATS: Record<DownloadFile["os"], Format[]> = {
  android: ["apk"],
  macos: ["dmg", "zip"],
  windows: ["setup"],
  linux: ["appimage", "arch-package"],
};

const OS_ORDER: DownloadFile["os"][] = ["windows", "macos", "linux", "android"];

function normalizeArch(token: string | undefined): string {
  if (token === undefined) return "any";
  const t = token.toLowerCase();
  if (t === "x86_64" || t === "x64" || t === "amd64") return "x64";
  if (t === "arm64" || t === "aarch64") return "arm64";
  if (t === "universal") return "universal";
  return t;
}

/** Architectures a visitor can run, best first. Windows on ARM runs the x64 build emulated. */
function acceptedArch(os: DownloadFile["os"], arch: Platform["arch"]): string[] {
  switch (os) {
    case "windows":
      return arch === "arm64" ? ["arm64", "x64", "any"] : ["x64", "any"];
    case "linux":
      return arch === "arm64" ? ["arm64", "any"] : ["x64", "any"];
    case "macos":
      // Apple Silicon can run an Intel build under Rosetta, and Intel can't run an arm64 one.
      return arch === "arm64" ? ["arm64", "universal", "x64", "any"] : ["universal", "x64", "any", "arm64"];
    case "android":
      return ["any"];
  }
}

/** Which asset names this release has for the sonor app, one entry per file. */
export function releaseFiles(release: Release): DownloadFile[] {
  const files: DownloadFile[] = [];
  for (const asset of release.assets) {
    for (const rule of RULES) {
      const match = rule.pattern.exec(asset.name);
      if (!match) continue;
      files.push({
        os: rule.os,
        format: rule.format,
        arch: normalizeArch(match[1]),
        name: asset.name,
        href: asset.browser_download_url,
        size: asset.size,
      });
      break;
    }
  }
  return files;
}

/** The file the primary button offers for a platform, or undefined when there isn't one. */
export function pickFile(files: DownloadFile[], p: Platform): DownloadFile | undefined {
  if (p.os === "ios" || p.os === "unknown") return undefined;
  for (const format of PRIMARY_FORMATS[p.os]) {
    for (const arch of acceptedArch(p.os, p.arch)) {
      const file = files.find((f) => f.os === p.os && f.format === format && f.arch === arch);
      if (file) return file;
    }
  }
  return undefined;
}

/** Files grouped by OS in display order, each group in the format order of its platform. */
export function groupByOS(files: DownloadFile[]): { os: DownloadFile["os"]; files: DownloadFile[] }[] {
  return OS_ORDER.map((os) => ({
    os,
    files: PRIMARY_FORMATS[os].flatMap((format) => files.filter((f) => f.os === os && f.format === format)),
  })).filter((group) => group.files.length > 0);
}

/** The SHA256SUMS file of a release, if it has one. */
export function checksumsHref(release: Release): string | undefined {
  return release.assets.find((a) => a.name === "SHA256SUMS")?.browser_download_url;
}

/** The LGPL source bundles of libmpv that the release carries. */
export function librarySources(release: Release): ReleaseAsset[] {
  return release.assets.filter((a) => /^sonor-libmpv-sources-.+\.tar$/.test(a.name));
}
