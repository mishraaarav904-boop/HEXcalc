import React from 'react';
import { MathRenderer } from '../MathRenderer';
import { X, Calculator, Info } from 'lucide-react';

interface AeroMathModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AeroMathModal: React.FC<AeroMathModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const equations = [
    {
      title: 'Lattice Boltzmann BGK Governing Flow Equation',
      latex: 'f_i(\mathbf{x} + \mathbf{c}_i \Delta t, t + \Delta t) = f_i(\mathbf{x}, t) - \frac{1}{\tau} \left( f_i(\mathbf{x}, t) - f_i^{(eq)}(\mathbf{x}, t) \right)',
      desc: 'Mesoscopic particle distribution function evolution describing kinetic collision and advection over discrete velocities.',
    },
    {
      title: 'Surface Momentum Exchange (Direct Force Integration)',
      latex: '\mathbf{F}_{\text{aero}} = \sum_{\mathbf{x} \in \text{boundary}} \sum_{i=1}^8 2 \mathbf{c}_i \left( f_i(\mathbf{x}_{\text{fluid}}, t) - f_{\bar{i}}(\mathbf{x}_{\text{fluid}}, t) \right)',
      desc: 'Computes total net aerodynamic force vector directly from momentum transfers during wall bounce-back collisions.',
    },
    {
      title: 'Dimensionless Drag and Lift Coefficients',
      latex: 'C_d = \frac{F_d}{\frac{1}{2} \rho v^2 A_{\text{ref}}}, \quad C_l = \frac{F_l}{\frac{1}{2} \rho v^2 A_{\text{ref}}}',
      desc: 'Normalizes aerodynamic forces against dynamic pressure q and frontal reference area A.',
    },
    {
      title: 'Reynolds Number',
      latex: '\text{Re} = \frac{\rho \cdot v \cdot L}{\mu} = \frac{v \cdot L}{\nu}',
      desc: 'Ratio of fluid inertial forces to viscous forces. Determines laminar vs turbulent wake separation regimes.',
    },
    {
      title: "Sutherland's Dynamic Viscosity Formula",
      latex: '\mu(T) = \mu_0 \left( \frac{T}{T_0} \right)^{3/2} \frac{T_0 + S}{T + S}',
      desc: 'Temperature-dependent dynamic viscosity for ideal gases (T_0 = 273.15 K, S = 110.4 K for air).',
    },
    {
      title: 'Speed of Sound & Incompressible Mach Limit',
      latex: 'a = \sqrt{\gamma R T}, \quad \text{Ma} = \frac{v}{a} \le 0.3',
      desc: 'Below Mach 0.3, air density variations remain under 5%, validating the incompressible flow solver.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="app-card w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Governing Aerodynamic Equations
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Theoretical foundation implemented in the CFD solver and readouts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="p-3.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
            <span>
              All displayed aerodynamic values are genuinely computed in real-time from the Lattice Boltzmann flow field using momentum exchange, rather than lookup tables.
            </span>
          </div>

          {equations.map((eq, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {eq.title}
              </h4>
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-x-auto text-center">
                <MathRenderer math={eq.latex} displayMode={true} className="text-slate-900 dark:text-slate-100" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {eq.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
