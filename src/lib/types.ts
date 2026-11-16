// 拾潮 · 数据模型类型
// 依据 docs/SCOPE.md 与 docs/TECH.md。所有数据只存本地 IndexedDB。

export type ShellMood = '平静' | '兴奋' | '低落' | '好奇' | '想念'

export interface Shell {
  id: string
  text: string
  tags: string[]
  mood: ShellMood | ''
  date: string // YYYY-MM-DD
  createdAt: number
}

export type CardKind = '人物' | '关系' | '世界观'

export interface SettingCard {
  id: string
  kind: CardKind
  title: string
  // 自定义字段：键是用户起的字段名，值是内容
  fields: Record<string, string>
  // 关系卡专用：连线两端的设定卡 id（人物/世界观卡）
  links?: { fromId: string; toId: string }
  // 关系节点图里的位置
  x?: number
  y?: number
  createdAt: number
}

export type ForeshadowStatus = '已埋下' | '已回收' | '已放弃'

export interface Foreshadowing {
  id: string
  title: string
  note: string
  cardIds: string[] // 关联的设定卡
  status: ForeshadowStatus
  createdAt: number
}

export interface MoonEntry {
  id: string
  name: string
  link: string
  // 自己的笔记：原作相关短摘要，不得超过 200 字（数据层校验）
  note: string
  date: string // YYYY-MM-DD
  rulesChecked: string[] // “原作者二创规则”手动勾选清单里勾了哪些
  createdAt: number
}

export interface JournalDay {
  date: string // YYYY-MM-DD，主键
  words: number // 当日字数，手动登记
}

export type ThemeChoice = '跟随系统' | '深夜' | '白天'

export interface Settings {
  key: 'settings'
  aiKey: string
  aiBaseUrl: string
  aiModel: string
  theme: ThemeChoice
}

export const SUMMARY_MAX_LENGTH = 200
