import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Radio,
  Wifi,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Signal,
  MapPin,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { ProbeDevice } from '../types';

const KenyaLeafletMap = dynamic(
  () => import('../components/KenyaLeafletMap').then((mod) => mod.KenyaLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full rounded-xl bg-slate-100 border border-slate-200 animate-pulse" style={{ height: '480px' }} />
    ),
  }
);

interface QosViewProps {
  probes: ProbeDevice[];
  onTriggerPing?: (deviceModel: string) => void;
}

export const QosView: React.FC<QosViewProps> = ({ probes, onTriggerPing }) => {
  const [selectedProbe, setSelectedProbe] = useState<ProbeDevice | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualPing = (model: string) => {
    setIsRefreshing(true);
    if (onTriggerPing) onTriggerPing(model);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="flex flex-col gap-5 font-mono">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-5 h-5 text-sky-600" />
            <span>QoS Telemetry &amp; Dead-Zone Auditor</span>
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            Real-time physical Android hardware sentinels enforcing Communications Authority (CA) 90% QoS threshold
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>CA Kenya Compliance: <strong>99.4%</strong></span>
          </span>
          <button
            onClick={() => handleManualPing('Infinix mobility X692-GL')}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
            <span>Poll Canaries</span>
          </button>
        </div>
      </div>

      {/* Main Map + Side Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Full-featured Accurate Leaflet Map (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <KenyaLeafletMap
            probes={probes}
            onSelectProbe={(p) => setSelectedProbe(p)}
            height="520px"
          />

          {/* Quick Notice */}
          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between text-xs text-slate-600 font-sans">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-600" />
              <span>Map Focus: Mombasa (Changamwe / Bamburi / Likoni) &amp; Nairobi (Westlands / CBD)</span>
            </div>
            <span className="text-emerald-700 font-bold font-mono">WGS-84 Leaflet Engine</span>
          </div>
        </div>

        {/* Side Panel: Sentinel Probe Cards & Dead-Zones (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Active Hardware Sentinels ({probes.length})
          </div>

          {/* Device Cards */}
          {probes.map((probe) => (
            <div
              key={probe.id}
              onClick={() => setSelectedProbe(probe)}
              className={`p-4 rounded-xl border transition cursor-pointer flex flex-col gap-2.5 shadow-xs ${
                selectedProbe?.id === probe.id
                  ? 'bg-sky-50/70 border-2 border-sky-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-slate-900">{probe.model}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  {probe.status}
                </span>
              </div>

              <div className="text-xs text-slate-600 flex items-center justify-between">
                <span>Location: <strong className="text-slate-900">{probe.ward}</strong></span>
                <span>Carrier: <strong className="text-slate-900">{probe.carrier}</strong></span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Signal RSSI</span>
                  <span className="text-sky-700 font-bold text-sm font-mono">{probe.signal_dbm} dBm</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Ping Latency</span>
                  <span className="text-emerald-700 font-bold text-sm font-mono">{probe.ping_ms} ms</span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleManualPing(probe.model);
                }}
                className="mt-1 w-full py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sky-700 text-[11px] font-bold border border-slate-200 transition cursor-pointer"
              >
                Send Diagnostic Pulse
              </button>
            </div>
          ))}

          {/* Flagged Dead-Zone Alerts */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Flagged Dead-Zones</span>
              </span>
              <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-bold">1 Detected</span>
            </div>

            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs flex flex-col gap-1">
              <div className="flex items-center justify-between text-rose-900 font-bold">
                <span>Likoni Channel Handover</span>
                <span className="font-mono">-106 dBm</span>
              </div>
              <p className="text-[11px] text-slate-600 font-sans leading-relaxed">
                Cell edge packet drops exceed 14% during ferry congestion peak hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
