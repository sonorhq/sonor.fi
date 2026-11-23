// CAF wiring only; the channel logic is in protocol.ts, the drawing in screen.ts.
import "./style.css";
import { NAMESPACE, handleMessage, initialState, lyricsFor, type State } from "./protocol";
import { renderView, tick } from "./screen";
import { screenMode, trackOf } from "./view";

const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
// Sonor draws the whole screen, so CAF plays into a plain audio element and draws no UI of its own.
playerManager.setMediaElement(document.getElementById("player") as HTMLAudioElement);

let state: State = initialState();
let playingKey: string | null = null;

const keyOf = (media: { customData?: unknown } | null | undefined): string | null => {
  const sonor = (media?.customData as { sonor?: { v?: number; key?: unknown } } | undefined)?.sonor;
  return sonor?.v === 1 && typeof sonor.key === "string" ? sonor.key : null;
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
