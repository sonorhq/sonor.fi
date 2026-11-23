// The fi.sonor channel (see ../PROTOCOL.md). Pure logic: no CAF, no DOM, so it can be unit tested.

export const NAMESPACE = "urn:x-cast:fi.sonor";
export const VERSION = 1;
export const MAX_BYTES = 60_000;
export const MAX_TEXT = 200;
export const MAX_NEXT = 5;
export const FEATURES = ["queue", "lyrics"] as const;

export interface NextItem {
  key: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  image?: string;
}

export interface QueueInfo {
  current: string;
  index: number;
  total: number;
  next: NextItem[];
}

export type WordTiming = [startMs: number, endMs: number, word: string];

export type Lyrics =
  | { key: string; none: true }
  | {
      key: string;
      none?: false;
      synced: true;
      source: string;
      lines: [startMs: number, text: string][];
      words?: WordTiming[][];
      truncated: boolean;
    }
  | { key: string; none?: false; synced: false; source: string; lines: string[]; truncated: boolean };

export interface State {
  /** True once a `hello` was answered. */
  greeted: boolean;
  app: string | null;
  queue: QueueInfo | null;
  /** Lyrics by track key, only for the queue's current and next items; read with `lyricsFor`. */
  lyrics: ReadonlyMap<string, Lyrics>;
}

export type Reply =
  | { type: "ready"; v: 1; features: string[]; maxBytes: number }
  | { type: "error"; v: 1; code: "BAD_MESSAGE" | "TOO_LARGE"; ref?: string };

export interface Result {
  state: State;
  replies: Reply[];
}

export const initialState = (): State => ({ greeted: false, app: null, queue: null, lyrics: new Map() });

const encoder = new TextEncoder();
export const byteLength = (value: unknown): number =>
  encoder.encode(typeof value === "string" ? value : JSON.stringify(value)).length;

const error = (code: "BAD_MESSAGE" | "TOO_LARGE", ref?: string): Reply =>
  ref === undefined ? { type: "error", v: 1, code } : { type: "error", v: 1, code, ref };

class Bad extends Error {}

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

// Unicode code points, like Go's utf8.RuneCountInString in the sender (not UTF-16 units: an emoji is 2).
const codePoints = (x: string): number => {
  let n = 0;
  for (const _ of x) if (++n > MAX_TEXT) break;
  return n;
};
const text = (x: unknown, allowEmpty = true): string => {
  if (typeof x !== "string" || codePoints(x) > MAX_TEXT || (!allowEmpty && x.length === 0)) throw new Bad();
  return x;
};
const int = (x: unknown): number => {
  if (typeof x !== "number" || !Number.isInteger(x) || x < 0) throw new Bad();
  return x;
};
const num = (x: unknown): number => {
  if (typeof x !== "number" || !Number.isFinite(x) || x < 0) throw new Bad();
  return x;
};
const list = (x: unknown): unknown[] => {
  if (!Array.isArray(x)) throw new Bad();
  return x;
};

const parseNext = (raw: unknown): NextItem => {
  if (!isRecord(raw)) throw new Bad();
  const item: NextItem = {
    key: text(raw.key, false),
    title: text(raw.title),
    artist: text(raw.artist),
    album: text(raw.album),
    duration: int(raw.duration),
  };
  if (raw.image !== undefined) {
    // The relay serves covers over https; anything else is not ours to load.
    if (typeof raw.image !== "string" || !raw.image.startsWith("https://")) throw new Bad();
    item.image = raw.image;
  }
  return item;
};

const parseQueue = (m: Record<string, unknown>): QueueInfo => {
  const next = list(m.next);
  if (next.length > MAX_NEXT) throw new Bad();
  const total = int(m.total);
  const index = int(m.index);
  if (total < 1 || index >= total) throw new Bad();
  return { current: text(m.current, false), index, total, next: next.map(parseNext) };
};

const parseLyrics = (m: Record<string, unknown>): Lyrics => {
  const key = text(m.key, false);
  if (m.none === true) return { key, none: true };
  if (typeof m.synced !== "boolean") throw new Bad();
  const source = text(m.source);
  const truncated = m.truncated === undefined ? false : m.truncated;
  if (typeof truncated !== "boolean") throw new Bad();
  const lines = list(m.lines);
  if (!m.synced) {
    return { key, synced: false, source, lines: lines.map((l) => text(l)), truncated };
  }
  const synced = lines.map((l): [number, string] => {
    const pair = list(l);
    if (pair.length !== 2) throw new Bad();
    return [num(pair[0]), text(pair[1])];
  });
  const out: Lyrics = { key, synced: true, source, lines: synced, truncated };
  if (m.words !== undefined) {
    const words = list(m.words);
    if (words.length !== synced.length) throw new Bad();
    out.words = words.map((perLine) =>
      list(perLine).map((w): WordTiming => {
        const t = list(w);
        if (t.length !== 3) throw new Bad();
        return [num(t[0]), num(t[1]), text(t[2])];
      }),
    );
  }
  return out;
};

