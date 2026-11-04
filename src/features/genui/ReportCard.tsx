import { ReportButtons } from './ReportActions'
import { GuFrame } from './parts'
import type { ReportCardProps } from './schema'
import type { GenUiComponentProps } from './types'

/** Downloadable artifact: a tiny "page" thumbnail, title, open (HTML) and PDF when available. */
export function ReportCard({ props, env }: GenUiComponentProps<ReportCardProps>) {
  const isGuide = props.kind === 'guia'
  return (
    <GuFrame component="report_card" eyebrow={isGuide ? 'Guía' : 'Informe'} label={props.title}>
      <div className="rc">
        <div className="rc-page" data-kind={props.kind} aria-hidden="true">
          <span className="rc-page-mark" />
          <span /><span /><span /><span />
          <span className="rc-page-fig" />
        </div>
        <div className="rc-main">
          <h4 className="gu-title">{props.title}</h4>
          <p className="rc-sub">{isGuide ? 'Los pasos para imprimir o guardar en el celular.' : 'Cronología, hipótesis, red y pasos probados, listo para imprimir.'}</p>
          <ReportButtons
            kind={props.kind} htmlUrl={props.html_url} pdfUrl={props.pdf_url}
            filename={`trama-${props.kind}.pdf`}
            onOpen={() => env.emit('report_open', { kind: props.kind }, { metric: true })}
          />
        </div>
      </div>
    </GuFrame>
  )
}
