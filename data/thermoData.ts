// Thermodynamics Presets, Materials, Real Gases, and Reference Data
import { GasSpecies, HeatMaterial, PhaseDiagramSubstance, ThermoScenario } from '../types/thermodynamics';

export const GAS_SPECIES: GasSpecies[] = [
  {
    id: 'n2',
    name: 'Nitrogen',
    formula: 'N₂',
    molarMass: 0.0280134,
    a: 0.1370, // Pa * m^6 / mol^2
    b: 0.0000387, // m^3 / mol
    Tc: 126.2,
    Pc: 3.39e6,
    Vc: 0.0000898,
    gamma: 1.40,
    description: 'Primary component of air (~78%), ideal gas approximation works well at room temp.'
  },
  {
    id: 'co2',
    name: 'Carbon Dioxide',
    formula: 'CO₂',
    molarMass: 0.04401,
    a: 0.3658,
    b: 0.0000429,
    Tc: 304.13,
    Pc: 7.38e6,
    Vc: 0.0000940,
    gamma: 1.289,
    description: 'Strong intermolecular attraction forces (high a). Sublimes directly at 1 atm.'
  },
  {
    id: 'h2o',
    name: 'Water Vapor',
    formula: 'H₂O (Steam)',
    molarMass: 0.018015,
    a: 0.5536,
    b: 0.0000305,
    Tc: 647.1,
    Pc: 22.06e6,
    Vc: 0.0000559,
    gamma: 1.33,
    description: 'Very strong hydrogen bonding gives huge departure from ideal gas near saturation.'
  },
  {
    id: 'he',
    name: 'Helium',
    formula: 'He',
    molarMass: 0.0040026,
    a: 0.00346,
    b: 0.0000237,
    Tc: 5.195,
    Pc: 0.227e6,
    Vc: 0.0000574,
    gamma: 1.667,
    description: 'Monatomic noble gas. Van der Waals attraction is minimal; behaves nearly ideally.'
  },
  {
    id: 'o2',
    name: 'Oxygen',
    formula: 'O₂',
    molarMass: 0.031999,
    a: 0.1382,
    b: 0.0000319,
    Tc: 154.6,
    Pc: 5.04e6,
    Vc: 0.0000734,
    gamma: 1.40,
    description: 'Diatomic gas with moderate intermolecular attraction.'
  },
  {
    id: 'ch4',
    name: 'Methane',
    formula: 'CH₄',
    molarMass: 0.01604,
    a: 0.2293,
    b: 0.0000428,
    Tc: 190.6,
    Pc: 4.60e6,
    Vc: 0.0000986,
    gamma: 1.31,
    description: 'Primary constituent of natural gas, significant non-ideality at LNG pressures.'
  },
  {
    id: 'custom',
    name: 'Custom Gas',
    formula: 'X',
    molarMass: 0.02897,
    a: 0.150,
    b: 0.000035,
    Tc: 200,
    Pc: 5.0e6,
    Vc: 0.00008,
    gamma: 1.40,
    description: 'User-specified van der Waals parameters a and b.'
  }
];

export const HEAT_MATERIALS: HeatMaterial[] = [
  {
    id: 'copper',
    name: 'Copper (Pure)',
    k: 401, // W/(m*K)
    rho: 8960, // kg/m^3
    cp: 385, // J/(kg*K)
    alpha: 401 / (8960 * 385), // ~1.16e-4 m^2/s
    color: '#f97316',
    description: 'Exceptional thermal conductor, industry standard for heat pipes and heat sinks.'
  },
  {
    id: 'aluminum',
    name: 'Aluminum (6061)',
    k: 167,
    rho: 2700,
    cp: 896,
    alpha: 167 / (2700 * 896), // ~6.9e-5 m^2/s
    color: '#94a3b8',
    description: 'High conductivity with 1/3 the density of copper. Popular for finned heatsinks.'
  },
  {
    id: 'steel',
    name: 'Carbon Steel',
    k: 54,
    rho: 7850,
    cp: 490,
    alpha: 54 / (7850 * 490), // ~1.4e-5 m^2/s
    color: '#64748b',
    description: 'Structural metal with moderate thermal conductivity and high thermal inertia.'
  },
  {
    id: 'glass',
    name: 'Window Glass',
    k: 1.05,
    rho: 2500,
    cp: 840,
    alpha: 1.05 / (2500 * 840), // ~5.0e-7 m^2/s
    color: '#38bdf8',
    description: 'Poor thermal conductor, useful for demonstrating thermal barriers.'
  },
  {
    id: 'water',
    name: 'Liquid Water',
    k: 0.606,
    rho: 997,
    cp: 4184,
    alpha: 0.606 / (997 * 4184), // ~1.45e-7 m^2/s
    color: '#0284c7',
    description: 'Huge specific heat capacity (4184 J/kg*K), acts as an exceptional thermal damper.'
  },
  {
    id: 'wood',
    name: 'Oak Wood',
    k: 0.17,
    rho: 750,
    cp: 2400,
    alpha: 0.17 / (750 * 2400), // ~9.4e-8 m^2/s
    color: '#b45309',
    description: 'Natural insulator with low conductivity.'
  },
  {
    id: 'foam',
    name: 'Polyurethane Foam',
    k: 0.026,
    rho: 30,
    cp: 1400,
    alpha: 0.026 / (30 * 1400), // ~6.2e-7 m^2/s
    color: '#facc15',
    description: 'Ultra-low thermal conductivity insulator; trapped gas pores prevent conduction.'
  }
];

