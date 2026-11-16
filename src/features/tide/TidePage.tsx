// 潮位首页 · 海岸线与礁石（阶段 5.3）
// 水位随未回收伏笔数升降；未回收的伏笔是水下的礁石（模糊轮廓 + 标题），点开看详情；
// 标记“已回收”后水位轻轻下降，礁石慢慢露出水面。
// 动效只用 transform 与 opacity，800ms 缓出；减动态时（系统设置）直接变静态。

import { useCallback, useEffect, useState } from 'react'
import { listCards, listForeshadowing, updateForeshadowing } from '../../lib/db'
import type { Foreshadowing, SettingCard } from '../../lib/types'

function reefTop(index: number): number {
  return 200 + (index % 3) * 28
}

function reefLeft(index: number): number {
  return 10 + (index % 4) * 22
}

export default function TidePage() {
  const [items, setItems] = useState<Foreshadowing[]>([])
  const [cards, setCards] = useState<SettingCard[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setItems(await listForeshadowing())
    setCards(await listCards())
  }, [])

  useEffect(() => {
    void load()
  }, [])

  const unrecovered = items.filter((i) => i.status === '已埋下')
  const visible = items.filter((i) => i.status !== '已放弃')
  const level = 35 + Math.min(unrecovered.length, 8) * 5
  const selected = items.find((i) => i.id === selectedId) ?? null

  const cardTitle = (id: string) => cards.find((c) => c.id === id)?.title ?? '（已删）'

  const setStatus = async (id: string, status: Foreshadowing['status']) => {
    await updateForeshadowing(id, { status })
    await load()
  }

  return (
    <section className="page" aria-label="潮位首页">
      <div className="coast" aria-label="海岸线">
        <div className="sky">
          <span className="moon" aria-hidden="true">
            🌙
          </span>
        </div>
        <div
          className="water"
          style={{ transform: `translateY(${100 - level}%)` }}
          aria-hidden="true"
        />
        {visible.map((reef, i) => (
          <button
            key={reef.id}
            type="button"
            className={reef.status === '已回收' ? 'reef reef-out' : 'reef reef-under'}
            style={{ left: `${reefLeft(i)}%`, top: `${reefTop(i)}px` }}
            onClick={() => setSelectedId(selectedId === reef.id ? null : reef.id)}
            aria-pressed={selectedId === reef.id}
            aria-label={`${reef.title}（${reef.status}），点开看详情`}
          >
            {reef.title}
          </button>
        ))}
      </div>

      <p className="tide-sentence">水下还有 {unrecovered.length} 块礁石</p>

      {selected && (
        <div className="reef-detail">
          <p className="item-text">
            {selected.title} <span className="item-kind">（{selected.status}）</span>
          </p>
          {selected.note && <p className="item-meta">{selected.note}</p>}
          {selected.cardIds.length > 0 && (
            <p className="item-meta">关联：{selected.cardIds.map(cardTitle).join('，')}</p>
          )}
          <p className="item-actions">
            {selected.status === '已埋下' && (
              <>
                <button
                  type="button"
                  className="btn-text"
                  onClick={() => void setStatus(selected.id, '已回收')}
                >
                  标记已回收
                </button>
                <button
                  type="button"
                  className="btn-text"
                  onClick={() => void setStatus(selected.id, '已放弃')}
                >
                  标记已放弃
                </button>
              </>
            )}
            {selected.status !== '已埋下' && (
              <button
                type="button"
                className="btn-text"
                onClick={() => void setStatus(selected.id, '已埋下')}
              >
                重新埋下
              </button>
            )}
            <button type="button" className="btn-text" onClick={() => setSelectedId(null)}>
              收起
            </button>
          </p>
        </div>
      )}

      {items.length === 0 && (
        <p className="empty-state">还没有伏笔，埋下第一条伏笔，它就会成为水下的一块礁石。</p>
      )}
    </section>
  )
}
