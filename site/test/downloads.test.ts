import { describe, expect, it } from "vitest";
import {
  checksumsHref,
  groupByOS,
  librarySources,
  pickFile,
  releaseFiles,
  type Release,
} from "../src/downloads";
import type { Platform } from "../src/platform";

// The assets of v0.1.0-beta.23, as the GitHub API names them.
const BASE = "https://github.com/sonorhq/sonor/releases/download/v0.1.0-beta.23/";
const asset = (name: string, size = 100 * 1024 * 1024) => ({ name, browser_download_url: BASE + name, size });

const beta23: Release = {
  tag_name: "v0.1.0-beta.23",
  html_url: "https://github.com/sonorhq/sonor/releases/tag/v0.1.0-beta.23",
  assets: [
    asset("SHA256SUMS", 1000),
    asset("sonor-0.1.0-beta.23-d265ff1-android.apk"),
    asset("sonor-0.1.0-beta.23-d265ff1-macos.dmg"),
    asset("sonor-0.1.0-beta.23-d265ff1-macos.zip"),
    asset("sonor-0.1.0-beta.23-d265ff1-windows-setup.exe"),
    asset("sonor-0.1.0-beta.23-d265ff1-x86_64.AppImage"),
    asset("sonor-0.1.0-beta.23-d265ff1-x86_64.pkg.tar.zst"),
    asset("sonor-libmpv-sources-linux-x86_64.tar"),
    asset("sonor-libmpv-sources-macos-arm64.tar"),
    asset("sonor-libmpv-sources-windows-x86_64.tar"),
  ],
};

// A release with builds for arm64 and an explicit x86_64 Windows installer, as they may come.
const withArm: Release = {
  ...beta23,
  tag_name: "v0.2.0",
  assets: [
    ...beta23.assets,
    asset("sonor-0.2.0-abc1234-linux-arm64.AppImage"),
    asset("sonor-0.2.0-abc1234-windows-arm64-setup.exe"),
    asset("sonor-0.2.0-abc1234-windows-x86_64-setup.exe"),
  ],
};

const at = (os: Platform["os"], arch: Platform["arch"] = "unknown"): Platform => ({ os, arch });

describe("releaseFiles", () => {
  it("maps each sonor file to its platform and format", () => {
    expect(releaseFiles(beta23).map(({ os, format, arch, name }) => [os, format, arch, name])).toEqual([
      ["android", "apk", "any", "sonor-0.1.0-beta.23-d265ff1-android.apk"],
      ["macos", "dmg", "any", "sonor-0.1.0-beta.23-d265ff1-macos.dmg"],
      ["macos", "zip", "any", "sonor-0.1.0-beta.23-d265ff1-macos.zip"],
      ["windows", "setup", "any", "sonor-0.1.0-beta.23-d265ff1-windows-setup.exe"],
      ["linux", "appimage", "x64", "sonor-0.1.0-beta.23-d265ff1-x86_64.AppImage"],
      ["linux", "arch-package", "x64", "sonor-0.1.0-beta.23-d265ff1-x86_64.pkg.tar.zst"],
    ]);
  });

  it("reads arch tokens from new names", () => {
    const arch = releaseFiles(withArm).filter((f) => f.arch === "arm64" || f.name.includes("x86_64-setup"));
    expect(arch.map((f) => f.name)).toEqual([
      "sonor-0.2.0-abc1234-linux-arm64.AppImage",
      "sonor-0.2.0-abc1234-windows-arm64-setup.exe",
      "sonor-0.2.0-abc1234-windows-x86_64-setup.exe",
    ]);
  });
});

describe("pickFile", () => {
  const files = releaseFiles(beta23);

  it.each([
    [at("windows", "x64"), "windows-setup.exe"],
    [at("windows", "arm64"), "windows-setup.exe"],
    [at("macos", "arm64"), "macos.dmg"],
    [at("macos", "unknown"), "macos.dmg"],
    [at("linux", "x64"), "x86_64.AppImage"],
    [at("android"), "android.apk"],
  ] as const)("offers the file for %j", (platform, suffix) => {
    expect(pickFile(files, platform)?.name.endsWith(suffix)).toBe(true);
  });

  it("offers nothing for arm64 Linux when the release has no arm64 build", () => {
    expect(pickFile(files, at("linux", "arm64"))).toBeUndefined();
  });

  it("offers nothing for iOS or an unknown platform", () => {
    expect(pickFile(files, at("ios"))).toBeUndefined();
    expect(pickFile(files, at("unknown"))).toBeUndefined();
  });

  it("prefers the file built for the visitor's architecture", () => {
    const f = releaseFiles(withArm);
    expect(pickFile(f, at("linux", "arm64"))?.name).toBe("sonor-0.2.0-abc1234-linux-arm64.AppImage");
    expect(pickFile(f, at("windows", "x64"))?.name).toBe("sonor-0.2.0-abc1234-windows-x86_64-setup.exe");
    expect(pickFile(f, at("windows", "arm64"))?.name).toBe("sonor-0.2.0-abc1234-windows-arm64-setup.exe");
  });

  it("falls back to the x64 installer on Windows on ARM, which runs it emulated", () => {
    const onlyX64 = releaseFiles({ ...beta23, assets: [asset("sonor-0.1.0-beta.23-d265ff1-windows-x86_64-setup.exe")] });
    expect(pickFile(onlyX64, at("windows", "arm64"))?.name).toBe("sonor-0.1.0-beta.23-d265ff1-windows-x86_64-setup.exe");
  });
});

describe("groupByOS", () => {
  it("lists the platforms in order, each with its formats in their order", () => {
    const groups = groupByOS(releaseFiles(beta23));
    expect(groups.map((g) => g.os)).toEqual(["windows", "macos", "linux", "android"]);
    expect(groups[1].files.map((f) => f.format)).toEqual(["dmg", "zip"]);
    expect(groups[2].files.map((f) => f.format)).toEqual(["appimage", "arch-package"]);
  });
});

describe("release assets that are not app files", () => {
  it("finds the checksums and the libmpv source bundles", () => {
    expect(checksumsHref(beta23)).toBe(BASE + "SHA256SUMS");
    expect(librarySources(beta23).map((a) => a.name)).toEqual([
      "sonor-libmpv-sources-linux-x86_64.tar",
      "sonor-libmpv-sources-macos-arm64.tar",
      "sonor-libmpv-sources-windows-x86_64.tar",
    ]);
  });

  it("finds nothing when the release has none of them", () => {
    const bare: Release = { ...beta23, assets: [] };
    expect(checksumsHref(bare)).toBeUndefined();
    expect(librarySources(bare)).toEqual([]);
    expect(releaseFiles(bare)).toEqual([]);
  });
});
