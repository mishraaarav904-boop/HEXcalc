import React from 'react';
import { X, Flame } from 'lucide-react';
import { MathRenderer } from '../MathRenderer';

interface ThermoMathModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThermoMathModal: React.FC<ThermoMathModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Governing Thermodynamics Equations</h2>
              <p className="text-xs text-zinc-400">Exact formulas implemented across the thermodynamics modules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-sm text-zinc-300">
          {/* Section 1: Real Gas & van der Waals */}
          <div className="space-y-2.5 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <h3 className="text-sm font-semibold text-cyan-400">1. Ideal Gas vs. van der Waals Equation of State</h3>
            <p className="text-xs text-zinc-400">
              The ideal gas law treats particles as non-interacting point masses. The van der Waals equation accounts for non-zero molecular volume (constant $b$) and long-range attractive forces (constant $a$):
            </p>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <MathRenderer math="\left( P + a \frac{n^2}{V^2} \right) (V - nb) = n R T" displayMode={true} />
            </div>
            <p className="text-xs text-zinc-400">
              Solving for pressure $P$ as an explicit function of molar volume $v_m = V / n$:
            </p>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <MathRenderer math="P = \frac{R T}{v_m - b} - \frac{a}{v_m^2}, \quad Z = \frac{P V}{n R T}" displayMode={true} />
            </div>
            <p className="text-xs text-zinc-400">
              The compressibility factor $Z$ measures departure from ideal gas behavior ($Z = 1.0$). At the critical point $(T_c, P_c, V_c)$:
            </p>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <MathRenderer math="a = \frac{27 R^2 T_c^2}{64 P_c}, \quad b = \frac{R T_c}{8 P_c}, \quad Z_c = \frac{3}{8} = 0.375" displayMode={true} />
            </div>
          </div>

          {/* Section 2: Thermodynamic Cycles */}
          <div className="space-y-2.5 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <h3 className="text-sm font-semibold text-amber-400">2. Thermodynamic Cycles & Thermal Efficiencies</h3>
            <p className="text-xs text-zinc-400">
              Thermal efficiency $\eta$ represents the net mechanical work produced per unit of heat absorbed from the high-temperature reservoir:
            </p>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <MathRenderer math="\eta = \frac{W_{\text{net}}}{Q_{\text{in}}} = 1 - \frac{Q_{\text{out}}}{Q_{\text{in}}}, \quad \eta_{\text{Carnot}} = 1 - \frac{T_L}{T_H}" displayMode={true} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                <span className="font-semibold text-zinc-200">Otto Cycle (Gasoline):</span>
                <MathRenderer math="\eta_{\text{Otto}} = 1 - \frac{1}{r^{\gamma - 1}}" displayMode={true} />
              </div>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                <span className="font-semibold text-zinc-200">Diesel Cycle (Compression Ignition):</span>
                <MathRenderer math="\eta_{\text{Diesel}} = 1 - \frac{1}{r^{\gamma - 1}} \left[ \frac{r_c^\gamma - 1}{\gamma(r_c - 1)} \right]" displayMode={true} />
              </div>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                <span className="font-semibold text-zinc-200">Brayton Cycle (Gas Turbine):</span>
                <MathRenderer math="\eta_{\text{Brayton}} = 1 - \frac{1}{r_p^{\frac{\gamma - 1}{\gamma}}}" displayMode={true} />
              </div>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                <span className="font-semibold text-zinc-200">Mean Effective Pressure (MEP):</span>
                <MathRenderer math="\text{MEP} = \frac{W_{\text{net}}}{V_{\text{max}} - V_{\text{min}}}" displayMode={true} />
              </div>
            </div>
          </div>

          {/* Section 3: 2D Heat Transfer */}
          <div className="space-y-2.5 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <h3 className="text-sm font-semibold text-rose-400">3. 2D Transient Heat Diffusion (Fourier's Law)</h3>
            <p className="text-xs text-zinc-400">
              Conduction heat flux vector q is governed by Fourier's law, and the transient temperature field obeys the diffusion partial differential equation:
            </p>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <MathRenderer math="\mathbf{q} = -k \nabla T = -k \left( \frac{\partial T}{\partial x} \hat{i} + \frac{\partial T}{\partial y} \hat{j} \right)" displayMode={true} />
            </div>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <MathRenderer math="\frac{\partial T}{\partial t} = \alpha \nabla^2 T = \alpha \left( \frac{\partial^2 T}{\partial x^2} + \frac{\partial^2 T}{\partial y^2} \right), \quad \alpha = \frac{k}{\rho c_p}" displayMode={true} />
            </div>
            <p className="text-xs text-zinc-400">
              The 5-point explicit finite-difference discretization is stable under the Von Neumann / CFL criterion:
            </p>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <MathRenderer math="T_{i,j}^{n+1} = T_{i,j}^n + \frac{\alpha \Delta t}{\Delta x^2} \left( T_{i+1,j}^n + T_{i-1,j}^n + T_{i,j+1}^n + T_{i,j-1}^n - 4 T_{i,j}^n \right), \quad \Delta t \le \frac{\Delta x^2}{4 \alpha_{\max}}" displayMode={true} />
            </div>
          </div>

          {/* Section 4: Phase Equilibria & Clausius-Clapeyron */}
          <div className="space-y-2.5 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <h3 className="text-sm font-semibold text-purple-400">4. Phase Equilibria & Clausius-Clapeyron Equation</h3>
            <p className="text-xs text-zinc-400">
              The slope of any phase boundary curve in the $(T, P)$ plane satisfies the Clausius-Clapeyron relation:
            </p>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <MathRenderer math="\frac{dP}{dT} = \frac{L}{T \Delta v} = \frac{\Delta H}{T (v_\beta - v_\alpha)}" displayMode={true} />
            </div>
            <p className="text-xs text-zinc-400">
              For liquid-vapor equilibrium where vapor volume is much greater than liquid volume and vapor obeys ideal gas behavior:
            </p>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <MathRenderer math="\ln\left(\frac{P_2}{P_1}\right) = -\frac{\Delta H_{\text{vap}}}{R} \left( \frac{1}{T_2} - \frac{1}{T_1} \right)" displayMode={true} />
            </div>
          </div>

          {/* Section 5: Kinetic Theory & Maxwell-Boltzmann */}
          <div className="space-y-2.5 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <h3 className="text-sm font-semibold text-emerald-400">5. Kinetic Theory of Gases & Maxwell-Boltzmann Distribution</h3>
            <p className="text-xs text-zinc-400">
              The velocity probability density function for classical gas molecules in thermal equilibrium at temperature $T$:
            </p>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <MathRenderer math="f(v) = 4\pi \left(\frac{m}{2\pi k_B T}\right)^{3/2} v^2 \exp\left(-\frac{m v^2}{2 k_B T}\right)" displayMode={true} />
            </div>
            <p className="text-xs text-zinc-400">
              Characteristic molecular speeds, equipartition of energy, and microscopic wall impulse pressure:
            </p>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <MathRenderer math="v_{\text{mp}} = \sqrt{\frac{2 k_B T}{m}}, \quad \bar{v} = \sqrt{\frac{8 k_B T}{\pi m}}, \quad v_{\text{rms}} = \sqrt{\frac{3 k_B T}{m}}, \quad P = \frac{1}{3} \frac{N}{V} m \langle v^2 \rangle" displayMode={true} />
            </div>
            <p className="text-xs text-zinc-400">
              Graham's Law of Effusion through an orifice:
            </p>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <MathRenderer math="\frac{\text{Rate}_1}{\text{Rate}_2} = \sqrt{\frac{M_2}{M_1}}, \quad \Delta S_{\text{mix}} = -n R \sum x_i \ln(x_i)" displayMode={true} />
            </div>
          </div>

          {/* Section 6: Psychrometrics & Moist Air */}
          <div className="space-y-2.5 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <h3 className="text-sm font-semibold text-cyan-400">6. Psychrometrics & Moist Air HVAC Enthalpy</h3>
            <p className="text-xs text-zinc-400">
              Humidity ratio $W$, relative humidity $\phi$, and moist air specific enthalpy $h$:
            </p>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <MathRenderer math="W = 0.62198 \frac{P_v}{P_{\text{atm}} - P_v}, \quad \phi = \frac{P_v}{P_{\text{sat}}(T)} \times 100\%" displayMode={true} />
            </div>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <MathRenderer math="h = 1.006 \, T_{\text{db}} + W \cdot (2501 + 1.86 \, T_{\text{db}}) \quad [\text{kJ / kg dry air}]" displayMode={true} />
            </div>
            <p className="text-xs text-zinc-400">
              Condensate water removal rate in cooling/dehumidification coil:
            </p>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <MathRenderer math="\dot{m}_{\text{condensate}} = \dot{m}_{\text{dry air}} (W_{\text{in}} - W_{\text{out}}), \quad \text{SHR} = \frac{\dot{Q}_{\text{sensible}}}{\dot{Q}_{\text{total}}}" displayMode={true} />
            </div>
          </div>

          {/* Section 7: Stirling Engine Cycle */}
          <div className="space-y-2.5 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <h3 className="text-sm font-semibold text-amber-400">7. Stirling Regenerative Cycle & Shaft Power</h3>
            <p className="text-xs text-zinc-400">
              Ideal indicated work per cycle and thermal efficiency with regenerator effectiveness &epsilon;<sub>reg</sub>:
            </p>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <MathRenderer math="W_{\text{net}} = \oint P dV = n R (T_H - T_C) \ln(r)" displayMode={true} />
            </div>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <MathRenderer math="\eta_{\text{th}} = \frac{n R (T_H - T_C) \ln(r)}{n R T_H \ln(r) + (1 - \epsilon_{\text{reg}}) n C_v (T_H - T_C)}, \quad \dot{W}_{\text{brake}} = \tau \cdot \left(\frac{2\pi \cdot \text{RPM}}{60}\right)" displayMode={true} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
          >
            Close Math Guide
          </button>
        </div>
      </div>
    </div>
  );
};
