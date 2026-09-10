import React, { useState, useRef, useEffect } from 'react';
import { Grid3X3, Play, Pause, Copy, Check } from 'lucide-react';

type MatrixMode = 'calculator' | 'arithmetic' | 'systems' | 'transform' | 'vectors';

export const MatrixStudio: React.FC = () => {
  const [mode, setMode] = useState<MatrixMode>('calculator');
  const [matrixSize, setMatrixSize] = useState<2 | 3 | 4>(3);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Matrix A (4x4 storage)
  const [matrixA, setMatrixA] = useState<number[][]>([
    [2, 1, -1, 0],
    [-3, -1, 2, 0],
    [-2, 1, 2, 0],
    [0, 0, 0, 1],
  ]);

  // Matrix B (4x4 storage)
  const [matrixB, setMatrixB] = useState<number[][]>([
    [1, 0, 2, 0],
    [0, 3, 1, 0],
    [2, 1, 0, 0],
    [0, 0, 0, 1],
  ]);

  // Vector b for Ax = b
  const [vectorB, setVectorB] = useState<number[]>([8, -11, -3, 0]);

  // 2D Transformation Visualizer state
  const [transformMat, setTransformMat] = useState<number[][]>([
    [1.5, 0.5],
    [0.2, 1.2],
  ]);
  const [morphT, setMorphT] = useState<number>(1.0); // 0 = Identity, 1 = Matrix
  const [isMorphing, setIsMorphing] = useState<boolean>(false);
  const transformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // 3D Vector state
  const [vecU, setVecU] = useState<[number, number, number]>([3, -2, 1]);
  const [vecV, setVecV] = useState<[number, number, number]>([1, 4, -2]);

  // Cell change handlers
  const handleCellChangeA = (r: number, c: number, val: string) => {
    const num = parseFloat(val);
    setMatrixA((prev) => {
      const copy = prev.map((row) => [...row]);
      copy[r][c] = isNaN(num) ? 0 : num;
      return copy;
    });
  };

  const handleCellChangeB = (r: number, c: number, val: string) => {
    const num = parseFloat(val);
    setMatrixB((prev) => {
      const copy = prev.map((row) => [...row]);
      copy[r][c] = isNaN(num) ? 0 : num;
      return copy;
    });
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Matrix math helpers for size N
  const getSubmatrix = (mat: number[][], size: number): number[][] => {
    return mat.slice(0, size).map((row) => row.slice(0, size));
  };

  // Determinant calculation (recursive Laplace expansion)
  const calcDeterminant = (m: number[][]): number => {
    const n = m.length;
    if (n === 1) return m[0][0];
    if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
    let det = 0;
    for (let j = 0; j < n; j++) {
      const minor = m.slice(1).map((row) => row.filter((_, colIdx) => colIdx !== j));
      const cofactor = (j % 2 === 0 ? 1 : -1) * m[0][j] * calcDeterminant(minor);
      det += cofactor;
    }
    return det;
  };

  // Transpose
  const calcTranspose = (m: number[][]): number[][] => {
    const n = m.length;
    const trans = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        trans[j][i] = m[i][j];
      }
    }
    return trans;
  };

  // Trace
  const calcTrace = (m: number[][]): number => {
    return m.reduce((sum, row, i) => sum + (row[i] || 0), 0);
  };

  // Inverse via Gauss-Jordan elimination
  const calcInverse = (m: number[][]): number[][] | null => {
    const n = m.length;
    const det = calcDeterminant(m);
    if (Math.abs(det) < 1e-12) return null;

    // Augmented matrix [A | I]
    const aug = m.map((row, i) => {
      const eye = new Array(n).fill(0);
      eye[i] = 1;
      return [...row, ...eye];
    });

    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
      }
      if (Math.abs(aug[maxRow][i]) < 1e-12) return null;

      // Swap rows
      [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

      // Scale pivot row to 1
      const pivot = aug[i][i];
      for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;

      // Eliminate other rows
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = aug[k][i];
          for (let j = 0; j < 2 * n; j++) {
            aug[k][j] -= factor * aug[i][j];
          }
        }
      }
    }

    return aug.map((row) => row.slice(n).map((v) => Math.round(v * 10000) / 10000));
  };

  // Matrix multiplication A * B
  const multiplyMatrices = (A: number[][], B: number[][]): number[][] => {
    const n = A.length;
    const res = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += A[i][k] * B[k][j];
        }
        res[i][j] = Math.round(sum * 10000) / 10000;
      }
    }
    return res;
  };

  // Matrix Addition & Subtraction
  const addMatrices = (A: number[][], B: number[][], sign = 1): number[][] => {
    return A.map((row, i) => row.map((val, j) => Math.round((val + sign * B[i][j]) * 10000) / 10000));
  };

  // Solve Ax = b via Gaussian Elimination
  const solveLinearSystem = (A: number[][], b: number[]): { sol: number[] | null; rref: number[][] } => {
    const n = A.length;
    const aug = A.map((row, i) => [...row, b[i]]);

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
      }
      if (Math.abs(aug[maxRow][i]) > 1e-12) {
        [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
        const pivot = aug[i][i];
        for (let j = 0; j <= n; j++) aug[i][j] /= pivot;

        for (let k = 0; k < n; k++) {
          if (k !== i) {
            const factor = aug[k][i];
            for (let j = 0; j <= n; j++) {
              aug[k][j] -= factor * aug[i][j];
            }
          }
        }
      }
    }

    // Check singularity / rank deficiency
    const det = calcDeterminant(A);
    if (Math.abs(det) < 1e-10) {
      return { sol: null, rref: aug };
    }

    // Check consistency
    for (let i = 0; i < n; i++) {
      const allZero = aug[i].slice(0, n).every((v) => Math.abs(v) < 1e-8);
      if (allZero && Math.abs(aug[i][n]) > 1e-8) {
        return { sol: null, rref: aug };
      }
    }

    const sol = aug.map((row) => Math.round(row[n] * 10000) / 10000);
    return { sol, rref: aug };
  };

  // Current submatrix A & results
  const curA = getSubmatrix(matrixA, matrixSize);
  const curB = getSubmatrix(matrixB, matrixSize);
  const curVecB = vectorB.slice(0, matrixSize);

  const detA = calcDeterminant(curA);
  const traceA = calcTrace(curA);
  const transA = calcTranspose(curA);
  const invA = calcInverse(curA);
  const isSingular = Math.abs(detA) < 1e-12;

  // 2x2 Eigenvalues analytical (real and complex)
  let eigenvalues2x2: { lambda1: string; lambda2: string } | null = null;
  if (matrixSize === 2) {
    const T = traceA;
    const D = detA;
    const disc = T * T - 4 * D;
    if (disc >= 0) {
      eigenvalues2x2 = {
        lambda1: (Math.round(((T + Math.sqrt(disc)) / 2) * 1000) / 1000).toString(),
        lambda2: (Math.round(((T - Math.sqrt(disc)) / 2) * 1000) / 1000).toString(),
      };
    } else {
      const re = Math.round((T / 2) * 1000) / 1000;
      const im = Math.round((Math.sqrt(-disc) / 2) * 1000) / 1000;
      eigenvalues2x2 = {
        lambda1: re === 0 ? `${im}i` : `${re} + ${im}i`,
        lambda2: re === 0 ? `-${im}i` : `${re} - ${im}i`,
      };
    }
  }

  // Linear system solution
  const sysResult = solveLinearSystem(curA, curVecB);

  // 2D Transformation Canvas Animation
  useEffect(() => {
    if (mode !== 'transform') return;
    const canvas = transformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const scale = 50; // px per unit

    ctx.clearRect(0, 0, W, H);

    // Dark canvas background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, W, H);

    // Current interpolated matrix M(t) = (1 - t)I + tA
    const t = morphT;
    const m00 = (1 - t) * 1 + t * transformMat[0][0];
    const m01 = (1 - t) * 0 + t * transformMat[0][1];
    const m10 = (1 - t) * 0 + t * transformMat[1][0];
    const m11 = (1 - t) * 1 + t * transformMat[1][1];

    const toScreen = (x: number, y: number): [number, number] => {
      // Map through M(t)
      const tx = m00 * x + m01 * y;
      const ty = m10 * x + m11 * y;
      return [cx + tx * scale, cy - ty * scale];
    };

    // Draw grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let g = -6; g <= 6; g++) {
      // Vertical grid lines
      const [x1, y1] = toScreen(g, -6);
      const [x2, y2] = toScreen(g, 6);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Horizontal grid lines
      const [x3, y3] = toScreen(-6, g);
      const [x4, y4] = toScreen(6, g);
      ctx.beginPath();
      ctx.moveTo(x3, y3);
      ctx.lineTo(x4, y4);
      ctx.stroke();
    }

    // Transformed Unit Square Area Shading
    const [sq0x, sq0y] = toScreen(0, 0);
    const [sq1x, sq1y] = toScreen(1, 0);
    const [sq2x, sq2y] = toScreen(1, 1);
    const [sq3x, sq3y] = toScreen(0, 1);

    ctx.beginPath();
    ctx.moveTo(sq0x, sq0y);
    ctx.lineTo(sq1x, sq1y);
    ctx.lineTo(sq2x, sq2y);
    ctx.lineTo(sq3x, sq3y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.stroke();

    // Axes
    const [ax1, ay1] = toScreen(-7, 0);
    const [ax2, ay2] = toScreen(7, 0);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ax1, ay1);
    ctx.lineTo(ax2, ay2);
    ctx.stroke();

    const [ay3, ay4] = toScreen(0, -7);
    const [ay5, ay6] = toScreen(0, 7);
    ctx.beginPath();
    ctx.moveTo(ay3, ay4);
    ctx.lineTo(ay5, ay6);
    ctx.stroke();

    // Basis Vector i-hat (Red/Amber)
    const [iHeadX, iHeadY] = toScreen(1, 0);
    ctx.beginPath();
    ctx.moveTo(sq0x, sq0y);
    ctx.lineTo(iHeadX, iHeadY);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`T(i): [${m00.toFixed(2)}, ${m10.toFixed(2)}]`, iHeadX + 8, iHeadY - 6);

    // Basis Vector j-hat (Cyan/Blue)
    const [jHeadX, jHeadY] = toScreen(0, 1);
    ctx.beginPath();
    ctx.moveTo(sq0x, sq0y);
    ctx.lineTo(jHeadX, jHeadY);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`T(j): [${m01.toFixed(2)}, ${m11.toFixed(2)}]`, jHeadX + 8, jHeadY - 6);
  }, [mode, transformMat, morphT]);

  // Morph Animation Frame Loop
  useEffect(() => {
    if (!isMorphing) return;
    let forward = true;
    const step = () => {
      setMorphT((prev) => {
        let next = forward ? prev + 0.015 : prev - 0.015;
        if (next >= 1.0) {
          next = 1.0;
          forward = false;
        } else if (next <= 0.0) {
          next = 0.0;
          forward = true;
        }
        return next;
      });
      animFrameRef.current = requestAnimationFrame(step);
    };
    animFrameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isMorphing]);

  // Preset Matrices Loader
  const loadPresetA = (preset: string) => {
    if (preset === 'identity') {
      setMatrixA([
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ]);
    } else if (preset === 'pauli_x') {
      setMatrixSize(2);
      setMatrixA([
        [0, 1, 0, 0],
        [1, 0, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ]);
    } else if (preset === 'pauli_z') {
      setMatrixSize(2);
      setMatrixA([
        [1, 0, 0, 0],
        [0, -1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ]);
    } else if (preset === 'rot45') {
      setMatrixSize(2);
      const c = 0.707, s = 0.707;
      setMatrixA([
        [c, -s, 0, 0],
        [s, c, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ]);
    } else if (preset === 'clear') {
      setMatrixA([
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
    }
  };

  // 3D Vector Math calculations
  const dotUV = vecU[0] * vecV[0] + vecU[1] * vecV[1] + vecU[2] * vecV[2];
  const magU = Math.sqrt(vecU[0] ** 2 + vecU[1] ** 2 + vecU[2] ** 2);
  const magV = Math.sqrt(vecV[0] ** 2 + vecV[1] ** 2 + vecV[2] ** 2);
  const crossUV: [number, number, number] = [
    vecU[1] * vecV[2] - vecU[2] * vecV[1],
    vecU[2] * vecV[0] - vecU[0] * vecV[2],
    vecU[0] * vecV[1] - vecU[1] * vecV[0],
  ];
  const cosTheta = magU * magV > 0 ? Math.max(-1, Math.min(1, dotUV / (magU * magV))) : 1;
  const angleDeg = Math.round(((Math.acos(cosTheta) * 180) / Math.PI) * 10) / 10;
  const compUV = magV > 0 ? Math.round((dotUV / magV) * 100) / 100 : 0;
  const projVecUV: [number, number, number] = magV > 0 ? [
    Math.round(((dotUV / (magV ** 2)) * vecV[0]) * 100) / 100,
    Math.round(((dotUV / (magV ** 2)) * vecV[1]) * 100) / 100,
    Math.round(((dotUV / (magV ** 2)) * vecV[2]) * 100) / 100,
  ] : [0, 0, 0];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner - Clean Minimalist Dark Style */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <Grid3X3 className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Matrix & Linear Algebra Studio
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Determinants, inverses, linear systems, eigenvalues, 2D transformations, and 3D vector algebra.
            </p>
          </div>
        </div>

        {/* Sub-mode Segmented Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
          {([
            { id: 'calculator', label: 'Matrix Analysis' },
            { id: 'arithmetic', label: 'Matrix Operations (A × B)' },
            { id: 'systems', label: 'Linear Systems (Ax = b)' },
            { id: 'transform', label: '2D Transformation Grid' },
            { id: 'vectors', label: '3D Vector Algebra' },
          ] as const).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === m.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/80 dark:border-slate-700 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* MODE 1: MATRIX ANALYSIS (Determinant, Inverse, Trace, Eigenvalues) */}
      {mode === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Matrix Input Editor (Left 6 Cols) */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Matrix A Input
              </span>

              {/* Dimension Switcher */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Dimension:</span>
                <div className="flex rounded bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                  {([2, 3, 4] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setMatrixSize(size)}
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        matrixSize === size
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {size}×{size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Matrix Input Grid */}
            <div
              className="grid gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800"
              style={{ gridTemplateColumns: `repeat(${matrixSize}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: matrixSize }).map((_, r) =>
                Array.from({ length: matrixSize }).map((_, c) => (
                  <input
                    key={`cell-${r}-${c}`}
                    type="number"
                    step="any"
                    value={matrixA[r][c]}
                    onChange={(e) => handleCellChangeA(r, c, e.target.value)}
                    className="w-full text-center font-mono font-medium text-sm p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                ))
              )}
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-slate-500 text-[11px]">Presets:</span>
              <button
                onClick={() => loadPresetA('identity')}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700"
              >
                Identity (I)
              </button>
              <button
                onClick={() => loadPresetA('pauli_x')}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700"
              >
                Pauli σ_x
              </button>
              <button
                onClick={() => loadPresetA('rot45')}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700"
              >
                Rotation 45°
              </button>
              <button
                onClick={() => loadPresetA('clear')}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700"
              >
                Zero Matrix
              </button>
            </div>
          </div>

          {/* Real-time Computed Properties (Right 6 Cols) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Core Scalar Properties */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Determinant (det A)</span>
                <p className="text-2xl font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {Math.round(detA * 10000) / 10000}
                </p>
                <span className="text-[11px] text-slate-500">
                  {isSingular ? 'Singular (non-invertible)' : 'Invertible matrix'}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Trace (Tr A)</span>
                <p className="text-2xl font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {Math.round(traceA * 10000) / 10000}
                </p>
                <span className="text-[11px] text-slate-500">Sum of diagonal entries</span>
              </div>
            </div>

            {/* Matrix Inverse A^-1 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Inverse Matrix (A⁻¹)
                </span>
                {invA && (
                  <button
                    onClick={() => handleCopy(JSON.stringify(invA), 'invA')}
                    className="text-[11px] flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    {copiedKey === 'invA' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                )}
              </div>

              {invA ? (
                <div
                  className="grid gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800"
                  style={{ gridTemplateColumns: `repeat(${matrixSize}, minmax(0, 1fr))` }}
                >
                  {invA.map((row, r) =>
                    row.map((val, c) => (
                      <div
                        key={`inv-${r}-${c}`}
                        className="text-center font-mono text-xs py-1.5 px-1 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                      >
                        {val}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500">
                  Matrix is singular (det = 0); inverse does not exist.
                </div>
              )}
            </div>

            {/* Transpose A^T */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Transpose Matrix (Aᵀ)
              </span>
              <div
                className="grid gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800"
                style={{ gridTemplateColumns: `repeat(${matrixSize}, minmax(0, 1fr))` }}
              >
                {transA.map((row, r) =>
                  row.map((val, c) => (
                    <div
                      key={`trans-${r}-${c}`}
                      className="text-center font-mono text-xs py-1.5 px-1 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                    >
                      {val}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2x2 Eigenvalues if applicable */}
            {eigenvalues2x2 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Eigenvalues (λ)
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">λ₁ = </span>
                    <span className="font-semibold text-blue-500">{eigenvalues2x2.lambda1}</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">λ₂ = </span>
                    <span className="font-semibold text-blue-500">{eigenvalues2x2.lambda2}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: ARITHMETIC (A + B, A - B, A × B) */}
      {mode === 'arithmetic' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Matrix A */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Matrix A ({matrixSize}×{matrixSize})</span>
              <div
                className="grid gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800"
                style={{ gridTemplateColumns: `repeat(${matrixSize}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: matrixSize }).map((_, r) =>
                  Array.from({ length: matrixSize }).map((_, c) => (
                    <input
                      key={`arith-a-${r}-${c}`}
                      type="number"
                      value={matrixA[r][c]}
                      onChange={(e) => handleCellChangeA(r, c, e.target.value)}
                      className="w-full text-center font-mono text-sm p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                    />
                  ))
                )}
              </div>
            </div>

            {/* Matrix B */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Matrix B ({matrixSize}×{matrixSize})</span>
              <div
                className="grid gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800"
                style={{ gridTemplateColumns: `repeat(${matrixSize}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: matrixSize }).map((_, r) =>
                  Array.from({ length: matrixSize }).map((_, c) => (
                    <input
                      key={`arith-b-${r}-${c}`}
                      type="number"
                      value={matrixB[r][c]}
                      onChange={(e) => handleCellChangeB(r, c, e.target.value)}
                      className="w-full text-center font-mono text-sm p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Results: Multiplication, Addition, Subtraction */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* A * B */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Multiplication (A × B)</span>
              <div
                className="grid gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800"
                style={{ gridTemplateColumns: `repeat(${matrixSize}, minmax(0, 1fr))` }}
              >
                {multiplyMatrices(curA, curB).map((row, r) =>
                  row.map((val, c) => (
                    <div key={`ab-${r}-${c}`} className="text-center font-mono text-xs py-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                      {val}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* A + B */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Addition (A + B)</span>
              <div
                className="grid gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800"
                style={{ gridTemplateColumns: `repeat(${matrixSize}, minmax(0, 1fr))` }}
              >
                {addMatrices(curA, curB, 1).map((row, r) =>
                  row.map((val, c) => (
                    <div key={`aplusb-${r}-${c}`} className="text-center font-mono text-xs py-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                      {val}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* A - B */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Subtraction (A - B)</span>
              <div
                className="grid gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800"
                style={{ gridTemplateColumns: `repeat(${matrixSize}, minmax(0, 1fr))` }}
              >
                {addMatrices(curA, curB, -1).map((row, r) =>
                  row.map((val, c) => (
                    <div key={`aminusb-${r}-${c}`} className="text-center font-mono text-xs py-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                      {val}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: LINEAR SYSTEMS (Ax = b) */}
      {mode === 'systems' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              System of Linear Equations (A x = b)
            </h2>
            <p className="text-xs text-slate-500">
              Solves for vector x via Gaussian elimination with augmented matrix row reduction.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* System Equation Matrix Editor */}
            <div className="lg:col-span-7 space-y-3">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Augmented System Matrix [ A | b ]
              </span>
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                {Array.from({ length: matrixSize }).map((_, r) => (
                  <div key={`sys-row-${r}`} className="flex items-center gap-2">
                    {Array.from({ length: matrixSize }).map((_, c) => (
                      <input
                        key={`sys-cell-${r}-${c}`}
                        type="number"
                        value={matrixA[r][c]}
                        onChange={(e) => handleCellChangeA(r, c, e.target.value)}
                        className="w-14 text-center font-mono text-sm p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                      />
                    ))}
                    <span className="text-slate-400 font-mono">x_{r + 1} =</span>
                    <input
                      type="number"
                      value={vectorB[r]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setVectorB((prev) => {
                          const copy = [...prev];
                          copy[r] = val;
                          return copy;
                        });
                      }}
                      className="w-16 text-center font-mono text-sm p-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded text-blue-600 dark:text-blue-400 font-semibold"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Solution Vector Output */}
            <div className="lg:col-span-5 space-y-3">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Unique Solution Vector (x)
              </span>

              {sysResult.sol ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5">
                  {sysResult.sol.map((val, i) => (
                    <div key={`sol-${i}`} className="flex items-center justify-between text-sm font-mono border-b border-slate-200 dark:border-slate-800/80 pb-1.5 last:border-0">
                      <span className="text-slate-500">x_{i + 1}</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{val}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs">
                  The system has no unique solution (either inconsistent or has infinitely many solutions).
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 4: 2D TRANSFORMATION GRID */}
      {mode === 'transform' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Visualizer Canvas (Left 7 Cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                2D Linear Transformation Grid (R² → R²)
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Area Scale: |det A| = {Math.abs(Math.round(calcDeterminant(transformMat) * 100) / 100)}
              </span>
            </div>

            <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex justify-center">
              <canvas
                ref={transformCanvasRef}
                width={560}
                height={380}
                className="w-full h-auto block"
              />
            </div>

            {/* Interpolation Morph Slider */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Morph Interpolation: Identity (0%) → Transform (100%)</span>
                <span className="font-mono font-medium text-blue-500">{Math.round(morphT * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMorphing(!isMorphing)}
                  className="px-2.5 py-1 text-xs font-medium rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  {isMorphing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={morphT}
                  onChange={(e) => setMorphT(parseFloat(e.target.value))}
                  className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Transformation Controls (Right 5 Cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Transformation Matrix [ a, b ; c, d ]
            </h3>

            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <input
                type="number"
                step="0.1"
                value={transformMat[0][0]}
                onChange={(e) => setTransformMat((p) => [[parseFloat(e.target.value) || 0, p[0][1]], p[1]])}
                className="text-center font-mono text-sm p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
              />
              <input
                type="number"
                step="0.1"
                value={transformMat[0][1]}
                onChange={(e) => setTransformMat((p) => [[p[0][0], parseFloat(e.target.value) || 0], p[1]])}
                className="text-center font-mono text-sm p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
              />
              <input
                type="number"
                step="0.1"
                value={transformMat[1][0]}
                onChange={(e) => setTransformMat((p) => [p[0], [parseFloat(e.target.value) || 0, p[1][1]]])}
                className="text-center font-mono text-sm p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
              />
              <input
                type="number"
                step="0.1"
                value={transformMat[1][1]}
                onChange={(e) => setTransformMat((p) => [p[0], [p[1][0], parseFloat(e.target.value) || 0]])}
                className="text-center font-mono text-sm p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
              />
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <span className="text-xs text-slate-500">Geometric Transformation Presets:</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setTransformMat([[0, -1], [1, 0]])}
                  className="px-2.5 py-1.5 text-xs text-left bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700"
                >
                  90° Counter-Clockwise
                </button>
                <button
                  onClick={() => setTransformMat([[1, 1], [0, 1]])}
                  className="px-2.5 py-1.5 text-xs text-left bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700"
                >
                  Horizontal Shear
                </button>
                <button
                  onClick={() => setTransformMat([[1.5, 0], [0, 0.8]])}
                  className="px-2.5 py-1.5 text-xs text-left bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700"
                >
                  Non-Uniform Scale
                </button>
                <button
                  onClick={() => setTransformMat([[0, 1], [1, 0]])}
                  className="px-2.5 py-1.5 text-xs text-left bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700"
                >
                  Reflection (y = x)
                </button>
                <button
                  onClick={() => setTransformMat([[1, 0], [0, 0]])}
                  className="px-2.5 py-1.5 text-xs text-left bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700"
                >
                  Projection onto X
                </button>
                <button
                  onClick={() => setTransformMat([[1, 0], [0, 1]])}
                  className="px-2.5 py-1.5 text-xs text-left bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700"
                >
                  Identity Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 5: 3D VECTOR ALGEBRA */}
      {mode === 'vectors' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vector u */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Vector u = [ux, uy, uz]</span>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((idx) => (
                  <input
                    key={`vec-u-${idx}`}
                    type="number"
                    value={vecU[idx]}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setVecU((prev) => {
                        const copy = [...prev] as [number, number, number];
                        copy[idx] = val;
                        return copy;
                      });
                    }}
                    className="text-center font-mono text-sm p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded"
                  />
                ))}
              </div>
              <p className="text-xs font-mono text-slate-500">||u|| = {magU.toFixed(3)}</p>
            </div>

            {/* Vector v */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Vector v = [vx, vy, vz]</span>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((idx) => (
                  <input
                    key={`vec-v-${idx}`}
                    type="number"
                    value={vecV[idx]}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setVecV((prev) => {
                        const copy = [...prev] as [number, number, number];
                        copy[idx] = val;
                        return copy;
                      });
                    }}
                    className="text-center font-mono text-sm p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded"
                  />
                ))}
              </div>
              <p className="text-xs font-mono text-slate-500">||v|| = {magV.toFixed(3)}</p>
            </div>
          </div>

          {/* Vector Calculations */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Dot Product (u · v)</span>
              <p className="text-xl font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {dotUV}
              </p>
              <span className="text-[11px] text-slate-500">Scalar product</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Angle (θ)</span>
              <p className="text-xl font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {angleDeg}°
              </p>
              <span className="text-[11px] text-slate-500">{(Math.acos(cosTheta)).toFixed(3)} rad</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Cross Product (u × v)</span>
              <p className="text-base font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
                [{crossUV.join(', ')}]
              </p>
              <span className="text-[11px] text-slate-500">Orthogonal vector</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Projection (proj_v u)</span>
              <p className="text-base font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
                [{projVecUV.join(', ')}]
              </p>
              <span className="text-[11px] text-slate-500 font-mono">Scalar: comp_v(u) = {compUV}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
