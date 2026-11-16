// 潮汐表 · 每日字数（阶段 5.5）
// 字数手动登记，一天一个数；曲线是最近 365 天的字数潮汐线，连续创作天数从最近有记录的天往前数。

import { useEffect, useMemo, useState } from 'react'
import { deleteJournalEntry, listJournal, todayString, upsertJournalEntry } from '../../lib/db'
import { computeStreak } from '../../lib/journal'
import type { JournalDay } from '../../lib/types'

const DAYS = 365
const WIDTH = 365
const HEIGHT = 60

function dateShift(dateStr: string, days: number): string {
  // 按 UTC 算日期，避免本地时区把“当天 00:00”换算成前一天
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function JournalSection() {
  const [days, setDays] = useState<JournalDay[]>([])
  const [date, setDate] = useState(todayString())
  const [words, setWords] = useState('')
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null)

  const load = async () => setDays(await listJournal())

  useEffect(() => {
    void load()
  }, [])

  const today = todayString()
  const streak = computeStreak(days, today)
  const total = days.reduce((sum, d) => sum + d.words, 0)
  const recent = useMemo(() => [...days].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14), [days])

  const points = useMemo(() => {
    const map = new Map(days.map((d) => [d.date, d.words]))
    const max = Math.max(1, ...days.map((d) => d.words))
    const pts: string[] = []
    for (let i = 0; i < DAYS; i++) {
      const dateStr = dateShift(today, i - (DAYS - 1))
      const w = map.get(dateStr) ?? 0
      const y = HEIGHT - 4 - (w / max) * (HEIGHT - 8)
      pts.push(`${i},${y.toFixed(1)}`)
    }
    return pts.join(' ')
  }, [days, today])

  const save = async () => {
    const n = Number(words)
    if (!date || !Number.isFinite(n) || n < 0) return
    await upsertJournalEntry(date, Math.floor(n))
    setWords('')
    setDate(todayString())
    await load()
  }

  const remove = async (d: string) => {
    await deleteJournalEntry(d)
    setConfirmDeleteDate(null)
    await load()
  }

  return (
    <>
      <h3>潮汐表</h3>
      <p className="page-desc">每天写了多少字，自己登记一个数。一年是一条潮汐线，连续写的天数也在这里数。</p>
      <p className="tide-sentence">连续创作 {streak} 天 · 累计 {total} 字</p>
      <div className="field-row">
        <label htmlFor="journal-date">日期</label>
        <input id="journal-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field-row">
        <label htmlFor="journal-words">当日字数</label>
        <input
          id="journal-words"
          type="number"
          min={0}
          inputMode="numeric"
          value={words}
          onChange={(e) => setWords(e.target.value)}
          placeholder="例如：1200"
        />
      </div>
      <div className="field-row">
        <button type="button" className="btn-primary" disabled={!words.trim()} onClick={() => void save()}>
          登记字数
        </button>
      </div>

      {days.length === 0 ? (
        <p className="empty-state">还没有登记字数，记下今天的第一笔，潮汐线就开始涨了。</p>
      ) : (
        <>
          <svg className="tide-curve" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="最近 365 天每日字数曲线">
            <polyline points={points} fill="none" stroke="var(--water)" strokeWidth="1.5" />
          </svg>
          <ul className="rule-list plain-list">
            {recent.map((d) => (
              <li key={d.date}>
                <p className="item-text">
                  {d.date} <span className="item-kind">（{d.words} 字）</span>
                </p>
                <p className="item-actions">
                  {confirmDeleteDate === d.date ? (
                    <>
                      <button type="button" className="btn-text danger" onClick={() => void remove(d.date)}>
                        确认删除
                      </button>
                      <button type="button" className="btn-text" onClick={() => setConfirmDeleteDate(null)}>
                        取消
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn-text" onClick={() => setConfirmDeleteDate(d.date)}>
                      删除
                    </button>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
