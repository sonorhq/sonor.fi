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

// The production build (dist/), with the emulator scripts injected before the CAF SDK: the real
// page never carries them.
const csp = JSON.parse(await readFile(join(here, '../../workers/api/src/receiver-csp.json'), 'utf8')).csp
const dist = join(here, '..', 'dist')
const appTypes = { 'main.js': 'text/javascript', 'main.css': 'text/css' }
const caf = '<script src="https://www.gstatic.com/cast/sdk/libs/caf_receiver/'

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x')
  if (pathname.startsWith('/app/')) {
    const file = pathname.slice('/app/'.length) || 'index.html'
    if (file !== 'index.html' && !(file in appTypes)) return void res.writeHead(404).end()
    let body = await readFile(join(dist, file), 'utf8')
    if (file === 'index.html') {
      body = body.replace(caf, '<script src="/presentation-polyfill.js"></script><script src="/cast-receiver-emulator.js"></script>' + caf)
    }
    return void res.writeHead(200, { 'content-type': appTypes[file] ?? 'text/html', ...(file === 'index.html' ? { 'content-security-policy': csp } : {}) }).end(body)
  }
  const route = routes[pathname]
  if (!route) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { 'content-type': route[1] }).end(await readFile(route[0]))
}).listen(port, '127.0.0.1', () => console.log(`spike server on http://localhost:${port}`))
