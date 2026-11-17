// 潮位首页 · 海岸线与礁石（阶段 5.3）
// 水位随未回收伏笔数升降；未回收的伏笔是水下的礁石（模糊轮廓 + 标题），点开看详情；
// 标记“已回收”后水位轻轻下降，礁石慢慢露出水面。
// 动效只用 transform 与 opacity，800ms 缓出；减动态时（系统设置）直接变静态。

import { useCallback, useEffect, useState } from 'react'
import { listCards, listForeshadowing, updateForeshadowing } from '../../lib/db'
import type { Foreshadowing, SettingCard } from '../../lib/types'

// 礁石排布：3 列 × 多行，行距 42px，胶囊变宽后不再左右重叠
function reefTop(index: number): number {
  return 196 + Math.floor(index / 3) * 42
}

function reefLeft(index: number): number {
  return 4 + (index % 3) * 31
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
          <span className="star" style={{ left: '18%', top: '24px' }} aria-hidden="true" />
          <span className="star" style={{ left: '38%', top: '52px', opacity: 0.35 }} aria-hidden="true" />
          <span className="star" style={{ left: '58%', top: '18px', opacity: 0.45 }} aria-hidden="true" />
          <span className="moon" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
              <defs>
                <mask id="moon-mask">
                  <rect width="32" height="32" fill="white" />
                  <circle cx="23" cy="11" r="11" fill="black" />
                </mask>
              </defs>
              <circle cx="16" cy="16" r="12" fill="#E9D9A6" mask="url(#moon-mask)" />
            </svg>
          </span>
        </div>
        {/* 后层水面：更淡、更慢、水位低 5%，和前层错开才有纵深 */}
        <div
          className="water-back"
          style={{ transform: `translateY(${100 - level + 5}%)` }}
          aria-hidden="true"
        />
        <div
          className="water"
          style={{ transform: `translateY(${100 - level}%)` }}
          aria-hidden="true"
        >
          {/* 远岸、月光倒影与涟漪都长在水面上，跟着水位一起动；
              水面是整块向下平移的，海岸只露出它的上半截，所以涟漪只能放在
              上 35% 以内（水位最低时也看得见），bottom 定位会被裁掉 */}
          <span className="distant-shore" aria-hidden="true" />
          <span className="moon-reflection" aria-hidden="true" />
          <span className="ripple" style={{ top: '10%', left: '12%', width: '46%', opacity: 0.5 }} aria-hidden="true" />
          <span className="ripple" style={{ top: '20%', left: '48%', width: '34%', opacity: 0.35 }} aria-hidden="true" />
          <span className="ripple" style={{ top: '30%', left: '8%', width: '60%', opacity: 0.25 }} aria-hidden="true" />
        </div>
        {visible.map((reef, i) => (
          <button
            key={reef.id}
            type="button"
            className={reef.status === '已回收' ? 'reef reef-out' : 'reef reef-under'}
            style={{
              left: `${reefLeft(i)}%`,
              top: `${reefTop(i)}px`,
              transitionDelay: `${i * 70}ms`,
            }}
            onClick={() => setSelectedId(selectedId === reef.id ? null : reef.id)}
            aria-pressed={selectedId === reef.id}
            aria-label={`${reef.title}（${reef.status}），点开看详情`}
          >
            {reef.title}
          </button>
        ))}
      </div>

      <p className="tide-sentence">
        水下还有 <strong className="tide-count">{unrecovered.length}</strong> 块礁石
      </p>

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
