import React from 'react';
import { SymbolItem } from '../data/greekAlphabet';
import { MathSection } from '../data/mathSymbols';
import { SymbolChip } from './SymbolChip';
import { HelpCircle } from 'lucide-react';

interface SymbolGridProps {
  symbols?: SymbolItem[];
  sections?: MathSection[];
  searchQuery: string;
  onCopySymbol: (symbol: string, name: string) => void;
  onCopyLatex: (latex: string, name: string) => void;
}

export const SymbolGrid: React.FC<SymbolGridProps> = ({
  symbols,
  sections,
  searchQuery,
  onCopySymbol,
  onCopyLatex,
}) => {
  const query = searchQuery.toLowerCase().trim();

  const filterItem = (item: SymbolItem) => {
    if (!query) return true;
    return (
      item.name.toLowerCase().includes(query) ||
      item.symbol.toLowerCase().includes(query) ||
      item.unicode.toLowerCase().includes(query) ||
      item.latex.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query))
    );
  };

  // Flat list rendering (Greek / Rare)
  if (symbols) {
    const filteredSymbols = symbols.filter(filterItem);

    if (filteredSymbols.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <HelpCircle className="w-8 h-8 text-slate-400 mb-2" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No symbols found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            No symbols match "{searchQuery}". Try searching for another name or LaTeX code.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
        {filteredSymbols.map((item) => (
          <SymbolChip
            key={item.id}
            item={item}
            onCopySymbol={onCopySymbol}
            onCopyLatex={onCopyLatex}
          />
        ))}
      </div>
    );
  }

  // Sectioned rendering (Common Math)
  if (sections) {
    const filteredSections = sections
      .map((sec) => ({
        ...sec,
        symbols: sec.symbols.filter(filterItem),
      }))
      .filter((sec) => sec.symbols.length > 0);

    if (filteredSections.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <HelpCircle className="w-8 h-8 text-slate-400 mb-2" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No matching math symbols</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            No symbols match "{searchQuery}".
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {filteredSections.map((sec) => (
          <div key={sec.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wider uppercase">
                {sec.title}
              </h3>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              <span className="text-xs font-mono text-slate-500">
                {sec.symbols.length} {sec.symbols.length === 1 ? 'symbol' : 'symbols'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
              {sec.symbols.map((item) => (
                <SymbolChip
                  key={item.id}
                  item={item}
                  onCopySymbol={onCopySymbol}
                  onCopyLatex={onCopyLatex}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

