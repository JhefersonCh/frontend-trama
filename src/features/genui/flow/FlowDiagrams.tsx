/**
 * xyflow canvases for `topology` and `diagnosis_flow`. Lazy chunk: imported only when a
 * diagram is on screen. Read-only by default (no pan/zoom, page scroll untouched); "Explorar"
 * turns on pan + zoom + controls.
 */
import {
  Background, Controls, Handle, MarkerType, Position, ReactFlow, useNodesState, useReactFlow,
  type Edge, type Node, type NodeProps, type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type SVGProps } from 'react'
import {
  GlyphAnswer, GlyphBolt, GlyphCloud, GlyphModem, GlyphMove, GlyphPc, GlyphPhone, GlyphQuestion, GlyphRouter, GlyphRule, GlyphTarget,
} from '../icons'
import { layer } from '../layout'
import { FLOW_KIND_LABEL, TOPO_KIND_LABEL } from '../labels'
import { STATUS_LABEL } from '../parts'
import type { DiagnosisFlowProps, FlowKind, NodeStatus, TopoKind, TopologyProps } from '../schema'
import { useDocTheme, useReducedMotion } from '../useDocTheme'
import './flow.css'

type Glyph = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
const NARROW_PX = 560
const FIT = { padding: 0.16, maxZoom: 1.1 }

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/** Re-fit whenever the container resizes or exploration ends. */
function AutoFit({ dep }: { dep: string }) {
  const rf = useReactFlow()
  useEffect(() => {
    const id = requestAnimationFrame(() => void rf.fitView(FIT))
    return () => cancelAnimationFrame(id)
  }, [dep, rf])
  return null
}

function Canvas({ nodes, edges, nodeTypes, height, vertical, onNode, label }: {
  nodes: Node[]; edges: Edge[]; nodeTypes: NodeTypes; height: number; vertical: boolean
  onNode?: (id: string) => void; label: string
}) {
  const theme = useDocTheme()
  const [explore, setExplore] = useState(false)
  // Own node state + onNodesChange: xyflow stores measured sizes through it; without it, rebuilt nodes stay hidden.
  const [ns, setNs, onNodesChange] = useNodesState(nodes)
  useEffect(() => { setNs(nodes) }, [nodes, setNs])
  return (
    <div className="xf-wrap" style={{ height }}>
      <div className="xf-canvas" aria-hidden="true" title={label}>
        <ReactFlow
          key={vertical ? 'tb' : 'lr'}
          nodes={ns}
          onNodesChange={onNodesChange}
          edges={edges}
          nodeTypes={nodeTypes}
          colorMode={theme}
          fitView
          fitViewOptions={FIT}
          minZoom={0.35}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          panOnDrag={explore}
          zoomOnScroll={explore}
          zoomOnPinch={explore}
          zoomOnDoubleClick={false}
          panOnScroll={false}
          preventScrolling={explore}
          onNodeClick={onNode ? (_, n) => onNode(n.id) : undefined}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={18} size={1} />
          <AutoFit dep={`${height}-${vertical}-${explore}-${nodes.length}`} />
          {explore && <Controls showInteractive={false} position="bottom-right" />}
        </ReactFlow>
      </div>
      <button
        type="button" className="xf-explore" aria-pressed={explore}
        title={explore ? 'Fijar el diagrama' : 'Mover y ampliar el diagrama'}
        onClick={() => setExplore((x) => !x)}
      >
        <GlyphMove size={13} />{explore ? 'Fijar' : 'Explorar'}
      </button>
    </div>
  )
}

const handles = (vertical: boolean) => (
  <>
    <Handle type="target" position={vertical ? Position.Top : Position.Left} className="xf-handle" isConnectable={false} />
    <Handle type="source" position={vertical ? Position.Bottom : Position.Right} className="xf-handle" isConnectable={false} />
  </>
)

// ---------------------------------------------------------------- topology
const TOPO_ICON: Record<TopoKind, Glyph> = { isp: GlyphCloud, modem: GlyphModem, router: GlyphRouter, device: GlyphPhone, pc: GlyphPc }
const TOPO_RANK: Record<TopoKind, number> = { isp: 0, modem: 1, router: 2, device: 3, pc: 3 }

type TopoData = { label: string; kind: TopoKind; status: NodeStatus; detail: string | null; vertical: boolean; clickable: boolean }

function TopoNodeView({ data }: NodeProps<Node<TopoData>>) {
  const Icon = TOPO_ICON[data.kind]
  return (
    <div className="xt-node" data-status={data.status} data-kind={data.kind} data-clickable={data.clickable || undefined} title={data.detail ?? undefined}>
      {handles(data.vertical)}
      <span className="xt-icon"><Icon size={20} /></span>
      <span className="xt-text">
        <span className="xt-kind">{TOPO_KIND_LABEL[data.kind]}</span>
        <span className="xt-label">{data.label}</span>
        <span className="xt-status"><span className="gu-led" data-status={data.status} />{STATUS_LABEL[data.status]}</span>
      </span>
    </div>
  )
}
const TOPO_TYPES: NodeTypes = { topo: TopoNodeView }

