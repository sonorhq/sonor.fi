// The feature copy of the home page. Each claim here is something the app does today; the things still
// on the way are in COMING. An entry's image sits above its text and shows only when `ready` is true, so
// a picture can be added before its file exists (like the app screenshots in screenshots.ts).

export interface FeatureImage {
  /** The file under public/screenshots/, WebP. */
  src: string;
  /** The file's pixel size, so the browser reserves the space before it loads. */
  width: number;
  height: number;
  /** Describes what the picture shows; read by screen readers. */
  alt: string;
  ready: boolean;
}

export interface Feature {
  id: string;
  title: string;
  text: string;
  /** Where it works: a platform list, or "Everywhere". Only the core list shows it. */
  where?: string;
  image?: FeatureImage;
  /** A built-in picture drawn in the page instead of a screenshot. */
  visual?: "accent-icons";
}

/** The accent presets shown on the accent block, with the brand kit's dark tile for each (docs/brand/README.md). */
export const ACCENT_ICONS = [
  { name: "Sonor orange", accent: "#f4743b", tile: "#291006" },
  { name: "Rose", accent: "#f43f5e", tile: "#2a0f11" },
  { name: "Violet", accent: "#8b5cf6", tile: "#19142b" },
  { name: "Blue", accent: "#3b82f6", tile: "#0b182d" },
  { name: "Teal", accent: "#14b8a6", tile: "#001e1a" },
  { name: "Green", accent: "#22c55e", tile: "#071e0d" },
];

/** The picture of a feature, when it has one that is ready to show. */
export function readyImage(feature: Feature): FeatureImage | undefined {
  return feature.image?.ready ? feature.image : undefined;
}

/** What Sonor does on any server it can connect to. */
export const CORE_FEATURES: Feature[] = [
  {
    id: "offline",
    title: "Offline downloads",
    text: "Keep albums, playlists and songs on the device and play them with no connection.",
    where: "Desktop · Android · iPhone",
    image: {
      src: "/screenshots/features/offline.webp",
      width: 1600,
      height: 1005,
      alt: "The Downloads tab of Sonor's library, listing the albums and songs kept on the device for offline play.",
      ready: true,
    },
  },
  {
    id: "gapless",
    title: "Gapless playback",
    text: "Albums and continuous mixes run straight through, with no silence between tracks.",
    where: "Everywhere",
  },
  {
    id: "cache",
    title: "Songs ahead",
    text: "The next songs in the queue are fetched in advance, so they start without a wait. You choose how many and how much space they use, and Sonor fetches fewer on mobile data.",
    where: "Everywhere",
  },
  {
    id: "lyrics",
    title: "Synced lyrics",
    text: "Lyrics follow the line being sung. If your server has none, Sonor can look them up on LRCLIB, and you can switch that off.",
    where: "Everywhere",
    image: {
      src: "/screenshots/features/lyrics.webp",
      width: 1600,
      height: 1005,
      alt: "Sonor's lyrics view, with the line being sung highlighted as the song plays.",
      ready: true,
    },
  },
  {
    id: "car",
    title: "CarPlay and Android Auto",
    text: "Browse your library and play from the car's own screen.",
    where: "iPhone · Android",
  },
  {
    id: "siri",
    title: "Siri",
    text: "Ask Siri to play an album, artist, playlist or song from your library.",
    where: "iPhone",
  },
  {
    id: "media-keys",
    title: "Media keys and Now Playing",
    text: "Your keyboard's media keys control playback on every desktop. The track also shows in Now Playing on macOS and Linux.",
    where: "macOS · Windows · Linux",
  },
  {
    id: "tray",
    title: "System tray",
    text: "Play, pause and skip from the tray. Closing the window can hide Sonor there instead of quitting.",
    where: "macOS · Windows · Linux",
  },
  {
    id: "accent",
    title: "Accent colour and app icon",
    text: "Pick an accent colour in Settings and the app icon follows it: on the Dock (macOS), the taskbar (Windows), the window icon (Linux; the app menu keeps the original), and the home screen (Android and iPhone). Android and iPhone use the nearest preset colour.",
    where: "macOS · Windows · Linux · Android · iPhone",
    visual: "accent-icons",
  },
  {
    id: "scrobbling",
    title: "Scrobbling, with a switch",
    text: "Plays count on your server and in the services it reports to. Switch reporting off to listen anonymously.",
    where: "Everywhere",
  },
  {
    id: "privacy",
    title: "Privacy choices",
    text: "Switch off online lyric lookups and play reporting separately. Passwords are kept in the system keychain where there is one.",
    where: "Everywhere",
  },
];

/** What an Octo server adds. Each needs the server to run Octo; nothing here shows on other servers. */
export const OCTO_FEATURES: Feature[] = [
  {
    id: "discovery",
    title: "Mixes, stations and charts",
    text: "Made-for-you mixes, genre and artist mixes and stations appear on Home and Discover, beside your library. Charts, by country, have their own page, reached from Discover.",
    image: {
      src: "/screenshots/features/discovery.webp",
      width: 1600,
      height: 1005,
      alt: "Sonor's Charts page for the United States, with the Top songs chart playing and the play queue open on the right.",
      ready: true,
    },
  },
  {
    id: "search",
    title: "Search beyond your library",
    text: "Search also finds songs, albums and artists your server doesn't have yet. They are marked, and you can play them.",
  },
  {
    id: "acquire",
    title: "Add music to your library",
    text: "Tap Add to library on a song or album you don't have, and Octo fetches it through the tools it is connected to, such as Soulseek or Lidarr. It is added to your server, and the acquisitions drawer shows each step.",
  },
  {
    id: "copies",
    title: "Choose the copy you want",
    text: "When Octo finds several copies, you see their quality, format, size and source, and pick the one to get.",
    image: {
      src: "/screenshots/features/copies.webp",
      width: 1080,
      height: 1310,
      alt: "The Choose a copy dialog in Sonor, listing copies of a song with their format, size and source. The sources' usernames are blurred.",
      ready: true,
    },
  },
  {
    id: "family",
    title: "Family requests",
    text: "In a family, adding can wait for the owner's approval. Members see their requests and the weekly limit, and can cancel a pending one. Save-only members can save links, but not add copies.",
  },
  {
    id: "lyrics-top",
    title: "Lyrics and top songs",
    text: "Choose another lyric source when the first one is wrong. Artist pages show their top songs, ranked from your library and the catalogue, and some albums have animated covers.",
    image: {
      src: "/screenshots/features/lyrics-top.webp",
      width: 1600,
      height: 1005,
      alt: "An artist page in Sonor with the Popular list of top songs.",
      ready: true,
    },
  },
];

/** Things on the way. Not in the app yet. */
export const COMING: string[] = [
  "Jellyfin, Emby and Plex servers",
  "Casting to AirPlay, Chromecast and DLNA",
  "Companion services, such as ListenBrainz",
];
