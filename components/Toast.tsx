import React from 'react';
import { Check, Copy } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  subtitle?: string;
  isLatex?: boolean;
}

interface ToastProps {
  toast: ToastMessage | null;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in pointer-events-none">
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white rounded-xl shadow-xl">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-slate-800 dark:bg-slate-700 text-emerald-400">
          {toast.isLatex ? <Copy className="w-4 h-4" /> : <Check className="w-4 h-4" />}
        </div>
        <div>
          <p className="text-xs font-semibold text-white">{toast.title}</p>
          {toast.subtitle && (
            <p className="text-[11px] text-slate-400 font-mono">{toast.subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

