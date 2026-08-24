import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// เสิร์ฟ api/*.js (Vercel-style functions) บน dev server ในเครื่อง — pattern เดียวกับ mona-ops
function localApi() {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next()
        const name = req.url.split('?')[0].replace('/api/', '')
        if (!/^[\w-]+$/.test(name)) { res.statusCode = 404; return res.end('{"error":"not found"}') }

        let mod
        try {
          mod = await import(pathToFileURL(path.resolve(process.cwd(), 'api', `${name}.js`)).href)
        } catch {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          return res.end('{"error":"not found"}')
        }

        const url = new URL(req.url, 'http://localhost')
        req.query = Object.fromEntries(url.searchParams)
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
          const chunks = []
          for await (const c of req) chunks.push(c)
          req.rawBody = Buffer.concat(chunks).toString()
          try { req.body = JSON.parse(req.rawBody || '{}') } catch { req.body = {} }
        }
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)) }

        try { await mod.default(req, res) } catch (e) { res.status(500).json({ error: e.message }) }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [k, v] of Object.entries(env)) {
    if (!(k in process.env)) process.env[k] = v
  }
  return {
    plugins: [react(), localApi()],
    server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : undefined,
  }
})
