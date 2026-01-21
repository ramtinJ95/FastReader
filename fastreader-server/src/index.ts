import { serve, ServerType } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { generateRoute } from './routes/generate.js'
import { healthRoute } from './routes/health.js'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      // Allow any localhost origin
      if (
        origin &&
        (origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:'))
      ) {
        return origin
      }
      return null
    },
    allowHeaders: ['Content-Type'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  })
)

// Routes
app.route('/health', healthRoute)
app.route('/api', generateRoute)

// Error handling
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json({ error: err.message || 'Internal server error' }, 500)
})

// Server setup with graceful shutdown
const PORT = Number(process.env.COMPANION_PORT) || 3001
let server: ServerType

const startServer = () => {
  server = serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`Companion server running at http://localhost:${info.port}`)
  })
}

const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down...`)
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
}

process.once('SIGTERM', () => shutdown('SIGTERM'))
process.once('SIGINT', () => shutdown('SIGINT'))

startServer()
