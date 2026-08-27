import fs from 'node:fs/promises'
import path from 'node:path'

const DATA_DIR = path.resolve('data')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')

const defaults = {
  welcome: {},
  stats: {
    messages: 0,
    commands: 0
  }
}

export async function loadStore() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    return JSON.parse(await fs.readFile(SETTINGS_FILE, 'utf8'))
  } catch {
    await saveStore(defaults)
    return structuredClone(defaults)
  }
}

export async function saveStore(store) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(store, null, 2))
}
