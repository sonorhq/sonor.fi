import type { PhoneShot } from "./shots";

// The app screenshots on the home page, from the owner's app (dark only, as the app is).
// A desktop shot is required; a phone shot beside it is optional and goes in `phone` once it exists.
// An entry shows only when `ready` is true, so a shot can be added before its files are.

export interface Screenshot {
  id: string;
  caption: string;
  /** Describes what the screenshot shows; read by screen readers. */
  alt: string;
  ready: boolean;
  /** The desktop file, 1600 × 1005 (about 16:10). */
  desktop: string;
  /** The phone shot, 900 × 1950 (9:19.5), shown beside the desktop one when it is ready. */
  phone?: PhoneShot;
}

export const SCREENSHOTS: Screenshot[] = [
  {
    id: "home",
    caption: "Home",
    alt: "Sonor's home screen: quick picks and album grids for recently played and recently added music, with the play queue open on the right.",
    ready: true,
    desktop: "/screenshots/desktop-home.webp",
  },
  {
    id: "discover",
    caption: "Discover",
    alt: "Sonor's Discover page with an Octo server: mixes made for you, artist stations and charts, beside your own library.",
    ready: true,
    desktop: "/screenshots/desktop-discover.webp",
  },
  {
    id: "nowplaying",
    caption: "Playlist and Now Playing",
    alt: "A playlist page in Sonor with the playing song highlighted, and the Now Playing panel on the right with its cover.",
    ready: true,
    desktop: "/screenshots/desktop-nowplaying.webp",
  },
];
