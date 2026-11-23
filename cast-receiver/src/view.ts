// Pure helpers for the screen: which layout to show, which words are sung, where the lyrics sit. No DOM, no CAF.
import type { Lyrics, WordTiming } from "./protocol";

/** The line being read sits this far down the lyrics box (0 top, 1 bottom). */
export const ANCHOR = 0.4;

/** `idle`: nothing loaded. `synced` and `plain`: the lyrics layout. `none`: the cover layout (no lyrics). */
export type Mode = "idle" | "synced" | "plain" | "none";

export const screenMode = (hasMedia: boolean, lyrics: Lyrics | null): Mode => {
  if (!hasMedia) return "idle";
  if (!lyrics || lyrics.none || lyrics.lines.length === 0) return "none";
  return lyrics.synced ? "synced" : "plain";
};

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

// Written so NaN gives 0.
const clamp01 = (x: number): number => (x > 0 ? Math.min(1, x) : 0);
