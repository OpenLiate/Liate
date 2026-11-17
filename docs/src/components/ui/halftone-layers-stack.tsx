"use client";

import React, { useEffect, useRef } from "react";

export interface HalftoneLayersStackProps {
  lines?: string[];
  height?: string;
  className?: string;
  dotGap?: number;
  radius?: number;
  palette?: { background?: string; ink?: string; warm?: string };
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return [255, 255, 255];
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function HalftoneLayersStack({
  lines = [
    "L · LLM",
    "I · INTEGRATION",
    "A · AGENT",
    "T · TOOLS",
    "E · ENVIRONMENT",
  ],
  height = "380px",
  className = "",
  dotGap = 5,
  radius = 90,
  palette = { background: "transparent", ink: "#ffffff", warm: "#f0602a" },
}: HalftoneLayersStackProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let dots: Float32Array = new Float32Array(0);
    let count = 0;
    const inkRgb = hexToRgb(palette.ink || "#ffffff");
    const warmRgb = hexToRgb(palette.warm || "#f0602a");

    const pointer = { x: -9999, y: -9999, active: false };
    const ring = { x: 0, y: 0, t: -1 };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
      pointer.active = false;
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      ring.x = e.clientX - rect.left;
      ring.y = e.clientY - rect.top;
      ring.t = performance.now();
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("click", handleClick);

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w <= 0 || h <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;

      // Render 5 lines on an off-screen mask
      const mask = document.createElement("canvas");
      mask.width = w;
      mask.height = h;
      const m = mask.getContext("2d", { willReadFrequently: true });
      if (!m) return;

      const numLines = lines.length;
      const lineHeight = h / numLines;

      // Measure lines to make font bold and expansive across width
      let maxRawWidth = 0;
      m.font = `900 100px "Space Grotesk", "Inter Tight", "Inter", -apple-system, sans-serif`;
      lines.forEach((l) => {
        const rawW = m.measureText(l).width;
        if (rawW > maxRawWidth) maxRawWidth = rawW;
      });

      const fitByWidth = maxRawWidth > 0 ? (w * 0.98 / maxRawWidth) * 100 : 40;
      const fitByHeight = lineHeight * 0.84;
      const fontSize = Math.floor(Math.min(fitByWidth, fitByHeight));

      m.font = `900 ${fontSize}px "Space Grotesk", "Inter Tight", "Inter", -apple-system, sans-serif`;
      m.textBaseline = "middle";
      m.textAlign = "left";
      m.fillStyle = "#000";

      lines.forEach((line, idx) => {
        const y = (idx + 0.5) * lineHeight;
        m.fillText(line, 4, y);
      });

      const img = m.getImageData(0, 0, w, h).data;
      const gap = Math.max(3.5, dotGap);
      const cols = Math.ceil(w / gap);
      const rows = Math.ceil(h / gap);
      const tmp: number[] = [];

      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          let sum = 0;
          for (let sy = 0; sy < 3; sy++) {
            for (let sx = 0; sx < 3; sx++) {
              const x = Math.min(w - 1, Math.floor(gx * gap + ((sx + 0.5) * gap) / 3));
              const y = Math.min(h - 1, Math.floor(gy * gap + ((sy + 0.5) * gap) / 3));
              sum += img[(y * w + x) * 4 + 3];
            }
          }
          const cov = sum / (9 * 255);
          if (cov < 0.06) continue;
          const hx = gx * gap + gap / 2;
          const hy = gy * gap + gap / 2;
          const r = Math.sqrt(cov) * gap * 0.57;
          tmp.push(hx, hy, 0, 0, hx, hy, r);
        }
      }

      dots = new Float32Array(tmp);
      count = tmp.length / 7;
    };

    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const ringAge = ring.t < 0 ? 1e9 : now - ring.t;
      const ringR = ringAge * 0.85;

      for (let i = 0; i < count; i++) {
        const j = i * 7;
        let x = dots[j];
        let y = dots[j + 1];
        let vx = dots[j + 2];
        let vy = dots[j + 3];
        const hx = dots[j + 4];
        const hy = dots[j + 5];
        const baseR = dots[j + 6];

        // Pointer repulsion
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (radius > 0 && d2 < radius * radius && pointer.active) {
          const d = Math.sqrt(d2) + 0.001;
          const f = (1 - d / radius) * 2.8;
          vx += (dx / d) * f;
          vy += (dy / d) * f;
        }

        // Ripple pulse
        if (ringAge < 1000) {
          const rdx = x - ring.x;
          const rdy = y - ring.y;
          const rd = Math.hypot(rdx, rdy);
          const diff = Math.abs(rd - ringR);
          if (diff < 40) {
            const rf = (1 - diff / 40) * Math.max(0, 1 - ringAge / 1000) * 1.8;
            vx += (rdx / (rd + 0.001)) * rf;
            vy += (rdy / (rd + 0.001)) * rf;
          }
        }

        // Spring return
        vx = (vx + (hx - x) * 0.06) * 0.82;
        vy = (vy + (hy - y) * 0.06) * 0.82;
        x += vx;
        y += vy;

        dots[j] = x;
        dots[j + 1] = y;
        dots[j + 2] = vx;
        dots[j + 3] = vy;

        // Warmth colour interpolation
        const disp = Math.hypot(x - hx, y - hy);
        const warmth = Math.min(1, disp / 22);
        const rColor = Math.round(inkRgb[0] + (warmRgb[0] - inkRgb[0]) * warmth);
        const gColor = Math.round(inkRgb[1] + (warmRgb[1] - inkRgb[1]) * warmth);
        const bColor = Math.round(inkRgb[2] + (warmRgb[2] - inkRgb[2]) * warmth);

        ctx.fillStyle = `rgb(${rColor}, ${gColor}, ${bColor})`;
        ctx.beginPath();
        ctx.arc(x, y, baseR, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    build();
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => {
        build();
      });
    }

    animId = requestAnimationFrame(draw);

    const handleResize = () => {
      build();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("click", handleClick);
    };
  }, [lines, dotGap, radius, palette]);

  return (
    <div className={`relative w-full select-none cursor-pointer ${className}`} style={{ height }}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
export default HalftoneLayersStack;
