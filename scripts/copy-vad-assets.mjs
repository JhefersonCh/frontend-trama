// Copies the Silero VAD model, its AudioWorklet and the ONNX Runtime Web WASM
// files into public/vad/ so voice mode works fully offline (no CDN).
// Runs automatically before `npm run dev` and `npm run build`.
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'vad')
const vad = join(root, 'node_modules', '@ricky0123', 'vad-web', 'dist')
const ort = join(root, 'node_modules', 'onnxruntime-web', 'dist')

const files = [
  [vad, 'silero_vad_v5.onnx'],
  [vad, 'vad.worklet.bundle.min.js'],
  // onnxruntime-web/wasm (used by vad-web) loads exactly this pair.
  [ort, 'ort-wasm-simd-threaded.wasm'],
  [ort, 'ort-wasm-simd-threaded.mjs'],
]

mkdirSync(out, { recursive: true })
let copied = 0
for (const [dir, name] of files) {
  const src = join(dir, name)
  if (!existsSync(src)) {
    console.error(`[vad-assets] missing ${src} — run npm ci first`)
    process.exit(1)
  }
  const dst = join(out, name)
  if (existsSync(dst) && statSync(dst).size === statSync(src).size && statSync(dst).mtimeMs >= statSync(src).mtimeMs) continue
  copyFileSync(src, dst)
  copied++
}
console.log(`[vad-assets] public/vad ready (${copied} updated, ${files.length - copied} unchanged)`)
