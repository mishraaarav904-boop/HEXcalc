import React, { useEffect, useRef } from 'react';
import { SweepPoint } from '../../types/aerodynamics';
import { Play, Square, TrendingUp } from 'lucide-react';

interface SweepChartProps {
  sweepPoints: SweepPoint[];
  currentAngle: number;
  currentCd: number;
  currentCl: number;
  isSweeping: boolean;
  sweepProgress: number;
  onStartSweep: () => void;
  onStopSweep: () => void;
  darkMode: boolean;
}

export const SweepChart: React.FC<SweepChartProps> = ({
  sweepPoints,
  currentAngle,
  currentCd,
  currentCl,
  isSweeping,
  sweepProgress,
  onStartSweep,
  onStopSweep,
  darkMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement?.clientWidth || 380;
    const h = 220;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    // Colors based on theme
    const bg = darkMode ? '#0f172a' : '#ffffff';
    const gridColor = darkMode ? '#1e293b' : '#f1f5f9';
    const axisColor = darkMode ? '#475569' : '#cbd5e1';
    const textColor = darkMode ? '#94a3b8' : '#64748b';
    const clColor = '#3b82f6'; // Blue
    const cdColor = '#f59e0b'; // Amber

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const padLeft = 42;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 30;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Angle range: -20 to 25 deg
    const minA = -20;
    const maxA = 25;

    // Coefficient range: -0.5 to 1.8
    const minVal = -0.5;
    const maxVal = 1.6;

    const toX = (angle: number) => padLeft + ((angle - minA) / (maxA - minA)) * plotW;
    const toY = (val: number) => padTop + (1.0 - (val - minVal) / (maxVal - minVal)) * plotH;

    // Grid lines & labels
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = textColor;
    ctx.font = '10px Inter, monospace';

    // Y ticks
    for (let v = -0.5; v <= 1.5; v += 0.5) {
      const y = toY(v);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
      ctx.fillText(v.toFixed(1), 10, y + 3);
    }

    // X ticks
    for (let a = -20; a <= 25; a += 10) {
      const x = toX(a);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, h - padBottom);
      ctx.stroke();
      ctx.fillText(`${a}°`, x - 8, h - padBottom + 15);
    }

    // Zero-lines
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1.2;
    const y0 = toY(0);
    ctx.beginPath();
    ctx.moveTo(padLeft, y0);
    ctx.lineTo(w - padRight, y0);
    ctx.stroke();

    const x0 = toX(0);
    ctx.beginPath();
    ctx.moveTo(x0, padTop);
    ctx.lineTo(x0, h - padBottom);
    ctx.stroke();

    // Plot Cl Curve
    if (sweepPoints.length > 1) {
      ctx.strokeStyle = clColor;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      sweepPoints.forEach((pt, i) => {
        const px = toX(pt.angle);
        const py = toY(pt.cl);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      // Plot Cd Curve
      ctx.strokeStyle = cdColor;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      sweepPoints.forEach((pt, i) => {
        const px = toX(pt.angle);
        const py = toY(pt.cd);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    // Current Operating Point Marker
    if (currentAngle >= minA && currentAngle <= maxA) {
      const curX = toX(currentAngle);
      const curYCl = toY(currentCl);
      const curYCd = toY(currentCd);

      // Cl marker (Blue circle)
      ctx.fillStyle = clColor;
      ctx.beginPath();
      ctx.arc(curX, curYCl, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Cd marker (Amber circle)
      ctx.fillStyle = cdColor;
      ctx.beginPath();
      ctx.arc(curX, curYCd, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }, [sweepPoints, currentAngle, currentCd, currentCl, darkMode]);

  return (
    <div className="app-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Aero Polar: Cd & Cl vs Angle of Attack
          </h4>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
            <span className="w-2.5 h-0.5 bg-blue-500 rounded-full inline-block" /> Cl: {currentCl.toFixed(3)}
          </span>
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
            <span className="w-2.5 h-0.5 bg-amber-500 rounded-full inline-block" /> Cd: {currentCd.toFixed(3)}
          </span>
        </div>
      </div>

      <div className="relative w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
        <canvas ref={canvasRef} className="w-full block" />
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          onClick={isSweeping ? onStopSweep : onStartSweep}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            isSweeping
              ? 'bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
          }`}
        >
          {isSweeping ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Sweep ({Math.round(sweepProgress * 100)}%)</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run AoA Sweep (-20° to +25°)</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          {sweepPoints.length > 0 ? `${sweepPoints.length} sweep points` : 'Click sweep to plot polar'}
        </p>
      </div>
    </div>
  );
};
