import React, { useState, useEffect, useRef } from 'react';
import { GasParticle, KineticSimulationTelemetry, ThermoUnitSystem } from '../../types/thermodynamics';
import { KINETIC_SPECIES_LIST, kelvinToUnit, pascalToUnit } from '../../data/thermoData';
import { Play, Pause, RotateCcw, Sparkles, Sliders, Activity } from 'lucide-react';

interface KineticSimulatorProps {
  unitSystem: ThermoUnitSystem;
}

export const KineticSimulator: React.FC<KineticSimulatorProps> = ({ unitSystem }) => {
  // Simulation Controls
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [selectedSpecies1, setSelectedSpecies1] = useState<string>('he');
  const [selectedSpecies2, setSelectedSpecies2] = useState<string>('xe');
  const [isBinaryMixture, setIsBinaryMixture] = useState<boolean>(false);
  const [numParticles, setNumParticles] = useState<number>(140);
  const [thermostatTempK, setThermostatTempK] = useState<number>(300);
  const [pistonFraction, setPistonFraction] = useState<number>(0.85); // 0.35 to 1.0 (chamber width)
  const [isPartitionOpen, setIsPartitionOpen] = useState<boolean>(true);
  const [pinholeSize, setPinholeSize] = useState<number>(45); // px height of hole
  const [gravityEnabled, setGravityEnabled] = useState<boolean>(false);

  // Canvas Refs
  const simCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const histCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Particles & Engine State Ref
  const particlesRef = useRef<GasParticle[]>([]);
  const animFrameIdRef = useRef<number>(0);
  const wallImpulseAccRef = useRef<number>(0);
  const lastImpulseTimeRef = useRef<number>(performance.now());
  const collisionCountRef = useRef<number>(0);

  // Telemetry State
  const [telemetry, setTelemetry] = useState<KineticSimulationTelemetry>({
    temperatureK: 300,
    pressurePa: 101325,
    numParticles: 140,
    volumePct: 85,
    meanSpeed: 420,
    rmsSpeed: 450,
    mostProbableSpeed: 380,
    meanFreePath: 32,
    collisionRate: 480
  });

  // Re-initialize particles when species, count, or mixture changes
  const initParticles = () => {
    const canvas = simCanvasRef.current;
    const width = canvas ? canvas.width : 600;
    const height = canvas ? canvas.height : 360;
    const chamberW = width * pistonFraction;

    const sp1 = KINETIC_SPECIES_LIST.find(s => s.id === selectedSpecies1) || KINETIC_SPECIES_LIST[0];
    const sp2 = KINETIC_SPECIES_LIST.find(s => s.id === selectedSpecies2) || KINETIC_SPECIES_LIST[3];

    const newParticles: GasParticle[] = [];
    const count = numParticles;

    // Thermal speed baseline: v_rms ~ sqrt(3 * k * T / m)
    const baseSpeed1 = Math.sqrt((3 * 8.314 * thermostatTempK) / (sp1.molarMass * 1e-3)) * 0.0035;
    const baseSpeed2 = Math.sqrt((3 * 8.314 * thermostatTempK) / (sp2.molarMass * 1e-3)) * 0.0035;

    for (let i = 0; i < count; i++) {
      const isSecond = isBinaryMixture && i % 2 === 1;
      const sp = isSecond ? sp2 : sp1;
      const baseSpd = isSecond ? baseSpeed2 : baseSpeed1;

      // Spawn inside left chamber if partition closed, or anywhere if open
      const maxX = isPartitionOpen ? chamberW - 15 : width * 0.5 - 15;
      const x = 15 + Math.random() * Math.max(20, maxX - 20);
      const y = 15 + Math.random() * (height - 30);

      // Maxwellian speed distribution approximation (Box-Muller)
      const u1 = Math.max(1e-5, Math.random());
      const u2 = Math.random();
      const mag = baseSpd * Math.sqrt(-2 * Math.log(u1));

      newParticles.push({
        x,
        y,
        vx: mag * Math.cos(2 * Math.PI * u2),
        vy: mag * Math.sin(2 * Math.PI * u2),
        mass: sp.molarMass,
        radius: sp.radius,
        color: sp.color,
        species: sp.symbol
      });
    }

    particlesRef.current = newParticles;
    wallImpulseAccRef.current = 0;
    collisionCountRef.current = 0;
  };

  useEffect(() => {
    initParticles();
  }, [selectedSpecies1, selectedSpecies2, isBinaryMixture, numParticles]);

  // Main 60 FPS physics loop
  useEffect(() => {
    let lastTime = performance.now();
    let teleTimer = performance.now();

    const render = (time: number) => {
      const dt = Math.min(25, time - lastTime) / 16.67; // Normalized frame step
      lastTime = time;

      const simCanvas = simCanvasRef.current;
      const histCanvas = histCanvasRef.current;
      if (!simCanvas) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      const sCtx = simCanvas.getContext('2d');
      const hCtx = histCanvas?.getContext('2d');

      const W = simCanvas.width;
      const H = simCanvas.height;
      const chamberW = W * pistonFraction;
      const partX = W * 0.5; // Partition position
      const holeTop = (H - pinholeSize) / 2;
      const holeBottom = (H + pinholeSize) / 2;

      const particles = particlesRef.current;
      const pLen = particles.length;

      if (isRunning && sCtx) {
        // Thermostat thermalization speed factors
        const kB_eff = 0.00045; // effective simulation Boltzmann scaling
        const gAcc = gravityEnabled ? 0.08 * dt : 0;

        // 1. Move particles & handle wall collisions
        for (let i = 0; i < pLen; i++) {
          const p = particles[i];

          p.vy += gAcc;
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          // Collision with Left Wall (x = 0)
          if (p.x - p.radius < 0) {
            p.x = p.radius;
            p.vx = Math.abs(p.vx);
            wallImpulseAccRef.current += 2 * p.mass * p.vx;
          }

          // Collision with Right Moving Piston (x = chamberW)
          if (p.x + p.radius > chamberW) {
            p.x = chamberW - p.radius;
            p.vx = -Math.abs(p.vx);
            wallImpulseAccRef.current += 2 * p.mass * Math.abs(p.vx);
          }

          // Collision with Top Wall (y = 0)
          if (p.y - p.radius < 0) {
            p.y = p.radius;
            p.vy = Math.abs(p.vy);
            wallImpulseAccRef.current += 2 * p.mass * p.vy;
          }

          // Collision with Bottom Thermostat Wall (y = H)
          if (p.y + p.radius > H) {
            p.y = H - p.radius;
            // Thermalize collision against heated plate
            const thermalSpeed = Math.sqrt((thermostatTempK * kB_eff) / (p.mass * 0.05));
            const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7; // bounce upward
            p.vx = thermalSpeed * Math.cos(angle);
            p.vy = thermalSpeed * Math.sin(angle);
            wallImpulseAccRef.current += 2 * p.mass * Math.abs(p.vy);
          }

          // Collision with Center Partition (if partition enabled)
          if (!isPartitionOpen) {
            // Full barrier
            if (p.x - p.radius < partX && p.x + p.radius > partX) {
              if (p.vx > 0) {
                p.x = partX - p.radius;
                p.vx = -p.vx;
              } else {
                p.x = partX + p.radius;
                p.vx = -p.vx;
              }
              wallImpulseAccRef.current += 2 * p.mass * Math.abs(p.vx);
            }
          } else if (pinholeSize < H - 20) {
            // Barrier with pinhole orifice
            const inPinhole = p.y >= holeTop && p.y <= holeBottom;
            if (!inPinhole && p.x - p.radius < partX + 2 && p.x + p.radius > partX - 2) {
              if (p.vx > 0) {
                p.x = partX - 2 - p.radius;
                p.vx = -p.vx;
              } else {
                p.x = partX + 2 + p.radius;
                p.vx = -p.vx;
              }
              wallImpulseAccRef.current += 2 * p.mass * Math.abs(p.vx);
            }
          }
        }

        // 2. Inter-particle Elastic Collisions (Hard-Sphere 2D)
        for (let i = 0; i < pLen; i++) {
          const p1 = particles[i];
          for (let j = i + 1; j < pLen; j++) {
            const p2 = particles[j];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const distSq = dx * dx + dy * dy;
            const minDist = p1.radius + p2.radius;

            if (distSq < minDist * minDist && distSq > 1e-6) {
              collisionCountRef.current++;
              const dist = Math.sqrt(distSq);
              // Normal vector
              const nx = dx / dist;
              const ny = dy / dist;

              // Separate overlapping particles
              const overlap = (minDist - dist) * 0.5;
              p1.x -= nx * overlap;
              p1.y -= ny * overlap;
              p2.x += nx * overlap;
              p2.y += ny * overlap;

              // Relative velocity
              const kx = p1.vx - p2.vx;
              const ky = p1.vy - p2.vy;
              const p = 2 * (nx * kx + ny * ky) / (p1.mass + p2.mass);

              // Elastic impulse
              p1.vx -= p * p2.mass * nx;
              p1.vy -= p * p2.mass * ny;
              p2.vx += p * p1.mass * nx;
              p2.vy += p * p1.mass * ny;
            }
          }
        }
      }

      // 3. Render Simulation Scene
      if (sCtx) {
        sCtx.clearRect(0, 0, W, H);

        // Background Chamber
        sCtx.fillStyle = '#090d16';
        sCtx.fillRect(0, 0, chamberW, H);

        // Excluded Piston Zone
        sCtx.fillStyle = '#1e293b';
        sCtx.fillRect(chamberW, 0, W - chamberW, H);

        // Piston Head Graphic
        sCtx.fillStyle = '#475569';
        sCtx.fillRect(chamberW - 10, 0, 10, H);
        sCtx.fillStyle = '#334155';
        sCtx.fillRect(chamberW, H * 0.4, W - chamberW, H * 0.2); // Piston rod

        // Bottom Thermostat Glow (Orange/Red for hot, Cyan for cold)
        const tRatio = Math.min(1, Math.max(0, (thermostatTempK - 100) / 700));
        sCtx.fillStyle = tRatio > 0.4 ? `rgba(249, 115, 22, ${0.3 + tRatio * 0.5})` : `rgba(56, 189, 248, 0.4)`;
        sCtx.fillRect(0, H - 6, chamberW, 6);

        // Partition Wall (if present)
        if (!isPartitionOpen) {
          sCtx.fillStyle = '#64748b';
          sCtx.fillRect(partX - 3, 0, 6, H);
        } else if (pinholeSize < H - 20) {
          sCtx.fillStyle = '#64748b';
          sCtx.fillRect(partX - 3, 0, 6, holeTop);
          sCtx.fillRect(partX - 3, holeBottom, 6, H - holeBottom);

          // Pinhole Aperture Marker
          sCtx.strokeStyle = '#38bdf8';
          sCtx.setLineDash([2, 2]);
          sCtx.beginPath();
          sCtx.moveTo(partX, holeTop);
          sCtx.lineTo(partX, holeBottom);
          sCtx.stroke();
          sCtx.setLineDash([]);
        }

        // Draw Gas Particles
        for (let i = 0; i < pLen; i++) {
          const p = particles[i];
          sCtx.beginPath();
          sCtx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
          sCtx.fillStyle = p.color;
          sCtx.fill();

          // Speed vector tail
          sCtx.beginPath();
          sCtx.moveTo(p.x, p.y);
          sCtx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
          sCtx.strokeStyle = `${p.color}55`;
          sCtx.lineWidth = 1;
          sCtx.stroke();
        }

        // Perimeter border
        sCtx.strokeStyle = '#334155';
        sCtx.lineWidth = 2;
        sCtx.strokeRect(0, 0, W, H);
      }

      // 4. Update Telemetry & Velocity Histogram (throttled to ~8 Hz for smooth UI)
      if (time - teleTimer > 120) {
        teleTimer = time;
        const now = time;
        const dSec = (now - lastImpulseTimeRef.current) / 1000;
        lastImpulseTimeRef.current = now;

        // Microscopic temperature: <E_k> = 1/2 m <v^2> -> T = <E_k> / k_B
        let totalKineticEnergy = 0;
        let totalSpeed = 0;
        const speeds: number[] = [];

        for (let i = 0; i < pLen; i++) {
          const p = particles[i];
          const spdSq = p.vx * p.vx + p.vy * p.vy;
          const spd = Math.sqrt(spdSq);
          // Scale to realistic m/s
          const realSpd = spd * 160;
          speeds.push(realSpd);
          totalSpeed += realSpd;
          totalKineticEnergy += 0.5 * (p.mass * 1e-3) * realSpd * realSpd;
        }

        const avgKe = pLen > 0 ? totalKineticEnergy / pLen : 0;
        // 2D Equipartition: <E_k> = k_B * T  => T = <E_k> / 1.380649e-23
        const measuredTempK = Math.max(10, Math.round(avgKe / 1.380649e-23 * 0.00000000000000000000001)); // normalized scaling
        const meanSpeed = pLen > 0 ? Math.round(totalSpeed / pLen) : 0;
        const rmsSpeed = Math.round(Math.sqrt(speeds.reduce((acc, v) => acc + v * v, 0) / (pLen || 1)));
        const mostProbable = Math.round(rmsSpeed * 0.816);

        // Pressure from wall impulse per unit perimeter per second
        const perimeter = 2 * (chamberW + H);
        const impulsePerSec = dSec > 0 ? wallImpulseAccRef.current / dSec : 0;
        const measuredPressurePa = Math.max(5000, Math.round((impulsePerSec / perimeter) * 3500));
        wallImpulseAccRef.current = 0;

        const collisionsPerSec = dSec > 0 ? Math.round(collisionCountRef.current / dSec) : 0;
        collisionCountRef.current = 0;

        // Mean free path: lambda = V / (sqrt(2) * pi * d^2 * N)
        const meanFreePathNm = Math.max(5, Math.round((pistonFraction * 100) / (pLen * 0.02)));

        setTelemetry({
          temperatureK: Math.round(measuredTempK * 0.4 + thermostatTempK * 0.6), // smooth blending
          pressurePa: measuredPressurePa,
          numParticles: pLen,
          volumePct: Math.round(pistonFraction * 100),
          meanSpeed,
          rmsSpeed,
          mostProbableSpeed: mostProbable,
          meanFreePath: meanFreePathNm,
          collisionRate: collisionsPerSec
        });

        // 5. Draw Maxwell-Boltzmann Histogram & Analytical Curve
        if (hCtx && histCanvas) {
          const hw = histCanvas.width;
          const hh = histCanvas.height;
          hCtx.clearRect(0, 0, hw, hh);

          // Histogram binning
          const maxSpeed = 1600;
          const numBins = 24;
          const binWidth = maxSpeed / numBins;
          const bins = new Array(numBins).fill(0);

          speeds.forEach(s => {
            const b = Math.min(numBins - 1, Math.floor(s / binWidth));
            bins[b]++;
          });

          const maxBinCount = Math.max(1, ...bins);

          // Draw histogram bars
          const barPxW = hw / numBins;
          hCtx.fillStyle = 'rgba(56, 189, 248, 0.45)';
          hCtx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
          hCtx.lineWidth = 1;

          for (let b = 0; b < numBins; b++) {
            const barH = (bins[b] / maxBinCount) * (hh - 28);
            const bx = b * barPxW;
            const by = hh - 20 - barH;
            hCtx.fillRect(bx + 1, by, barPxW - 2, barH);
            hCtx.strokeRect(bx + 1, by, barPxW - 2, barH);
          }

          // Overlaid Maxwell-Boltzmann theoretical curve
          // 2D MB distribution: f(v) = (m / (k_B * T)) * v * exp(-m*v^2 / (2*k_B*T))
          hCtx.beginPath();
          hCtx.strokeStyle = '#f59e0b';
          hCtx.lineWidth = 2.5;

          const sigmaSq = (rmsSpeed * 0.707) ** 2 || 1;
          for (let px = 0; px < hw; px++) {
            const v = (px / hw) * maxSpeed;
            const prob = (v / sigmaSq) * Math.exp(-(v * v) / (2 * sigmaSq));
            const y = hh - 20 - prob * sigmaSq * 1.8 * (hh - 35) / rmsSpeed;
            if (px === 0) hCtx.moveTo(px, Math.max(5, y));
            else hCtx.lineTo(px, Math.max(5, y));
          }
          hCtx.stroke();

          // Axis and labels
          hCtx.strokeStyle = '#475569';
          hCtx.lineWidth = 1;
          hCtx.beginPath();
          hCtx.moveTo(0, hh - 20);
          hCtx.lineTo(hw, hh - 20);
          hCtx.stroke();

          hCtx.fillStyle = '#94a3b8';
          hCtx.font = '9px monospace';
          hCtx.fillText('0 m/s', 4, hh - 6);
          hCtx.fillText(`v_mp: ${mostProbable}`, hw * 0.35, hh - 6);
          hCtx.fillText(`${maxSpeed} m/s`, hw - 52, hh - 6);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameIdRef.current);
  }, [isRunning, pistonFraction, thermostatTempK, isPartitionOpen, pinholeSize, gravityEnabled]);

  // Convert telemetry values
  const dispTemp = kelvinToUnit(telemetry.temperatureK, unitSystem);
  const dispPress = pascalToUnit(telemetry.pressurePa, unitSystem);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Explainer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Kinetic Theory & Molecular Dynamics
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Microscopic elastic particle collisions, thermodynamic equilibration, and Maxwell-Boltzmann speed distribution.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
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
            <span>{isRunning ? 'Pause' : 'Resume'}</span>
          </button>

          <button
            onClick={initParticles}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
            title="Reset particles"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Stage: Simulation Viewport + Live Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chamber Canvas (Left 7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Gas Cylinder & Compression Piston
            </span>
            <span className="text-xs font-mono text-slate-500">
              Volume: {telemetry.volumePct}% · {telemetry.numParticles} particles
            </span>
          </div>

          <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex justify-center">
            <canvas
              ref={simCanvasRef}
              width={560}
              height={340}
              className="w-full h-auto block"
            />
            <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur border border-slate-800 rounded px-2 py-0.5 text-[10px] text-slate-400 font-mono">
              Adjust volume slider below
            </div>
          </div>

          {/* Interactive Piston Volume Slider */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Chamber Compression (Volume)</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-200">{Math.round(pistonFraction * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.35}
              max={1.0}
              step={0.01}
              value={pistonFraction}
              onChange={e => setPistonFraction(parseFloat(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
            />
          </div>
        </div>

        {/* Live Velocity Distribution Histogram (Right 5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-500" />
                Velocity Distribution (Maxwell-Boltzmann)
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2 rounded bg-sky-500/50 inline-block" /> Sampled
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-amber-500 inline-block" /> Theory
                </span>
              </div>
            </div>

            <div className="bg-slate-950 rounded-lg p-2 border border-slate-800">
              <canvas
                ref={histCanvasRef}
                width={360}
                height={190}
                className="w-full h-auto block"
              />
            </div>
          </div>

          {/* Microscopic Velocity Statistics */}
          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <p className="text-[10px] text-slate-500">Most Probable (v_mp)</p>
              <p className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100">{telemetry.mostProbableSpeed} <span className="text-[10px] font-normal text-slate-500">m/s</span></p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <p className="text-[10px] text-slate-500">Mean Speed (v_avg)</p>
              <p className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100">{telemetry.meanSpeed} <span className="text-[10px] font-normal text-slate-500">m/s</span></p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <p className="text-[10px] text-slate-500">RMS Speed (v_rms)</p>
              <p className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100">{telemetry.rmsSpeed} <span className="text-[10px] font-normal text-slate-500">m/s</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Simplified, Clean Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Temperature</span>
          <p className="text-xl font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {dispTemp.value.toFixed(1)} <span className="text-xs font-normal text-slate-500">{dispTemp.label}</span>
          </p>
          <span className="text-[11px] text-slate-500 font-mono">{telemetry.temperatureK} K</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Wall Pressure</span>
          <p className="text-xl font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {dispPress.value.toFixed(1)} <span className="text-xs font-normal text-slate-500">{dispPress.label}</span>
          </p>
          <span className="text-[11px] text-slate-500 font-mono">From boundary impulse</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Mean Free Path</span>
          <p className="text-xl font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {telemetry.meanFreePath} <span className="text-xs font-normal text-slate-500">nm</span>
          </p>
          <span className="text-[11px] text-slate-500 font-mono">{telemetry.collisionRate} hits/sec</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Internal Energy</span>
          <p className="text-xl font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {((3 / 2) * telemetry.numParticles * 1.38e-23 * telemetry.temperatureK * 1e20).toFixed(2)} <span className="text-xs font-normal text-slate-500">zJ</span>
          </p>
          <span className="text-[11px] text-slate-500 font-mono">U = 3/2 N k_B T</span>
        </div>
      </div>

      {/* Physics Control Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          Simulation Parameters & Experiments
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Gas Species & Mixture */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300">Gas Species & Composition</label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Primary Gas:</span>
                <select
                  value={selectedSpecies1}
                  onChange={e => setSelectedSpecies1(e.target.value)}
                  className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded px-2 py-1 focus:outline-none"
                >
                  {KINETIC_SPECIES_LIST.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.symbol}, {s.molarMass} g/mol)
                    </option>
                  ))}
                </select>
              </div>

              {/* Binary Mixture Toggle */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400">Binary Mixture Mode:</span>
                <button
                  onClick={() => setIsBinaryMixture(!isBinaryMixture)}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    isBinaryMixture
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isBinaryMixture ? 'Mixed (Equipartition)' : 'Single Gas'}
                </button>
              </div>

              {isBinaryMixture && (
                <div className="flex items-center justify-between animate-fadeIn">
                  <span className="text-xs text-slate-400">Secondary Heavy Gas:</span>
                  <select
                    value={selectedSpecies2}
                    onChange={e => setSelectedSpecies2(e.target.value)}
                    className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded px-2 py-1 focus:outline-none"
                  >
                    {KINETIC_SPECIES_LIST.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.symbol}, {s.molarMass} g/mol)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Particle Count */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Particle Count (N)</span>
                  <span className="font-mono text-slate-200">{numParticles}</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={250}
                  step={10}
                  value={numParticles}
                  onChange={e => setNumParticles(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Column 2: Thermostat & Temperature */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300">Thermostat Heat Exchange (T_wall)</label>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Bottom Plate Temperature</span>
                <span className="font-mono text-amber-400">{thermostatTempK} K ({thermostatTempK - 273} °C)</span>
              </div>
              <input
                type="range"
                min={100}
                max={900}
                step={25}
                value={thermostatTempK}
                onChange={e => setThermostatTempK(parseInt(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
              <p className="text-[11px] text-slate-500">
                Particles colliding with the bottom orange wall are thermalized, transferring kinetic energy to or from the gas.
              </p>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-400">Gravity Stratification:</span>
                <button
                  onClick={() => setGravityEnabled(!gravityEnabled)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                    gravityEnabled
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {gravityEnabled ? 'Barometric On (g)' : 'Zero Gravity'}
                </button>
              </div>
            </div>
          </div>

          {/* Column 3: Partition & Effusion Barrier */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300">Effusion & Graham's Law Pinhole</label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Center Partition:</span>
                <button
                  onClick={() => setIsPartitionOpen(!isPartitionOpen)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                    !isPartitionOpen
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {!isPartitionOpen ? 'Closed (Trapped)' : 'Pinhole Orifice'}
                </button>
              </div>

              {isPartitionOpen && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Pinhole Aperture Height</span>
                    <span className="font-mono text-slate-200">{pinholeSize} px</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={120}
                    step={5}
                    value={pinholeSize}
                    onChange={e => setPinholeSize(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                  />
                  <p className="text-[11px] text-slate-500">
                    Demonstrates Graham's Law of Effusion: light particles effuse through the pinhole faster by a factor of sqrt(M2 / M1).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
