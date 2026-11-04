// Downloads the small Spanish Vosk model used by the optional wake word and
// repackages it as public/vosk/vosk-model-small-es-0.42.tar.gz with the files
// under a top-level `model/` folder (the layout vosk-browser expects).
// Requires `unzip` and `tar` on PATH. Usage: npm run fetch:vosk
import { execFileSync } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const NAME = 'vosk-model-small-es-0.42'
const URL_ = process.env.VOSK_MODEL_URL ?? `https://alphacephei.com/vosk/models/${NAME}.zip`
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'vosk')
const target = join(outDir, `${NAME}.tar.gz`)

if (existsSync(target) && !process.argv.includes('--force')) {
  console.log(`[vosk] already installed: ${target} (use --force to re-download)`)
  process.exit(0)
}

const work = mkdtempSync(join(tmpdir(), 'trama-vosk-'))
try {
  const zip = join(work, `${NAME}.zip`)
  console.log(`[vosk] downloading ${URL_} (~40 MB)…`)
  const res = await fetch(URL_)
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(zip))

  console.log('[vosk] extracting…')
  execFileSync('unzip', ['-q', zip, '-d', work], { stdio: 'inherit' })
  const extracted = join(work, NAME)
  if (!existsSync(extracted)) throw new Error(`unexpected archive layout: ${NAME}/ not found`)
  renameSync(extracted, join(work, 'model'))

  mkdirSync(outDir, { recursive: true })
  const tmpTar = join(work, 'model.tar.gz')
  execFileSync('tar', ['-czf', tmpTar, '-C', work, 'model'], { stdio: 'inherit' })
  renameSync(tmpTar, target)
  console.log(`[vosk] installed ${target}`)
} catch (err) {
  console.error(`[vosk] failed: ${err instanceof Error ? err.message : err}`)
  process.exitCode = 1
} finally {
  rmSync(work, { recursive: true, force: true })
}
