export interface ComplexEquation {
  id: string;
  name: string;
  symbol: string;
  latex: string;
  desmosLatex?: string;
  description: string;
  evaluate: (k: number) => number;
}

export const COMPLEX_EQUATIONS: ComplexEquation[] = [
  {
    id: 'eq-a',
    name: 'Horizontal Parametric Component A(k)',
    symbol: 'A(k)',
    latex: `A(k) = \\frac{3k}{20000} + \\sin\\left(\\frac{\\pi}{2} \\left(\\frac{k}{10000}\\right)^7\\right) \\cos^6\\left(\\frac{41\\pi k}{10000}\\right) + \\frac{1}{4} \\cos^{16}\\left(\\frac{41\\pi k}{10000}\\right) \\cos^{12}\\left(\\frac{\\pi k}{20000}\\right) \\sin\\left(\\frac{6\\pi k}{10000}\\right)`,
    desmosLatex: `y=\\frac{3x}{20000}+\\sin\\left(\\frac{\\pi}{2}\\left(\\frac{x}{10000}\\right)^{7}\\right)\\cdot\\cos^{6}\\left(\\frac{41\\pi x}{10000}\\right)+\\frac{1}{4}\\cos^{16}\\left(\\frac{41\\pi x}{10000}\\right)\\cdot\\cos^{12}\\left(\\frac{\\pi x}{20000}\\right)\\cdot\\sin\\left(\\frac{6\\pi x}{10000}\\right)`,
    description: 'Highly structured trigonometric sequence with polynomial modulations and high-order power exponents.',
    evaluate: (k: number) => {
      const term1 = (3 * k) / 20000;
      const term2 = Math.sin((Math.PI / 2) * Math.pow(k / 10000, 7)) * Math.pow(Math.cos((41 * Math.PI * k) / 10000), 6);
      const term3 = (1 / 4) * Math.pow(Math.cos((41 * Math.PI * k) / 10000), 16) * Math.pow(Math.cos((Math.PI * k) / 20000), 12) * Math.sin((6 * Math.PI * k) / 10000);
      return term1 + term2 + term3;
    }
  },
  {
    id: 'eq-b',
    name: 'Vertical Parametric Component B(k)',
    symbol: 'B(k)',
    latex: `B(k) = -\\cos\\left(\\frac{\\pi}{2} \\left(\\frac{k}{10000}\\right)^7\\right) \\left(1 + \\frac{3}{2} \\cos^6\\left(\\frac{\\pi k}{20000}\\right) \\cos^6\\left(\\frac{3\\pi k}{20000}\\right)\\right) \\cos^6\\left(\\frac{41\\pi k}{10000}\\right) + \\frac{1}{2} \\cos^{10}\\left(\\frac{3\\pi k}{100000}\\right) \\cos^{10}\\left(\\frac{9\\pi k}{100000}\\right) \\cos^{10}\\left(\\frac{18\\pi k}{100000}\\right)`,
    desmosLatex: `y=-\\cos\\left(\\frac{\\pi}{2}\\left(\\frac{x}{10000}\\right)^{7}\\right)\\cdot\\left(1+\\frac{3}{2}\\cos^{6}\\left(\\frac{\\pi x}{20000}\\right)\\cdot\\cos^{6}\\left(\\frac{3\\pi x}{20000}\\right)\\right)\\cdot\\cos^{6}\\left(\\frac{41\\pi x}{10000}\\right)+\\frac{1}{2}\\cos^{10}\\left(\\frac{3\\pi x}{100000}\\right)\\cdot\\cos^{10}\\left(\\frac{9\\pi x}{100000}\\right)\\cdot\\cos^{10}\\left(\\frac{18\\pi x}{100000}\\right)`,
    description: 'Complex multi-variable envelope function involving nested products and tenth-power cosine harmonics.',
    evaluate: (k: number) => {
      const cosPart1 = Math.cos((Math.PI / 2) * Math.pow(k / 10000, 7));
      const innerFactor = 1 + 1.5 * Math.pow(Math.cos((Math.PI * k) / 20000), 6) * Math.pow(Math.cos((3 * Math.PI * k) / 20000), 6);
      const cosPart2 = Math.pow(Math.cos((41 * Math.PI * k) / 10000), 6);
      const term1 = -cosPart1 * innerFactor * cosPart2;
      const term2 = 0.5 * Math.pow(Math.cos((3 * Math.PI * k) / 100000), 10) * Math.pow(Math.cos((9 * Math.PI * k) / 100000), 10) * Math.pow(Math.cos((18 * Math.PI * k) / 100000), 10);
      return term1 + term2;
    }
  },
  {
    id: 'eq-r',
    name: 'Radial Modulation Component R(k)',
    symbol: 'R(k)',
    latex: `R(k) = \\frac{1}{50} + \\frac{1}{10} \\sin^2\\left(\\frac{41\\pi k}{10000}\\right) \\sin^2\\left(\\frac{9\\pi k}{100000}\\right) + \\frac{1}{20} \\cos^2\\left(\\frac{41\\pi k}{10000}\\right) \\cos^{10}\\left(\\frac{\\pi k}{20000}\\right)`,
    desmosLatex: `y=\\frac{1}{50}+\\frac{1}{10}\\sin^{2}\\left(\\frac{41\\pi x}{10000}\\right)\\cdot\\sin^{2}\\left(\\frac{9\\pi x}{100000}\\right)+\\frac{1}{20}\\cos^{2}\\left(\\frac{41\\pi x}{10000}\\right)\\cdot\\cos^{10}\\left(\\frac{\\pi x}{20000}\\right)`,
    description: 'High-precision amplitude radius scaling sequence combining squared sine and 10th-power cosine terms.',
    evaluate: (k: number) => {
      const term1 = 1 / 50;
      const term2 = (1 / 10) * Math.pow(Math.sin((41 * Math.PI * k) / 10000), 2) * Math.pow(Math.sin((9 * Math.PI * k) / 100000), 2);
      const term3 = (1 / 20) * Math.pow(Math.cos((41 * Math.PI * k) / 10000), 2) * Math.pow(Math.cos((Math.PI * k) / 20000), 10);
      return term1 + term2 + term3;
    }
  }
];
