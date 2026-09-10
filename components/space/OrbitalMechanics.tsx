import React, { useState, useEffect, useRef } from 'react';
import { Orbit, Play, Pause, RotateCcw, Sliders, Compass, Globe2, ArrowUpRight } from 'lucide-react';

interface CelestialBody {
  id: string;
  name: string;
  mu: number; // m^3 / s^2
  radiusKm: number; // km
  color: string;
  atmosphereKm: number;
}

const CELESTIAL_BODIES: CelestialBody[] = [
  { id: 'earth', name: 'Earth', mu: 3.986004418e14, radiusKm: 6378.1, color: '#38bdf8', atmosphereKm: 100 },
  { id: 'moon', name: 'Moon', mu: 4.9048695e12, radiusKm: 1737.4, color: '#94a3b8', atmosphereKm: 0 },
  { id: 'mars', name: 'Mars', mu: 4.282837e13, radiusKm: 3389.5, color: '#fb923c', atmosphereKm: 120 },
  { id: 'jupiter', name: 'Jupiter', mu: 1.26686534e17, radiusKm: 69911, color: '#f59e0b', atmosphereKm: 1000 },
  { id: 'sun', name: 'Sun', mu: 1.3271244e20, radiusKm: 696340, color: '#facc15', atmosphereKm: 2000 },
];

interface OrbitPreset {
  id: string;
  name: string;
  bodyId: string;
  periapsisAltKm: number;
  apoapsisAltKm: number;
  targetAltKm: number;
  description: string;
}

const ORBIT_PRESETS: OrbitPreset[] = [
  {
    id: 'iss',
    name: 'ISS / Low Earth Orbit (LEO)',
    bodyId: 'earth',
    periapsisAltKm: 415,
    apoapsisAltKm: 425,
    targetAltKm: 35786,
    description: 'Circular orbit in the thermosphere (~420 km), traveling at 7.66 km/s with a 93-minute period.',
  },
  {
    id: 'gto',
    name: 'Geostationary Transfer Orbit (GTO → GEO)',
    bodyId: 'earth',
    periapsisAltKm: 250,
    apoapsisAltKm: 35786,
    targetAltKm: 35786,
    description: 'Highly elliptical transfer orbit used by commercial communication satellites to reach geostationary orbit.',
  },
  {
    id: 'gps',
    name: 'GPS Constellation (MEO)',
    bodyId: 'earth',
    periapsisAltKm: 20200,
    apoapsisAltKm: 20200,
    targetAltKm: 35786,
    description: 'Semi-synchronous circular orbit at 20,200 km altitude with an exact 12-hour period.',
  },
  {
    id: 'molniya',
    name: 'Molniya Orbit (High Latitude)',
    bodyId: 'earth',
    periapsisAltKm: 600,
    apoapsisAltKm: 39850,
    targetAltKm: 39850,
    description: 'High-eccentricity orbit (e ≈ 0.74) designed to maximize dwell time over high-latitude polar regions.',
  },
  {
    id: 'lunar_orbit',
    name: 'Low Lunar Orbit (Apollo / Artemis)',
    bodyId: 'moon',
    periapsisAltKm: 100,
    apoapsisAltKm: 100,
    targetAltKm: 500,
    description: 'Circular parking orbit around the Moon at 100 km altitude with a 118-minute orbital period.',
  },
  {
    id: 'mars_recon',
    name: 'Mars Reconnaissance Orbit',
    bodyId: 'mars',
    periapsisAltKm: 250,
    apoapsisAltKm: 310,
    targetAltKm: 17032,
    description: 'Near-circular science orbit mapping the Martian surface from ~280 km altitude.',
  },
];

