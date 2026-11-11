import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  Cpu,
  Database,
  Globe,
  Layers,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Zap
} from 'lucide-react';
import { ArchitectureEdge, ArchitectureNode, ArchitectureTier, CaseStudyItem } from '../../data/caseStudies';

export type VisualizerFlowMode = 'all' | 'read' | 'write' | 'outage';

interface ArchitectureVisualizerProps {
  caseStudy: CaseStudyItem;
}

const TIER_ORDER: ArchitectureTier[] = ['client', 'edge', 'compute', 'messaging', 'storage'];

const TIER_META: Record<
  ArchitectureTier,
  { label: string; badgeClass: string; stroke: string; glow: string; icon: React.FC<{ className?: string }> }
> = {
  client: {
    label: 'Client Tier',
    badgeClass: 'text-sky-300 bg-sky-500/15 border-sky-500/30',
    stroke: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.25)',
    icon: Smartphone
  },
  edge: {
    label: 'Edge / Gateway',
    badgeClass: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30',
    stroke: '#818cf8',
    glow: 'rgba(129, 140, 248, 0.25)',
    icon: Globe
  },
  compute: {
    label: 'Compute & Routing',
    badgeClass: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
    stroke: '#34d399',
    glow: 'rgba(52, 211, 153, 0.25)',
    icon: Cpu
  },
  messaging: {
    label: 'Async Bus & Repair',
    badgeClass: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
    stroke: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.25)',
    icon: Radio
  },
  storage: {
    label: 'Cache & Storage',
    badgeClass: 'text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-500/30',
    stroke: '#e879f9',
    glow: 'rgba(232, 121, 249, 0.25)',
    icon: Database
  }
};

