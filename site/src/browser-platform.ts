// The browser's view of the platform, which refines the server's guess after hydration.
// Safari and Firefox have no userAgentData, so they fall back to the User-Agent string.

import { detectPlatform, type Platform } from "./platform";

/** The parts of the navigator we read. */
interface BrowserNavigator {
  userAgent: string;
  maxTouchPoints?: number;
  userAgentData?: UserAgentData;
}

interface UserAgentData {
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string; bitness?: string }>;
}

export async function detectInBrowser(nav: BrowserNavigator = navigator): Promise<Platform> {
  const uaData = nav.userAgentData;
  let high: { architecture?: string; bitness?: string } = {};
  try {
    high = (await uaData?.getHighEntropyValues?.(["architecture", "bitness"])) ?? {};
  } catch {
    // Permissions or an old engine: the User-Agent string is enough for the OS.
  }
  return detectPlatform({
    userAgent: nav.userAgent,
    uaPlatform: uaData?.platform,
    architecture: high.architecture,
    bitness: high.bitness,
    touchPoints: nav.maxTouchPoints,
  });
}
