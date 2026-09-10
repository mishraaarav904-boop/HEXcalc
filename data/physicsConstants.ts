export interface PhysicsConstant {
  id: string;
  symbol: string;
  name: string;
  value: string;
  unit: string;
  latex: string;
  description: string;
}

export const PHYSICS_CONSTANTS: PhysicsConstant[] = [
  {
    id: 'c',
    symbol: 'c',
    name: 'Speed of Light in Vacuum',
    value: '299,792,458',
    unit: 'm/s',
    latex: 'c = 2.99792458 \\times 10^8 \\text{ m/s}',
    description: 'Universal physical constant in fundamental physics'
  },
  {
    id: 'G',
    symbol: 'G',
    name: 'Gravitational Constant',
    value: '6.67430 × 10⁻¹¹',
    unit: 'm³·kg⁻¹·s⁻²',
    latex: 'G = 6.67430 \\times 10^{-11} \\text{ m}^3\\text{kg}^{-1}\\text{s}^{-2}',
    description: 'Empirical physical constant involved in gravitational calculations'
  },
  {
    id: 'h',
    symbol: 'h',
    name: 'Planck Constant',
    value: '6.62607015 × 10⁻³⁴',
    unit: 'J·s',
    latex: 'h = 6.62607015 \\times 10^{-34} \\text{ J}\\cdot\\text{s}',
    description: 'Relates photon energy to frequency'
  },
  {
    id: 'hbar',
    symbol: 'ℏ',
    name: 'Reduced Planck Constant',
    value: '1.054571817 × 10⁻³⁴',
    unit: 'J·s',
    latex: '\\hbar = \\frac{h}{2\\pi} = 1.054571817 \\times 10^{-34} \\text{ J}\\cdot\\text{s}',
    description: 'Quantum of angular momentum (h-bar)'
  },
  {
    id: 'e',
    symbol: 'e',
    name: 'Elementary Charge',
    value: '1.602176634 × 10⁻¹⁹',
    unit: 'C',
    latex: 'e = 1.602176634 \\times 10^{-19} \\text{ C}',
    description: 'Electric charge carried by a single proton or electron'
  },
  {
    id: 'me',
    symbol: 'mₑ',
    name: 'Electron Mass',
    value: '9.1093837015 × 10⁻³¹',
    unit: 'kg',
    latex: 'm_e = 9.1093837015 \\times 10^{-31} \\text{ kg}',
    description: 'Rest mass of a stationary electron'
  },
  {
    id: 'mp',
    symbol: 'mₚ',
    name: 'Proton Mass',
    value: '1.67262192369 × 10⁻²⁷',
    unit: 'kg',
    latex: 'm_p = 1.67262192369 \\times 10^{-27} \\text{ kg}',
    description: 'Rest mass of a stationary proton'
  },
  {
    id: 'kB',
    symbol: 'k_B',
    name: 'Boltzmann Constant',
    value: '1.380649 × 10⁻²³',
    unit: 'J/K',
    latex: 'k_B = 1.380649 \\times 10^{-23} \\text{ J/K}',
    description: 'Relates average kinetic energy of gas particles to temperature'
  },
  {
    id: 'NA',
    symbol: 'N_A',
    name: 'Avogadro Constant',
    value: '6.02214076 × 10²³',
    unit: 'mol⁻¹',
    latex: 'N_A = 6.02214076 \\times 10^{23} \\text{ mol}^{-1}',
    description: 'Number of constituent particles in one mole'
  },
  {
    id: 'eps0',
    symbol: 'ε₀',
    name: 'Vacuum Permittivity',
    value: '8.8541878128 × 10⁻¹²',
    unit: 'F/m',
    latex: '\\varepsilon_0 = 8.8541878128 \\times 10^{-12} \\text{ F/m}',
    description: 'Electric constant / permittivity of free space'
  },
  {
    id: 'mu0',
    symbol: 'μ₀',
    name: 'Vacuum Permeability',
    value: '1.25663706212 × 10⁻⁶',
    unit: 'N/A²',
    latex: '\\mu_0 = 1.25663706212 \\times 10^{-6} \\text{ N/A}^2',
    description: 'Magnetic constant / permeability of free space'
  }
];
