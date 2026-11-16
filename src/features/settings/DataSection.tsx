// 数据 · 导出 / 导入 / 清空（阶段 5.5）
// 导出的是全部创作内容（JSON 与 Markdown），绝不含 AI Key。
// 导入只接受自己导出的 JSON，导入是整库替换，导入前先让用户确认；
// 清空会删掉全部数据，包括设置里的 AI Key，操作不可恢复。

import { useRef, useState } from 'react'
import { clearAllData } from '../../lib/db'
import {
  downloadFile,
  exportToJson,
  exportToMarkdown,
  importData,
  parseImport,
  type ExportData,
} from '../../lib/export'

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function DataSection() {
  const [pendingImport, setPendingImport] = useState<ExportData | null>(null)
  const [importError, setImportError] = useState('')
  const [importDone, setImportDone] = useState('')
  const [confirmWipe, setConfirmWipe] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const doExportJson = async () => {
    downloadFile(`shichao-${stamp()}.json`, await exportToJson(), 'application/json')
  }

  const doExportMd = async () => {
    downloadFile(`shichao-${stamp()}.md`, await exportToMarkdown(), 'text/markdown')
  }

  const onPickFile = async (file: File | undefined) => {
    if (!file) return
    setImportError('')
    setImportDone('')
    try {
      const text = await file.text()
      setPendingImport(parseImport(text))
    } catch (e) {
      setImportError(e instanceof Error ? e.message : '导入失败。')
      setPendingImport(null)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const doImport = async () => {
    if (!pendingImport) return
    await importData(pendingImport)
    const counts = `灵感 ${pendingImport.shells.length} 条、设定卡 ${pendingImport.cards.length} 张、伏笔 ${pendingImport.foreshadowing.length} 条、原作 ${pendingImport.moon.length} 条、潮汐 ${pendingImport.journal.length} 天`
    setPendingImport(null)
    setImportDone(`已导入：${counts}。当前数据已被替换。`)
  }

  const doWipe = async () => {
    await clearAllData()
    window.location.reload()
  }

  return (
    <>
      <h3>数据</h3>
      <p className="page-desc">导出、导入与清空都在这里。导出文件里不含 AI Key。</p>
      <div className="field-row">
        <button type="button" className="btn-primary" onClick={() => void doExportJson()}>
          导出数据（JSON）
        </button>
        <button type="button" className="btn-ghost" onClick={() => void doExportMd()}>
          导出数据（Markdown）
        </button>
      </div>
      <div className="field-row">
        <label htmlFor="import-file">导入自己导出的 JSON</label>
        <input
          id="import-file"
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={(e) => void onPickFile(e.target.files?.[0])}
        />
        <p className="note">导入会用文件里的数据替换当前全部内容，导入前会先让你确认。</p>
      </div>
      {importError && <p className="item-meta">{importError}</p>}
      {pendingImport && (
        <div className="confirm-dialog" role="dialog" aria-label="导入前确认">
          <p>
            这个文件里有灵感 {pendingImport.shells.length} 条、设定卡 {pendingImport.cards.length} 张、伏笔{' '}
            {pendingImport.foreshadowing.length} 条、原作 {pendingImport.moon.length} 条、潮汐{' '}
            {pendingImport.journal.length} 天。导入后，当前的数据会被替换，确定导入吗？
          </p>
          <p className="item-actions">
            <button type="button" className="btn-primary" onClick={() => void doImport()}>
              确认导入
            </button>
            <button type="button" className="btn-text" onClick={() => setPendingImport(null)}>
              取消
            </button>
          </p>
        </div>
      )}
      {importDone && <p className="item-meta">{importDone}</p>}

      <h3>危险区</h3>
      <p className="page-desc">清空会删掉全部内容，包括设置里的 AI Key，而且无法恢复。清空前建议先导出一份。</p>
      <div className="field-row">
        {confirmWipe ? (
          <>
            <button type="button" className="btn-primary danger" onClick={() => void doWipe()}>
              确认清空全部数据
            </button>
            <button type="button" className="btn-text" onClick={() => setConfirmWipe(false)}>
              取消
            </button>
          </>
        ) : (
          <button type="button" className="btn-primary danger" onClick={() => setConfirmWipe(true)}>
            清空全部数据
          </button>
        )}
      </div>
    </>
  )
}
