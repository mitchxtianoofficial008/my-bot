import 'dotenv/config'

export const config = {
  name: process.env.BOT_NAME || 'MITCH CHRISTIANO',
  prefix: process.env.PREFIX || '.',
  owner: String(process.env.OWNER_NUMBER || '').replace(/\D/g, ''),
  aiKey: process.env.OPENAI_API_KEY || '',
  aiModel: process.env.OPENAI_MODEL || '',
  version: '1.0.0',
  dashboardPort: Number(process.env.DASHBOARD_PORT || 3000)
}

export const categories = {
  general: ['menu', 'categories', 'ping', 'alive', 'botinfo', 'time', 'uptime'],
  ai: ['ai', 'programming'],
  tools: ['calc', 'weather', 'wiki'],
  group: ['groupinfo', 'tagall', 'welcome', 'promote', 'demote', 'kick'],
  media: ['sticker'],
  owner: ['broadcast', 'settings', 'restart']
}
