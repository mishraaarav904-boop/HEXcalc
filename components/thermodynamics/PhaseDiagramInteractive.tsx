import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ThermoUnitSystem, PhaseDiagramSubstance } from '../../types/thermodynamics';
import { PHASE_SUBSTANCES, kelvinToUnit, pascalToUnit } from '../../data/thermoData';
import { Droplet, Info, Move } from 'lucide-react';

interface PhaseDiagramProps {
  unitSystem: ThermoUnitSystem;
}

export const PhaseDiagramInteractive: React.FC<PhaseDiagramProps> = ({ unitSystem }) => {
  const [substanceId, setSubstanceId] = useState<string>('h2o');
  
  // Current interactive state point: T in K, P in Pa
  const [stateT, setStateT] = useState<number>(300); // 300 K
  const [stateP, setStateP] = useState<number>(101325); // 1 atm

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  const substance: PhaseDiagramSubstance = useMemo(() => {
    return PHASE_SUBSTANCES.find(s => s.id === substanceId) || PHASE_SUBSTANCES[0];
  }, [substanceId]);

  // Diagram axis bounds
  const T_MIN = substance.id === 'n2' ? 40 : substance.id === 'co2' ? 140 : 200;
  const T_MAX = substance.id === 'n2' ? 180 : substance.id === 'co2' ? 380 : 750;
  const LOG_P_MIN = 2; // 100 Pa = 1 mbar
  const LOG_P_MAX = 8.5; // ~316 MPa

  // Physical phase boundary curves calculation
  // 1. Sublimation curve: from T_MIN to T_triple
  // Clausius-Clapeyron: ln(P/Pt) = - (L_sub / R) * (1/T - 1/Tt)
  const calcSublimationP = useCallback((t: number) => {
    const { T: Tt, P: Pt } = substance.triplePoint;
    const lSub = substance.latentHeatFusion + substance.latentHeatVaporization; // kJ/kg
    const factor = (lSub * 1000) / 461; // gas const approx
    return Pt * Math.exp(-factor * (1 / t - 1 / Tt));
  }, [substance]);

  // 2. Vaporization curve: from T_triple to T_critical
  // Antoine / Clausius-Clapeyron form
  const calcVaporizationP = useCallback((t: number) => {
    const { T: Tt, P: Pt } = substance.triplePoint;
    const { T: Tc, P: Pc } = substance.criticalPoint;
    if (t < Tt) return Pt;
    if (t > Tc) return Pc;
    const factor = Math.log(Pc / Pt) / (1 / Tt - 1 / Tc);
    return Pt * Math.exp(-factor * (1 / t - 1 / Tt));
  }, [substance]);

  // Determine current phase of state (T, P)
  const currentPhase = useMemo(() => {
    const { T: Tt, P: Pt } = substance.triplePoint;
    const { T: Tc, P: Pc } = substance.criticalPoint;

    // Supercritical fluid: T > Tc and P > Pc
    if (stateT > Tc && stateP > Pc) {
      return {
        name: 'Supercritical Fluid',
        color: 'text-purple-400',
        bg: 'bg-purple-900/30',
        border: 'border-purple-700',
        desc: 'Diffuses like a gas with the dense dissolving power of a liquid. No distinct surface tension.'
      };
    }
    if (stateT > Tc) {
      return {
        name: 'Supercritical Vapor',
        color: 'text-indigo-400',
        bg: 'bg-indigo-900/30',
        border: 'border-indigo-700',
        desc: 'Gas at supercritical temperature, cannot be condensed into a liquid regardless of pressure.'
      };
    }

    if (stateT < Tt) {
      // Below triple point temp
      const pSub = calcSublimationP(stateT);
      if (stateP > pSub) {
        return {
          name: 'Solid Phase',
          color: 'text-blue-400',
          bg: 'bg-blue-900/30',
          border: 'border-blue-700',
          desc: `Solid crystalline structure (${substance.id === 'h2o' ? 'Ice Ih' : substance.id === 'co2' ? 'Dry Ice' : 'Solid N₂'}).`
        };
      } else {
        return {
          name: 'Gas / Vapor',
          color: 'text-emerald-400',
          bg: 'bg-emerald-900/30',
          border: 'border-emerald-700',
          desc: 'Low pressure gas phase below triple point. Directly deposits to solid if compressed.'
        };
      }
    }

    // Between Tt and Tc
    const pVap = calcVaporizationP(stateT);
    
    // Melting curve check
    let isSolid = false;
    if (substance.hasNegativeMeltingSlope) {
      // For Water: melting line slopes left! P increases as T decreases below Tt
      // High pressure melts ice into water!
      const slope = -1.35e7; // Pa/K
      const pMelt = Pt + slope * (stateT - Tt);
      if (stateT <= Tt && stateP < pMelt) {
        isSolid = true;
      }
    } else {
      // Normal substance (CO2, N2): melting line slopes right
      const slope = 4.0e6;
      const pMelt = Pt + slope * (stateT - Tt);
      if (stateP > pMelt) {
        isSolid = true;
      }
    }

    if (isSolid) {
      return {
        name: 'Solid Phase',
        color: 'text-blue-400',
        bg: 'bg-blue-900/30',
        border: 'border-blue-700',
        desc: 'Crystalline solid phase under high compression.'
      };
    }

    if (stateP > pVap) {
      return {
        name: 'Liquid Phase',
        color: 'text-cyan-400',
        bg: 'bg-cyan-900/30',
        border: 'border-cyan-700',
        desc: `Incompressible liquid phase. Latent heat of vaporization: ${substance.latentHeatVaporization} kJ/kg.`
      };
    } else {
      return {
        name: 'Vapor / Gas',
        color: 'text-emerald-400',
        bg: 'bg-emerald-900/30',
        border: 'border-emerald-700',
        desc: 'Superheated vapor or ideal gas phase. Condenses to liquid upon isobaric cooling.'
      };
    }
  }, [stateT, stateP, substance, calcSublimationP, calcVaporizationP]);

  // Coordinate transformations
  const toCanvasX = useCallback((t: number, padL: number, plotW: number) => {
    return padL + ((t - T_MIN) / (T_MAX - T_MIN)) * plotW;
  }, [T_MIN, T_MAX]);

  const toCanvasY = useCallback((p: number, padT: number, plotH: number) => {
    const logP = Math.log10(Math.max(10, p));
    return padT + plotH - ((logP - LOG_P_MIN) / (LOG_P_MAX - LOG_P_MIN)) * plotH;
  }, [LOG_P_MIN, LOG_P_MAX]);

  const fromCanvasCoords = useCallback((cx: number, cy: number, padL: number, padT: number, plotW: number, plotH: number) => {
    const normX = Math.max(0, Math.min(1, (cx - padL) / plotW));
    const normY = Math.max(0, Math.min(1, (padT + plotH - cy) / plotH));

    const t = T_MIN + normX * (T_MAX - T_MIN);
    const logP = LOG_P_MIN + normY * (LOG_P_MAX - LOG_P_MIN);
    const p = Math.pow(10, logP);

    return { t, p };
  }, [T_MIN, T_MAX, LOG_P_MIN, LOG_P_MAX]);

  // Canvas render function
  const renderDiagram = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    const padL = 75;
    const padB = 50;
    const padT = 30;
    const padR = 35;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const toX = (t: number) => toCanvasX(t, padL, plotW);
    const toY = (p: number) => toCanvasY(p, padT, plotH);

    // Background Grid
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#71717a';
    ctx.font = '10px sans-serif';

    // Log P grid (10^2 to 10^8)
    for (let logP = Math.ceil(LOG_P_MIN); logP <= Math.floor(LOG_P_MAX); logP++) {
      const pVal = Math.pow(10, logP);
      const y = toY(pVal);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();

      const conv = pascalToUnit(pVal, unitSystem);
      ctx.textAlign = 'right';
      ctx.fillText(`${conv.value.toFixed(0)} ${conv.label}`, padL - 8, y + 3);
    }

    // Temp T grid
    const tSteps = 6;
    for (let i = 0; i <= tSteps; i++) {
      const tVal = T_MIN + ((T_MAX - T_MIN) / tSteps) * i;
      const x = toX(tVal);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();

      const conv = kelvinToUnit(tVal, unitSystem);
      ctx.textAlign = 'center';
      ctx.fillText(`${conv.value.toFixed(0)} ${conv.label}`, x, padT + plotH + 18);
    }

    // Axis titles
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Temperature T (${unitSystem === 'Imperial' ? '°F' : '°C'})`, padL + plotW / 2, height - 10);

    ctx.save();
    ctx.translate(18, padT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Pressure P (Log Scale)', 0, 0);
    ctx.restore();

    // Shaded Phase Regions
    // Region labels
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    
    // Solid zone label
    ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.fillText('SOLID', toX(T_MIN + (substance.triplePoint.T - T_MIN) * 0.4), toY(1e6));

    // Liquid zone label
    ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
    const midLiqT = (substance.triplePoint.T + substance.criticalPoint.T) / 2;
    ctx.fillText('LIQUID', toX(midLiqT), toY(substance.criticalPoint.P * 0.7));

    // Gas zone label
    ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
    ctx.fillText('GAS / VAPOR', toX(T_MAX * 0.8), toY(2e4));

    // Supercritical zone label
    ctx.fillStyle = 'rgba(168, 85, 247, 0.35)';
    ctx.fillText('SUPERCRITICAL', toX(substance.criticalPoint.T * 1.1), toY(substance.criticalPoint.P * 1.8));

    // 1. Draw Sublimation Curve (Solid-Gas)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const { T: Tt, P: Pt } = substance.triplePoint;
    const { T: Tc, P: Pc } = substance.criticalPoint;
    
    const subSteps = 50;
    for (let i = 0; i <= subSteps; i++) {
      const t = T_MIN + ((Tt - T_MIN) / subSteps) * i;
      const p = calcSublimationP(t);
      const x = toX(t);
      const y = toY(p);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 2. Draw Vaporization Curve (Liquid-Gas) ending at Critical Point
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const vapSteps = 60;
    for (let i = 0; i <= vapSteps; i++) {
      const t = Tt + ((Tc - Tt) / vapSteps) * i;
      const p = calcVaporizationP(t);
      const x = toX(t);
      const y = toY(p);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 3. Draw Melting Curve (Solid-Liquid)
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(toX(Tt), toY(Pt));
    if (substance.hasNegativeMeltingSlope) {
      // Ice anomaly: slopes slightly backwards to the left
      ctx.lineTo(toX(Tt - 15), toY(Math.pow(10, LOG_P_MAX)));
    } else {
      ctx.lineTo(toX(Tt + 35), toY(Math.pow(10, LOG_P_MAX)));
    }
    ctx.stroke();

    // Critical Point dashed boundary lines
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    // Isochore Tc vertical line
    ctx.beginPath();
    ctx.moveTo(toX(Tc), toY(Pc));
    ctx.lineTo(toX(Tc), padT);
    ctx.stroke();
    // Isobar Pc horizontal line
    ctx.beginPath();
    ctx.moveTo(toX(Tc), toY(Pc));
    ctx.lineTo(padL + plotW, toY(Pc));
    ctx.stroke();
    ctx.setLineDash([]);

    // Triple Point marker
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(toX(Tt), toY(Pt), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Triple Point', toX(Tt) - 8, toY(Pt) - 4);

    // Critical Point marker
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(toX(Tc), toY(Pc), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8b4fe';
    ctx.textAlign = 'left';
    ctx.fillText('Critical Point', toX(Tc) + 8, toY(Pc) + 3);

    // Standard 1 atm isobar line
    const atmY = toY(101325);
    ctx.strokeStyle = '#52525b';
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(padL, atmY);
    ctx.lineTo(padL + plotW, atmY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#71717a';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('1 atm', padL - 8, atmY + 3);

    // Current State Point Reticle
    const curX = toX(stateT);
    const curY = toY(stateP);

    // Glow
    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.beginPath();
    ctx.arc(curX, curY, 14, 0, Math.PI * 2);
    ctx.fill();

    // Center point
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(curX, curY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Connecting dashed lines to axes
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(curX, curY);
    ctx.lineTo(curX, padT + plotH);
    ctx.moveTo(curX, curY);
    ctx.lineTo(padL, curY);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [toCanvasX, toCanvasY, T_MIN, T_MAX, LOG_P_MIN, LOG_P_MAX, substance, calcSublimationP, calcVaporizationP, stateT, stateP, unitSystem]);

  // Main canvas update
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderDiagram(ctx, canvas.width, canvas.height);
  }, [renderDiagram]);

  // Mouse drag handler for state point
  const updateStateFromMouse = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const padL = 75;
    const padB = 50;
    const padT = 30;
    const padR = 35;
    const plotW = canvas.width - padL - padR;
    const plotH = canvas.height - padT - padB;

    const mouseX = ((clientX - rect.left) / rect.width) * canvas.width;
    const mouseY = ((clientY - rect.top) / rect.height) * canvas.height;

    const { t, p } = fromCanvasCoords(mouseX, mouseY, padL, padT, plotW, plotH);
    setStateT(Math.round(t));
    setStateP(p);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    updateStateFromMouse(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      updateStateFromMouse(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="space-y-6">
      {/* Top Substance Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800">
        <div className="flex items-center gap-2">
          <Droplet className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-zinc-300">Substance:</span>
          {PHASE_SUBSTANCES.map(sub => (
            <button
              key={sub.id}
              onClick={() => {
                setSubstanceId(sub.id);
                // Reset to standard room temperature or appropriate initial state
                if (sub.id === 'n2') {
                  setStateT(100);
                  setStateP(101325);
                } else if (sub.id === 'co2') {
                  setStateT(260);
                  setStateP(101325);
                } else {
                  setStateT(320);
                  setStateP(101325);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                substanceId === sub.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {sub.name} ({sub.formula})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Move className="w-3.5 h-3.5 text-rose-400" />
          <span>Click or drag red dot on diagram to explore phase changes</span>
        </div>
      </div>

      {/* Main Grid: Interactive P-T Diagram (Left) + Phase Info Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Diagram */}
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

          {/* Current Phase Badge */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${currentPhase.bg} ${currentPhase.color} ${currentPhase.border}`}>
              {currentPhase.name}
            </span>
          </div>
        </div>

        {/* State Information & Phase Transitions */}
        <div className="space-y-4">
          {/* Current State Coordinates */}
          <div className="app-card p-4 space-y-3 bg-zinc-900/40 border border-zinc-800">
            <span className="text-xs font-semibold text-zinc-300 block">Current Operating State</span>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-800/60 p-2.5 rounded-lg">
                <span className="text-[10px] text-zinc-400 block">Temperature</span>
                <span className="text-base font-bold text-rose-400">
                  {kelvinToUnit(stateT, unitSystem).value.toFixed(1)}{' '}
                  <span className="text-xs font-normal text-zinc-400">{kelvinToUnit(stateT, unitSystem).label}</span>
                </span>
                <span className="text-[10px] text-zinc-500 block font-mono">{stateT} K</span>
              </div>

              <div className="bg-zinc-800/60 p-2.5 rounded-lg">
                <span className="text-[10px] text-zinc-400 block">Pressure</span>
                <span className="text-base font-bold text-cyan-400">
                  {pascalToUnit(stateP, unitSystem).value.toFixed(2)}{' '}
                  <span className="text-xs font-normal text-zinc-400">{pascalToUnit(stateP, unitSystem).label}</span>
                </span>
                <span className="text-[10px] text-zinc-500 block font-mono">{(stateP / 101325).toFixed(2)} atm</span>
              </div>
            </div>

            {/* Description */}
            <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/60 text-xs text-zinc-300 leading-relaxed">
              {currentPhase.desc}
            </div>
          </div>

          {/* Critical & Triple Point Data Card */}
          <div className="app-card p-4 space-y-3 bg-zinc-900/30 border border-zinc-800 text-xs text-zinc-300">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
              <Info className="w-4 h-4 text-amber-400" />
              <span>Reference Phase Constants ({substance.formula})</span>
            </div>

            <div className="space-y-2 pt-1 font-mono text-[11px]">
              <div className="flex justify-between p-2 rounded bg-zinc-800/50">
                <span className="text-zinc-400">Triple Point:</span>
                <span className="text-amber-400">
                  {substance.triplePoint.T.toFixed(2)} K, {pascalToUnit(substance.triplePoint.P, unitSystem).value.toFixed(1)} {pascalToUnit(substance.triplePoint.P, unitSystem).label}
                </span>
              </div>

              <div className="flex justify-between p-2 rounded bg-zinc-800/50">
                <span className="text-zinc-400">Critical Point:</span>
                <span className="text-purple-400">
                  {substance.criticalPoint.T.toFixed(1)} K, {(substance.criticalPoint.P / 1e6).toFixed(2)} MPa
                </span>
              </div>

              <div className="flex justify-between p-2 rounded bg-zinc-800/50">
                <span className="text-zinc-400">Normal Boiling (1 atm):</span>
                <span className="text-cyan-400">
                  {kelvinToUnit(substance.normalBoilingPoint, unitSystem).value.toFixed(1)} {kelvinToUnit(substance.normalBoilingPoint, unitSystem).label}
                </span>
              </div>

              <div className="flex justify-between p-2 rounded bg-zinc-800/50">
                <span className="text-zinc-400">Latent Heat of Vaporization:</span>
                <span className="text-emerald-400">{substance.latentHeatVaporization} kJ/kg</span>
              </div>

              <div className="flex justify-between p-2 rounded bg-zinc-800/50">
                <span className="text-zinc-400">Latent Heat of Fusion:</span>
                <span className="text-blue-400">{substance.latentHeatFusion} kJ/kg</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 italic mt-2">
              {substance.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
