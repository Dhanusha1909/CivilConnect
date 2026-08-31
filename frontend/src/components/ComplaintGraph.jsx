import React from "react";

const PRIORITY_COLOR = {
  Critical: "#f87171",
  High: "#fb923c",
  Medium: "#facc15",
  Low: "#4ade80",
};

/**
 * Renders the "Complaint-to-Cause Graph": a central root-cause node with
 * surrounding symptom nodes, each sized/labeled by how many complaints
 * reported that symptom. This visualizes the hidden relationships the
 * clustering pipeline discovered between differently-worded complaints.
 */
export default function ComplaintGraph({ graph }) {
  if (!graph) return null;
  const { root, nodes } = graph;

  if (!nodes || nodes.length === 0) {
    return <p className="text-slate-400 text-sm">Not enough data yet to render a symptom breakdown.</p>;
  }

  const width = 640;
  const height = 360;
  const cx = width / 2;
  const cy = height / 2 + 10;
  const radius = Math.min(width, height) / 2 - 90;
  const rootColor = PRIORITY_COLOR[root.priority] || "#5eead4";

  const positioned = nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return { ...n, x, y };
  });

  const maxCount = Math.max(...nodes.map((n) => n.count), 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* edges */}
      {positioned.map((n) => (
        <line key={`edge-${n.id}`} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
      ))}

      {/* symptom nodes */}
      {positioned.map((n) => {
        const r = 22 + 14 * (n.count / maxCount);
        return (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={r} fill="rgba(129,140,248,0.15)" stroke="#818cf8" strokeWidth={1.5} />
            <text x={n.x} y={n.y - 3} textAnchor="middle" fontSize="11" fill="#e2e8f0" fontWeight="600">
              {n.label}
            </text>
            <text x={n.x} y={n.y + 12} textAnchor="middle" fontSize="10" fill="#94a3b8">
              {n.count} report{n.count === 1 ? "" : "s"}
            </text>
          </g>
        );
      })}

      {/* root node on top */}
      <circle cx={cx} cy={cy} r={54} fill="rgba(94,234,212,0.12)" stroke={rootColor} strokeWidth={2} />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="#f8fafc">
        ROOT CAUSE
      </text>
      <foreignObject x={cx - 70} y={cy + 2} width={140} height={44}>
        <div style={{ fontSize: "10px", textAlign: "center", color: "#cbd5e1", lineHeight: 1.25 }}>{root.label}</div>
      </foreignObject>
    </svg>
  );
}
