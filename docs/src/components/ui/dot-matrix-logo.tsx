"use client";

import React, { useState, useRef, useMemo } from "react";

interface Dot {
  col: number;
  row: number;
  cov: number;
}

// 238 mathematically symmetric dots extracted from the official Liate winged emblem
const LIATE_DOTS: Dot[] = [
  {"col":1,"row":0,"cov":0.22},{"col":2,"row":0,"cov":0.81},{"col":3,"row":0,"cov":1},{"col":4,"row":0,"cov":1},{"col":5,"row":0,"cov":0.77},{"col":6,"row":0,"cov":0.22},{"col":21,"row":0,"cov":0.22},{"col":22,"row":0,"cov":0.77},{"col":23,"row":0,"cov":1},{"col":24,"row":0,"cov":1},{"col":25,"row":0,"cov":0.81},{"col":26,"row":0,"cov":0.22},
  {"col":0,"row":1,"cov":0.22},{"col":1,"row":1,"cov":1},{"col":2,"row":1,"cov":1},{"col":3,"row":1,"cov":1},{"col":4,"row":1,"cov":1},{"col":5,"row":1,"cov":1},{"col":6,"row":1,"cov":1},{"col":7,"row":1,"cov":0.33},{"col":20,"row":1,"cov":0.33},{"col":21,"row":1,"cov":1},{"col":22,"row":1,"cov":1},{"col":23,"row":1,"cov":1},{"col":24,"row":1,"cov":1},{"col":25,"row":1,"cov":1},{"col":26,"row":1,"cov":1},{"col":27,"row":1,"cov":0.22},
  {"col":0,"row":2,"cov":0.88},{"col":1,"row":2,"cov":1},{"col":2,"row":2,"cov":1},{"col":3,"row":2,"cov":1},{"col":4,"row":2,"cov":1},{"col":5,"row":2,"cov":1},{"col":6,"row":2,"cov":1},{"col":7,"row":2,"cov":1},{"col":8,"row":2,"cov":0.33},{"col":19,"row":2,"cov":0.33},{"col":20,"row":2,"cov":1},{"col":21,"row":2,"cov":1},{"col":22,"row":2,"cov":1},{"col":23,"row":2,"cov":1},{"col":24,"row":2,"cov":1},{"col":25,"row":2,"cov":1},{"col":26,"row":2,"cov":1},{"col":27,"row":2,"cov":0.88},
  {"col":0,"row":3,"cov":1},{"col":1,"row":3,"cov":1},{"col":2,"row":3,"cov":1},{"col":3,"row":3,"cov":1},{"col":4,"row":3,"cov":1},{"col":5,"row":3,"cov":1},{"col":6,"row":3,"cov":1},{"col":7,"row":3,"cov":1},{"col":8,"row":3,"cov":1},{"col":9,"row":3,"cov":0.33},{"col":18,"row":3,"cov":0.33},{"col":19,"row":3,"cov":1},{"col":20,"row":3,"cov":1},{"col":21,"row":3,"cov":1},{"col":22,"row":3,"cov":1},{"col":23,"row":3,"cov":1},{"col":24,"row":3,"cov":1},{"col":25,"row":3,"cov":1},{"col":26,"row":3,"cov":1},{"col":27,"row":3,"cov":1},
  {"col":0,"row":4,"cov":1},{"col":1,"row":4,"cov":1},{"col":2,"row":4,"cov":1},{"col":3,"row":4,"cov":1},{"col":4,"row":4,"cov":1},{"col":5,"row":4,"cov":1},{"col":6,"row":4,"cov":1},{"col":7,"row":4,"cov":1},{"col":8,"row":4,"cov":1},{"col":9,"row":4,"cov":1},{"col":10,"row":4,"cov":0.33},{"col":17,"row":4,"cov":0.33},{"col":18,"row":4,"cov":1},{"col":19,"row":4,"cov":1},{"col":20,"row":4,"cov":1},{"col":21,"row":4,"cov":1},{"col":22,"row":4,"cov":1},{"col":23,"row":4,"cov":1},{"col":24,"row":4,"cov":1},{"col":25,"row":4,"cov":1},{"col":26,"row":4,"cov":1},{"col":27,"row":4,"cov":1},
  {"col":0,"row":5,"cov":0.55},{"col":1,"row":5,"cov":1},{"col":2,"row":5,"cov":1},{"col":3,"row":5,"cov":1},{"col":4,"row":5,"cov":1},{"col":5,"row":5,"cov":1},{"col":6,"row":5,"cov":1},{"col":7,"row":5,"cov":1},{"col":8,"row":5,"cov":1},{"col":9,"row":5,"cov":1},{"col":10,"row":5,"cov":1},{"col":11,"row":5,"cov":0.33},{"col":16,"row":5,"cov":0.33},{"col":17,"row":5,"cov":1},{"col":18,"row":5,"cov":1},{"col":19,"row":5,"cov":1},{"col":20,"row":5,"cov":1},{"col":21,"row":5,"cov":1},{"col":22,"row":5,"cov":1},{"col":23,"row":5,"cov":1},{"col":24,"row":5,"cov":1},{"col":25,"row":5,"cov":1},{"col":26,"row":5,"cov":1},{"col":27,"row":5,"cov":0.55},
  {"col":1,"row":6,"cov":0.66},{"col":2,"row":6,"cov":1},{"col":3,"row":6,"cov":1},{"col":4,"row":6,"cov":1},{"col":5,"row":6,"cov":1},{"col":6,"row":6,"cov":1},{"col":7,"row":6,"cov":1},{"col":8,"row":6,"cov":1},{"col":9,"row":6,"cov":1},{"col":10,"row":6,"cov":1},{"col":11,"row":6,"cov":1},{"col":12,"row":6,"cov":0.33},{"col":15,"row":6,"cov":0.33},{"col":16,"row":6,"cov":1},{"col":17,"row":6,"cov":1},{"col":18,"row":6,"cov":1},{"col":19,"row":6,"cov":1},{"col":20,"row":6,"cov":1},{"col":21,"row":6,"cov":1},{"col":22,"row":6,"cov":1},{"col":23,"row":6,"cov":1},{"col":24,"row":6,"cov":1},{"col":25,"row":6,"cov":1},{"col":26,"row":6,"cov":0.66},
  {"col":2,"row":7,"cov":0.66},{"col":3,"row":7,"cov":1},{"col":4,"row":7,"cov":1},{"col":5,"row":7,"cov":1},{"col":6,"row":7,"cov":1},{"col":7,"row":7,"cov":1},{"col":8,"row":7,"cov":1},{"col":9,"row":7,"cov":1},{"col":10,"row":7,"cov":1},{"col":11,"row":7,"cov":1},{"col":12,"row":7,"cov":1},{"col":13,"row":7,"cov":0.66},{"col":14,"row":7,"cov":0.66},{"col":15,"row":7,"cov":1},{"col":16,"row":7,"cov":1},{"col":17,"row":7,"cov":1},{"col":18,"row":7,"cov":1},{"col":19,"row":7,"cov":1},{"col":20,"row":7,"cov":1},{"col":21,"row":7,"cov":1},{"col":22,"row":7,"cov":1},{"col":23,"row":7,"cov":1},{"col":24,"row":7,"cov":1},{"col":25,"row":7,"cov":0.66},
  {"col":3,"row":8,"cov":0.67},{"col":4,"row":8,"cov":1},{"col":5,"row":8,"cov":1},{"col":6,"row":8,"cov":1},{"col":7,"row":8,"cov":1},{"col":8,"row":8,"cov":1},{"col":9,"row":8,"cov":1},{"col":10,"row":8,"cov":1},{"col":11,"row":8,"cov":1},{"col":12,"row":8,"cov":1},{"col":13,"row":8,"cov":1},{"col":14,"row":8,"cov":1},{"col":15,"row":8,"cov":1},{"col":16,"row":8,"cov":1},{"col":17,"row":8,"cov":1},{"col":18,"row":8,"cov":1},{"col":19,"row":8,"cov":1},{"col":20,"row":8,"cov":1},{"col":21,"row":8,"cov":1},{"col":22,"row":8,"cov":1},{"col":23,"row":8,"cov":1},{"col":24,"row":8,"cov":0.67},
  {"col":4,"row":9,"cov":0.67},{"col":5,"row":9,"cov":1},{"col":6,"row":9,"cov":1},{"col":7,"row":9,"cov":1},{"col":8,"row":9,"cov":1},{"col":9,"row":9,"cov":1},{"col":10,"row":9,"cov":1},{"col":11,"row":9,"cov":1},{"col":12,"row":9,"cov":1},{"col":13,"row":9,"cov":0.88},{"col":14,"row":9,"cov":0.88},{"col":15,"row":9,"cov":1},{"col":16,"row":9,"cov":1},{"col":17,"row":9,"cov":1},{"col":18,"row":9,"cov":1},{"col":19,"row":9,"cov":1},{"col":20,"row":9,"cov":1},{"col":21,"row":9,"cov":1},{"col":22,"row":9,"cov":1},{"col":23,"row":9,"cov":0.67},
  {"col":5,"row":10,"cov":0.66},{"col":6,"row":10,"cov":1},{"col":7,"row":10,"cov":1},{"col":8,"row":10,"cov":1},{"col":9,"row":10,"cov":1},{"col":10,"row":10,"cov":1},{"col":11,"row":10,"cov":1},{"col":12,"row":10,"cov":0.33},{"col":15,"row":10,"cov":0.33},{"col":16,"row":10,"cov":1},{"col":17,"row":10,"cov":1},{"col":18,"row":10,"cov":1},{"col":19,"row":10,"cov":1},{"col":20,"row":10,"cov":1},{"col":21,"row":10,"cov":1},{"col":22,"row":10,"cov":0.66},
  {"col":6,"row":11,"cov":0.66},{"col":7,"row":11,"cov":1},{"col":8,"row":11,"cov":1},{"col":9,"row":11,"cov":1},{"col":10,"row":11,"cov":1},{"col":11,"row":11,"cov":0.33},{"col":16,"row":11,"cov":0.33},{"col":17,"row":11,"cov":1},{"col":18,"row":11,"cov":1},{"col":19,"row":11,"cov":1},{"col":20,"row":11,"cov":1},{"col":21,"row":11,"cov":0.66},
  {"col":7,"row":12,"cov":0.63},{"col":8,"row":12,"cov":1},{"col":9,"row":12,"cov":0.97},{"col":10,"row":12,"cov":0.33},{"col":17,"row":12,"cov":0.33},{"col":18,"row":12,"cov":0.97},{"col":19,"row":12,"cov":1},{"col":20,"row":12,"cov":0.63}
];

