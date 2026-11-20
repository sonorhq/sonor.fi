// Which OS and architecture the visitor is on. Pure, so the server guess and the
// browser refinement share one table and the tests cover both.

export type OS = "windows" | "macos" | "linux" | "android" | "ios" | "unknown";
export type Arch = "x64" | "arm64" | "unknown";

export interface Platform {
  os: OS;
  arch: Arch;
}

/** What the browser or the request tells us. Every field is optional. */
export interface PlatformHints {
  userAgent?: string;
  /** `Sec-CH-UA-Platform` or `navigator.userAgentData.platform`: "Windows", "macOS"… */
  uaPlatform?: string;
  /** High-entropy hints: "x86" or "arm", and "64" or "32". */
  architecture?: string;
  bitness?: string;
  /** `navigator.maxTouchPoints`: an iPad asks for a desktop site and reads as a Mac. */
  touchPoints?: number;
}

const unquote = (value: string | null): string | undefined => value?.replace(/^"|"$/g, "") || undefined;

/** Reads the client hints and the User-Agent from a request. */
export function hintsFromHeaders(headers: Headers | Record<string, string>): PlatformHints {
  const get = (name: string) => (headers instanceof Headers ? headers.get(name) : (headers[name] ?? null));
  return {
    userAgent: get("user-agent") ?? undefined,
    uaPlatform: unquote(get("sec-ch-ua-platform")),
    architecture: unquote(get("sec-ch-ua-arch")),
    bitness: unquote(get("sec-ch-ua-bitness")),
  };
}

export function detectPlatform(h: PlatformHints): Platform {
  const ua = h.userAgent ?? "";
  const os = detectOS(h, ua);
  return { os, arch: detectArch(h, ua) };
}

function detectOS(h: PlatformHints, ua: string): OS {
  const p = (h.uaPlatform ?? "").toLowerCase();
  if (p === "windows") return "windows";
  if (p === "macos") return h.touchPoints && h.touchPoints > 1 ? "ios" : "macos";
  if (p === "linux") return "linux";
  if (p === "android") return "android";
  if (p === "ios") return "ios";
  // Chrome OS and anything else we don't ship for.
  if (p !== "") return "unknown";

  // iOS first: its User-Agent also says "like Mac OS X". Android says "Linux".
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  if (/cros/i.test(ua)) return "unknown";
  if (/windows/i.test(ua)) return "windows";
  if (/macintosh|mac os x/i.test(ua)) return h.touchPoints && h.touchPoints > 1 ? "ios" : "macos";
  if (/linux|x11/i.test(ua)) return "linux";
  return "unknown";
}

function detectArch(h: PlatformHints, ua: string): Arch {
  const a = (h.architecture ?? "").toLowerCase();
  if (a === "arm") return h.bitness === "32" ? "unknown" : "arm64";
  if (a === "x86") return h.bitness === "32" ? "unknown" : "x64";

  if (/aarch64|arm64/i.test(ua)) return "arm64";
  if (/x86_64|x64|win64|wow64|amd64/i.test(ua)) return "x64";
  return "unknown";
}
