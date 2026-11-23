# Spike R0: custom namespaces in @mattiasbuelens/chromecast-emulator

Not deployed. Run with `pnpm --filter sonor-cast-receiver spike` (needs network access to
gstatic.com for the Cast Web Sender SDK and the CAF receiver, and a Playwright Chromium:
`pnpm --filter sonor-cast-receiver exec playwright install chromium`).

Tested: emulator 0.3.0, Playwright 1.63.0, Chromium (headless shell 153), pages served from
`http://localhost:4180`, Chromium launched with `--autoplay-policy=no-user-gesture-required`.

## What works

| Check | Result |
|---|---|
| Sender `session.sendMessage('urn:x-cast:fi.sonor', {...})` reaches the receiver's `addCustomMessageListener` (registered before `start()`) | Works. `event.data` arrives already parsed as an object. |
| Receiver replies with `context.sendCustomMessage(ns, senderId, {...})` | Works. The sender's `session.addMessageListener(ns, ...)` gets the reply as a JSON **string**, so the sender parses it. |
| Unknown message type delivered untouched | Works (the protocol's "ignore unknown types" is up to our handler). |
| `QueueLoadRequest` with items carrying `customData` `{"sonor":{"v":1,"key":..}}` | Works. A `QUEUE_LOAD` interceptor sees every item's `media.customData`, `queueManager.getItems()` has them, and the sender's `MEDIA_STATUS` media returns the first item's customData. |
| Single `loadMedia` with `customData` | Works. Note CAF also raises an internal `LOAD` for the first queue item after a `QUEUE_LOAD`, so a `LOAD` interceptor sees both. |
| Audio autoplay of a generated WAV (served by `context.route`, with Range support) | Works. `<audio>` inside `cast-media-player` is `paused:false` and `currentTime` advances, with no click. Without the flag the emulator shows a "Click to allow media playback" bar. |

## What does not work, and what to do

- **The Cast Web Sender SDK caps a message at 32,768 characters** (its wrapped JSON, so about
  32,5xx of payload). A bigger `sendMessage` rejects with `invalid_parameter`
  ("Message length over limit", in `cast_sender.js`). This is the web SDK, not the emulator: the
  emulator never sees the message. So the emulator tests can cover the 60,000-byte rule only up to
  about 32 KB. Sonor's real senders (iOS and Android Cast SDKs) have the 64 KB channel limit, so
  60,000 stays valid for them. Cover the over-32 KB size paths (`TOO_LARGE`, the truncation of
  lyrics) with unit tests that call the receiver's message handler directly, which needs the
  handler to be a plain function the test can import; the emulator test only proves transport.
- Receiver-to-sender payload size was not probed.
- Real devices are not exercised at all: the emulator replaces the Cast platform, so this proves
  our CAF code and channel handling, not Chromecast firmware behaviour (memory, images, CORS).

## Notes for the plan

- Receiver and sender pages must be loaded with the emulator scripts before the CAF/Sender SDKs;
  the receiver must not load them in production.
- Sender code that reads replies must accept string or object.
- Use `context.route()` (not `page.route()`) so routes also cover the receiver popup.
- No fallback hook was needed: custom namespaces work end to end.
