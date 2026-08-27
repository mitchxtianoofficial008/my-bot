import fs from 'node:fs/promises'
import { config, categories } from './config.js'
import { menuText, categoriesText, formatUptime, jidToNumber, isOwner } from './utils.js'
import { saveStore } from './store.js'

function reply(sock, jid, text) {
  return sock.sendMessage(jid, { text })
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'NOVA-X/1.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function safeCalc(expression) {
  if (!expression || !/^[0-9+\-*/().%\s]+$/.test(expression)) {
    throw new Error('Only basic arithmetic is allowed.')
  }
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${expression})`)()
}

async function aiAnswer(prompt, mode = 'general') {
  if (!config.aiKey) {
    return `🤖 AI is ready but not connected yet.

Set OPENAI_API_KEY in .env and restart ${config.name} to enable .${mode}.`
  }

  const model = config.aiModel || 'gpt-4o-mini'
  const system = mode === 'programming'
    ? 'You are a concise programming tutor. Explain clearly and safely. Provide code only when useful.'
    : 'You are a helpful, concise WhatsApp assistant. Keep answers readable on a phone.'

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.aiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`AI request failed: ${res.status} ${body.slice(0, 180)}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || 'No response received.'
}

async function getGroupMetadata(sock, jid) {
  if (!jid.endsWith('@g.us')) throw new Error('This command works in groups only.')
  return sock.groupMetadata(jid)
}

function mentionedNumbers(text) {
  return [...text.matchAll(/@(\d{7,15})/g)].map(m => `${m[1]}@s.whatsapp.net`)
}

async function ensureAdmin(sock, jid, sender) {
  const metadata = await getGroupMetadata(sock, jid)
  const me = metadata.participants.find(p => jidToNumber(p.id) === jidToNumber(sender))
  if (!me || !['admin', 'superadmin'].includes(me.admin)) {
    throw new Error('You must be a group admin to use this command.')
  }
  return metadata
}

