// AI 工具（阶段 5.4）：一致性检查、灵感提问
// 每次调 AI 前都先弹确认框，显示固定提示语，并要求勾选“这是我自己的原创文字”；
// 不勾选不发送。Key 不存在时两个工具都不可用，只提示去设置里填 Key。

import { useEffect, useState } from 'react'
import {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  callChat,
  parseContradictions,
  parseQuestions,
  type Contradiction,
} from '../../lib/ai'
import { getSettings, listCards, listShells } from '../../lib/db'
import { CONSISTENCY_SYSTEM_PROMPT, QUESTIONS_SYSTEM_PROMPT } from '../../lib/prompts'
import type { SettingCard, Shell } from '../../lib/types'

const CONFIRM_TEXT = '将把你选中的这段文字发送给 AI 服务，是否继续？'
const ORIGINAL_LABEL = '这是我自己的原创文字'

function ConfirmDialog({
  preview,
  service,
  onConfirm,
  onCancel,
}: {
  preview: string
  service: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const [checked, setChecked] = useState(false)
  return (
    <div className="confirm-dialog" role="dialog" aria-label="发送给 AI 前的确认">
      <p>{CONFIRM_TEXT}</p>
      <p className="item-meta">将调用：{service}</p>
      <p className="item-meta">将发送的内容：{preview.length > 200 ? `${preview.slice(0, 200)}……` : preview}</p>
      <label className="confirm-check">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        {ORIGINAL_LABEL}
      </label>
      <p className="item-actions">
        <button type="button" className="btn-primary" disabled={!checked} onClick={onConfirm}>
          确认发送
        </button>
        <button type="button" className="btn-text" onClick={onCancel}>
          取消
        </button>
      </p>
    </div>
  )
}

export default function AiTools({ refreshSignal }: { refreshSignal: number }) {
  const [cards, setCards] = useState<SettingCard[]>([])
  const [shells, setShells] = useState<Shell[]>([])
  const [hasKey, setHasKey] = useState(false)
  const [aiService, setAiService] = useState('')

  const [draft, setDraft] = useState('')
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([])
  const [contradictions, setContradictions] = useState<Contradiction[] | null>(null)
  const [checkDone, setCheckDone] = useState(false)
  const [checkError, setCheckError] = useState('')
  const [checkBusy, setCheckBusy] = useState(false)
  const [checkConfirm, setCheckConfirm] = useState(false)

  const [selectedShellIds, setSelectedShellIds] = useState<string[]>([])
  const [questions, setQuestions] = useState<string[]>([])
  const [questionsDone, setQuestionsDone] = useState(false)
  const [questionsError, setQuestionsError] = useState('')
  const [questionsBusy, setQuestionsBusy] = useState(false)
  const [questionsConfirm, setQuestionsConfirm] = useState(false)

  useEffect(() => {
    void (async () => {
      setCards(await listCards())
      setShells(await listShells())
      const s = await getSettings()
      setHasKey(s.aiKey.trim().length > 0)
      setAiService(`${s.aiBaseUrl.trim() || DEFAULT_BASE_URL} · 模型 ${s.aiModel.trim() || DEFAULT_MODEL}`)
    })()
  }, [refreshSignal])

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

  const buildCheckUserText = () => {
    const chosen = cards.filter((c) => selectedCardIds.includes(c.id))
    const cardText = chosen
      .map((c) => {
        const fields = Object.entries(c.fields)
          .map(([k, v]) => `${k}：${v}`)
          .join('；')
        return `- ${c.title}（${c.kind}）${fields ? `：${fields}` : ''}`
      })
      .join('\n')
    return `设定卡：\n${cardText}\n\n草稿：\n${draft.trim()}`
  }

  const runCheck = async () => {
    setCheckConfirm(false)
    setCheckBusy(true)
    setCheckError('')
    try {
      const s = await getSettings()
      const text = await callChat({
        baseUrl: s.aiBaseUrl,
        model: s.aiModel,
        key: s.aiKey,
        system: CONSISTENCY_SYSTEM_PROMPT,
        user: buildCheckUserText(),
      })
      const parsed = parseContradictions(text)
      if (!parsed) {
        setContradictions(null)
        setCheckError('AI 返回的格式看不懂，请重试一次。')
      } else {
        setContradictions(parsed)
      }
      setCheckDone(true)
    } catch (e) {
      setCheckError(e instanceof Error ? e.message : '调用失败，请重试。')
      setCheckDone(true)
    } finally {
      setCheckBusy(false)
    }
  }

  const buildQuestionsUserText = () => {
    const chosen = shells.filter((s) => selectedShellIds.includes(s.id))
    return `笔记：\n${chosen.map((s) => `- ${s.text}`).join('\n')}`
  }

  const runQuestions = async () => {
    setQuestionsConfirm(false)
    setQuestionsBusy(true)
    setQuestionsError('')
    try {
      const s = await getSettings()
      const text = await callChat({
        baseUrl: s.aiBaseUrl,
        model: s.aiModel,
        key: s.aiKey,
        system: QUESTIONS_SYSTEM_PROMPT,
        user: buildQuestionsUserText(),
      })
      setQuestions(parseQuestions(text))
      setQuestionsDone(true)
    } catch (e) {
      setQuestionsError(e instanceof Error ? e.message : '调用失败，请重试。')
      setQuestionsDone(true)
    } finally {
      setQuestionsBusy(false)
    }
  }

  return (
    <>
      <h3>一致性检查</h3>
      <p className="page-desc">粘贴你自己的草稿，选相关的设定卡，AI 只按设定卡指出草稿里的前后矛盾，不改写、不续写。</p>
      {!hasKey && <p className="note">先在上面填好 AI Key，才能用一致性检查。</p>}
      <div className="field-row">
        <label htmlFor="ai-draft">草稿</label>
        <textarea
          id="ai-draft"
          rows={4}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="粘贴你自己的草稿（原创文字）"
        />
      </div>
      <div className="field-row">
        <span className="field-label">对照的设定卡</span>
        {cards.length === 0 ? (
          <p className="note">还没有设定卡，先去设定页建一张。</p>
        ) : (
          <div className="tag-row">
            {cards.map((c) => (
              <button
                key={c.id}
                type="button"
                className={selectedCardIds.includes(c.id) ? 'tag active' : 'tag'}
                onClick={() => setSelectedCardIds((prev) => toggle(prev, c.id))}
                aria-pressed={selectedCardIds.includes(c.id)}
              >
                {c.title}（{c.kind}）
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="field-row">
        <button
          type="button"
          className="btn-primary"
          disabled={!hasKey || !draft.trim() || selectedCardIds.length === 0 || checkBusy}
          onClick={() => setCheckConfirm(true)}
        >
          {checkBusy ? '检查中……' : '检查矛盾'}
        </button>
      </div>
      {checkConfirm && (
        <ConfirmDialog preview={buildCheckUserText()} service={aiService} onConfirm={() => void runCheck()} onCancel={() => setCheckConfirm(false)} />
      )}
      {checkDone && (
        <div className="ai-result">
          <p className="ai-disclaimer">以上仅为提示，请你自行判断。</p>
          {checkError ? (
            <p className="item-meta">{checkError}</p>
          ) : contradictions && contradictions.length === 0 ? (
            <p>没有发现矛盾。</p>
          ) : (
            <ul className="rule-list plain-list">
              {contradictions?.map((c, i) => (
                <li key={i}>
                  <p className="item-text">原句：{c.原句}</p>
                  <p className="item-meta">矛盾：{c.矛盾描述}</p>
                  <p className="item-meta">依据：{c.依据的设定卡名称}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <h3>灵感提问</h3>
      <p className="page-desc">选几条你自己的笔记，AI 只根据这些笔记提 5 个开放式问题，帮你往下想，不直接写正文、不替你做决定。</p>
      {!hasKey && <p className="note">先在上面填好 AI Key，才能用灵感提问。</p>}
      <div className="field-row">
        <span className="field-label">选笔记</span>
        {shells.length === 0 ? (
          <p className="note">还没有灵感，先去贝壳盒记一条。</p>
        ) : (
          <div className="tag-row">
            {shells.map((s) => (
              <button
                key={s.id}
                type="button"
                className={selectedShellIds.includes(s.id) ? 'tag active' : 'tag'}
                onClick={() => setSelectedShellIds((prev) => toggle(prev, s.id))}
                aria-pressed={selectedShellIds.includes(s.id)}
              >
                {s.text.length > 12 ? `${s.text.slice(0, 12)}……` : s.text}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="field-row">
        <button
          type="button"
          className="btn-primary"
          disabled={!hasKey || selectedShellIds.length === 0 || questionsBusy}
          onClick={() => setQuestionsConfirm(true)}
        >
          {questionsBusy ? '提问中……' : '请 AI 提问'}
        </button>
      </div>
      {questionsConfirm && (
        <ConfirmDialog preview={buildQuestionsUserText()} service={aiService} onConfirm={() => void runQuestions()} onCancel={() => setQuestionsConfirm(false)} />
      )}
      {questionsDone && (
        <div className="ai-result">
          {questionsError ? (
            <p className="item-meta">{questionsError}</p>
          ) : questions.length === 0 ? (
            <p>AI 没有返回问题，请重试一次。</p>
          ) : (
            <ol className="rule-list">
              {questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          )}
        </div>
      )}
    </>
  )
}
