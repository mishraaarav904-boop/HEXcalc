import React from 'react';
import { LineChart, Box, BookOpen, Sun, Moon, Atom, Calculator, Sigma, Flame, Grid3X3, Rocket } from 'lucide-react';

export type TabType = '2d' | '3d' | 'matrix' | 'space' | 'thermodynamics' | 'studio' | 'symbols' | 'constants' | 'converter';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  apiKey: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
}) => {
  const tabs = [
    { id: '2d' as TabType, label: '2D Grapher', icon: LineChart },
    { id: '3d' as TabType, label: '3D Grapher', icon: Box },
    { id: 'matrix' as TabType, label: 'Matrix & Vectors', icon: Grid3X3 },
    { id: 'space' as TabType, label: 'Space & Rocketry', icon: Rocket },
    { id: 'thermodynamics' as TabType, label: 'Thermodynamics', icon: Flame },
    { id: 'studio' as TabType, label: 'Equation Studio', icon: Sigma },
    { id: 'symbols' as TabType, label: 'Symbols', icon: BookOpen },
    { id: 'constants' as TabType, label: 'Physics Constants', icon: Atom },
    { id: 'converter' as TabType, label: 'Unit Converter', icon: Calculator },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 py-2.5">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
              <span className="font-mono">∑</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                HEXcalc <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono font-medium">v2.0</span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">Engineering & Math Suite</p>
            </div>
          </div>

          {/* Segmented Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700/60 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{tab.label}</span>
                  <span className="md:hidden">
                    {tab.id === '2d'
                      ? '2D'
                      : tab.id === '3d'
                      ? '3D'
                      : tab.id === 'matrix'
                      ? 'Matrix'
                      : tab.id === 'thermodynamics'
                      ? 'Thermo'
                      : tab.id === 'studio'
                      ? 'Studio'
                      : tab.id === 'symbols'
                      ? 'Symbols'
                      : tab.id === 'constants'
                      ? 'Const'
                      : 'Units'}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