export const PHASE_SUBSTANCES: PhaseDiagramSubstance[] = [
  {
    id: 'h2o',
    name: 'Water',
    formula: 'H₂O',
    triplePoint: { T: 273.16, P: 611.65 }, // 0.01 C, 6.12 mbar
    criticalPoint: { T: 647.1, P: 22.06e6 }, // 373.95 C, 220.6 bar
    normalBoilingPoint: 373.15, // 100 C
    normalMeltingPoint: 273.15, // 0 C
    latentHeatFusion: 334, // kJ/kg
    latentHeatVaporization: 2260, // kJ/kg
    hasNegativeMeltingSlope: true, // Ice density < water density
    description: 'Exhibits unique anomalous negative melting slope due to hydrogen bond lattice expansion.'
  },
  {
    id: 'co2',
    name: 'Carbon Dioxide',
    formula: 'CO₂',
    triplePoint: { T: 216.58, P: 518e3 }, // -56.6 C, 5.18 bar
    criticalPoint: { T: 304.13, P: 7.38e6 }, // 31.0 C, 73.8 bar
    normalBoilingPoint: 194.65, // -78.5 C (Sublimation at 1 atm)
    normalMeltingPoint: 216.58, // Liquid cannot exist below 5.18 atm!
    latentHeatFusion: 199,
    latentHeatVaporization: 574,
    hasNegativeMeltingSlope: false,
    description: 'Triple point is at 5.18 atm; at atmospheric pressure (1 atm), dry ice sublimes directly from solid to gas.'
  },
  {
    id: 'n2',
    name: 'Nitrogen',
    formula: 'N₂',
    triplePoint: { T: 63.15, P: 12.52e3 }, // -210.0 C, 0.125 bar
    criticalPoint: { T: 126.2, P: 3.39e6 }, // -147.0 C, 33.9 bar
    normalBoilingPoint: 77.36, // -195.8 C
    normalMeltingPoint: 63.15, // -210.0 C
    latentHeatFusion: 25.7,
    latentHeatVaporization: 199,
    hasNegativeMeltingSlope: false,
    description: 'Liquid nitrogen boils at 77 K (-196 °C). Widely used as a cryogenic coolant.'
  }
];

