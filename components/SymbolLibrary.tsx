import React, { useState } from 'react';
import { GREEK_ALPHABET } from '../data/greekAlphabet';
import { COMMON_MATH_SECTIONS } from '../data/mathSymbols';
import { RARE_PHYSICS_SYMBOLS } from '../data/rareSymbols';
import { SymbolGrid } from './SymbolGrid';
import { Search, X, BookOpen } from 'lucide-react';

type SubTab = 'greek' | 'common' | 'rare';

interface SymbolLibraryProps {
  onCopySymbol: (symbol: string, name: string) => void;
  onCopyLatex: (latex: string, name: string) => void;
}

export const SymbolLibrary: React.FC<SymbolLibraryProps> = ({
  onCopySymbol,
  onCopyLatex,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('greek');
  const [searchQuery, setSearchQuery] = useState('');

  const subTabs = [
    { id: 'greek' as SubTab, label: 'Greek Alphabet', count: GREEK_ALPHABET.length },
    {
      id: 'common' as SubTab,
      label: 'Math Symbols',
      count: COMMON_MATH_SECTIONS.reduce((acc, sec) => acc + sec.symbols.length, 0),
    },
    { id: 'rare' as SubTab, label: 'Rare & Physics', count: RARE_PHYSICS_SYMBOLS.length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Controls */}
      <div className="app-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Symbol Library
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Click any symbol to copy glyph directly. Right-click or use top icon to copy LaTeX command.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[280px] sm:min-w-[340px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, glyph, U+code, or \\latex..."
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

      {/* Sub-tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          {subTabs.map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    isActive
                      ? 'bg-blue-700 text-white font-semibold'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Content */}
      <div className="pt-2">
        {activeSubTab === 'greek' && (
          <SymbolGrid
            symbols={GREEK_ALPHABET}
            searchQuery={searchQuery}
            onCopySymbol={onCopySymbol}
            onCopyLatex={onCopyLatex}
          />
        )}
        {activeSubTab === 'common' && (
          <SymbolGrid
            sections={COMMON_MATH_SECTIONS}
            searchQuery={searchQuery}
            onCopySymbol={onCopySymbol}
            onCopyLatex={onCopyLatex}
          />
        )}
        {activeSubTab === 'rare' && (
          <SymbolGrid
            symbols={RARE_PHYSICS_SYMBOLS}
            searchQuery={searchQuery}
            onCopySymbol={onCopySymbol}
            onCopyLatex={onCopyLatex}
          />
        )}
      </div>
    </div>
  );
};

