// Serves dist/ under a GitHub Pages-style project path, e.g. http://localhost:4173/horse-racing/
// Usage: node scripts/serve-subpath.mjs [--port 4173] [--base /horse-racing/] [--dir dist]
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, i, all) => (value.startsWith('--') ? [...pairs, [value.slice(2), all[i + 1]]] : pairs), []),
)
const port = Number(args.port ?? process.env.PORT ?? 4173)
const base = (args.base ?? process.env.BASE_PATH ?? '/horse-racing/').replace(/\/?$/, '/')
const root = resolve(args.dir ?? 'dist')

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.ico': 'image/x-icon',
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (url.pathname === '/' || url.pathname === base.slice(0, -1)) {
    res.writeHead(302, { location: base + url.search })
    return res.end()
  }
  if (!url.pathname.startsWith(base)) {
    res.writeHead(404)
    return res.end('Not found')
  }
  let file = normalize(join(root, decodeURIComponent(url.pathname.slice(base.length))))
  if (!file.startsWith(root)) {
    res.writeHead(403)
    return res.end()
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
  if (!existsSync(file)) {
    res.writeHead(404)
    return res.end('Not found')
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
}).listen(port, () => console.log(`Serving ${root} at http://localhost:${port}${base}`))