export function TopologyCanvas({ data, onNode }: { data: TopologyProps; onNode?: (id: string) => void }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const reduce = useReducedMotion()
  const vertical = width > 0 && width < NARROW_PX
  // The parent passes a new onNode every render; keep it in a ref so nodes are NOT rebuilt on each render
  // (rebuilt node objects lose xyflow's measured sizes and the whole diagram goes invisible after a click).
  const onNodeRef = useRef(onNode)
  onNodeRef.current = onNode
  const clickable = !!onNode
  const stableOnNode = useMemo(() => (clickable ? (id: string) => onNodeRef.current?.(id) : undefined), [clickable])
  const { nodes, edges, height } = useMemo(() => {
    const placed = layer(data.nodes, data.edges, (n) => TOPO_RANK[n.kind])
    const byId = new Map(data.nodes.map((n) => [n.id, n]))
    const ranks = Math.max(...placed.map((p) => p.rank)) + 1
    const widest = Math.max(...placed.map((p) => p.slots))
    const nodes: Node<TopoData>[] = placed.map((p) => {
      const n = byId.get(p.id)!
      const off = p.slot - (p.slots - 1) / 2
      return {
        id: n.id, type: 'topo',
        position: vertical ? { x: off * 190, y: p.rank * 120 } : { x: p.rank * 230, y: off * 96 },
        data: { label: n.label, kind: n.kind, status: n.status, detail: n.detail, vertical, clickable },
      }
    })
    const edges: Edge[] = data.edges.map((e, i) => ({
      id: `e${i}-${e.from}-${e.to}`, source: e.from, target: e.to, type: 'smoothstep',
      pathOptions: { borderRadius: 14 },
      className: `xt-edge xt-edge-${e.status}${reduce ? ' is-still' : ''}`,
    }))
    const height = vertical ? Math.min(560, Math.max(260, ranks * 120 + 40)) : Math.min(380, Math.max(200, widest * 96 + 64))
    return { nodes, edges, height }
  }, [data, vertical, reduce, clickable])

  return (
    <div ref={ref} className="xf-host">
      {width > 0 && (
        <Canvas nodes={nodes} edges={edges} nodeTypes={TOPO_TYPES} height={height} vertical={vertical} onNode={stableOnNode} label="Diagrama de la red" />
      )}
    </div>
  )
}

// ---------------------------------------------------------------- diagnosis flow
const FLOW_ICON: Record<FlowKind, Glyph> = { question: GlyphQuestion, answer: GlyphAnswer, rule: GlyphRule, hypothesis: GlyphTarget, action: GlyphBolt }
const FLOW_RANK: Record<FlowKind, number> = { question: 0, answer: 1, rule: 2, hypothesis: 3, action: 4 }

type FlowData = { label: string; kind: FlowKind; detail: string | null; vertical: boolean }

function FlowNodeView({ data }: NodeProps<Node<FlowData>>) {
  const Icon = FLOW_ICON[data.kind]
  return (
    <div className="xd-node" data-kind={data.kind} title={data.detail ?? undefined}>
      {handles(data.vertical)}
      <span className="xd-head"><Icon size={13} />{FLOW_KIND_LABEL[data.kind]}</span>
      <span className="xd-label">{data.label}</span>
      {data.detail && <span className="xd-detail">{data.detail}</span>}
    </div>
  )
}
const FLOW_TYPES: NodeTypes = { flow: FlowNodeView }

export function DiagnosisCanvas({ data }: { data: DiagnosisFlowProps }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const vertical = width > 0 && width < NARROW_PX
  const { nodes, edges, height } = useMemo(() => {
    const placed = layer(data.nodes, data.edges, (n) => FLOW_RANK[n.kind])
    const byId = new Map(data.nodes.map((n) => [n.id, n]))
    const ranks = Math.max(...placed.map((p) => p.rank)) + 1
    const widest = Math.max(...placed.map((p) => p.slots))
    const nodes: Node<FlowData>[] = placed.map((p) => {
      const n = byId.get(p.id)!
      const off = p.slot - (p.slots - 1) / 2
      return {
        id: n.id, type: 'flow',
        position: vertical ? { x: off * 200, y: p.rank * 128 } : { x: p.rank * 230, y: off * 104 },
        data: { label: n.label, kind: n.kind, detail: n.detail, vertical },
      }
    })
    const edges: Edge[] = data.edges.map((e, i) => ({
      id: `f${i}-${e.from}-${e.to}`, source: e.from, target: e.to, type: 'smoothstep',
      pathOptions: { borderRadius: 12 },
      className: 'xd-edge',
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: 'var(--muted)' },
      ...(e.label ? {
        label: e.label,
        labelStyle: { fill: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontSize: 10 },
        labelBgStyle: { fill: 'var(--surface)' },
        labelBgPadding: [5, 2] as [number, number],
        labelBgBorderRadius: 3,
      } : {}),
    }))
    const height = vertical ? Math.min(640, Math.max(280, ranks * 128 + 40)) : Math.min(420, Math.max(210, widest * 104 + 70))
    return { nodes, edges, height }
  }, [data, vertical])

  return (
    <div ref={ref} className="xf-host">
      {width > 0 && <Canvas nodes={nodes} edges={edges} nodeTypes={FLOW_TYPES} height={height} vertical={vertical} label="Camino del diagnóstico" />}
    </div>
  )
}
