export interface CommonEquation {
  id: string;
  name: string;
  category: 'Calculus' | 'Physics' | 'Pure Mathematics';
  latex: string;
  plainText: string;
  description: string;
}

export const COMMON_EQUATIONS: CommonEquation[] = [
  {
    id: 'ftc',
    name: 'Fundamental Theorem of Calculus',
    category: 'Calculus',
    latex: '\\frac{d}{dx} \\left( \\int_{a}^{x} f(t) \\, dt \\right) = f(x)',
    plainText: 'd/dx [ ∫_a^x f(t) dt ] = f(x)',
    description: 'Establishes the fundamental relationship between differentiation and definite integration as inverse operations.'
  },
  {
    id: 'taylor-series',
    name: 'Taylor Series Expansion',
    category: 'Calculus',
    latex: 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x - a)^n',
    plainText: 'f(x) = ∑[n=0..∞] (f^(n)(a) / n!) (x - a)^n',
    description: 'Represents an infinitely differentiable function as an infinite polynomial expansion around point a.'
  },
  {
    id: 'gaussian-integral',
    name: 'Gaussian Error Integral',
    category: 'Calculus',
    latex: '\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}',
    plainText: '∫[-∞..∞] e^(-x²) dx = √π',
    description: 'Integral of the Gaussian probability density function over the entire real line.'
  },
  {
    id: 'euler-identity',
    name: "Euler's Identity",
    category: 'Pure Mathematics',
    latex: 'e^{i\\pi} + 1 = 0',
    plainText: 'e^(iπ) + 1 = 0',
    description: 'Profound formula uniting the five fundamental mathematical constants: e, i, π, 1, and 0.'
  },
  {
    id: 'fourier-transform',
    name: 'Continuous Fourier Transform',
    category: 'Calculus',
    latex: '\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(x) \\, e^{-2\\pi i x \\xi} \\, dx',
    plainText: 'f̂(ξ) = ∫[-∞..∞] f(x) e^(-2πi x ξ) dx',
    description: 'Deconstructs any integrable time or spatial domain signal into its continuous frequency spectrum.'
  },
  {
    id: 'schrodinger-eq',
    name: 'Time-Dependent Schrödinger Equation',
    category: 'Physics',
    latex: 'i\\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r}, t) = \\hat{H} \\Psi(\\mathbf{r}, t)',
    plainText: 'iℏ ∂Ψ/∂t = ĤΨ',
    description: 'Core dynamic equation of non-relativistic quantum mechanics governing wave function evolution.'
  },
  {
    id: 'mass-energy-momentum',
    name: 'Relativistic Energy-Momentum Relation',
    category: 'Physics',
    latex: 'E^2 = (pc)^2 + (m_0 c^2)^2',
    plainText: 'E² = (pc)² + (m₀c²)²',
    description: 'Relativistic formulation of total energy combining rest mass energy and kinetic momentum.'
  },
  {
    id: 'maxwell-wave',
    name: "Maxwell's Electromagnetic Wave Equation",
    category: 'Physics',
    latex: '\\nabla^2 \\mathbf{E} - \\frac{1}{c^2} \\frac{\\partial^2 \\mathbf{E}}{\\partial t^2} = 0',
    plainText: '∇²E - (1/c²) ∂²E/∂t² = 0',
    description: 'Vector wave equation derived from Maxwell equations proving light is an electromagnetic wave.'
  },
  {
    id: 'euler-lagrange',
    name: 'Euler-Lagrange Equation',
    category: 'Calculus',
    latex: '\\frac{\\partial L}{\\partial q_i} - \\frac{d}{dt} \\left( \\frac{\\partial L}{\\partial \\dot{q}_i} \\right) = 0',
    plainText: '∂L/∂q_i - d/dt (∂L/∂q̇_i) = 0',
    description: 'Fundamental differential equation of the calculus of variations determining stationary action trajectories.'
  },
  {
    id: 'navier-stokes',
    name: 'Incompressible Navier-Stokes Equation',
    category: 'Physics',
    latex: '\\rho \\left( \\frac{\\partial \\mathbf{u}}{\\partial t} + (\\mathbf{u} \\cdot \\nabla) \\mathbf{u} \\right) = -\\nabla p + \\mu \\nabla^2 \\mathbf{u} + \\mathbf{f}',
    plainText: 'ρ(∂u/∂t + (u·∇)u) = -∇p + μ∇²u + f',
    description: 'Newtonian momentum balance equation describing the fluid flow of incompressible viscous fluids.'
  },
  {
    id: 'cauchy-riemann',
    name: 'Cauchy-Riemann Equations',
    category: 'Pure Mathematics',
    latex: '\\frac{\\partial u}{\\partial x} = \\frac{\\partial v}{\\partial y}, \\quad \\frac{\\partial u}{\\partial y} = -\\frac{\\partial v}{\\partial x}',
    plainText: '∂u/∂x = ∂v/∂y, ∂u/∂y = -∂v/∂x',
    description: 'System of two partial differential equations forming the necessary and sufficient conditions for complex holomorphy.'
  },
  {
    id: 'universal-gravitation',
    name: "Newton's Law of Universal Gravitation",
    category: 'Physics',
    latex: '\\mathbf{F} = -G \\frac{m_1 m_2}{r^2} \\mathbf{\\hat{r}}',
    plainText: 'F = -G (m₁m₂ / r²) r̂',
    description: 'Universal inverse-square law governing the attractive gravitational force between two point masses.'
  }
];
