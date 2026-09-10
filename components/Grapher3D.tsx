import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Trash2, Box, AlertCircle, RefreshCw } from 'lucide-react';

interface Grapher3DProps {
  apiKey: string;
  darkMode?: boolean;
}

export const Grapher3D: React.FC<Grapher3DProps> = ({ apiKey, darkMode = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<Desmos.CalculatorInstance | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timerId: any = null;
    let attempts = 0;

    const initCalculator3D = () => {
      if (!containerRef.current) return;

      const desmos = window.Desmos as any;
      if (desmos) {
        const ctor3D = desmos.Calculator3D || desmos.Calculator;
        if (typeof ctor3D === 'function') {
          try {
            if (calculatorRef.current) {
              calculatorRef.current.destroy();
              calculatorRef.current = null;
            }

            const calc = ctor3D(containerRef.current, {
              keypad: true,
              expressions: true,
              settingsMenu: true,
              zoomButtons: true,
              showResetButtonOnGraphpaper: true,
              border: false,
              invertedColors: darkMode,
            });

            calc.setExpression({ id: 'paraboloid', latex: 'z=x^2+y^2', color: '#2563eb' });
            calculatorRef.current = calc;
            if (isMounted) {
              setLoaded(true);
              setError(null);
            }
            return;
          } catch (err: any) {
            console.error('Desmos 3D init error:', err);
            if (isMounted) setError('Failed to initialize 3D Viewport.');
            return;
          }
        }
      }

      attempts++;
      if (attempts < 60) {
        timerId = setTimeout(initCalculator3D, 100);
      } else {
        if (isMounted) {
          setError('Desmos 3D engine is currently unavailable. Please check API key configuration or network connection.');
        }
      }
    };

    const frameId = requestAnimationFrame(() => {
      initCalculator3D();
    });

    return () => {
      isMounted = false;
      cancelAnimationFrame(frameId);
      if (timerId) clearTimeout(timerId);
      if (calculatorRef.current) {
        calculatorRef.current.destroy();
        calculatorRef.current = null;
      }
    };
  }, [apiKey, darkMode]);

  const handleResetView = () => {
    if (!calculatorRef.current) return;
    try {
      calculatorRef.current.setMathBounds({ left: -5, right: 5, bottom: -5, top: 5 });
    } catch {
      // 3D camera reset fallback
    }
  };

  const handleClearGraph = () => {
    if (!calculatorRef.current) return;
    calculatorRef.current.removeExpressions(calculatorRef.current.getExpressions());
  };

  const handleApplyPreset = (presetType: 'paraboloid' | 'saddle' | 'sphere' | 'ripple' | 'plane') => {
    if (!calculatorRef.current) return;
    const calc = calculatorRef.current;
    calc.removeExpressions(calc.getExpressions());

    if (presetType === 'paraboloid') {
      calc.setExpression({ id: 'paraboloid', latex: 'z=x^2+y^2', color: '#2563eb' });
    } else if (presetType === 'saddle') {
      calc.setExpression({ id: 'saddle', latex: 'z=x^2-y^2', color: '#d97706' });
    } else if (presetType === 'sphere') {
      calc.setExpression({ id: 'sphere', latex: 'x^2+y^2+z^2=4', color: '#059669' });
    } else if (presetType === 'ripple') {
      calc.setExpression({ id: 'ripple', latex: 'z=\\sin(\\sqrt{x^2+y^2})', color: '#7c3aed' });
    } else if (presetType === 'plane') {
      calc.setExpression({ id: 'plane', latex: 'z=2x-y', color: '#0891b2' });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Clean Utility Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            3D Presets:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <button
              onClick={() => handleApplyPreset('paraboloid')}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors font-mono"
            >
              z = x² + y²
            </button>
            <button
              onClick={() => handleApplyPreset('saddle')}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors font-mono"
            >
              Saddle: z = x² - y²
            </button>
            <button
              onClick={() => handleApplyPreset('sphere')}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors font-mono"
            >
              Sphere: x² + y² + z² = 4
            </button>
            <button
              onClick={() => handleApplyPreset('ripple')}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors font-mono"
            >
              Ripple: z = sin(√(x²+y²))
            </button>
            <button
              onClick={() => handleApplyPreset('plane')}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors font-mono"
            >
              Plane: z = 2x - y
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleResetView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            Reset View
          </button>
          <button
            onClick={handleClearGraph}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 transition-colors font-medium"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Clear
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-200/60 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100 font-medium hover:bg-rose-300 dark:hover:bg-rose-800 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Desmos 3D Container */}
      <div className="relative flex-1 w-full h-full min-h-[400px]">
        {!loaded && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 dark:bg-slate-950/90 z-10 space-y-3">
            <div className="w-7 h-7 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-600 dark:text-slate-400">Loading 3D Viewport...</p>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full min-h-[400px]" style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};

export default Grapher3D;