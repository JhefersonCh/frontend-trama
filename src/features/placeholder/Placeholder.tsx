import type { ComponentType } from 'react'
import { IconBars, IconLayers, IconPulse, IconTicket, PageHeader } from '../../shared/ui'

type Spec = { index: string; kicker: string; icon: ComponentType<{ size?: number }>; desc: string; planned: string[] }

const SPECS: Record<string, Spec> = {
  Diagnóstico: {
    index: '02', kicker: 'Razonamiento', icon: IconPulse,
    desc: 'El recorrido del agente paso a paso: hipótesis, pruebas ejecutadas y la conclusión por capa de red.',
    planned: ['Línea de tiempo de pruebas (ping, DHCP, DNS)', 'Hipótesis con su evidencia', 'Veredicto por capa: enlace · IP · nombres'],
  },
  Tickets: {
    index: '03', kicker: 'Escalamiento', icon: IconTicket,
    desc: 'Casos que el agente no pudo resolver, listos para que soporte los tome con todo el contexto técnico.',
    planned: ['Ticket generado desde la conversación', 'Estado y responsable', 'Resumen técnico adjunto'],
  },
  Conocimiento: {
    index: '05', kicker: 'Base RAG', icon: IconLayers,
    desc: 'Procedimientos y documentos que el agente consulta para responder con fuentes locales.',
    planned: ['Carga de documentos', 'Estado del índice de embeddings', 'Fragmentos y fuentes citadas'],
  },
  Métricas: {
    index: '06', kicker: 'Telemetría', icon: IconBars,
    desc: 'Latencias del pipeline de voz y consumo de memoria de cada modelo en esta máquina.',
    planned: ['Latencia STT · LLM · TTS (ms)', 'Memoria por modelo (MB)', 'Diagnósticos resueltos vs. escalados'],
  },
}

const FALLBACK: Spec = { index: '—', kicker: 'Módulo', icon: IconPulse, desc: 'Este módulo todavía no está disponible.', planned: [] }

/** Intentional "no signal" module bay for views not built yet. */
export function Placeholder({ title }: { title: string }) {
  const s = SPECS[title] ?? FALLBACK
  const Icon = s.icon
  return (
    <div className="view reveal">
      <PageHeader index={s.index} kicker={s.kicker} title={title}>{s.desc}</PageHeader>
      <section className="bay ticked" aria-label={`${title}: módulo en construcción`}>
        <svg className="bay-trace" viewBox="0 0 600 80" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 40H180l6-3 5 6 5-4 4 2H420l5-2 4 3 6-5 5 4H600" />
        </svg>
        <div className="bay-icon"><Icon size={28} /></div>
        <p className="bay-tag"><span className="led led-off" aria-hidden="true" />Sin señal · módulo en construcción</p>
        <h2 className="bay-title">Este panel se enciende en la próxima iteración</h2>
        {s.planned.length > 0 && (
          <ul className="bay-list" aria-label="Previsto">
            {s.planned.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
      </section>
    </div>
  )
}
