import { AeroPreset } from '../types/aerodynamics';

export const AERO_PRESETS: AeroPreset[] = [
  {
    id: 'sphere',
    name: 'Sphere',
    category: 'Canonical',
    description: 'Symmetric bluff body with 3D wake separation. Excellent canonical validation case for drag computation.',
    referenceLength: 0.20, // 20 cm diameter
    frontalArea: Math.PI * Math.pow(0.10, 2), // ~0.0314 m²
    nominalCd: 0.47,
    nominalCl: 0.0
  },
  {
    id: 'flat-plate',
    name: 'Flat Plate',
    category: 'Canonical',
    description: 'Sharp-edged plate presenting massive boundary layer separation and high pressure drag when normal to flow.',
    referenceLength: 0.25, // 25 cm height
    frontalArea: 0.25 * 0.25, // 0.0625 m²
    nominalCd: 1.28,
    nominalCl: 0.0
  },
  {
    id: 'cylinder',
    name: 'Circular Cylinder',
    category: 'Canonical',
    description: 'Bluff cylindrical body exhibiting classical von Kármán vortex shedding streets in its unsteady wake.',
    referenceLength: 0.15,
    frontalArea: 0.15 * 0.40,
    nominalCd: 1.15,
    nominalCl: 0.0
  },
  {
    id: 'naca0012',
    name: 'NACA 0012 Symmetric Airfoil',
    category: 'Airfoils',
    description: 'Standard 12% thickness symmetric aerodynamic foil. Exhibits linear lift vs AoA curve up to stall.',
    referenceLength: 0.40, // 40 cm chord
    frontalArea: 0.048 * 0.40, // thickness * span
    nominalCd: 0.045,
    nominalCl: 0.0 // at 0 AoA
  },
  {
    id: 'naca4412',
    name: 'NACA 4412 Cambered Airfoil',
    category: 'Airfoils',
    description: '4% camber airfoil generating positive lift at zero angle of attack. Common in light utility aircraft.',
    referenceLength: 0.40,
    frontalArea: 0.048 * 0.40,
    nominalCd: 0.052,
    nominalCl: 0.42
  },
  {
    id: 'car-body',
    name: 'Aerodynamic Sedan Silhouette',
    category: 'Vehicles',
    description: 'Streamlined fastback vehicle profile showing roof pressure gradients, underbody flow, and rear wake recirculation.',
    referenceLength: 0.60,
    frontalArea: 0.08,
    nominalCd: 0.29,
    nominalCl: -0.05
  },
  {
    id: 'finite-wing',
    name: 'Trapezoidal Wing',
    category: 'Airfoils',
    description: 'Swept 3D wing section with tip vortex wash and spanwise pressure redistribution.',
    referenceLength: 0.35,
    frontalArea: 0.05,
    nominalCd: 0.065,
    nominalCl: 0.38
  },
  {
    id: 'f1-rear-wing',
    name: 'Formula 1 Rear Wing (DRS)',
    category: 'Vehicles',
    description: 'High-downforce dual-element Formula 1 rear wing with active DRS (Drag Reduction System). Open DRS to articulate the upper flap, dumping downforce and slashing pressure drag by ~45%.',
    referenceLength: 0.35,
    frontalArea: 0.075,
    nominalCd: 1.15,
    nominalCl: -2.25,
    hasDrs: true
  },
  {
    id: 'jet-airliner',
    name: 'Commercial Jet Airliner',
    category: 'Aviation',
    description: 'Transonic transport aircraft featuring high-aspect-ratio swept wings, winglet tip fences, twin high-bypass turbofan nacelles, and vertical stabilizer.',
    referenceLength: 0.70,
    frontalArea: 0.065,
    nominalCd: 0.031,
    nominalCl: 0.52
  },
  {
    id: 'supersonic-jet',
    name: 'Supersonic Delta Fighter',
    category: 'Aviation',
    description: 'Mach 2+ combat aircraft with slender ogive fuselage, razor-thin cropped delta wings, and canted twin vertical stabilizers designed for wave-drag minimization.',
    referenceLength: 0.65,
    frontalArea: 0.048,
    nominalCd: 0.024,
    nominalCl: 0.35
  },
  {
    id: 'golf-ball',
    name: 'Dimpled Golf Ball',
    category: 'Canonical',
    description: 'Dimpled sphere illustrating boundary layer tripping into turbulence, delaying separation point and cutting wake drag by more than half compared to a smooth sphere.',
    referenceLength: 0.18,
    frontalArea: Math.PI * Math.pow(0.09, 2),
    nominalCd: 0.24,
    nominalCl: 0.0
  },
  {
    id: 'propeller-blade',
    name: 'Wind Turbine / Propeller Blade',
    category: 'Airfoils',
    description: 'High-efficiency aerodynamic blade with chord distribution and progressive geometric twist from root hub to tip.',
    referenceLength: 0.45,
    frontalArea: 0.042,
    nominalCd: 0.038,
    nominalCl: 0.65
  }
];

// Atmospheric and physical utilities
export const ATMOSPHERE_PRESETS = [
  { name: 'Sea Level Standard (15°C, 1.225 kg/m³)', tempK: 288.15, density: 1.225 },
  { name: 'Hot Day / Low Density (35°C, 1.145 kg/m³)', tempK: 308.15, density: 1.145 },
  { name: 'High Altitude 3,000m (–4°C, 0.909 kg/m³)', tempK: 269.15, density: 0.909 },
  { name: 'Cold Dense Winter (–15°C, 1.367 kg/m³)', tempK: 258.15, density: 1.367 }
];

/**
 * Computes dynamic viscosity of dry air using Sutherland's law (in Pa*s)
 */
export function computeAirViscosity(tempK: number): number {
  const T0 = 273.15;
  const mu0 = 1.716e-5;
  const S = 110.4;
  return mu0 * Math.pow(tempK / T0, 1.5) * ((T0 + S) / (tempK + S));
}

/**
 * Computes speed of sound in dry air (in m/s)
 */
export function computeSpeedOfSound(tempK: number): number {
  const gamma = 1.4;
  const R = 287.058; // J/(kg*K)
  return Math.sqrt(gamma * R * tempK);
}
