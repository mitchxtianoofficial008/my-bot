import { config } from './config.js'

export function getText(message) {
  return (
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    message.message?.imageMessage?.caption ||
    message.message?.videoMessage?.caption ||
    ''
  ).trim()
}

export function getCommand(text) {
  if (!text.startsWith(config.prefix)) return null
  const body = text.slice(config.prefix.length).trim()
  if (!body) return null
  const parts = body.split(/\s+/)
  return {
    command: parts.shift().toLowerCase(),
    args: parts,
    text: parts.join(' ')
  }
}

export function jidToNumber(jid = '') {
  return jid.split('@')[0].split(':')[0]
}

export function isOwner(jid) {
  const number = jidToNumber(jid)
  return Boolean(config.owner && number === config.owner)
}

export function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${d}d ${h}h ${m}m ${s}s`
}

export function menuText() {
  return `╭━━━〔 ✦ ${config.name} ✦ 〕━━━╮
┃ 🤖 SMART WHATSAPP ASSISTANT
┃ ⚡ Fast • Modular • Reliable
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 🤖 AI 〕━━╮
┃ ❯ ${config.prefix}ai <question>
┃ ❯ ${config.prefix}programming <question>
╰━━━━━━━━━━━━━━╯

╭━━〔 🛠️ TOOLS 〕━━╮
┃ ❯ ${config.prefix}ping
┃ ❯ ${config.prefix}alive
┃ ❯ ${config.prefix}botinfo
┃ ❯ ${config.prefix}time
┃ ❯ ${config.prefix}uptime
┃ ❯ ${config.prefix}calc <expression>
┃ ❯ ${config.prefix}weather <city>
┃ ❯ ${config.prefix}wiki <topic>
╰━━━━━━━━━━━━━━━━╯

╭━━〔 👥 GROUP 〕━━╮
┃ ❯ ${config.prefix}groupinfo
┃ ❯ ${config.prefix}tagall
┃ ❯ ${config.prefix}welcome on/off
┃ ❯ ${config.prefix}promote @user
┃ ❯ ${config.prefix}demote @user
┃ ❯ ${config.prefix}kick @user
╰━━━━━━━━━━━━━━━━╯

╭━━〔 🎨 MEDIA 〕━━╮
┃ ❯ Reply to an image with ${config.prefix}sticker
╰━━━━━━━━━━━━━━━━╯

╭━━〔 👑 OWNER 〕━━╮
┃ ❯ ${config.prefix}broadcast <text>
┃ ❯ ${config.prefix}settings
┃ ❯ ${config.prefix}restart
╰━━━━━━━━━━━━━━━━╯

${config.prefix}categories • ${config.prefix}help <command>`
}

export function categoriesText() {
  return `╭━━〔 📚 CATEGORIES 〕━━╮
┃ 🤖 AI
┃ 🛠️ Tools
┃ 👥 Group
┃ 🎨 Media
┃ 👑 Owner
╰━━━━━━━━━━━━━━━━━━━━━━╯

Type ${config.prefix}menu to open the full command center.`
}
