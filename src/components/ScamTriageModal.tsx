import React from 'react';
import { X, ShieldAlert, PhoneCall, MessageSquare, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { ThreatLogItem } from '../types';

interface ScamTriageModalProps {
  threat: ThreatLogItem | null;
  onClose: () => void;
  onSimulateVoiceCall?: (phone: string, paybill?: string) => void;
}

export const ScamTriageModal: React.FC<ScamTriageModalProps> = ({
  threat,
  onClose,
  onSimulateVoiceCall,
}) => {
  if (!threat) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-black/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/80 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                Scam Triage Engine (Live Process)
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                  REAL-TIME INTERCEPTION
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Forwarded MSISDN: {threat.sender_phone} &bull; ID: {threat.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 text-xs font-mono">
          {/* Heuristic Triage Score Bar matching wireframe */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-300 font-bold uppercase tracking-wider">
                Heuristic Triage Score
              </span>
              <span className="text-rose-400 font-bold text-sm">
                {threat.threat_score}% (CRITICAL DEFENSE)
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-950 p-0.5 border border-slate-800 relative">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-500"
                style={{ width: `${threat.threat_score}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 mt-1">
              <span>0% (Legitimate)</span>
              <span>50% (Suspicious)</span>
              <span>100% (High Probability Scam)</span>
            </div>
          </div>

          {/* Intercepted Raw SMS */}
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              Intercepted SMS Message Content
            </span>
            <p className="mt-1 text-slate-200 font-sans text-xs leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              &ldquo;{threat.raw_text}&rdquo;
            </p>
          </div>

          {/* Extracted Regex Entities */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase">Extracted Paybill</span>
              <span className="text-rose-400 font-bold text-sm">
                {threat.extracted_details?.paybill || threat.extracted_entity || 'N/A'}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase">Detected Amount</span>
              <span className="text-emerald-400 font-bold text-sm">
                {threat.extracted_details?.amount
                  ? `KES ${threat.extracted_details.amount.toLocaleString()}`
                  : 'N/A'}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase">Account Ref</span>
              <span className="text-sky-400 font-bold text-sm truncate block">
                {threat.extracted_details?.account || 'N/A'}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase">Entity Status</span>
              <span className="text-rose-400 font-bold text-xs truncate block">
                [UNVERIFIED PAYBILL]
              </span>
            </div>
          </div>

          {/* Rule Reasons list */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Fraud Detection Heuristic Triggers
            </span>
            <ul className="space-y-1 text-[11px] text-slate-300">
              {threat.reasons && threat.reasons.length > 0 ? (
                threat.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-rose-300">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))
              ) : (
                <li className="flex items-center gap-1.5 text-rose-300">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                  <span>CRITICAL: Unregistered Paybill detected targeting school fee payments.</span>
                </li>
              )}
            </ul>
          </div>

          {/* Automatic Actions Dispatched via Africa's Talking */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col gap-2">
            <span className="text-[10px] text-slate-300 uppercase tracking-wider font-bold">
              Automated Countermeasures Dispatched
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-700/80 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold text-[11px]">Warning SMS Sent</p>
                  <p className="text-[9px] text-slate-400">Via AT SMS Shortcode 20880</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-700/80 text-sky-400">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <p className="font-bold text-[11px]">IVR Triggered</p>
                  <p className="text-[9px] text-slate-400">Swahili TTS Outbound Call</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-950 border-t border-slate-800">
          <button
            onClick={() => {
              if (onSimulateVoiceCall) {
                onSimulateVoiceCall(threat.sender_phone, threat.extracted_details?.paybill || undefined);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold transition shadow"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Replay Outbound Swahili Warning Call</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
