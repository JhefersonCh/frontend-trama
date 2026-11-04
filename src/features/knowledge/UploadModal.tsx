import { useRef, useState, type DragEvent, type FormEvent } from 'react'
import { errorMessage } from '../../shared/api/client'
import { Banner, Button, Field, Input, Modal, Select } from '../../shared/ui'
import { useKnowledgeMutations } from './useKnowledge'

const EXT = ['.md', '.txt', '.html', '.jsonl']
const DOC_TYPES = ['manual', 'guia', 'procedimiento', 'rfc', 'faq', 'politica', 'otro'].map((v) => ({ value: v, label: v }))
const LANGS = [{ value: 'es', label: 'Español' }, { value: 'en', label: 'Inglés' }]
const validExt = (f: File) => EXT.some((e) => f.name.toLowerCase().endsWith(e))

export function UploadModal({ onClose }: { onClose: () => void }) {
  const { upload } = useKnowledgeMutations()
  const [file, setFile] = useState<File | null>(null)
  const [fileErr, setFileErr] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const [title, setTitle] = useState('')
  const [publisher, setPublisher] = useState('')
  const [sourceUri, setSourceUri] = useState('')
  const [docType, setDocType] = useState('manual')
  const [license, setLicense] = useState('')
  const [language, setLanguage] = useState('es')
  const [synthetic, setSynthetic] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const pick = (f: File | undefined) => {
    if (!f) return
    if (!validExt(f)) { setFile(null); setFileErr(`Formato no soportado. Use ${EXT.join(', ')}`); return }
    setFileErr(null); setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]) }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!file) return
    upload.mutate({ file, meta: { title: title.trim(), publisher: publisher.trim() || undefined, source_uri: sourceUri.trim() || undefined, document_type: docType, license: license.trim() || undefined, language, is_synthetic: synthetic } })
  }
  const result = upload.data

  return (
    <Modal title="Subir documento" onClose={onClose}>
      {result ? (
        <>
          <Banner tone="success">Se indexaron <strong>{result.chunks}</strong> fragmentos ({result.embedded} con embeddings) de «{result.document.title}».</Banner>
          {result.warning && <Banner tone="warning">{result.warning}</Banner>}
          <div className="actions"><Button variant="primary" onClick={onClose}>Listo</Button></div>
        </>
      ) : (
        <form className="form" onSubmit={submit}>
          <div
            className={`dropzone${over ? ' is-over' : ''}${file ? ' has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setOver(true) }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
          >
            <input ref={inputRef} id="up-file" className="sr-only" type="file" accept={EXT.join(',')} onChange={(e) => pick(e.target.files?.[0])} aria-label="Archivo" />
            {file ? (
              <p><code>{file.name}</code> <span className="hint">· {(file.size / 1024).toFixed(1)} KB</span></p>
            ) : (
              <p>Arrastre un archivo aquí</p>
            )}
            <Button size="sm" onClick={() => inputRef.current?.click()}>{file ? 'Cambiar archivo' : 'Elegir archivo'}</Button>
            <small className="hint">{EXT.join('  ')}</small>
          </div>
          {fileErr && <p className="field-error" role="alert">{fileErr}</p>}

          <Field label="Título" htmlFor="up-title"><Input id="up-title" required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <div className="form-row">
            <Field label="Tipo" htmlFor="up-type"><Select id="up-type" options={DOC_TYPES} value={docType} onChange={(e) => setDocType(e.target.value)} /></Field>
            <Field label="Idioma" htmlFor="up-lang"><Select id="up-lang" options={LANGS} value={language} onChange={(e) => setLanguage(e.target.value)} /></Field>
          </div>
          <div className="form-row">
            <Field label="Publicador" htmlFor="up-pub"><Input id="up-pub" value={publisher} onChange={(e) => setPublisher(e.target.value)} /></Field>
            <Field label="Licencia" htmlFor="up-lic"><Input id="up-lic" value={license} onChange={(e) => setLicense(e.target.value)} placeholder="CC-BY-4.0" /></Field>
          </div>
          <Field label="URL de origen" htmlFor="up-uri"><Input id="up-uri" type="url" value={sourceUri} onChange={(e) => setSourceUri(e.target.value)} placeholder="https://…" /></Field>
          <label className="check"><input type="checkbox" checked={synthetic} onChange={(e) => setSynthetic(e.target.checked)} />Contenido sintético (generado, no oficial)</label>

          {upload.error && <Banner tone="error">{errorMessage(upload.error)}</Banner>}
          <div className="actions">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={!file || !title.trim() || upload.isPending}>{upload.isPending ? 'Subiendo…' : 'Subir e indexar'}</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
