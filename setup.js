import fs from 'node:fs/promises'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const rl = readline.createInterface({ input, output })
const ask = async (q, fallback = '') => {
  const a = (await rl.question(`${q}${fallback ? ` [${fallback}]` : ''}: `)).trim()
  return a || fallback
}

console.log('\n╔══════════════════════════════════════╗')
console.log('║     MITCH CHRISTIANO BOT SETUP      ║')
console.log('╚══════════════════════════════════════╝\n')

const name = await ask('Bot name', 'MITCH CHRISTIANO')
const prefix = await ask('Command prefix', '.')
const owner = await ask('Owner phone number, country code, no +', '256')
const port = await ask('Dashboard port', '3000')

const env = `BOT_NAME=${name}
PREFIX=${prefix}
OWNER_NUMBER=${owner}
DASHBOARD_PORT=${port}
OPENAI_API_KEY=
OPENAI_MODEL=
`

await fs.writeFile('.env', env)
await fs.mkdir('data', { recursive: true })
await fs.mkdir('session', { recursive: true })

console.log('\n✅ Configuration created.')
console.log('Next: run "npm start" and scan the WhatsApp QR code.')
console.log('Dashboard: http://localhost:' + port)
console.log('\nNever paste your API keys or WhatsApp verification codes into chat.\n')
rl.close()
