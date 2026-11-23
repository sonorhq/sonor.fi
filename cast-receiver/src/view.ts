// Pure helpers for the screen: which layout to show, which words are sung, where the lyrics sit. No DOM, no CAF.
import type { Lyrics, WordTiming } from "./protocol";

/** The line being read sits this far down the lyrics box (0 top, 1 bottom). */
export const ANCHOR = 0.4;

/** `idle`: nothing loaded. `synced` and `plain`: the lyrics layout. `none`: the cover layout (no lyrics). */
export type Mode = "idle" | "synced" | "plain" | "none";

export interface Track {
  title: string;
  artist: string;
  album: string;
  cover: string | null;
}

export const screenMode = (hasMedia: boolean, lyrics: Lyrics | null): Mode => {
  if (!hasMedia) return "idle";
  if (!lyrics || lyrics.none || lyrics.lines.length === 0) return "none";
  return lyrics.synced ? "synced" : "plain";
};

/**
 * The text of each word of a timed line. The segments concatenate to the line (gap words carry the spaces
 * and punctuation between cues), so they are drawn with no separator. Null when the line has no timing.
 */
export const wordSegments = (words: WordTiming[] | null | undefined): string[] | null =>
  words && words.length > 0 ? words.map(([, , text]) => text) : null;

/** The lines of shown lyrics with their word timing; an empty word list (a line without timing) becomes null. */
export const lyricLines = (lyrics: Exclude<Lyrics, { none: true }>): { text: string; words: WordTiming[] | null }[] =>
  lyrics.synced
    ? lyrics.lines.map(([, text], i) => {
        const words = lyrics.words?.[i];
        return { text, words: words && words.length > 0 ? words : null };
      })
    : lyrics.lines.map((text) => ({ text, words: null }));

/** How many of a line's words have started by `ms`; those are filled with the accent. */
export const sungWords = (words: WordTiming[], ms: number): number => {
  let n = 0;
  while (n < words.length && words[n]![0] <= ms) n++;
  return n;
};

/** translateY of the lyrics track that puts a line's middle at ANCHOR of the box. */
export const syncedOffset = (lineTop: number, lineHeight: number, boxHeight: number): number =>
  boxHeight * ANCHOR - (lineTop + lineHeight / 2);

/** translateY of unsynced lyrics: the first line starts at ANCHOR and the text moves over the whole song. */
export const plainOffset = (progress: number, contentHeight: number, boxHeight: number): number =>
  boxHeight * ANCHOR - clamp01(progress) * contentHeight;

export const progressFraction = (nowSec: number, durationSec: number): number =>
  Number.isFinite(durationSec) && durationSec > 0 ? clamp01(nowSec / durationSec) : 0;

/** m:ss, or h:mm:ss from an hour on. A time that is not a number reads as 0:00. */
export const formatTime = (sec: number): string => {
  const s = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${rest}` : `${m}:${rest}`;
};

/**
 * A cover URL the receiver may load: parsed, and only http or https. Sonor serves covers from its LAN relay
 * over plain http, so http is allowed here (unlike the protocol's `next[].image`, which is https only).
 */
export const coverUrl = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

/**
 * The track shown from the CAF media metadata. CAF types the metadata as a union ending in `object`, so the
 * fields are checked here; anything that is not a string is ignored, and the cover goes through coverUrl.
 */
export const trackOf = (media: { metadata?: unknown } | null): Track | null => {
  if (!media) return null;
  const meta = (media.metadata ?? {}) as { title?: unknown; artist?: unknown; albumName?: unknown; images?: unknown };
  const images = Array.isArray(meta.images) ? (meta.images as unknown[]) : [];
  const first = images[0] as { url?: unknown } | null | undefined;
  return {
    title: textOf(meta.title),
    artist: textOf(meta.artist),
    album: textOf(meta.albumName),
    cover: coverUrl(first?.url),
  };
};

// Written so NaN gives 0.
const clamp01 = (x: number): number => (x > 0 ? Math.min(1, x) : 0);

const textOf = (x: unknown): string => (typeof x === "string" ? x : "");
