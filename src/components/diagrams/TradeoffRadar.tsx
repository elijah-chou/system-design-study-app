import React, { useState, useEffect } from 'react';
import { MatrixContender } from '../../data/frameworkMatrices';

interface TradeoffRadarProps {
  axes: string[];
  contenders: MatrixContender[];
  selectedIds: string[];
  onToggleContender?: (id: string) => void;
}

export const TradeoffRadar: React.FC<TradeoffRadarProps> = ({
  axes,
  contenders,
  selectedIds,
  onToggleContender,
}) => {
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null);
  const [hoveredContenderId, setHoveredContenderId] = useState<string | null>(null);

  useEffect(() => {
    setHoveredAxis(null);
    setHoveredContenderId(null);
  }, [axes, contenders]);

  const activeContenders = contenders.filter((c) => selectedIds.includes(c.id));
  const activeHoveredContenderId = activeContenders.some((c) => c.id === hoveredContenderId)
    ? hoveredContenderId
    : null;

  // Radar geometry
  const size = 340;
  const center = size / 2;
  const radius = 112;
  const levels = [25, 50, 75, 100];
  const numAxes = Math.max(axes.length, 1);

  const getPoint = (axisIndex: number, value: number) => {
    const angle = (Math.PI * 2 * axisIndex) / numAxes - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
      {/* Contender Legend & Interactive Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800/80">
        <div>
          <h4 className="text-sm font-semibold text-slate-100">
            6-Axis Quantitative Trade-Off Profile
          </h4>
          <p className="text-xs text-slate-400">
            Toggle technologies below or hover axes to inspect normalized scores (0–100)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {contenders.map((contender) => {
            const isSelected = selectedIds.includes(contender.id);
            return (
              <button
                key={contender.id}
                type="button"
                onClick={() => onToggleContender && onToggleContender(contender.id)}
                onMouseEnter={() => setHoveredContenderId(contender.id)}
                onMouseLeave={() => setHoveredContenderId(null)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  isSelected
                    ? 'bg-slate-800 text-slate-100 border-slate-600 shadow-sm'
                    : 'bg-slate-900/40 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: contender.color,
                    opacity: isSelected ? 1 : 0.35,
                  }}
                />
                <span>{contender.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: SVG Multi-Axis Radar Polygon Chart */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-950/50 rounded-xl p-3 border border-slate-800/60">
          <svg
            viewBox={`-28 0 ${size + 56} ${size}`}
            className="w-full max-w-[360px] h-auto overflow-visible select-none"
          >
            {/* Concentric Polygon Rings */}
            {levels.map((lvl) => {
              const points = axes
                .map((_, idx) => {
                  const pt = getPoint(idx, lvl);
                  return `${pt.x},${pt.y}`;
                })
                .join(' ');
              return (
                <g key={lvl}>
                  <polygon
                    points={points}
                    fill="none"
                    stroke="#334155"
                    strokeWidth={lvl === 100 ? 1.2 : 0.75}
                    strokeDasharray={lvl === 100 ? undefined : '3 3'}
                  />
                  <text
                    x={center + 4}
                    y={center - (lvl / 100) * radius + 10}
                    fill="#64748b"
                    fontSize="9"
                  >
                    {lvl}
                  </text>
                </g>
              );
            })}

            {/* Axis Spokes & Labels */}
            {axes.map((axis, idx) => {
              const outerPt = getPoint(idx, 100);
              const labelPt = getPoint(idx, 123);
              const isAxisHovered = hoveredAxis === axis;
              return (
                <g
                  key={axis}
                  onMouseEnter={() => setHoveredAxis(axis)}
                  onMouseLeave={() => setHoveredAxis(null)}
                  className="cursor-pointer"
                >
                  <line
                    x1={center}
                    y1={center}
                    x2={outerPt.x}
                    y2={outerPt.y}
                    stroke={isAxisHovered ? '#94a3b8' : '#334155'}
                    strokeWidth={isAxisHovered ? 1.8 : 1}
                  />
                  <text
                    x={labelPt.x}
                    y={labelPt.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isAxisHovered ? '#f8fafc' : '#cbd5e1'}
                    fontSize="10"
                    fontWeight={isAxisHovered ? '700' : '500'}
                  >
                    {axis}
                  </text>
                </g>
              );
            })}

            {/* Contender Polygons */}
            {activeContenders.map((contender) => {
              const isHighlighted =
                !activeHoveredContenderId || activeHoveredContenderId === contender.id;
              const polyPoints = axes
                .map((axis, idx) => {
                  const val = contender.scores[axis] ?? 50;
                  const pt = getPoint(idx, val);
                  return `${pt.x},${pt.y}`;
                })
                .join(' ');

              return (
                <g
                  key={contender.id}
                  style={{
                    opacity: isHighlighted ? 1 : 0.2,
                    transition: 'opacity 150ms ease',
                  }}
                >
                  <polygon
                    points={polyPoints}
                    fill={contender.color}
                    fillOpacity={activeHoveredContenderId === contender.id ? 0.3 : 0.14}
                    stroke={contender.color}
                    strokeWidth={activeHoveredContenderId === contender.id ? 2.6 : 2}
                  />
                  {axes.map((axis, idx) => {
                    const val = contender.scores[axis] ?? 50;
                    const pt = getPoint(idx, val);
                    return (
                      <circle
                        key={`${contender.id}-${axis}`}
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredAxis === axis ? 5 : 3.5}
                        fill={contender.color}
                        stroke="#0f172a"
                        strokeWidth={1.5}
                      >
                        <title>{`${contender.name} — ${axis}: ${val}/100`}</title>
                      </circle>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right: Grouped Quantitative Score Bars per Axis */}
        <div className="lg:col-span-7 space-y-3.5">
          {axes.map((axis) => {
            const isAxisHovered = hoveredAxis === axis;
            return (
              <div
                key={axis}
                onMouseEnter={() => setHoveredAxis(axis)}
                onMouseLeave={() => setHoveredAxis(null)}
                className={`p-2.5 rounded-lg border transition-colors ${
                  isAxisHovered
                    ? 'bg-slate-800/70 border-slate-700'
                    : 'bg-slate-950/40 border-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
                  <span>{axis}</span>
                  <span className="text-[11px] text-slate-500">Normalized 0–100</span>
                </div>
                <div className="space-y-1.5">
                  {activeContenders.map((contender) => {
                    const score = contender.scores[axis] ?? 50;
                    return (
                      <div key={contender.id} className="flex items-center gap-2.5">
                        <span className="w-36 truncate text-[11px] text-slate-400">
                          {contender.name}
                        </span>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${score}%`,
                              backgroundColor: contender.color,
                            }}
                          />
                        </div>
                        <span className="w-8 text-right text-[11px] font-mono font-semibold text-slate-200">
                          {score}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