export const THERMO_SCENARIOS: ThermoScenario[] = [
  {
    id: 'otto_engine',
    title: 'Automotive 4-Stroke Engine (Otto Cycle)',
    category: 'cycle',
    description: 'Standard spark-ignition gasoline engine with compression ratio r = 9.5 and combustion temperature reaching 2200 K.',
    config: {
      cycleType: 'otto',
      r: 9.5,
      Tmin: 300,
      Tmax: 2200,
      Pmin: 101325,
      gamma: 1.40
    }
  },
  {
    id: 'brayton_jet',
    title: 'Commercial Jet Turbofan (Brayton Cycle)',
    category: 'cycle',
    description: 'Gas turbine engine cycle operating at a pressure ratio rp = 18 and turbine inlet temperature of 1650 K.',
    config: {
      cycleType: 'brayton',
      r: 18,
      Tmin: 260,
      Tmax: 1650,
      Pmin: 101325,
      gamma: 1.40
    }
  },
  {
    id: 'co2_supercritical',
    title: 'Supercritical CO₂ Extraction / Refrigeration',
    category: 'pvt',
    description: 'Near-critical CO₂ state at 310 K and 8.5 MPa displaying steep compressibility factor departure Z < 0.4.',
    config: {
      gasId: 'co2',
      T: 310,
      V: 0.00012, // m^3
      n: 1.0
    }
  },
  {
    id: 'cpu_cooling',
    title: 'CPU Copper Cooler Transient Conduction',
    category: 'heat',
    description: 'A 95W heat source radiating into a copper heat spreader with aluminum fin boundaries.',
    config: {
      material: 'copper',
      sourceTemp: 360,
      sinkTemp: 295,
      boundary: 'ambient'
    }
  },
  {
    id: 'maxwell_kinetic',
    title: 'Maxwell-Boltzmann Speed Thermalization',
    category: 'kinetic',
    description: 'Observe 200 monatomic particles colliding elastically. Thermalize against a 500 K hot wall and watch the velocity histogram converge to Maxwell-Boltzmann.',
    config: {
      targetTemp: 500,
      species: 'he',
      numParticles: 200
    }
  },
  {
    id: 'gas_mixture_equipartition',
    title: 'Equipartition in He + Xe Binary Mixture',
    category: 'kinetic',
    description: 'Binary mixture of light Helium (4 g/mol) and heavy Xenon (131 g/mol). Visualizes how average kinetic energy per particle equalizes while speed diverges.',
    config: {
      isBinary: true,
      species1: 'he',
      species2: 'xe',
      numParticles: 240
    }
  },
  {
    id: 'effusion_barrier',
    title: "Graham's Law Effusion & Pinhole Diffusion",
    category: 'kinetic',
    description: 'Partition the container with a micro-pinhole. Watch light gas effuse through the hole ~5.7x faster than heavy gas, illustrating Graham’s law and entropy increase.',
    config: {
      barrierOpen: true,
      pinholeSize: 40
    }
  },
  {
    id: 'desert_evap_cooling',
    title: 'Desert Evaporative Swamp Cooler',
    category: 'psychrometric',
    description: 'Hot, arid desert air (40 °C, 15% RH) is cooled adiabatically to 22.8 °C and 65% RH along a constant enthalpy line with zero electrical compressor work.',
    config: {
      process: 'evaporative-cooling',
      inletTdb: 40,
      inletRH: 15
    }
  },
  {
    id: 'cleanroom_dehumidification',
    title: 'Cleanroom AC Dehumidification & Reheat',
    category: 'psychrometric',
    description: 'Humid ambient air (32 °C, 75% RH) is chilled below its dew point to 11 °C to condense excess moisture, then reheated to 21 °C for human comfort.',
    config: {
      process: 'cooling-dehumidify',
      inletTdb: 32,
      inletRH: 75
    }
  },
  {
    id: 'solar_stirling',
    title: 'High-Temperature Solar Dish Stirling Engine',
    category: 'stirling',
    description: 'Parabolic dish solar engine operating with Helium at 950 K hot cylinder and 310 K ambient cooling, delivering up to 34% solar-to-grid thermal efficiency.',
    config: {
      Thot: 950,
      Tcold: 310,
      regeneratorEff: 0.92,
      fluid: 'He'
    }
  },
  {
    id: 'stirling_cryocooler',
    title: 'Stirling Cryocooler Refrigerator (80 K)',
    category: 'stirling',
    description: 'Reversed Stirling cycle heat pump absorbing heat from a cryogenic cold head at 80 K to cool infrared sensors and superconducting detectors.',
    config: {
      Thot: 300,
      Tcold: 80,
      regeneratorEff: 0.96,
      fluid: 'He'
    }
  }
];

// -------------------------------------------------------------
// Kinetic Simulation Species
// -------------------------------------------------------------
export const KINETIC_SPECIES_LIST: { id: string; name: string; symbol: string; molarMass: number; radius: number; color: string }[] = [
  { id: 'he', name: 'Helium', symbol: 'He', molarMass: 4.0, radius: 4, color: '#38bdf8' },
  { id: 'ne', name: 'Neon', symbol: 'Ne', molarMass: 20.18, radius: 5.5, color: '#fb923c' },
  { id: 'ar', name: 'Argon', symbol: 'Ar', molarMass: 39.95, radius: 7, color: '#a855f7' },
  { id: 'xe', name: 'Xenon', symbol: 'Xe', molarMass: 131.29, radius: 9, color: '#ec4899' }
];

// -------------------------------------------------------------
// Psychrometric Calculations (Magnus-Tetens & ASHRAE formulation)
// -------------------------------------------------------------
export function getSatVaporPressure(Tdb_C: number): number {
  // Returns Psat in kPa for -20°C <= T <= 60°C
  return 0.61121 * Math.exp((17.67 * Tdb_C) / (Tdb_C + 243.5));
}

