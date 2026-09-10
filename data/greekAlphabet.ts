export interface SymbolItem {
  id: string;
  symbol: string;
  unicode: string;
  name: string;
  case?: 'upper' | 'lower' | 'variant';
  latex: string;
  description?: string;
  category?: string;
}

export const GREEK_ALPHABET: SymbolItem[] = [
  // Alpha
  { id: 'alpha-upper', symbol: 'Α', unicode: 'U+0391', name: 'Alpha (Upper)', case: 'upper', latex: '\\mathrm{A}' },
  { id: 'alpha-lower', symbol: 'α', unicode: 'U+03B1', name: 'alpha', case: 'lower', latex: '\\alpha' },

  // Beta
  { id: 'beta-upper', symbol: 'Β', unicode: 'U+0392', name: 'Beta (Upper)', case: 'upper', latex: '\\mathrm{B}' },
  { id: 'beta-lower', symbol: 'β', unicode: 'U+03B2', name: 'beta', case: 'lower', latex: '\\beta' },

  // Gamma
  { id: 'gamma-upper', symbol: 'Γ', unicode: 'U+0393', name: 'Gamma (Upper)', case: 'upper', latex: '\\Gamma' },
  { id: 'gamma-lower', symbol: 'γ', unicode: 'U+03B3', name: 'gamma', case: 'lower', latex: '\\gamma' },

  // Delta
  { id: 'delta-upper', symbol: 'Δ', unicode: 'U+0394', name: 'Delta (Upper)', case: 'upper', latex: '\\Delta' },
  { id: 'delta-lower', symbol: 'δ', unicode: 'U+03B4', name: 'delta', case: 'lower', latex: '\\delta' },

  // Epsilon + variant
  { id: 'epsilon-upper', symbol: 'Ε', unicode: 'U+0395', name: 'Epsilon (Upper)', case: 'upper', latex: '\\mathrm{E}' },
  { id: 'epsilon-lower', symbol: 'ε', unicode: 'U+03B5', name: 'epsilon', case: 'lower', latex: '\\varepsilon' },
  { id: 'epsilon-variant', symbol: 'ϵ', unicode: 'U+03F5', name: 'lunate epsilon (var)', case: 'variant', latex: '\\epsilon', description: 'Variant glyph' },

  // Zeta
  { id: 'zeta-upper', symbol: 'Ζ', unicode: 'U+0396', name: 'Zeta (Upper)', case: 'upper', latex: '\\mathrm{Z}' },
  { id: 'zeta-lower', symbol: 'ζ', unicode: 'U+03B6', name: 'zeta', case: 'lower', latex: '\\zeta' },

  // Eta
  { id: 'eta-upper', symbol: 'Η', unicode: 'U+0397', name: 'Eta (Upper)', case: 'upper', latex: '\\mathrm{H}' },
  { id: 'eta-lower', symbol: 'η', unicode: 'U+03B7', name: 'eta', case: 'lower', latex: '\\eta' },

  // Theta + variant
  { id: 'theta-upper', symbol: 'Θ', unicode: 'U+0398', name: 'Theta (Upper)', case: 'upper', latex: '\\Theta' },
  { id: 'theta-lower', symbol: 'θ', unicode: 'U+03B8', name: 'theta', case: 'lower', latex: '\\theta' },
  { id: 'theta-variant', symbol: 'ϑ', unicode: 'U+03D1', name: 'script theta (var)', case: 'variant', latex: '\\vartheta', description: 'Variant glyph' },

  // Iota
  { id: 'iota-upper', symbol: 'Ι', unicode: 'U+0399', name: 'Iota (Upper)', case: 'upper', latex: '\\mathrm{I}' },
  { id: 'iota-lower', symbol: 'ι', unicode: 'U+03B9', name: 'iota', case: 'lower', latex: '\\iota' },

  // Kappa
  { id: 'kappa-upper', symbol: 'Κ', unicode: 'U+039A', name: 'Kappa (Upper)', case: 'upper', latex: '\\mathrm{K}' },
  { id: 'kappa-lower', symbol: 'κ', unicode: 'U+03BA', name: 'kappa', case: 'lower', latex: '\\kappa' },

  // Lambda
  { id: 'lambda-upper', symbol: 'Λ', unicode: 'U+039B', name: 'Lambda (Upper)', case: 'upper', latex: '\\Lambda' },
  { id: 'lambda-lower', symbol: 'λ', unicode: 'U+03BB', name: 'lambda', case: 'lower', latex: '\\lambda' },

  // Mu
  { id: 'mu-upper', symbol: 'Μ', unicode: 'U+039C', name: 'Mu (Upper)', case: 'upper', latex: '\\mathrm{M}' },
  { id: 'mu-lower', symbol: 'μ', unicode: 'U+03BC', name: 'mu', case: 'lower', latex: '\\mu' },

  // Nu
  { id: 'nu-upper', symbol: 'Ν', unicode: 'U+039D', name: 'Nu (Upper)', case: 'upper', latex: '\\mathrm{N}' },
  { id: 'nu-lower', symbol: 'ν', unicode: 'U+03BD', name: 'nu', case: 'lower', latex: '\\nu' },

  // Xi
  { id: 'xi-upper', symbol: 'Ξ', unicode: 'U+039E', name: 'Xi (Upper)', case: 'upper', latex: '\\Xi' },
  { id: 'xi-lower', symbol: 'ξ', unicode: 'U+03BE', name: 'xi', case: 'lower', latex: '\\xi' },

  // Omicron
  { id: 'omicron-upper', symbol: 'Ο', unicode: 'U+039F', name: 'Omicron (Upper)', case: 'upper', latex: '\\mathrm{O}' },
  { id: 'omicron-lower', symbol: 'ο', unicode: 'U+03BF', name: 'omicron', case: 'lower', latex: '\\mathrm{o}' },

  // Pi + variant
  { id: 'pi-upper', symbol: 'Π', unicode: 'U+03A0', name: 'Pi (Upper)', case: 'upper', latex: '\\Pi' },
  { id: 'pi-lower', symbol: 'π', unicode: 'U+03C0', name: 'pi', case: 'lower', latex: '\\pi' },
  { id: 'pi-variant', symbol: 'ϖ', unicode: 'U+03D6', name: 'pomega / variant pi', case: 'variant', latex: '\\varpi', description: 'Variant glyph' },

  // Rho + variant
  { id: 'rho-upper', symbol: 'Ρ', unicode: 'U+03A1', name: 'Rho (Upper)', case: 'upper', latex: '\\mathrm{P}' },
  { id: 'rho-lower', symbol: 'ρ', unicode: 'U+03C1', name: 'rho', case: 'lower', latex: '\\rho' },
  { id: 'rho-variant', symbol: 'ϱ', unicode: 'U+03F1', name: 'tailed rho (var)', case: 'variant', latex: '\\varrho', description: 'Variant glyph' },

  // Sigma + final form variant
  { id: 'sigma-upper', symbol: 'Σ', unicode: 'U+03A3', name: 'Sigma (Upper)', case: 'upper', latex: '\\Sigma' },
  { id: 'sigma-lower', symbol: 'σ', unicode: 'U+03C3', name: 'sigma', case: 'lower', latex: '\\sigma' },
  { id: 'sigma-final', symbol: 'ς', unicode: 'U+03C2', name: 'final sigma (var)', case: 'variant', latex: '\\varsigma', description: 'Final word form' },

  // Tau
  { id: 'tau-upper', symbol: 'Τ', unicode: 'U+03A4', name: 'Tau (Upper)', case: 'upper', latex: '\\mathrm{T}' },
  { id: 'tau-lower', symbol: 'τ', unicode: 'U+03C4', name: 'tau', case: 'lower', latex: '\\tau' },

  // Upsilon
  { id: 'upsilon-upper', symbol: 'Υ', unicode: 'U+03A5', name: 'Upsilon (Upper)', case: 'upper', latex: '\\Upsilon' },
  { id: 'upsilon-lower', symbol: 'υ', unicode: 'U+03C5', name: 'upsilon', case: 'lower', latex: '\\upsilon' },

  // Phi + variant
  { id: 'phi-upper', symbol: 'Φ', unicode: 'U+03A6', name: 'Phi (Upper)', case: 'upper', latex: '\\Phi' },
  { id: 'phi-lower', symbol: 'φ', unicode: 'U+03C6', name: 'phi', case: 'lower', latex: '\\varphi' },
  { id: 'phi-variant', symbol: 'ϕ', unicode: 'U+03D5', name: 'straight phi (var)', case: 'variant', latex: '\\phi', description: 'Variant glyph' },

  // Chi
  { id: 'chi-upper', symbol: 'Χ', unicode: 'U+03A7', name: 'Chi (Upper)', case: 'upper', latex: '\\mathrm{X}' },
  { id: 'chi-lower', symbol: 'χ', unicode: 'U+03C7', name: 'chi', case: 'lower', latex: '\\chi' },

  // Psi
  { id: 'psi-upper', symbol: 'Ψ', unicode: 'U+03A8', name: 'Psi (Upper)', case: 'upper', latex: '\\Psi' },
  { id: 'psi-lower', symbol: 'ψ', unicode: 'U+03C8', name: 'psi', case: 'lower', latex: '\\psi' },

  // Omega
  { id: 'omega-upper', symbol: 'Ω', unicode: 'U+03A9', name: 'Omega (Upper)', case: 'upper', latex: '\\Omega' },
  { id: 'omega-lower', symbol: 'ω', unicode: 'U+03C9', name: 'omega', case: 'lower', latex: '\\omega' }
];
