// 潮汐表小工具（阶段 5.5）
// 连续创作天数：从今天（今天没记就从昨天）往前数，有记录的天连续算，断一天就停。

import type { JournalDay } from './types'

function shift(dateStr: string, days: number): string {
  // 按 UTC 算日期，避免本地时区把“当天 00:00”换算成前一天
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function computeStreak(days: JournalDay[], today: string): number {
  const set = new Set(days.map((d) => d.date))
  let cursor = set.has(today) ? today : shift(today, -1)
  let streak = 0
  while (set.has(cursor)) {
    streak += 1
    cursor = shift(cursor, -1)
  }
  return streak
}
