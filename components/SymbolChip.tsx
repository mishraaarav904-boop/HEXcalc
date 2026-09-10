import React from 'react';
import { SymbolItem } from '../data/greekAlphabet';
import { Code2 } from 'lucide-react';

interface SymbolChipProps {
  item: SymbolItem;
  onCopySymbol: (symbol: string, name: string) => void;
  onCopyLatex: (latex: string, name: string) => void;
}

export const SymbolChip: React.FC<SymbolChipProps> = ({
  item,
  onCopySymbol,
  onCopyLatex,
}) => {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onCopyLatex(item.latex, item.name);
  };

  return (
    <div
      onClick={() => onCopySymbol(item.symbol, item.name)}
      onContextMenu={handleContextMenu}
      title={`Click to copy "${item.symbol}" | Right-click to copy LaTeX "${item.latex}"`}
      className="group relative flex flex-col items-center justify-between p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-150 cursor-pointer shadow-xs hover:shadow-sm"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCopyLatex(item.latex, item.name);
        }}
        title={`Copy LaTeX: ${item.latex}`}
        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded bg-slate-100 hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-500 hover:text-white dark:text-slate-400 dark:hover:text-white transition-all z-10"
      >
        <Code2 className="w-3 h-3" />
      </button>

      <div className="my-2 flex items-center justify-center min-h-[44px]">
        <span className="math-symbol text-3xl sm:text-4xl text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors select-none">
          {item.symbol}
        </span>
      </div>

      <div className="w-full text-center mt-1">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
          {item.name}
        </p>
        <div className="flex items-center justify-between gap-1 mt-1">
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
            {item.unicode}
          </span>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[65px]" title={item.latex}>
            {item.latex}
          </span>
        </div>
      </div>
    </div>
  );
};

