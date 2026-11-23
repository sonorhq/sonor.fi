# Sonor Cast receiver protocol

The custom channel between the Sonor app (the Cast sender) and Sonor's own Web Receiver (CAF).
Media playback itself uses the standard Cast media namespace (`LOAD`, `QUEUE_LOAD`, `MEDIA_STATUS`);
this channel only carries what the standard messages cannot: the upcoming queue and lyrics.

## Channel

- Namespace: `urn:x-cast:fi.sonor`.
- Every message is one JSON object, UTF-8 encoded.
- Every message carries `"v":1` (protocol version) and a `"type"`.
- Receivers and senders ignore message types they do not know and fields they do not know. A
  message with a missing or unsupported `"v"`, or with invalid JSON or a known type with wrong
  field types, is answered with `error` / `BAD_MESSAGE` (unknown types are never an error).
- A message is at most 60,000 bytes of UTF-8 (the Cast limit is 64 KB; the rest is headroom).
  The sender must stay under it; the receiver answers a larger one with `error` / `TOO_LARGE`.
- Text fields (`app`, keys, `title`, `artist`, `album`, `source`, lyrics lines and words) are at
  most 200 Unicode code points (what Go's `utf8.RuneCountInString` counts; an emoji is one); the sender cuts longer ones and the receiver answers `BAD_MESSAGE` to a
  message with a longer one. Other `BAD_MESSAGE` cases: more than 5 `next` items, `index` not below
  `total`, an `image` that is not an `https://` URL, `words` whose length differs from `lines`, a
  missing `v`, `type` or required field.

## Media customData

Every queue item the sender loads carries

```json
{"sonor":{"v":1,"key":"K1"}}
```

in the media `customData`. `key` is an opaque track key chosen by the sender; the receiver uses it
to match `queue` and `lyrics` messages to the item that is playing. Keys are at most 200 Unicode code points.

## Sonor to receiver

### hello

Sent once after the session starts (and again when the sender rejoins). The receiver answers `ready`.

```json
{"type":"hello","v":1,"app":"Sonor 1.2.3"}
```

### queue

Describes what is playing and what comes next. Sent whenever the current track or the upcoming
tracks change.

```json
{"type":"queue","v":1,"current":"K1","index":3,"total":42,"next":[{"key":"K2","title":"Heroes","artist":"David Bowie","album":"Heroes","duration":371,"image":"https://api.sonor.fi/cast/img/k2.jpg"}]}
```

| Field | Meaning |
|---|---|
| `current` | Key of the playing item. |
| `index` | Zero-based position of the playing item in the whole queue. |
| `total` | Number of items in the whole queue. |
| `next` | The next items, at most 5, in play order. |
| `next[].key` | Track key (same as the item's customData key). |
| `next[].title`, `artist`, `album` | Text, at most 200 Unicode code points. |
| `next[].duration` | Seconds, integer. |
| `next[].image` | Optional. An https URL of a cover served through the relay (the receiver cannot reach the user's server). Absent when there is none. |

### lyrics

Lyrics for one track, identified by `key`. Three shapes.

Synced (each line has a start time in milliseconds from the start of the track):

```json
{"type":"lyrics","v":1,"key":"K1","synced":true,"source":"lrclib","lines":[[12000,"First line"],[16500,"Second line"]],"truncated":false}
```

Plain (no timing):

```json
{"type":"lyrics","v":1,"key":"K1","synced":false,"source":"lrclib","lines":["First line","Second line"],"truncated":false}
```

None (the sender looked and there are no lyrics, so the receiver can stop waiting):

```json
{"type":"lyrics","v":1,"key":"K1","none":true}
```

| Field | Meaning |
|---|---|
| `synced` | `true`: `lines` are `[startMs, "text"]`. `false`: `lines` are `"text"`. |
| `source` | Where the lyrics came from, a short lower-case label such as `lrclib`. |
| `lines` | The lines, in order. Empty text is allowed (an instrumental gap). |
| `words` | Optional, synced only. One entry per line, same order and length as `lines`; each entry is a list of `[startMs, endMs, "word"]`. The words of a line concatenate exactly to its text: the spaces and punctuation between cues are sent as gap words of their own, so the receiver draws them with no separator. A line without timing has an empty list `[]`. Used for word-by-word highlighting. |
| `truncated` | `true` when lines were cut from the end to fit the size limit. |

Size rule, applied by the sender in this order until the message fits in 60,000 bytes:

1. Drop `words`.
2. Cut lines from the end and set `"truncated":true`.

The receiver keeps lyrics for the queue's current item and its `next` items, one entry per key, so
a prefetched lyrics message for the next track does not replace the playing one's. It drops entries
whose key leaves the queue's current and next keys when a `queue` message arrives, ignores lyrics
for any other key once a queue is known, and shows only the entry for the playing key.

### clear

Drop everything the receiver shows for the queue and lyrics (for example when the queue ends).

```json
{"type":"clear","v":1}
```

### Cover art

The cover on the TV is the media metadata image (`metadata.images[0].url`), not part of this channel.
Sonor serves it from its LAN relay over plain `http:` as well as `https:`, so the receiver accepts both
and nothing else: the URL is parsed, and `javascript:`, `data:` and any other scheme are ignored. The
`next[].image` of `queue` stays https only.

## Receiver to Sonor

### ready

Answer to `hello`. Lists what the receiver understands and the size limit it enforces.

```json
{"type":"ready","v":1,"features":["queue","lyrics"],"maxBytes":60000}
```

The sender only sends the message types listed in `features` (`hello` and `clear` are always
allowed). A sender must cope with a receiver that never answers `hello` (an older receiver) by
sending nothing on this channel.

### error

```json
{"type":"error","v":1,"code":"BAD_MESSAGE","ref":"lyrics"}
```

| Field | Meaning |
|---|---|
| `code` | `BAD_MESSAGE` (invalid JSON, wrong version, or wrong field types) or `TOO_LARGE` (over `maxBytes`). |
| `ref` | The `type` of the offending message when it could be read; omitted otherwise. |

Errors are informational; the sender does not retry the same message.

## Fixtures

`test/fixtures/*.json` hold one example of each message, compact, keys in the order above. They are
the shared truth for the sender and receiver tests.
