// The app screenshots on the home page. To add one: put its four files in site/public/screenshots/
// (names from the README), then set `ready: true`. Until then a placeholder frame stands in.

export interface ScreenshotSet {
  light: string;
  dark: string;
}

export interface Screenshot {
  id: string;
  caption: string;
  /** Describes what the screenshot shows; read by screen readers. */
  alt: string;
  /** False until the files exist; the page shows a placeholder until then. */
  ready: boolean;
  desktop: ScreenshotSet;
  phone: ScreenshotSet;
}

const files = (id: string, kind: "desktop" | "phone"): ScreenshotSet => ({
  light: `/screenshots/${id}-${kind}-light.png`,
  dark: `/screenshots/${id}-${kind}-dark.png`,
});

export const SCREENSHOTS: Screenshot[] = [
  {
    id: "library",
    caption: "Your library",
    alt: "Sonor's library: albums from the server in a grid, with the album being played at the bottom.",
    ready: false,
    desktop: files("library", "desktop"),
    phone: files("library", "phone"),
  },
  {
    id: "now-playing",
    caption: "Now playing",
    alt: "Sonor's now-playing screen: the cover, the track, the progress and the lyrics of the song.",
    ready: false,
    desktop: files("now-playing", "desktop"),
    phone: files("now-playing", "phone"),
  },
  {
    id: "car",
    caption: "In the car",
    alt: "Sonor in the car: the browse and play screens as they show on CarPlay or Android Auto.",
    ready: false,
    desktop: files("car", "desktop"),
    phone: files("car", "phone"),
  },
];
