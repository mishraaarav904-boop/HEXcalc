import { LbmCfdSolver } from './cfdSolver';

let solver: LbmCfdSolver | null = null;
let isRunning = false;
let isSweeping = false;
let sweepAngles: number[] = [];
let sweepIdx = 0;
let sweepStepsRemaining = 0;
let sweepResults: Array<{ angle: number; cd: number; cl: number }> = [];

let physicalWindSpeed = 25.0; // m/s
let physicalDensity = 1.225;  // kg/m³
let physicalViscosity = 1.81e-5; // Pa*s
let physicalArea = 0.05;      // m²
let physicalRefLength = 0.25; // m
let physicalTempK = 288.15;   // K
function getQualityDimensions(quality: string): { nx: number; ny: number } {
  switch (quality) {
    case 'fast':
      return { nx: 90, ny: 45 };
    case 'high':
      return { nx: 220, ny: 110 };
    case 'balanced':
    default:
      return { nx: 140, ny: 70 };
  }
}

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT': {
      const { quality = 'balanced', uInlet = 0.08 } = payload || {};
      const { nx, ny } = getQualityDimensions(quality);
      solver = new LbmCfdSolver(nx, ny, uInlet);
      isRunning = true;
      runSimulationLoop();
      break;
    }

    case 'SET_OBSTACLE': {
      if (!solver) return;
      const { mask, frontalArea, refLength } = payload;
      if (frontalArea) physicalArea = frontalArea;
      if (refLength) physicalRefLength = refLength;
      solver.setObstacleMask(mask);
      break;
    }

    case 'UPDATE_PARAMS': {
      if (!solver) return;
      const {
        windSpeed,
        temperature,
        density,
        viscosity,
        turbulenceIntensity,
        quality
      } = payload;

      if (windSpeed !== undefined) physicalWindSpeed = windSpeed;
      if (density !== undefined) physicalDensity = density;
      if (viscosity !== undefined) physicalViscosity = viscosity;
      if (temperature !== undefined) physicalTempK = temperature;

      // Map physical parameters to lattice units
      // Lattice speed is kept in stable regime [0.04, 0.14]
      const latticeU = Math.min(0.14, Math.max(0.04, physicalWindSpeed / 250.0));
      // Lattice viscosity from Re similarity
      const Re = (physicalDensity * physicalWindSpeed * physicalRefLength) / Math.max(1e-6, physicalViscosity);
      const latticeLength = solver.ny * 0.25;
      const latticeNu = Math.max(0.005, (latticeU * latticeLength) / Math.max(10, Re));
      const tau = 3.0 * latticeNu + 0.5;

      solver.setParameters(latticeU, tau, turbulenceIntensity ?? 0);

      // Check if resolution changed
      if (quality) {
        const { nx, ny } = getQualityDimensions(quality);
        if (nx !== solver.nx || ny !== solver.ny) {
          solver = new LbmCfdSolver(nx, ny, latticeU, tau);
        }
      }
      break;
    }

    case 'START_SWEEP': {
      const { minAngle = -20, maxAngle = 25, step = 5 } = payload || {};
      isSweeping = true;
      sweepResults = [];
      sweepAngles = [];
      for (let a = minAngle; a <= maxAngle; a += step) {
        sweepAngles.push(a);
      }
      sweepIdx = 0;
      sweepStepsRemaining = 80; // allow flow to develop quasi-steady state at each angle
      self.postMessage({ type: 'SWEEP_STARTED', payload: { total: sweepAngles.length } });
      break;
    }

    case 'STOP_SWEEP': {
      isSweeping = false;
      break;
    }

    case 'PAUSE': {
      isRunning = false;
      break;
    }

    case 'RESUME': {
      if (!isRunning) {
        isRunning = true;
        runSimulationLoop();
      }
      break;
    }
  }
};

function runSimulationLoop() {
  if (!isRunning || !solver) return;

  // Run 2 sub-steps per animation frame for numerical progression and stable vortices
  for (let s = 0; s < 2; s++) {
    solver.step();
  }

  // Handle sweep progression
  if (isSweeping && sweepIdx < sweepAngles.length) {
    sweepStepsRemaining--;
    if (sweepStepsRemaining <= 0) {
      const angle = sweepAngles[sweepIdx];
      const cd = Number(solver.smoothCd.toFixed(4));
      const cl = Number(solver.smoothCl.toFixed(4));
      sweepResults.push({ angle, cd, cl });

      self.postMessage({
        type: 'SWEEP_POINT',
        payload: { angle, cd, cl, progress: (sweepIdx + 1) / sweepAngles.length }
      });

      sweepIdx++;
      sweepStepsRemaining = 60;

      if (sweepIdx >= sweepAngles.length) {
        isSweeping = false;
        self.postMessage({
          type: 'SWEEP_COMPLETE',
          payload: { results: sweepResults }
        });
      } else {
        // Request main thread to update obstacle geometry at new angle
        self.postMessage({
          type: 'REQUEST_ANGLE_UPDATE',
          payload: { angle: sweepAngles[sweepIdx] }
        });
      }
    }
  }

  // Physical outputs derived from flow field
  const Re = (physicalDensity * physicalWindSpeed * physicalRefLength) / Math.max(1e-6, physicalViscosity);
  const q = 0.5 * physicalDensity * Math.pow(physicalWindSpeed, 2);
  const Cd = solver.smoothCd;
  const Cl = solver.smoothCl;
  const Fd = q * Cd * physicalArea;
  const Fl = q * Cl * physicalArea;

  const speedOfSound = Math.sqrt(1.4 * 287.058 * physicalTempK);
  const mach = physicalWindSpeed / speedOfSound;

  // Stream flow field snapshot to main thread
  self.postMessage({
    type: 'FLOW_UPDATE',
    payload: {
      width: solver.nx,
      height: solver.ny,
      uX: solver.uX.buffer,
      uY: solver.uY.buffer,
      speed: solver.speed.buffer,
      pressure: solver.pressure.buffer,
      solidMask: solver.solidMask.buffer,
      step: solver.stepCount,
      outputs: {
        reynoldsNumber: Re,
        dragCoefficient: Cd,
        liftCoefficient: Cl,
        dragForce: Fd,
        liftForce: Fl,
        dynamicPressure: q,
        machNumber: mach,
        speedOfSound,
        isCompressibleWarning: mach > 0.3,
        quasiSteadyStateReached: solver.stepCount > 60
      }
    }
  });

  // Schedule next step (approx 35-50 Hz in worker)
  setTimeout(runSimulationLoop, 20);
}