/**
 * Handle one message from Sonor. `raw` is the JSON text or the already parsed object (CAF hands over
 * an object). Never throws: bad input gets an `error` reply and the state is left as it was.
 */
export const handleMessage = (raw: unknown, state: State, maxBytes = MAX_BYTES): Result => {
  let message: unknown = raw;
  if (typeof raw === "string") {
    try {
      message = JSON.parse(raw);
    } catch {
      return { state, replies: [error(byteLength(raw) > maxBytes ? "TOO_LARGE" : "BAD_MESSAGE")] };
    }
  }
  const ref = isRecord(message) && typeof message.type === "string" ? message.type.slice(0, 32) : undefined;
  if (byteLength(raw) > maxBytes) return { state, replies: [error("TOO_LARGE", ref)] };
  if (!isRecord(message) || ref === undefined || message.v !== VERSION) {
    return { state, replies: [error("BAD_MESSAGE", ref)] };
  }
  try {
    switch (message.type) {
      case "hello":
        return {
          state: { ...state, greeted: true, app: text(message.app) },
          replies: [{ type: "ready", v: 1, features: [...FEATURES], maxBytes }],
        };
      case "queue": {
        const queue = parseQueue(message);
        const keep = new Set([queue.current, ...queue.next.map((n) => n.key)]);
        const lyrics = new Map([...state.lyrics].filter(([key]) => keep.has(key)));
        return { state: { ...state, queue, lyrics }, replies: [] };
      }
      case "lyrics": {
        const lyrics = parseLyrics(message);
        const { queue } = state;
        // Lyrics for a track that is neither playing nor next are not wanted.
        if (queue && lyrics.key !== queue.current && !queue.next.some((n) => n.key === lyrics.key)) {
          return { state, replies: [] };
        }
        const map = new Map(state.lyrics);
        map.delete(lyrics.key);
        map.set(lyrics.key, lyrics);
        // Without a queue yet, keep the newest few so nothing grows unbounded.
        while (map.size > MAX_NEXT + 1) map.delete(map.keys().next().value as string);
        return { state: { ...state, lyrics: map }, replies: [] };
      }
      case "clear":
        return { state: { ...state, queue: null, lyrics: new Map() }, replies: [] };
      default:
        // Unknown (and receiver-to-sender) types are ignored, so newer senders keep working.
        return { state, replies: [] };
    }
  } catch (e) {
    if (e instanceof Bad) return { state, replies: [error("BAD_MESSAGE", ref)] };
    throw e;
  }
};

/** The lyrics for the playing track, or null when none arrived for it. */
export const lyricsFor = (state: State, key: string | null): Lyrics | null =>
  key === null ? null : (state.lyrics.get(key) ?? null);

/** Index of the synced line playing at `ms`, or -1 before the first line. */
export const activeLine = (lines: [number, string][], ms: number): number => {
  let found = -1;
  for (let i = 0; i < lines.length && lines[i]![0] <= ms; i++) found = i;
  return found;
};

/**
 * Reference implementation of the sender's size rule (drop word timing first, then cut lines from
 * the end and set `truncated`). The receiver never sends lyrics; this pins the rule down for the
 * fixtures and tests, and Sonor's Go sender implements the same rule.
 */
export const fitLyrics = (lyrics: Lyrics, maxBytes = MAX_BYTES): Lyrics => {
  // The limit applies to the whole message, envelope included.
  const size = (l: Lyrics): number => byteLength({ type: "lyrics", v: VERSION, ...l });
  if (lyrics.none || size(lyrics) <= maxBytes) return lyrics;
  let fitted: Lyrics = lyrics;
  if (fitted.synced && fitted.words) {
    const { words: _dropped, ...rest } = fitted;
    fitted = rest;
    if (size(fitted) <= maxBytes) return fitted;
  }
  // Binary search for the most lines that fit.
  let lo = 0;
  let hi = fitted.lines.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = { ...fitted, lines: fitted.lines.slice(0, mid), truncated: true } as Lyrics;
    if (size(candidate) <= maxBytes) lo = mid;
    else hi = mid - 1;
  }
  return { ...fitted, lines: fitted.lines.slice(0, lo), truncated: true } as Lyrics;
};
