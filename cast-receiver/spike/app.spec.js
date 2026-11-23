import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const NS = 'urn:x-cast:fi.sonor'
const fixture = (name) => JSON.parse(readFileSync(new URL(`../test/fixtures/${name}.json`, import.meta.url), 'utf8'))

test('the built receiver app talks the fi.sonor channel', async ({ page: sender }) => {
  await sender.goto('/sender.html?receiver=/app/')
  await sender.waitForFunction(() => window.castReady && cast.framework.CastContext.getInstance().getCastState() === 'NOT_CONNECTED')
  const [receiver] = await Promise.all([sender.waitForEvent('popup'), sender.click('#cast')])
  await expect.poll(() => sender.evaluate(() => cast.framework.CastContext.getInstance().getSessionState())).toBe('SESSION_STARTED')
  await expect(receiver.locator('cast-media-player')).toBeAttached()
  // The production page does not carry the emulator; the test server injected it.
  const send = (message) =>
    sender.evaluate(([ns, m]) => cast.framework.CastContext.getInstance().getCurrentSession().sendMessage(ns, m), [NS, message])

  await send({ type: 'hello', v: 1, app: 'Sonor test' })
  await expect.poll(() => sender.evaluate(() => window.fromReceiver.length)).toBe(1)
  expect(JSON.parse(await sender.evaluate(() => window.fromReceiver[0].message))).toEqual(fixture('ready'))

  await send(fixture('queue'))
  await expect(receiver.locator('#next li')).toHaveCount(3)
  await expect(receiver.locator('#next li').first()).toContainText('Heroes')

  await send(fixture('lyrics-plain'))
  await expect(receiver.locator('#lyrics li')).toHaveCount(3)
  await send(fixture('clear'))
  await expect(receiver.locator('#lyrics li')).toHaveCount(0)
  await expect(receiver.locator('#next li')).toHaveCount(0)

  await send({ type: 'queue', v: 1 })
  await expect.poll(() => sender.evaluate(() => window.fromReceiver.length)).toBe(2)
  expect(JSON.parse(await sender.evaluate(() => window.fromReceiver[1].message))).toEqual({ type: 'error', v: 1, code: 'BAD_MESSAGE', ref: 'queue' })
})
