import React, { useState } from 'react';
import { Radio, Wifi, Zap, Plus, Minus, Info, CheckCircle2 } from 'lucide-react';
import { ProbeDevice } from '../types';
import { KENYA_SVG_PATH } from '../utils/kenyaGeo';

interface QosAuditorProps {
  probes: ProbeDevice[];
  onTriggerPing?: (device: string) => void;
}

export const QosAuditor: React.FC<QosAuditorProps> = ({ probes }) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedWard, setSelectedWard] = useState<string>('Changamwe');

  // Sparkline ping frequencies (12:00, 15:00, 16:00, 10:00, 08:00, 11:00)
  const latencyBars = [
    { time: '12:00', value: 78, ping: 22, height: '55%' },
    { time: '13:00', value: 85, ping: 24, height: '62%' },
    { time: '14:00', value: 92, ping: 26, height: '70%' },
    { time: '15:00', value: 110, ping: 31, height: '85%' },
    { time: '16:00', value: 125, ping: 35, height: '94%' },
    { time: '17:00', value: 95, ping: 28, height: '72%' },
    { time: '18:00', value: 88, ping: 25, height: '68%' },
    { time: '10:00', value: 118, ping: 32, height: '88%' },
    { time: '08:00', value: 130, ping: 36, height: '98%' },
    { time: '09:00', value: 104, ping: 29, height: '80%' },
    { time: '11:00', value: 96, ping: 27, height: '74%' },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* 1. QoS Auditor Header & Kenya Signal Heatmap Card */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
              QoS Auditor: Device Signal Heatmap
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-800/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              CA Kenya
            </span>
          </div>
        </div>

        {/* Heatmap canvas container */}
        <div className="relative w-full h-44 rounded-lg bg-slate-950/90 border border-slate-800/80 overflow-hidden flex items-center justify-center">
          {/* Zoom controls */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              className="w-5 h-5 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold transition shadow"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
              className="w-5 h-5 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold transition shadow"
            >
              <Minus className="w-3 h-3" />
            </button>
          </div>

          {/* Signal Legend Bar */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-[10px] font-mono z-10">
            <span className="text-slate-400">Signal</span>
            <div className="w-16 h-2 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-500"></div>
            <span className="text-slate-200 font-bold">60</span>
          </div>

          {/* Kenya Heatmap SVG representation */}
          <svg
            viewBox="0 0 500 550"
            className="w-full h-full transition-transform duration-300"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <defs>
              {/* Radial heat gradient over Coastal Mombasa & Nairobi */}
              <radialGradient id="coastHeat" cx="68%" cy="84%" r="35%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.85" />
                <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.75" />
                <stop offset="70%" stopColor="#10b981" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.2" />
              </radialGradient>
              <radialGradient id="riftHeat" cx="44%" cy="60%" r="28%">
                <stop offset="0%" stopColor="#eab308" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#10b981" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#047857" stopOpacity="0.1" />
              </radialGradient>
            </defs>

            {/* Base Kenya Boundary outline */}
            <path
              d={KENYA_SVG_PATH}
              fill="#064e3b"
              fillOpacity="0.6"
              stroke="#10b981"
              strokeWidth="2.5"
              className="drop-shadow"
            />

            {/* Heatmap overlay layers */}
            <path
              d={KENYA_SVG_PATH}
              fill="url(#coastHeat)"
              style={{ mixBlendMode: 'screen' }}
            />
            <path
              d={KENYA_SVG_PATH}
              fill="url(#riftHeat)"
              style={{ mixBlendMode: 'color-dodge' }}
            />

            {/* Probe 1 marker (Mombasa Changamwe) */}
            <g transform="translate(340, 465)" className="cursor-pointer" onClick={() => setSelectedWard('Changamwe')}>
              <circle r="12" fill="#10b981" fillOpacity="0.25" className="animate-ping" />
              <circle r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
              <text x="8" y="4" fill="#a7f3d0" fontSize="11" fontWeight="bold" fontFamily="monospace">
                Infinix (Changamwe)
              </text>
            </g>

            {/* Probe 2 marker (Mombasa Bamburi) */}
            <g transform="translate(360, 440)" className="cursor-pointer" onClick={() => setSelectedWard('Bamburi')}>
              <circle r="10" fill="#38bdf8" fillOpacity="0.25" className="animate-ping" />
              <circle r="4.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
              <text x="8" y="3" fill="#bae6fd" fontSize="10" fontWeight="bold" fontFamily="monospace">
                Samsung (Bamburi)
              </text>
            </g>

            {/* Nairobi Central Gateway */}
            <g transform="translate(240, 340)">
              <circle r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
              <text x="8" y="3" fill="#fde68a" fontSize="10" fontFamily="monospace">
                Nairobi Cell Hub
              </text>
            </g>
          </svg>

          {/* Mapbox attribution watermark style matching mockup */}
          <div className="absolute bottom-1.5 left-2 flex items-center gap-1 text-[9px] text-slate-500 font-sans">
            <span className="font-bold text-slate-400">mapbox</span>
          </div>
          <div className="absolute bottom-1.5 right-2">
            <Info className="w-3 h-3 text-slate-500 hover:text-slate-300 cursor-pointer" />
          </div>
        </div>

        {/* 2. Hardware Sentinels Cards */}
        <div className="mt-3 flex flex-col gap-2">
          {probes.map((probe, idx) => (
            <div
              key={probe.id}
              onClick={() => setSelectedWard(probe.ward)}
              className={`p-2.5 rounded-lg border transition cursor-pointer ${
                selectedWard === probe.ward
                  ? 'bg-slate-800/80 border-sky-500/60 shadow-md shadow-sky-950/20'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-xs font-bold text-white font-mono">{probe.model}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-medium">
                  <Wifi className="w-3 h-3" />
                  <span>Signal Probe</span>
                  <span>&bull;</span>
                  <span className="text-emerald-300 font-bold">{probe.status}</span>
                </div>
              </div>

              <div className="mt-1 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                <span>Probing Ward: <strong className="text-slate-200">{probe.ward}</strong></span>
                <span className="text-slate-300">{probe.signal_dbm} dBm ({probe.ping_ms}ms)</span>
              </div>

              <div className="mt-1.5 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-300 bg-slate-900/90 px-2 py-1 rounded border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Signal Pings:</span>
                  <span className="text-sky-400 font-bold">{idx === 0 ? '22%' : '27%'} +32 ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Packet Loss:</span>
                  <span className="text-emerald-400 font-bold">{idx === 0 ? '17% +42 ms' : '27% +38 ms'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Device Status & Pings (Sparkline bar chart from 12:00 to 11:00) */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Device Status &amp; Pings
            </h3>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-sky-400">
            <span>Signal</span>
            <span className="flex items-end gap-0.5 h-3">
              <span className="w-1 h-1.5 bg-sky-400 rounded-xs"></span>
              <span className="w-1 h-2.5 bg-sky-400 rounded-xs"></span>
              <span className="w-1 h-3 bg-sky-400 rounded-xs"></span>
            </span>
          </div>
        </div>

        {/* Sparkline Histogram chart */}
        <div className="pt-2 pb-1">
          <div className="flex items-baseline justify-between text-[9px] font-mono text-slate-500 mb-1 px-1">
            <span>150</span>
            <span>100</span>
            <span>50</span>
            <span>0</span>
          </div>
          <div className="h-16 w-full flex items-end gap-1.5 px-1 py-1 rounded bg-slate-950/80 border border-slate-800/60">
            {latencyBars.map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip on hover */}
                <div className="absolute -top-7 hidden group-hover:flex flex-col items-center px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-white font-mono whitespace-nowrap z-20 border border-slate-700 shadow-md">
                  <span>{bar.time}: {bar.ping}ms ({bar.value} p/m)</span>
                </div>
                {/* Bar */}
                <div
                  className="w-full rounded-t-xs transition-all duration-300 group-hover:brightness-125"
                  style={{
                    height: bar.height,
                    background: i % 2 === 0
                      ? 'linear-gradient(to top, #0284c7, #38bdf8)'
                      : 'linear-gradient(to top, #059669, #34d399)',
                  }}
                ></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1 px-1">
            <span>12:00</span>
            <span>15:00</span>
            <span>16:00</span>
            <span>10:00</span>
            <span>08:00</span>
            <span>11:00</span>
          </div>
        </div>

        {/* Communications Authority Compliance Callout */}
        <div className="mt-3 p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>CA Kenya Mandate: <strong>99.4% QoS</strong></span>
          </div>
          <span className="text-[10px] text-emerald-400 bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-700/50">
            COMPLIANT
          </span>
        </div>
      </div>
    </div>
  );
};
