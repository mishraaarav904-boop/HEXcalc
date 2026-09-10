/**
 * High-Performance Lattice Boltzmann Method (LBM D2Q9) CFD Solver
 *
 * Implements isothermal incompressible fluid flow with BGK collision operator,
 * Zou-He velocity inlet, open pressure outflow, and momentum-exchange force integration.
 * Runs on a background Web Worker with zero garbage-collection overhead using typed arrays.
 */

export interface CfdSolverConfig {
  nx: number;
  ny: number;
  tau: number;           // Relaxation time (controls kinematic viscosity)
  uInlet: number;        // Lattice inlet velocity (typically 0.05 to 0.12)
  turbulenceIntensity: number; // Inlet perturbation intensity
}

export class LbmCfdSolver {
  public nx: number;
  public ny: number;
  public size: number;
  public tau: number;
  public omega: number; // 1.0 / tau
  public uInlet: number;
  public turbulenceIntensity: number;

  // Discrete velocities: cx[9], cy[9], w[9], opp[9]
  public static readonly CX = new Int32Array([0, 1, 0, -1, 0, 1, -1, -1, 1]);
  public static readonly CY = new Int32Array([0, 0, 1, 0, -1, 1, 1, -1, -1]);
  public static readonly W = new Float32Array([
    4 / 9,
    1 / 9, 1 / 9, 1 / 9, 1 / 9,
    1 / 36, 1 / 36, 1 / 36, 1 / 36
  ]);
  public static readonly OPP = new Int32Array([0, 3, 4, 1, 2, 7, 8, 5, 6]);

  // Particle distribution populations: f[9 * size] and fTemp[9 * size]
  public f: Float32Array;
  public fTemp: Float32Array;

  // Macroscopic quantities
  public rho: Float32Array;
  public uX: Float32Array;
  public uY: Float32Array;
  public speed: Float32Array;
  public pressure: Float32Array;

  // Obstacle geometry mask: 1 = solid cell, 0 = fluid cell
  public solidMask: Uint8Array;

  // Force tracking via momentum exchange
  public rawFx: number = 0;
  public rawFy: number = 0;
  public smoothCd: number = 0;
  public smoothCl: number = 0;
  public stepCount: number = 0;

  constructor(nx: number, ny: number, uInlet = 0.08, tau = 0.56) {
    this.nx = nx;
    this.ny = ny;
    this.size = nx * ny;
    this.uInlet = uInlet;
    this.tau = Math.max(0.51, Math.min(1.5, tau));
    this.omega = 1.0 / this.tau;
    this.turbulenceIntensity = 0.0;

    // Allocate flat typed buffers
    this.f = new Float32Array(9 * this.size);
    this.fTemp = new Float32Array(9 * this.size);
    this.rho = new Float32Array(this.size);
    this.uX = new Float32Array(this.size);
    this.uY = new Float32Array(this.size);
    this.speed = new Float32Array(this.size);
    this.pressure = new Float32Array(this.size);
    this.solidMask = new Uint8Array(this.size);

    this.resetField();
  }

  public resetField(): void {
    const u0 = this.uInlet;

    for (let y = 0; y < this.ny; y++) {
      for (let x = 0; x < this.nx; x++) {
        const idx = y * this.nx + x;
        this.rho[idx] = 1.0;
        this.uX[idx] = this.solidMask[idx] ? 0.0 : u0;
        this.uY[idx] = 0.0;
        this.speed[idx] = this.solidMask[idx] ? 0.0 : u0;
        this.pressure[idx] = 1.0 / 3.0; // P = cs^2 * rho, cs^2 = 1/3

        // Initialize equilibrium distributions
        for (let i = 0; i < 9; i++) {
          this.f[i * this.size + idx] = this.calcFeq(i, 1.0, this.uX[idx], 0.0);
        }
      }
    }
    this.stepCount = 0;
    this.smoothCd = 0;
    this.smoothCl = 0;
  }

