import 'dotenv/config'
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from 'baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import { Boom } from '@hapi/boom'
import { config } from './config.js'
import { getText, getCommand, jidToNumber } from './utils.js'
import { loadStore, saveStore } from './store.js'
import { handleCommand } from './commands.js'

const logger = pino({ level: process.env.LOG_LEVEL || 'silent' })
let store = await loadStore()

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  let version
  try {
    const latest = await fetchLatestBaileysVersion()
    version = latest.version
  } catch {
    version = undefined
  }

  const sock = makeWASocket({
    auth: state,
    version,
    logger,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: true
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 Scan this QR with WhatsApp → Linked devices:\n')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      console.log(`\n✅ ${config.name} connected to WhatsApp.`)
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode
      const shouldReconnect = code !== DisconnectReason.loggedOut
      console.log(`⚠️ Connection closed. Code: ${code}. Reconnect: ${shouldReconnect}`)
      if (shouldReconnect) setTimeout(start, 3000)
      else console.log('🔒 Logged out. Delete session/ and start again to pair a new account.')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
      try {
        if (!msg.message || msg.key.fromMe) continue

        const text = getText(msg)
        const parsed = getCommand(text)

        store.stats.messages += 1

        if (!parsed) {
          await saveStore(store)
          continue
        }

        store.stats.commands += 1
        await saveStore(store)

        await handleCommand({
          sock,
          msg,
          command: parsed.command,
          args: parsed.args,
          text: parsed.text,
          store
        })
      } catch (error) {
        console.error('Command error:', error)
      }
    }
  })

  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    if (!store.welcome[id] || action !== 'add') return
    const mentions = participants
    const names = participants.map(p => `@${jidToNumber(p)}`).join(', ')
    await sock.sendMessage(id, {
      text: `👋 Welcome ${names} to the group!\n\n🤖 I'm ${config.name}. Type ${config.prefix}menu to see what I can do.`,
      mentions
    })
  })
}

process.on('SIGINT', async () => {
  console.log('\nShutting down...')
  process.exit(0)
})

start().catch(err => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
