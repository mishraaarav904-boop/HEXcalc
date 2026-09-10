import React, { useState } from 'react';
import { PHYSICS_CONSTANTS, PhysicsConstant } from '../data/physicsConstants';
import { Atom, Copy, Search, X, Check } from 'lucide-react';

interface PhysicsConstantsProps {
  onCopySymbol: (symbol: string, name: string) => void;
}

export const PhysicsConstants: React.FC<PhysicsConstantsProps> = ({ onCopySymbol }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedValueId, setCopiedValueId] = useState<string | null>(null);

  const query = searchQuery.toLowerCase().trim();
  const filteredConstants = PHYSICS_CONSTANTS.filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      c.symbol.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query)
  );

  const handleCopyValue = (constant: PhysicsConstant) => {
    const textToCopy = `${constant.value} ${constant.unit}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedValueId(constant.id);
    onCopySymbol(textToCopy, `${constant.name} Value`);
    setTimeout(() => setCopiedValueId(null), 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="app-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Atom className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Fundamental Physics Constants
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Quick reference for fundamental physical and universal constants. Click symbol or value to copy.
          </p>
        </div>

        {/* Search */}
        <div className="relative min-w-[280px] sm:min-w-[340px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search constants (e.g. Planck, c, mass)..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-500 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredConstants.map((item) => (
          <div
            key={item.id}
            className="app-card p-5 flex flex-col justify-between hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    {item.description}
                  </p>
                </div>
                <button
                  onClick={() => onCopySymbol(item.symbol, item.name)}
                  title={`Copy Symbol: ${item.symbol}`}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-blue-700 dark:text-blue-400 font-mono font-bold text-base transition-colors flex items-center gap-1"
                >
                  <span className="math-symbol">{item.symbol}</span>
                </button>
              </div>

              {/* Value box */}
              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between font-mono text-xs text-slate-800 dark:text-slate-200">
                <div className="truncate mr-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{item.value}</span>{' '}
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">{item.unit}</span>
                </div>
                <button
                  onClick={() => handleCopyValue(item)}
                  className="p-1.5 rounded bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Copy numerical value + units"
                >
                  {copiedValueId === item.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

