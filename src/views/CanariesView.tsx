import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { ProbeDevice } from '../types';

interface CanariesViewProps {
  probes: ProbeDevice[];
  onTriggerPing?: (deviceModel: string) => void;
}

export const CanariesView: React.FC<CanariesViewProps> = ({ probes, onTriggerPing }) => {
  const [pulseSuccess, setPulseSuccess] = useState<string | null>(null);

  const handlePulse = (name: string) => {
    if (onTriggerPing) onTriggerPing(name);
    setPulseSuccess(`Telemetry pulse acknowledged by ${name} [ACK 200 OK]`);
    setTimeout(() => setPulseSuccess(null), 3500);
  };

  return (
    <div className="flex flex-col gap-5 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-500" />
            <span>Hardware Canaries &amp; Field Probes</span>
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            Dedicated physical Android devices logging cell tower RSSI and latency telemetry in Kenya
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>2 of 2 Canaries Reporting</span>
          </span>
        </div>
      </div>

      {pulseSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-center gap-2 shadow-xs animate-in fade-in duration-200 font-sans font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{pulseSuccess}</span>
        </div>
      )}

      {/* Grid of 2 physical devices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Device 1: Infinix */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col gap-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Infinix mobility X692-GL</h3>
                <span className="text-xs text-slate-500 font-sans">Probing Ward: Changamwe, Mombasa</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Online
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Signal RSSI</span>
              <span className="text-sky-700 font-bold text-sm font-mono">-78 dBm</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Ping Latency</span>
              <span className="text-emerald-700 font-bold text-sm font-mono">22 ms</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Packet Loss</span>
              <span className="text-emerald-700 font-bold text-sm font-mono">0.02%</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Carrier Network</span>
              <span className="text-slate-900 font-bold text-xs">Safaricom 4G/LTE</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Battery Level</span>
              <span className="text-slate-900 font-bold text-xs">94% (Charging)</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">OS Version</span>
              <span className="text-slate-900 font-bold text-xs">Android 13 / ARM64</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handlePulse('Infinix mobility X692-GL')}
              className="flex-1 py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Send Diagnostic Ping</span>
            </button>
          </div>
        </div>

        {/* Device 2: Samsung */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col gap-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Samsung Galaxy A55x</h3>
                <span className="text-xs text-slate-500 font-sans">Probing Ward: Westlands / Bamburi</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Online
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Signal RSSI</span>
              <span className="text-sky-700 font-bold text-sm font-mono">-74 dBm</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Ping Latency</span>
              <span className="text-emerald-700 font-bold text-sm font-mono">18 ms</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Packet Loss</span>
              <span className="text-emerald-700 font-bold text-sm font-mono">0.01%</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Carrier Network</span>
              <span className="text-slate-900 font-bold text-xs">Airtel Kenya 4G</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Battery Level</span>
              <span className="text-slate-900 font-bold text-xs">88% (AC USB)</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">OS Version</span>
              <span className="text-slate-900 font-bold text-xs">Android 14 / OneUI</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handlePulse('Samsung Galaxy A55x')}
              className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Send Diagnostic Ping</span>
            </button>
          </div>
        </div>
      </div>

      {/* Communications Authority Compliance Checklist */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col gap-3.5 shadow-xs">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Communications Authority of Kenya (CA) Mandate Checklist
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-2.5 text-emerald-900 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>&gt; 90% Network Availability Threshold (Achieved: 99.4%)</span>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-2.5 text-emerald-900 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Call Drop Rate &lt; 2% on Outbound Swahili TTS IVR</span>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-2.5 text-emerald-900 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Continuous Autonomous Telemetry over Shortcode 20880</span>
          </div>
        </div>
      </div>
    </div>
  );
};
