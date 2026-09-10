import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Rocket, 
  Wind, 
  Layers, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  RotateCcw,
  Play,
  Pause
} from 'lucide-react';

// ==========================================
// TYPES & PRESETS: STAGING OPTIMIZER
// ==========================================

export interface RocketStage {
  id: number;
  name: string;
  propellantKg: number;
  dryMassKg: number;
  ispSec: number;
  thrustKn: number;
}

export interface RocketPreset {
  id: string;
  name: string;
  description: string;
  payloadKg: number;
  stages: RocketStage[];
}

const ROCKET_PRESETS: RocketPreset[] = [
  {
    id: 'f9',
    name: 'Falcon 9 v1.2 Full Thrust',
    description: 'Two-stage orbital rocket with RP-1/LOX Merlin engines. Reusable booster with high staging dynamic pressure.',
    payloadKg: 15600,
    stages: [
      { id: 1, name: 'Stage 1 (Booster - 9x Merlin 1D)', propellantKg: 418700, dryMassKg: 25600, ispSec: 282, thrustKn: 7607 },
      { id: 2, name: 'Stage 2 (Upper Stage - 1x MVac)', propellantKg: 111500, dryMassKg: 4000, ispSec: 348, thrustKn: 934 },
    ],
  },
  {
    id: 'saturn5',
    name: 'Saturn V (Apollo Lunar Stack)',
    description: 'Three-stage super heavy-lift rocket that sent Apollo astronauts to the Moon. S-IC RP-1 booster + S-II / S-IVB Hydrolox upper stages.',
    payloadKg: 48600,
    stages: [
      { id: 1, name: 'Stage 1 (S-IC - 5x F-1)', propellantKg: 2160000, dryMassKg: 130000, ispSec: 263, thrustKn: 35100 },
      { id: 2, name: 'Stage 2 (S-II - 5x J-2)', propellantKg: 450000, dryMassKg: 40000, ispSec: 421, thrustKn: 5141 },
      { id: 3, name: 'Stage 3 (S-IVB - 1x J-2)', propellantKg: 107000, dryMassKg: 13000, ispSec: 421, thrustKn: 1000 },
    ],
  },
  {
    id: 'starship',
    name: 'Starship + Super Heavy',
    description: 'Fully reusable two-stage super heavy vehicle using full-flow staged-combustion Methalox Raptor engines.',
    payloadKg: 100000,
    stages: [
      { id: 1, name: 'Super Heavy Booster (33x Raptor)', propellantKg: 3400000, dryMassKg: 200000, ispSec: 327, thrustKn: 74300 },
      { id: 2, name: 'Starship Upper Stage (6x Raptor)', propellantKg: 1200000, dryMassKg: 100000, ispSec: 380, thrustKn: 14700 },
    ],
  },
  {
    id: 'electron',
    name: 'Rocket Lab Electron',
    description: 'Two-stage dedicated smallsat launcher utilizing carbon-composite structures and electric-pump-fed Rutherford engines.',
    payloadKg: 300,
    stages: [
      { id: 1, name: 'Stage 1 (9x Rutherford)', propellantKg: 9250, dryMassKg: 950, ispSec: 311, thrustKn: 224 },
      { id: 2, name: 'Stage 2 (1x Rutherford Vac)', propellantKg: 2050, dryMassKg: 250, ispSec: 343, thrustKn: 25.8 },
    ],
  },
  {
    id: 'sounding',
    name: 'Suborbital Sounding Rocket',
    description: 'Single-stage solid/liquid rocket designed for upper atmospheric science and microgravity experiments.',
    payloadKg: 120,
    stages: [
      { id: 1, name: 'Stage 1 (Single Core)', propellantKg: 1800, dryMassKg: 350, ispSec: 242, thrustKn: 65 },
    ],
  },
];

interface MissionMilestone {
  id: string;
  name: string;
  deltaVKmS: number;
  description: string;
}

const MISSION_MILESTONES: MissionMilestone[] = [
  { id: 'suborbital', name: 'Suborbital (100 km)', deltaVKmS: 1.8, description: 'Karman line suborbital trajectory' },
  { id: 'leo', name: 'Low Earth Orbit (LEO)', deltaVKmS: 9.3, description: 'Orbital velocity + ~1.6 km/s gravity/drag losses' },
  { id: 'gto', name: 'GTO Transfer', deltaVKmS: 11.8, description: 'Geostationary transfer orbit' },
  { id: 'tli', name: 'Trans-Lunar (Moon)', deltaVKmS: 12.4, description: 'Direct lunar insertion trajectory' },
  { id: 'tmi', name: 'Trans-Mars (Mars)', deltaVKmS: 13.1, description: 'Interplanetary Hohmann transfer to Mars' },
  { id: 'escape', name: 'Solar Escape', deltaVKmS: 16.5, description: 'Hyperbolic escape from Solar System' },
];

// ==========================================
// TYPES & PRESETS: DE LAVAL NOZZLE
// ==========================================

export interface NozzlePreset {
  id: string;
  name: string;
  description: string;
  gamma: number;
  molarMass: number; // g / mol
  pcBar: number; // bar
  tcK: number; // Kelvin
  expansionRatio: number; // Ae / At
  throatDiameterMm: number; // mm
  altitudeKm: number; // km
}

