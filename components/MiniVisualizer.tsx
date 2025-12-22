import React, { useEffect, useRef, memo, useMemo } from 'react';
import * as d3 from 'd3';

interface MiniVisualizerProps {
  isActive: boolean;
  size?: number;
}

const MiniVisualizer: React.FC<MiniVisualizerProps> = memo(({
  isActive,
  size = 40
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<d3.Selection<SVGPathElement, { angle: number; r: number }[], null, undefined> | null>(null);
  const path2Ref = useRef<d3.Selection<SVGPathElement, { angle: number; r: number }[], null, undefined> | null>(null);
  const isActiveRef = useRef(isActive);

  // Update ref when isActive changes (no re-render needed)
  isActiveRef.current = isActive;

  const numPoints = 32;
  const angleStep = (Math.PI * 2) / numPoints;
  const radius = size * 0.28;

  // Memoize line generator and base points
  const { line, points } = useMemo(() => ({
    line: d3.lineRadial<{ angle: number; r: number }>()
      .angle(d => d.angle)
      .radius(d => d.r)
      .curve(d3.curveBasisClosed),
    points: d3.range(numPoints).map(i => ({
      angle: i * angleStep,
      r: radius
    }))
  }), [numPoints, angleStep, radius]);

  // Setup SVG structure only when size changes
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${size} ${size}`)
      .style('overflow', 'visible');

    // Only clear and rebuild if paths don't exist
    const existingG = svg.select<SVGGElement>('g.vis-group');
    let g: d3.Selection<SVGGElement, unknown, null, undefined>;

    if (existingG.empty()) {
      svg.selectAll('g.vis-group').remove();
      g = svg.append('g')
        .attr('class', 'vis-group')
        .attr('transform', `translate(${size / 2}, ${size / 2})`);

      pathRef.current = g.append('path')
        .datum(points)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', 'url(#miniAuraGrad)')
        .attr('stroke-width', 1.5);

      path2Ref.current = g.append('path')
        .datum(points)
        .attr('d', line)
        .attr('fill', 'url(#miniCenterGrad)')
        .attr('opacity', 0.5);
    } else {
      g = existingG;
      g.attr('transform', `translate(${size / 2}, ${size / 2})`);
    }
  }, [size, line, points]);

  // Animation loop - separate from SVG setup
  useEffect(() => {
    let t = 0;
    let animId: number;

    const animate = () => {
      const active = isActiveRef.current;
      t += active ? 0.025 : 0.008;

      const noiseMultiplier = active ? 5 : 1.5;
      const swellMultiplier = active ? 3 : 1;

      const newPoints = points.map((p, i) => {
        const noise = Math.sin(t + i * 0.25) * noiseMultiplier;
        const swell = Math.sin(t * 0.6) * swellMultiplier;
        return {
          angle: p.angle,
          r: radius + noise + swell
        };
      });

      if (pathRef.current) {
        pathRef.current.attr('d', line(newPoints));
      }
      if (path2Ref.current) {
        path2Ref.current.attr('d', line(newPoints));
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [points, radius, line]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id="miniAuraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <radialGradient id="miniCenterGrad">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.7" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
});

MiniVisualizer.displayName = 'MiniVisualizer';

export default MiniVisualizer;