export const OrbitalMechanics: React.FC = () => {
  const [selectedBodyId, setSelectedBodyId] = useState<string>('earth');
  const [periapsisAltKm, setPeriapsisAltKm] = useState<number>(400);
  const [apoapsisAltKm, setApoapsisAltKm] = useState<number>(35786);
  const [targetAltKm, setTargetAltKm] = useState<number>(35786);

  // Animation Controls
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1.0); // time multiplier
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trueAnomalyRef = useRef<number>(0);
  const animFrameIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  const currentBody = CELESTIAL_BODIES.find((b) => b.id === selectedBodyId) || CELESTIAL_BODIES[0];
  const mu = currentBody.mu;
  const R_body = currentBody.radiusKm * 1000; // meters

  // Current Initial Orbit Parameters
  const rp = R_body + Math.max(10, periapsisAltKm) * 1000; // meters
  const ra = R_body + Math.max(periapsisAltKm, apoapsisAltKm) * 1000; // meters
  const a = (rp + ra) / 2; // semi-major axis (m)
  const e = Math.min(0.98, Math.max(0, (ra - rp) / (ra + rp))); // eccentricity
  const periodSec = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / mu);
  const totalMins = Math.round(periodSec / 60);
  const periodHoursInt = Math.floor(totalMins / 60);
  const periodMinsRem = totalMins % 60;

  // Specific Orbital Energy (J/kg) & Angular Momentum (m^2/s)
  const specificEnergyMkJ = -mu / (2 * a) / 1e6; // MJ/kg
  const specificAngularMomentum = Math.sqrt(2 * mu * (ra * rp) / (ra + rp));

  // Velocities at Periapsis and Apoapsis
  const vp = Math.sqrt(mu * (2 / rp - 1 / a)); // m/s
  const va = Math.sqrt(mu * (2 / ra - 1 / a)); // m/s
  const vescPeriapsis = Math.sqrt((2 * mu) / rp); // escape velocity at periapsis

  // Hohmann Transfer to Target Orbit (Circular r1 = rp to Circular r2 = R_body + targetAlt)
  const rTarget = R_body + Math.max(10, targetAltKm) * 1000;
  const aTransfer = (rp + rTarget) / 2;

  // Burn 1 (at periapsis): Delta v1 from circular r1 to transfer ellipse
  const vCircular1 = Math.sqrt(mu / rp);
  const vTransfer1 = Math.sqrt(mu * (2 / rp - 1 / aTransfer));
  const deltaV1 = Math.abs(vTransfer1 - vCircular1);

  // Burn 2 (at apoapsis of transfer): Delta v2 from transfer ellipse to circular rTarget
  const vTransfer2 = Math.sqrt(mu * (2 / rTarget - 1 / aTransfer));
  const vCircular2 = Math.sqrt(mu / rTarget);
  const deltaV2 = Math.abs(vCircular2 - vTransfer2);

  const deltaVTotal = deltaV1 + deltaV2;
  const transferTimeSec = Math.PI * Math.sqrt(Math.pow(aTransfer, 3) / mu);
  const transferTimeHours = transferTimeSec / 3600;

  // Presets loader
  const handlePresetSelect = (presetId: string) => {
    const p = ORBIT_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setSelectedBodyId(p.bodyId);
    setPeriapsisAltKm(p.periapsisAltKm);
    setApoapsisAltKm(p.apoapsisAltKm);
    setTargetAltKm(p.targetAltKm);
    trueAnomalyRef.current = 0;
  };

  // Main 60 FPS Keplerian Orbit Animation
  useEffect(() => {
    lastTimeRef.current = performance.now();

    const render = (time: number) => {
      const dt = Math.min(50, time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const canvas = canvasRef.current;
      if (!canvas) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;

      // Determine view scaling so both initial orbit, transfer, and target fit comfortably
      const maxOrbitRadiusKm = Math.max(ra, rTarget) / 1000;
      const viewRadiusKm = maxOrbitRadiusKm * 1.35;
      const scale = (Math.min(W, H) / 2) / viewRadiusKm; // px per km

      // Advance Kepler Mean Anomaly M(t)
      if (isRunning && periodSec > 0) {
        // Real-time orbital frequency
        const meanMotion = (2 * Math.PI) / periodSec; // rad/s
        const dM = meanMotion * dt * (simSpeed * 80); // accelerated visually
        // Update Mean anomaly -> Solve Kepler's equation for Eccentric Anomaly E
        let M = (trueAnomalyRef.current + dM) % (2 * Math.PI);
        if (M < 0) M += 2 * Math.PI;

        // Newton-Raphson solver for M = E - e*sin(E)
        let E = M;
        for (let iter = 0; iter < 5; iter++) {
          const f = E - e * Math.sin(E) - M;
          const fPrime = 1 - e * Math.cos(E);
          E -= f / fPrime;
        }

        // True anomaly nu from E
        const sinNu = (Math.sqrt(1 - e * e) * Math.sin(E)) / (1 - e * Math.cos(E));
        const cosNu = (Math.cos(E) - e) / (1 - e * Math.cos(E));
        trueAnomalyRef.current = Math.atan2(sinNu, cosNu);
      }

      ctx.clearRect(0, 0, W, H);

      // Deep space background
      ctx.fillStyle = '#060911';
      ctx.fillRect(0, 0, W, H);

      // Distance Reference Rings
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      [1000, 5000, 10000, 20000, 36000, 50000].forEach((ringKm) => {
        if (ringKm < viewRadiusKm) {
          const rPx = ringKm * scale;
          ctx.beginPath();
          ctx.arc(cx, cy, rPx, 0, 2 * Math.PI);
          ctx.stroke();

          ctx.fillStyle = '#475569';
          ctx.font = '9px monospace';
          ctx.fillText(`${ringKm.toLocaleString()} km`, cx + rPx + 4, cy - 2);
        }
      });
      ctx.setLineDash([]);

      // 1. Draw Target Circular Destination Orbit
      const rTargetPx = (rTarget / 1000) * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, rTargetPx, 0, 2 * Math.PI);
      ctx.strokeStyle = '#0284c7';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Draw Hohmann Transfer Ellipse (if target is different)
      if (Math.abs(rTarget - ra) > 50000) {
        const aTxKm = aTransfer / 1000;
        const eTx = Math.abs(rTarget - rp) / (rTarget + rp);
        const cTxKm = aTxKm * eTx; // focus offset

        ctx.save();
        ctx.translate(cx - cTxKm * scale, cy);
        ctx.beginPath();
        const bTxKm = aTxKm * Math.sqrt(1 - eTx * eTx);
        ctx.ellipse(0, 0, aTxKm * scale, bTxKm * scale, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = '#10b981';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // 3. Draw Initial Orbit Ellipse
      // Focus is at (cx, cy). Center of ellipse is shifted by c = a * e
      const aKm = a / 1000;
      const cKm = aKm * e;
      const bKm = aKm * Math.sqrt(Math.max(0, 1 - e * e));

      ctx.save();
      ctx.translate(cx - cKm * scale, cy);
      ctx.beginPath();
      ctx.ellipse(0, 0, aKm * scale, bKm * scale, 0, 0, 2 * Math.PI);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Periapsis Node (P) Marker
      const pPx = (rp / 1000) * scale;
      ctx.beginPath();
      ctx.arc(cx + pPx, cy, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`P (${Math.round(periapsisAltKm).toLocaleString()} km)`, cx + pPx + 6, cy - 6);

      // Apoapsis Node (A) Marker
      const aPx = (ra / 1000) * scale;
      ctx.beginPath();
      ctx.arc(cx - aPx, cy, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`A (${Math.round(apoapsisAltKm).toLocaleString()} km)`, cx - aPx - 70, cy - 6);

      // 4. Central Celestial Body
      const bodyRadiusPx = Math.max(6, (R_body / 1000) * scale);

      // Atmosphere haze
      if (currentBody.atmosphereKm > 0) {
        const atmoRadiusPx = bodyRadiusPx + (currentBody.atmosphereKm * scale);
        const grad = ctx.createRadialGradient(cx, cy, bodyRadiusPx, cx, cy, atmoRadiusPx);
        grad.addColorStop(0, `${currentBody.color}40`);
        grad.addColorStop(1, `${currentBody.color}00`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, atmoRadiusPx, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Planet body
      ctx.beginPath();
      ctx.arc(cx, cy, bodyRadiusPx, 0, 2 * Math.PI);
      ctx.fillStyle = currentBody.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff40';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentBody.name, cx, cy + 3);

      // 5. Current Satellite Position & Velocity Vector
      const nu = trueAnomalyRef.current;
      const currentRadiusM = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
      const currentRadiusKm = currentRadiusM / 1000;
      const satX = cx + currentRadiusKm * scale * Math.cos(nu);
      const satY = cy - currentRadiusKm * scale * Math.sin(nu);

      // Satellite Dot
      ctx.beginPath();
      ctx.arc(satX, satY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Velocity Vector Arrow
      const currentSpeed = Math.sqrt(mu * (2 / currentRadiusM - 1 / a));
      const gammaFlightPath = Math.atan2(e * Math.sin(nu), 1 + e * Math.cos(nu));
      const headingAngle = nu + Math.PI / 2 - gammaFlightPath;
      const arrowLen = 22;

      ctx.beginPath();
      ctx.moveTo(satX, satY);
      ctx.lineTo(satX + Math.cos(headingAngle) * arrowLen, satY - Math.sin(headingAngle) * arrowLen);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Speed Tag
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`v = ${(currentSpeed / 1000).toFixed(2)} km/s`, satX + 8, satY + 12);

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameIdRef.current);
  }, [selectedBodyId, periapsisAltKm, apoapsisAltKm, targetAltKm, isRunning, simSpeed, a, e, rp, ra, rTarget, mu, R_body, aTransfer]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <Orbit className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Orbital Mechanics & Hohmann Transfer Simulator
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Keplerian orbital state propagation, vis-viva velocity curves, transfer trajectory delta-v budgets, and flight times.
            </p>
          </div>
        </div>

        {/* Global Action & Body Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Celestial Body Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
            <Globe2 className="w-3.5 h-3.5 text-blue-500" />
            <select
              value={selectedBodyId}
              onChange={(e) => setSelectedBodyId(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {CELESTIAL_BODIES.map((body) => (
                <option key={body.id} value={body.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {body.name} (R = {body.radiusKm.toLocaleString()} km)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm ${
              isRunning
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause Orbit' : 'Resume'}</span>
          </button>

          <button
            onClick={() => {
              trueAnomalyRef.current = 0;
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
            title="Reset to Periapsis"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Periapsis</span>
          </button>
        </div>
      </div>

      {/* Main Dual Stage: 2D Orbital Map + Hohmann Delta-V Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Orbital Map Canvas (Left 7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Astrodynamics 2D Orbital Map
            </span>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>Time Warp:</span>
              <div className="flex rounded bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                {[0.5, 1.0, 5.0, 20.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSimSpeed(spd)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                      simSpeed === spd ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm font-bold' : 'text-slate-400'
                    }`}
                  >
                    {spd}×
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex justify-center">
            <canvas
              ref={canvasRef}
              width={560}
              height={380}
              className="w-full h-auto block"
            />
          </div>

          {/* Canvas Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-sky-400 inline-block" /> Initial Orbit
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-emerald-500 border-dashed inline-block" /> Transfer Ellipse
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-sky-600 border-dashed inline-block" /> Target Orbit
              </span>
            </div>
            <span className="font-mono text-slate-500 text-[10px]">Scale: Kepler to scale</span>
          </div>
        </div>

        {/* Hohmann Transfer Budget & Telemetry (Right 5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
              <Compass className="w-4 h-4 text-blue-500" />
              Hohmann Transfer Trajectory Budget
            </h3>

            {/* Total Delta-V Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Total Hohmann Impulse (Δv_total)</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {(deltaVTotal / 1000).toFixed(3)} km/s ({Math.round(deltaVTotal).toLocaleString()} m/s)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/50 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500">Burn 1 (Periapsis):</span>
                  <p className="font-semibold text-blue-600 dark:text-blue-400">{(deltaV1 / 1000).toFixed(3)} km/s</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Burn 2 (Apoapsis):</span>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">{(deltaV2 / 1000).toFixed(3)} km/s</p>
                </div>
              </div>
            </div>

            {/* Transfer Time of Flight */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Transfer Time of Flight (TOF)</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {transferTimeHours >= 24
                    ? `${(transferTimeHours / 24).toFixed(1)} days`
                    : `${transferTimeHours.toFixed(2)} hours (${Math.round(transferTimeSec / 60)} min)`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Half-period of transfer ellipse from r_periapsis to r_target.
              </p>
            </div>

            {/* Current Orbit Kinematic Parameters */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <span className="text-[10px] uppercase font-semibold text-slate-500">
                Initial Orbit Telemetry
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 font-sans">Semi-major Axis:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{Math.round(a / 1000).toLocaleString()} km</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans">Eccentricity:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{e.toFixed(4)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans">Orbital Period:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {periodHoursInt >= 1 ? `${periodHoursInt}h ${periodMinsRem}m` : `${totalMins} min`}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans">Specific Energy:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{specificEnergyMkJ.toFixed(2)} MJ/kg</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans">Periapsis Speed:</span>
                  <p className="font-semibold text-blue-500">{(vp / 1000).toFixed(3)} km/s</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans">Apoapsis Speed:</span>
                  <p className="font-semibold text-amber-500">{(va / 1000).toFixed(3)} km/s</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Presets Dropdown */}
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Canonical Aerospace Missions:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {ORBIT_PRESETS.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p.id)}
                  className="px-2.5 py-1.5 text-xs text-left bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 truncate"
                >
                  {p.name.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Orbital Altitude Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
        <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-500" />
          Orbital Altitudes & Target Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Periapsis Altitude */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Periapsis Altitude (h_p)</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{periapsisAltKm.toLocaleString()} km</span>
            </div>
            <input
              type="range"
              min={100}
              max={40000}
              step={100}
              value={periapsisAltKm}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setPeriapsisAltKm(val);
                if (val > apoapsisAltKm) setApoapsisAltKm(val);
              }}
              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
            />
            <p className="text-[11px] text-slate-500">
              Closest approach to the planet surface (v = {(vp / 1000).toFixed(2)} km/s).
            </p>
          </div>

          {/* Apoapsis Altitude */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Apoapsis Altitude (h_a)</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{apoapsisAltKm.toLocaleString()} km</span>
            </div>
            <input
              type="range"
              min={100}
              max={60000}
              step={200}
              value={apoapsisAltKm}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setApoapsisAltKm(val);
                if (val < periapsisAltKm) setPeriapsisAltKm(val);
              }}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
            />
            <p className="text-[11px] text-slate-500">
              Farthest distance from the surface (v = {(va / 1000).toFixed(2)} km/s).
            </p>
          </div>

          {/* Target Destination Altitude for Hohmann */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Target Circular Altitude (h_target)</span>
              <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{targetAltKm.toLocaleString()} km</span>
            </div>
            <input
              type="range"
              min={200}
              max={60000}
              step={200}
              value={targetAltKm}
              onChange={(e) => setTargetAltKm(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
            />
            <p className="text-[11px] text-slate-500">
              Final target circular orbit altitude for the 2-burn Hohmann transfer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
