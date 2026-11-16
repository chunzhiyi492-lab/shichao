// 设定卡 · 人物 / 关系 / 世界观（阶段 5.2）
// 自定义字段、关系卡连线、关系节点图（可拖动）。
// 数据只存本地 IndexedDB。

import { useEffect, useMemo, useRef, useState } from 'react'
import { addCard, deleteCard, listCards, updateCard } from '../../lib/db'
import type { CardKind, SettingCard } from '../../lib/types'

const KINDS: CardKind[] = ['人物', '关系', '世界观']

interface FieldRow {
  key: string
  value: string
}

const NODE_W = 104
const NODE_H = 44

function defaultPos(index: number): { x: number; y: number } {
  // 手机宽 375 下容器约 343px：两列排布，节点之间留 60px 以上的空隙，
  // 连线才看得见；三列排得太密，连线会被节点盖住。
  const col = index % 2
  const row = Math.floor(index / 2)
  return { x: 8 + col * 170, y: 12 + row * 72 }
}

export default function CardsPage() {
  const [cards, setCards] = useState<SettingCard[]>([])
  const [kind, setKind] = useState<CardKind>('人物')
  const [title, setTitle] = useState('')
  const [fields, setFields] = useState<FieldRow[]>([{ key: '', value: '' }])
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [kindFilter, setKindFilter] = useState<CardKind | '全部'>('全部')
  const [view, setView] = useState<'列表' | '关系图'>('列表')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const graphRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null)

  const load = async () => {
    const all = await listCards()
    setCards(all)
    setPositions((prev) => {
      const next = { ...prev }
      // 没存过位置的新节点按已占格子数往后排，不能按列表下标排——
      // 新卡永远排在列表最前面，下标永远是 0，会和已有节点重叠。
      all.forEach((c) => {
        if (!next[c.id]) {
          next[c.id] =
            c.x !== undefined && c.y !== undefined ? { x: c.x, y: c.y } : defaultPos(Object.keys(next).length)
        }
      })
      return next
    })
  }

  useEffect(() => {
    void load()
  }, [])

  const linkables = useMemo(() => cards.filter((c) => c.kind !== '关系'), [cards])
  const visible = useMemo(
    () => (kindFilter === '全部' ? cards : cards.filter((c) => c.kind === kindFilter)),
    [cards, kindFilter],
  )
  const edges = useMemo(
    () =>
      cards
        .filter((c) => c.kind === '关系' && c.links?.fromId && c.links?.toId)
        .map((c) => ({ rel: c, from: positions[c.links!.fromId], to: positions[c.links!.toId] }))
        .filter((e) => e.from && e.to),
    [cards, positions],
  )

  const resetForm = () => {
    setKind('人物')
    setTitle('')
    setFields([{ key: '', value: '' }])
    setFromId('')
    setToId('')
    setEditingId(null)
  }

  const save = async () => {
    const t = title.trim()
    if (!t) return
    const fieldObj: Record<string, string> = {}
    fields.forEach((f) => {
      if (f.key.trim()) fieldObj[f.key.trim()] = f.value
    })
    const patch = {
      kind,
      title: t,
      fields: fieldObj,
      links: kind === '关系' && fromId && toId ? { fromId, toId } : undefined,
    }
    if (editingId) {
      await updateCard(editingId, patch)
    } else {
      await addCard(patch)
    }
    resetForm()
    await load()
  }

  const startEdit = (c: SettingCard) => {
    setEditingId(c.id)
    setKind(c.kind)
    setTitle(c.title)
    const rows = Object.entries(c.fields).map(([key, value]) => ({ key, value }))
    setFields(rows.length > 0 ? rows : [{ key: '', value: '' }])
    setFromId(c.links?.fromId ?? '')
    setToId(c.links?.toId ?? '')
    window.scrollTo({ top: 0 })
  }

  const remove = async (id: string) => {
    await deleteCard(id)
    setConfirmDeleteId(null)
    await load()
  }

  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    const pos = positions[id]
    if (!pos || !graphRef.current) return
    const rect = graphRef.current.getBoundingClientRect()
    // 记住按下时指针相对节点左上角的偏移，拖动时节点跟手不跳
    dragRef.current = { id, dx: e.clientX - rect.left - pos.x, dy: e.clientY - rect.top - pos.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onNodePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag || !graphRef.current) return
    const rect = graphRef.current.getBoundingClientRect()
    const nx = Math.max(0, Math.min(e.clientX - rect.left - drag.dx, rect.width - NODE_W))
    const ny = Math.max(0, Math.min(e.clientY - rect.top - drag.dy, 320 - NODE_H))
    setPositions((prev) => ({ ...prev, [drag.id]: { x: nx, y: ny } }))
  }

  const onNodePointerUp = async () => {
    const drag = dragRef.current
    dragRef.current = null
    if (drag) {
      const pos = positions[drag.id]
      if (pos) await updateCard(drag.id, { x: Math.round(pos.x), y: Math.round(pos.y) })
    }
  }

  const cardTitle = (id: string) => cards.find((c) => c.id === id)?.title ?? '（已删）'

  return (
    <section className="page">
      <h2>设定卡</h2>
      <p className="page-desc">人物卡、关系卡、世界观卡，字段可以自己加；关系用节点图看连线。</p>

      <div className="field-row">
        <label htmlFor="card-kind">类型</label>
        <select id="card-kind" value={kind} onChange={(e) => setKind(e.target.value as CardKind)}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>
      <div className="field-row">
        <label htmlFor="card-title">标题</label>
        <input id="card-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：阿潮" />
      </div>
      {kind === '关系' && (
        <div className="form-row">
          <div className="field-row">
            <label htmlFor="card-from">连线一端</label>
            <select id="card-from" value={fromId} onChange={(e) => setFromId(e.target.value)}>
              <option value="">选一张卡</option>
              {linkables.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}（{c.kind}）
                </option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <label htmlFor="card-to">连线另一端</label>
            <select id="card-to" value={toId} onChange={(e) => setToId(e.target.value)}>
              <option value="">选一张卡</option>
              {linkables.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}（{c.kind}）
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <div className="field-row">
        <span className="field-label">自定义字段</span>
        {fields.map((f, i) => (
          <div key={i} className="field-pair">
            <input
              aria-label="字段名"
              value={f.key}
              onChange={(e) => {
                const next = [...fields]
                next[i] = { ...next[i], key: e.target.value }
                setFields(next)
              }}
              placeholder="字段名，如：性格"
            />
            <input
              aria-label="字段内容"
              value={f.value}
              onChange={(e) => {
                const next = [...fields]
                next[i] = { ...next[i], value: e.target.value }
                setFields(next)
              }}
              placeholder="内容"
            />
            <button
              type="button"
              className="btn-text"
              onClick={() => setFields(fields.filter((_, j) => j !== i))}
              aria-label="去掉这个字段"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="btn-ghost" onClick={() => setFields([...fields, { key: '', value: '' }])}>
          再加一个字段
        </button>
      </div>
      <div className="field-row">
        <button type="button" className="btn-primary" disabled={!title.trim()} onClick={() => void save()}>
          {editingId ? '保存修改' : '保存设定卡'}
        </button>
        {editingId && (
          <button type="button" className="btn-ghost" onClick={resetForm}>
            取消编辑
          </button>
        )}
      </div>

      <div className="view-switch" role="group" aria-label="查看方式">
        <button type="button" className={view === '列表' ? 'tag active' : 'tag'} onClick={() => setView('列表')}>
          列表
        </button>
        <button type="button" className={view === '关系图' ? 'tag active' : 'tag'} onClick={() => setView('关系图')}>
          关系图
        </button>
        <select
          aria-label="按类型筛"
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as CardKind | '全部')}
        >
          <option value="全部">全部类型</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>

      {view === '关系图' ? (
        cards.length === 0 ? (
          <p className="empty-state">还没有设定卡，先在上面建一张，关系图会出现在这里。</p>
        ) : (
          <>
            <div
              className="graph"
              ref={graphRef}
              onPointerMove={onNodePointerMove}
              onPointerUp={() => void onNodePointerUp()}
            >
              <svg className="graph-lines" aria-hidden="true">
                {edges.map(({ rel, from, to }) => {
                  const x1 = from.x + NODE_W / 2
                  const y1 = from.y + NODE_H / 2
                  const x2 = to.x + NODE_W / 2
                  const y2 = to.y + NODE_H / 2
                  const mx = (x1 + x2) / 2
                  const my = (y1 + y2) / 2
                  return (
                    <g key={rel.id}>
                      {/* 弧线向上弓起，关系名写在两节点中心连线的中点——弧线下方、节点之间的空隙里，不会被顶部裁掉 */}
                      <path d={`M ${x1} ${y1} Q ${mx} ${my - 50} ${x2} ${y2}`} fill="none" />
                      <text x={mx} y={my + 4}>
                        {rel.title}
                      </text>
                    </g>
                  )
                })}
              </svg>
              {visible.map((c) => {
                const pos = positions[c.id] ?? defaultPos(0)
                return (
                  <div
                    key={c.id}
                    className={`graph-node kind-${c.kind}`}
                    style={{ left: pos.x, top: pos.y }}
                    onPointerDown={(e) => onNodePointerDown(e, c.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${c.title}（${c.kind}），可拖动`}
                  >
                    <strong>{c.title}</strong>
                    <span>{c.kind}</span>
                  </div>
                )
              })}
            </div>
            <p className="note">按住节点可以拖动位置，松手就保存。线是关系卡连起来的两张卡。</p>
          </>
        )
      ) : cards.length === 0 ? (
        <p className="empty-state">还没有设定卡，建第一张人物卡或世界观卡，关系图才有东西可连。</p>
      ) : visible.length === 0 ? (
        <p className="empty-state">这个类型下还没有卡，换个类型看看。</p>
      ) : (
        <ul className="rule-list plain-list">
          {visible.map((c) => (
            <li key={c.id}>
              <p className="item-text">
                {c.title} <span className="item-kind">（{c.kind}）</span>
              </p>
              {c.kind === '关系' && c.links && (
                <p className="item-meta">
                  {cardTitle(c.links.fromId)} — {cardTitle(c.links.toId)}
                </p>
              )}
              {Object.entries(c.fields).map(([k, v]) => (
                <p key={k} className="item-meta">
                  {k}：{v}
                </p>
              ))}
              <p className="item-actions">
                <button type="button" className="btn-text" onClick={() => startEdit(c)}>
                  编辑
                </button>
                {confirmDeleteId === c.id ? (
                  <>
                    <button type="button" className="btn-text danger" onClick={() => void remove(c.id)}>
                      确认删除
                    </button>
                    <button type="button" className="btn-text" onClick={() => setConfirmDeleteId(null)}>
                      取消
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn-text" onClick={() => setConfirmDeleteId(c.id)}>
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
