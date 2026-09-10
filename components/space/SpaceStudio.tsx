import React, { useState } from 'react';
import { Orbit, Rocket, Sparkles } from 'lucide-react';
import { OrbitalMechanics } from './OrbitalMechanics';
import { RocketPropulsion } from './RocketPropulsion';

interface SpaceStudioProps {
  darkMode?: boolean;
}

export const SpaceStudio: React.FC<SpaceStudioProps> = () => {
  const [activeSubTab, setActiveSubTab] = useState<'orbit' | 'propulsion'>('orbit');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Studio Header & Segmented Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Aerospace & Rocketry Engineering Studio
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono font-semibold">
                  AeroSpace v2.0
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Astrodynamics orbital state propagator, 2-burn Hohmann transfers, multi-stage Tsiolkovsky delta-v staging, and De Laval supersonic gas dynamics.
              </p>
            </div>
          </div>

          {/* Segmented Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shrink-0">
            <button
              onClick={() => setActiveSubTab('orbit')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === 'orbit'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm font-semibold border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-700/40'
              }`}
            >
              <Orbit className="w-4 h-4" />
              <span>Orbital Mechanics &amp; Transfers</span>
            </button>

            <button
              onClick={() => setActiveSubTab('propulsion')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === 'propulsion'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm font-semibold border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-700/40'
              }`}
            >
              <Rocket className="w-4 h-4" />
              <span>Rocket Propulsion &amp; Nozzles</span>
            </button>
          </div>
        </div>

        {/* Quick Highlights / Formulas banner */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Vis-Viva Equation: v² = μ(2/r - 1/a)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Tsiolkovsky Equation: Δv = Isp · g₀ · ln(m₀ / mf)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Mach-Area: A/A* = (1/M)[(2 + (γ-1)M²)/(γ+1)]^((γ+1)/(2(γ-1)))</span>
          </div>
        </div>
      </div>

      {/* Main Active Module */}
      <div>
        {activeSubTab === 'orbit' && <OrbitalMechanics />}
        {activeSubTab === 'propulsion' && <RocketPropulsion />}
      </div>
    </div>
  );
};
