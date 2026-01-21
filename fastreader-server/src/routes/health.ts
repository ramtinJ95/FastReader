import { Hono } from 'hono'

const healthRoute = new Hono()

healthRoute.get('/', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

export { healthRoute }
