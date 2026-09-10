
import { SymbolItem } from './greekAlphabet';

export interface MathSection {
  title: string;
  id: string;
  symbols: SymbolItem[];
}

export const COMMON_MATH_SECTIONS: MathSection[] = [
  {
    title: 'Basic Operators & Relations',
    id: 'basic-operators',
    symbols: [
      { id: 'plus-minus', symbol: '±', unicode: 'U+00B1', name: 'Plus-minus', latex: '\\pm' },
      { id: 'minus-plus', symbol: '∓', unicode: 'U+2213', name: 'Minus-plus', latex: '\\mp' },
      { id: 'times', symbol: '×', unicode: 'U+00D7', name: 'Multiplication sign', latex: '\\times' },
      { id: 'divide', symbol: '÷', unicode: 'U+00F7', name: 'Division sign', latex: '\\div' },
      { id: 'cdot', symbol: '·', unicode: 'U+00B7', name: 'Centered dot', latex: '\\cdot' },
      { id: 'approx', symbol: '≈', unicode: 'U+2248', name: 'Approximately equal', latex: '\\approx' },
      { id: 'not-equal', symbol: '≠', unicode: 'U+2260', name: 'Not equal', latex: '\\neq' },
      { id: 'identical', symbol: '≡', unicode: 'U+2261', name: 'Identical / Congruent', latex: '\\equiv' },
      { id: 'proportional', symbol: '∝', unicode: 'U+221D', name: 'Proportional to', latex: '\\propto' },
      { id: 'less-equal', symbol: '≤', unicode: 'U+2264', name: 'Less-than or equal', latex: '\\le' },
      { id: 'greater-equal', symbol: '≥', unicode: 'U+2265', name: 'Greater-than or equal', latex: '\\ge' },
      { id: 'much-less', symbol: '≪', unicode: 'U+226A', name: 'Much less than', latex: '\\ll' },
      { id: 'much-greater', symbol: '≫', unicode: 'U+226B', name: 'Much greater than', latex: '\\gg' },
    ],
  },
  {
    title: 'Set Theory',
    id: 'set-theory',
    symbols: [
      { id: 'element-of', symbol: '∈', unicode: 'U+2208', name: 'Element of', latex: '\\in' },
      { id: 'not-element-of', symbol: '∉', unicode: 'U+2209', name: 'Not an element of', latex: '\\notin' },
      { id: 'subset', symbol: '⊂', unicode: 'U+2282', name: 'Subset of', latex: '\\subset' },
      { id: 'subset-equal', symbol: '⊆', unicode: 'U+2286', name: 'Subset or equal', latex: '\\subseteq' },
      { id: 'superset', symbol: '⊃', unicode: 'U+2283', name: 'Superset of', latex: '\\supset' },
      { id: 'superset-equal', symbol: '⊇', unicode: 'U+2287', name: 'Superset or equal', latex: '\\supseteq' },
      { id: 'union', symbol: '∪', unicode: 'U+222A', name: 'Union', latex: '\\cup' },
      { id: 'intersection', symbol: '∩', unicode: 'U+2229', name: 'Intersection', latex: '\\cap' },
      { id: 'empty-set', symbol: '∅', unicode: 'U+2205', name: 'Empty set', latex: '\\emptyset' },
      { id: 'set-minus', symbol: '∖', unicode: 'U+2216', name: 'Set minus / difference', latex: '\\setminus' },
      { id: 'contains-as-member', symbol: '∋', unicode: 'U+220B', name: 'Contains as member', latex: '\\ni' },
    ],
  },
  {
    title: 'Logic & Proofs',
    id: 'logic',
    symbols: [
      { id: 'for-all', symbol: '∀', unicode: 'U+2200', name: 'For all (universal)', latex: '\\forall' },
      { id: 'exists', symbol: '∃', unicode: 'U+2203', name: 'There exists', latex: '\\exists' },
      { id: 'not-exists', symbol: '∄', unicode: 'U+2204', name: 'There does not exist', latex: '\\nexists' },
      { id: 'not-logic', symbol: '¬', unicode: 'U+00AC', name: 'Logical NOT', latex: '\\neg' },
      { id: 'and-logic', symbol: '∧', unicode: 'U+2227', name: 'Logical AND', latex: '\\land' },
      { id: 'or-logic', symbol: '∨', unicode: 'U+2228', name: 'Logical OR', latex: '\\lor' },
      { id: 'implies', symbol: '⇒', unicode: 'U+21D2', name: 'Implies', latex: '\\implies' },
      { id: 'implied-by', symbol: '⇐', unicode: 'U+21D0', name: 'Implied by', latex: '\\Leftarrow' },
      { id: 'iff', symbol: '⇔', unicode: 'U+21D4', name: 'If and only if (iff)', latex: '\\iff' },
      { id: 'right-arrow', symbol: '→', unicode: 'U+2192', name: 'Maps to / Right arrow', latex: '\\to' },
      { id: 'left-arrow', symbol: '←', unicode: 'U+2190', name: 'Left arrow', latex: '\\leftarrow' },
      { id: 'left-right-arrow', symbol: '↔', unicode: 'U+2194', name: 'Left right arrow', latex: '\\leftrightarrow' },
      { id: 'turnstile', symbol: '⊢', unicode: 'U+22A2', name: 'Proves / Turnstile', latex: '\\vdash' },
      { id: 'therefore', symbol: '∴', unicode: 'U+2234', name: 'Therefore', latex: '\\therefore' },
      { id: 'because', symbol: '∵', unicode: 'U+2235', name: 'Because', latex: '\\because' },
    ],
  },
  {
    title: 'Calculus & Operations',
    id: 'calculus',
    symbols: [
      { id: 'integral', symbol: '∫', unicode: 'U+222B', name: 'Integral', latex: '\\int' },
      { id: 'double-integral', symbol: '∬', unicode: 'U+222C', name: 'Double integral', latex: '\\iint' },
      { id: 'triple-integral', symbol: '∭', unicode: 'U+222D', name: 'Triple integral', latex: '\\iiint' },
      { id: 'contour-integral', symbol: '∮', unicode: 'U+222E', name: 'Contour integral', latex: '\\oint' },
      { id: 'partial-derivative', symbol: '∂', unicode: 'U+2202', name: 'Partial derivative', latex: '\\partial' },
      { id: 'nabla', symbol: '∇', unicode: 'U+2207', name: 'Nabla / Gradient', latex: '\\nabla' },
      { id: 'summation', symbol: '∑', unicode: 'U+2211', name: 'Summation (Sigma)', latex: '\\sum' },
      { id: 'product', symbol: '∏', unicode: 'U+220F', name: 'N-ary product (Pi)', latex: '\\prod' },
      { id: 'square-root', symbol: '√', unicode: 'U+221A', name: 'Square root', latex: '\\sqrt{}' },
      { id: 'cube-root', symbol: '∛', unicode: 'U+221B', name: 'Cube root', latex: '\\sqrt[3]{}' },
      { id: 'fourth-root', symbol: '∜', unicode: 'U+221C', name: 'Fourth root', latex: '\\sqrt[4]{}' },
      { id: 'infinity', symbol: '∞', unicode: 'U+221E', name: 'Infinity', latex: '\\infty' },
    ],
  },
  {
    title: 'Number Sets',
    id: 'number-sets',
    symbols: [
      { id: 'natural-numbers', symbol: 'ℕ', unicode: 'U+2115', name: 'Natural numbers', latex: '\\mathbb{N}' },
      { id: 'integers', symbol: 'ℤ', unicode: 'U+2124', name: 'Integers', latex: '\\mathbb{Z}' },
      { id: 'rationals', symbol: 'ℚ', unicode: 'U+211A', name: 'Rational numbers', latex: '\\mathbb{Q}' },
      { id: 'reals', symbol: 'ℝ', unicode: 'U+211D', name: 'Real numbers', latex: '\\mathbb{R}' },
      { id: 'complex-numbers', symbol: 'ℂ', unicode: 'U+2102', name: 'Complex numbers', latex: '\\mathbb{C}' },
      { id: 'primes', symbol: 'ℙ', unicode: 'U+2119', name: 'Prime numbers', latex: '\\mathbb{P}' },
      { id: 'quaternions', symbol: 'ℍ', unicode: 'U+210D', name: 'Quaternions', latex: '\\mathbb{H}' },
    ],
  },
];