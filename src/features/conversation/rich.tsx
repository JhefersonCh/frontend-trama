import { Fragment, useState, type ReactNode } from 'react'

const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g

function inline(text: string, key: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={`${key}-${i}`}>{part.slice(1, -1)}</code>
    return part
  })
}

/**
 * Minimal, safe rendering of the LLM's markdown habits (bold, inline code,
 * bullets, ### headings) as React nodes — no HTML injection. Unclosed markers
 * while streaming simply show as text until they close.
 */
/** Fenced code block in a chat answer: verbatim (indentation matters for YAML/commands) + copy button. */
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(code).then(
      () => { setCopied(true); window.setTimeout(() => setCopied(false), 1500) },
      () => undefined,
    )
  }
  return (
    <span className="rt-code" role="group" aria-label={lang ? `Código ${lang}` : 'Código'}>
      <span className="rt-code-bar">
        <span className="rt-code-lang">{lang || 'código'}</span>
        <button type="button" className="rt-code-copy" onClick={copy}>{copied ? 'Copiado' : 'Copiar'}</button>
      </span>
      <pre><code>{code}</code></pre>
    </span>
  )
}

export function RichText({ text }: { text: string }) {
  const lines = text.split('\n')
  // Group fenced code blocks first; everything else keeps the line-based rendering.
  const nodes: ReactNode[] = []
  for (let i = 0; i < lines.length; i++) {
    const fence = /^\s*```\s*([\w+-]*)\s*$/.exec(lines[i])
    if (fence) {
      const start = i + 1
      let j = start
      while (j < lines.length && !/^\s*```\s*$/.test(lines[j])) j++
      nodes.push(<CodeBlock key={`c${i}`} code={lines.slice(start, j).join('\n')} lang={fence[1]} />)
      i = j // skip the closing fence (or the end of text while streaming)
      continue
    }
    nodes.push(renderLine(lines[i], i, i < lines.length - 1))
  }
  return <>{nodes}</>
}

function renderLine(line: string, i: number, hasNext: boolean): ReactNode {
  return <LineView key={i} line={line} i={i} hasNext={hasNext} />
}

function LineView({ line, i, hasNext }: { line: string; i: number; hasNext: boolean }) {
  const lines = [line]
  return (
    <>
      {lines.map((line) => {
        const nl = hasNext ? '\n' : null
        const bullet = /^(\s*)[-*•]\s+(.*)$/.exec(line)
        if (bullet) return <Fragment key={i}>{bullet[1]}<span className="rt-dot" aria-hidden="true">▪</span>{inline(bullet[2], String(i))}{nl}</Fragment>
        const heading = /^#{1,4}\s+(.*)$/.exec(line)
        if (heading) return <Fragment key={i}><strong className="rt-h">{inline(heading[1], String(i))}</strong>{nl}</Fragment>
        return <Fragment key={i}>{inline(line, String(i))}{nl}</Fragment>
      })}
    </>
  )
}

// ---------------------------------------------------------------- document blocks (knowledge reader)
export type DocBlock =
  | { kind: 'heading'; level: number; text: string; start: number; end: number }
  | { kind: 'code' | 'pre' | 'para'; text: string; start: number; end: number }
  | { kind: 'list'; ordered: boolean; items: string[]; start: number; end: number }

const BULLET = /^\s*[-*•]\s+(.*)$/
const ORDERED = /^\s*\d+[.)]\s+(.*)$/

/**
 * Splits document text into blocks (headings, fenced code, lists, paragraphs), each with its char range inside
 * `text`. `plain` (RFC / plain text) keeps every blank-line separated block verbatim as preformatted text.
 */
export function parseBlocks(text: string, plain = false): DocBlock[] {
  const lines = text.split('\n')
  const offs: number[] = []
  let pos = 0
  for (const l of lines) { offs.push(pos); pos += l.length + 1 }
  const blocks: DocBlock[] = []
  let i = 0
  const endOf = (k: number) => offs[k] + lines[k].length
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    const from = i
    if (plain) {
      while (i < lines.length && lines[i].trim()) i++
      blocks.push({ kind: 'pre', text: lines.slice(from, i).join('\n'), start: offs[from], end: endOf(i - 1) })
      continue
    }
    if (/^```/.test(line)) {
      i++
      while (i < lines.length && !/^```/.test(lines[i])) i++
      const last = Math.min(i, lines.length - 1)
      blocks.push({ kind: 'code', text: lines.slice(from + 1, i).join('\n'), start: offs[from], end: endOf(last) })
      i++
      continue
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    if (h) { blocks.push({ kind: 'heading', level: h[1].length, text: h[2].trim(), start: offs[i], end: endOf(i) }); i++; continue }
    const ordered = ORDERED.test(line)
    if (ordered || BULLET.test(line)) {
      const re = ordered ? ORDERED : BULLET
      const items: string[] = []
      while (i < lines.length && re.test(lines[i])) { items.push(re.exec(lines[i])![1]); i++ }
      blocks.push({ kind: 'list', ordered, items, start: offs[from], end: endOf(i - 1) })
      continue
    }
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```)/.test(lines[i]) && !BULLET.test(lines[i]) && !ORDERED.test(lines[i])) i++
    blocks.push({ kind: 'para', text: lines.slice(from, i).join(' '), start: offs[from], end: endOf(i - 1) })
  }
  return blocks
}

export const blockId = (b: DocBlock) => `blk-${b.start}`
const overlaps = (b: DocBlock, r?: [number, number] | null) => !!r && b.start < r[1] && b.end > r[0]

/** Renders parsed document blocks; blocks overlapping `mark` get `data-mark` (the cited chunk). */
export function DocBlocks({ blocks, mark }: { blocks: DocBlock[]; mark?: [number, number] | null }) {
  return (
    <>
      {blocks.map((b) => {
        const common = { id: blockId(b), 'data-mark': overlaps(b, mark) || undefined }
        switch (b.kind) {
          case 'heading': {
            const Tag = `h${Math.min(b.level + 1, 6)}` as 'h2'
            return <Tag key={b.start} {...common} className="doc-h">{inline(b.text, `h${b.start}`)}</Tag>
          }
          case 'code': return <pre key={b.start} {...common} className="doc-code"><code>{b.text}</code></pre>
          case 'pre': return <pre key={b.start} {...common} className="doc-pre">{b.text}</pre>
          case 'list': {
            const L = b.ordered ? 'ol' : 'ul'
            return <L key={b.start} {...common} className="doc-list">{b.items.map((it, k) => <li key={k}>{inline(it, `${b.start}-${k}`)}</li>)}</L>
          }
          default: return <p key={b.start} {...common} className="doc-p">{inline(b.text, `p${b.start}`)}</p>
        }
      })}
    </>
  )
}
