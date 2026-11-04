import { Navigate, type RouteObject } from 'react-router-dom'
import { ConfigView } from '../features/config/ConfigView'
import { ConversationView } from '../features/conversation/ConversationView'
import { DocumentReader } from '../features/knowledge/DocumentReader'
import { KnowledgeView } from '../features/knowledge/KnowledgeView'
import { DiagnosticsView } from '../features/diagnostics/DiagnosticsView'
import { MetricsView } from '../features/metrics/MetricsView'
import { TicketsView } from '../features/tickets/TicketsView'
import { TechniciansView } from '../features/technicians/TechniciansView'
import { Layout } from './Layout'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/conversacion" replace /> },
      { path: 'conversacion/:sessionId?', element: <ConversationView /> },
      { path: 'diagnostico/:sessionId?', element: <DiagnosticsView /> },
      { path: 'tickets', element: <TicketsView /> },
      { path: 'tecnicos', element: <TechniciansView /> },
      { path: 'configuracion', element: <ConfigView /> },
      { path: 'conocimiento', element: <KnowledgeView /> },
      { path: 'conocimiento/:docId', element: <DocumentReader /> },
      { path: 'metricas', element: <MetricsView /> },
      { path: '*', element: <Navigate to="/conversacion" replace /> },
    ],
  },
]