  public setObstacleMask(mask: Uint8Array): void {
    if (mask.length === this.size) {
      this.solidMask.set(mask);
    } else {
      this.solidMask.fill(0);
      const len = Math.min(this.size, mask.length);
      for (let i = 0; i < len; i++) {
        this.solidMask[i] = mask[i];
      }
    }

    // Zero out velocity inside solid obstacle
    for (let idx = 0; idx < this.size; idx++) {
      if (this.solidMask[idx]) {
        this.uX[idx] = 0;
        this.uY[idx] = 0;
        this.speed[idx] = 0;
        for (let i = 0; i < 9; i++) {
          this.f[i * this.size + idx] = LbmCfdSolver.W[i];
        }
      }
    }
  }

  public setParameters(uInlet: number, tau: number, turbulenceIntensity: number): void {
    this.uInlet = Math.max(0.01, Math.min(0.20, uInlet));
    this.tau = Math.max(0.51, Math.min(1.5, tau));
    this.omega = 1.0 / this.tau;
    this.turbulenceIntensity = Math.max(0.0, Math.min(0.25, turbulenceIntensity));
  }

  private calcFeq(i: number, rho: number, ux: number, uy: number): number {
    const cx = LbmCfdSolver.CX[i];
    const cy = LbmCfdSolver.CY[i];
    const w = LbmCfdSolver.W[i];

    const cu = cx * ux + cy * uy;
    const u2 = ux * ux + uy * uy;
    return w * rho * (1.0 + 3.0 * cu + 4.5 * cu * cu - 1.5 * u2);
  }

