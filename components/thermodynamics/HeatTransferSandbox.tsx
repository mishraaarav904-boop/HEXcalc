import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ThermoUnitSystem, ColormapType, BoundaryConditionType, HeatProbeInfo } from '../../types/thermodynamics';
import { HEAT_MATERIALS, kelvinToUnit } from '../../data/thermoData';
import { Play, Pause, RotateCcw, Paintbrush, Flame, Snowflake, Eraser, Crosshair } from 'lucide-react';

interface HeatTransferSandboxProps {
  unitSystem: ThermoUnitSystem;
}

const GRID_N = 64; // 64x64 grid
const DX = 0.002; // 2mm per cell -> 12.8 cm x 12.8 cm domain
const T_AMBIENT = 295.15; // 22 °C (room temp)

// Colormap generation
function getColor(tNorm: number, map: ColormapType): [number, number, number] {
  const c = Math.max(0, Math.min(1, tNorm));
  if (map === 'grayscale') {
    const v = Math.floor(c * 255);
    return [v, v, v];
  }
  if (map === 'coolwarm') {
    // Blue (0) -> White (0.5) -> Red (1)
    if (c < 0.5) {
      const u = c * 2;
      return [Math.floor(u * 255), Math.floor(u * 255), 255];
    } else {
      const u = (c - 0.5) * 2;
      return [255, Math.floor((1 - u) * 255), Math.floor((1 - u) * 255)];
    }
  }
  if (map === 'inferno') {
    // Black -> Purple -> Orange -> Yellow -> White
    const r = Math.floor(Math.sin(c * Math.PI * 0.8) * 255);
    const g = Math.floor(Math.pow(c, 2) * 230);
    const b = Math.floor(Math.cos(c * Math.PI * 0.5) * (c < 0.4 ? 180 : 40));
    return [r, g, b];
  }
  // Turbo colormap approximation
  const r = Math.floor(Math.sin(c * Math.PI * 0.9) * 255);
  const g = Math.floor(Math.sin((c - 0.25) * Math.PI) * 255);
  const b = Math.floor(Math.cos(c * Math.PI * 0.7) * 255);
  return [Math.max(0, r), Math.max(0, g), Math.max(0, b)];
}

