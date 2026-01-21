import { Hono } from 'hono'

const generateRoute = new Hono()

// Placeholder - will be implemented in Step 5
generateRoute.post('/generate', async (c) => {
  return c.json({
    success: false,
    error: 'Not implemented yet',
  }, 501)
})

export { generateRoute }
