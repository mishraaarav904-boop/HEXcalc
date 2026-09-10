import React, { useEffect, useRef, useState } from 'react';
import katex from 'katex';

interface MathRendererProps {
  math: string;
  displayMode?: boolean;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  math,
  displayMode = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      setError(null);
      katex.render(math, containerRef.current, {
        displayMode,
        throwOnError: false,
        errorColor: '#f87171',
        output: 'html',
      });
    } catch (err: any) {
      console.error("KaTeX rendering error:", err);
      setError(err?.message || "Invalid LaTeX expression");
    }
  }, [math, displayMode]);

  return (
    <span className={`inline-block overflow-x-auto max-w-full ${className}`}>
      {error ? (
        <span className="text-xs text-red-400 font-mono bg-red-950/40 px-2 py-1 rounded border border-red-800/40">
          LaTeX Error: {error}
        </span>
      ) : (
        <span ref={containerRef} />
      )}
    </span>
  );
};