export interface DotMatrixLogoProps {
  className?: string;
  size?: number; // CSS height in pixels (default: 34)
  width?: number | string;
  height?: number | string;
  interactive?: boolean;
  baseOpacity?: number;
  color?: string;
}

export function DotMatrixLogo({
  className = "",
  size = 34,
  width: customWidth,
  height: customHeight,
  interactive = true,
  baseOpacity = 1,
  color = "currentColor",
}: DotMatrixLogoProps) {
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [ripples, setRipples] = useState<{ x: number; y: number; time: number }[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 290;
    const y = ((e.clientY - rect.top) / rect.height) * 140;
    setPointer({ x, y });
  };

  const handlePointerLeave = () => {
    setPointer(null);
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 290;
    const y = ((e.clientY - rect.top) / rect.height) * 140;
    setRipples((prev) => [...prev.slice(-3), { x, y, time: Date.now() }]);
  };

  const dots = useMemo(() => {
    return LIATE_DOTS.map((d, i) => {
      const cx = 10 + d.col * 10;
      const cy = 10 + d.row * 10;
      const baseR = Math.max(1.8, Math.sqrt(d.cov) * 4.2);

      let scale = 1;
      let warm = 0;

      if (pointer) {
        const dx = cx - pointer.x;
        const dy = cy - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 40) {
          const force = 1 - dist / 40;
          scale = 1 + force * 0.45;
          warm = force;
        }
      }

      // Check click ripples
      const now = Date.now();
      ripples.forEach((rip) => {
        if (!rip || typeof rip.time !== "number") return;
        const age = (now - rip.time) / 1000;
        if (age < 0.8) {
          const ripR = age * 200;
          const dToCenter = Math.hypot(cx - rip.x, cy - rip.y);
          const band = 1 - Math.min(1, Math.abs(dToCenter - ripR) / 25);
          if (band > 0) {
            scale = Math.max(scale, 1 + band * 0.4 * (1 - age / 0.8));
            warm = Math.max(warm, band * 0.8);
          }
        }
      });

      // Warm color: #f0602a on hover/interaction, pure theme color on rest
      const fill =
        warm > 0.05
          ? `rgb(${Math.round(255 + (240 - 255) * warm)}, ${Math.round(255 + (96 - 255) * warm)}, ${Math.round(255 + (42 - 255) * warm)})`
          : color;

      const opacity = Math.min(1, (0.45 + d.cov * 0.55 + warm * 0.3) * baseOpacity);

      return (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={Math.round(baseR * scale * 100) / 100}
          fill={fill}
          opacity={opacity}
          className={interactive ? "transition-[r,fill,opacity] duration-150 ease-out" : undefined}
        />
      );
    });
  }, [pointer, ripples, baseOpacity, interactive, color]);

  // Height determines proportional width (aspect ratio 290 : 140 = ~2.07)
  const width = customWidth ?? Math.round(size * (290 / 140));
  const height = customHeight ?? size;

  return (
    <div className={`relative inline-flex items-center justify-center select-none transform-gpu ${className}`}>
      <svg
        ref={svgRef}
        viewBox="0 0 290 140"
        width={width}
        height={height}
        onPointerMove={interactive ? handlePointerMove : undefined}
        onPointerLeave={interactive ? handlePointerLeave : undefined}
        onClick={interactive ? handleClick : undefined}
        shapeRendering="geometricPrecision"
        style={{ shapeRendering: "geometricPrecision" }}
        className="overflow-visible"
        aria-label="Liate Dot-Matrix Logo"
      >
        {dots}
      </svg>
    </div>
  );
}

export default DotMatrixLogo;