  public step(): void {
    const nx = this.nx;
    const ny = this.ny;
    const size = this.size;
    const omega = this.omega;
    const uInlet = this.uInlet;
    const f = this.f;
    const fTemp = this.fTemp;
    const solid = this.solidMask;
    const CX = LbmCfdSolver.CX;
    const CY = LbmCfdSolver.CY;
    const OPP = LbmCfdSolver.OPP;

    let fxSum = 0;
    let fySum = 0;

    // 1. Collision step
    for (let idx = 0; idx < size; idx++) {
      if (solid[idx]) continue;

      let localRho = 0.0;
      let localUx = 0.0;
      let localUy = 0.0;

      for (let i = 0; i < 9; i++) {
        const fi = f[i * size + idx];
        localRho += fi;
        localUx += CX[i] * fi;
        localUy += CY[i] * fi;
      }

      if (localRho > 1e-6) {
        localUx /= localRho;
        localUy /= localRho;
      } else {
        localRho = 1.0;
        localUx = 0.0;
        localUy = 0.0;
      }

      this.rho[idx] = localRho;
      this.uX[idx] = localUx;
      this.uY[idx] = localUy;
      this.speed[idx] = Math.sqrt(localUx * localUx + localUy * localUy);
      this.pressure[idx] = localRho / 3.0; // P = cs^2 * rho

      for (let i = 0; i < 9; i++) {
        const feq = this.calcFeq(i, localRho, localUx, localUy);
        fTemp[i * size + idx] = f[i * size + idx] * (1.0 - omega) + feq * omega;
      }
    }

    // 2. Streaming and Boundary handling
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const destIdx = y * nx + x;

        if (solid[destIdx]) continue;

        for (let i = 0; i < 9; i++) {
          const srcX = x - CX[i];
          const srcY = y - CY[i];

          if (srcX < 0 || srcX >= nx || srcY < 0 || srcY >= ny) {
            continue;
          }

          const srcIdx = srcY * nx + srcX;

          if (solid[srcIdx]) {
            // Bounce-back from solid boundary node
            const opp = OPP[i];
            const bouncedPop = fTemp[i * size + destIdx];
            f[opp * size + destIdx] = bouncedPop;

            fxSum += 2.0 * CX[i] * bouncedPop;
            fySum += 2.0 * CY[i] * bouncedPop;
          } else {
            f[i * size + destIdx] = fTemp[i * size + srcIdx];
          }
        }
      }
    }

    // 3. Zou-He velocity inlet at x = 0
    const turb = this.turbulenceIntensity;
    const timeWave = Math.sin(this.stepCount * 0.15);
    for (let y = 1; y < ny - 1; y++) {
      const idx = y * nx;
      if (solid[idx]) continue;

      const perturb = turb > 0 ? turb * uInlet * (Math.sin(y * 0.4 + timeWave) + 0.5 * Math.cos(y * 0.8)) : 0;
      const ux = uInlet + perturb;
      const uy = turb > 0 ? turb * uInlet * 0.3 * Math.cos(y * 0.5 + timeWave) : 0;

      const f0 = f[0 * size + idx];
      const f2 = f[2 * size + idx];
      const f3 = f[3 * size + idx];
      const f4 = f[4 * size + idx];
      const f6 = f[6 * size + idx];
      const f7 = f[7 * size + idx];

      const rhoIn = (f0 + f2 + f4 + 2.0 * (f3 + f6 + f7)) / Math.max(0.01, 1.0 - ux);

      f[1 * size + idx] = f3 + (2.0 / 3.0) * rhoIn * ux;
      f[5 * size + idx] = f7 - 0.5 * (f2 - f4) + (1.0 / 6.0) * rhoIn * ux + 0.5 * rhoIn * uy;
      f[8 * size + idx] = f6 + 0.5 * (f2 - f4) + (1.0 / 6.0) * rhoIn * ux - 0.5 * rhoIn * uy;

      this.rho[idx] = rhoIn;
      this.uX[idx] = ux;
      this.uY[idx] = uy;
      this.speed[idx] = Math.sqrt(ux * ux + uy * uy);
    }

    // 4. Open outflow at x = nx - 1
    for (let y = 0; y < ny; y++) {
      const outIdx = y * nx + (nx - 1);
      const prevIdx = y * nx + (nx - 2);
      if (solid[outIdx]) continue;

      for (let i = 0; i < 9; i++) {
        f[i * size + outIdx] = f[i * size + prevIdx];
      }
      this.rho[outIdx] = this.rho[prevIdx];
      this.uX[outIdx] = this.uX[prevIdx];
      this.uY[outIdx] = this.uY[prevIdx];
      this.speed[outIdx] = this.speed[prevIdx];
      this.pressure[outIdx] = this.pressure[prevIdx];
    }

    // 5. Top & Bottom slip walls
    for (let x = 0; x < nx; x++) {
      const bIdx = 0 * nx + x;
      f[2 * size + bIdx] = f[4 * size + bIdx];
      f[5 * size + bIdx] = f[7 * size + bIdx];
      f[6 * size + bIdx] = f[8 * size + bIdx];

      const tIdx = (ny - 1) * nx + x;
      f[4 * size + tIdx] = f[2 * size + tIdx];
      f[7 * size + tIdx] = f[5 * size + tIdx];
      f[8 * size + tIdx] = f[6 * size + tIdx];
    }

    this.rawFx = fxSum;
    this.rawFy = fySum;
    this.stepCount++;

    const obstacleLatticeHeight = Math.max(8, ny * 0.25);
    const qLattice = 0.5 * 1.0 * (uInlet * uInlet) * obstacleLatticeHeight;
    const instantCd = qLattice > 0 ? Math.abs(fxSum) / qLattice : 0;
    const instantCl = qLattice > 0 ? fySum / qLattice : 0;

    const alpha = 0.08;
    this.smoothCd = this.smoothCd === 0 ? instantCd : (1.0 - alpha) * this.smoothCd + alpha * instantCd;
    this.smoothCl = this.smoothCl === 0 ? instantCl : (1.0 - alpha) * this.smoothCl + alpha * instantCl;
  }
}
