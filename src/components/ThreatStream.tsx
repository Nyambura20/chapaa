import React, { useState } from 'react';
import { MessageSquareWarning, ShieldAlert, AlertTriangle, ExternalLink, Check, MoreHorizontal } from 'lucide-react';
import { ThreatLogItem } from '../types';
import { KENYA_HOTSPOTS, KENYA_SVG_PATH } from '../utils/kenyaGeo';

interface ThreatStreamProps {
  threats: ThreatLogItem[];
  onSelectThreat: (threat: ThreatLogItem) => void;
}

export const ThreatStream: React.FC<ThreatStreamProps> = ({ threats, onSelectThreat }) => {
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);

  const maskPhone = (phone: string) => {
    if (!phone) return '+254 718 *** 412';
    if (phone.length < 8) return phone;
    return phone.slice(0, 6) + ' *** ' + phone.slice(-3);
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'SCHOOL_FEE':
        return {
          label: 'Paybill Mismatch',
          sub: 'Keyword Detected',
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        };
      case 'LOAN_SCAM':
        return {
          label: 'Advance Loan Trap',
          sub: 'Illegal Fee',
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        };
      case 'FAKE_REVERSAL':
        return {
          label: 'Fake Reversal',
          sub: 'Social Eng.',
          bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
        };
      default:
        return {
          label: 'Verified Entity',
          sub: 'Safe Route',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        };
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Threat Feed Header & Threat Map Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Left pane: Inbound SMS Feed */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 shadow-lg flex flex-col h-[340px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquareWarning className="w-4 h-4 text-rose-400" />
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                Live Threat Intelligence Stream
              </h2>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span>AT Inbound SMS</span>
              <MoreHorizontal className="w-3.5 h-3.5 text-slate-500 ml-1" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1 pb-1">
            <span>SMS Message</span>
            <span>Heuristic Triage</span>
          </div>

          {/* Scrolling Inbound messages list */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 custom-scrollbar">
            {threats.map((item) => {
              const badge = getCategoryBadge(item.category);
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectThreat(item)}
                  className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/90 hover:border-rose-500/60 transition cursor-pointer group hover:bg-slate-950"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 overflow-hidden">
                      <div className="mt-0.5 p-1 rounded bg-rose-500/20 text-rose-400 shrink-0">
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-slate-200">
                            {maskPhone(item.sender_phone)}
                          </span>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans line-clamp-2 mt-0.5 group-hover:text-slate-200 transition">
                          {item.raw_text}
                        </p>
                      </div>
                    </div>

                    {/* Threat Score & Badge */}
                    <div className="flex flex-col items-end shrink-0">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${badge.bg}`}>
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>{badge.label}</span>
                      </span>
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[9px] text-slate-400 font-mono">Risk:</span>
                        <span className={`text-[11px] font-bold font-mono ${item.threat_score >= 80 ? 'text-rose-400' : 'text-amber-400'}`}>
                          {item.threat_score}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right pane: Threat Map (Hotspots over Kenya / East Africa) */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 shadow-lg flex flex-col h-[340px] relative overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-400" />
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                Threat Map
              </h2>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping"></span>
              <span>8 Active Hotspots</span>
              <MoreHorizontal className="w-3.5 h-3.5 text-slate-500 ml-1" />
            </div>
          </div>

          {/* SVG Map of Kenya with Glowing Hotspot Nodes */}
          <div className="relative flex-1 rounded-lg bg-slate-950/90 border border-slate-800/80 overflow-hidden flex items-center justify-center">
            <svg viewBox="0 0 500 550" className="w-full h-full">
              {/* Regional base outline */}
              <path
                d={KENYA_SVG_PATH}
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="2"
                className="drop-shadow-lg"
              />

              {/* Grid guide lines */}
              <line x1="100" y1="200" x2="400" y2="200" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="100" y1="350" x2="400" y2="350" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="250" y1="50" x2="250" y2="480" stroke="#1e293b" strokeDasharray="3 3" />

              {/* Dynamic threat nodes */}
              {KENYA_HOTSPOTS.map((spot) => {
                const cx = (spot.x * 500) / 100;
                const cy = (spot.y * 550) / 100;
                const isSelected = selectedHotspot === spot.id;
                return (
                  <g
                    key={spot.id}
                    transform={`translate(${cx}, ${cy})`}
                    className="cursor-pointer group"
                    onClick={() => setSelectedHotspot(spot.id)}
                  >
                    {/* Pulsing ring */}
                    <circle
                      r={spot.severity === 'CRITICAL' ? '14' : '10'}
                      fill={spot.severity === 'CRITICAL' ? '#f43f5e' : '#f97316'}
                      fillOpacity="0.3"
                      className="animate-ping"
                    />
                    {/* Solid node */}
                    <circle
                      r={spot.severity === 'CRITICAL' ? '6' : '4.5'}
                      fill={spot.severity === 'CRITICAL' ? '#f43f5e' : '#f97316'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    {/* Node label */}
                    <text
                      x="9"
                      y="4"
                      fill={isSelected ? '#ffffff' : '#cbd5e1'}
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                      className="drop-shadow"
                    >
                      {spot.name} ({spot.threatCount})
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Selected Hotspot Float Info */}
            {selectedHotspot && (
              <div className="absolute top-2 left-2 right-2 p-2 rounded bg-slate-900/95 border border-slate-700 text-[11px] font-mono text-slate-200 z-10 shadow-lg flex items-center justify-between">
                <div>
                  <span className="text-orange-400 font-bold">
                    {KENYA_HOTSPOTS.find((h) => h.id === selectedHotspot)?.name}
                  </span>
                  : {KENYA_HOTSPOTS.find((h) => h.id === selectedHotspot)?.lastScam}
                </div>
                <button
                  onClick={() => setSelectedHotspot(null)}
                  className="text-slate-400 hover:text-white px-1 font-bold"
                >
                  &times;
                </button>
              </div>
            )}

            <div className="absolute bottom-1.5 left-2 flex items-center gap-1 text-[9px] text-slate-500 font-sans">
              <span className="font-bold text-slate-400">mapbox</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Unified Chapaa-Guard & Distributed QoS Auditor (Bottom Table) */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 shadow-lg">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
              Unified Chapaa-Guard &amp; Distributed QoS Auditor
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Recent Failures &amp; Gateway Settings</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                <th className="py-1.5 px-2">Device</th>
                <th className="py-1.5 px-2">Connection Status</th>
                <th className="py-1.5 px-2 text-right">Gateway Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="py-2 px-2 text-slate-200 font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Infinix mobility X692-OL (Changamwe)
                </td>
                <td className="py-2 px-2">
                  <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 text-[10px]">
                    <Check className="w-3 h-3" /> Online (-78 dBm)
                  </span>
                </td>
                <td className="py-2 px-2 text-right text-slate-300">
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">
                    AT SMS/Voice Hook: 20880
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2 px-2 text-slate-200 font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Samsung A55x (Bamburi Ward)
                </td>
                <td className="py-2 px-2">
                  <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 text-[10px]">
                    <Check className="w-3 h-3" /> Online (-82 dBm)
                  </span>
                </td>
                <td className="py-2 px-2 text-right text-slate-300">
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">
                    CA Threshold Sync: Active
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
