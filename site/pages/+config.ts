import vikeReact from "vike-react/config";
import type { Config } from "vike/types";

export default {
  extends: vikeReact,
  lang: "en",
  description: "Sonor is a music player for Subsonic, OpenSubsonic (Navidrome and the like), Jellyfin and Emby servers, on macOS, Windows, Linux, Android and iPhone.",
} satisfies Config;
