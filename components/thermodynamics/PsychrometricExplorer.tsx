import React, { useState, useRef, useEffect } from 'react';
import { ThermoUnitSystem, HvacProcessType } from '../../types/thermodynamics';
import { calcPsychrometricState } from '../../data/thermoData';
import { Droplet, Wind, Sliders, CheckCircle2, Gauge } from 'lucide-react';

interface PsychrometricExplorerProps {
  unitSystem: ThermoUnitSystem;
}

export const PsychrometricExplorer: React.FC<PsychrometricExplorerProps> = ({ unitSystem: _unitSystem }) => {
  // Active HVAC Process
  const [selectedProcess, setSelectedProcess] = useState<HvacProcessType>('cooling-dehumidify');

  // Interactive State Point A (Inlet)
  const [inletTdb, setInletTdb] = useState<number>(32); // °C
  const [inletRH, setInletRH] = useState<number>(70); // %

  // Secondary point / Process parameters
  const [outletTdb, setOutletTdb] = useState<number>(14); // °C (cooling coil supply)
  const [outdoorAirRatio, setOutdoorAirRatio] = useState<number>(0.3); // 30% outdoor air mixing
  const [airflowCfm, setAirflowCfm] = useState<number>(1200); // CFM (cubic feet per minute)
  const [reheatEnabled, setReheatEnabled] = useState<boolean>(true);
  const [reheatTargetTdb, setReheatTargetTdb] = useState<number>(22); // °C

  // Canvas Ref
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Clicked inspector point
  const [inspectedState, setInspectedState] = useState<{
    Tdb: number;
    W: number;
    rh: number;
    Twb: number;
    Tdp: number;
    h: number;
    v: number;
    Pv: number;
  } | null>(null);

  // Calculate current inlet state
  const inletState = calcPsychrometricState(inletTdb, inletRH);

  // Calculate Process Endpoints
  let outletState = calcPsychrometricState(outletTdb, 100);
  let finalDeliveredState = outletState;
  let secondaryState = calcPsychrometricState(24, 50); // Default room return air

  if (selectedProcess === 'cooling-dehumidify') {
    // Chilled to outletTdb at saturation (100% RH)
    outletState = calcPsychrometricState(outletTdb, 98);
    // If reheat enabled, heat sensibly from outletState to reheatTargetTdb at constant W
    if (reheatEnabled) {
      // Find RH that matches reheatTargetTdb and outletState.W
      const PsatReheat = 0.61121 * Math.exp((17.67 * reheatTargetTdb) / (reheatTargetTdb + 243.5));
      const PvTarget = (outletState.W / 1000 * 101.325) / (0.62198 + outletState.W / 1000);
      const rhReheat = Math.min(100, Math.max(1, (PvTarget / PsatReheat) * 100));
      finalDeliveredState = calcPsychrometricState(reheatTargetTdb, rhReheat);
    } else {
      finalDeliveredState = outletState;
    }
  } else if (selectedProcess === 'evaporative-cooling') {
    // Follow constant wet-bulb / constant enthalpy from inlet
    // Target higher humidity (e.g. 75% RH evaporative pad saturation)
    const padRH = 75;
    // Approximated by finding T where h matches inlet.h
    const evapTdb = inletState.Twb + (inletTdb - inletState.Twb) * (1 - 0.85); // 85% pad effectiveness
    outletState = calcPsychrometricState(evapTdb, padRH);
    finalDeliveredState = outletState;
  } else if (selectedProcess === 'winter-heating') {
    // Winter inlet: cold dry air
    // Sensible heating to 22°C, then humidify to 50%
    const PsatHeated = 0.61121 * Math.exp((17.67 * 22) / (22 + 243.5));
    const PvInlet = (inletState.W / 1000 * 101.325) / (0.62198 + inletState.W / 1000);
    const rhSensible = Math.min(100, Math.max(1, (PvInlet / PsatHeated) * 100));
    outletState = calcPsychrometricState(22, rhSensible);
    finalDeliveredState = calcPsychrometricState(22, 50); // humidified to 50%
  } else if (selectedProcess === 'two-stream-mixing') {
    secondaryState = calcPsychrometricState(24, 50); // Room Return Air
    const mixedTdb = inletTdb * outdoorAirRatio + secondaryState.Tdb * (1 - outdoorAirRatio);
    const mixedW = inletState.W * outdoorAirRatio + secondaryState.W * (1 - outdoorAirRatio);
    // Find RH for mixed point
    const PsatMix = 0.61121 * Math.exp((17.67 * mixedTdb) / (mixedTdb + 243.5));
    const PvMix = (mixedW / 1000 * 101.325) / (0.62198 + mixedW / 1000);
    const rhMix = Math.min(100, Math.max(1, (PvMix / PsatMix) * 100));
    outletState = calcPsychrometricState(mixedTdb, rhMix);
    finalDeliveredState = outletState;
  }

  // Engineering Heat & Moisture Transfer Calculations
  // Mass flow rate: 1 CFM ≈ 0.0004719 m^3/s -> m_dot = CFM * 0.0004719 / v (kg/s)
  const airMassFlowKgS = (airflowCfm * 0.000471947) / (inletState.v || 0.85);
  // Total cooling/heating load (kW): q = m_dot * Delta_h
  const deltaH = Math.abs(inletState.h - outletState.h);
  const totalHeatKw = Math.round(airMassFlowKgS * deltaH * 10) / 10;
  // Sensible cooling: q_s = m_dot * c_p * Delta_T
  const sensibleHeatKw = Math.round(airMassFlowKgS * 1.006 * Math.abs(inletTdb - outletState.Tdb) * 10) / 10;
  // Latent cooling: q_l = q_total - q_s
  const latentHeatKw = Math.max(0, Math.round((totalHeatKw - sensibleHeatKw) * 10) / 10);
  const shr = totalHeatKw > 0 ? Math.min(1, Math.round((sensibleHeatKw / totalHeatKw) * 100) / 100) : 1;

  // Condensate water removal rate (L/hour): Delta_W (g/kg) * m_dot (kg/s) * 3.6 (kg/h -> L/h)
  const deltaW = Math.max(0, inletState.W - outletState.W);
  const condensateRateLph = Math.round((airMassFlowKgS * (deltaW / 1000) * 3600) * 10) / 10;

  // Chart Rendering
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padL = 45;
    const padR = 40;
    const padT = 30;
    const padB = 40;

    const tMin = -10;
    const tMax = 50;
    const wMin = 0;
    const wMax = 32;

    const xCoord = (t: number) => padL + ((t - tMin) / (tMax - tMin)) * (width - padL - padR);
    const yCoord = (w: number) => height - padB - ((w - wMin) / (wMax - wMin)) * (height - padT - padB);

    ctx.clearRect(0, 0, width, height);

    // Dark chart background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Grid lines for Dry Bulb Temp
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let t = -10; t <= 50; t += 10) {
      const x = xCoord(t);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, height - padB);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${t}°C`, x, height - padB + 16);
    }

    // Grid lines for Humidity Ratio W
    for (let w = 0; w <= 30; w += 5) {
      const y = yCoord(w);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(width - padR, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${w}`, padL - 8, y + 3);
    }

    // Axis Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Dry-Bulb Temperature T_db (°C)', (width + padL - padR) / 2, height - 10);

    ctx.save();
    ctx.translate(14, (height + padT - padB) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Humidity Ratio W (g / kg dry air)', 0, 0);
    ctx.restore();

    // Constant Relative Humidity (RH) Curves (10%, 20%, ..., 100%)
    const rhSteps = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    rhSteps.forEach(rh => {
      ctx.beginPath();
      let first = true;
      for (let t = -10; t <= 50; t += 1) {
        const state = calcPsychrometricState(t, rh);
        if (state.W <= wMax + 1) {
          const x = xCoord(t);
          const y = yCoord(state.W);
          if (first) {
            ctx.moveTo(x, y);
            first = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }

      if (rh === 100) {
        ctx.strokeStyle = '#38bdf8'; // Saturation curve in bright cyan
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Saturation label
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('100% Saturation', xCoord(16), yCoord(11.5) - 8);
      } else {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (rh % 20 === 0) {
          const tProbe = 38;
          const sProbe = calcPsychrometricState(tProbe, rh);
          if (sProbe.W < wMax) {
            ctx.fillStyle = '#64748b';
            ctx.font = '9px monospace';
            ctx.fillText(`${rh}%`, xCoord(tProbe) + 8, yCoord(sProbe.W) - 2);
          }
        }
      }
    });

    // Constant Wet Bulb / Enthalpy diagonal lines
    ctx.strokeStyle = '#1e293b';
    ctx.setLineDash([3, 4]);
    for (let tw = 0; tw <= 30; tw += 5) {
      const sSat = calcPsychrometricState(tw, 100);
      const x1 = xCoord(tw);
      const y1 = yCoord(sSat.W);
      // Extend down-right along approx h = const
      const x2 = xCoord(Math.min(50, tw + 18));
      const y2 = yCoord(Math.max(0, sSat.W - 8));
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // ASHRAE 55 Human Thermal Comfort Zone Shading
    // Summer: 23.5 - 27°C, 30% - 60% RH
    // Winter: 20 - 24°C, 30% - 60% RH
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 1;

    const cT1 = 20, cT2 = 27;
    const cW_bot1 = calcPsychrometricState(cT1, 30).W;
    const cW_top1 = calcPsychrometricState(cT1, 60).W;
    const cW_bot2 = calcPsychrometricState(cT2, 30).W;
    const cW_top2 = calcPsychrometricState(cT2, 60).W;

    ctx.beginPath();
    ctx.moveTo(xCoord(cT1), yCoord(cW_bot1));
    ctx.lineTo(xCoord(cT1), yCoord(cW_top1));
    ctx.lineTo(xCoord(cT2), yCoord(cW_top2));
    ctx.lineTo(xCoord(cT2), yCoord(cW_bot2));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.font = '10px sans-serif';
    ctx.fillText('Comfort Zone', xCoord(21), yCoord(cW_bot1 + 2));

    // Draw Active HVAC Process Path Lines
    const xIn = xCoord(inletState.Tdb);
    const yIn = yCoord(inletState.W);
    const xOut = xCoord(outletState.Tdb);
    const yOut = yCoord(outletState.W);

    if (selectedProcess === 'cooling-dehumidify') {
      // 1. Sensible cooling to dew point (horizontal left)
      const xDew = xCoord(inletState.Tdp);
      ctx.beginPath();
      ctx.moveTo(xIn, yIn);
      ctx.lineTo(xDew, yIn);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 2. Chilling along saturation line to outlet
      ctx.beginPath();
      ctx.moveTo(xDew, yIn);
      ctx.lineTo(xOut, yOut);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 3. Reheat path (if enabled)
      if (reheatEnabled) {
        const xFinal = xCoord(finalDeliveredState.Tdb);
        const yFinal = yCoord(finalDeliveredState.W);
        ctx.beginPath();
        ctx.moveTo(xOut, yOut);
        ctx.lineTo(xFinal, yFinal);
        ctx.strokeStyle = '#f59e0b';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (selectedProcess === 'evaporative-cooling') {
      // Adiabatic cooling line (down-left to up-right along h=const)
      ctx.beginPath();
      ctx.moveTo(xIn, yIn);
      ctx.lineTo(xOut, yOut);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (selectedProcess === 'winter-heating') {
      // Sensible heating (horizontal right)
      ctx.beginPath();
      ctx.moveTo(xIn, yIn);
      ctx.lineTo(xOut, yOut);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Humidification (vertical up)
      const xFinal = xCoord(finalDeliveredState.Tdb);
      const yFinal = yCoord(finalDeliveredState.W);
      ctx.beginPath();
      ctx.moveTo(xOut, yOut);
      ctx.lineTo(xFinal, yFinal);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else if (selectedProcess === 'two-stream-mixing') {
      const xSec = xCoord(secondaryState.Tdb);
      const ySec = yCoord(secondaryState.W);
      // Tie-line connecting streams
      ctx.beginPath();
      ctx.moveTo(xIn, yIn);
      ctx.lineTo(xSec, ySec);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // State Point Markers
    // Inlet Point (Red/Amber)
    ctx.beginPath();
    ctx.arc(xIn, yIn, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('Inlet Air', xIn + 8, yIn - 8);

    // Outlet / Delivered Point (Emerald/Cyan)
    const xDel = xCoord(finalDeliveredState.Tdb);
    const yDel = yCoord(finalDeliveredState.W);
    ctx.beginPath();
    ctx.arc(xDel, yDel, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('Delivered Air', xDel + 8, yDel - 8);

    // Inspected Point (if clicked)
    if (inspectedState) {
      const xi = xCoord(inspectedState.Tdb);
      const yi = yCoord(inspectedState.W);
      ctx.beginPath();
      ctx.arc(xi, yi, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ec4899';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`Probe (${inspectedState.Tdb}°C, ${inspectedState.rh}% RH)`, xi + 8, yi + 12);
    }
  }, [inletTdb, inletRH, outletTdb, reheatEnabled, reheatTargetTdb, selectedProcess, outdoorAirRatio, inspectedState]);

  // Click on canvas to place inspector probe
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const py = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const padL = 45;
    const padR = 40;
    const padT = 30;
    const padB = 40;

    const tMin = -10, tMax = 50;
    const wMin = 0, wMax = 32;

    const clickT = tMin + ((px - padL) / (canvas.width - padL - padR)) * (tMax - tMin);
    const clickW = wMax - ((py - padT) / (canvas.height - padT - padB)) * (wMax - wMin);

    if (clickT >= tMin && clickT <= tMax && clickW >= wMin && clickW <= wMax) {
      // Find approximate RH for (clickT, clickW)
      const Psat = 0.61121 * Math.exp((17.67 * clickT) / (clickT + 243.5));
      const Pv = (clickW / 1000 * 101.325) / (0.62198 + clickW / 1000);
      const approxRH = Math.min(100, Math.max(1, (Pv / Psat) * 100));

      setInspectedState(calcPsychrometricState(Math.round(clickT * 10) / 10, Math.round(approxRH * 10) / 10));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <Wind className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Psychrometric Chart & HVAC Air-Conditioner Simulator
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mollier psychrometric state trajectories, sensible & latent cooling, water condensation rates, and evaporative cooling.
            </p>
          </div>
        </div>

        {/* Unified HVAC Process Mode Selector */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          {([
            { id: 'cooling-dehumidify', label: 'AC Dehumidify' },
            { id: 'evaporative-cooling', label: 'Evaporative Swamp' },
            { id: 'winter-heating', label: 'Winter Heating' },
            { id: 'two-stream-mixing', label: 'Air Mixing' }
          ] as const).map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProcess(p.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedProcess === p.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/80 dark:border-slate-700 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart + Live HVAC Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Psychrometric Chart Canvas (Left 8 Cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Mollier Psychrometric Chart (101.325 kPa Standard Atmosphere)
            </span>
            <span className="text-xs text-slate-500">
              Click anywhere on chart to inspect state
            </span>
          </div>

          <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
            <canvas
              ref={chartCanvasRef}
              width={640}
              height={380}
              onClick={handleCanvasClick}
              className="w-full h-auto block cursor-crosshair"
            />
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 border-t border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Inlet State
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Delivered State
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded bg-emerald-500/20 border border-emerald-500/40 inline-block" /> ASHRAE 55 Comfort Zone
              </span>
            </div>
            <span className="font-mono text-slate-500 text-[10px]">P_atm = 101.3 kPa</span>
          </div>
        </div>

        {/* Live HVAC Performance & Moisture Readout (Right 4 Cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between shadow-sm">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
              <Gauge className="w-4 h-4 text-blue-500" />
              Air Handling Unit (AHU) Telemetry
            </h3>

            {/* Total Thermal Load */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Coil Thermal Load</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{totalHeatKw} kW (SHR {Math.round(shr * 100)}%)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200 dark:border-slate-700/50 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500">Sensible:</span>
                  <p className="font-mono font-medium text-slate-800 dark:text-slate-200">{sensibleHeatKw} kW</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Latent:</span>
                  <p className="font-mono font-medium text-slate-800 dark:text-slate-200">{latentHeatKw} kW</p>
                </div>
              </div>
            </div>

            {/* Condensate Water Extraction */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                  <Droplet className="w-3.5 h-3.5 text-sky-500" /> Condensation Rate
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{condensateRateLph} L/h</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Moisture extracted: {Math.round(condensateRateLph * 24)} L / day
              </p>
            </div>

            {/* Delivered Supply Air Condition */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
              <span className="text-[10px] uppercase font-semibold text-slate-500">
                Delivered Supply Air
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500">Temperature:</span>
                  <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">{finalDeliveredState.Tdb} °C</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Relative Humidity:</span>
                  <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">{finalDeliveredState.rh}% RH</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Dew Point:</span>
                  <p className="font-mono text-slate-700 dark:text-slate-300">{finalDeliveredState.Tdp} °C</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Enthalpy:</span>
                  <p className="font-mono text-slate-700 dark:text-slate-300">{finalDeliveredState.h} kJ/kg</p>
                </div>
              </div>
            </div>
          </div>

          {/* Clicked Probe Inspector Card - Clean Neutral Styling */}
          {inspectedState && (
            <div className="bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg text-xs space-y-1">
              <span className="text-[10px] font-semibold uppercase text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-blue-500" /> Inspected State Point
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                <span>T_db: {inspectedState.Tdb} °C</span>
                <span>RH: {inspectedState.rh}%</span>
                <span>T_wb: {inspectedState.Twb} °C</span>
                <span>T_dp: {inspectedState.Tdp} °C</span>
                <span>W: {inspectedState.W} g/kg</span>
                <span>h: {inspectedState.h} kJ/kg</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Sliders & Air Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          Air Handling Unit (AHU) Controls & Weather Conditions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Inlet Air Parameters */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300">Outdoor / Intake Air Condition</label>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Intake Temp (T_db)</span>
                  <span className="font-mono text-amber-400">{inletTdb} °C ({Math.round(inletTdb * 1.8 + 32)} °F)</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={45}
                  step={1}
                  value={inletTdb}
                  onChange={e => setInletTdb(parseInt(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Relative Humidity (RH)</span>
                  <span className="font-mono text-cyan-400">{inletRH}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={95}
                  step={1}
                  value={inletRH}
                  onChange={e => setInletRH(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Cooling Coil & Reheat Controls */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300">Coil Chilling & Air Reheat</label>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Chilled Water Coil Supply (T_coil)</span>
                  <span className="font-mono text-blue-400">{outletTdb} °C</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={20}
                  step={1}
                  value={outletTdb}
                  onChange={e => setOutletTdb(parseInt(e.target.value))}
                  className="w-full accent-blue-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
              </div>

              {selectedProcess === 'cooling-dehumidify' && (
                <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Comfort Reheat Coil:</span>
                    <button
                      onClick={() => setReheatEnabled(!reheatEnabled)}
                      className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                        reheatEnabled
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {reheatEnabled ? 'Reheat On' : 'Off'}
                    </button>
                  </div>
                  {reheatEnabled && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Target Room Temp</span>
                        <span className="font-mono text-amber-400">{reheatTargetTdb} °C</span>
                      </div>
                      <input
                        type="range"
                        min={18}
                        max={26}
                        step={1}
                        value={reheatTargetTdb}
                        onChange={e => setReheatTargetTdb(parseInt(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fan Airflow & Mixing */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300">Fan Capacity & Ducting</label>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Fan Volumetric Flow (CFM)</span>
                  <span className="font-mono text-slate-200">{airflowCfm} CFM ({Math.round(airflowCfm * 1.699)} m³/h)</span>
                </div>
                <input
                  type="range"
                  min={400}
                  max={4000}
                  step={100}
                  value={airflowCfm}
                  onChange={e => setAirflowCfm(parseInt(e.target.value))}
                  className="w-full accent-slate-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
              </div>

              {selectedProcess === 'two-stream-mixing' && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Outdoor Air Ratio (Ventilation)</span>
                    <span className="font-mono text-purple-400">{Math.round(outdoorAirRatio * 100)}% Fresh Air</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    value={outdoorAirRatio}
                    onChange={e => setOutdoorAirRatio(parseFloat(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
