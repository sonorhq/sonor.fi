import { describe, expect, it } from "vitest";
import { detectPlatform, hintsFromHeaders } from "../src/platform";

const UA = {
  win: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  linux: "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
  linuxArm: "Mozilla/5.0 (X11; Linux aarch64; rv:131.0) Gecko/20100101 Firefox/131.0",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  cros: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
};

describe("detectPlatform from the User-Agent", () => {
  it.each([
    [UA.win, "windows", "x64"],
    [UA.mac, "macos", "unknown"],
    [UA.linux, "linux", "x64"],
    [UA.linuxArm, "linux", "arm64"],
    [UA.android, "android", "unknown"],
    [UA.iphone, "ios", "unknown"],
    [UA.ipad, "ios", "unknown"],
    [UA.cros, "unknown", "x64"],
    ["", "unknown", "unknown"],
  ])("reads %s", (userAgent, os, arch) => {
    expect(detectPlatform({ userAgent })).toEqual({ os, arch });
  });
});

describe("detectPlatform from client hints", () => {
  it("prefers the platform hint over the User-Agent", () => {
    expect(detectPlatform({ userAgent: UA.win, uaPlatform: "macOS" }).os).toBe("macos");
    expect(detectPlatform({ userAgent: UA.win, uaPlatform: "Android" }).os).toBe("android");
    expect(detectPlatform({ userAgent: UA.win, uaPlatform: "iOS" }).os).toBe("ios");
  });

  it("treats platforms without a build as unknown", () => {
    expect(detectPlatform({ userAgent: UA.win, uaPlatform: "Chrome OS" }).os).toBe("unknown");
  });

  it("reads the architecture and bitness hints", () => {
    expect(detectPlatform({ userAgent: UA.win, uaPlatform: "Windows", architecture: "arm", bitness: "64" })).toEqual({
      os: "windows",
      arch: "arm64",
    });
    expect(detectPlatform({ userAgent: UA.win, architecture: "x86", bitness: "64" }).arch).toBe("x64");
    expect(detectPlatform({ userAgent: UA.win, architecture: "x86", bitness: "32" }).arch).toBe("unknown");
  });

  it("reads an iPad that asks for the desktop site as iOS", () => {
    expect(detectPlatform({ userAgent: UA.mac, touchPoints: 5 }).os).toBe("ios");
    expect(detectPlatform({ userAgent: UA.mac, touchPoints: 0 }).os).toBe("macos");
  });
});

describe("hintsFromHeaders", () => {
  it("reads the User-Agent and the client hints, without their quotes", () => {
    const headers = new Headers({
      "User-Agent": UA.win,
      "Sec-CH-UA-Platform": '"Windows"',
      "Sec-CH-UA-Arch": '"arm"',
      "Sec-CH-UA-Bitness": '"64"',
    });
    expect(hintsFromHeaders(headers)).toEqual({
      userAgent: UA.win,
      uaPlatform: "Windows",
      architecture: "arm",
      bitness: "64",
    });
  });

  it("accepts the lower-case header record that Vike passes in", () => {
    expect(hintsFromHeaders({ "user-agent": UA.mac, "sec-ch-ua-platform": '"macOS"' })).toEqual({
      userAgent: UA.mac,
      uaPlatform: "macOS",
    });
  });

  it("leaves absent headers out", () => {
    expect(hintsFromHeaders(new Headers())).toEqual({
      userAgent: undefined,
      uaPlatform: undefined,
      architecture: undefined,
      bitness: undefined,
    });
  });
});
