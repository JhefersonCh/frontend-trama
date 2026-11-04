# TRAMA — Frontend

Web UI for TRAMA (network-diagnosis voice agent): chat, voice mode, diagnosis, tickets and model configuration. React + Vite + TypeScript, served by nginx. The API lives in the separate `trama-backend` repo.

## Run with Docker

Requires the `trama-backend` stack running first: it creates the `trama-net` network and exposes the backend as `backend:8000` inside it.

```bash
docker compose up -d --build
```

Open http://localhost:8080. nginx proxies `/api`, `/health` and `/ws` to the backend.

## Local development

```bash
npm ci
npm run dev          # http://localhost:5173, proxies /api, /health, /ws to http://localhost:8000
npm run test -- --run
npm run build
```

## Voice mode assets (offline, no CDN)

Voice mode runs Silero VAD in the browser (`@ricky0123/vad-web` on ONNX Runtime Web). Its runtime files are served from `/vad/`:

- `scripts/copy-vad-assets.mjs` copies `silero_vad_v5.onnx`, `vad.worklet.bundle.min.js` and `ort-wasm-simd-threaded.{wasm,mjs}` from `node_modules` into `public/vad/`.
- It runs automatically before `npm run dev` and `npm run build` (also in the Docker build). Manual: `npm run assets:vad`.
- `public/vad/` is generated and gitignored.

The microphone requires a secure context: use `http://localhost` or https.

### Optional wake word (Vosk)

When the `wake_word` setting is enabled, the Conversación view shows an "Escucha pasiva" toggle that listens only for the configured phrase (Vosk, grammar restricted to the phrase + `[unk]`) and starts voice mode when it hears it. The Spanish model (~40 MB) is **not** committed:

```bash
npm run fetch:vosk     # needs unzip + tar; writes public/vosk/vosk-model-small-es-0.42.tar.gz
```

Run it before `docker compose up --build` to bake the model into the image. Without it the UI shows "Modelo de activación no instalado" and everything else keeps working.