const NOZZLE_PRESETS: NozzlePreset[] = [
  {
    id: 'merlin1d_sl',
    name: 'Merlin 1D (Sea Level)',
    description: 'SpaceX Falcon 9 gas-generator Kerolox engine optimized for sea level lift-off.',
    gamma: 1.22,
    molarMass: 23.0,
    pcBar: 97.0,
    tcK: 3400,
    expansionRatio: 16.0,
    throatDiameterMm: 260,
    altitudeKm: 0,
  },
  {
    id: 'merlin1d_vac',
    name: 'Merlin 1D Vacuum (MVac)',
    description: 'SpaceX Falcon 9 upper stage with a huge radiatively-cooled niobium expansion bell (ε = 165).',
    gamma: 1.22,
    molarMass: 23.0,
    pcBar: 97.0,
    tcK: 3400,
    expansionRatio: 165.0,
    throatDiameterMm: 260,
    altitudeKm: 60,
  },
  {
    id: 'rs25',
    name: 'RS-25 (Space Shuttle Main Engine)',
    description: 'Staged-combustion Hydrolox engine with high chamber pressure and extreme efficiency.',
    gamma: 1.26,
    molarMass: 14.0,
    pcBar: 206.0,
    tcK: 3550,
    expansionRatio: 69.0,
    throatDiameterMm: 260,
    altitudeKm: 0,
  },
  {
    id: 'raptor3',
    name: 'SpaceX Raptor 3 (SL)',
    description: 'Full-flow staged combustion Methalox engine operating at world-record chamber pressure (350 bar).',
    gamma: 1.20,
    molarMass: 20.0,
    pcBar: 350.0,
    tcK: 3600,
    expansionRatio: 34.0,
    throatDiameterMm: 240,
    altitudeKm: 0,
  },
  {
    id: 'aj10',
    name: 'Aerojet AJ10 (Orbital OMS)',
    description: 'Pressure-fed hypergolic (N2O4/Aerozine-50) vacuum thruster for Apollo CSM and Shuttle OMS.',
    gamma: 1.25,
    molarMass: 25.0,
    pcBar: 8.6,
    tcK: 2900,
    expansionRatio: 40.0,
    throatDiameterMm: 137,
    altitudeKm: 70,
  },
];

// Helper: Standard Atmosphere Pressure (bar)
function getAmbientPressureBar(altKm: number): number {
  if (altKm >= 80) return 0; // Vacuum (Space)
  if (altKm <= 11) {
    // Troposphere
    const T = 288.15 - 6.5 * altKm;
    const P = 101325 * Math.pow(1 - (0.0065 * altKm * 1000) / 288.15, 5.25588);
    return P / 100000;
  } else if (altKm <= 20) {
    // Lower Stratosphere
    const P11 = 22632;
    const P = P11 * Math.exp((-9.80665 * (altKm * 1000 - 11000)) / (287.05 * 216.65));
    return P / 100000;
  } else {
    // Upper atmosphere approximation
    const P20 = 5474.89;
    const P = P20 * Math.exp((-9.80665 * (altKm * 1000 - 20000)) / (287.05 * 228.65));
    return Math.max(0, P / 100000);
  }
}

// Helper: Invert Mach-Area relation for supersonic flow using Newton-Raphson
function solveSupersonicMach(gamma: number, eps: number): number {
  let m = eps > 15 ? 4.0 : 2.0;
  for (let i = 0; i < 40; i++) {
    const term = (2 / (gamma + 1)) * (1 + ((gamma - 1) / 2) * m * m);
    const p = (gamma + 1) / (2 * (gamma - 1));
    const f = (1 / m) * Math.pow(term, p) - eps;
    const df_dm = -(1 / (m * m)) * Math.pow(term, p) + (1 / m) * p * Math.pow(term, p - 1) * (2 / (gamma + 1)) * (gamma - 1) * m;
    const nextM = m - f / df_dm;
    if (Math.abs(nextM - m) < 1e-6) return nextM;
    m = nextM;
  }
  return m;
}