export async function handleCommand({ sock, msg, command, args, text, store }) {
  const jid = msg.key.remoteJid
  const sender = msg.key.participant || jid
  const replyTo = (t) => reply(sock, jid, t)

  switch (command) {
    case 'menu':
    case 'help':
      return replyTo(menuText())

    case 'categories':
      return replyTo(categoriesText())

    case 'ping':
      return replyTo('🏓 Pong! NOVA-X is online.')

    case 'alive':
      return replyTo(`🟢 ${config.name} is alive.\n⚡ Version: ${config.version}\n⏱️ Uptime: ${formatUptime(process.uptime())}`)

    case 'botinfo':
      return replyTo(`╭━━〔 ✦ ${config.name} ✦ 〕━━╮
┃ Version: ${config.version}
┃ Mode: Public
┃ Commands: ${Object.values(categories).flat().length}
┃ Messages: ${store.stats.messages}
┃ Commands used: ${store.stats.commands}
┃ Uptime: ${formatUptime(process.uptime())}
╰━━━━━━━━━━━━━━━━━━━━━━╯`)

    case 'time':
      return replyTo(`🕒 ${new Date().toLocaleString('en-UG', { timeZone: 'Africa/Kampala' })}`)

    case 'uptime':
      return replyTo(`⏱️ ${formatUptime(process.uptime())}`)

    case 'calc':
      try {
        const result = safeCalc(text)
        return replyTo(`🧮 ${text} = ${result}`)
      } catch (e) {
        return replyTo(`❌ ${e.message}`)
      }

    case 'weather': {
      if (!text) return replyTo(`Usage: ${config.prefix}weather Kampala`)
      try {
        const geo = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text)}&count=1&language=en&format=json`)
        const place = geo.results?.[0]
        if (!place) return replyTo('❌ Location not found.')
        const w = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`)
        const c = w.current
        return replyTo(`🌤️ ${place.name}, ${place.country}
🌡️ Temperature: ${c.temperature_2m}°C
💧 Humidity: ${c.relative_humidity_2m}%
💨 Wind: ${c.wind_speed_10m} km/h`)
      } catch {
        return replyTo('❌ Weather service is temporarily unavailable.')
      }
    }

    case 'wiki': {
      if (!text) return replyTo(`Usage: ${config.prefix}wiki Uganda`)
      try {
        const data = await fetchJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(text)}`)
        return replyTo(`📖 ${data.title}\n\n${data.extract?.slice(0, 1200) || 'No summary found.'}\n\nSource: Wikipedia`)
      } catch {
        return replyTo('❌ Could not find a Wikipedia summary for that topic.')
      }
    }

    case 'ai':
    case 'chatbot':
      if (!text) return replyTo(`Usage: ${config.prefix}${command} <question>`)
      try { return replyTo(await aiAnswer(text, 'general')) }
      catch { return replyTo('❌ AI service error. Check your API key/configuration.') }

    case 'programming':
      if (!text) return replyTo(`Usage: ${config.prefix}programming <question>`)
      try { return replyTo(await aiAnswer(text, 'programming')) }
      catch { return replyTo('❌ AI service error. Check your API key/configuration.') }

    case 'groupinfo': {
      try {
        const metadata = await getGroupMetadata(sock, jid)
        const admins = metadata.participants.filter(p => p.admin).length
        return replyTo(`👥 ${metadata.subject}
👤 Members: ${metadata.participants.length}
🛡️ Admins: ${admins}
📝 Description: ${metadata.desc || 'None'}`)
      } catch (e) { return replyTo(`❌ ${e.message}`) }
    }

    case 'tagall': {
      try {
        const metadata = await ensureAdmin(sock, jid, sender)
        const mentions = metadata.participants.map(p => p.id)
        const lines = metadata.participants.map(p => `@${jidToNumber(p.id)}`).join(' ')
        return sock.sendMessage(jid, { text: `📢 ${lines}`, mentions })
      } catch (e) { return replyTo(`❌ ${e.message}`) }
    }

    case 'welcome': {
      try {
        await ensureAdmin(sock, jid, sender)
        const value = args[0]?.toLowerCase()
        if (!['on', 'off'].includes(value)) return replyTo(`Usage: ${config.prefix}welcome on|off`)
        store.welcome[jid] = value === 'on'
        await saveStore(store)
        return replyTo(`✅ Welcome messages: ${value.toUpperCase()}`)
      } catch (e) { return replyTo(`❌ ${e.message}`) }
    }

    case 'promote':
    case 'demote':
    case 'kick': {
      try {
        await ensureAdmin(sock, jid, sender)
        const targets = mentionedNumbers(text)
        if (!targets.length) return replyTo(`Mention the user. Example: ${config.prefix}${command} @256700000000`)
        const action = command === 'promote' ? 'promote' : command === 'demote' ? 'demote' : 'remove'
        await sock.groupParticipantsUpdate(jid, targets, action)
        return replyTo(`✅ ${command} action completed.`)
      } catch (e) { return replyTo(`❌ ${e.message}`) }
    }

    case 'sticker': {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
      const image = quoted?.imageMessage
      if (!image) return replyTo(`🖼️ Reply to an image with ${config.prefix}sticker`)
      try {
        const { downloadContentFromMessage } = await import('baileys')
        const stream = await downloadContentFromMessage(image, 'image')
        const chunks = []
        for await (const chunk of stream) chunks.push(chunk)
        return sock.sendMessage(jid, { sticker: Buffer.concat(chunks) })
      } catch {
        return replyTo('❌ Sticker conversion failed. Try a smaller image.')
      }
    }

    case 'settings':
      if (!isOwner(sender)) return replyTo('⛔ Owner only.')
      return replyTo(`⚙️ Settings
Name: ${config.name}
Prefix: ${config.prefix}
AI: ${config.aiKey ? 'Connected' : 'Not configured'}
Owner: ${config.owner ? 'Configured' : 'Not configured'}`)

    case 'broadcast':
      if (!isOwner(sender)) return replyTo('⛔ Owner only.')
      if (!text) return replyTo(`Usage: ${config.prefix}broadcast <message>`)
      return replyTo('📢 Broadcast module is intentionally kept as a safe scaffold. Add an approved recipient list before enabling mass messaging.')

    case 'restart':
      if (!isOwner(sender)) return replyTo('⛔ Owner only.')
      await replyTo('♻️ Restarting NOVA-X...')
      process.exit(0)

    default:
      return replyTo(`❓ Unknown command: ${command}\n\nType ${config.prefix}menu to see available commands.`)
  }
}
