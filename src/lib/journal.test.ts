// 连续创作天数单测（阶段 5.5）
import { describe, expect, it } from 'vitest'
import { computeStreak } from './journal'

describe('computeStreak', () => {
  it('今天和昨天都有记录时连算 2 天', () => {
    expect(
      computeStreak(
        [
          { date: '2026-11-16', words: 1200 },
          { date: '2026-11-15', words: 800 },
        ],
        '2026-11-16',
      ),
    ).toBe(2)
  })
  it('今天没记，从昨天往前数', () => {
    expect(
      computeStreak(
        [
          { date: '2026-11-15', words: 800 },
          { date: '2026-11-14', words: 500 },
        ],
        '2026-11-16',
      ),
    ).toBe(2)
  })
  it('断了一天就停', () => {
    expect(
      computeStreak(
        [
          { date: '2026-11-16', words: 100 },
          { date: '2026-11-14', words: 100 },
        ],
        '2026-11-16',
      ),
    ).toBe(1)
  })
  it('没有记录是 0', () => {
    expect(computeStreak([], '2026-11-16')).toBe(0)
  })
})
