import 'dotenv/config'
import express from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { config } from '../src/config.js'

const app = express()
const port = Number(process.env.DASHBOARD_PORT || 3000)
app.use(express.json())

app.get('/api/status', async (_req, res) => {
  let settings = {}
  try { settings = JSON.parse(await fs.readFile(path.resolve('data/settings.json'), 'utf8')) } catch {}
  res.json({
    name: config.name,
    version: config.version,
    online: true,
    uptime: process.uptime(),
    messages: settings.stats?.messages || 0,
    commands: settings.stats?.commands || 0,
    aiConfigured: Boolean(config.aiKey)
  })
})

app.get('/', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'dashboard', 'index.html'))
})

app.listen(port, () => console.log(`Dashboard running at http://localhost:${port}`))
