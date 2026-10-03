/**
 * Device Screen Fit & Model Inspector Modal
 * Displays real-time detected device model, screen resolution,
 * pixel density, notch/safe-area metrics, and allows switching simulated device viewports.
 */

import React from 'react';
import {
  Smartphone,
  Check,
  Maximize2,
  X,
  Gauge,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  DeviceInfo,
  SimulatedDevice,
  SIMULATED_DEVICES,
} from '../hooks/useDeviceScreen';

interface DeviceScreenFitModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceInfo: DeviceInfo;
  activeSimulation: SimulatedDevice;
  onSelectSimulation: (device: SimulatedDevice) => void;
}

export const DeviceScreenFitModal: React.FC<DeviceScreenFitModalProps> = ({
  isOpen,
  onClose,
  deviceInfo,
  activeSimulation,
  onSelectSimulation,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Mobile Screen Fit Engine</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Active
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Auto-detects phone model & screen specs for 100% responsive fit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Detected Real Hardware Card */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                <span>Detected Device Hardware</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {deviceInfo.isMobile ? 'Mobile Phone' : 'Desktop / Tablet Browser'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Model / Platform
                </span>
                <span className="font-bold text-slate-100 truncate block mt-0.5" title={deviceInfo.modelName}>
                  {deviceInfo.modelName}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Viewport Dimension
                </span>
                <span className="font-bold text-slate-100 font-mono block mt-0.5">
                  {deviceInfo.viewportWidth} × {deviceInfo.viewportHeight} px
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Pixel Ratio (DPR)
                </span>
                <span className="font-bold text-slate-100 font-mono block mt-0.5">
                  @{deviceInfo.devicePixelRatio}x ({deviceInfo.devicePixelRatio >= 3 ? 'Super Retina' : deviceInfo.devicePixelRatio >= 2 ? 'Retina' : 'Standard'})
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Touch & Notch Status
                </span>
                <span className="font-bold text-slate-100 block mt-0.5">
                  {deviceInfo.isTouch ? 'Touch Enabled' : 'Pointer/Mouse'} · {deviceInfo.hasNotch ? 'Notch/Island' : 'Standard'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1 border-t border-slate-900">
              <Info className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>
                Screen Category: <strong className="text-white capitalize">{deviceInfo.screenCategory}</strong> · UI automatically scales font sizes & touch targets.
              </span>
            </div>
          </div>

          {/* Device Model Fit Selector (for testing or customization) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Screen Fit Viewport Presets</span>
              </label>
              <span className="text-[10px] text-slate-400">
                {activeSimulation === 'auto' ? 'Auto-Adapting to Screen' : 'Simulating Model'}
              </span>
            </div>

            <div className="space-y-1.5">
              {(Object.keys(SIMULATED_DEVICES) as SimulatedDevice[]).map((key) => {
                const conf = SIMULATED_DEVICES[key];
                const isSelected = activeSimulation === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectSimulation(key)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-xs'
                        : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-900 text-slate-500'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">
                          {conf.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {key === 'auto'
                            ? `Detected Native: ${deviceInfo.viewportWidth}×${deviceInfo.viewportHeight}`
                            : `${conf.width} × ${conf.height} px · @${conf.dpr}x ${conf.os}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isSelected ? (
                        <span className="p-1 rounded-full bg-emerald-500 text-slate-950">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-600">Select</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visual Responsive Scaling Note */}
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="text-[11px] leading-relaxed">
              On actual mobile phones (Android & iOS), the app automatically runs in <strong>100% full-width native responsive fit</strong> with zero letterboxing and ergonomic touch safe-areas.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={() => onSelectSimulation('auto')}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Reset to Auto-Detect</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
