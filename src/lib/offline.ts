import Dexie, { type Table } from 'dexie'
import type { MessageRow } from '../types'

class WhatsAppLocalDatabase extends Dexie {
  messages!: Table<MessageRow, string>
  constructor() {
    super('wa-pwa-local')
    this.version(1).stores({ messages: 'id, wamid, from_phone, recipient_phone, created_at' })
  }
}
export const localDb = new WhatsAppLocalDatabase()
export async function getCachedMessages(limit = 1000): Promise<MessageRow[]> {
  return localDb.messages.orderBy('created_at').reverse().limit(limit).toArray()
}
export async function cacheMessages(rows: MessageRow[]): Promise<void> {
  if (rows.length) await localDb.messages.bulkPut(rows)
}
export async function clearCachedMessages(): Promise<void> {
  await localDb.messages.clear()
}
