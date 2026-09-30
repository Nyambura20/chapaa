import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { ProbeDevice } from '../types';

interface CanariesViewProps {
  probes: ProbeDevice[];
  onTriggerPing?: (deviceModel: string) => void;
}

export const CanariesView: React.FC<CanariesViewProps> = ({ probes, onTriggerPing }) => {
  const { t } = useLang();
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
            <span>{t.pageCanaries}</span>
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            {t.pageCanariesHint}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{probes.length} reporting</span>
          </span>
        </div>
      </div>

      {pulseSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-center gap-2 shadow-xs animate-in fade-in duration-200 font-sans font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{pulseSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {probes.length === 0 && (
          <p className="text-xs text-slate-500 font-sans md:col-span-2">
            No telemetry has been stored yet.
          </p>
        )}
        {probes.map((probe) => (
        <div key={probe.id} className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col gap-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{probe.model}</h3>
                <span className="text-xs text-slate-500 font-sans">Ward: {probe.ward}</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {probe.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Signal RSSI</span>
              <span className="text-sky-700 font-bold text-sm font-mono">{probe.signal_dbm} dBm</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Ping Latency</span>
              <span className="text-emerald-700 font-bold text-sm font-mono">{probe.ping_ms} ms</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-sans">Last ping {probe.lastPing}</p>
          <button
            onClick={() => handlePulse(probe.model)}
            className="py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{t.sendPing}</span>
          </button>
        </div>
        ))}
      </div>
    </div>
  );
};
