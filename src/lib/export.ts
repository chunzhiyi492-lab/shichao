// 导出 / 导入（阶段 5.5）
// 导出只含创作内容（贝壳盒、设定卡、伏笔、月相、潮汐表），绝不含设置里的 AI Key。
// 导入只接受自己导出的 JSON，导入前校验格式；导入是整库替换，会覆盖当前全部数据。

import { db } from './db'
import type { Foreshadowing, JournalDay, MoonEntry, SettingCard, Shell } from './types'

export interface ExportData {
  version: 1
  exportedAt: string
  shells: Shell[]
  cards: SettingCard[]
  foreshadowing: Foreshadowing[]
  moon: MoonEntry[]
  journal: JournalDay[]
}

export async function buildExportData(): Promise<ExportData> {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    shells: await db.shells.toArray(),
    cards: await db.cards.toArray(),
    foreshadowing: await db.foreshadowing.toArray(),
    moon: await db.moon.toArray(),
    journal: await db.journal.toArray(),
  }
}

export async function exportToJson(): Promise<string> {
  const data = await buildExportData()
  return JSON.stringify(data, null, 2)
}

export async function exportToMarkdown(): Promise<string> {
  const data = await buildExportData()
  const lines: string[] = ['# 拾潮 · 数据导出', '', `导出时间：${data.exportedAt}`, '']
  lines.push('## 贝壳盒', '')
  for (const s of data.shells) {
    lines.push(`- ${s.text}${s.tags.length ? `（标签：${s.tags.join('、')}）` : ''}${s.mood ? `（心情：${s.mood}）` : ''} —— ${s.date}`)
  }
  lines.push('', '## 设定卡', '')
  for (const c of data.cards) {
    const fields = Object.entries(c.fields)
      .map(([k, v]) => `${k}：${v}`)
      .join('；')
    lines.push(`- ${c.title}（${c.kind}）${fields ? `：${fields}` : ''}`)
  }
  lines.push('', '## 伏笔', '')
  for (const f of data.foreshadowing) {
    lines.push(`- ${f.title}（${f.status}）${f.note ? `：${f.note}` : ''}`)
  }
  lines.push('', '## 月相', '')
  for (const m of data.moon) {
    lines.push(`- ${m.name}${m.link ? `（${m.link}）` : ''}${m.note ? `：${m.note}` : ''} —— ${m.date}`)
  }
  lines.push('', '## 潮汐表', '')
  for (const j of data.journal) {
    lines.push(`- ${j.date}：${j.words} 字`)
  }
  lines.push('')
  return lines.join('\n')
}

// 校验导入文件：必须是 version 1 且五类内容都是数组，否则报错
export function parseImport(text: string): ExportData {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('这个文件不是有效的 JSON，无法导入。')
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('导入文件格式不对。')
  }
  const o = parsed as Record<string, unknown>
  if (o.version !== 1) {
    throw new Error('导入文件版本不对（只接受拾潮导出的 v1 文件）。')
  }
  for (const key of ['shells', 'cards', 'foreshadowing', 'moon', 'journal']) {
    if (!Array.isArray(o[key])) {
      throw new Error(`导入文件缺 ${key} 这一项。`)
    }
  }
  return parsed as ExportData
}

// 整库替换：先清五张内容表，再写入导入的数据（不碰设置，Key 不受影响）
export async function importData(data: ExportData): Promise<void> {
  await db.transaction('rw', [db.shells, db.cards, db.foreshadowing, db.moon, db.journal], async () => {
    await db.shells.clear()
    await db.cards.clear()
    await db.foreshadowing.clear()
    await db.moon.clear()
    await db.journal.clear()
    await db.shells.bulkAdd(data.shells)
    await db.cards.bulkAdd(data.cards)
    await db.foreshadowing.bulkAdd(data.foreshadowing)
    await db.moon.bulkAdd(data.moon)
    await db.journal.bulkAdd(data.journal)
  })
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
