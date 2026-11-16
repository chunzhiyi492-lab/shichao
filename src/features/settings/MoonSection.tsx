// 月相 · 原作登记（阶段 5.5）
// 只存名称、链接、自己写的 200 字内摘要、日期和手动勾选的“原作者二创规则”清单。
// 不存原作原文、截图或译文。

import { useEffect, useState } from 'react'
import { addMoon, deleteMoon, listMoon, todayString, updateMoon } from '../../lib/db'
import { SUMMARY_MAX_LENGTH } from '../../lib/types'
import type { MoonEntry } from '../../lib/types'

const RULES = ['已读过原作者的二创声明', '不涉及商业用途', '不公开原作原文', '已标注原作来源']

export default function MoonSection() {
  const [items, setItems] = useState<MoonEntry[]>([])
  const [name, setName] = useState('')
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayString())
  const [rulesChecked, setRulesChecked] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const load = async () => setItems(await listMoon())

  useEffect(() => {
    void load()
  }, [])

  const resetForm = () => {
    setName('')
    setLink('')
    setNote('')
    setDate(todayString())
    setRulesChecked([])
    setEditingId(null)
    setError('')
  }

  const save = async () => {
    if (!name.trim()) return
    setError('')
    try {
      if (editingId) {
        await updateMoon(editingId, {
          name: name.trim(),
          link: link.trim(),
          note: note.trim(),
          date,
          rulesChecked,
        })
      } else {
        await addMoon({ name: name.trim(), link: link.trim(), note: note.trim(), date, rulesChecked })
      }
      resetForm()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败。')
    }
  }

  const startEdit = (m: MoonEntry) => {
    setEditingId(m.id)
    setName(m.name)
    setLink(m.link)
    setNote(m.note)
    setDate(m.date)
    setRulesChecked(m.rulesChecked)
    setError('')
  }

  const remove = async (id: string) => {
    await deleteMoon(id)
    setConfirmDeleteId(null)
    await load()
  }

  const toggleRule = (rule: string) => {
    setRulesChecked((prev) => (prev.includes(rule) ? prev.filter((r) => r !== rule) : [...prev, rule]))
  }

  return (
    <>
      <h3>月相</h3>
      <p className="page-desc">登记原作：只记名称、链接和你自己写的短摘要，不存原作原文、截图或译文。</p>
      <div className="field-row">
        <label htmlFor="moon-name">原作名称</label>
        <input id="moon-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：某部你喜欢的作品" />
      </div>
      <div className="field-row">
        <label htmlFor="moon-link">链接</label>
        <input id="moon-link" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="原作页面链接（可不填）" />
      </div>
      <div className="field-row">
        <label htmlFor="moon-note">自己的话概括</label>
        <textarea
          id="moon-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="请用自己的话概括，不超过 200 字"
        />
        <p className="note">
          {note.length}/{SUMMARY_MAX_LENGTH} 字
        </p>
      </div>
      <div className="field-row">
        <label htmlFor="moon-date">日期</label>
        <input id="moon-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field-row">
        <span className="field-label">原作者二创规则（自己核对，逐项勾选）</span>
        <div className="tag-row">
          {RULES.map((r) => (
            <button
              key={r}
              type="button"
              className={rulesChecked.includes(r) ? 'tag active' : 'tag'}
              onClick={() => toggleRule(r)}
              aria-pressed={rulesChecked.includes(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="item-meta">{error}</p>}
      <div className="field-row">
        <button type="button" className="btn-primary" disabled={!name.trim()} onClick={() => void save()}>
          {editingId ? '保存修改' : '登记原作'}
        </button>
        {editingId && (
          <button type="button" className="btn-ghost" onClick={resetForm}>
            取消编辑
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="empty-state">还没有登记原作。原作只以月亮的形态出现在这里：名字和链接，不展开内容。</p>
      ) : (
        <ul className="rule-list plain-list">
          {items.map((m) => (
            <li key={m.id}>
              <p className="item-text">
                {m.link ? (
                  <a href={m.link} target="_blank" rel="noreferrer">
                    {m.name}
                  </a>
                ) : (
                  m.name
                )}{' '}
                <span className="item-kind">（{m.date}）</span>
              </p>
              {m.note && <p className="item-meta">{m.note}</p>}
              {m.rulesChecked.length > 0 && <p className="item-meta">已核对：{m.rulesChecked.join('、')}</p>}
              <p className="item-actions">
                <button type="button" className="btn-text" onClick={() => startEdit(m)}>
                  编辑
                </button>
                {confirmDeleteId === m.id ? (
                  <>
                    <button type="button" className="btn-text danger" onClick={() => void remove(m.id)}>
                      确认删除
                    </button>
                    <button type="button" className="btn-text" onClick={() => setConfirmDeleteId(null)}>
                      取消
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn-text" onClick={() => setConfirmDeleteId(m.id)}>
                    删除
                  </button>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
