import React, { useState } from 'react';
import { COMPLEX_EQUATIONS, ComplexEquation } from '../data/complexEquations';
import { COMMON_EQUATIONS, CommonEquation } from '../data/commonEquations';
import { MathRenderer } from './MathRenderer';
import { Sigma, Copy, Check, Terminal, Code2, Play, Search, X, BookOpen, Layers } from 'lucide-react';

interface ComplexEquationStudioProps {
  onCopySymbol: (text: string, name: string) => void;
}

type EquationCategory = 'All' | 'Calculus' | 'Physics' | 'Pure Mathematics';

export const ComplexEquationStudio: React.FC<ComplexEquationStudioProps> = ({ onCopySymbol }) => {
  const [selectedCategory, setSelectedCategory] = useState<EquationCategory>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sequenceK, setSequenceK] = useState<number>(1000);
  const [customLatex, setCustomLatex] = useState<string>(
    `A(k) = \\frac{3k}{20000} + \\sin\\left(\\frac{\\pi}{2} \\left(\\frac{k}{10000}\\right)^7\\right) \\cos^6\\left(\\frac{41\\pi k}{10000}\\right)`
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const presets = [
    {
      label: 'Equation A(k)',
      latex: COMPLEX_EQUATIONS[0].latex,
    },
    {
      label: 'Equation B(k)',
      latex: COMPLEX_EQUATIONS[1].latex,
    },
    {
      label: 'Equation R(k)',
      latex: COMPLEX_EQUATIONS[2].latex,
    },
    {
      label: 'Gaussian Integral',
      latex: `\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}`,
    },
    {
      label: 'Fourier Transform',
      latex: `\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(x) e^{-2\\pi i x \\xi} dx`,
    },
    {
      label: 'Euler-Lagrange',
      latex: `\\frac{\\partial L}{\\partial q} - \\frac{d}{dt} \\left( \\frac{\\partial L}{\\partial \\dot{q}} \\right) = 0`,
    },
    {
      label: 'Schrödinger Eq.',
      latex: `i\\hbar \\frac{\\partial}{\\partial t} \\Psi(x,t) = \\left( -\\frac{\\hbar^2}{2m} \\nabla^2 + V(x,t) \\right) \\Psi(x,t)`,
    },
  ];

  const handleCopy = (text: string, id: string, name: string, isLatex = true) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onCopySymbol(text, isLatex ? `LaTeX: ${name}` : `Formula: ${name}`);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleLoadInPlayground = (latex: string) => {
    setCustomLatex(latex);
    const playgroundElem = document.getElementById('latex-playground');
    if (playgroundElem) {
      playgroundElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Filter Common Equations
  const filteredEquations = COMMON_EQUATIONS.filter((eq) => {
    const matchesCategory = selectedCategory === 'All' || eq.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      eq.name.toLowerCase().includes(q) ||
      eq.category.toLowerCase().includes(q) ||
      eq.description.toLowerCase().includes(q) ||
      eq.latex.toLowerCase().includes(q) ||
      eq.plainText.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  // Evaluate all three complex parametric equations for sequence K
  const valA = COMPLEX_EQUATIONS[0].evaluate(sequenceK);
  const valB = COMPLEX_EQUATIONS[1].evaluate(sequenceK);
  const valR = COMPLEX_EQUATIONS[2].evaluate(sequenceK);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header */}
      <div className="app-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Sigma className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Equation Studio & Reference
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Quick-copy standard calculus, physics, and math formulas with KaTeX typesetting and live parametric evaluation.
          </p>
        </div>
      </div>

      {/* Common Equations Section (Quick Copy) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Essential Calculus, Physics & Math Equations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              One-click quick copy in LaTeX or plain Unicode format.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] sm:min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter equations..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-500 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['All', 'Calculus', 'Physics', 'Pure Mathematics'] as EquationCategory[]).map((cat) => {
            const count =
              cat === 'All'
                ? COMMON_EQUATIONS.length
                : COMMON_EQUATIONS.filter((e) => e.category === cat).length;
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Equations Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEquations.map((eq: CommonEquation) => (
            <div
              key={eq.id}
              className="app-card p-5 space-y-3.5 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{eq.name}</h4>
                    <span className="inline-block mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {eq.category}
                    </span>
                  </div>
                </div>

                {/* Rendered Math Formula */}
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-x-auto text-center flex items-center justify-center min-h-[64px]">
                  <MathRenderer math={eq.latex} displayMode={true} className="text-slate-900 dark:text-slate-100 py-0.5" />
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {eq.description}
                </p>
              </div>

              {/* Action Buttons: Quick Copy LaTeX, Copy Plain, Load */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(eq.latex, `latex-${eq.id}`, eq.name, true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-medium transition-colors"
                    title="Copy LaTeX source code"
                  >
                    {copiedId === `latex-${eq.id}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy LaTeX</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleCopy(eq.plainText, `plain-${eq.id}`, eq.name, false)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors"
                    title="Copy formula text"
                  >
                    {copiedId === `plain-${eq.id}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Text</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={() => handleLoadInPlayground(eq.latex)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-mono transition-colors"
                  title="Load into LaTeX Playground"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Playground</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Parametric Sequences A(k), B(k), R(k) Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              High-Precision Parametric Sequences A(k), B(k), R(k)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Trigonometric sequence modulation with high-power harmonic envelopes.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">3 Formulas</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {COMPLEX_EQUATIONS.map((eq: ComplexEquation, index: number) => (
            <div
              key={eq.id}
              className="app-card p-5 sm:p-6 space-y-4 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-semibold flex items-center justify-center text-xs">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{eq.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{eq.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(eq.latex, eq.id, eq.name, true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs transition-colors font-mono"
                    title="Copy LaTeX source code"
                  >
                    {copiedId === eq.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy LaTeX</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleLoadInPlayground(eq.latex)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-mono transition-colors"
                    title="Load in playground"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Rendered Equation */}
              <div className="p-4 sm:p-5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-x-auto text-center">
                <MathRenderer math={eq.latex} displayMode={true} className="text-slate-900 dark:text-slate-100 py-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Sequence Evaluator (k) */}
      <div className="app-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Live Sequence Evaluator</h3>
          </div>
          <span className="text-xs font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-md border border-blue-200 dark:border-blue-800 self-start sm:self-auto font-semibold">
            k = {sequenceK.toLocaleString()}
          </span>
        </div>

        {/* Range Slider & Manual Input */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-8 flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500">0</span>
            <input
              type="range"
              min="0"
              max="20000"
              step="1"
              value={sequenceK}
              onChange={(e) => setSequenceK(parseInt(e.target.value) || 0)}
              className="w-full accent-blue-600 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-500">20,000</span>
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="20000"
              value={sequenceK}
              onChange={(e) => setSequenceK(Math.max(0, Math.min(20000, parseInt(e.target.value) || 0)))}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => setSequenceK((prev) => (prev + 500) % 20001)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors whitespace-nowrap"
            >
              +500
            </button>
          </div>
        </div>

        {/* Computed Numerical Output Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">A({sequenceK})</p>
            <p className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">{valA.toFixed(8)}</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">B({sequenceK})</p>
            <p className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400">{valB.toFixed(8)}</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">R({sequenceK}) [Radial]</p>
            <p className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">{valR.toFixed(8)}</p>
          </div>
        </div>
      </div>

      {/* Dynamic Custom LaTeX Playground */}
      <div id="latex-playground" className="app-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">LaTeX Playground</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Type or select mathematical formulas for instant rendering.</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
              <Code2 className="w-3.5 h-3.5 text-blue-500" /> Presets:
            </span>
            {presets.slice(3).map((p, i) => (
              <button
                key={i}
                onClick={() => setCustomLatex(p.latex)}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs transition-colors font-mono whitespace-nowrap"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            LaTeX Code Input
          </label>
          <textarea
            rows={3}
            value={customLatex}
            onChange={(e) => setCustomLatex(e.target.value)}
            placeholder="Type LaTeX here (e.g. \\frac{a}{b} + \\sin(x)^2)..."
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-lg text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Live Output */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Live Output Preview
          </label>
          <div className="p-6 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[100px] overflow-x-auto">
            <MathRenderer math={customLatex} displayMode={true} className="text-slate-900 dark:text-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplexEquationStudio;
