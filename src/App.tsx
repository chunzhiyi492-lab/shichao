// 拾潮 · 应用（阶段 5.3：伏笔与潮位首页已做）
// AI 与设置页完整版在 5.4 / 5.5 做。

import { useEffect, useState } from 'react'
import AiTools from './features/ai/AiTools'
import CardsPage from './features/cards/CardsPage'
import ForeshadowingPage from './features/foreshadowing/ForeshadowingPage'
import DataSection from './features/settings/DataSection'
import JournalSection from './features/settings/JournalSection'
import MoonSection from './features/settings/MoonSection'
import ShellsPage from './features/shells/ShellsPage'
import TidePage from './features/tide/TidePage'
import { getSettings, saveSettings } from './lib/db'
import { applyTheme, loadThemeChoice, systemTheme } from './lib/themes'
import type { ThemeChoice } from './lib/types'
import './App.css'

type Tab = 'tide' | 'shells' | 'cards' | 'foreshadowing' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'tide', label: '潮位' },
  { id: 'shells', label: '贝壳盒' },
  { id: 'cards', label: '设定' },
  { id: 'foreshadowing', label: '伏笔' },
  { id: 'settings', label: '设置' },
]

function SettingsPage() {
  const [theme, setTheme] = useState<ThemeChoice>('跟随系统')
  const [aiKey, setAiKey] = useState('')
  const [aiBaseUrl, setAiBaseUrl] = useState('')
  const [aiModel, setAiModel] = useState('')
  const [aiSaved, setAiSaved] = useState(false)
  const [aiSavedAt, setAiSavedAt] = useState(0)

  useEffect(() => {
    setTheme(loadThemeChoice())
    void getSettings().then((s) => {
      setAiKey(s.aiKey)
      setAiBaseUrl(s.aiBaseUrl)
      setAiModel(s.aiModel)
    })
  }, [])

  const changeTheme = async (choice: ThemeChoice) => {
    setTheme(choice)
    applyTheme(choice)
    await saveSettings({ theme: choice })
  }

  const saveAi = async () => {
    await saveSettings({ aiKey: aiKey.trim(), aiBaseUrl: aiBaseUrl.trim(), aiModel: aiModel.trim() })
    setAiSaved(true)
    setAiSavedAt(Date.now())
  }

  return (
    <section className="page">
      <h2>设置</h2>
      <p className="page-desc">主题、AI Key 与数据都在这里管。</p>
      <div className="field-row">
        <label htmlFor="theme-select">主题</label>
        <select
          id="theme-select"
          value={theme}
          onChange={(e) => void changeTheme(e.target.value as ThemeChoice)}
        >
          <option value="跟随系统">跟随系统</option>
          <option value="深夜">深夜</option>
          <option value="白天">白天</option>
        </select>
        <p className="note">当前跟随系统时是{systemTheme()}主题。选择只存本机。</p>
      </div>

      <h3>AI 设置</h3>
      <p className="page-desc">Key 由你自己填，只存在本机浏览器里，不会上传，也不会写进代码。</p>
      <div className="field-row">
        <label htmlFor="ai-key">AI Key</label>
        <input
          id="ai-key"
          type="password"
          autoComplete="off"
          value={aiKey}
          onChange={(e) => {
            setAiKey(e.target.value)
            setAiSaved(false)
          }}
          placeholder="粘贴你的 Key"
        />
        {aiKey.trim() && <p className="note">已填写 Key（输入框里显示为掩码）。</p>}
      </div>
      <div className="field-row">
        <label htmlFor="ai-base-url">服务地址</label>
        <input
          id="ai-base-url"
          type="url"
          autoComplete="off"
          value={aiBaseUrl}
          onChange={(e) => {
            setAiBaseUrl(e.target.value)
            setAiSaved(false)
          }}
          placeholder="https://api.openai.com/v1（留空用默认）"
        />
      </div>
      <div className="field-row">
        <label htmlFor="ai-model">模型</label>
        <input
          id="ai-model"
          value={aiModel}
          onChange={(e) => {
            setAiModel(e.target.value)
            setAiSaved(false)
          }}
          placeholder="gpt-4o-mini（留空用默认）"
        />
      </div>
      <div className="field-row">
        <button type="button" className="btn-primary" onClick={() => void saveAi()}>
          保存 AI 设置
        </button>
        {aiSaved && <p className="note">已保存，只存本机。</p>}
      </div>

      <AiTools refreshSignal={aiSavedAt} />

      <MoonSection />
      <JournalSection />
      <DataSection />
    </section>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('tide')

  useEffect(() => {
    // 主题：先用本机存的选择，再跟随系统变化
    void getSettings().then((s) => applyTheme(s.theme))
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (loadThemeChoice() === '跟随系统') applyTheme('跟随系统')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>拾潮</h1>
        <p className="app-tagline">原作是月亮，你的故事是潮水</p>
      </header>

      {tab === 'tide' && <TidePage />}
      {tab === 'shells' && <ShellsPage />}
      {tab === 'cards' && <CardsPage />}
      {tab === 'foreshadowing' && <ForeshadowingPage />}
      {tab === 'settings' && <SettingsPage />}

      <nav className="bottom-nav" aria-label="主导航">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
