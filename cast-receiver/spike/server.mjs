// Static server for the spike: the two pages and the emulator scripts, on localhost.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const distDir = dirname(require.resolve('@mattiasbuelens/chromecast-emulator/presentation-polyfill.js'))
const port = Number(process.env.PORT ?? 4180)

const routes = {
  '/sender.html': [join(here, 'pages/sender.html'), 'text/html'],
  '/receiver.html': [join(here, 'pages/receiver.html'), 'text/html'],
  '/presentation-polyfill.js': [join(distDir, 'presentation-polyfill.js'), 'text/javascript'],
  '/cast-sender-emulator.js': [join(distDir, 'cast-sender-emulator.js'), 'text/javascript'],
  '/cast-receiver-emulator.js': [join(distDir, 'cast-receiver-emulator.js'), 'text/javascript']
}

createServer(async (req, res) => {
  const route = routes[new URL(req.url, 'http://x').pathname]
  if (!route) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { 'content-type': route[1] }).end(await readFile(route[0]))
}).listen(port, '127.0.0.1', () => console.log(`spike server on http://localhost:${port}`))
