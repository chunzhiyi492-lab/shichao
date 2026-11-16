// 贝壳盒 · 灵感速记（阶段 5.2）
// 新增 / 编辑 / 删除灵感，文字、标签、心情、日期；按文字、标签、心情搜索筛选。
// 数据只存本地 IndexedDB。

import { useEffect, useMemo, useState } from 'react'
import { addShell, deleteShell, listShells, todayString, updateShell } from '../../lib/db'
import type { Shell, ShellMood } from '../../lib/types'

const MOODS: (ShellMood | '')[] = ['', '平静', '兴奋', '低落', '好奇', '想念']

function parseTags(raw: string): string[] {
  return raw
    .split(/[,，、\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10)
}

export default function ShellsPage() {
  const [shells, setShells] = useState<Shell[]>([])
  const [text, setText] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [mood, setMood] = useState<ShellMood | ''>('')
  const [date, setDate] = useState(todayString())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [moodFilter, setMoodFilter] = useState<ShellMood | ''>('')
  const [tagFilter, setTagFilter] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const load = async () => setShells(await listShells())

  useEffect(() => {
    void load()
  }, [])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    shells.forEach((s) => s.tags.forEach((t) => set.add(t)))
    return [...set]
  }, [shells])

  const visible = useMemo(() => {
    const q = query.trim()
    return shells.filter((s) => {
      if (moodFilter && s.mood !== moodFilter) return false
      if (tagFilter && !s.tags.includes(tagFilter)) return false
      if (q && !(s.text.includes(q) || s.tags.some((t) => t.includes(q)))) return false
      return true
    })
  }, [shells, query, moodFilter, tagFilter])

  const resetForm = () => {
    setText('')
    setTagsRaw('')
    setMood('')
    setDate(todayString())
    setEditingId(null)
  }

  const save = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (editingId) {
      await updateShell(editingId, { text: trimmed, tags: parseTags(tagsRaw), mood, date })
    } else {
      await addShell({ text: trimmed, tags: parseTags(tagsRaw), mood, date })
    }
    resetForm()
    await load()
  }

  const startEdit = (s: Shell) => {
    setEditingId(s.id)
    setText(s.text)
    setTagsRaw(s.tags.join('，'))
    setMood(s.mood)
    setDate(s.date)
    window.scrollTo({ top: 0 })
  }

  const remove = async (id: string) => {
    await deleteShell(id)
    setConfirmDeleteId(null)
    await load()
  }

  return (
    <section className="page">
      <h2>贝壳盒</h2>
      <p className="page-desc">灵感速记：写下文字，可加标签、心情、日期。</p>

      <div className="field-row">
        <label htmlFor="shell-text">灵感</label>
        <textarea
          id="shell-text"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="把刚冒出来的那句话先捡起来……"
        />
      </div>
      <div className="field-row">
        <label htmlFor="shell-tags">标签（用逗号或空格分开）</label>
        <input
          id="shell-tags"
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          placeholder="例如：海边， 潮水"
        />
      </div>
      <div className="form-row">
        <div className="field-row">
          <label htmlFor="shell-mood">心情</label>
          <select id="shell-mood" value={mood} onChange={(e) => setMood(e.target.value as ShellMood | '')}>
            {MOODS.map((m) => (
              <option key={m || 'none'} value={m}>
                {m || '不选'}
              </option>
            ))}
          </select>
        </div>
        <div className="field-row">
          <label htmlFor="shell-date">日期</label>
          <input id="shell-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <button type="button" className="btn-primary" disabled={!text.trim()} onClick={() => void save()}>
          {editingId ? '保存修改' : '保存灵感'}
        </button>
        {editingId && (
          <button type="button" className="btn-ghost" onClick={resetForm}>
            取消编辑
          </button>
        )}
      </div>

      <div className="field-row">
        <label htmlFor="shell-search">搜索</label>
        <input
          id="shell-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜文字或标签"
        />
      </div>
      <div className="form-row">
        <div className="field-row">
          <label htmlFor="shell-mood-filter">按心情筛</label>
          <select
            id="shell-mood-filter"
            value={moodFilter}
            onChange={(e) => setMoodFilter(e.target.value as ShellMood | '')}
          >
            {MOODS.map((m) => (
              <option key={m || 'none'} value={m}>
                {m || '全部'}
              </option>
            ))}
          </select>
        </div>
      </div>
      {allTags.length > 0 && (
        <div className="tag-row" aria-label="按标签筛">
          <button type="button" className={tagFilter === '' ? 'tag active' : 'tag'} onClick={() => setTagFilter('')}>
            全部标签
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              className={tagFilter === t ? 'tag active' : 'tag'}
              onClick={() => setTagFilter(tagFilter === t ? '' : t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {shells.length === 0 ? (
        <p className="empty-state">贝壳盒还是空的，写下第一条灵感，它会出现在这里。</p>
      ) : visible.length === 0 ? (
        <p className="empty-state">没有符合条件的灵感，换个关键词或筛选项试试。</p>
      ) : (
        <ul className="rule-list plain-list">
          {visible.map((s) => (
            <li key={s.id}>
              <p className="item-text">{s.text}</p>
              <p className="item-meta">
                {s.date}
                {s.mood ? ` · ${s.mood}` : ''}
                {s.tags.length > 0 ? ` · ${s.tags.join('，')}` : ''}
              </p>
              <p className="item-actions">
                <button type="button" className="btn-text" onClick={() => startEdit(s)}>
                  编辑
                </button>
                {confirmDeleteId === s.id ? (
                  <>
                    <button type="button" className="btn-text danger" onClick={() => void remove(s.id)}>
                      确认删除
                    </button>
                    <button type="button" className="btn-text" onClick={() => setConfirmDeleteId(null)}>
                      取消
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn-text" onClick={() => setConfirmDeleteId(s.id)}>
                    删除
                  </button>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