export const HeatTransferSandbox: React.FC<HeatTransferSandboxProps> = ({ unitSystem }) => {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [activeTool, setActiveTool] = useState<'heat' | 'cold' | 'material' | 'eraser'>('heat');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('copper');
  const [brushSize, setBrushSize] = useState<number>(2); // radius in cells
  const [brushTemp, setBrushTemp] = useState<number>(450); // K for heat brush
  const [coldTemp] = useState<number>(275); // K for cold brush
  const [boundaryCond, setBoundaryCond] = useState<BoundaryConditionType>('ambient');
  const [colormap, setColormap] = useState<ColormapType>('turbo');
  
  // Probe info
  const [probe, setProbe] = useState<HeatProbeInfo | null>(null);

  // Simulation buffers
  const gridTempRef = useRef<Float32Array>(new Float32Array(GRID_N * GRID_N));
  const nextTempRef = useRef<Float32Array>(new Float32Array(GRID_N * GRID_N));
  const matGridRef = useRef<Uint8Array>(new Uint8Array(GRID_N * GRID_N)); // Material index
  const fixedSourceRef = useRef<Uint8Array>(new Uint8Array(GRID_N * GRID_N)); // 1 if fixed source
  const fixedTempValRef = useRef<Float32Array>(new Float32Array(GRID_N * GRID_N));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPaintingRef = useRef<boolean>(false);
  const reqIdRef = useRef<number>(0);

  // Material property lookup arrays
  const matDiffusivity = useRef<Float32Array>(new Float32Array(HEAT_MATERIALS.length));
  const matConductivity = useRef<Float32Array>(new Float32Array(HEAT_MATERIALS.length));

  useEffect(() => {
    HEAT_MATERIALS.forEach((m, idx) => {
      matDiffusivity.current[idx] = m.alpha;
      matConductivity.current[idx] = m.k;
    });
  }, []);

  // Initialize domain to ambient
  const resetDomain = useCallback(() => {
    for (let i = 0; i < GRID_N * GRID_N; i++) {
      gridTempRef.current[i] = T_AMBIENT;
      nextTempRef.current[i] = T_AMBIENT;
      matGridRef.current[i] = 4; // default to air/water
      fixedSourceRef.current[i] = 0;
    }
  }, []);

  // Preset: CPU Heat Sink with Aluminum Fins
  const loadCpuPreset = useCallback(() => {
    resetDomain();
    const airIdx = HEAT_MATERIALS.findIndex(m => m.id === 'air') || 5;
    const copperIdx = HEAT_MATERIALS.findIndex(m => m.id === 'copper') || 0;
    const alumIdx = HEAT_MATERIALS.findIndex(m => m.id === 'aluminum') || 1;

    // Fill all with air
    for (let i = 0; i < GRID_N * GRID_N; i++) {
      matGridRef.current[i] = airIdx;
      gridTempRef.current[i] = T_AMBIENT;
    }

    // Copper base spreader at bottom
    for (let y = GRID_N - 14; y < GRID_N - 4; y++) {
      for (let x = 12; x < GRID_N - 12; x++) {
        matGridRef.current[y * GRID_N + x] = copperIdx;
      }
    }

    // CPU Heat Die source at very bottom center
    for (let y = GRID_N - 4; y < GRID_N - 1; y++) {
      for (let x = 24; x < GRID_N - 24; x++) {
        const idx = y * GRID_N + x;
        matGridRef.current[idx] = copperIdx;
        fixedSourceRef.current[idx] = 1;
        fixedTempValRef.current[idx] = 380; // 107 °C hot CPU die
        gridTempRef.current[idx] = 380;
      }
    }

    // 5 Aluminum Fins rising upwards
    const finX = [14, 22, 31, 40, 48];
    finX.forEach(fx => {
      for (let y = 10; y < GRID_N - 14; y++) {
        for (let w = 0; w < 3; w++) {
          matGridRef.current[y * GRID_N + (fx + w)] = alumIdx;
        }
      }
    });
  }, [resetDomain]);

  // Initial load
  useEffect(() => {
    loadCpuPreset();
  }, [loadCpuPreset]);

  // Solver Step: 2D Explicit Finite-Difference
  const stepSimulation = useCallback(() => {
    const cur = gridTempRef.current;
    const next = nextTempRef.current;
    const mat = matGridRef.current;
    const isFixed = fixedSourceRef.current;
    const fixedVal = fixedTempValRef.current;

    // Max stable dt: dt <= dx^2 / (4 * alpha_max)
    const maxAlpha = 1.16e-4; // Copper alpha
    const dt = (DX * DX) / (4.5 * maxAlpha); // strictly stable

    for (let y = 0; y < GRID_N; y++) {
      for (let x = 0; x < GRID_N; x++) {
        const idx = y * GRID_N + x;

        // If cell is fixed heat source or sink
        if (isFixed[idx]) {
          next[idx] = fixedVal[idx];
          continue;
        }

        const mIdx = mat[idx];
        const alpha = matDiffusivity.current[mIdx] || 1e-6;

        // Neighbor temperatures with boundary conditions
        const left = x > 0 ? cur[idx - 1] : boundaryCond === 'ambient' ? T_AMBIENT : cur[idx];
        const right = x < GRID_N - 1 ? cur[idx + 1] : boundaryCond === 'ambient' ? T_AMBIENT : cur[idx];
        const top = y > 0 ? cur[idx - GRID_N] : boundaryCond === 'ambient' ? T_AMBIENT : cur[idx];
        const bottom = y < GRID_N - 1 ? cur[idx + GRID_N] : boundaryCond === 'ambient' ? T_AMBIENT : cur[idx];

        // Laplacian d^2T/dx^2 + d^2T/dy^2
        const laplacian = (left + right + top + bottom - 4 * cur[idx]) / (DX * DX);

        next[idx] = cur[idx] + alpha * laplacian * dt;
      }
    }

    // Swap buffers
    gridTempRef.current.set(next);
  }, [boundaryCond]);

  // Paint onto grid
  const applyPaint = (cellX: number, cellY: number) => {
    const matIdx = HEAT_MATERIALS.findIndex(m => m.id === selectedMaterialId);
    const r = brushSize;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          const gx = cellX + dx;
          const gy = cellY + dy;
          if (gx >= 0 && gx < GRID_N && gy >= 0 && gy < GRID_N) {
            const idx = gy * GRID_N + gx;
            if (activeTool === 'heat') {
              fixedSourceRef.current[idx] = 1;
              fixedTempValRef.current[idx] = brushTemp;
              gridTempRef.current[idx] = brushTemp;
            } else if (activeTool === 'cold') {
              fixedSourceRef.current[idx] = 1;
              fixedTempValRef.current[idx] = coldTemp;
              gridTempRef.current[idx] = coldTemp;
            } else if (activeTool === 'material') {
              matGridRef.current[idx] = matIdx >= 0 ? matIdx : 0;
            } else if (activeTool === 'eraser') {
              fixedSourceRef.current[idx] = 0;
              gridTempRef.current[idx] = T_AMBIENT;
            }
          }
        }
      }
    }
  };

  // Canvas mouse handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isPaintingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * GRID_N);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * GRID_N);
    applyPaint(x, y);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cellX = Math.floor(((e.clientX - rect.left) / rect.width) * GRID_N);
    const cellY = Math.floor(((e.clientY - rect.top) / rect.height) * GRID_N);

    if (isPaintingRef.current) {
      applyPaint(cellX, cellY);
    }

    // Update hover probe
    if (cellX >= 0 && cellX < GRID_N && cellY >= 0 && cellY < GRID_N) {
      const idx = cellY * GRID_N + cellX;
      const cur = gridTempRef.current;
      const temp = cur[idx];

      const left = cellX > 0 ? cur[idx - 1] : temp;
      const right = cellX < GRID_N - 1 ? cur[idx + 1] : temp;
      const top = cellY > 0 ? cur[idx - GRID_N] : temp;
      const bottom = cellY < GRID_N - 1 ? cur[idx + GRID_N] : temp;

      const gradX = (right - left) / (2 * DX);
      const gradY = (bottom - top) / (2 * DX);
      const gradMag = Math.sqrt(gradX * gradX + gradY * gradY);

      const mIdx = matGridRef.current[idx];
      const k = matConductivity.current[mIdx] || 1.0;
      const fluxX = -k * gradX;
      const fluxY = -k * gradY;
      const fluxMag = Math.sqrt(fluxX * fluxX + fluxY * fluxY);

      setProbe({
        x: cellX,
        y: cellY,
        temperature: temp,
        gradMagnitude: gradMag,
        fluxMagnitude: fluxMag,
        fluxX,
        fluxY
      });
    }
  };

  const handleCanvasMouseUp = () => {
    isPaintingRef.current = false;
  };

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(GRID_N, GRID_N);

    const render = () => {
      if (isRunning) {
        // Step 4 sub-iterations per animation frame for smooth diffusion rate
        for (let s = 0; s < 4; s++) {
          stepSimulation();
        }
      }

      const cur = gridTempRef.current;
      const tMin = 270;
      const tMax = 460;

      for (let i = 0; i < GRID_N * GRID_N; i++) {
        const t = cur[i];
        const normT = (t - tMin) / (tMax - tMin);
        const [r, g, b] = getColor(normT, colormap);
        const pIdx = i * 4;
        imgData.data[pIdx] = r;
        imgData.data[pIdx + 1] = g;
        imgData.data[pIdx + 2] = b;
        imgData.data[pIdx + 3] = 255;
      }

      // Draw pixel grid scaled up to canvas
      ctx.putImageData(imgData, 0, 0);
      ctx.drawImage(canvas, 0, 0, GRID_N, GRID_N, 0, 0, canvas.width, canvas.height);

      // Draw probe indicator arrow if hovering
      if (probe && canvas) {
        const scaleX = canvas.width / GRID_N;
        const scaleY = canvas.height / GRID_N;
        const px = probe.x * scaleX + scaleX / 2;
        const py = probe.y * scaleY + scaleY / 2;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(probe.x * scaleX, probe.y * scaleY, scaleX, scaleY);

        if (probe.fluxMagnitude > 50) {
          const arrowLen = Math.min(25, (probe.fluxMagnitude / 1000) * 15 + 6);
          const angle = Math.atan2(probe.fluxY, probe.fluxX);
          const endX = px + Math.cos(angle) * arrowLen;
          const endY = py + Math.sin(angle) * arrowLen;

          ctx.strokeStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Arrow tip
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(endX, endY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      reqIdRef.current = requestAnimationFrame(render);
    };

    reqIdRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(reqIdRef.current);
  }, [isRunning, stepSimulation, colormap, probe]);

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {/* Tool Buttons */}
          <button
            onClick={() => setActiveTool('heat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'heat' ? 'bg-rose-600 text-white shadow-sm' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Heat Source
          </button>
          <button
            onClick={() => setActiveTool('cold')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'cold' ? 'bg-blue-600 text-white shadow-sm' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Snowflake className="w-3.5 h-3.5" />
            Cold Sink
          </button>
          <button
            onClick={() => setActiveTool('material')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'material' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            Paint Material
          </button>
          <button
            onClick={() => setActiveTool('eraser')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'eraser' ? 'bg-zinc-600 text-white shadow-sm' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            Clear Cell
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Presets */}
          <button
            onClick={loadCpuPreset}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-zinc-700"
          >
            Load CPU Heat Sink
          </button>
          <button
            onClick={resetDomain}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
            title="Clear Domain"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Main Grid: Simulation Grid (Left) + Materials & Probe (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Sandbox */}
        <div className="lg:col-span-2 app-card p-4 flex flex-col items-center justify-center relative overflow-hidden bg-zinc-950/80 border border-zinc-800">
          <canvas
            ref={canvasRef}
            width={440}
            height={440}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className="rounded-lg shadow-xl cursor-crosshair border border-zinc-800"
          />

          {/* Colormap Legend Bar */}
          <div className="w-full max-w-[440px] mt-3 flex items-center justify-between text-[11px] text-zinc-400">
            <span>270 K (0 °C)</span>
            <div className="h-2.5 flex-1 mx-3 rounded-full overflow-hidden bg-gradient-to-r from-blue-600 via-emerald-500 via-amber-400 to-rose-600" />
            <span>460 K (187 °C)</span>
          </div>
        </div>

        {/* Controls & Probe Sidepanel */}
        <div className="space-y-4">
          {/* Live Probe Card */}
          <div className="app-card p-3.5 bg-zinc-900/40 border border-zinc-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              <span>Thermal Probe (Hover Cell)</span>
            </div>

            {probe ? (
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 font-mono">
                <div className="bg-zinc-800/60 p-2 rounded-lg">
                  <span className="text-zinc-500 block text-[10px]">Temperature</span>
                  <span className="text-cyan-400 font-bold text-sm">
                    {kelvinToUnit(probe.temperature, unitSystem).value.toFixed(1)}{' '}
                    {kelvinToUnit(probe.temperature, unitSystem).label}
                  </span>
                </div>
                <div className="bg-zinc-800/60 p-2 rounded-lg">
                  <span className="text-zinc-500 block text-[10px]">Heat Flux (|q|)</span>
                  <span className="text-amber-400 font-bold text-sm">
                    {probe.fluxMagnitude > 1000 ? `${(probe.fluxMagnitude / 1000).toFixed(1)} kW/m²` : `${probe.fluxMagnitude.toFixed(0)} W/m²`}
                  </span>
                </div>
                <div className="bg-zinc-800/60 p-2 rounded-lg col-span-2 flex justify-between">
                  <span className="text-zinc-400 text-[11px]">Temp Gradient (∇T):</span>
                  <span className="text-zinc-200 font-medium">
                    {probe.gradMagnitude.toFixed(1)} K/m
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 py-3 text-center">
                Hover over any cell on the grid to inspect local flux and temperature.
              </div>
            )}
          </div>

          {/* Material Selector Card */}
          {activeTool === 'material' && (
            <div className="app-card p-4 space-y-3 bg-zinc-900/30 border border-zinc-800">
              <span className="text-xs font-semibold text-zinc-200 block">Select Material to Paint</span>
              <div className="grid grid-cols-2 gap-2">
                {HEAT_MATERIALS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMaterialId(m.id)}
                    className={`p-2 rounded-lg text-left text-xs transition-colors border ${
                      selectedMaterialId === m.id
                        ? 'border-cyan-500 bg-cyan-950/30'
                        : 'border-zinc-800 bg-zinc-800/50 hover:bg-zinc-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-medium text-zinc-200">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                      <span className="truncate">{m.name.split(' ')[0]}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">
                      k = {m.k} W/m·K
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Brush & Boundary Settings */}
          <div className="app-card p-4 space-y-3 bg-zinc-900/30 border border-zinc-800">
            <span className="text-xs font-semibold text-zinc-200 block">Simulation Settings</span>

            {/* Brush Size */}
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Brush Radius</span>
                <span className="text-cyan-400">{brushSize} px</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={brushSize}
                onChange={e => setBrushSize(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Heat Source Temp */}
            {activeTool === 'heat' && (
              <div>
                <div className="flex justify-between text-xs text-zinc-400 mb-1">
                  <span>Source Temp</span>
                  <span className="text-rose-400 font-mono">
                    {kelvinToUnit(brushTemp, unitSystem).value.toFixed(0)} {kelvinToUnit(brushTemp, unitSystem).label}
                  </span>
                </div>
                <input
                  type="range"
                  min={310}
                  max={600}
                  step={5}
                  value={brushTemp}
                  onChange={e => setBrushTemp(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>
            )}

            {/* Boundary Condition */}
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Boundary Condition</label>
              <select
                value={boundaryCond}
                onChange={e => setBoundaryCond(e.target.value as BoundaryConditionType)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-200"
              >
                <option value="ambient">Constant Ambient Air (Dirichlet 22 °C)</option>
                <option value="insulated">Insulated Walls (Neumann dT/dn = 0)</option>
              </select>
            </div>

            {/* Colormap */}
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Colormap</label>
              <select
                value={colormap}
                onChange={e => setColormap(e.target.value as ColormapType)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-200"
              >
                <option value="turbo">Turbo (Scientific Rainbow)</option>
                <option value="inferno">Inferno (Thermal Blackbody)</option>
                <option value="coolwarm">Cool-Warm (Diverging)</option>
                <option value="grayscale">Grayscale</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
