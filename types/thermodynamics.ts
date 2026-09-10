// Thermodynamics Data Models & Types

export type ThermoUnitSystem = 'SI' | 'Imperial';

export interface GasSpecies {
  id: string;
  name: string;
  formula: string;
  molarMass: number; // kg/mol
  a: number; // Pa * m^6 / mol^2 (van der Waals attraction parameter)
  b: number; // m^3 / mol (van der Waals excluded volume parameter)
  Tc: number; // Critical Temperature (K)
  Pc: number; // Critical Pressure (Pa)
  Vc: number; // Critical Molar Volume (m^3 / mol)
  gamma: number; // Heat capacity ratio Cp/Cv
  description: string;
}

export type CycleType = 'carnot' | 'otto' | 'diesel' | 'brayton' | 'rankine' | 'stirling';

export interface CycleStatePoint {
  state: number;
  label: string;
  P: number; // Pa
  V: number; // m^3 (or specific volume m^3/kg)
  T: number; // K
  S: number; // J/K
}

export interface CycleParams {
  type: CycleType;
  r: number; // Compression ratio (or pressure ratio rp for Brayton/Rankine)
  Tmin: number; // K (ambient / intake)
  Tmax: number; // K (combustion / peak)
  Pmin: number; // Pa (intake pressure)
  rc?: number; // Cutoff ratio (for Diesel cycle)
  gamma: number; // Specific heat ratio
  workingFluid: string;
}

export interface CycleResults {
  states: CycleStatePoint[];
  pathPV: { P: number; V: number; stage: number }[];
  pathTS: { T: number; S: number; stage: number }[];
  Wnet: number; // J or kJ/kg
  Qin: number; // J
  Qout: number; // J
  thermalEfficiency: number; // 0 to 1
  carnotEfficiency: number; // 0 to 1
  mep: number; // Mean effective pressure (Pa)
  stages: {
    from: number;
    to: number;
    name: string;
    process: string;
    q: number;
    w: number;
  }[];
}

export interface HeatMaterial {
  id: string;
  name: string;
  k: number; // Thermal conductivity (W / (m*K))
  rho: number; // Density (kg / m^3)
  cp: number; // Specific heat capacity (J / (kg*K))
  alpha: number; // Thermal diffusivity (m^2 / s) = k / (rho * cp)
  color: string;
  description: string;
}

export type BoundaryConditionType = 'insulated' | 'ambient' | 'fixed';
export type ColormapType = 'turbo' | 'inferno' | 'coolwarm' | 'grayscale';

export interface HeatProbeInfo {
  x: number;
  y: number;
  temperature: number; // K
  gradMagnitude: number; // K/m
  fluxMagnitude: number; // W/m^2
  fluxX: number;
  fluxY: number;
}

export interface PhaseDiagramSubstance {
  id: string;
  name: string;
  formula: string;
  triplePoint: { T: number; P: number }; // K, Pa
  criticalPoint: { T: number; P: number }; // K, Pa
  normalBoilingPoint: number; // K at 1 atm
  normalMeltingPoint: number; // K at 1 atm
  latentHeatFusion: number; // kJ/kg
  latentHeatVaporization: number; // kJ/kg
  description: string;
  hasNegativeMeltingSlope: boolean; // true for Water (ice contracts on melting)
}

export type ThermoCategory = 'pvt' | 'cycle' | 'heat' | 'phase' | 'kinetic' | 'psychrometric' | 'stirling';

export interface ThermoScenario {
  id: string;
  title: string;
  category: ThermoCategory;
  description: string;
  config: Record<string, any>;
}

// -------------------------------------------------------------
// Kinetic Molecular Simulator Types
// -------------------------------------------------------------
export interface GasParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  radius: number;
  color: string;
  species: string;
}

export interface KineticGasSpecies {
  id: string;
  name: string;
  symbol: string;
  molarMass: number; // g/mol
  atomicRadius: number; // relative display radius
  color: string;
}

export interface KineticSimulationTelemetry {
  temperatureK: number;
  pressurePa: number;
  numParticles: number;
  volumePct: number; // 30% to 100%
  meanSpeed: number; // m/s
  rmsSpeed: number; // m/s
  mostProbableSpeed: number; // m/s
  meanFreePath: number; // nm
  collisionRate: number; // collisions per sec
}

// -------------------------------------------------------------
// Psychrometric / HVAC Simulator Types
// -------------------------------------------------------------
export interface PsychrometricState {
  Tdb: number; // Dry bulb temp (°C)
  W: number; // Humidity ratio (g / kg dry air)
  rh: number; // Relative humidity (0 to 100%)
  Twb: number; // Wet bulb temp (°C)
  Tdp: number; // Dew point temp (°C)
  h: number; // Enthalpy (kJ / kg dry air)
  v: number; // Specific volume (m³ / kg)
  Pv: number; // Partial vapor pressure (kPa)
}

export type HvacProcessType =
  | 'cooling-dehumidify'
  | 'evaporative-cooling'
  | 'winter-heating'
  | 'two-stream-mixing';

export interface HvacProcessResult {
  inletState: PsychrometricState;
  outletState: PsychrometricState;
  secondaryState?: PsychrometricState; // for mixing
  sensibleHeatKw: number;
  latentHeatKw: number;
  totalHeatKw: number;
  condensationRateLph: number; // Liters of condensate per hour
  sensibleHeatRatio: number; // SHR = Qs / Qtotal
}

// -------------------------------------------------------------
// Stirling Engine Types
// -------------------------------------------------------------
export interface StirlingEngineParams {
  Thot: number; // K
  Tcold: number; // K
  regeneratorEff: number; // 0 to 1
  compressionRatio: number; // Vmax / Vmin (typically 1.5 to 3.0)
  workingFluid: 'He' | 'H2' | 'Air';
  loadTorque: number; // N*m
  chargePressureBar: number; // bar
}

export interface StirlingEngineTelemetry {
  crankAngleDeg: number;
  rpm: number;
  netWorkPerCycleJ: number;
  mechanicalPowerW: number;
  thermalEfficiency: number;
  carnotEfficiency: number;
  pistonDisplacementY: number;
  displacerDisplacementY: number;
  chamberPressurePa: number;
  chamberVolumeM3: number;
  chamberTempK: number;
}

