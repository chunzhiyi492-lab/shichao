// AI 调用层（阶段 5.4）
// 只用原生 fetch 调 OpenAI 兼容的 chat completions 接口，不引 AI SDK。
// Key、服务地址、模型由用户在设置页填，只存本机浏览器 IndexedDB，绝不写进代码。

export interface ChatOptions {
  baseUrl: string
  model: string
  key: string
  system: string
  user: string
}

export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
export const DEFAULT_MODEL = 'gpt-4o-mini'

export async function callChat(opts: ChatOptions): Promise<string> {
  const baseUrl = (opts.baseUrl.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '')
  const model = opts.model.trim() || DEFAULT_MODEL
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  let res: Response
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
        temperature: 0.7,
      }),
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('AI 服务 30 秒没有回应，请稍后再试。')
    }
    throw new Error('连接 AI 服务失败，请检查网络或设置里的服务地址。')
  } finally {
    clearTimeout(timer)
  }
  if (res.status === 401) {
    throw new Error('Key 不正确或已失效，请检查设置里的 AI Key。')
  }
  if (!res.ok) {
    throw new Error(`AI 服务返回错误（状态码 ${res.status}），请稍后再试。`)
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content?.trim() ?? ''
  if (!content) {
    throw new Error('AI 没有返回内容，请重试。')
  }
  return content
}

// 从 AI 的回复里抠出 JSON 数组（容忍 ```json 围栏与前后多余文字）
export function extractJsonArray(text: string): unknown[] | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('[')
  const end = body.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    const parsed: unknown = JSON.parse(body.slice(start, end + 1))
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export interface Contradiction {
  原句: string
  矛盾描述: string
  依据的设定卡名称: string
}

// 校验一致性检查的结果格式；格式不对时返回 null，由调用方提示用户
export function parseContradictions(text: string): Contradiction[] | null {
  const arr = extractJsonArray(text)
  if (!arr) return null
  const out: Contradiction[] = []
  for (const item of arr) {
    if (typeof item !== 'object' || item === null) return null
    const o = item as Record<string, unknown>
    if (typeof o['原句'] !== 'string' || typeof o['矛盾描述'] !== 'string' || typeof o['依据的设定卡名称'] !== 'string') {
      return null
    }
    out.push({ 原句: o['原句'], 矛盾描述: o['矛盾描述'], 依据的设定卡名称: o['依据的设定卡名称'] })
  }
  return out
}

// 把 AI 返回的问题拆成一行一条（取带序号的行，最多 5 条）
export function parseQuestions(text: string): string[] {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/^\s*\d+[.、)]\s*/, '').trim())
    .filter((l) => l.length > 0)
  return lines.slice(0, 5)
}
