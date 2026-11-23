// CAF wiring only; the channel logic is in protocol.ts.
import "./style.css";
import { NAMESPACE, activeLine, handleMessage, initialState, lyricsFor, type State } from "./protocol";

const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();

let state: State = initialState();
let playingKey: string | null = null;
let activeIndex = -1;

const el = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

const keyOf = (media: { customData?: unknown } | null | undefined): string | null => {
  const sonor = (media?.customData as { sonor?: { v?: number; key?: unknown } } | undefined)?.sonor;
  return sonor?.v === 1 && typeof sonor.key === "string" ? sonor.key : null;
};

const render = (): void => {
  const lyrics = lyricsFor(state, playingKey ?? state.queue?.current ?? null);
  const list = el("lyrics");
  const note = el("lyrics-note");
  list.replaceChildren();
  activeIndex = -1;
  note.textContent = "";
  if (lyrics && !lyrics.none) {
    for (const line of lyrics.lines) {
      const li = document.createElement("li");
      li.textContent = typeof line === "string" ? line : line[1];
      list.append(li);
    }
    if (lyrics.truncated) note.textContent = "…";
  }
  const next = el("next");
  next.replaceChildren();
  for (const item of state.queue?.next ?? []) {
    const li = document.createElement("li");
    if (item.image) {
      const img = document.createElement("img");
      img.src = item.image;
      img.alt = "";
      li.append(img);
    }
    li.append(`${item.title} – ${item.artist}`);
    next.append(li);
  }
};

const highlight = (): void => {
  const lyrics = lyricsFor(state, playingKey ?? state.queue?.current ?? null);
  if (!lyrics || lyrics.none || !lyrics.synced) return;
  const active = activeLine(lyrics.lines, playerManager.getCurrentTimeSec() * 1000);
  if (active === activeIndex) return;
  activeIndex = active;
  el("lyrics").querySelectorAll("li").forEach((li, i) => {
    li.classList.toggle("active", i === active);
    if (i === active) li.scrollIntoView({ block: "center", behavior: "smooth" });
  });
};

// Registered before start(), or the first messages are lost.
context.addCustomMessageListener(NAMESPACE, (event) => {
  const result = handleMessage(event.data, state);
  state = result.state;
  for (const reply of result.replies) context.sendCustomMessage(NAMESPACE, event.senderId, reply);
  render();
});

playerManager.addEventListener(cast.framework.events.EventType.MEDIA_STATUS, () => {
  const key = keyOf(playerManager.getMediaInformation());
  if (key !== playingKey) {
    playingKey = key;
    render();
  }
});

setInterval(highlight, 250);
context.start();
