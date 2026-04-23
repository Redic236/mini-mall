interface Props {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  ariaLabel?: string;
}

/**
 * Zero-dependency inline-SVG sparkline. Chosen over a chart library because
 * a Dashboard tile renders a 28px-tall line — anything bigger would pull in
 * hundreds of KB to draw six of these.
 *
 * Renders a faint area under the line + a dot on the last point so the "now"
 * value stays readable even when the series trends flat.
 */
export default function Sparkline({
  values,
  width = 96,
  height = 28,
  color = '#1677ff',
  ariaLabel,
}: Props): JSX.Element | null {
  if (values.length === 0) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const dx = values.length > 1 ? width / (values.length - 1) : 0;

  const pointAt = (v: number, i: number): [number, number] => {
    const x = values.length > 1 ? i * dx : width / 2;
    const y = height - ((v - min) / range) * height;
    return [x, y];
  };

  const points = values.map((v, i) => pointAt(v, i).join(',')).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  const last = pointAt(values[values.length - 1]!, values.length - 1);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel ?? '趋势'}
      style={{ display: 'block' }}
    >
      <polygon points={areaPoints} fill={color} opacity={0.14} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2.2} fill={color} />
    </svg>
  );
}
