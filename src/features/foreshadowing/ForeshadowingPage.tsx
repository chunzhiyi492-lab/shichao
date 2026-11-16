// 伏笔 · 清单（阶段 5.3）
// 新增 / 编辑 / 删除伏笔，标题、说明、关联设定卡、状态（已埋下 / 已回收 / 已放弃）。
// 数据只存本地 IndexedDB。

import { useEffect, useMemo, useState } from 'react'
import {
  addForeshadowing,
  deleteForeshadowing,
  listCards,
  listForeshadowing,
  updateForeshadowing,
} from '../../lib/db'
import type { ForeshadowStatus, Foreshadowing, SettingCard } from '../../lib/types'

const STATUSES: ForeshadowStatus[] = ['已埋下', '已回收', '已放弃']

export default function ForeshadowingPage() {
  const [items, setItems] = useState<Foreshadowing[]>([])
  const [cards, setCards] = useState<SettingCard[]>([])
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [cardIds, setCardIds] = useState<string[]>([])
  const [status, setStatus] = useState<ForeshadowStatus>('已埋下')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ForeshadowStatus | '全部'>('全部')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const load = async () => {
    setItems(await listForeshadowing())
    setCards(await listCards())
  }

  useEffect(() => {
    void load()
  }, [])

  const visible = useMemo(
    () => (statusFilter === '全部' ? items : items.filter((i) => i.status === statusFilter)),
    [items, statusFilter],
  )

  const cardTitle = (id: string) => cards.find((c) => c.id === id)?.title ?? '（已删）'

  const resetForm = () => {
    setTitle('')
    setNote('')
    setCardIds([])
    setStatus('已埋下')
    setEditingId(null)
  }

  const save = async () => {
    const t = title.trim()
    if (!t) return
    if (editingId) {
      await updateForeshadowing(editingId, { title: t, note: note.trim(), cardIds, status })
    } else {
      await addForeshadowing({ title: t, note: note.trim(), cardIds, status })
    }
    resetForm()
    await load()
  }

  const startEdit = (f: Foreshadowing) => {
    setEditingId(f.id)
    setTitle(f.title)
    setNote(f.note)
    setCardIds(f.cardIds)
    setStatus(f.status)
    window.scrollTo({ top: 0 })
  }

  const remove = async (id: string) => {
    await deleteForeshadowing(id)
    setConfirmDeleteId(null)
    await load()
  }

  const setStatusOf = async (id: string, s: ForeshadowStatus) => {
    await updateForeshadowing(id, { status: s })
    await load()
  }

  const toggleCard = (id: string) => {
    setCardIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  return (
    <section className="page">
      <h2>伏笔</h2>
      <p className="page-desc">每条伏笔有标题、说明、关联设定卡和状态。埋下的伏笔会成为潮位首页水下的一块礁石。</p>

      <div className="field-row">
        <label htmlFor="fore-title">标题</label>
        <input id="fore-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：贝壳上的刻痕" />
      </div>
      <div className="field-row">
        <label htmlFor="fore-note">说明</label>
        <textarea
          id="fore-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="这条伏笔埋了什么、打算在哪里收"
        />
      </div>
      <div className="field-row">
        <span className="field-label">关联设定卡</span>
        {cards.length === 0 ? (
          <p className="note">还没有设定卡，先去设定页建一张，这里才能关联。</p>
        ) : (
          <div className="tag-row">
            {cards.map((c) => (
              <button
                key={c.id}
                type="button"
                className={cardIds.includes(c.id) ? 'tag active' : 'tag'}
                onClick={() => toggleCard(c.id)}
                aria-pressed={cardIds.includes(c.id)}
              >
                {c.title}（{c.kind}）
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="field-row">
        <label htmlFor="fore-status">状态</label>
        <select id="fore-status" value={status} onChange={(e) => setStatus(e.target.value as ForeshadowStatus)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="field-row">
        <button type="button" className="btn-primary" disabled={!title.trim()} onClick={() => void save()}>
          {editingId ? '保存修改' : '埋下伏笔'}
        </button>
        {editingId && (
          <button type="button" className="btn-ghost" onClick={resetForm}>
            取消编辑
          </button>
        )}
      </div>

      <div className="tag-row" aria-label="按状态筛">
        {(['全部', ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={statusFilter === s ? 'tag active' : 'tag'}
            onClick={() => setStatusFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="empty-state">还没有伏笔，埋下第一条，它就会成为潮位首页水下的一块礁石。</p>
      ) : visible.length === 0 ? (
        <p className="empty-state">这个状态下还没有伏笔，换个状态看看。</p>
      ) : (
        <ul className="rule-list plain-list">
          {visible.map((f) => (
            <li key={f.id}>
              <p className="item-text">
                {f.title} <span className="item-kind">（{f.status}）</span>
              </p>
              {f.note && <p className="item-meta">{f.note}</p>}
              {f.cardIds.length > 0 && <p className="item-meta">关联：{f.cardIds.map(cardTitle).join('，')}</p>}
              <p className="item-actions">
                {f.status === '已埋下' && (
                  <>
                    <button type="button" className="btn-text" onClick={() => void setStatusOf(f.id, '已回收')}>
                      标记已回收
                    </button>
                    <button type="button" className="btn-text" onClick={() => void setStatusOf(f.id, '已放弃')}>
                      标记已放弃
                    </button>
                  </>
                )}
                {f.status !== '已埋下' && (
                  <button type="button" className="btn-text" onClick={() => void setStatusOf(f.id, '已埋下')}>
                    重新埋下
                  </button>
                )}
                <button type="button" className="btn-text" onClick={() => startEdit(f)}>
                  编辑
                </button>
                {confirmDeleteId === f.id ? (
                  <>
                    <button type="button" className="btn-text danger" onClick={() => void remove(f.id)}>
                      确认删除
                    </button>
                    <button type="button" className="btn-text" onClick={() => setConfirmDeleteId(null)}>
                      取消
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn-text" onClick={() => setConfirmDeleteId(f.id)}>
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
