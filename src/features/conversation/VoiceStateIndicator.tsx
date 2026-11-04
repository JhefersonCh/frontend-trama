import type { Ref } from 'react'

export type VoiceState = 'idle' | 'listening' | 'transcribing' | 'retrieving' | 'thinking' | 'speaking' | 'loading_model'

export const VOICE_LABELS: Record<VoiceState, string> = {
  idle: 'En reposo',
  listening: 'Escuchando',
  transcribing: 'Transcribiendo',
  retrieving: 'Buscando',
  thinking: 'Pensando',
  speaking: 'Hablando',
  loading_model: 'Cargando modelo',
}

/** Short instrument codes shown inside the orb (decorative; the label carries the meaning). */
const CODES: Record<VoiceState, string> = {
  idle: 'STBY',
  listening: 'RX · VAD',
  transcribing: 'STT',
  retrieving: 'RAG',
  thinking: 'LLM',
  speaking: 'TX · TTS',
  loading_model: 'LOAD',
}

const C = 120
const TICKS = Array.from({ length: 72 }, (_, i) => i)
const BARS = Array.from({ length: 48 }, (_, i) => i)
const SEGMENTS = Array.from({ length: 12 }, (_, i) => i)

/** Oscilloscope-style orb: every state is a separate layer that crossfades in. */
export function VoiceOrb({ levelRef }: { levelRef?: Ref<SVGCircleElement> }) {
  return (
    <svg className="orb" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
      <g className="orb-grat">
        <circle cx={C} cy={C} r={112} />
        {TICKS.map((i) => {
          const major = i % 6 === 0
          const a = (i / TICKS.length) * Math.PI * 2
          const r1 = 112, r2 = major ? 103 : 107
          return (
            <line
              key={i}
              className={major ? 'major' : undefined}
              x1={C + r1 * Math.sin(a)} y1={C - r1 * Math.cos(a)}
              x2={C + r2 * Math.sin(a)} y2={C - r2 * Math.cos(a)}
            />
          )
        })}
        <path className="orb-cross" d={`M${C} 28V212M28 ${C}H212`} />
      </g>

      <g className="orb-layer orb-bars">
        {BARS.map((i) => (
          <g key={i} transform={`rotate(${(i / BARS.length) * 360} ${C} ${C})`}>
            <rect className="orb-bar" x={C - 1.2} y={24} width={2.4} height={20} rx={1.2} style={{ animationDelay: `${-((i * 7) % 11) * 0.09}s`, animationDuration: `${0.7 + (i % 4) * 0.12}s` }} />
          </g>
        ))}
      </g>

      <circle className="orb-layer orb-halo" cx={C} cy={C} r={72} />
      {/* live mic level: driven imperatively (transform/opacity only) */}
      <circle ref={levelRef} className="orb-level" cx={C} cy={C} r={72} />
      <circle className="orb-core" cx={C} cy={C} r={44} />
      <circle className="orb-ring" cx={C} cy={C} r={72} />

      <g className="orb-layer orb-scan">
        <circle cx={C} cy={C} r={86} pathLength={100} strokeDasharray="22 78" />
        <circle className="orb-scan-trail" cx={C} cy={C} r={86} pathLength={100} strokeDasharray="6 94" strokeDashoffset={-24} />
      </g>

      <g className="orb-layer orb-think">
        <circle className="orb-think-dots" cx={C} cy={C} r={58} />
        <circle className="orb-think-arc" cx={C} cy={C} r={58} pathLength={100} strokeDasharray="28 72" />
      </g>

      <g className="orb-layer orb-load" transform={`rotate(-90 ${C} ${C})`}>
        {SEGMENTS.map((i) => (
          <circle
            key={i}
            className="orb-seg"
            cx={C} cy={C} r={72}
            pathLength={120}
            strokeDasharray="8 112"
            strokeDashoffset={-i * 10 - 1}
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </g>
    </svg>
  )
}

export function VoiceStateIndicator({ state, detail, levelRef }: {
  state: VoiceState
  /** Optional server detail (e.g. which model is loading). */
  detail?: string
  levelRef?: Ref<SVGCircleElement>
}) {
  return (
    <div className={`voice voice-${state}`} data-state={state}>
      <div className="orb-frame">
        <VoiceOrb levelRef={levelRef} />
        <span className="orb-code" aria-hidden="true">{CODES[state]}</span>
      </div>
      <div className="voice-readout" role="status" aria-live="polite">
        <span className="voice-led" aria-hidden="true" />
        <span className="voice-label">{VOICE_LABELS[state]}</span>
      </div>
      <p className="voice-detail mono" aria-hidden={!detail}>{detail ?? '\u00a0'}</p>
    </div>
  )
}

const GLYPH_BARS = [0, 1, 2, 3, 4]

/**
 * Compact inline variant of the orb (≈36px) for the composer's voice bar.
 * Same state vocabulary; `levelRef` receives the live mic level (transform/opacity only).
 */
export function VoiceGlyph({ state, levelRef, size = 36 }: { state: VoiceState; levelRef?: Ref<SVGCircleElement>; size?: number }) {
  return (
    <span className={`vg vg-${state}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 40 40" focusable="false">
        <circle className="vg-track" cx={20} cy={20} r={17} />
        <circle ref={levelRef} className="vg-level" cx={20} cy={20} r={13} />
        <circle className="vg-halo" cx={20} cy={20} r={17} />
        <circle className="vg-arc" cx={20} cy={20} r={17} pathLength={100} strokeDasharray="26 74" />
        <circle className="vg-dots" cx={20} cy={20} r={17} pathLength={100} strokeDasharray="1.5 6.83" />
        <circle className="vg-core" cx={20} cy={20} r={4} />
        <g className="vg-bars">
          {GLYPH_BARS.map((i) => (
            <rect key={i} x={11.2 + i * 3.8} y={13} width={2} height={14} rx={1} style={{ animationDelay: `${-((i * 3) % 5) * 0.11}s` }} />
          ))}
        </g>
      </svg>
    </span>
  )
}
