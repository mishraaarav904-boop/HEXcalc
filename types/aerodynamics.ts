export type AeroUnitSystem = 'metric' | 'imperial';

export type SolverQuality = 'fast' | 'balanced' | 'high';

export interface AeroPreset {
  id: string;
  name: string;
  category: 'Canonical' | 'Airfoils' | 'Vehicles' | 'Aviation';
  description: string;
  referenceLength: number; // in meters (e.g. diameter, chord)
  frontalArea: number;    // in m²
  nominalCd: number;      // Theoretical reference value for validation
  nominalCl?: number;
  hasDrs?: boolean;
}

export interface FlowParameters {
  windSpeed: number;          // m/s (or converted to mph)
  angleOfAttack: number;      // degrees (-90 to 90)
  yawAngle: number;           // degrees (-180 to 180)
  rollAngle: number;          // degrees (-180 to 180)
  drsOpen: boolean;           // F1 DRS flap state
  temperature: number;        // Kelvin (default 288.15 K / 15 °C)
  airDensity: number;         // kg/m³ (default 1.225)
  airViscosity: number;       // Pa*s (Sutherland formula computed)
  turbulenceIntensity: number;// 0.0 to 0.2
  quality: SolverQuality;
  referenceArea: number;      // m²
  referenceLength: number;    // m
}

export interface FlowFieldSnapshot {
  width: number;
  height: number;
  uX: Float32Array;
  uY: Float32Array;
  speed: Float32Array;
  pressure: Float32Array;
  solidMask: Uint8Array;
  minP: number;
  maxP: number;
  maxSpeed: number;
  step: number;
}

export interface AeroComputedOutputs {
  reynoldsNumber: number;
  dragCoefficient: number;
  liftCoefficient: number;
  dragForce: number;      // Newtons (or lbf)
  liftForce: number;      // Newtons (or lbf)
  dynamicPressure: number;// Pascals (or psi)
  machNumber: number;
  speedOfSound: number;   // m/s
  isCompressibleWarning: boolean;
  quasiSteadyStateReached: boolean;
}

export interface SweepPoint {
  angle: number;
  cd: number;
  cl: number;
}

export interface AeroScenario {
  version: string;
  presetId: string;
  parameters: FlowParameters;
  outputs: AeroComputedOutputs;
  timestamp: string;
}
