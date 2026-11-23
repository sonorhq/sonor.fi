import { expect, test } from '@playwright/test'

const NS = 'urn:x-cast:fi.sonor'

// One second of 8 kHz 16-bit mono sine, repeated to 20 s, so playback outlives the test.
function wav(seconds = 20) {
  const rate = 8000
  const n = rate * seconds
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + n * 2, 4)
  buf.write('WAVEfmt ', 8)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(rate, 24)
  buf.writeUInt32LE(rate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((i / rate) * 2 * Math.PI * 440) * 3000), 44 + i * 2)
  return buf
}

const AUDIO = 'http://media.test/'
const body = wav()

test.beforeEach(async ({ context }) => {
  // context.route() also covers the receiver popup.
  await context.route(`${AUDIO}**`, (route) => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Accept-Ranges': 'bytes', 'Content-Type': 'audio/wav' }
    const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers()['range'] || '')
    if (!range) return route.fulfill({ body, headers })
    const start = Number(range[1])
    const end = range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1
    return route.fulfill({
      status: 206,
      body: body.subarray(start, end + 1),
      headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${body.length}` }
    })
  })
})

async function startSession(sender) {
  await sender.goto('/sender.html')
  await sender.waitForFunction(() => window.castReady && cast.framework.CastContext.getInstance().getCastState() === 'NOT_CONNECTED')
  const [receiver] = await Promise.all([sender.waitForEvent('popup'), sender.click('#cast')])
  await expect.poll(() => sender.evaluate(() => cast.framework.CastContext.getInstance().getSessionState())).toBe('SESSION_STARTED')
  await receiver.waitForFunction(() => window.received !== undefined)
  return receiver
}

test('custom namespace: sender to receiver and back', async ({ page: sender }) => {
  const receiver = await startSession(sender)
  await sender.evaluate(
    (ns) =>
      cast.framework.CastContext.getInstance()
        .getCurrentSession()
        .sendMessage(ns, { type: 'hello', v: 1, app: 'Sonor 1.2.3' }),
    NS
  )
  await expect.poll(() => receiver.evaluate(() => window.received.length)).toBe(1)
  const got = await receiver.evaluate(() => window.received[0])
  console.log('receiver got:', JSON.stringify(got))
  expect(got.data).toEqual({ type: 'hello', v: 1, app: 'Sonor 1.2.3' })

  await expect.poll(() => sender.evaluate(() => window.fromReceiver.length)).toBe(1)
  const reply = await sender.evaluate(() => window.fromReceiver[0])
  console.log('sender got:', JSON.stringify(reply))
  expect(reply.ns).toBe(NS)
  expect(typeof reply.message === 'string' ? JSON.parse(reply.message) : reply.message).toEqual({
    type: 'ready', v: 1, features: ['queue', 'lyrics'], maxBytes: 60000
  })
})

test('custom namespace: size limit of the web sender SDK, unknown types', async ({ page: sender }) => {
  const receiver = await startSession(sender)
  const send = (ns, size) =>
    sender.evaluate(
      async ([ns, size]) => {
        try {
          await cast.framework.CastContext.getInstance().getCurrentSession().sendMessage(ns, { type: 'x', v: 1, pad: 'x'.repeat(size) })
          return 'sent'
        } catch (e) {
          return String(e?.code ?? e)
        }
      },
      [ns, size]
    )
  // The Cast Web Sender SDK rejects a message whose wrapped JSON is over 32,768 characters
  // ("Message length over limit"), well under the protocol's 60,000 bytes.
  expect(await send(NS, 32000)).toBe('sent')
  expect(await send(NS, 33000)).toBe('invalid_parameter')
  await sender.evaluate((ns) => {
    cast.framework.CastContext.getInstance().getCurrentSession().sendMessage(ns, { type: 'from-the-future', v: 1 })
  }, NS)
  await expect.poll(() => receiver.evaluate(() => window.received.length)).toBe(2)
  const sizes = await receiver.evaluate(() => window.received.map((r) => JSON.stringify(r.data).length))
  console.log('receiver payload sizes:', sizes)
  expect(sizes[0]).toBeGreaterThan(32000)
})

test('QUEUE_LOAD and LOAD customData reach the receiver, audio autoplays', async ({ page: sender }) => {
  const receiver = await startSession(sender)

  await sender.evaluate((url) => {
    const media = (key, n) => {
      const info = new chrome.cast.media.MediaInfo(`${url}track${n}.wav`, 'audio/wav')
      info.streamType = chrome.cast.media.StreamType.BUFFERED
      info.metadata = new chrome.cast.media.MusicTrackMediaMetadata()
      info.metadata.title = `Track ${n}`
      info.customData = { sonor: { v: 1, key } }
      return info
    }
    const items = ['K1', 'K2', 'K3'].map((k, i) => {
      const item = new chrome.cast.media.QueueItem(media(k, i + 1))
      item.autoplay = true
      return item
    })
    const request = new chrome.cast.media.QueueLoadRequest(items)
    request.startIndex = 0
    window.queueDone = new Promise((resolve, reject) =>
      cast.framework.CastContext.getInstance().getCurrentSession().getSessionObj().queueLoad(request, resolve, reject)
    )
  }, AUDIO)
  await sender.evaluate(() => window.queueDone)

  const loads = await receiver.evaluate(() => window.loads)
  console.log('receiver loads:', JSON.stringify(loads))
  const q = loads.find((l) => l.kind === 'QUEUE_LOAD')
  expect(q.itemCustomData).toEqual([
    { sonor: { v: 1, key: 'K1' } },
    { sonor: { v: 1, key: 'K2' } },
    { sonor: { v: 1, key: 'K3' } }
  ])
  expect(await receiver.evaluate(() => window.queueKeys())).toEqual(q.itemCustomData)

  // Autoplay with --autoplay-policy=no-user-gesture-required
  await expect.poll(async () => (await receiver.evaluate(() => window.audioState()))?.paused).toBe(false)
  await expect.poll(async () => (await receiver.evaluate(() => window.audioState()))?.currentTime).toBeGreaterThan(0.5)
  console.log('audio state:', JSON.stringify(await receiver.evaluate(() => window.audioState())))

  // The sender sees the key again in MEDIA_STATUS.
  const seen = await sender.evaluate(
    () => cast.framework.CastContext.getInstance().getCurrentSession().getMediaSession()?.media?.customData
  )
  console.log('sender media.customData:', JSON.stringify(seen))
  expect(seen).toEqual({ sonor: { v: 1, key: 'K1' } })

  // A single LOAD too.
  await sender.evaluate(async (url) => {
    const info = new chrome.cast.media.MediaInfo(`${url}single.wav`, 'audio/wav')
    info.customData = { sonor: { v: 1, key: 'S1' } }
    await new Promise((resolve, reject) =>
      cast.framework.CastContext.getInstance().getCurrentSession().loadMedia(new chrome.cast.media.LoadRequest(info)).then(resolve, reject)
    )
  }, AUDIO)
  const load = (await receiver.evaluate(() => window.loads)).findLast((l) => l.kind === 'LOAD')
  console.log('LOAD:', JSON.stringify(load))
  expect(load.mediaCustomData).toEqual({ sonor: { v: 1, key: 'S1' } })
})
