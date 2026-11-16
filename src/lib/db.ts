// 拾潮 · 本地数据层（Dexie / IndexedDB）
// 全部数据只存用户浏览器本地，不上传任何服务器。
// 导出数据时不得包含 settings 里的 AI Key（见 lib/export.ts，阶段 5.5）。

import Dexie, { type EntityTable } from 'dexie'
import {
  SUMMARY_MAX_LENGTH,
  type Foreshadowing,
  type JournalDay,
  type MoonEntry,
  type SettingCard,
  type Settings,
  type Shell,
} from './types'

export const db = new Dexie('shichao') as Dexie & {
  shells: EntityTable<Shell, 'id'>
  cards: EntityTable<SettingCard, 'id'>
  foreshadowing: EntityTable<Foreshadowing, 'id'>
  moon: EntityTable<MoonEntry, 'id'>
  journal: EntityTable<JournalDay, 'date'>
  settings: EntityTable<Settings, 'key'>
}

db.version(1).stores({
  shells: 'id, date, createdAt',
  cards: 'id, kind, createdAt',
  foreshadowing: 'id, status, createdAt',
  moon: 'id, date, createdAt',
  journal: 'date',
  settings: 'key',
})

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** 原作短摘要不得超过 200 字（PRINCIPLES 第 2 条，数据层校验）。 */
export function checkSummaryLength(note: string): boolean {
  return note.length <= SUMMARY_MAX_LENGTH
}

/** 未回收的伏笔条数，潮位首页用水位和礁石表现它。 */
export async function countUnrecovered(): Promise<number> {
  return db.foreshadowing.where('status').equals('已埋下').count()
}

export async function getSettings(): Promise<Settings> {
  const saved = await db.settings.get('settings')
  return (
    saved ?? {
      key: 'settings',
      aiKey: '',
      aiBaseUrl: '',
      aiModel: '',
      theme: '跟随系统',
    }
  )
}

export async function saveSettings(patch: Partial<Omit<Settings, 'key'>>): Promise<void> {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch })
}

// ---- 贝壳盒 ----
export async function listShells(): Promise<Shell[]> {
  return db.shells.orderBy('createdAt').reverse().toArray()
}

export async function addShell(shell: Omit<Shell, 'id' | 'createdAt'>): Promise<string> {
  const id = newId()
  await db.shells.add({ ...shell, id, createdAt: Date.now() })
  return id
}

export async function updateShell(id: string, patch: Partial<Omit<Shell, 'id' | 'createdAt'>>): Promise<void> {
  await db.shells.update(id, patch)
}

export async function deleteShell(id: string): Promise<void> {
  await db.shells.delete(id)
}

// ---- 设定卡 ----
export async function listCards(): Promise<SettingCard[]> {
  return db.cards.orderBy('createdAt').reverse().toArray()
}

export async function addCard(card: Omit<SettingCard, 'id' | 'createdAt'>): Promise<string> {
  const id = newId()
  await db.cards.add({ ...card, id, createdAt: Date.now() })
  return id
}

export async function updateCard(id: string, patch: Partial<Omit<SettingCard, 'id' | 'createdAt'>>): Promise<void> {
  await db.cards.update(id, patch)
}

export async function deleteCard(id: string): Promise<void> {
  await db.cards.delete(id)
  // 删掉的卡若被关系卡连着，连线一起清掉
  const rels = await db.cards.where('kind').equals('关系').toArray()
  for (const rel of rels) {
    if (rel.links && (rel.links.fromId === id || rel.links.toId === id)) {
      await db.cards.update(rel.id, { links: undefined })
    }
  }
}

// ---- 伏笔 ----
export async function listForeshadowing(): Promise<Foreshadowing[]> {
  return db.foreshadowing.orderBy('createdAt').reverse().toArray()
}

export async function addForeshadowing(f: Omit<Foreshadowing, 'id' | 'createdAt'>): Promise<string> {
  const id = newId()
  await db.foreshadowing.add({ ...f, id, createdAt: Date.now() })
  return id
}

export async function updateForeshadowing(
  id: string,
  patch: Partial<Omit<Foreshadowing, 'id' | 'createdAt'>>,
): Promise<void> {
  await db.foreshadowing.update(id, patch)
}

export async function deleteForeshadowing(id: string): Promise<void> {
  await db.foreshadowing.delete(id)
}

// ---- 月相 ----
export async function listMoon(): Promise<MoonEntry[]> {
  return db.moon.orderBy('createdAt').reverse().toArray()
}

export async function addMoon(m: Omit<MoonEntry, 'id' | 'createdAt'>): Promise<string> {
  if (!checkSummaryLength(m.note)) {
    throw new Error(`摘要请控制在 ${SUMMARY_MAX_LENGTH} 字以内。`)
  }
  const id = newId()
  await db.moon.add({ ...m, id, createdAt: Date.now() })
  return id
}

export async function updateMoon(
  id: string,
  patch: Partial<Omit<MoonEntry, 'id' | 'createdAt'>>,
): Promise<void> {
  if (patch.note !== undefined && !checkSummaryLength(patch.note)) {
    throw new Error(`摘要请控制在 ${SUMMARY_MAX_LENGTH} 字以内。`)
  }
  await db.moon.update(id, patch)
}

export async function deleteMoon(id: string): Promise<void> {
  await db.moon.delete(id)
}

// ---- 潮汐表（每日字数，手动登记） ----
export async function listJournal(): Promise<JournalDay[]> {
  return db.journal.orderBy('date').toArray()
}

export async function upsertJournalEntry(date: string, words: number): Promise<void> {
  await db.journal.put({ date, words })
}

export async function deleteJournalEntry(date: string): Promise<void> {
  await db.journal.delete(date)
}

// 清空全部数据（含设置里的 AI Key 与主题选择）
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [db.shells, db.cards, db.foreshadowing, db.moon, db.journal, db.settings], async () => {
    await db.shells.clear()
    await db.cards.clear()
    await db.foreshadowing.clear()
    await db.moon.clear()
    await db.journal.clear()
    await db.settings.clear()
  })
}

export function todayString(): string {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
