import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ThermoUnitSystem } from '../../types/thermodynamics';
import { GAS_SPECIES, kelvinToUnit, pascalToUnit, volumeToUnit } from '../../data/thermoData';
import { Sliders, Box, Layers, Info } from 'lucide-react';

interface PvtExplorerProps {
  unitSystem: ThermoUnitSystem;
}

const R = 8.314462; // Universal gas constant J/(mol*K)

export const PvtExplorer: React.FC<PvtExplorerProps> = ({ unitSystem }) => {
  const [selectedGasId, setSelectedGasId] = useState<string>('co2');
  const [customA, setCustomA] = useState<number>(0.3658);
  const [customB, setCustomB] = useState<number>(0.0000429);
  
  // Thermodynamic state variables
  const [temperature, setTemperature] = useState<number>(310); // K
  const [volume, setVolume] = useState<number>(0.0008); // m^3
  const [moles, setMoles] = useState<number>(1.0); // mol
  
  // Display controls
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [modelType, setModelType] = useState<'both' | 'vdw' | 'ideal'>('both');
  
  // 3D rotation angles
  const [rotX, setRotX] = useState<number>(0.6);
  const [rotY, setRotY] = useState<number>(-0.7);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedGas = useMemo(() => {
    return GAS_SPECIES.find(g => g.id === selectedGasId) || GAS_SPECIES[1];
  }, [selectedGasId]);

  const a = selectedGas.id === 'custom' ? customA : selectedGas.a;
  const b = selectedGas.id === 'custom' ? customB : selectedGas.b;

  // Real vs Ideal pressure calculations
  const pIdeal = useMemo(() => {
    if (volume <= 0) return 0;
    return (moles * R * temperature) / volume;
  }, [moles, temperature, volume]);

  const pVdw = useMemo(() => {
    const effectiveV = volume - moles * b;
    if (effectiveV <= 1e-7) return 1e9; // compressed core limit
    const term1 = (moles * R * temperature) / effectiveV;
    const term2 = a * Math.pow(moles / volume, 2);
    return Math.max(0, term1 - term2);
  }, [moles, temperature, volume, a, b]);

  // Compressibility factor Z
  const compressibilityZ = useMemo(() => {
    if (pIdeal === 0) return 1;
    return pVdw / pIdeal;
  }, [pVdw, pIdeal]);

  const departurePercent = useMemo(() => {
    if (pIdeal === 0) return 0;
    return Math.abs((pVdw - pIdeal) / pIdeal) * 100;
  }, [pVdw, pIdeal]);

  // State region
  const phaseRegion = useMemo(() => {
    if (temperature > selectedGas.Tc && pVdw > selectedGas.Pc) {
      return { name: 'Supercritical Fluid', color: 'text-purple-400', bg: 'bg-purple-900/30' };
    }
    if (temperature > selectedGas.Tc) {
      return { name: 'Supercritical Gas', color: 'text-indigo-400', bg: 'bg-indigo-900/30' };
    }
    const vm = volume / moles;
    if (vm < selectedGas.Vc * 0.9) {
      return { name: 'Compressed Liquid', color: 'text-blue-400', bg: 'bg-blue-900/30' };
    }
    if (vm > selectedGas.Vc * 2.5) {
      return { name: 'Vapor / Gas', color: 'text-emerald-400', bg: 'bg-emerald-900/30' };
    }
    return { name: 'Two-Phase Coexistence Region', color: 'text-amber-400', bg: 'bg-amber-900/30' };
  }, [temperature, pVdw, volume, moles, selectedGas]);

  // Compute Van der Waals pressure function
  const calcVdwP = useCallback((V: number, T: number, n: number) => {
    const effV = V - n * b;
    if (effV <= 1e-8) return 5e7;
    return Math.max(0, (n * R * T) / effV - a * Math.pow(n / V, 2));
  }, [a, b]);

  // 2D Canvas rendering
  const render2D = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    const padLeft = 70;
    const padBottom = 50;
    const padTop = 30;
    const padRight = 30;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Grid ranges
    const vMin = moles * b * 1.05;
    const vMax = 0.003; // m^3
    const pMax = Math.max(1.5e7, selectedGas.Pc * 2.2);

    const toScreenX = (v: number) => padLeft + ((v - vMin) / (vMax - vMin)) * plotW;
    const toScreenY = (p: number) => padTop + plotH - (Math.min(p, pMax) / pMax) * plotH;

    // Background grid
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#71717a';
    ctx.font = '11px sans-serif';

    const pTicks = 5;
    for (let i = 0; i <= pTicks; i++) {
      const pVal = (pMax / pTicks) * i;
      const y = toScreenY(pVal);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();

      const conv = pascalToUnit(pVal, unitSystem);
      ctx.textAlign = 'right';
      ctx.fillText(`${conv.value.toFixed(1)} ${conv.label}`, padLeft - 10, y + 4);
    }

    const vTicks = 5;
    for (let i = 0; i <= vTicks; i++) {
      const vVal = vMin + ((vMax - vMin) / vTicks) * i;
      const x = toScreenX(vVal);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.stroke();

      const conv = volumeToUnit(vVal, unitSystem);
      ctx.textAlign = 'center';
      ctx.fillText(`${conv.value.toFixed(1)} ${conv.label}`, x, padTop + plotH + 20);
    }

    // Axis labels
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Molar Volume V (${unitSystem === 'Imperial' ? 'in³' : 'L'})`, padLeft + plotW / 2, height - 10);
    
    ctx.save();
    ctx.translate(18, padTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`Pressure P (${unitSystem === 'Imperial' ? 'psi' : 'MPa'})`, 0, 0);
    ctx.restore();

    // Critical Isotherm Tc
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#f59e0b'; // amber
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const vVal = vMin + ((vMax - vMin) / steps) * i;
      const pVal = calcVdwP(vVal, selectedGas.Tc, moles);
      const x = toScreenX(vVal);
      const y = toScreenY(pVal);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Subcritical Isotherm 0.8 * Tc
    if (selectedGas.Tc * 0.85 < temperature) {
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = '#3b82f6'; // blue
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const vVal = vMin + ((vMax - vMin) / steps) * i;
        const pVal = calcVdwP(vVal, selectedGas.Tc * 0.85, moles);
        const x = toScreenX(vVal);
        const y = toScreenY(pVal);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Current Temperature Ideal Gas curve
    if (modelType === 'both' || modelType === 'ideal') {
      ctx.strokeStyle = '#64748b'; // slate
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const vVal = vMin + ((vMax - vMin) / steps) * i;
        const pVal = (moles * R * temperature) / vVal;
        const x = toScreenX(vVal);
        const y = toScreenY(pVal);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Current Temperature Van der Waals curve
    if (modelType === 'both' || modelType === 'vdw') {
      ctx.strokeStyle = '#06b6d4'; // cyan
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const vVal = vMin + ((vMax - vMin) / steps) * i;
        const pVal = calcVdwP(vVal, temperature, moles);
        const x = toScreenX(vVal);
        const y = toScreenY(pVal);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Critical Point marker
    const critX = toScreenX(selectedGas.Vc * moles);
    const critY = toScreenY(selectedGas.Pc);
    if (critX >= padLeft && critX <= padLeft + plotW && critY >= padTop && critY <= padTop + plotH) {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(critX, critY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.font = '10px sans-serif';
      ctx.fillText('Critical Point', critX + 8, critY - 6);
    }

    // Current State marker (V, P_vdw)
    const stateX = toScreenX(volume);
    const stateY = toScreenY(pVdw);
    if (stateX >= padLeft && stateX <= padLeft + plotW) {
      // Glow
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.beginPath();
      ctx.arc(stateX, stateY, 12, 0, Math.PI * 2);
      ctx.fill();

      // Center dot
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(stateX, stateY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Ideal state dot if showing both
      if (modelType === 'both') {
        const idealY = toScreenY(pIdeal);
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(stateX, idealY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Connecting departure line
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(stateX, stateY);
        ctx.lineTo(stateX, idealY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Legend
    const legX = width - 180;
    const legY = padTop + 10;
    ctx.fillStyle = 'rgba(24, 24, 27, 0.85)';
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1;
    ctx.fillRect(legX, legY, 170, 78);
    ctx.strokeRect(legX, legY, 170, 78);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#22d3ee';
    ctx.fillText('— van der Waals (T)', legX + 12, legY + 20);

    ctx.fillStyle = '#94a3b8';
    ctx.fillText('— Ideal Gas (T)', legX + 12, legY + 38);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText('-- Critical Isotherm (Tc)', legX + 12, legY + 56);

    ctx.fillStyle = '#ef4444';
    ctx.fillText(': ΔP Departure', legX + 12, legY + 70);
  }, [calcVdwP, modelType, moles, pIdeal, pVdw, selectedGas, temperature, unitSystem, volume]);

  // 3D Canvas rendering (Isometric PVT Surface mesh)
  const render3D = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2 + 30;
    const scale = Math.min(width, height) * 0.42;

    // 3D mesh grid points
    const vSteps = 22;
    const tSteps = 16;
    const vMin = moles * b * 1.1;
    const vMax = 0.0035;
    const tMin = 120;
    const tMax = 900;
    const pMax = selectedGas.Pc * 3.0;

    // 3D projection helper
    const project = (vx: number, vy: number, vz: number) => {
      // Normalize to [-1, 1]
      const nx = ((vx - vMin) / (vMax - vMin)) * 2 - 1;
      const ny = ((vy - tMin) / (tMax - tMin)) * 2 - 1;
      const nz = (Math.min(vz, pMax) / pMax) * 2 - 1;

      // Rotate around Y and X
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const x1 = nx * cosY - ny * sinY;
      const y1 = nx * sinY + ny * cosY;
      const z1 = nz;

      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;

      return {
        px: cx + x1 * scale,
        py: cy - z2 * scale,
        depth: y2
      };
    };

    // Draw coordinate box
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1;
    const corners = [
      project(vMin, tMin, 0),
      project(vMax, tMin, 0),
      project(vMax, tMax, 0),
      project(vMin, tMax, 0),
      project(vMin, tMin, pMax),
      project(vMax, tMin, pMax),
      project(vMax, tMax, pMax),
      project(vMin, tMax, pMax)
    ];

    // Base square
    ctx.beginPath();
    ctx.moveTo(corners[0].px, corners[0].py);
    ctx.lineTo(corners[1].px, corners[1].py);
    ctx.lineTo(corners[2].px, corners[2].py);
    ctx.lineTo(corners[3].px, corners[3].py);
    ctx.closePath();
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '11px sans-serif';
    ctx.fillText('Volume (V)', corners[1].px + 10, corners[1].py);
    ctx.fillText('Temp (T)', corners[3].px - 35, corners[3].py + 15);
    ctx.fillText('Pressure (P)', corners[4].px - 20, corners[4].py - 10);

    // Compute surface grid
    const grid: { px: number; py: number; depth: number; p: number }[][] = [];
    for (let ti = 0; ti <= tSteps; ti++) {
      grid[ti] = [];
      const tVal = tMin + ((tMax - tMin) / tSteps) * ti;
      for (let vi = 0; vi <= vSteps; vi++) {
        const vVal = vMin + ((vMax - vMin) / vSteps) * vi;
        const pVal = calcVdwP(vVal, tVal, moles);
        grid[ti][vi] = {
          ...project(vVal, tVal, pVal),
          p: pVal
        };
      }
    }

    // Draw surface wireframe / shaded quads
    for (let ti = 0; ti < tSteps; ti++) {
      for (let vi = 0; vi < vSteps; vi++) {
        const p00 = grid[ti][vi];
        const p10 = grid[ti + 1][vi];
        const p11 = grid[ti + 1][vi + 1];
        const p01 = grid[ti][vi + 1];

        const avgP = (p00.p + p10.p + p11.p + p01.p) / (4 * pMax);
        const normP = Math.min(1, Math.max(0, avgP));

        // Color based on pressure height (from dark blue/purple to bright cyan/yellow)
        const rVal = Math.floor(14 + normP * 200);
        const gVal = Math.floor(116 + normP * 80);
        const bVal = Math.floor(144 + (1 - normP) * 100);

        ctx.fillStyle = `rgba(${rVal}, ${gVal}, ${bVal}, 0.65)`;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 0.8;

        ctx.beginPath();
        ctx.moveTo(p00.px, p00.py);
        ctx.lineTo(p10.px, p10.py);
        ctx.lineTo(p11.px, p11.py);
        ctx.lineTo(p01.px, p01.py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // Operating point in 3D
    const statePt = project(volume, temperature, pVdw);
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(statePt.px, statePt.py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('Operating State', statePt.px + 10, statePt.py - 5);
  }, [calcVdwP, moles, b, selectedGas.Pc, rotY, rotX, volume, temperature, pVdw]);

  // Main canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    if (viewMode === '2d') {
      render2D(ctx, width, height);
    } else {
      render3D(ctx, width, height);
    }
  }, [viewMode, render2D, render3D]);

  // Canvas mouse handlers for 3D rotation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewMode !== '3d') return;
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || viewMode !== '3d') return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    setRotY(prev => prev + dx * 0.01);
    setRotX(prev => Math.max(-1.2, Math.min(1.2, prev + dy * 0.01)));
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Gas Selector & Mode Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-zinc-300">Working Gas:</label>
          <select
            value={selectedGasId}
            onChange={e => setSelectedGasId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500"
          >
            {GAS_SPECIES.map(gas => (
              <option key={gas.id} value={gas.id}>
                {gas.name} ({gas.formula})
              </option>
            ))}
          </select>
          <span className="text-xs text-zinc-400 hidden sm:inline-block max-w-xs truncate">
            {selectedGas.description}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 2D / 3D View Toggle */}
          <div className="flex rounded-lg bg-zinc-800 p-0.5 border border-zinc-700">
            <button
              onClick={() => setViewMode('2d')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === '2d' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              2D Isotherms
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === '3d' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              3D PVT Surface
            </button>
          </div>

          {/* Model Toggle (2D only) */}
          {viewMode === '2d' && (
            <div className="flex rounded-lg bg-zinc-800 p-0.5 border border-zinc-700">
              <button
                onClick={() => setModelType('both')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                  modelType === 'both' ? 'bg-zinc-700 text-white' : 'text-zinc-400'
                }`}
              >
                Both
              </button>
              <button
                onClick={() => setModelType('vdw')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                  modelType === 'vdw' ? 'bg-zinc-700 text-cyan-400' : 'text-zinc-400'
                }`}
              >
                vdW
              </button>
              <button
                onClick={() => setModelType('ideal')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                  modelType === 'ideal' ? 'bg-zinc-700 text-zinc-300' : 'text-zinc-400'
                }`}
              >
                Ideal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Canvas Plot (Left) + Sliders & Metric Readouts (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Area */}
        <div className="lg:col-span-2 app-card p-4 flex flex-col items-center justify-center relative overflow-hidden bg-zinc-950/80 border border-zinc-800">
          <canvas
            ref={canvasRef}
            width={720}
            height={440}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full h-auto max-h-[440px] rounded-lg cursor-crosshair select-none"
          />

          {viewMode === '3d' && (
            <div className="absolute top-4 left-4 text-xs text-zinc-500 bg-zinc-900/80 px-2.5 py-1 rounded-md border border-zinc-800 backdrop-blur-sm pointer-events-none">
              Drag mouse to rotate 3D PVT surface
            </div>
          )}

          {/* Region Badge */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border border-zinc-700 ${phaseRegion.bg} ${phaseRegion.color}`}>
              {phaseRegion.name}
            </span>
          </div>
        </div>

        {/* Sliders & Numerical Readouts */}
        <div className="space-y-4">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="app-card p-3 bg-zinc-900/40 border border-zinc-800">
              <span className="text-xs text-zinc-400">van der Waals (P)</span>
              <div className="text-lg font-bold text-cyan-400 mt-1">
                {pascalToUnit(pVdw, unitSystem).value.toFixed(2)}{' '}
                <span className="text-xs font-normal text-zinc-400">{pascalToUnit(pVdw, unitSystem).label}</span>
              </div>
            </div>

            <div className="app-card p-3 bg-zinc-900/40 border border-zinc-800">
              <span className="text-xs text-zinc-400">Ideal Gas (P)</span>
              <div className="text-lg font-bold text-zinc-300 mt-1">
                {pascalToUnit(pIdeal, unitSystem).value.toFixed(2)}{' '}
                <span className="text-xs font-normal text-zinc-400">{pascalToUnit(pIdeal, unitSystem).label}</span>
              </div>
            </div>

            <div className="app-card p-3 bg-zinc-900/40 border border-zinc-800">
              <span className="text-xs text-zinc-400">Compressibility (Z)</span>
              <div className={`text-lg font-bold mt-1 ${compressibilityZ > 1.05 ? 'text-amber-400' : compressibilityZ < 0.95 ? 'text-blue-400' : 'text-emerald-400'}`}>
                {compressibilityZ.toFixed(3)}
              </div>
              <span className="text-[10px] text-zinc-500">Z = 1.0 for ideal</span>
            </div>

            <div className="app-card p-3 bg-zinc-900/40 border border-zinc-800">
              <span className="text-xs text-zinc-400">Departure (ΔP)</span>
              <div className="text-lg font-bold text-rose-400 mt-1">
                {departurePercent.toFixed(1)}%
              </div>
              <span className="text-[10px] text-zinc-500">Non-ideality deviation</span>
            </div>
          </div>

          {/* Interactive State Sliders */}
          <div className="app-card p-4 space-y-4 bg-zinc-900/30 border border-zinc-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>State Variables</span>
            </div>

            {/* Temperature Slider */}
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Temperature (T)</span>
                <span className="text-cyan-400 font-mono">
                  {kelvinToUnit(temperature, unitSystem).value.toFixed(1)} {kelvinToUnit(temperature, unitSystem).label} ({temperature.toFixed(0)} K)
                </span>
              </div>
              <input
                type="range"
                min={100}
                max={900}
                step={2}
                value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Volume Slider */}
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Volume (V)</span>
                <span className="text-cyan-400 font-mono">
                  {volumeToUnit(volume, unitSystem).value.toFixed(2)} {volumeToUnit(volume, unitSystem).label}
                </span>
              </div>
              <input
                type="range"
                min={0.0002}
                max={0.003}
                step={0.00005}
                value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Moles Slider */}
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Quantity (n)</span>
                <span className="text-cyan-400 font-mono">{moles.toFixed(2)} mol</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={3.0}
                step={0.05}
                value={moles}
                onChange={e => setMoles(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Custom a & b inputs if custom gas */}
            {selectedGas.id === 'custom' && (
              <div className="pt-2 border-t border-zinc-800 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-zinc-400">a (Pa·m⁶/mol²)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={customA}
                    onChange={e => setCustomA(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 mt-0.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400">b (m³/mol)</label>
                  <input
                    type="number"
                    step="0.000005"
                    value={customB}
                    onChange={e => setCustomB(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 mt-0.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-200"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Critical Constants Card */}
          <div className="app-card p-3 bg-zinc-900/20 border border-zinc-800 text-xs text-zinc-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>Critical Point Properties ({selectedGas.formula})</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
              <div>
                <span className="text-zinc-500 block">T_c</span>
                <span className="text-amber-400">{selectedGas.Tc.toFixed(1)} K</span>
              </div>
              <div>
                <span className="text-zinc-500 block">P_c</span>
                <span className="text-amber-400">{(selectedGas.Pc / 1e6).toFixed(2)} MPa</span>
              </div>
              <div>
                <span className="text-zinc-500 block">V_c</span>
                <span className="text-amber-400">{(selectedGas.Vc * 1000).toFixed(3)} L/mol</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
