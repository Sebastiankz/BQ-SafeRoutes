import { useId } from "react";

/**
 * Tiny inline SVG sparkline for KPI cards. No library, no axis,
 * no tooltip — just shape. Six points by default, area fill on
 * a subtle gradient that picks up the KPI color.
 */
export default function Sparkline({
  values,
  color = "var(--accent)",
  width = 86,
  height = 28,
  strokeWidth = 1.75,
}) {
  const reactId = useId();
  if (!values?.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1 || 1);
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / span) * (height - strokeWidth * 2) - strokeWidth;
    return [x, y];
  });
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `M0,${height} L${line.replace(/ /g, " L")} L${width},${height} Z`;
  const id = `spark-${reactId.replace(/:/g, "")}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r={2.5}
        fill={color}
      />
    </svg>
  );
}