export const RocketPropulsion: React.FC = () => {
  const [subTab, setSubTab] = useState<'staging' | 'nozzle'>('staging');

  // ==========================================
  // STATE: STAGING OPTIMIZER
  // ==========================================
  const [selectedPresetId, setSelectedPresetId] = useState<string>('f9');
  const [payloadKg, setPayloadKg] = useState<number>(15600);
  const [numStages, setNumStages] = useState<number>(2);
  const [stages, setStages] = useState<RocketStage[]>([
    { id: 1, name: 'Stage 1 (Booster)', propellantKg: 418700, dryMassKg: 25600, ispSec: 282, thrustKn: 7607 },
    { id: 2, name: 'Stage 2 (Upper Stage)', propellantKg: 111500, dryMassKg: 4000, ispSec: 348, thrustKn: 934 },
    { id: 3, name: 'Stage 3 (Kick Stage)', propellantKg: 10000, dryMassKg: 1200, ispSec: 320, thrustKn: 80 },
  ]);

  const handleApplyRocketPreset = (presetId: string) => {
    const preset = ROCKET_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setPayloadKg(preset.payloadKg);
    setNumStages(preset.stages.length);
    setStages(prev => {
      const next = [...prev];
      preset.stages.forEach((st, idx) => {
        next[idx] = { ...st };
      });
      return next;
    });
  };

  const updateStageField = (idx: number, field: keyof RocketStage, value: number | string) => {
    setSelectedPresetId('custom');
    setStages(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  // Compute Staging Physics
  const stagingResults = useMemo(() => {
    const g0 = 9.80665;
    const activeStages = stages.slice(0, numStages);
    
    // Serial calculation from top (highest stage) to bottom (Stage 1)
    interface ComputedStage {
      m0: number; // initial mass
      mf: number; // burnout mass
      massRatio: number;
      deltaV: number;
      twr0: number;
      twrF: number;
      burnTimeSec: number;
      structuralFraction: number;
    }

    const computed: ComputedStage[] = new Array(numStages);
    let currentMass = payloadKg;

    for (let i = numStages - 1; i >= 0; i--) {
      const st = activeStages[i];
      const mf = currentMass + st.dryMassKg;
      const m0 = mf + st.propellantKg;
      const massRatio = m0 / mf;
      const deltaV = g0 * st.ispSec * Math.log(massRatio);
      const thrustN = st.thrustKn * 1000;
      const twr0 = thrustN / (m0 * g0);
      const twrF = thrustN / (mf * g0);
      const massFlowKgS = (thrustN / (st.ispSec * g0));
      const burnTimeSec = massFlowKgS > 0 ? st.propellantKg / massFlowKgS : 0;
      const structuralFraction = (st.dryMassKg / (st.dryMassKg + st.propellantKg)) * 100;

      computed[i] = {
        m0,
        mf,
        massRatio,
        deltaV,
        twr0,
        twrF,
        burnTimeSec,
        structuralFraction,
      };

      currentMass = m0;
    }

    const totalDeltaV = computed.reduce((acc, c) => acc + c.deltaV, 0);
    const grossMassKg = computed[0]?.m0 || payloadKg;
    const payloadFraction = (payloadKg / grossMassKg) * 100;
    const liftoffTwr = computed[0]?.twr0 || 0;

    return {
      stages: computed,
      totalDeltaV,
      grossMassKg,
      payloadFraction,
      liftoffTwr,
    };
  }, [stages, numStages, payloadKg]);

  // Sensitivity Curve Data: Payload vs Delta-V
  const sensitivityCurve = useMemo(() => {
    const g0 = 9.80665;
    const activeStages = stages.slice(0, numStages);
    const points: { payload: number; deltaV: number }[] = [];
    const minP = Math.max(10, payloadKg * 0.1);
    const maxP = Math.max(1000, payloadKg * 2.8);
    const steps = 30;
    const stepSize = (maxP - minP) / steps;

    for (let p = minP; p <= maxP; p += stepSize) {
      let mass = p;
      let totalDv = 0;
      for (let i = numStages - 1; i >= 0; i--) {
        const st = activeStages[i];
        const mf = mass + st.dryMassKg;
        const m0 = mf + st.propellantKg;
        totalDv += g0 * st.ispSec * Math.log(m0 / mf);
        mass = m0;
      }
      points.push({ payload: p, deltaV: totalDv });
    }
    return points;
  }, [stages, numStages, payloadKg]);

  // Sensitivity Canvas
  const sensitivityCanvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = sensitivityCanvasRef.current;
    if (!canvas || sensitivityCurve.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const padLeft = 55;
    const padBottom = 30;
    const padTop = 15;
    const padRight = 20;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const minP = sensitivityCurve[0].payload;
    const maxP = sensitivityCurve[sensitivityCurve.length - 1].payload;
    const minDv = Math.min(...sensitivityCurve.map(c => c.deltaV)) * 0.9;
    const maxDv = Math.max(...sensitivityCurve.map(c => c.deltaV)) * 1.05;

    const scaleX = (p: number) => padLeft + ((p - minP) / (maxP - minP)) * plotW;
    const scaleY = (dv: number) => height - padBottom - ((dv - minDv) / (maxDv - minDv)) * plotH;

    // Grid lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const yVal = minDv + (i / 4) * (maxDv - minDv);
      const y = scaleY(yVal);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText((yVal / 1000).toFixed(1) + 'k', padLeft - 6, y + 3);
    }

    // X Axis Labels
    for (let i = 0; i <= 4; i++) {
      const pVal = minP + (i / 4) * (maxP - minP);
      const x = scaleX(pVal);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      const label = pVal >= 1000 ? (pVal / 1000).toFixed(1) + 't' : Math.round(pVal) + 'kg';
      ctx.fillText(label, x, height - 10);
    }

    // LEO Threshold Line (9.3 km/s)
    if (9300 >= minDv && 9300 <= maxDv) {
      const yLeo = scaleY(9300);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, yLeo);
      ctx.lineTo(width - padRight, yLeo);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('LEO Threshold (9.3 km/s)', padLeft + 6, yLeo - 4);
    }

    // Curve Line
    ctx.beginPath();
    sensitivityCurve.forEach((pt, idx) => {
      const x = scaleX(pt.payload);
      const y = scaleY(pt.deltaV);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Current operating point
    const currX = scaleX(payloadKg);
    const currY = scaleY(stagingResults.totalDeltaV);

    // Dotted guideline to axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(currX, height - padBottom);
    ctx.lineTo(currX, currY);
    ctx.lineTo(padLeft, currY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Point Dot
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(currX, currY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [sensitivityCurve, stagingResults, payloadKg]);

  // ==========================================
  // STATE: NOZZLE GAS DYNAMICS
  // ==========================================
  const [selectedNozzlePreset, setSelectedNozzlePreset] = useState<string>('merlin1d_sl');
  const [gamma, setGamma] = useState<number>(1.22);
  const [molarMass, setMolarMass] = useState<number>(23.0);
  const [pcBar, setPcBar] = useState<number>(97.0);
  const [tcK, setTcK] = useState<number>(3400);
  const [expansionRatio, setExpansionRatio] = useState<number>(16.0);
  const [throatDiameterMm, setThroatDiameterMm] = useState<number>(215);
  const [altitudeKm, setAltitudeKm] = useState<number>(0);
  const [isSimRunning, setIsSimRunning] = useState<boolean>(true);

  const handleApplyNozzlePreset = (id: string) => {
    const p = NOZZLE_PRESETS.find(x => x.id === id);
    if (!p) return;
    setSelectedNozzlePreset(id);
    setGamma(p.gamma);
    setMolarMass(p.molarMass);
    setPcBar(p.pcBar);
    setTcK(p.tcK);
    setExpansionRatio(p.expansionRatio);
    setThroatDiameterMm(p.throatDiameterMm);
    setAltitudeKm(p.altitudeKm);
  };

  // Compute Nozzle Aerothermodynamics
  const nozzleResults = useMemo(() => {
    const Ru = 8314.4626; // J / (kmol K)
    const Rs = Ru / molarMass; // J / (kg K)
    const dStarM = throatDiameterMm / 1000;
    const aStarM2 = Math.PI * Math.pow(dStarM / 2, 2);
    const aeM2 = expansionRatio * aStarM2;
    const pcPa = pcBar * 100000;
    const paBar = getAmbientPressureBar(altitudeKm);
    const paPa = paBar * 100000;

    // Exit Mach
    const me = solveSupersonicMach(gamma, expansionRatio);

    // Isentropic Exit Static Temperature and Pressure
    const teK = tcK / (1 + 0.5 * (gamma - 1) * me * me);
    const pePa = pcPa / Math.pow(1 + 0.5 * (gamma - 1) * me * me, gamma / (gamma - 1));
    const peBar = pePa / 100000;

    // Exit Velocity
    const speedOfSoundExit = Math.sqrt(gamma * Rs * teK);
    const veMs = me * speedOfSoundExit;

    // Mass Flow Rate (Choked Throat)
    const expTerm = (gamma + 1) / (2 * (gamma - 1));
    const mdotKgS = (aStarM2 * pcPa / Math.sqrt(tcK)) * Math.sqrt(gamma / Rs) * Math.pow(2 / (gamma + 1), expTerm);

    // Thrust
    const thrustN = mdotKgS * veMs + (pePa - paPa) * aeM2;
    const thrustKn = thrustN / 1000;

    // Specific Impulse
    const g0 = 9.80665;
    const ispSec = mdotKgS > 0 ? thrustN / (mdotKgS * g0) : 0;
    const cStarMs = (pcPa * aStarM2) / mdotKgS;
    const cf = thrustN / (pcPa * aStarM2);

    // Expansion diagnostics
    const pressureRatio = paBar > 0 ? peBar / paBar : 999;
    let regime: 'separated' | 'overexpanded' | 'ideal' | 'underexpanded' = 'ideal';
    let regimeTitle = '';
    let regimeDesc = '';

    if (pressureRatio < 0.35) {
      regime = 'separated';
      regimeTitle = 'Severe Over-Expansion (Summerfield Limit)';
      regimeDesc = 'Pe / Pa < 0.35. Oblique shocks penetrate into nozzle bell, causing boundary layer separation and violent side loads.';
    } else if (pressureRatio < 0.95) {
      regime = 'overexpanded';
      regimeTitle = 'Over-Expanded Flow (Mach Diamonds)';
      regimeDesc = 'Pe < Pa. Ambient air pinches the jet at the lip, reflecting oblique compression shocks and Mach disk patterns.';
    } else if (pressureRatio <= 1.05) {
      regime = 'ideal';
      regimeTitle = 'Ideally Expanded (Optimum Thrust)';
      regimeDesc = 'Pe ≈ Pa. Parallel jet boundary with no Prandtl-Meyer expansion fans or oblique compression waves. Maximum thrust coefficient.';
    } else {
      regime = 'underexpanded';
      regimeTitle = 'Under-Expanded Flow (Plume Blooming)';
      regimeDesc = 'Pe > Pa. High exit pressure bursts outward upon exiting nozzle lip, forming expansive Prandtl-Meyer fans and wide bloom.';
    }

    return {
      me,
      teK,
      peBar,
      paBar,
      pressureRatio,
      veMs,
      mdotKgS,
      thrustKn,
      ispSec,
      cStarMs,
      cf,
      regime,
      regimeTitle,
      regimeDesc,
      exitDiameterMm: Math.round(dStarM * Math.sqrt(expansionRatio) * 1000),
    };
  }, [gamma, molarMass, pcBar, tcK, expansionRatio, throatDiameterMm, altitudeKm]);

  // Canvas Nozzle & Plume Animation
  const nozzleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number>(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  useEffect(() => {
    // Initialize flow particles
    const pts = [];
    for (let i = 0; i < 60; i++) {
      pts.push({
        x: Math.random() * 500,
        y: (Math.random() - 0.5) * 40,
        vx: 4 + Math.random() * 6,
        vy: (Math.random() - 0.5) * 1.5,
        life: Math.random(),
      });
    }
    particlesRef.current = pts;
  }, []);

  useEffect(() => {
    const canvas = nozzleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localTime = 0;

    const render = () => {
      localTime += 0.03;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const midY = h / 2;
      const throatX = 140;
      const chamberX = 30;
      const exitX = 260;

      const throatR = 16;
      const chamberR = 40;
      const exitR = Math.min(midY - 10, Math.max(22, 16 * Math.sqrt(Math.min(100, expansionRatio)) * 0.38));

      // 1. Draw Nozzle Interior Gas Gradient
      ctx.save();
      ctx.beginPath();
      // Upper contour
      ctx.moveTo(chamberX, midY - chamberR);
      ctx.bezierCurveTo(throatX - 40, midY - chamberR, throatX - 15, midY - throatR, throatX, midY - throatR);
      ctx.bezierCurveTo(throatX + 30, midY - throatR, exitX - 40, midY - exitR, exitX, midY - exitR);
      // Lower contour
      ctx.lineTo(exitX, midY + exitR);
      ctx.bezierCurveTo(exitX - 40, midY + exitR, throatX + 30, midY + throatR, throatX, midY + throatR);
      ctx.bezierCurveTo(throatX - 15, midY + throatR, throatX - 40, midY + chamberR, chamberX, midY + chamberR);
      ctx.closePath();
      ctx.clip();

      // Gas flow gradient
      const gasGrad = ctx.createLinearGradient(chamberX, midY, exitX, midY);
      gasGrad.addColorStop(0, 'rgba(239, 68, 68, 0.85)'); // Subsonic: Hot red/orange
      gasGrad.addColorStop(0.45, 'rgba(245, 158, 11, 0.85)'); // Throat M=1: Yellow
      gasGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.8)'); // Supersonic bell: Light blue
      gasGrad.addColorStop(1, 'rgba(99, 102, 241, 0.7)'); // Exit
      ctx.fillStyle = gasGrad;
      ctx.fillRect(chamberX - 10, 0, exitX - chamberX + 20, h);

      // Mach lines / flow streamlines inside nozzle
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      for (let s = -2; s <= 2; s++) {
        const factor = s / 3;
        ctx.beginPath();
        ctx.moveTo(chamberX, midY + chamberR * factor);
        ctx.bezierCurveTo(throatX - 25, midY + chamberR * factor, throatX - 10, midY + throatR * factor, throatX, midY + throatR * factor);
        ctx.bezierCurveTo(throatX + 30, midY + throatR * factor, exitX - 40, midY + exitR * factor, exitX, midY + exitR * factor);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Draw Exhaust Plume & Shock Wave Patterns
      ctx.save();
      const plumeStartX = exitX;
      const plumeMaxX = w - 15;
      const { regime } = nozzleResults;

      if (regime === 'underexpanded') {
        // Wide blooming plume
        const bloomR = Math.min(midY - 5, exitR * (1.3 + Math.min(3, Math.log10(Math.max(1, nozzleResults.pressureRatio)) * 0.8)));
        const plumeGrad = ctx.createRadialGradient(plumeStartX, midY, 5, plumeStartX + 120, midY, bloomR * 1.5);
        plumeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        plumeGrad.addColorStop(0.2, 'rgba(147, 197, 253, 0.7)');
        plumeGrad.addColorStop(0.6, 'rgba(99, 102, 241, 0.35)');
        plumeGrad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

        ctx.fillStyle = plumeGrad;
        ctx.beginPath();
        ctx.moveTo(plumeStartX, midY - exitR);
        ctx.bezierCurveTo(plumeStartX + 70, midY - bloomR, plumeStartX + 180, midY - bloomR * 1.2, plumeMaxX, midY - bloomR * 0.6);
        ctx.lineTo(plumeMaxX, midY + bloomR * 0.6);
        ctx.bezierCurveTo(plumeStartX + 180, midY + bloomR * 1.2, plumeStartX + 70, midY + bloomR, plumeStartX, midY + exitR);
        ctx.closePath();
        ctx.fill();

        // Prandtl-Meyer Expansion Fan Rays at Lip
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        for (let ray = 0; ray < 4; ray++) {
          const angle = -0.2 - ray * 0.15;
          ctx.beginPath();
          ctx.moveTo(plumeStartX, midY - exitR);
          ctx.lineTo(plumeStartX + 60 * Math.cos(angle), midY - exitR + 60 * Math.sin(angle));
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(plumeStartX, midY + exitR);
          ctx.lineTo(plumeStartX + 60 * Math.cos(-angle), midY + exitR + 60 * Math.sin(-angle));
          ctx.stroke();
        }
      } else if (regime === 'overexpanded' || regime === 'separated') {
        // Pinched plume with Mach Diamond lattice
        const pinchR = Math.max(6, exitR * 0.75);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
        ctx.beginPath();
        ctx.moveTo(plumeStartX, midY - exitR);
        ctx.lineTo(plumeStartX + 40, midY - pinchR);
        ctx.lineTo(plumeMaxX, midY - pinchR * 0.9);
        ctx.lineTo(plumeMaxX, midY + pinchR * 0.9);
        ctx.lineTo(plumeStartX + 40, midY + pinchR);
        ctx.lineTo(plumeStartX, midY + exitR);
        ctx.closePath();
        ctx.fill();

        // Mach Diamonds
        const diamondLen = Math.max(30, Math.min(60, exitR * 1.8));
        const numDiamonds = Math.floor((plumeMaxX - plumeStartX - 20) / diamondLen);

        for (let d = 0; d < numDiamonds; d++) {
          const dx = plumeStartX + 25 + d * diamondLen;
          const halfLen = diamondLen * 0.45;
          const diamondH = pinchR * 0.75 * Math.pow(0.85, d);

          // Oblique shock intersection diamond
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(dx - halfLen, midY);
          ctx.lineTo(dx, midY - diamondH);
          ctx.lineTo(dx + halfLen, midY);
          ctx.lineTo(dx, midY + diamondH);
          ctx.closePath();
          ctx.stroke();

          // High temperature diamond core
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fill();
        }

        if (regime === 'separated') {
          // Highlight internal separation shock in red
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(exitX - 35, midY - exitR * 0.7);
          ctx.lineTo(exitX - 15, midY);
          ctx.lineTo(exitX - 35, midY + exitR * 0.7);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        // Ideal parallel plume
        const plumeGrad = ctx.createLinearGradient(plumeStartX, midY, plumeMaxX, midY);
        plumeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        plumeGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.7)');
        plumeGrad.addColorStop(0.8, 'rgba(99, 102, 241, 0.3)');
        plumeGrad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

        ctx.fillStyle = plumeGrad;
        ctx.beginPath();
        ctx.moveTo(plumeStartX, midY - exitR);
        ctx.lineTo(plumeMaxX, midY - exitR);
        ctx.lineTo(plumeMaxX, midY + exitR);
        ctx.lineTo(plumeStartX, midY + exitR);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 3. Particle Flow Animation
      if (isSimRunning) {
        ctx.fillStyle = '#ffffff';
        particlesRef.current.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;

          // Boundary constraint or reset
          if (p.x > w || p.x < chamberX) {
            p.x = chamberX + Math.random() * 20;
            p.y = (Math.random() - 0.5) * chamberR * 0.7;
            p.vx = 3 + Math.random() * 3;
          }

          // Accelerate past throat
          if (p.x > throatX) {
            p.vx = Math.min(18, p.vx * 1.04);
          }

          const radius = Math.max(1, 2.5 - (p.x - chamberX) / w * 1.5);
          ctx.beginPath();
          ctx.arc(p.x, midY + p.y, radius, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 4. Draw Physical Nozzle Bell Walls (Metal Cutaway)
      ctx.save();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';

      // Upper Wall
      ctx.beginPath();
      ctx.moveTo(chamberX, midY - chamberR);
      ctx.bezierCurveTo(throatX - 40, midY - chamberR, throatX - 15, midY - throatR, throatX, midY - throatR);
      ctx.bezierCurveTo(throatX + 30, midY - throatR, exitX - 40, midY - exitR, exitX, midY - exitR);
      ctx.stroke();

      // Lower Wall
      ctx.beginPath();
      ctx.moveTo(chamberX, midY + chamberR);
      ctx.bezierCurveTo(throatX - 40, midY + chamberR, throatX - 15, midY + throatR, throatX, midY + throatR);
      ctx.bezierCurveTo(throatX + 30, midY + throatR, exitX - 40, midY + exitR, exitX, midY + exitR);
      ctx.stroke();

      // Throat marker line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(throatX, midY - throatR - 10);
      ctx.lineTo(throatX, midY + throatR + 10);
      ctx.stroke();
      ctx.setLineDash([]);

      // Exit Plane marker line
      ctx.beginPath();
      ctx.moveTo(exitX, midY - exitR - 10);
      ctx.lineTo(exitX, midY + exitR + 10);
      ctx.stroke();

      // Labels
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Chamber (Pc, Tc)', chamberX + 35, midY - chamberR - 8);
      ctx.fillText('Throat (M=1)', throatX, midY - throatR - 14);
      ctx.fillText(`Exit (Me=${nozzleResults.me.toFixed(2)})`, exitX, midY - exitR - 14);

      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [expansionRatio, nozzleResults, isSimRunning]);

  return (
    <div className="space-y-6">
      {/* Sub-navigation Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Rocket className="w-4 h-4 text-blue-500" />
            Rocket Propulsion & Staging Optimizer
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tsiolkovsky multi-stage orbital delta-v solver, payload sensitivity, and isentropic De Laval supersonic nozzle gas dynamics.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setSubTab('staging')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              subTab === 'staging'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Multi-Stage Staging
          </button>
          <button
            onClick={() => setSubTab('nozzle')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              subTab === 'nozzle'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            De Laval Supersonic Nozzle
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* VIEW 1: MULTI-STAGE STAGING OPTIMIZER      */}
      {/* ========================================== */}
      {subTab === 'staging' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Controls & Stages (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Presets & Global Parameters */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Rocket Architecture Preset</label>
                  <select
                    value={selectedPresetId}
                    onChange={e => handleApplyRocketPreset(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none"
                  >
                    {ROCKET_PRESETS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    <option value="custom">Custom Configuration</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Number of Stages</label>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3].map(n => (
                      <button
                        key={n}
                        onClick={() => { setSelectedPresetId('custom'); setNumStages(n); }}
                        className={`px-3 py-1 text-xs rounded border transition-colors ${
                          numStages === n
                            ? 'bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-700 dark:text-blue-300 font-semibold'
                            : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {n} Stage{n > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payload Controls */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    Payload Mass:
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {payloadKg.toLocaleString()} kg ({ (payloadKg / 1000).toFixed(2) } tonnes)
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    {[-1000, -100, 100, 1000].map(inc => (
                      <button
                        key={inc}
                        onClick={() => setPayloadKg(prev => Math.max(1, prev + inc))}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-mono text-slate-600 dark:text-slate-400"
                      >
                        {inc > 0 ? `+${inc}` : inc}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="range"
                  min={10}
                  max={120000}
                  step={50}
                  value={payloadKg}
                  onChange={e => setPayloadKg(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
                />
              </div>
            </div>

            {/* Stages Input Cards */}
            <div className="space-y-3">
              {stages.slice(0, numStages).map((st, idx) => {
                const res = stagingResults.stages[idx];
                return (
                  <div key={st.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{st.name}</h4>
                      </div>

                      {/* Stage Computed Badges */}
                      {res && (
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 font-semibold">
                            Δv: {Math.round(res.deltaV).toLocaleString()} m/s
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            TWR: {res.twr0.toFixed(2)} → {res.twrF.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Stage Input Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="text-[11px] text-slate-500 dark:text-slate-400">Propellant (kg)</label>
                        <input
                          type="number"
                          value={st.propellantKg}
                          onChange={e => updateStageField(idx, 'propellantKg', Math.max(1, Number(e.target.value)))}
                          className="mt-1 w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 dark:text-slate-400">Dry Mass (kg)</label>
                        <input
                          type="number"
                          value={st.dryMassKg}
                          onChange={e => updateStageField(idx, 'dryMassKg', Math.max(1, Number(e.target.value)))}
                          className="mt-1 w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 dark:text-slate-400">Isp (seconds)</label>
                        <input
                          type="number"
                          value={st.ispSec}
                          onChange={e => updateStageField(idx, 'ispSec', Math.max(50, Number(e.target.value)))}
                          className="mt-1 w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 dark:text-slate-400">Thrust (kN)</label>
                        <input
                          type="number"
                          value={st.thrustKn}
                          onChange={e => updateStageField(idx, 'thrustKn', Math.max(1, Number(e.target.value)))}
                          className="mt-1 w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Stage Metrics footer */}
                    {res && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <div>Mass Ratio: <span className="text-slate-700 dark:text-slate-300 font-medium">{res.massRatio.toFixed(2)}</span></div>
                        <div>Burn Time: <span className="text-slate-700 dark:text-slate-300 font-medium">{Math.round(res.burnTimeSec)}s ({ (res.burnTimeSec / 60).toFixed(1) }m)</span></div>
                        <div>Structural Fraction: <span className="text-slate-700 dark:text-slate-300 font-medium">{res.structuralFraction.toFixed(1)}%</span></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Metrics & Reachability Dashboard (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Mission Key Readouts */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-4">
              <h3 className="text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                Mission Capability & Tsiolkovsky Budget
              </h3>

              {/* Total Δv Highlight Card */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Total Vehicle Cumulative Velocity</div>
                <div className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {Math.round(stagingResults.totalDeltaV).toLocaleString()} <span className="text-xs font-normal text-slate-500">m/s</span>
                  <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-2">
                    ({(stagingResults.totalDeltaV / 1000).toFixed(2)} km/s)
                  </span>
                </div>
              </div>

              {/* Grid 3-Metric Cards */}
              <div className="grid grid-cols-3 gap-2.5 font-mono text-center">
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide">Gross Liftoff</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {(stagingResults.grossMassKg / 1000).toFixed(1)} t
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide">Payload Frac</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {stagingResults.payloadFraction.toFixed(2)}%
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide">Liftoff TWR</div>
                  <div className={`text-xs font-bold mt-1 ${
                    stagingResults.liftoffTwr < 1.0 
                      ? 'text-red-500' 
                      : stagingResults.liftoffTwr < 1.15 
                        ? 'text-amber-500' 
                        : 'text-emerald-500'
                  }`}>
                    {stagingResults.liftoffTwr.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* TWR Status Note */}
              {stagingResults.liftoffTwr < 1.0 && (
                <div className="p-2.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>Warning: Liftoff TWR &lt; 1.0. Rocket cannot lift off under Earth gravity without increasing Stage 1 thrust.</span>
                </div>
              )}

              {/* Mission Milestones Reachability checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Destination Reachability</div>
                <div className="space-y-1.5">
                  {MISSION_MILESTONES.map(ms => {
                    const achieved = stagingResults.totalDeltaV >= ms.deltaVKmS * 1000;
                    return (
                      <div
                        key={ms.id}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                          achieved
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                            : 'bg-slate-50/40 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className={`w-3.5 h-3.5 ${achieved ? 'text-emerald-500' : 'text-slate-400'}`} />
                          <span className="font-medium">{ms.name}</span>
                        </div>
                        <div className="font-mono text-[11px]">
                          {ms.deltaVKmS} km/s
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mass Distribution Stack Bar */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Mass Stack Breakdown</div>
                <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-700">
                  {/* Payload */}
                  <div
                    style={{ width: `${Math.max(1, (payloadKg / stagingResults.grossMassKg) * 100)}%` }}
                    className="bg-amber-500 h-full"
                    title={`Payload: ${(payloadKg / 1000).toFixed(1)}t`}
                  />
                  {/* Stages */}
                  {stages.slice(0, numStages).map((st, idx) => {
                    const dryPct = (st.dryMassKg / stagingResults.grossMassKg) * 100;
                    const propPct = (st.propellantKg / stagingResults.grossMassKg) * 100;
                    const colors = [
                      { dry: 'bg-slate-400', prop: 'bg-blue-500' },
                      { dry: 'bg-slate-500', prop: 'bg-indigo-500' },
                      { dry: 'bg-slate-600', prop: 'bg-cyan-500' },
                    ][idx];
                    return (
                      <React.Fragment key={st.id}>
                        <div style={{ width: `${dryPct}%` }} className={`${colors.dry} h-full`} title={`${st.name} Dry: ${(st.dryMassKg/1000).toFixed(1)}t`} />
                        <div style={{ width: `${propPct}%` }} className={`${colors.prop} h-full`} title={`${st.name} Propellant: ${(st.propellantKg/1000).toFixed(1)}t`} />
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Yellow = Payload</span>
                  <span>Blue/Indigo = Propellant</span>
                  <span>Gray = Dry Structure</span>
                </div>
              </div>
            </div>

            {/* Sensitivity Curve Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                  Payload Sensitivity (Δv vs Payload Mass)
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Shows exponential Δv decay as payload increases. Orange dot marks current vehicle payload.
              </p>
              <div className="w-full h-44 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center">
                <canvas
                  ref={sensitivityCanvasRef}
                  width={460}
                  height={176}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW 2: DE LAVAL NOZZLE GAS DYNAMICS       */}
      {/* ========================================== */}
      {subTab === 'nozzle' && (
        <div className="space-y-6">
          {/* Controls Bar & Presets */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Rocket Engine Preset</label>
                <select
                  value={selectedNozzlePreset}
                  onChange={e => handleApplyNozzlePreset(e.target.value)}
                  className="mt-1 block w-full sm:w-80 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none"
                >
                  {NOZZLE_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                  <option value="custom">Custom Parameters</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSimRunning(p => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  {isSimRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
                  {isSimRunning ? 'Pause Flow' : 'Resume Flow'}
                </button>
                <button
                  onClick={() => handleApplyNozzlePreset(selectedNozzlePreset)}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                  title="Reset to preset defaults"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {/* Expansion Ratio ε */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Area Ratio (Ae / A*)</span>
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{expansionRatio}</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={200}
                  step={1}
                  value={expansionRatio}
                  onChange={e => { setSelectedNozzlePreset('custom'); setExpansionRatio(Number(e.target.value)); }}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Chamber Pressure Pc */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Chamber Pressure (Pc)</span>
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{pcBar} bar</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={350}
                  step={1}
                  value={pcBar}
                  onChange={e => { setSelectedNozzlePreset('custom'); setPcBar(Number(e.target.value)); }}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Chamber Temperature Tc */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Chamber Temp (Tc)</span>
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{tcK} K</span>
                </div>
                <input
                  type="range"
                  min={1800}
                  max={3800}
                  step={25}
                  value={tcK}
                  onChange={e => { setSelectedNozzlePreset('custom'); setTcK(Number(e.target.value)); }}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Ambient Altitude */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Altitude (Pa)</span>
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {altitudeKm === 0 ? 'Sea Level (0 km)' : altitudeKm >= 80 ? 'Vacuum (Space)' : `${altitudeKm} km`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={1}
                  value={altitudeKm}
                  onChange={e => setAltitudeKm(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>

            {/* Advanced Thermodynamics Properties (Gamma, Molar mass, Throat Dia) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Specific Heat Ratio (γ):</span>
                <input
                  type="number"
                  step={0.01}
                  min={1.15}
                  max={1.67}
                  value={gamma}
                  onChange={e => { setSelectedNozzlePreset('custom'); setGamma(Number(e.target.value)); }}
                  className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 font-mono text-slate-900 dark:text-slate-100 text-right"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Molar Mass (g/mol):</span>
                <input
                  type="number"
                  step={0.5}
                  min={2}
                  max={45}
                  value={molarMass}
                  onChange={e => { setSelectedNozzlePreset('custom'); setMolarMass(Number(e.target.value)); }}
                  className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 font-mono text-slate-900 dark:text-slate-100 text-right"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Throat Dia (mm):</span>
                <input
                  type="number"
                  step={5}
                  min={20}
                  max={1000}
                  value={throatDiameterMm}
                  onChange={e => { setSelectedNozzlePreset('custom'); setThroatDiameterMm(Number(e.target.value)); }}
                  className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 font-mono text-slate-900 dark:text-slate-100 text-right"
                />
              </div>
            </div>
          </div>

          {/* Interactive 2D Nozzle Cutaway & Exhaust Canvas */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-blue-500" />
                Supersonic Converging-Diverging Cutaway & Dynamic Shock Plume
              </h3>

              {/* Expansion Regime Badge */}
              <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
                nozzleResults.regime === 'separated'
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-900 text-red-700 dark:text-red-300'
                  : nozzleResults.regime === 'overexpanded'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900 text-amber-700 dark:text-amber-300'
                    : nozzleResults.regime === 'ideal'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                      : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-900 text-blue-700 dark:text-blue-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  nozzleResults.regime === 'separated' ? 'bg-red-500' : nozzleResults.regime === 'overexpanded' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                {nozzleResults.regimeTitle}
              </div>
            </div>

            {/* Canvas Viewport */}
            <div className="w-full h-72 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative">
              <canvas
                ref={nozzleCanvasRef}
                width={800}
                height={288}
                className="w-full h-full block"
              />
            </div>

            {/* Diagnostic Alert Box */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <div className="font-semibold text-slate-900 dark:text-slate-100">{nozzleResults.regimeTitle}</div>
                <div>{nozzleResults.regimeDesc}</div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Exit Pressure (Pe): {nozzleResults.peBar.toFixed(3)} bar | Ambient Pressure (Pa): {nozzleResults.paBar.toFixed(3)} bar | Pressure Ratio (Pe/Pa): {nozzleResults.pressureRatio.toFixed(3)}
                </div>
              </div>
            </div>
          </div>

          {/* Key Output Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Exit Mach (Me)</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                {nozzleResults.me.toFixed(2)} M
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Supersonic Ratio</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Exhaust Velocity (ve)</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                {Math.round(nozzleResults.veMs).toLocaleString()} <span className="text-xs text-slate-400">m/s</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{(nozzleResults.veMs / 1000).toFixed(2)} km/s</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Thrust (F)</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                {Math.round(nozzleResults.thrustKn).toLocaleString()} <span className="text-xs text-slate-400">kN</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Momentum + Pressure</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Specific Impulse (Isp)</div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {Math.round(nozzleResults.ispSec)} <span className="text-xs text-slate-400">s</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Effective efficiency</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Mass Flow (ṁ)</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                {Math.round(nozzleResults.mdotKgS)} <span className="text-xs text-slate-400">kg/s</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Choked throat flow</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Exit Diameter (De)</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                {nozzleResults.exitDiameterMm} <span className="text-xs text-slate-400">mm</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{(nozzleResults.exitDiameterMm / 1000).toFixed(2)} m Bell</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