export function calcPsychrometricState(Tdb: number, rhPercent: number, Patm_kPa = 101.325): {
  Tdb: number;
  W: number; // g / kg dry air
  rh: number;
  Twb: number;
  Tdp: number;
  h: number; // kJ / kg
  v: number; // m^3 / kg
  Pv: number; // kPa
} {
  const clampedRH = Math.max(0.1, Math.min(100, rhPercent));
  const Psat = getSatVaporPressure(Tdb);
  const Pv = Math.min(Patm_kPa - 0.5, (clampedRH / 100) * Psat);

  // Humidity ratio W in g/kg
  const W_kg = (0.62198 * Pv) / (Patm_kPa - Pv);
  const W_g = W_kg * 1000;

  // Dew point Tdp (°C)
  const alpha = Math.log(Math.max(0.001, Pv / 0.61121));
  const Tdp = (243.5 * alpha) / (17.67 - alpha);

  // Enthalpy h (kJ/kg)
  const h = 1.006 * Tdb + W_kg * (2501 + 1.86 * Tdb);

  // Specific volume v (m^3/kg dry air)
  const v = (0.287058 * (Tdb + 273.15) * (1 + 1.6078 * W_kg)) / Patm_kPa;

  // Wet bulb Twb (°C) via Stull's empirical approximation (accurate within 0.3°C)
  const Twb =
    Tdb * Math.atan(0.151977 * Math.sqrt(clampedRH + 8.313659)) +
    Math.atan(Tdb + clampedRH) -
    Math.atan(clampedRH - 1.676331) +
    0.00391838 * Math.pow(clampedRH, 1.5) * Math.atan(0.023101 * clampedRH) -
    4.686035;

  return {
    Tdb: Math.round(Tdb * 10) / 10,
    W: Math.round(W_g * 100) / 100,
    rh: Math.round(clampedRH * 10) / 10,
    Twb: Math.round(Twb * 10) / 10,
    Tdp: Math.round(Tdp * 10) / 10,
    h: Math.round(h * 10) / 10,
    v: Math.round(v * 1000) / 1000,
    Pv: Math.round(Pv * 1000) / 1000
  };
}

// Unit conversion helpers
export function kelvinToUnit(k: number, unit: 'SI' | 'Imperial'): { value: number; label: string } {
  if (unit === 'Imperial') {
    // Fahrenheit = (K - 273.15) * 9/5 + 32
    return { value: (k - 273.15) * 1.8 + 32, label: '°F' };
  }
  // SI: Celsius or Kelvin
  return { value: k - 273.15, label: '°C' };
}

export function pascalToUnit(pa: number, unit: 'SI' | 'Imperial'): { value: number; label: string } {
  if (unit === 'Imperial') {
    // 1 Pa = 0.000145038 psi
    const psi = pa * 0.000145038;
    if (psi > 1000) return { value: psi / 1000, label: 'kpsi' };
    return { value: psi, label: 'psi' };
  }
  if (pa >= 1e6) return { value: pa / 1e6, label: 'MPa' };
  if (pa >= 1e5) return { value: pa / 1e5, label: 'bar' };
  if (pa >= 1e3) return { value: pa / 1e3, label: 'kPa' };
  return { value: pa, label: 'Pa' };
}

export function jouleToUnit(j: number, unit: 'SI' | 'Imperial'): { value: number; label: string } {
  if (unit === 'Imperial') {
    // 1 J = 0.000947817 BTU
    const btu = j * 0.000947817;
    return { value: btu, label: 'BTU' };
  }
  if (Math.abs(j) >= 1e6) return { value: j / 1e6, label: 'MJ' };
  if (Math.abs(j) >= 1e3) return { value: j / 1e3, label: 'kJ' };
  return { value: j, label: 'J' };
}

export function volumeToUnit(v: number, unit: 'SI' | 'Imperial'): { value: number; label: string } {
  if (unit === 'Imperial') {
    // 1 m^3 = 35.3147 ft^3 or 61023.7 in^3
    const in3 = v * 61023.7;
    if (in3 >= 100) return { value: v * 35.3147, label: 'ft³' };
    return { value: in3, label: 'in³' };
  }
  if (v < 0.001) return { value: v * 1e6, label: 'cm³' };
  if (v < 1.0) return { value: v * 1000, label: 'L' };
  return { value: v, label: 'm³' };
}
