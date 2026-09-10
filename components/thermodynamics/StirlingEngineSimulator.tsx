import React, { useState, useEffect, useRef } from 'react';
import { ThermoUnitSystem, StirlingEngineParams } from '../../types/thermodynamics';
import { kelvinToUnit, jouleToUnit } from '../../data/thermoData';
import { Play, Pause, RotateCcw, Sliders, Activity, Disc } from 'lucide-react';

interface StirlingEngineSimulatorProps {
  unitSystem: ThermoUnitSystem;
}

export const StirlingEngineSimulator: React.FC<StirlingEngineSimulatorProps> = ({ unitSystem }) => {
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Engine Parameters
  const [params, setParams] = useState<StirlingEngineParams>({
    Thot: 850, // K
    Tcold: 300, // K
    regeneratorEff: 0.92, // 92%
    compressionRatio: 2.2,
    workingFluid: 'He',
    loadTorque: 2.4, // N*m
    chargePressureBar: 12.0 // bar
  });

  // Canvas Refs
  const engineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pvCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Crank Angle and Animation State
  const crankAngleRef = useRef<number>(0);
  const animFrameIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  // Dynamic RPM calculation based on torque balance
  // Theoretical torque = W_net / (2 * pi), balance against loadTorque
  const nMoles = 0.08; // moles of working gas
  const R_gas = 8.314;
  const r = params.compressionRatio;
  const Th = params.Thot;
  const Tc = params.Tcold;
  const eps = params.regeneratorEff;

  // Cv for monatomic Helium / diatomic Air
  const Cv = params.workingFluid === 'Air' ? 20.8 : 12.47;

  // Ideal isothermal work: W_net = n * R * (Th - Tc) * ln(r)
  const W_ideal = nMoles * R_gas * (Th - Tc) * Math.log(r);
  // Real losses: regenerator reheat loss Q_loss = (1 - eps) * Cv * (Th - Tc) * nMoles
  const Q_reg_loss = (1 - eps) * Cv * (Th - Tc) * nMoles;
  const Qin_total = nMoles * R_gas * Th * Math.log(r) + Q_reg_loss;
  const W_net = Math.max(0, W_ideal * (0.85 + 0.15 * eps)); // Real mechanical flow friction factor
  const thermalEff = Qin_total > 0 ? Math.min(0.9, Math.max(0, W_net / Qin_total)) : 0;
  const carnotEff = 1 - Tc / Th;

  // Indicated engine torque = W_net / (2 * Math.PI)
  const indicatedTorque = W_net / (2 * Math.PI);
  // Net torque driving flywheel = indicatedTorque - loadTorque
  const netTorque = indicatedTorque - params.loadTorque;
  // Dynamic RPM: equilibrium where friction + load equals indicated torque
  const targetRpm = Math.max(0, Math.min(3000, Math.round(Math.max(0, netTorque) * 850 + (netTorque > 0 ? 300 : 0))));
  const isStalled = targetRpm <= 0;
  const mechanicalPowerW = Math.round(((2 * Math.PI * targetRpm) / 60) * params.loadTorque);

  // Main 60 FPS animation loop
  useEffect(() => {
    lastTimeRef.current = performance.now();

    const render = (time: number) => {
      const dt = Math.min(40, time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (isRunning && targetRpm > 0) {
        const dTheta = ((targetRpm * 360) / 60) * dt;
        crankAngleRef.current = (crankAngleRef.current + dTheta) % 360;
      }

      const thetaRad = (crankAngleRef.current * Math.PI) / 180;

      // -------------------------------------------------------------
      // 1. Draw Stirling Mechanical Cutaway (Engine Canvas)
      // -------------------------------------------------------------
      const eCanvas = engineCanvasRef.current;
      if (eCanvas) {
        const ctx = eCanvas.getContext('2d');
        if (ctx) {
          const W = eCanvas.width;
          const H = eCanvas.height;
          ctx.clearRect(0, 0, W, H);

          // Dark machine room background
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, W, H);

          // Flywheel center position
          const flyX = W * 0.72;
          const flyY = H * 0.52;
          const flyR = 55;
          const crankR = 24;

          // Hot Cylinder (Left) & Cold Cylinder (Center-Left)
          const hotCylX = 85;
          const coldCylX = 205;
          const cylY = 120;
          const cylW = 70;
          const cylH = 130;

          // Kinematic Piston Displacements (Alpha Stirling: 90° phase angle)
          const hotPistonDisp = Math.cos(thetaRad) * 22; // Hot expansion piston
          const coldPistonDisp = Math.cos(thetaRad - Math.PI / 2) * 22; // Cold compression piston

          // Hot Expansion Cylinder Body
          ctx.fillStyle = '#1e1b24';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.fillRect(hotCylX - cylW / 2, cylY, cylW, cylH);
          ctx.strokeRect(hotCylX - cylW / 2, cylY, cylW, cylH);

          // Hot Heater Cap & Burner Flames
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(hotCylX - cylW / 2 - 4, cylY - 14, cylW + 8, 14);

          // Pulsing burner flame underneath
          const flameH = 12 + Math.sin(time * 0.015) * 4;
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(hotCylX - 25, cylY - 14);
          ctx.lineTo(hotCylX - 10, cylY - 14 - flameH);
          ctx.lineTo(hotCylX + 5, cylY - 14 - flameH * 1.2);
          ctx.lineTo(hotCylX + 25, cylY - 14);
          ctx.fill();

          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`HEATER: ${Th} K`, hotCylX, cylY - 20);

          // Cold Compression Cylinder Body & Cooling Fins
          ctx.fillStyle = '#172554';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.fillRect(coldCylX - cylW / 2, cylY, cylW, cylH);
          ctx.strokeRect(coldCylX - cylW / 2, cylY, cylW, cylH);

          // Cooling Fins on cold cylinder
          ctx.fillStyle = '#0284c7';
          for (let f = 0; f < 4; f++) {
            ctx.fillRect(coldCylX + cylW / 2, cylY + 20 + f * 22, 10, 8);
            ctx.fillRect(coldCylX - cylW / 2 - 10, cylY + 20 + f * 22, 10, 8);
          }
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`COOLER: ${Tc} K`, coldCylX, cylY - 8);

          // Regenerator Tube & Wire Mesh Connecting Cylinders
          const tubeY = cylY + 25;
          ctx.fillStyle = '#334155';
          ctx.fillRect(hotCylX + cylW / 2, tubeY - 8, coldCylX - hotCylX - cylW, 16);

          // Regenerator Matrix Wire Mesh Shading
          const regX1 = hotCylX + cylW / 2 + 10;
          const regW = coldCylX - hotCylX - cylW - 20;
          ctx.fillStyle = '#475569';
          ctx.fillRect(regX1, tubeY - 8, regW, 16);

          // Gas flow color gradient across regenerator
          const grad = ctx.createLinearGradient(hotCylX + cylW / 2, tubeY, coldCylX - cylW / 2, tubeY);
          grad.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
          grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.8)');
          grad.addColorStop(1, 'rgba(56, 189, 248, 0.8)');
          ctx.fillStyle = grad;
          ctx.fillRect(regX1, tubeY - 6, regW, 12);

          ctx.fillStyle = '#cbd5e1';
          ctx.font = '9px sans-serif';
          ctx.fillText(`Regenerator (${Math.round(eps * 100)}%)`, (hotCylX + coldCylX) / 2, tubeY - 12);

          // Hot Piston Head
          const hotPistY = cylY + 50 + hotPistonDisp;
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(hotCylX - cylW / 2 + 4, hotPistY, cylW - 8, 22);

          // Cold Piston Head
          const coldPistY = cylY + 50 + coldPistonDisp;
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(coldCylX - cylW / 2 + 4, coldPistY, cylW - 8, 22);

          // Crank Pin Coordinates on Flywheel
          const crankPinX = flyX + Math.cos(thetaRad) * crankR;
          const crankPinY = flyY + Math.sin(thetaRad) * crankR;

          const crankPinX2 = flyX + Math.cos(thetaRad - Math.PI / 2) * crankR;
          const crankPinY2 = flyY + Math.sin(thetaRad - Math.PI / 2) * crankR;

          // Connecting Rods
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 3;

          // Hot connecting rod
          ctx.beginPath();
          ctx.moveTo(hotCylX, hotPistY + 22);
          ctx.lineTo(crankPinX, crankPinY);
          ctx.stroke();

          // Cold connecting rod
          ctx.beginPath();
          ctx.moveTo(coldCylX, coldPistY + 22);
          ctx.lineTo(crankPinX2, crankPinY2);
          ctx.stroke();

          // Rotating Flywheel & Counterweight
          ctx.beginPath();
          ctx.arc(flyX, flyY, flyR, 0, 2 * Math.PI);
          ctx.fillStyle = '#1e293b';
          ctx.fill();
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 4;
          ctx.stroke();

          // Flywheel Spokes
          for (let sp = 0; sp < 6; sp++) {
            const spAngle = thetaRad + (sp * Math.PI) / 3;
            ctx.beginPath();
            ctx.moveTo(flyX, flyY);
            ctx.lineTo(flyX + Math.cos(spAngle) * (flyR - 4), flyY + Math.sin(spAngle) * (flyR - 4));
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Center Flywheel Hub
          ctx.beginPath();
          ctx.arc(flyX, flyY, 10, 0, 2 * Math.PI);
          ctx.fillStyle = '#e2e8f0';
          ctx.fill();

          // Crankpins
          ctx.beginPath();
          ctx.arc(crankPinX, crankPinY, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#ef4444';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(crankPinX2, crankPinY2, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#38bdf8';
          ctx.fill();

          // Flywheel rotation status
          ctx.fillStyle = isStalled ? '#ef4444' : '#10b981';
          ctx.font = 'bold 11px monospace';
          ctx.fillText(isStalled ? 'STALLED (Load > Torque)' : `${targetRpm} RPM`, flyX, flyY + flyR + 20);
        }
      }

      // -------------------------------------------------------------
      // 2. Draw Live Synchronized P-V Indicator Diagram (PV Canvas)
      // -------------------------------------------------------------
      const pvCanvas = pvCanvasRef.current;
      if (pvCanvas) {
        const pCtx = pvCanvas.getContext('2d');
        if (pCtx) {
          const pW = pvCanvas.width;
          const pH = pvCanvas.height;
          pCtx.clearRect(0, 0, pW, pH);

          // Background
          pCtx.fillStyle = '#090d16';
          pCtx.fillRect(0, 0, pW, pH);

          const padL = 40, padR = 25, padT = 20, padB = 30;
          const vMin = 1.0, vMax = r;
          const pMin = 1.0, pMax = (Th / Tc) * r * 1.3;

          const toX = (v: number) => padL + ((v - vMin) / (vMax - vMin)) * (pW - padL - padR);
          const toY = (p: number) => pH - padB - ((p - pMin) / (pMax - pMin)) * (pH - padT - padB);

          // Grid & Axes
          pCtx.strokeStyle = '#1e293b';
          pCtx.lineWidth = 1;
          pCtx.strokeRect(padL, padT, pW - padL - padR, pH - padT - padB);

          pCtx.fillStyle = '#94a3b8';
          pCtx.font = '10px sans-serif';
          pCtx.fillText('V (Volume)', (pW + padL - padR) / 2, pH - 8);

          pCtx.save();
          pCtx.translate(14, (pH + padT - padB) / 2);
          pCtx.rotate(-Math.PI / 2);
          pCtx.fillText('P (Pressure)', 0, 0);
          pCtx.restore();

          // Four Theoretical Stirling Cycle States:
          // 1: (Vmin, P_max) at Th
          // 2: (Vmax, P2) at Th (Isothermal expansion)
          // 3: (Vmax, P3) at Tc (Isochoric cooling)
          // 4: (Vmin, P4) at Tc (Isothermal compression, followed by Isochoric heating to 1)
          const P1 = (Th / Tc) * r;
          const P2 = P1 / r;
          const P3 = P2 * (Tc / Th);
          const P4 = P3 * r;

          // Closed P-V Loop Shading
          pCtx.beginPath();
          pCtx.fillStyle = 'rgba(245, 158, 11, 0.15)';
          pCtx.strokeStyle = '#f59e0b';
          pCtx.lineWidth = 2.5;

          // Stage 1 -> 2: Isothermal expansion at Th
          for (let step = 0; step <= 20; step++) {
            const vStep = vMin + (step / 20) * (vMax - vMin);
            const pStep = (P1 * vMin) / vStep;
            if (step === 0) pCtx.moveTo(toX(vStep), toY(pStep));
            else pCtx.lineTo(toX(vStep), toY(pStep));
          }

          // Stage 2 -> 3: Isochoric cooling to Tc
          pCtx.lineTo(toX(vMax), toY(P3));

          // Stage 3 -> 4: Isothermal compression at Tc
          for (let step = 20; step >= 0; step--) {
            const vStep = vMin + (step / 20) * (vMax - vMin);
            const pStep = (P3 * vMax) / vStep;
            pCtx.lineTo(toX(vStep), toY(pStep));
          }

          // Stage 4 -> 1: Isochoric heating to Th
          pCtx.lineTo(toX(vMin), toY(P1));
          pCtx.closePath();
          pCtx.fill();
          pCtx.stroke();

          // Stage Point Labels
          pCtx.fillStyle = '#f59e0b';
          pCtx.font = 'bold 9px monospace';
          pCtx.fillText('1', toX(vMin) - 10, toY(P1));
          pCtx.fillText('2', toX(vMax) + 6, toY(P2));
          pCtx.fillText('3', toX(vMax) + 6, toY(P3) + 8);
          pCtx.fillText('4', toX(vMin) - 10, toY(P4) + 8);

          // Live Animated Operating Tracer Dot
          // Crank angle 0..360 maps around the closed thermodynamic curve
          let curV = vMin;
          let curP = P1;

          if (crankAngleRef.current < 90) {
            // Stage 1 -> 2 (Isothermal Expansion)
            const frac = crankAngleRef.current / 90;
            curV = vMin + frac * (vMax - vMin);
            curP = (P1 * vMin) / curV;
          } else if (crankAngleRef.current < 180) {
            // Stage 2 -> 3 (Isochoric Cooling)
            const frac = (crankAngleRef.current - 90) / 90;
            curV = vMax;
            curP = P2 - frac * (P2 - P3);
          } else if (crankAngleRef.current < 270) {
            // Stage 3 -> 4 (Isothermal Compression)
            const frac = (crankAngleRef.current - 180) / 90;
            curV = vMax - frac * (vMax - vMin);
            curP = (P3 * vMax) / curV;
          } else {
            // Stage 4 -> 1 (Isochoric Heating)
            const frac = (crankAngleRef.current - 270) / 90;
            curV = vMin;
            curP = P4 + frac * (P1 - P4);
          }

          pCtx.beginPath();
          pCtx.arc(toX(curV), toY(curP), 6, 0, 2 * Math.PI);
          pCtx.fillStyle = '#38bdf8';
          pCtx.fill();
          pCtx.strokeStyle = '#ffffff';
          pCtx.lineWidth = 2;
          pCtx.stroke();
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameIdRef.current);
  }, [isRunning, targetRpm, Th, Tc, r, eps, params.loadTorque, params.workingFluid]);

  // Conversions for UI display
  const dispTh = kelvinToUnit(Th, unitSystem);
  const dispTc = kelvinToUnit(Tc, unitSystem);
  const dispWork = jouleToUnit(W_net, unitSystem);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <Disc className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Stirling Engine & Thermomechanical Simulator
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Crankshaft kinematics, hot/cold cylinder shuttle, regenerator heat recovery, and synchronized P-V indicator tracer.
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm ${
              isRunning
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause' : 'Start'}</span>
          </button>

          <button
            onClick={() => {
              crankAngleRef.current = 0;
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
            title="Reset Crank Angle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Angle</span>
          </button>
        </div>
      </div>

      {/* Main Dual Stage: Mechanical Cutaway + P-V Indicator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Engine Mechanical Cutaway (Left 7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Alpha Stirling Cylinder Cutaway & Crankshaft
            </span>
            <span className="text-xs font-mono text-slate-500">
              Crank Offset: 90° · Working Gas: {params.workingFluid}
            </span>
          </div>

          <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex justify-center">
            <canvas
              ref={engineCanvasRef}
              width={560}
              height={340}
              className="w-full h-auto block"
            />
          </div>
        </div>

        {/* Live P-V Indicator Diagram (Right 5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-500" />
                Synchronized P-V Indicator Diagram
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">
                Real-time tracer
              </span>
            </div>

            <div className="bg-slate-950 rounded-lg p-2 border border-slate-800">
              <canvas
                ref={pvCanvasRef}
                width={360}
                height={200}
                className="w-full h-auto block"
              />
            </div>
          </div>

          {/* Efficiency & Power Metrics */}
          <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Thermal Efficiency</p>
              <p className="text-lg font-mono font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {(thermalEff * 100).toFixed(1)}%
              </p>
              <span className="text-[10px] text-slate-500 font-mono">
                Carnot: {(carnotEff * 100).toFixed(1)}%
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Brake Shaft Power</p>
              <p className="text-lg font-mono font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {mechanicalPowerW} <span className="text-xs font-normal text-slate-500">W</span>
              </p>
              <span className="text-[10px] text-slate-500 font-mono">
                {targetRpm} RPM @ {params.loadTorque} N·m
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Heater Temp</span>
          <p className="text-lg font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {dispTh.value.toFixed(0)} <span className="text-xs font-normal text-slate-500">{dispTh.label}</span>
          </p>
          <span className="text-[10px] text-slate-500 font-mono">{Th} K absolute</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Cooler Temp</span>
          <p className="text-lg font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {dispTc.value.toFixed(0)} <span className="text-xs font-normal text-slate-500">{dispTc.label}</span>
          </p>
          <span className="text-[10px] text-slate-500 font-mono">{Tc} K absolute</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Work per Cycle</span>
          <p className="text-lg font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {dispWork.value.toFixed(1)} <span className="text-xs font-normal text-slate-500">{dispWork.label}</span>
          </p>
          <span className="text-[10px] text-slate-500 font-mono">Loop area enclosed</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Regenerator</span>
          <p className="text-lg font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {Math.round(eps * 100)}%
          </p>
          <span className="text-[10px] text-slate-500 font-mono">Heat matrix recovery</span>
        </div>
      </div>

      {/* Engine Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          Stirling Operating Parameters & Mechanical Load
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Temperatures */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300">Heat Source & Sink Temperatures</label>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Hot Cylinder (T_H)</span>
                  <span className="font-mono text-rose-400">{Th} K ({Th - 273} °C)</span>
                </div>
                <input
                  type="range"
                  min={450}
                  max={1200}
                  step={25}
                  value={params.Thot}
                  onChange={e => setParams(p => ({ ...p, Thot: parseInt(e.target.value) }))}
                  className="w-full accent-rose-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Cold Cylinder (T_C)</span>
                  <span className="font-mono text-blue-400">{Tc} K ({Tc - 273} °C)</span>
                </div>
                <input
                  type="range"
                  min={150}
                  max={400}
                  step={10}
                  value={params.Tcold}
                  onChange={e => setParams(p => ({ ...p, Tcold: parseInt(e.target.value) }))}
                  className="w-full accent-blue-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Regenerator & Fluid */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300">Regenerator & Working Gas</label>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Regenerator Effectiveness</span>
                  <span className="font-mono text-cyan-400">{Math.round(params.regeneratorEff * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={0.99}
                  step={0.01}
                  value={params.regeneratorEff}
                  onChange={e => setParams(p => ({ ...p, regeneratorEff: parseFloat(e.target.value) }))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400">Working Gas:</span>
                <div className="flex rounded bg-slate-800 p-0.5 border border-slate-700">
                  {(['He', 'H2', 'Air'] as const).map(fluid => (
                    <button
                      key={fluid}
                      onClick={() => setParams(p => ({ ...p, workingFluid: fluid }))}
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded ${
                        params.workingFluid === fluid ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {fluid}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mechanical Load & Compression */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300">Mechanical Load & Compression</label>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Shaft Brake Torque</span>
                  <span className="font-mono text-emerald-400">{params.loadTorque.toFixed(1)} N·m</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={6.0}
                  step={0.2}
                  value={params.loadTorque}
                  onChange={e => setParams(p => ({ ...p, loadTorque: parseFloat(e.target.value) }))}
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Compression Ratio (r)</span>
                  <span className="font-mono text-slate-200">{params.compressionRatio.toFixed(1)} : 1</span>
                </div>
                <input
                  type="range"
                  min={1.4}
                  max={3.2}
                  step={0.1}
                  value={params.compressionRatio}
                  onChange={e => setParams(p => ({ ...p, compressionRatio: parseFloat(e.target.value) }))}
                  className="w-full accent-slate-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
