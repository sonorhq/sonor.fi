// DOM rendering for the receiver's screen. It shows what main.ts gives it; text only ever goes in as textContent.
import { activeLine, type Lyrics, type NextItem, type WordTiming } from "./protocol";
import {
  formatTime,
  lyricLines,
  plainOffset,
  progressFraction,
  sungWords,
  syncedOffset,
  wordSegments,
  type Mode,
  type Track,
} from "./view";

export interface View {
  mode: Mode;
  track: Track | null;
  lyrics: Lyrics | null;
  next: NextItem[] | null;
}

interface Row {
  el: HTMLElement;
  words: WordTiming[] | null;
  top: number;
  height: number;
}

const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ""): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
};

const screen = byId("screen");
const cover = byId<HTMLImageElement>("cover");
const titleEl = byId("title");
const artistEl = byId("artist");
const albumEl = byId("album");
const fill = byId("fill");
const nowEl = byId("now");
const totalEl = byId("total");
const nextBox = byId("next-box");
const nextList = byId("next");
const lyricsBox = byId("lyrics");
const lyricsTrack = byId("track");

let mode: Mode = "idle";
let shownLyrics: Lyrics | null = null;
let shownNext: NextItem[] | null | undefined;
let shownLimit = 0;
let rows: Row[] = [];
let boxHeight = 0;
let contentHeight = 0;
// NaN until the lyrics are first placed, so the first placement always runs.
let active = Number.NaN;
let sung = Number.NaN;
// The first placement after new lyrics snaps instead of sliding from the previous track's position.
let snap = false;

// Fonts can load after the first layout of the lyrics; measure again once they are in.
document.fonts.ready.then(() => {
  if (rows.length === 0) return;
  measure();
  active = Number.NaN;
  sung = Number.NaN;
  snap = true;
});

export const renderView = (view: View): void => {
  mode = view.mode;
  screen.dataset.mode = view.mode;
  renderTrack(view.track);
  renderLyrics(view.mode === "synced" || view.mode === "plain" ? view.lyrics : null);
  // The lyrics layouts leave room for two up-next items; the cover layout for three.
  renderNext(view.next, view.mode === "none" ? 3 : 2);
};

/** Moves the progress bar and the lyrics to the media time; called on every render and on a timer. */
export const tick = (nowSec: number, durationSec: number): void => {
  if (mode === "idle") return;
  paintProgress(nowSec, durationSec);
  const lyrics = shownLyrics;
  if (mode === "synced" && lyrics && !lyrics.none && lyrics.synced) highlight(lyrics.lines, nowSec * 1000);
  else if (mode === "plain") scrollPlain(progressFraction(nowSec, durationSec));
};

const renderTrack = (track: Track | null): void => {
  setText(titleEl, track?.title ?? "");
  setText(artistEl, track?.artist ?? "");
  setText(albumEl, track?.album ?? "");
  const src = track?.cover ?? "";
  if ((cover.getAttribute("src") ?? "") !== src) {
    if (src) cover.src = src;
    else cover.removeAttribute("src");
  }
  cover.hidden = !src;
};

const renderNext = (next: NextItem[] | null, limit: number): void => {
  if (next === shownNext && limit === shownLimit) return;
  shownNext = next;
  shownLimit = limit;
  const items = (next ?? []).slice(0, limit);
  nextList.replaceChildren(...items.map(nextItem));
  nextBox.hidden = items.length === 0;
};

const nextItem = (item: NextItem): HTMLLIElement => {
  const li = document.createElement("li");
  if (item.image) {
    const img = document.createElement("img");
    img.src = item.image;
    img.alt = "";
    li.append(img);
  }
  const text = el("div", "text");
  text.append(el("span", "t", item.title), el("span", "a", item.artist));
  li.append(text);
  return li;
};

const renderLyrics = (lyrics: Lyrics | null): void => {
  if (lyrics === shownLyrics) return;
  shownLyrics = lyrics;
  active = Number.NaN;
  sung = Number.NaN;
  rows = [];
  lyricsTrack.replaceChildren();
  if (!lyrics || lyrics.none || lyrics.lines.length === 0) return;
  rows = lyricLines(lyrics).map(({ text, words }) => {
    const line = el("p", "line");
    const segments = wordSegments(words);
    if (segments) for (const segment of segments) line.append(el("span", "word", segment));
    else line.textContent = text;
    return { el: line, words, top: 0, height: 0 };
  });
  lyricsTrack.append(...rows.map((row) => row.el));
  if (lyrics.truncated) lyricsTrack.append(el("p", "line more", "…"));
  measure();
  snap = true;
};

// Layout is read once per lyrics render; the scale on the current line does not change it.
const measure = (): void => {
  boxHeight = lyricsBox.clientHeight;
  contentHeight = lyricsTrack.offsetHeight;
  for (const row of rows) {
    row.top = row.el.offsetTop;
    row.height = row.el.offsetHeight;
  }
};

const paintProgress = (nowSec: number, durationSec: number): void => {
  fill.style.transform = `scaleX(${progressFraction(nowSec, durationSec)})`;
  setText(nowEl, formatTime(nowSec));
  setText(totalEl, formatTime(durationSec));
};

const setText = (node: HTMLElement, text: string): void => {
  if (node.textContent !== text) node.textContent = text;
};

const highlight = (lines: [number, string][], ms: number): void => {
  const i = activeLine(lines, ms);
  const row = rows[Math.max(i, 0)];
  if (!row) return;
  if (i !== active) {
    active = i;
    sung = Number.NaN;
    rows.forEach((r, k) => {
      r.el.classList.toggle("past", k < i);
      r.el.classList.toggle("current", k === i);
    });
    place(syncedOffset(row.top, row.height, boxHeight));
  }
  const current = rows[i];
  if (current?.words) {
    const count = sungWords(current.words, ms);
    if (count !== sung) {
      sung = count;
      current.el.querySelectorAll(".word").forEach((word, k) => word.classList.toggle("sung", k < count));
    }
  }
};

const scrollPlain = (progress: number): void => {
  place(plainOffset(progress, contentHeight, boxHeight));
};

const place = (offset: number): void => {
  const transform = `translateY(${offset}px)`;
  if (!snap) {
    lyricsTrack.style.transform = transform;
    return;
  }
  // Without the transition, and a read to flush the style, the first placement jumps instead of sliding.
  snap = false;
  lyricsTrack.style.transition = "none";
  lyricsTrack.style.transform = transform;
  void lyricsTrack.offsetHeight;
  lyricsTrack.style.transition = "";
};
