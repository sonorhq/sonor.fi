// CAF wiring only; the channel logic is in protocol.ts and the drawing in screen.ts.
import "./style.css";
import { NAMESPACE, handleMessage, initialState, lyricsFor, type State } from "./protocol";
import { renderView, tick, type Track } from "./screen";
import { screenMode } from "./view";

const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();

let state: State = initialState();
let playingKey: string | null = null;

const keyOf = (media: { customData?: unknown } | null | undefined): string | null => {
  const sonor = (media?.customData as { sonor?: { v?: number; key?: unknown } } | undefined)?.sonor;
  return sonor?.v === 1 && typeof sonor.key === "string" ? sonor.key : null;
};

// The CAF metadata is a union that ends in `object`, so the fields read here are typed by hand.
const trackOf = (media: { metadata?: unknown } | null): Track | null => {
  if (!media) return null;
  const meta = (media.metadata ?? {}) as { title?: string; artist?: string; albumName?: string; images?: { url?: string }[] };
  return {
    title: meta.title ?? "",
    artist: meta.artist ?? "",
    album: meta.albumName ?? "",
    cover: meta.images?.[0]?.url ?? null,
  };
};

const render = (): void => {
  const media = playerManager.getMediaInformation();
  const lyrics = lyricsFor(state, playingKey ?? state.queue?.current ?? null);
  renderView({
    mode: screenMode(media !== null, lyrics),
    track: trackOf(media),
    lyrics,
    next: state.queue?.next ?? null,
  });
  update();
};

const update = (): void => tick(playerManager.getCurrentTimeSec(), playerManager.getDurationSec());

// Registered before start(), or the first messages are lost.
context.addCustomMessageListener(NAMESPACE, (event) => {
  const result = handleMessage(event.data, state);
  state = result.state;
  for (const reply of result.replies) context.sendCustomMessage(NAMESPACE, event.senderId, reply);
  render();
});

playerManager.addEventListener(cast.framework.events.EventType.MEDIA_STATUS, () => {
  playingKey = keyOf(playerManager.getMediaInformation());
  render();
});

setInterval(update, 200);
context.start();
