// 拾潮 · 主题（深夜 / 白天）
// 同 6 个颜色换角色，不另加颜色。默认跟随系统，可在设置页手动切，选择只存本机。

import type { ThemeChoice } from './types'

export type ResolvedTheme = '深夜' | '白天'

const STORAGE_KEY = 'shichao-theme'

export function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return '白天'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? '深夜' : '白天'
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  return choice === '跟随系统' ? systemTheme() : choice
}

export function applyTheme(choice: ThemeChoice): ResolvedTheme {
  const resolved = resolveTheme(choice)
  document.documentElement.dataset.theme = resolved === '深夜' ? 'night' : 'day'
  try {
    localStorage.setItem(STORAGE_KEY, choice)
  } catch {
    // 本地存储不可用时只应用本次，不报错
  }
  return resolved
}

export function loadThemeChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === '深夜' || saved === '白天' || saved === '跟随系统') return saved
  } catch {
    // 忽略
  }
  return '跟随系统'
}
