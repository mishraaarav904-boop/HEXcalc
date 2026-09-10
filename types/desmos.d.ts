/// <reference types="vite/client" />

declare module 'lucide-react';

declare namespace Desmos {
  export interface ExpressionState {
    id?: string;
    latex?: string;
    color?: string;
    lineStyle?: string;
    lineWidth?: string;
    hidden?: boolean;
    secret?: boolean;
    sliderBounds?: { min?: string; max?: string; step?: string };
    [key: string]: any;
  }

  export interface GraphingCalculatorOptions {
    keypad?: boolean;
    graphpaper?: boolean;
    expressions?: boolean;
    settingsMenu?: boolean;
    zoomButtons?: boolean;
    showResetButtonOnGraphpaper?: boolean;
    border?: boolean;
    lockViewport?: boolean;
    invertedColors?: boolean;
    fontSize?: number;
    [key: string]: any;
  }

  export interface CalculatorInstance {
    setExpression(expr: ExpressionState): void;
    setExpressions(exprs: ExpressionState[]): void;
    removeExpression(expr: { id: string }): void;
    removeExpressions(exprs: any[]): void;
    getExpressions(): any[];
    setBlank(): void;
    destroy(): void;
    setMathBounds(bounds: { left: number; right: number; bottom: number; top: number }): void;
    getState(): any;
    setState(state: any): void;
    setDefaultState(state: any): void;
    blank(): void;
  }

  export function GraphingCalculator(element: HTMLElement, options?: GraphingCalculatorOptions): CalculatorInstance;
  export function Calculator3D(element: HTMLElement, options?: GraphingCalculatorOptions): CalculatorInstance;
}

interface Window {
  Desmos?: typeof Desmos;
}
