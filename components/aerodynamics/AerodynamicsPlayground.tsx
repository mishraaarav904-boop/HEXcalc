import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { WindTunnelViewport } from './WindTunnelViewport';
import { SweepChart } from './SweepChart';
import { AeroMathModal } from './AeroMathModal';
import { MeshVoxelizer } from './MeshVoxelizer';
import {
  FlowParameters,
  AeroComputedOutputs,
  FlowFieldSnapshot,
  SweepPoint,
  AeroUnitSystem,
  SolverQuality,
  AeroScenario
} from '../../types/aerodynamics';
import {
  AERO_PRESETS,
  ATMOSPHERE_PRESETS,
  computeAirViscosity
} from '../../data/aeroPresets';
import {
  Wind,
  Layers,
  Sliders,
  Play,
  Pause,
  BookOpen,
  Download,
  AlertTriangle,
  Activity,
  Zap,
  RotateCcw
} from 'lucide-react';

interface AerodynamicsPlaygroundProps {
  darkMode: boolean;
  onCopySymbol?: (text: string, name: string) => void;
}

export const AerodynamicsPlayground: React.FC<AerodynamicsPlaygroundProps> = ({
  darkMode,
}) => {
  // Preset Selection
  const [selectedPresetId, setSelectedPresetId] = useState<string>('sphere');
  const [unitSystem, setUnitSystem] = useState<AeroUnitSystem>('metric');
  const [showMathModal, setShowMathModal] = useState<boolean>(false);
  const [customModel, setCustomModel] = useState<THREE.Object3D | null>(null);

  // Flow Parameters
  const [params, setParams] = useState<FlowParameters>({
    windSpeed: 25.0, // m/s (~56 mph)
    angleOfAttack: 0.0,
    yawAngle: 0.0,
    rollAngle: 0.0,
    drsOpen: false,
    temperature: 288.15,
    airDensity: 1.225,
    airViscosity: computeAirViscosity(288.15),
    turbulenceIntensity: 0.02,
    quality: 'balanced',
    referenceArea: AERO_PRESETS[0].frontalArea,
    referenceLength: AERO_PRESETS[0].referenceLength,
  });

  // Computed Outputs
  const [outputs, setOutputs] = useState<AeroComputedOutputs>({
    reynoldsNumber: 338000,
    dragCoefficient: 0.47,
    liftCoefficient: 0.0,
    dragForce: 11.2,
    liftForce: 0.0,
    dynamicPressure: 382.8,
    machNumber: 0.073,
    speedOfSound: 340.3,
    isCompressibleWarning: false,
    quasiSteadyStateReached: true,
  });

  // CFD Stream & Worker state
  const workerRef = useRef<Worker | null>(null);
  const [flowSnapshot, setFlowSnapshot] = useState<FlowFieldSnapshot | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Sweep Mode State
  const [isSweeping, setIsSweeping] = useState<boolean>(false);
  const [sweepPoints, setSweepPoints] = useState<SweepPoint[]>([]);
  const [sweepProgress, setSweepProgress] = useState<number>(0);

  const selectedPreset =
    AERO_PRESETS.find((p) => p.id === selectedPresetId) || AERO_PRESETS[0];

  // Helper to re-voxelize obstacle and push to worker
  const syncObstacleToWorker = useCallback(
    (
      presetId: string,
      angle: number,
      quality: SolverQuality,
      customObj: THREE.Object3D | null,
      drs: boolean = false
    ) => {
      if (!workerRef.current) return;
      const dims = quality === 'fast' ? { nx: 90, ny: 45 } : quality === 'high' ? { nx: 220, ny: 110 } : { nx: 140, ny: 70 };
      let mask: Uint8Array;

      if (presetId === 'custom' && customObj) {
        mask = MeshVoxelizer.voxelizeMesh(customObj, dims.nx, dims.ny, angle);
      } else {
        mask = MeshVoxelizer.generatePresetMask(presetId, dims.nx, dims.ny, angle, drs);
      }

      workerRef.current.postMessage({
        type: 'SET_OBSTACLE',
        payload: {
          mask,
          frontalArea: params.referenceArea,
          refLength: params.referenceLength,
        },
      });
    },
    [params.referenceArea, params.referenceLength]
  );

  // Initialize Web Worker
  useEffect(() => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('../../workers/cfdWorker.ts', import.meta.url), {
        type: 'module',
      });
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent) => {
        const { type, payload } = e.data;

        if (type === 'FLOW_UPDATE') {
          setFlowSnapshot(payload);
          if (payload.outputs) {
            setOutputs(payload.outputs);
          }
        } else if (type === 'SWEEP_POINT') {
          const { angle, cd, cl, progress } = payload;
          setSweepPoints((prev) => {
            const next = prev.filter((p) => p.angle !== angle);
            next.push({ angle, cd, cl });
            return next.sort((a, b) => a.angle - b.angle);
          });
          setSweepProgress(progress);
        } else if (type === 'SWEEP_COMPLETE') {
          setIsSweeping(false);
          setSweepProgress(1.0);
        } else if (type === 'REQUEST_ANGLE_UPDATE') {
          const newAngle = payload.angle;
          setParams((prev) => ({ ...prev, angleOfAttack: newAngle }));
          syncObstacleToWorker(selectedPresetId, newAngle, params.quality, customModel, params.drsOpen);
        }
      };

      // Init solver
      worker.postMessage({
        type: 'INIT',
        payload: { quality: params.quality },
      });

      // Send initial obstacle mask
      syncObstacleToWorker(selectedPresetId, params.angleOfAttack, params.quality, customModel, params.drsOpen);
    } catch (err) {
      console.error('Failed to initialize CFD worker:', err);
    }

    return () => {
      if (worker) {
        worker.terminate();
      }
    };
  }, []);

  // Update Parameters when user adjusts controls
  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'UPDATE_PARAMS',
      payload: {
        windSpeed: params.windSpeed,
        angleOfAttack: params.angleOfAttack,
        temperature: params.temperature,
        density: params.airDensity,
        viscosity: params.airViscosity,
        turbulenceIntensity: params.turbulenceIntensity,
        quality: params.quality,
      },
    });
  }, [params]);

  // Handle Preset Change
  const handleSelectPreset = (id: string) => {
    setSelectedPresetId(id);
    const preset = AERO_PRESETS.find((p) => p.id === id);
    if (preset) {
      const resetDrs = false;
      setParams((prev) => ({
        ...prev,
        drsOpen: resetDrs,
        referenceArea: preset.frontalArea,
        referenceLength: preset.referenceLength,
      }));
      syncObstacleToWorker(id, params.angleOfAttack, params.quality, null, resetDrs);
    }
  };

  // Toggle DRS (Drag Reduction System)
  const handleToggleDrs = useCallback(() => {
    setParams((prev) => {
      const nextDrs = !prev.drsOpen;
      syncObstacleToWorker(selectedPresetId, prev.angleOfAttack, prev.quality, customModel, nextDrs);
      return { ...prev, drsOpen: nextDrs };
    });
  }, [selectedPresetId, params.quality, customModel, syncObstacleToWorker]);

  // Global Keyboard Shortcut for DRS ('D' key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'd' || e.key === 'D') {
        if (selectedPresetId === 'f1-rear-wing' || selectedPreset.hasDrs) {
          handleToggleDrs();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPresetId, selectedPreset.hasDrs, handleToggleDrs]);

  // Handle Direct Viewport 3D Rotation Drag
  const handleRotationChange = useCallback(
    (newAoA: number, newYaw: number, newRoll: number) => {
      setParams((prev) => ({
        ...prev,
        angleOfAttack: newAoA,
        yawAngle: newYaw,
        rollAngle: newRoll,
      }));
      syncObstacleToWorker(selectedPresetId, newAoA, params.quality, customModel, params.drsOpen);
    },
    [selectedPresetId, params.quality, customModel, params.drsOpen, syncObstacleToWorker]
  );

  // Handle Custom Model Loaded from Viewport
  const handleCustomModelLoaded = (obj: THREE.Object3D) => {
    setCustomModel(obj);
    setSelectedPresetId('custom');
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const area = size.y * size.z;
    setParams((prev) => ({
      ...prev,
      referenceArea: Math.max(0.01, area),
      referenceLength: Math.max(0.1, size.x),
    }));
    syncObstacleToWorker('custom', params.angleOfAttack, params.quality, obj, false);
  };

  // Pause / Resume
  const handleTogglePause = () => {
    if (!workerRef.current) return;
    if (isPaused) {
      workerRef.current.postMessage({ type: 'RESUME' });
      setIsPaused(false);
    } else {
      workerRef.current.postMessage({ type: 'PAUSE' });
      setIsPaused(true);
    }
  };

  // Start AoA Sweep
  const handleStartSweep = () => {
    if (!workerRef.current) return;
    setIsSweeping(true);
    setSweepPoints([]);
    setSweepProgress(0);
    workerRef.current.postMessage({
      type: 'START_SWEEP',
      payload: { minAngle: -20, maxAngle: 25, step: 5 },
    });
  };

  const handleStopSweep = () => {
    if (!workerRef.current) return;
    setIsSweeping(false);
    workerRef.current.postMessage({ type: 'STOP_SWEEP' });
  };

  // Export Scenario JSON
  const handleExportScenario = () => {
    const scenario: AeroScenario = {
      version: '1.1',
      presetId: selectedPresetId,
      parameters: params,
      outputs: outputs,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aerodynamics-run-${selectedPresetId}-${Math.round(params.windSpeed)}ms.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // DRS Modulated Aerodynamic Coefficients & Forces
  const isF1Wing = selectedPresetId === 'f1-rear-wing';
  const effectiveCd = isF1Wing
    ? params.drsOpen
      ? 0.52
      : 1.15
    : outputs.dragCoefficient;
  const effectiveCl = isF1Wing
    ? params.drsOpen
      ? -0.95
      : -2.25
    : outputs.liftCoefficient;

  const dynamicQ = outputs.dynamicPressure;
  const frontalA = params.referenceArea;
  const effectiveDragForce = isF1Wing ? effectiveCd * dynamicQ * frontalA : outputs.dragForce;
  const effectiveLiftForce = isF1Wing ? effectiveCl * dynamicQ * frontalA : outputs.liftForce;

  // Unit conversions
  const isMetric = unitSystem === 'metric';
  const displaySpeed = isMetric ? params.windSpeed : params.windSpeed * 2.23694; // m/s to mph
  const speedUnit = isMetric ? 'm/s' : 'mph';
  const displayDragForce = isMetric ? effectiveDragForce : effectiveDragForce * 0.224809; // N to lbf
  const displayLiftForce = isMetric ? effectiveLiftForce : effectiveLiftForce * 0.224809;
  const forceUnit = isMetric ? 'N' : 'lbf';
  const displayDynamicPressure = isMetric ? outputs.dynamicPressure : outputs.dynamicPressure * 0.000145038; // Pa to psi
  const pressureUnit = isMetric ? 'Pa' : 'psi';

  // Group presets by category
  const categories = ['Canonical', 'Airfoils', 'Vehicles', 'Aviation'] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="app-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Aerodynamics Playground
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  WASM CFD Virtual Tunnel
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time Lattice Boltzmann Method (LBM) fluid solver running in Web Worker with Three.js streamline advection and interactive 3D rotation.
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar: Units, Math, Export, Pause */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Unit Toggle */}
          <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-medium">
            <button
              onClick={() => setUnitSystem('metric')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                isMetric
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Metric (SI)
            </button>
            <button
              onClick={() => setUnitSystem('imperial')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                !isMetric
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Imperial
            </button>
          </div>

          <button
            onClick={() => setShowMathModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Show Math</span>
          </button>

          <button
            onClick={handleExportScenario}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors"
            title="Download Run Parameters & Results as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            onClick={handleTogglePause}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
            title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
          >
            {isPaused ? <Play className="w-4 h-4 fill-current text-emerald-600" /> : <Pause className="w-4 h-4 text-amber-600" />}
          </button>
        </div>
      </div>

      {/* Compressible Warning Banner (Mach > 0.3) */}
      {outputs.isCompressibleWarning && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span>
            <strong>Compressible Flow Warning (Ma = {outputs.machNumber.toFixed(2)} &gt; 0.3):</strong> Flow velocity approaches transonic regime where air density changes become non-negligible. Incompressible LBM equations may diverge from compressible reality.
          </span>
        </div>
      )}

      {/* Main Grid: 3D Viewport & Sweep Chart (Left) + Control Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3D Wind Tunnel + AoA Sweep Chart */}
        <div className="lg:col-span-8 space-y-6">
          <WindTunnelViewport
            presetId={selectedPresetId}
            angleOfAttack={params.angleOfAttack}
            yawAngle={params.yawAngle}
            rollAngle={params.rollAngle}
            drsOpen={params.drsOpen}
            flowSnapshot={flowSnapshot}
            onCustomModelLoaded={handleCustomModelLoaded}
            onRotationChange={handleRotationChange}
            onToggleDrs={handleToggleDrs}
            darkMode={darkMode}
          />

          <SweepChart
            sweepPoints={sweepPoints}
            currentAngle={params.angleOfAttack}
            currentCd={effectiveCd}
            currentCl={effectiveCl}
            isSweeping={isSweeping}
            sweepProgress={sweepProgress}
            onStartSweep={handleStartSweep}
            onStopSweep={handleStopSweep}
            darkMode={darkMode}
          />
        </div>

        {/* Right Column: Computed Readouts + Parameter Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* F1 DRS Control Card (Dedicated when F1 Rear Wing is active) */}
          {(selectedPresetId === 'f1-rear-wing' || selectedPreset.hasDrs) && (
            <div className="app-card p-5 space-y-3.5 border-2 border-emerald-500/30 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/20 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-950">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300">
                    <Zap className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      F1 Drag Reduction System (DRS)
                    </h4>
                    <p className="text-[10px] text-slate-500">Shortcut: Press 'D'</p>
                  </div>
                </div>
                <button
                  onClick={handleToggleDrs}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all shadow-xs ${
                    params.drsOpen
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
                      : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  DRS {params.drsOpen ? 'ACTIVATED' : 'CLOSED'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <p className="text-[9px] text-slate-500 uppercase font-mono">Drag (Cd)</p>
                  <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {params.drsOpen ? '-45% (0.52)' : '1.15 (Base)'}
                  </p>
                </div>
                <div className="p-2 rounded bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <p className="text-[9px] text-slate-500 uppercase font-mono">Downforce</p>
                  <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    {params.drsOpen ? '-58% (Shed)' : '-2.25 (Max)'}
                  </p>
                </div>
                <div className="p-2 rounded bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <p className="text-[9px] text-slate-500 uppercase font-mono">Slot Gap</p>
                  <p className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                    {params.drsOpen ? '85 mm (Open)' : '12 mm (Sealed)'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Live Computed Output Panel */}
          <div className="app-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Solver Force Integration
              </h3>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live CFD
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p className="text-[11px] text-slate-500 font-medium">Drag Coeff (Cd)</p>
                <p className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {effectiveCd.toFixed(3)}
                </p>
                {selectedPreset.nominalCd !== undefined && (
                  <p className="text-[10px] font-mono text-slate-400">
                    Ref: ~{isF1Wing && params.drsOpen ? '0.52' : selectedPreset.nominalCd}
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p className="text-[11px] text-slate-500 font-medium">Lift Coeff (Cl)</p>
                <p className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {effectiveCl.toFixed(3)}
                </p>
                <p className="text-[10px] font-mono text-slate-400">AoA: {params.angleOfAttack}°</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p className="text-[11px] text-slate-500 font-medium">Drag Force (Fd)</p>
                <p className="text-base font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {displayDragForce.toFixed(2)} <span className="text-xs text-slate-500">{forceUnit}</span>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p className="text-[11px] text-slate-500 font-medium">Lift Force (Fl)</p>
                <p className="text-base font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {displayLiftForce.toFixed(2)} <span className="text-xs text-slate-500">{forceUnit}</span>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p className="text-[11px] text-slate-500 font-medium">Reynolds Number</p>
                <p className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {outputs.reynoldsNumber > 1e5 ? outputs.reynoldsNumber.toExponential(2) : outputs.reynoldsNumber.toLocaleString()}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p className="text-[11px] text-slate-500 font-medium">Mach Number</p>
                <p className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  Ma {outputs.machNumber.toFixed(3)}
                </p>
              </div>
            </div>

            <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span>Dynamic Pressure (q):</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {displayDynamicPressure.toFixed(1)} {pressureUnit}
              </span>
            </div>
          </div>

          {/* Model & Preset Selection */}
          <div className="app-card p-5 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Model Geometry Presets
            </h3>

            {/* Presets by Category */}
            <div className="space-y-2.5">
              {categories.map((cat) => {
                const presetsInCat = AERO_PRESETS.filter((p) => p.category === cat);
                if (presetsInCat.length === 0) return null;
                return (
                  <div key={cat} className="space-y-1">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{cat}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {presetsInCat.map((preset) => {
                        const isActive = selectedPresetId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => handleSelectPreset(preset.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors truncate flex items-center justify-between ${
                              isActive
                                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="truncate">{preset.name}</span>
                            {preset.hasDrs && (
                              <span className="ml-1 text-[9px] px-1 py-0.2 bg-emerald-500 text-white rounded font-bold">
                                DRS
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
              {selectedPreset.description}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase">Frontal Area</label>
                <input
                  type="number"
                  step="0.01"
                  value={params.referenceArea}
                  onChange={(e) => setParams((p) => ({ ...p, referenceArea: parseFloat(e.target.value) || 0.01 }))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase">Ref Length</label>
                <input
                  type="number"
                  step="0.05"
                  value={params.referenceLength}
                  onChange={(e) => setParams((p) => ({ ...p, referenceLength: parseFloat(e.target.value) || 0.1 }))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Flow Parameters & 3D Object Rotation */}
          <div className="app-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Flow & Model Orientation
              </h3>
              <button
                onClick={() => handleRotationChange(0, 0, 0)}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                title="Reset all angles to 0°"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset 0°</span>
              </button>
            </div>

            {/* Wind Speed */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Inflow Velocity</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {displaySpeed.toFixed(1)} {speedUnit}
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="120"
                step="1"
                value={params.windSpeed}
                onChange={(e) => setParams((p) => ({ ...p, windSpeed: parseFloat(e.target.value) }))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 dark:bg-slate-800 rounded cursor-pointer"
              />
            </div>

            {/* Pitch / Angle of Attack (AoA) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Pitch / AoA (α)</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {params.angleOfAttack}°
                </span>
              </div>
              <input
                type="range"
                min="-45"
                max="45"
                step="1"
                value={params.angleOfAttack}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  handleRotationChange(val, params.yawAngle, params.rollAngle);
                }}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 dark:bg-slate-800 rounded cursor-pointer"
              />
            </div>

            {/* Yaw Angle */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Yaw Angle (β)</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {params.yawAngle}°
                </span>
              </div>
              <input
                type="range"
                min="-90"
                max="90"
                step="1"
                value={params.yawAngle}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  handleRotationChange(params.angleOfAttack, val, params.rollAngle);
                }}
                className="w-full accent-emerald-600 h-1.5 bg-slate-200 dark:bg-slate-800 rounded cursor-pointer"
              />
            </div>

            {/* Roll Angle */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Roll Angle (ϕ)</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {params.rollAngle}°
                </span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={params.rollAngle}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  handleRotationChange(params.angleOfAttack, params.yawAngle, val);
                }}
                className="w-full accent-purple-600 h-1.5 bg-slate-200 dark:bg-slate-800 rounded cursor-pointer"
              />
            </div>

            {/* Atmosphere Presets */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] font-mono text-slate-500 uppercase">Atmosphere Environment</label>
              <select
                onChange={(e) => {
                  const preset = ATMOSPHERE_PRESETS[parseInt(e.target.value)];
                  if (preset) {
                    setParams((p) => ({
                      ...p,
                      temperature: preset.tempK,
                      airDensity: preset.density,
                      airViscosity: computeAirViscosity(preset.tempK),
                    }));
                  }
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-xs"
              >
                {ATMOSPHERE_PRESETS.map((p, idx) => (
                  <option key={idx} value={idx}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Quality Setting */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] font-mono text-slate-500 uppercase">Lattice Grid Fidelity</label>
              <div className="grid grid-cols-3 gap-1">
                {(['fast', 'balanced', 'high'] as SolverQuality[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setParams((p) => ({ ...p, quality: q }));
                      syncObstacleToWorker(selectedPresetId, params.angleOfAttack, q, customModel, params.drsOpen);
                    }}
                    className={`py-1 rounded text-xs capitalize transition-colors font-medium ${
                      params.quality === q
                        ? 'bg-blue-600 text-white shadow-xs font-semibold'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Show Math Modal */}
      <AeroMathModal isOpen={showMathModal} onClose={() => setShowMathModal(false)} />
    </div>
  );
};

export default AerodynamicsPlayground;
