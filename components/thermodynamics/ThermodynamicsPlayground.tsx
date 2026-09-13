import React, { useState } from 'react';
import { ThermoUnitSystem, ThermoScenario } from '../../types/thermodynamics';
import { THERMO_SCENARIOS } from '../../data/thermoData';
import { PvtExplorer } from './PvtExplorer';
import { CycleVisualizer } from './CycleVisualizer';
import { HeatTransferSandbox } from './HeatTransferSandbox';
import { PhaseDiagramInteractive } from './PhaseDiagramInteractive';
import { KineticSimulator } from './KineticSimulator';
import { PsychrometricExplorer } from './PsychrometricExplorer';
import { StirlingEngineSimulator } from './StirlingEngineSimulator';
import { ThermoMathModal } from './ThermoMathModal';
import { Flame, Box, Activity, Layers, Droplet, BookOpen, Download, Sparkles, Wind, Disc } from 'lucide-react';

interface ThermodynamicsPlaygroundProps {
  darkMode: boolean;
}

export type ThermoSubTab = 'pvt' | 'cycles' | 'heat' | 'phase' | 'kinetic' | 'psychrometric' | 'stirling';

export const ThermodynamicsPlayground: React.FC<ThermodynamicsPlaygroundProps> = () => {
  const [activeTab, setActiveTab] = useState<ThermoSubTab>('pvt');
  const [unitSystem, setUnitSystem] = useState<ThermoUnitSystem>('SI');
  const [isMathModalOpen, setIsMathModalOpen] = useState<boolean>(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');

  // Handle Scenario preset selection
  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
    const scen = THERMO_SCENARIOS.find(s => s.id === scenarioId);
    if (!scen) return;

    if (scen.category === 'pvt') setActiveTab('pvt');
    else if (scen.category === 'cycle') setActiveTab('cycles');
    else if (scen.category === 'heat') setActiveTab('heat');
    else if (scen.category === 'phase') setActiveTab('phase');
    else if (scen.category === 'kinetic') setActiveTab('kinetic');
    else if (scen.category === 'psychrometric') setActiveTab('psychrometric');
    else if (scen.category === 'stirling') setActiveTab('stirling');
  };

  // Export current view report / state
  const handleExportState = () => {
    const report = {
      timestamp: new Date().toISOString(),
      activeTab,
      unitSystem,
      selectedScenarioId
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thermo_simulation_${activeTab}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: ThermoSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'pvt', label: 'PVT Gas Surfaces', icon: Box },
    { id: 'cycles', label: 'Thermodynamic Cycles', icon: Activity },
    { id: 'heat', label: '2D Heat Conduction', icon: Layers },
    { id: 'phase', label: 'Phase Equilibria', icon: Droplet },
    { id: 'kinetic', label: 'Kinetic Theory', icon: Sparkles },
    { id: 'psychrometric', label: 'Psychrometrics & HVAC', icon: Wind },
    { id: 'stirling', label: 'Stirling Kinematics', icon: Disc },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Header Banner - Clean, Minimalist, Engineering Aesthetic */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <Flame className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Thermodynamics
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              PVT state equations, heat engines, conduction, phase boundaries, molecular dynamics, and Stirling mechanics.
            </p>
          </div>
        </div>

        {/* Global Controls: Units, Presets, Math, Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Scenarios */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 shadow-sm">
            <select
              value={selectedScenarioId}
              onChange={e => handleScenarioChange(e.target.value)}
              className="bg-transparent text-xs text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-500">Preset Scenarios...</option>
              {THERMO_SCENARIOS.map((sc: ThermoScenario) => (
                <option key={sc.id} value={sc.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {sc.title}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Switcher */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setUnitSystem('SI')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                unitSystem === 'SI'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              SI (°C, Pa, J)
            </button>
            <button
              onClick={() => setUnitSystem('Imperial')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                unitSystem === 'Imperial'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Imperial (°F, psi, BTU)
            </button>
          </div>

          {/* Show the math button */}
          <button
            onClick={() => setIsMathModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
            <span>Formulas</span>
          </button>

          {/* Export button */}
          <button
            onClick={handleExportState}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
            title="Export JSON State"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Module Segmented Navigation Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/80 dark:border-slate-700 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Sub-Tool */}
      <div className="pt-1">
        {activeTab === 'pvt' && <PvtExplorer unitSystem={unitSystem} />}
        {activeTab === 'cycles' && <CycleVisualizer unitSystem={unitSystem} />}
        {activeTab === 'heat' && <HeatTransferSandbox unitSystem={unitSystem} />}
        {activeTab === 'phase' && <PhaseDiagramInteractive unitSystem={unitSystem} />}
        {activeTab === 'kinetic' && <KineticSimulator unitSystem={unitSystem} />}
        {activeTab === 'psychrometric' && <PsychrometricExplorer unitSystem={unitSystem} />}
        {activeTab === 'stirling' && <StirlingEngineSimulator unitSystem={unitSystem} />}
      </div>

      {/* Governing Math Guide Modal */}
      <ThermoMathModal
        isOpen={isMathModalOpen}
        onClose={() => setIsMathModalOpen(false)}
      />
    </div>
  );
};
