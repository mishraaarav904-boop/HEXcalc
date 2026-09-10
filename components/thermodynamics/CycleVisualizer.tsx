import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ThermoUnitSystem, CycleType, CycleStatePoint, CycleResults } from '../../types/thermodynamics';
import { kelvinToUnit, pascalToUnit, jouleToUnit, volumeToUnit } from '../../data/thermoData';
import { Play, Pause, RotateCcw, Sliders, Gauge, Activity } from 'lucide-react';

interface CycleVisualizerProps {
  unitSystem: ThermoUnitSystem;
}

const CYCLES_META: { id: CycleType; name: string; category: string; desc: string }[] = [
  { id: 'otto', name: 'Otto (Gasoline IC Engine)', category: 'Reciprocating', desc: 'Ideal cycle for 4-stroke spark-ignition internal combustion engines.' },
  { id: 'diesel', name: 'Diesel (Compression-Ignition)', category: 'Reciprocating', desc: 'Combustion occurs at constant pressure due to fuel injection timing.' },
  { id: 'brayton', name: 'Brayton (Jet Engine / Gas Turbine)', category: 'Flow Loop', desc: 'Open/closed gas turbine cycle powering aircraft and peak electric grids.' },
  { id: 'carnot', name: 'Carnot (Ideal Maximum Efficiency)', category: 'Theoretical', desc: 'Reversible cycle defining the absolute thermodynamic efficiency ceiling.' },
  { id: 'rankine', name: 'Rankine (Steam Power Plant)', category: 'Flow Loop', desc: 'Vapor-liquid phase power cycle generating ~80% of global electricity.' },
  { id: 'stirling', name: 'Stirling (External Combustion)', category: 'Reciprocating', desc: 'High-efficiency regenerative closed cycle with isothermal heat exchange.' }
];