export const ArchitectureVisualizer: React.FC<ArchitectureVisualizerProps> = ({ caseStudy }) => {
  const [flowMode, setFlowMode] = useState<VisualizerFlowMode>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string>(caseStudy.nodes[0]?.id ?? '');

  // Reset selected node and topology flow mode cleanly when switching case studies
  useEffect(() => {
    setSelectedNodeId(caseStudy.nodes[0]?.id ?? '');
    setFlowMode('all');
  }, [caseStudy.id, caseStudy.nodes]);

  // Ensure selectedNodeId stays valid even on the immediate render frame when switching case studies
  const activeNode = useMemo(() => {
    return (
      caseStudy.nodes.find((n) => n.id === selectedNodeId) ??
      caseStudy.nodes[0]
    );
  }, [caseStudy.nodes, selectedNodeId]);

  // Compute deterministic 2D coordinates on a 980x440 SVG canvas
  const layout = useMemo(() => {
    const width = 980;
    const height = 430;
    const nodeWidth = 158;
    const nodeHeight = 76;

    const activeTiers = TIER_ORDER.filter((tier) =>
      caseStudy.nodes.some((n) => n.tier === tier)
    );

    const positions: Record<string, { x: number; y: number; cx: number; cy: number; node: ArchitectureNode }> = {};

    activeTiers.forEach((tier, colIdx) => {
      const colNodes = caseStudy.nodes.filter((n) => n.tier === tier);
      const colX =
        activeTiers.length === 1
          ? width / 2 - nodeWidth / 2
          : 36 + (colIdx * (width - nodeWidth - 72)) / (activeTiers.length - 1);

      colNodes.forEach((node, rowIdx) => {
        const totalInCol = colNodes.length;
        const spacingY = (height - 60) / (totalInCol + 1);
        const cy = 40 + spacingY * (rowIdx + 1);
        const y = cy - nodeHeight / 2;

        positions[node.id] = {
          x: colX,
          y,
          cx: colX + nodeWidth / 2,
          cy,
          node
        };
      });
    });

    return { width, height, nodeWidth, nodeHeight, activeTiers, positions };
  }, [caseStudy]);

  const isEdgeHighlighted = (edge: ArchitectureEdge): boolean => {
    if (flowMode === 'all') return true;
    if (flowMode === 'read') return edge.pathType === 'read' || edge.pathType === 'both';
    if (flowMode === 'write') return edge.pathType === 'write' || edge.pathType === 'both' || edge.pathType === 'async';
    if (flowMode === 'outage') {
      return edge.from === activeNode?.id || edge.to === activeNode?.id;
    }
    return true;
  };

  const getEdgeColor = (edge: ArchitectureEdge): string => {
    if (flowMode === 'outage' && (edge.from === activeNode?.id || edge.to === activeNode?.id)) {
      return '#f43f5e';
    }
    if (edge.pathType === 'read') return '#38bdf8';
    if (edge.pathType === 'write') return '#34d399';
    if (edge.pathType === 'async') return '#fbbf24';
    return '#a78bfa';
  };

  const connectedEdges = useMemo(() => {
    if (!activeNode) return [];
    return caseStudy.edges.filter((e) => e.from === activeNode.id || e.to === activeNode.id);
  }, [caseStudy.edges, activeNode]);

  return (
    <div className="space-y-4">
      {/* Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Topology Mode:
          </span>
          <button
            type="button"
            onClick={() => setFlowMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
              flowMode === 'all'
                ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/50 shadow-sm'
                : 'bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            All Flows
          </button>
          <button
            type="button"
            onClick={() => setFlowMode('read')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
              flowMode === 'read'
                ? 'bg-sky-500/20 text-sky-200 border-sky-500/50 shadow-sm'
                : 'bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            Highlight Read Path
          </button>
          <button
            type="button"
            onClick={() => setFlowMode('write')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
              flowMode === 'write'
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 shadow-sm'
                : 'bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            Highlight Write Path
          </button>
          <button
            type="button"
            onClick={() => setFlowMode('outage')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
              flowMode === 'outage'
                ? 'bg-rose-500/20 text-rose-200 border-rose-500/50 shadow-sm'
                : 'bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Simulate Node Outage
          </button>
        </div>

        {/* Path Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /> Read
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Write
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-400 inline-block" /> Read/Write
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Async Stream
          </span>
        </div>
      </div>

      {/* Layered SVG Topology Canvas */}
      <div className="relative bg-slate-950/90 border border-slate-800 rounded-xl overflow-x-auto shadow-inner">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="w-full min-w-[780px] h-auto select-none"
        >
          <defs>
            <pattern id="arch-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="rgba(148, 163, 184, 0.12)" />
            </pattern>
            <marker id="arrow-sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
            </marker>
            <marker id="arrow-emerald" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#34d399" />
            </marker>
            <marker id="arrow-violet" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#a78bfa" />
            </marker>
            <marker id="arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#fbbf24" />
            </marker>
            <marker id="arrow-rose" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
            </marker>
          </defs>

          {/* Subtle dot grid background */}
          <rect width={layout.width} height={layout.height} fill="url(#arch-grid)" />

          {/* Tier Column Headers */}
          {layout.activeTiers.map((tier, idx) => {
            const colX =
              layout.activeTiers.length === 1
                ? layout.width / 2
                : 36 +
                  layout.nodeWidth / 2 +
                  (idx * (layout.width - layout.nodeWidth - 72)) / (layout.activeTiers.length - 1);
            const meta = TIER_META[tier];
            return (
              <g key={tier}>
                <line
                  x1={colX}
                  y1={36}
                  x2={colX}
                  y2={layout.height - 16}
                  stroke="rgba(51, 65, 85, 0.45)"
                  strokeDasharray="4 4"
                />
                <rect
                  x={colX - 68}
                  y={8}
                  width={136}
                  height={22}
                  rx={6}
                  fill="rgba(15, 23, 42, 0.9)"
                  stroke={meta.stroke}
                  strokeOpacity={0.4}
                />
                <text
                  x={colX}
                  y={23}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="10"
                  fontWeight="600"
                  letterSpacing="0.05em"
                >
                  {meta.label.toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* Directional Edges */}
          {caseStudy.edges.map((edge, idx) => {
            const src = layout.positions[edge.from];
            const dst = layout.positions[edge.to];
            if (!src || !dst) return null;

            const active = isEdgeHighlighted(edge);
            const strokeColor = getEdgeColor(edge);
            const isOutageEdge =
              flowMode === 'outage' && (edge.from === activeNode?.id || edge.to === activeNode?.id);

            const isSameColumn = Math.abs(src.cx - dst.cx) < 20;
            const startX = isSameColumn
              ? src.cx
              : src.cx <= dst.cx
              ? src.x + layout.nodeWidth
              : src.x;
            const startY = isSameColumn
              ? src.cy < dst.cy
                ? src.y + layout.nodeHeight
                : src.y
              : src.cy;
            const endX = isSameColumn
              ? dst.cx
              : src.cx <= dst.cx
              ? dst.x
              : dst.x + layout.nodeWidth;
            const endY = isSameColumn
              ? src.cy < dst.cy
                ? dst.y
                : dst.y + layout.nodeHeight
              : dst.cy;

            const deltaX = (endX - startX) * 0.45;
            const pathD = isSameColumn
              ? `M ${startX} ${startY} L ${endX} ${endY}`
              : `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;

            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2 - (isSameColumn ? 0 : 7);

            const markerId = isOutageEdge
              ? 'url(#arrow-rose)'
              : edge.pathType === 'read'
              ? 'url(#arrow-sky)'
              : edge.pathType === 'write'
              ? 'url(#arrow-emerald)'
              : edge.pathType === 'async'
              ? 'url(#arrow-amber)'
              : 'url(#arrow-violet)';

            return (
              <g key={`${edge.from}-${edge.to}-${idx}`} opacity={active ? 1 : 0.16}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={active ? 2.2 : 1.2}
                  strokeDasharray={edge.pathType === 'async' || isOutageEdge ? '6 4' : undefined}
                  markerEnd={markerId}
                />
                {active && (
                  <g>
                    <rect
                      x={midX - 52}
                      y={midY - 9}
                      width={104}
                      height={16}
                      rx={4}
                      fill="rgba(2, 6, 23, 0.88)"
                      stroke={strokeColor}
                      strokeOpacity={0.45}
                    />
                    <text
                      x={midX}
                      y={midY + 2}
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="9"
                      fontWeight="500"
                    >
                      {edge.protocol}: {edge.label.slice(0, 16)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Interactive Architecture Nodes */}
          {caseStudy.nodes.map((node) => {
            const pos = layout.positions[node.id];
            if (!pos) return null;

            const meta = TIER_META[node.tier];
            const isSelected = activeNode?.id === node.id;
            const isOutageTarget = flowMode === 'outage' && isSelected;

            const strokeColor = isOutageTarget
              ? '#f43f5e'
              : isSelected
              ? meta.stroke
              : 'rgba(100, 116, 139, 0.5)';

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => setSelectedNodeId(node.id)}
                className="cursor-pointer group"
              >
                {/* Glow Backdrop when selected */}
                {isSelected && (
                  <rect
                    x={-4}
                    y={-4}
                    width={layout.nodeWidth + 8}
                    height={layout.nodeHeight + 8}
                    rx={14}
                    fill={isOutageTarget ? 'rgba(244, 63, 94, 0.18)' : meta.glow}
                  />
                )}

                <rect
                  width={layout.nodeWidth}
                  height={layout.nodeHeight}
                  rx={10}
                  fill={isOutageTarget ? '#1f0910' : '#0f172a'}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 2.2 : 1.2}
                />

                {/* Top Accent Bar */}
                <rect
                  x={10}
                  y={0}
                  width={layout.nodeWidth - 20}
                  height={3}
                  rx={1.5}
                  fill={isOutageTarget ? '#f43f5e' : meta.stroke}
                />

                {/* Tier Badge & Status Dot */}
                <circle
                  cx={14}
                  cy={16}
                  r={4}
                  fill={isOutageTarget ? '#f43f5e' : meta.stroke}
                />
                <text
                  x={24}
                  y={19}
                  fill={isOutageTarget ? '#fda4af' : '#94a3b8'}
                  fontSize="9"
                  fontWeight="600"
                >
                  {isOutageTarget ? 'OUTAGE SIMULATED' : node.tier.toUpperCase()}
                </text>

                {/* Node Title */}
                <text
                  x={12}
                  y={38}
                  fill="#f8fafc"
                  fontSize="11"
                  fontWeight="700"
                >
                  {node.label.length > 21 ? `${node.label.slice(0, 20)}…` : node.label}
                </text>

                {/* Node Sub-caption */}
                <text
                  x={12}
                  y={55}
                  fill="#94a3b8"
                  fontSize="9.5"
                >
                  {node.role.length > 25 ? `${node.role.slice(0, 24)}…` : node.role}
                </text>

                <text
                  x={layout.nodeWidth - 10}
                  y={69}
                  textAnchor="end"
                  fill={isSelected ? '#e2e8f0' : '#64748b'}
                  fontSize="8.5"
                  fontWeight="600"
                >
                  {isSelected ? '● Inspecting' : 'Click to inspect'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Inspection & Outage Blast-Radius Panel */}
      {activeNode && (
        <div
          className={`rounded-xl border p-4 transition-all ${
            flowMode === 'outage'
              ? 'bg-rose-950/20 border-rose-500/40'
              : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${
                  TIER_META[activeNode.tier].badgeClass
                }`}
              >
                {TIER_META[activeNode.tier].label}
              </span>
              <h4 className="text-base font-bold text-slate-100">{activeNode.label}</h4>
              {flowMode === 'outage' && (
                <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Chaos / Outage Active
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 mr-1">Quick Jump:</span>
              {caseStudy.nodes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelectedNodeId(n.id)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    n.id === activeNode.id
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {n.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
              <div className="text-xs font-semibold text-indigo-300 mb-1 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Role & Scaling Strategy
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-2">{activeNode.role}</p>
              <div className="text-[11px] text-slate-400 bg-slate-900/90 px-2.5 py-1.5 rounded border border-slate-800">
                <strong className="text-slate-200">Scaling:</strong> {activeNode.scalingStrategy}
              </div>
            </div>

            <div className="bg-slate-950/70 border border-rose-500/25 rounded-lg p-3">
              <div className="text-xs font-semibold text-rose-300 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> SPOF & Failure Blast Radius
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-2">{activeNode.failureImpact}</p>
              <div className="text-[11px] text-rose-200/90 bg-rose-950/40 px-2.5 py-1.5 rounded border border-rose-500/20">
                Impacts <strong>{connectedEdges.length}</strong> connected data link(s) on failure.
              </div>
            </div>

            <div className="bg-slate-950/70 border border-emerald-500/25 rounded-lg p-3">
              <div className="text-xs font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Production Failover Mitigation
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-2">{activeNode.mitigation}</p>
              <div className="text-[11px] text-emerald-200/90 bg-emerald-950/30 px-2.5 py-1.5 rounded border border-emerald-500/20">
                Interview tip: Mention this mitigation before the interviewer asks &ldquo;What if this node dies?&rdquo;
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
