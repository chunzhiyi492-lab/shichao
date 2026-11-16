// AI 解析函数单测（阶段 5.4）
import { describe, expect, it } from 'vitest'
import { extractJsonArray, parseContradictions, parseQuestions } from './ai'

describe('extractJsonArray', () => {
  it('解析纯 JSON 数组', () => {
    expect(extractJsonArray('[{"a":1}]')).toEqual([{ a: 1 }])
  })
  it('容忍 ```json 围栏与前后文字', () => {
    expect(
      extractJsonArray('下面是结果：\n```json\n[{"原句":"x","矛盾描述":"y","依据的设定卡名称":"z"}]\n```\n以上。'),
    ).toEqual([{ 原句: 'x', 矛盾描述: 'y', 依据的设定卡名称: 'z' }])
  })
  it('不是 JSON 时返回 null', () => {
    expect(extractJsonArray('没有发现矛盾。')).toBeNull()
  })
  it('空数组是合法结果', () => {
    expect(extractJsonArray('[]')).toEqual([])
  })
})

describe('parseContradictions', () => {
  it('空数组表示没有矛盾', () => {
    expect(parseContradictions('[]')).toEqual([])
  })
  it('缺字段时返回 null', () => {
    expect(parseContradictions('[{"原句":"x"}]')).toBeNull()
  })
})

describe('parseQuestions', () => {
  it('拆出带序号的问题，最多 5 条', () => {
    const text = '1. 第一个问题？\n2. 第二个问题？\n3. 第三个？\n4. 第四个？\n5. 第五个？\n6. 第六个？'
    expect(parseQuestions(text)).toHaveLength(5)
    expect(parseQuestions(text)[0]).toBe('第一个问题？')
  })
})
