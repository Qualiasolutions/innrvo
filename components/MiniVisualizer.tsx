import React, { useEffect, useRef, memo } from 'react';
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

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${size} ${size}`)
      .style('overflow', 'visible');

    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${size / 2}, ${size / 2})`);

    const numPoints = 32;
    const angleStep = (Math.PI * 2) / numPoints;
    const radius = size * 0.28;

    const points = d3.range(numPoints).map(i => ({
      angle: i * angleStep,
      r: radius
    }));

    const line = d3.lineRadial<{ angle: number; r: number }>()
      .angle(d => d.angle)
      .radius(d => d.r)
      .curve(d3.curveBasisClosed);

    const path = g.append('path')
      .datum(points)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', 'url(#miniAuraGrad)')
      .attr('stroke-width', 1.5);

    const path2 = g.append('path')
      .datum(points)
      .attr('d', line)
      .attr('fill', 'url(#miniCenterGrad)')
      .attr('opacity', 0.5);

    let t = 0;
    let animId: number;

    const animate = () => {
      t += isActive ? 0.025 : 0.008;

      const noiseMultiplier = isActive ? 5 : 1.5;
      const swellMultiplier = isActive ? 3 : 1;

      const newPoints = points.map((p, i) => {
        const noise = Math.sin(t + i * 0.25) * noiseMultiplier;
        const swell = Math.sin(t * 0.6) * swellMultiplier;
        return {
          angle: p.angle,
          r: radius + noise + swell
        };
      });

      path.attr('d', line(newPoints));
      path2.attr('d', line(newPoints));

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isActive, size]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id="miniAuraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="50%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <radialGradient id="miniCenterGrad">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.7" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
});

MiniVisualizer.displayName = 'MiniVisualizer';

export default MiniVisualizer;
