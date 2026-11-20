// The app screenshots on the home page. To add one: put its two files in site/public/screenshots/
// (names from the README), then set `ready: true` and write the alt text. Until then the page shows a
// silhouette of the player. The page's pair shows the first entry.

export interface Screenshot {
  id: string;
  caption: string;
  /** Describes what the screenshot shows; read by screen readers once the file exists. */
  alt: string;
  /** False until the files exist. */
  ready: boolean;
  /** Paths of the desktop (16:10) and phone (9:19.5) files. */
  desktop: string;
  phone: string;
}

const files = (id: string) => ({
  desktop: `/screenshots/${id}-desktop.png`,
  phone: `/screenshots/${id}-phone.png`,
});

export const SCREENSHOTS: Screenshot[] = [
  {
    id: "library",
    caption: "Your library",
    alt: "Sonor's library: albums from the server in a grid, with the album being played at the bottom.",
    ready: false,
    ...files("library"),
  },
  {
    id: "now-playing",
    caption: "Now playing",
    alt: "Sonor's now-playing screen: the cover, the track, the progress and the lyrics of the song.",
    ready: false,
    ...files("now-playing"),
  },
  {
    id: "car",
    caption: "In the car",
    alt: "Sonor in the car: the browse and play screens as they show on CarPlay or Android Auto.",
    ready: false,
    ...files("car"),
  },
];
