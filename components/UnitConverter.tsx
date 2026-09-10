import React, { useState } from 'react';
import { UNIT_CATEGORIES, UnitCategory } from '../data/unitConverters';
import { Calculator, ArrowRightLeft, Copy, Check } from 'lucide-react';

interface UnitConverterProps {
  onCopySymbol: (text: string, name: string) => void;
}

export const UnitConverter: React.FC<UnitConverterProps> = ({ onCopySymbol }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('length');
  const [inputValue, setInputValue] = useState<number>(1);
  const [fromUnitId, setFromUnitId] = useState<string>('m');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const category = UNIT_CATEGORIES.find((c) => c.id === selectedCategory) || UNIT_CATEGORIES[0];
  const fromUnit = category.units.find((u) => u.id === fromUnitId) || category.units[0];

  // Calculate base SI value
  const baseValue = fromUnit.toBase(Number.isFinite(inputValue) ? inputValue : 0);

  const handleCopyConverted = (unitName: string, valStr: string, symbol: string) => {
    const textToCopy = `${valStr} ${symbol}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(unitName);
    onCopySymbol(textToCopy, `${unitName} result`);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCategoryChange = (cat: UnitCategory) => {
    setSelectedCategory(cat.id);
    setFromUnitId(cat.units[0].id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="app-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Scientific Unit Converter</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Instant conversion matrix across fundamental SI and scientific units.
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          {UNIT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Converter Input Section */}
      <div className="app-card p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Value Input */}
        <div className="md:col-span-6 space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Value to Convert
          </label>
          <input
            type="number"
            value={isNaN(inputValue) ? '' : inputValue}
            onChange={(e) => setInputValue(parseFloat(e.target.value))}
            placeholder="Enter value..."
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-500 rounded-lg text-base font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* From Unit Selection */}
        <div className="md:col-span-6 space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            From Unit
          </label>
          <select
            value={fromUnitId}
            onChange={(e) => setFromUnitId(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-500 rounded-lg text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {category.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Conversion Results ({category.name})
          </h3>
          <span className="text-xs font-mono text-slate-500">
            Base: {baseValue.toExponential(4)} SI
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {category.units.map((unit) => {
            const converted = unit.fromBase(baseValue);
            const isCurrent = unit.id === fromUnitId;
            const displayStr =
              Math.abs(converted) < 1e-4 || Math.abs(converted) > 1e6
                ? converted.toExponential(6)
                : Number(converted.toFixed(6)).toString();

            return (
              <div
                key={unit.id}
                className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                  isCurrent
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 shadow-xs'
                    : 'app-card text-slate-800 dark:text-slate-200 hover:border-blue-500/40'
                }`}
              >
                <div className="truncate mr-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{unit.name}</p>
                  <p className="text-base font-mono font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                    {displayStr} <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold">{unit.symbol}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleCopyConverted(unit.name, displayStr, unit.symbol)}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 dark:hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                  title="Copy result"
                >
                  {copiedId === unit.name ? (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