export const CycleVisualizer: React.FC<CycleVisualizerProps> = ({ unitSystem }) => {
  const [cycleType, setCycleType] = useState<CycleType>('otto');
  const [compressionRatio, setCompressionRatio] = useState<number>(9.5);
  const [tMin, setTMin] = useState<number>(300); // K (ambient)
  const [tMax, setTMax] = useState<number>(2100); // K (peak combustion)
  const [pMin] = useState<number>(101325); // Pa (1 atm)
  const [cutoffRatio, setCutoffRatio] = useState<number>(1.8); // for Diesel
  const [plotMode, setPlotMode] = useState<'both' | 'pv' | 'ts'>('both');

  // Animation state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animSpeed, setAnimSpeed] = useState<number>(1.0);
  const animTimeRef = useRef<number>(0);
  const reqIdRef = useRef<number>(0);
  const [cycleProgress, setCycleProgress] = useState<number>(0); // 0.0 to 1.0

  const pvCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const gamma = 1.40; // Specific heat ratio for air
  const cp = 1005; // J/(kg*K)
  const cv = 718;  // J/(kg*K)
  const R = cp - cv; // 287 J/(kg*K)

  // Thermodynamic calculations for each cycle
  const cycleData = useMemo<CycleResults>(() => {
    const states: CycleStatePoint[] = [];
    const pathPV: { P: number; V: number; stage: number }[] = [];
    const pathTS: { T: number; S: number; stage: number }[] = [];
    let Qin = 0;
    let Qout = 0;
    let Wnet = 0;
    let eta = 0;
    const etaCarnot = 1 - tMin / tMax;

    // Mass basis: 1 kg of air
    const v1 = (R * tMin) / pMin; // m^3/kg
    const s1 = 1000; // baseline entropy reference

    if (cycleType === 'otto') {
      // State 1: Intake (Tmin, Pmin, v1)
      const state1 = { state: 1, label: '1: BDC Intake', P: pMin, V: v1, T: tMin, S: s1 };
      
      // State 2: Isentropic Compression (v2 = v1 / r)
      const v2 = v1 / compressionRatio;
      const t2 = tMin * Math.pow(compressionRatio, gamma - 1);
      const p2 = pMin * Math.pow(compressionRatio, gamma);
      const state2 = { state: 2, label: '2: TDC Compressed', P: p2, V: v2, T: t2, S: s1 };

      // State 3: Constant Volume Heat Addition (v3 = v2, T3 = Tmax)
      const v3 = v2;
      const t3 = tMax;
      const p3 = p2 * (t3 / t2);
      const s3 = s1 + cv * Math.log(t3 / t2);
      const state3 = { state: 3, label: '3: Peak Combustion', P: p3, V: v3, T: t3, S: s3 };

      // State 4: Isentropic Expansion (v4 = v1)
      const v4 = v1;
      const t4 = t3 / Math.pow(compressionRatio, gamma - 1);
      const p4 = p3 / Math.pow(compressionRatio, gamma);
      const state4 = { state: 4, label: '4: Expansion End', P: p4, V: v4, T: t4, S: s3 };

      states.push(state1, state2, state3, state4);

      Qin = cv * (t3 - t2);
      Qout = cv * (t4 - tMin);
      Wnet = Qin - Qout;
      eta = 1 - 1 / Math.pow(compressionRatio, gamma - 1);

      // Construct continuous curve samples (120 points)
      for (let i = 0; i <= 30; i++) {
        // 1 -> 2: P*V^gamma = const
        const alpha = i / 30;
        const v = v1 * (1 - alpha) + v2 * alpha;
        const p = pMin * Math.pow(v1 / v, gamma);
        const t = tMin * Math.pow(v1 / v, gamma - 1);
        pathPV.push({ P: p, V: v, stage: 1 });
        pathTS.push({ T: t, S: s1, stage: 1 });
      }
      for (let i = 0; i <= 30; i++) {
        // 2 -> 3: Constant V
        const alpha = i / 30;
        const t = t2 * (1 - alpha) + t3 * alpha;
        const p = p2 * (t / t2);
        const s = s1 + cv * Math.log(t / t2);
        pathPV.push({ P: p, V: v2, stage: 2 });
        pathTS.push({ T: t, S: s, stage: 2 });
      }
      for (let i = 0; i <= 30; i++) {
        // 3 -> 4: Isentropic expansion
        const alpha = i / 30;
        const v = v3 * (1 - alpha) + v4 * alpha;
        const p = p3 * Math.pow(v3 / v, gamma);
        const t = t3 * Math.pow(v3 / v, gamma - 1);
        pathPV.push({ P: p, V: v, stage: 3 });
        pathTS.push({ T: t, S: s3, stage: 3 });
      }
      for (let i = 0; i <= 30; i++) {
        // 4 -> 1: Constant V heat rejection
        const alpha = i / 30;
        const t = t4 * (1 - alpha) + tMin * alpha;
        const p = p4 * (t / t4);
        const s = s3 + cv * Math.log(t / t4);
        pathPV.push({ P: p, V: v1, stage: 4 });
        pathTS.push({ T: t, S: s, stage: 4 });
      }
    } else if (cycleType === 'diesel') {
      // Diesel Cycle: Isentropic comp -> Const P heat add -> Isentropic exp -> Const V heat rej
      const rc = Math.min(compressionRatio * 0.5, Math.max(1.1, cutoffRatio));
      const v2 = v1 / compressionRatio;
      const t2 = tMin * Math.pow(compressionRatio, gamma - 1);
      const p2 = pMin * Math.pow(compressionRatio, gamma);
      const state1 = { state: 1, label: '1: BDC Air Intake', P: pMin, V: v1, T: tMin, S: s1 };
      const state2 = { state: 2, label: '2: TDC Compressed Air', P: p2, V: v2, T: t2, S: s1 };

      const v3 = v2 * rc;
      const t3 = t2 * rc;
      const p3 = p2;
      const s3 = s1 + cp * Math.log(rc);
      const state3 = { state: 3, label: '3: Fuel Cutoff Point', P: p3, V: v3, T: t3, S: s3 };

      const t4 = t3 * Math.pow(v3 / v1, gamma - 1);
      const p4 = p3 * Math.pow(v3 / v1, gamma);
      const state4 = { state: 4, label: '4: Expansion End', P: p4, V: v1, T: t4, S: s3 };
      states.push(state1, state2, state3, state4);

      Qin = cp * (t3 - t2);
      Qout = cv * (t4 - tMin);
      Wnet = Qin - Qout;
      eta = 1 - (1 / Math.pow(compressionRatio, gamma - 1)) * ((Math.pow(rc, gamma) - 1) / (gamma * (rc - 1)));

      for (let i = 0; i <= 30; i++) {
        const a = i / 30;
        const v = v1 * (1 - a) + v2 * a;
        const p = pMin * Math.pow(v1 / v, gamma);
        const t = tMin * Math.pow(v1 / v, gamma - 1);
        pathPV.push({ P: p, V: v, stage: 1 });
        pathTS.push({ T: t, S: s1, stage: 1 });
      }
      for (let i = 0; i <= 30; i++) {
        const a = i / 30;
        const v = v2 * (1 - a) + v3 * a;
        const t = t2 * (v / v2);
        const s = s1 + cp * Math.log(v / v2);
        pathPV.push({ P: p2, V: v, stage: 2 });
        pathTS.push({ T: t, S: s, stage: 2 });
      }
      for (let i = 0; i <= 30; i++) {
        const a = i / 30;
        const v = v3 * (1 - a) + v1 * a;
        const p = p3 * Math.pow(v3 / v, gamma);
        const t = t3 * Math.pow(v3 / v, gamma - 1);
        pathPV.push({ P: p, V: v, stage: 3 });
        pathTS.push({ T: t, S: s3, stage: 3 });
      }
      for (let i = 0; i <= 30; i++) {
        const a = i / 30;
        const t = t4 * (1 - a) + tMin * a;
        const p = p4 * (t / t4);
        const s = s3 + cv * Math.log(t / t4);
        pathPV.push({ P: p, V: v1, stage: 4 });
        pathTS.push({ T: t, S: s, stage: 4 });
      }
    } else if (cycleType === 'brayton') {
      // Brayton (Gas turbine): Isentropic comp (1-2) -> Const P burner (2-3) -> Isentropic turbine (3-4) -> Const P cooler (4-1)
      const rp = compressionRatio; // Pressure ratio rp
      const p2 = pMin * rp;
      const t2 = tMin * Math.pow(rp, (gamma - 1) / gamma);
      const v2 = (R * t2) / p2;
      const state1 = { state: 1, label: '1: Compressor In', P: pMin, V: v1, T: tMin, S: s1 };
      const state2 = { state: 2, label: '2: Combustor In', P: p2, V: v2, T: t2, S: s1 };

      const p3 = p2;
      const t3 = tMax;
      const v3 = (R * t3) / p3;
      const s3 = s1 + cp * Math.log(t3 / t2);
      const state3 = { state: 3, label: '3: Turbine In', P: p3, V: v3, T: t3, S: s3 };

      const p4 = pMin;
      const t4 = t3 / Math.pow(rp, (gamma - 1) / gamma);
      const v4 = (R * t4) / p4;
      const state4 = { state: 4, label: '4: Turbine Out', P: p4, V: v4, T: t4, S: s3 };
      states.push(state1, state2, state3, state4);

      Qin = cp * (t3 - t2);
      Qout = cp * (t4 - tMin);
      Wnet = Qin - Qout;
      eta = 1 - 1 / Math.pow(rp, (gamma - 1) / gamma);

      for (let i = 0; i <= 30; i++) {
        const a = i / 30;
        const p = pMin * Math.pow(rp, a);
        const t = tMin * Math.pow(p / pMin, (gamma - 1) / gamma);
        const v = (R * t) / p;
        pathPV.push({ P: p, V: v, stage: 1 });
        pathTS.push({ T: t, S: s1, stage: 1 });
      }
      for (let i = 0; i <= 30; i++) {
        const a = i / 30;
        const t = t2 * (1 - a) + t3 * a;
        const v = (R * t) / p2;
        const s = s1 + cp * Math.log(t / t2);
        pathPV.push({ P: p2, V: v, stage: 2 });
        pathTS.push({ T: t, S: s, stage: 2 });
      }
      for (let i = 0; i <= 30; i++) {
        const a = i / 30;
        const p = p3 * Math.pow(1 / rp, a);
        const t = t3 * Math.pow(p / p3, (gamma - 1) / gamma);
        const v = (R * t) / p;
        pathPV.push({ P: p, V: v, stage: 3 });
        pathTS.push({ T: t, S: s3, stage: 3 });
      }
      for (let i = 0; i <= 30; i++) {
        const a = i / 30;
        const t = t4 * (1 - a) + tMin * a;
        const v = (R * t) / pMin;
        const s = s3 + cp * Math.log(t / t4);
        pathPV.push({ P: pMin, V: v, stage: 4 });
        pathTS.push({ T: t, S: s, stage: 4 });
      }
    } else {
      // Carnot / Rankine / Stirling fallback
      const r = compressionRatio;
      const v2 = v1 / r;
      const t2 = tMax;
      const p2 = (R * t2) / v2;
      const v3 = v2 * 1.8;
      const t3 = tMax;
      const p3 = (R * t3) / v3;
      const s3 = s1 + R * Math.log(1.8);
      const v4 = v1 * 1.4;
      const t4 = tMin;
      const p4 = (R * t4) / v4;

      states.push(
        { state: 1, label: '1: State 1', P: pMin, V: v1, T: tMin, S: s1 },
        { state: 2, label: '2: State 2', P: p2, V: v2, T: t2, S: s1 },
        { state: 3, label: '3: State 3', P: p3, V: v3, T: t3, S: s3 },
        { state: 4, label: '4: State 4', P: p4, V: v4, T: t4, S: s3 }
      );

      Qin = tMax * (s3 - s1);
      Qout = tMin * (s3 - s1);
      Wnet = Qin - Qout;
      eta = 1 - tMin / tMax;

      for (let i = 0; i <= 30; i++) {
        const a = i / 30;
        pathPV.push({ P: pMin * (1 - a) + p2 * a, V: v1 * (1 - a) + v2 * a, stage: 1 });
        pathTS.push({ T: tMin * (1 - a) + t2 * a, S: s1, stage: 1 });
      }
      for (let i = 0; i <= 30; i++) {
        const a = i / 30;
        pathPV.push({ P: p2 * (1 - a) + p3 * a, V: v2 * (1 - a) + v3 * a, stage: 2 });
        pathTS.push({ T: tMax, S: s1 * (1 - a) + s3 * a, stage: 2 });
      }
      for (let i = 0; i <= 30; i++) {
        const a = i / 30;
        pathPV.push({ P: p3 * (1 - a) + p4 * a, V: v3 * (1 - a) + v4 * a, stage: 3 });
        pathTS.push({ T: t3 * (1 - a) + t4 * a, S: s3, stage: 3 });
      }
      for (let i = 0; i <= 30; i++) {
        const a = i / 30;
        pathPV.push({ P: p4 * (1 - a) + pMin * a, V: v4 * (1 - a) + v1 * a, stage: 4 });
        pathTS.push({ T: tMin, S: s3 * (1 - a) + s1 * a, stage: 4 });
      }
    }

    const deltaV = Math.max(0.001, states[0].V - states[1].V);
    const mep = Math.max(0, Wnet / deltaV);

    return {
      states,
      pathPV,
      pathTS,
      Wnet,
      Qin,
      Qout,
      thermalEfficiency: eta,
      carnotEfficiency: etaCarnot,
      mep,
      stages: [
        { from: 1, to: 2, name: 'Compression (1→2)', process: 'Isentropic / Polytropic', q: 0, w: states[1].T - states[0].T },
        { from: 2, to: 3, name: 'Heat Addition (2→3)', process: cycleType === 'diesel' ? 'Isobaric' : 'Isochoric', q: Qin, w: 0 },
        { from: 3, to: 4, name: 'Expansion / Power (3→4)', process: 'Isentropic Expansion', q: 0, w: states[2].T - states[3].T },
        { from: 4, to: 1, name: 'Heat Rejection (4→1)', process: 'Isochoric Cooling', q: -Qout, w: 0 }
      ]
    };
  }, [cycleType, compressionRatio, tMin, tMax, pMin, cutoffRatio]);

  // Animation frame update loop
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (isPlaying) {
        animTimeRef.current += dt * animSpeed * 0.8;
        const prog = (animTimeRef.current % 4) / 4;
        setCycleProgress(prog);
      }

      reqIdRef.current = requestAnimationFrame(loop);
    };

    reqIdRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqIdRef.current);
  }, [isPlaying, animSpeed]);

  // Current interpolated state along the path
  const currentPathIdx = Math.min(
    cycleData.pathPV.length - 1,
    Math.floor(cycleProgress * cycleData.pathPV.length)
  );
  const currentPV = cycleData.pathPV[currentPathIdx] || { P: pMin, V: 0.8, stage: 1 };
  const currentTS = cycleData.pathTS[currentPathIdx] || { T: tMin, S: 1000, stage: 1 };

  // Render P-V Diagram Canvas
  const renderPV = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    const padL = 60;
    const padB = 45;
    const padT = 25;
    const padR = 25;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    // Determine scale limits
    let minV = Infinity;
    let maxV = -Infinity;
    let minP = Infinity;
    let maxP = -Infinity;
    cycleData.pathPV.forEach(pt => {
      if (pt.V < minV) minV = pt.V;
      if (pt.V > maxV) maxV = pt.V;
      if (pt.P < minP) minP = pt.P;
      if (pt.P > maxP) maxP = pt.P;
    });
    minV = Math.max(0, minV * 0.7);
    maxV *= 1.15;
    minP = 0;
    maxP *= 1.15;

    const toX = (v: number) => padL + ((v - minV) / (maxV - minV)) * plotW;
    const toY = (p: number) => padT + plotH - ((p - minP) / (maxP - minP)) * plotH;

    // Grid lines
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#71717a';
    ctx.font = '10px sans-serif';

    for (let i = 0; i <= 4; i++) {
      const pVal = (maxP / 4) * i;
      const y = toY(pVal);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();

      const conv = pascalToUnit(pVal, unitSystem);
      ctx.textAlign = 'right';
      ctx.fillText(`${conv.value.toFixed(1)} ${conv.label}`, padL - 8, y + 3);
    }

    for (let i = 0; i <= 4; i++) {
      const vVal = minV + ((maxV - minV) / 4) * i;
      const x = toX(vVal);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();

      const conv = volumeToUnit(vVal, unitSystem);
      ctx.textAlign = 'center';
      ctx.fillText(`${conv.value.toFixed(2)} ${conv.label}`, x, padT + plotH + 15);
    }

    // Axis titles
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Volume (V)', padL + plotW / 2, height - 6);

    ctx.save();
    ctx.translate(16, padT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Pressure (P)', 0, 0);
    ctx.restore();

    // Fill enclosed area (Net Work Output Wnet)
    ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
    ctx.beginPath();
    cycleData.pathPV.forEach((pt, i) => {
      const x = toX(pt.V);
      const y = toY(pt.P);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();

    // Draw cycle boundary path with color per stage
    ctx.lineWidth = 2.5;
    for (let i = 0; i < cycleData.pathPV.length - 1; i++) {
      const p1 = cycleData.pathPV[i];
      const p2 = cycleData.pathPV[i + 1];
      ctx.strokeStyle = p1.stage === 1 ? '#38bdf8' : p1.stage === 2 ? '#f59e0b' : p1.stage === 3 ? '#ec4899' : '#a855f7';
      ctx.beginPath();
      ctx.moveTo(toX(p1.V), toY(p1.P));
      ctx.lineTo(toX(p2.V), toY(p2.P));
      ctx.stroke();
    }

    // Numbered State vertices
    cycleData.states.forEach(st => {
      const x = toX(st.V);
      const y = toY(st.P);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${st.state}`, x + 6, y - 4);
    });

    // Tracking current operating point
    const currX = toX(currentPV.V);
    const currY = toY(currentPV.P);
    ctx.fillStyle = 'rgba(34, 211, 238, 0.3)';
    ctx.beginPath();
    ctx.arc(currX, currY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(currX, currY, 5, 0, Math.PI * 2);
    ctx.fill();
  }, [cycleData, currentPV, unitSystem]);

  // Render T-S Diagram Canvas
  const renderTS = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    const padL = 60;
    const padB = 45;
    const padT = 25;
    const padR = 25;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    let minT = Infinity;
    let maxT = -Infinity;
    let minS = Infinity;
    let maxS = -Infinity;
    cycleData.pathTS.forEach(pt => {
      if (pt.T < minT) minT = pt.T;
      if (pt.T > maxT) maxT = pt.T;
      if (pt.S < minS) minS = pt.S;
      if (pt.S > maxS) maxS = pt.S;
    });
    minT = Math.max(0, minT * 0.85);
    maxT *= 1.15;
    minS = Math.max(0, minS * 0.95);
    maxS *= 1.05;

    const toX = (s: number) => padL + ((s - minS) / (maxS - minS)) * plotW;
    const toY = (t: number) => padT + plotH - ((t - minT) / (maxT - minT)) * plotH;

    // Grid lines
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#71717a';
    ctx.font = '10px sans-serif';

    for (let i = 0; i <= 4; i++) {
      const tVal = minT + ((maxT - minT) / 4) * i;
      const y = toY(tVal);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();

      const conv = kelvinToUnit(tVal, unitSystem);
      ctx.textAlign = 'right';
      ctx.fillText(`${conv.value.toFixed(0)} ${conv.label}`, padL - 8, y + 3);
    }

    for (let i = 0; i <= 4; i++) {
      const sVal = minS + ((maxS - minS) / 4) * i;
      const x = toX(sVal);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillText(`${sVal.toFixed(0)}`, x, padT + plotH + 15);
    }

    // Axis titles
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Entropy S (J / kg·K)', padL + plotW / 2, height - 6);

    ctx.save();
    ctx.translate(16, padT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Temperature (T)', 0, 0);
    ctx.restore();

    // Fill enclosed area (Q_net = W_net on T-S)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
    ctx.beginPath();
    cycleData.pathTS.forEach((pt, i) => {
      const x = toX(pt.S);
      const y = toY(pt.T);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();

    // Draw T-S path
    ctx.lineWidth = 2.5;
    for (let i = 0; i < cycleData.pathTS.length - 1; i++) {
      const p1 = cycleData.pathTS[i];
      const p2 = cycleData.pathTS[i + 1];
      ctx.strokeStyle = p1.stage === 1 ? '#38bdf8' : p1.stage === 2 ? '#f59e0b' : p1.stage === 3 ? '#ec4899' : '#a855f7';
      ctx.beginPath();
      ctx.moveTo(toX(p1.S), toY(p1.T));
      ctx.lineTo(toX(p2.S), toY(p2.T));
      ctx.stroke();
    }

    // Vertices
    cycleData.states.forEach(st => {
      const x = toX(st.S);
      const y = toY(st.T);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${st.state}`, x + 6, y - 4);
    });

    // Current operating point on T-S
    const currX = toX(currentTS.S);
    const currY = toY(currentTS.T);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.beginPath();
    ctx.arc(currX, currY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(currX, currY, 5, 0, Math.PI * 2);
    ctx.fill();
  }, [cycleData, currentTS, unitSystem]);

  // Render Animated Engine Schematic Canvas
  const renderEngine = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    if (cycleType === 'brayton' || cycleType === 'rankine') {
      // Continuous Flow Closed/Open Loop Schematic
      const cx = width / 2;
      const cy = height / 2;

      // Compressor Box (Left)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 140, cy - 40);
      ctx.lineTo(cx - 80, cy - 25);
      ctx.lineTo(cx - 80, cy + 25);
      ctx.lineTo(cx - 140, cy + 40);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Compressor', cx - 110, cy + 4);

      // Turbine Box (Right)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#ec4899';
      ctx.beginPath();
      ctx.moveTo(cx + 80, cy - 25);
      ctx.lineTo(cx + 140, cy - 40);
      ctx.lineTo(cx + 140, cy + 40);
      ctx.lineTo(cx + 80, cy + 25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ec4899';
      ctx.fillText('Turbine', cx + 110, cy + 4);

      // Connecting Shaft
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx - 80, cy);
      ctx.lineTo(cx + 80, cy);
      ctx.stroke();

      // Combustor / Boiler (Top)
      ctx.fillStyle = '#451a03';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.fillRect(cx - 50, cy - 90, 100, 36);
      ctx.strokeRect(cx - 50, cy - 90, 100, 36);
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(cycleType === 'brayton' ? 'Combustor (Q_in)' : 'Boiler (Q_in)', cx, cy - 68);

      // Cooler / Condenser (Bottom)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#64748b';
      ctx.fillRect(cx - 50, cy + 55, 100, 36);
      ctx.strokeRect(cx - 50, cy + 55, 100, 36);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(cycleType === 'brayton' ? 'Cooler (Q_out)' : 'Condenser (Q_out)', cx, cy + 77);

      // Flow Pipes with animated fluid dots
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -cycleProgress * 60;
      ctx.strokeRect(cx - 110, cy - 72, 220, 144);
      ctx.setLineDash([]);

      // Flow direction arrows
      ctx.fillStyle = '#22d3ee';
      ctx.fillText('➔', cx, cy - 70);
      ctx.fillText('➔', cx + 112, cy);
      ctx.fillText('⬅', cx, cy + 74);
      ctx.fillText('⬅', cx - 112, cy);
    } else {
      // Reciprocating 4-Stroke Engine (Otto, Diesel, Carnot, Stirling)
      const cx = width / 2;
      const cy = height / 2 + 10;
      const cylW = 100;
      const cylH = 140;
      const topY = cy - 75;

      // Crank angle theta: 0 to 4*PI for a full 4-stroke cycle
      const theta = cycleProgress * Math.PI * 4;
      // Normalized stroke height: 0 (TDC) to 1 (BDC)
      const pistonDisp = 0.5 * (1 - Math.cos(theta));
      const strokeTravel = 55;
      const pistonY = topY + 25 + pistonDisp * strokeTravel;

      // Cylinder Walls
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - cylW / 2, topY);
      ctx.lineTo(cx - cylW / 2, topY + cylH);
      ctx.moveTo(cx + cylW / 2, topY);
      ctx.lineTo(cx + cylW / 2, topY + cylH);
      ctx.stroke();

      // Cylinder Top Head
      ctx.beginPath();
      ctx.moveTo(cx - cylW / 2, topY);
      ctx.lineTo(cx + cylW / 2, topY);
      ctx.stroke();

      // Spark Plug / Fuel Injector at top
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cx - 4, topY - 12, 8, 12);

      // Gas volume color inside cylinder based on current cycle stage
      let gasColor = 'rgba(56, 189, 248, 0.25)'; // Stage 1: Blue intake/compression
      if (currentPV.stage === 2) {
        gasColor = 'rgba(245, 158, 11, 0.7)'; // Stage 2: Fire orange combustion
      } else if (currentPV.stage === 3) {
        gasColor = 'rgba(239, 68, 68, 0.5)'; // Stage 3: Hot expansion red
      } else if (currentPV.stage === 4) {
        gasColor = 'rgba(148, 163, 184, 0.3)'; // Stage 4: Exhaust
      }
      ctx.fillStyle = gasColor;
      ctx.fillRect(cx - cylW / 2 + 2, topY + 2, cylW - 4, pistonY - topY - 2);

      // Combustion Spark flash effect during ignition (stage 2)
      if (currentPV.stage === 2) {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(cx, topY + 12, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      // Piston Crown & Body
      ctx.fillStyle = '#3f3f46';
      ctx.strokeStyle = '#71717a';
      ctx.lineWidth = 2;
      ctx.fillRect(cx - cylW / 2 + 2, pistonY, cylW - 4, 32);
      ctx.strokeRect(cx - cylW / 2 + 2, pistonY, cylW - 4, 32);

      // Wrist pin
      const wristPinY = pistonY + 16;
      ctx.fillStyle = '#a1a1aa';
      ctx.beginPath();
      ctx.arc(cx, wristPinY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Crankshaft & Connecting Rod
      const crankCenterY = topY + cylH + 25;
      const crankRadius = strokeTravel / 2;
      const crankPinX = cx + Math.sin(theta) * crankRadius;
      const crankPinY = crankCenterY + Math.cos(theta) * crankRadius;

      // Connecting Rod
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, wristPinY);
      ctx.lineTo(crankPinX, crankPinY);
      ctx.stroke();

      // Crankshaft circle & counterweight
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, crankCenterY, crankRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(crankPinX, crankPinY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Current stroke description
      ctx.fillStyle = '#f4f4f5';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      const stageName = currentPV.stage === 1 ? '1: Compression' : currentPV.stage === 2 ? '2: Combustion' : currentPV.stage === 3 ? '3: Expansion' : '4: Heat Rejection';
      ctx.fillText(stageName, cx, topY - 24);
    }
  }, [cycleType, cycleProgress, currentPV]);

  // Update canvas renders
  useEffect(() => {
    if (pvCanvasRef.current) {
      const ctx = pvCanvasRef.current.getContext('2d');
      if (ctx) renderPV(ctx, pvCanvasRef.current.width, pvCanvasRef.current.height);
    }
    if (tsCanvasRef.current) {
      const ctx = tsCanvasRef.current.getContext('2d');
      if (ctx) renderTS(ctx, tsCanvasRef.current.width, tsCanvasRef.current.height);
    }
    if (engineCanvasRef.current) {
      const ctx = engineCanvasRef.current.getContext('2d');
      if (ctx) renderEngine(ctx, engineCanvasRef.current.width, engineCanvasRef.current.height);
    }
  }, [renderPV, renderTS, renderEngine]);

  return (
    <div className="space-y-6">
      {/* Cycle Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {CYCLES_META.map(cycle => (
            <button
              key={cycle.id}
              onClick={() => setCycleType(cycle.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                cycleType === cycle.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {cycle.name.split(' (')[0]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Plot mode */}
          <div className="flex rounded-lg bg-zinc-800 p-0.5 border border-zinc-700">
            <button
              onClick={() => setPlotMode('both')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md ${plotMode === 'both' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
            >
              Both
            </button>
            <button
              onClick={() => setPlotMode('pv')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md ${plotMode === 'pv' ? 'bg-zinc-700 text-cyan-400' : 'text-zinc-400'}`}
            >
              P-V
            </button>
            <button
              onClick={() => setPlotMode('ts')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md ${plotMode === 'ts' ? 'bg-zinc-700 text-amber-400' : 'text-zinc-400'}`}
            >
              T-S
            </button>
          </div>

          {/* Animation Controls */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
            title={isPlaying ? 'Pause Animation' : 'Play Animation'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={() => {
              animTimeRef.current = 0;
              setCycleProgress(0);
            }}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
            title="Reset Cycle"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Visualizers (Left/Center) + Controls & Key Performance Readouts (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Visualizers: P-V, T-S, and Engine Schematics */}
        <div className="xl:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* P-V Diagram */}
            {(plotMode === 'both' || plotMode === 'pv') && (
              <div className="app-card p-3 bg-zinc-950/80 border border-zinc-800 flex flex-col items-center">
                <div className="w-full flex justify-between items-center px-1 mb-2">
                  <span className="text-xs font-medium text-cyan-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> P-V Diagram (Indicator)
                  </span>
                  <span className="text-[10px] text-zinc-500">Area = Net Work (W_net)</span>
                </div>
                <canvas ref={pvCanvasRef} width={380} height={260} className="w-full h-auto rounded-lg" />
              </div>
            )}

            {/* T-S Diagram */}
            {(plotMode === 'both' || plotMode === 'ts') && (
              <div className="app-card p-3 bg-zinc-950/80 border border-zinc-800 flex flex-col items-center">
                <div className="w-full flex justify-between items-center px-1 mb-2">
                  <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> T-S Diagram (Entropy)
                  </span>
                  <span className="text-[10px] text-zinc-500">Area = Heat Transferred</span>
                </div>
                <canvas ref={tsCanvasRef} width={380} height={260} className="w-full h-auto rounded-lg" />
              </div>
            )}
          </div>

          {/* Animated Engine / Component Schematic */}
          <div className="app-card p-3 bg-zinc-950/80 border border-zinc-800 flex flex-col items-center">
            <div className="w-full flex justify-between items-center px-1 mb-1">
              <span className="text-xs font-medium text-zinc-300">
                Synchronized Engine Component Schematic
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400">Speed:</span>
                <input
                  type="range"
                  min={0.2}
                  max={2.5}
                  step={0.1}
                  value={animSpeed}
                  onChange={e => setAnimSpeed(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            </div>
            <canvas ref={engineCanvasRef} width={760} height={200} className="w-full h-auto rounded-lg" />
          </div>
        </div>

        {/* Controls & Performance Cards */}
        <div className="space-y-4">
          {/* Key Efficiencies & Work */}
          <div className="grid grid-cols-2 gap-3">
            <div className="app-card p-3 bg-zinc-900/50 border border-zinc-800">
              <span className="text-xs text-zinc-400">Thermal Efficiency (η)</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {(cycleData.thermalEfficiency * 100).toFixed(1)}%
              </div>
              <span className="text-[10px] text-zinc-500">W_net / Q_in</span>
            </div>

            <div className="app-card p-3 bg-zinc-900/50 border border-zinc-800">
              <span className="text-xs text-zinc-400">Carnot Limit (η_rev)</span>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {(cycleData.carnotEfficiency * 100).toFixed(1)}%
              </div>
              <span className="text-[10px] text-zinc-500">1 - T_min / T_max</span>
            </div>

            <div className="app-card p-3 bg-zinc-900/50 border border-zinc-800">
              <span className="text-xs text-zinc-400">Net Work (W_net)</span>
              <div className="text-lg font-bold text-cyan-400 mt-1">
                {jouleToUnit(cycleData.Wnet, unitSystem).value.toFixed(1)}{' '}
                <span className="text-xs font-normal text-zinc-400">{jouleToUnit(cycleData.Wnet, unitSystem).label}/kg</span>
              </div>
            </div>

            <div className="app-card p-3 bg-zinc-900/50 border border-zinc-800">
              <span className="text-xs text-zinc-400">Heat Added (Q_in)</span>
              <div className="text-lg font-bold text-rose-400 mt-1">
                {jouleToUnit(cycleData.Qin, unitSystem).value.toFixed(1)}{' '}
                <span className="text-xs font-normal text-zinc-400">{jouleToUnit(cycleData.Qin, unitSystem).label}/kg</span>
              </div>
            </div>
          </div>

          {/* Sliders Card */}
          <div className="app-card p-4 space-y-4 bg-zinc-900/30 border border-zinc-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Cycle Parameters</span>
            </div>

            {/* Compression ratio */}
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>{cycleType === 'brayton' ? 'Pressure Ratio (rp)' : 'Compression Ratio (r)'}</span>
                <span className="text-cyan-400 font-mono">{compressionRatio.toFixed(1)} : 1</span>
              </div>
              <input
                type="range"
                min={cycleType === 'brayton' ? 4 : 4}
                max={cycleType === 'diesel' ? 24 : cycleType === 'brayton' ? 30 : 14}
                step={0.5}
                value={compressionRatio}
                onChange={e => setCompressionRatio(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Peak Temperature */}
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Max Temp (T_max)</span>
                <span className="text-cyan-400 font-mono">
                  {kelvinToUnit(tMax, unitSystem).value.toFixed(0)} {kelvinToUnit(tMax, unitSystem).label} ({tMax} K)
                </span>
              </div>
              <input
                type="range"
                min={800}
                max={2600}
                step={25}
                value={tMax}
                onChange={e => setTMax(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Ambient Temperature */}
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Intake Temp (T_min)</span>
                <span className="text-cyan-400 font-mono">
                  {kelvinToUnit(tMin, unitSystem).value.toFixed(0)} {kelvinToUnit(tMin, unitSystem).label} ({tMin} K)
                </span>
              </div>
              <input
                type="range"
                min={240}
                max={350}
                step={5}
                value={tMin}
                onChange={e => setTMin(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Cutoff ratio for Diesel */}
            {cycleType === 'diesel' && (
              <div>
                <div className="flex justify-between text-xs text-zinc-400 mb-1">
                  <span>Cutoff Ratio (rc)</span>
                  <span className="text-cyan-400 font-mono">{cutoffRatio.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={1.1}
                  max={3.0}
                  step={0.05}
                  value={cutoffRatio}
                  onChange={e => setCutoffRatio(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            )}
          </div>

          {/* Mean Effective Pressure Card */}
          <div className="app-card p-3.5 bg-zinc-900/20 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-purple-400" />
              <div>
                <span className="text-xs text-zinc-400 block">Mean Effective Pressure (MEP)</span>
                <span className="text-sm font-bold text-zinc-200">
                  {pascalToUnit(cycleData.mep, unitSystem).value.toFixed(1)}{' '}
                  {pascalToUnit(cycleData.mep, unitSystem).label}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-zinc-500 max-w-[120px] text-right">
              Work per unit swept cylinder volume
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
