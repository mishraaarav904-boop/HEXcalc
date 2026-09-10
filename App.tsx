import { useState, useEffect } from 'react';
import { Navbar, TabType } from './components/Navbar';
import { Grapher2D } from './components/Grapher2D';
import { Grapher3D } from './components/Grapher3D';
import { SymbolLibrary } from './components/SymbolLibrary';
import { ComplexEquationStudio } from './components/ComplexEquationStudio';
import { PhysicsConstants } from './components/PhysicsConstants';
import { UnitConverter } from './components/UnitConverter';
import { ThermodynamicsPlayground } from './components/thermodynamics/ThermodynamicsPlayground';
import { MatrixStudio } from './components/MatrixStudio';
import { SpaceStudio } from './components/space/SpaceStudio';
import { Toast, ToastMessage } from './components/Toast';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('2d');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('hexcalc_theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('hexcalc_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('hexcalc_theme', 'light');
    }
  }, [darkMode]);

  const apiKey = import.meta.env.VITE_DESMOS_API_KEY || 'dcb31709b452b1cf9dc26972add0fda6';

  const showToast = (title: string, subtitle?: string, isLatex?: boolean) => {
    const id = Date.now().toString();
    setToast({ id, title, subtitle, isLatex });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 1600);
  };

  const handleCopySymbol = (symbol: string, name: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(symbol).then(() => {
          showToast(`Copied ${symbol}`, `Character: ${name}`);
        }).catch(() => {
          fallbackCopyTextToClipboard(symbol, name);
        });
      } else {
        fallbackCopyTextToClipboard(symbol, name);
      }
    } catch {
      fallbackCopyTextToClipboard(symbol, name);
    }
  };

  const handleCopyLatex = (latex: string, name: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(latex).then(() => {
          showToast(`Copied ${latex}`, `LaTeX command for ${name}`, true);
        }).catch(() => {
          fallbackCopyTextToClipboard(latex, name, true);
        });
      } else {
        fallbackCopyTextToClipboard(latex, name, true);
      }
    } catch {
      fallbackCopyTextToClipboard(latex, name, true);
    }
  };

  const fallbackCopyTextToClipboard = (text: string, name: string, isLatex?: boolean) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(`Copied ${text}`, isLatex ? `LaTeX: ${name}` : `Character: ${name}`, isLatex);
    } catch (err) {
      showToast(`Failed to copy`, `Selection: ${text}`);
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        apiKey={apiKey}
      />

      <main className="flex-1 w-full relative">
        {activeTab === '2d' && <Grapher2D apiKey={apiKey} darkMode={darkMode} />}
        {activeTab === '3d' && <Grapher3D apiKey={apiKey} darkMode={darkMode} />}
        {activeTab === 'symbols' && (
          <SymbolLibrary
            onCopySymbol={handleCopySymbol}
            onCopyLatex={handleCopyLatex}
          />
        )}
        {activeTab === 'studio' && (
          <ComplexEquationStudio
            onCopySymbol={handleCopySymbol}
          />
        )}
        {activeTab === 'constants' && (
          <PhysicsConstants onCopySymbol={handleCopySymbol} />
        )}
        {activeTab === 'converter' && (
          <UnitConverter onCopySymbol={handleCopySymbol} />
        )}
        {activeTab === 'matrix' && (
          <div className="px-4 sm:px-6 py-6">
            <MatrixStudio />
          </div>
        )}
        {activeTab === 'space' && (
          <SpaceStudio darkMode={darkMode} />
        )}
        {activeTab === 'thermodynamics' && (
          <div className="px-4 sm:px-6 py-6">
            <ThermodynamicsPlayground darkMode={darkMode} />
          </div>
        )}
      </main>

      <Toast toast={toast} />
    </div>
  );
}

export default App;

