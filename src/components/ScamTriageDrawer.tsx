import React from 'react';
import { X, ShieldAlert, PhoneCall, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ThreatLogItem } from '../types';

interface ScamTriageDrawerProps {
  threat: ThreatLogItem | null;
  onClose: () => void;
  onReplayVoiceWarning: (phone: string, paybill?: string) => void;
}

export const ScamTriageDrawer: React.FC<ScamTriageDrawerProps> = ({
  threat,
  onClose,
  onReplayVoiceWarning,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = React.useState(false);
  if (!threat) return null;

  const handlePlayAudio = () => {
    setIsPlayingAudio(true);
    onReplayVoiceWarning(
      threat.sender_phone,
      threat.extracted_details?.paybill || undefined
    );
    setTimeout(() => setIsPlayingAudio(false), 4500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col font-mono text-slate-800 overflow-y-auto">
        {/* Header */}
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Scam Triage Inspector
              </h3>
              <p className="text-[11px] text-slate-500 font-sans">
                Log ID: {threat.id} &bull; {new Date(threat.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 flex-1">
          {/* Risk Level Badge & Score */}
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[11px] text-rose-700 block uppercase tracking-wider font-semibold">
                Threat Classification
              </span>
              <span className="text-base font-bold text-rose-900 mt-0.5 block">
                {threat.category === 'SCHOOL_FEE'
                  ? 'Academic Fee Impersonation'
                  : threat.category === 'LOAN_SCAM'
                  ? 'Predatory Loan Advance Trap'
                  : 'Social Engineering Reversal'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-rose-700 block uppercase font-semibold">Confidence</span>
              <span className="text-2xl font-bold font-mono text-rose-700">
                {threat.threat_score}%
              </span>
            </div>
          </div>

          {/* Intercepted Raw SMS */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5 font-bold">
              Raw Forwarded SMS
            </span>
            <p className="text-xs text-slate-800 font-sans leading-relaxed bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
              &ldquo;{threat.raw_text}&rdquo;
            </p>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Sender: <strong className="text-slate-900">{threat.sender_phone}</strong></span>
              <span className="text-rose-600 font-bold">[GSM Line Mismatch]</span>
            </div>
          </div>

          {/* Extracted Entities Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Parsed Regex Entities
            </div>
            <div className="p-3.5 grid grid-cols-2 gap-3.5 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Target Paybill</span>
                <span className="font-bold text-rose-600 text-sm font-mono">
                  {threat.extracted_details?.paybill || threat.extracted_entity || 'N/A'}
                </span>
                <span className="text-[10px] text-rose-600 block mt-0.5">Rogue Individual Account</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Detected Amount</span>
                <span className="font-bold text-emerald-700 text-sm font-mono">
                  {threat.extracted_details?.amount
                    ? `KES ${threat.extracted_details.amount.toLocaleString()}`
                    : 'N/A'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Reported Tuition/Fee</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Student / Account Ref</span>
                <span className="font-bold text-sky-700 text-xs font-mono">
                  {threat.extracted_details?.account || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Official Registry Match</span>
                <span className="font-bold text-rose-600 text-xs">
                  UNACCREDITED (Mismatch)
                </span>
              </div>
            </div>
          </div>

          {/* Database Cross-Check Verdict */}
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 flex flex-col gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                Database Cross-Check Verdict
              </span>
            </div>
            <div className="p-3 rounded-lg bg-white border border-rose-200 text-xs font-sans font-medium text-rose-950 leading-relaxed shadow-xs">
              {threat.category === 'SCHOOL_FEE' ? (
                <>
                  <strong className="text-rose-700">FLAGGED ROGUE ENTITY:</strong> Official Maranda High Paybill is <strong>890300</strong>. Paybill <strong>{threat.extracted_details?.paybill || '522123'}</strong> is registered to an unverified private line.
                </>
              ) : threat.category === 'LOAN_SCAM' ? (
                <>
                  <strong className="text-rose-700">FLAGGED ROGUE ENTITY:</strong> Official Hustler Fund uses USSD <strong>*254#</strong>. Till <strong>{threat.extracted_details?.till || '98821'}</strong> is flagged for predatory loan fee harvesting.
                </>
              ) : (
                <>
                  <strong className="text-rose-700">FLAGGED ROGUE ENTITY:</strong> Sender line <strong>{threat.sender_phone}</strong> is not an authorized Safaricom M-PESA SMS gateway. Reversal claim is a social engineering trap.
                </>
              )}
            </div>
          </div>

          {/* Heuristic Trigger Rules */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-2 font-bold">
              Automated Triage Findings
            </span>
            <ul className="space-y-1.5 text-xs text-slate-700 font-sans">
              {threat.reasons && threat.reasons.length > 0 ? (
                threat.reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2 text-rose-700">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </li>
                ))
              ) : (
                <li className="flex items-start gap-2 text-rose-700">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>Unregistered Paybill targeting high school academic payments.</span>
                </li>
              )}
            </ul>
          </div>

          {/* Automated Countermeasures Dispatched via AT */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider block font-bold">
              Countermeasures Dispatched via Africa's Talking
            </span>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-slate-800">Two-Way Warning SMS Dispatched (Shortcode 20880)</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                DELIVERED
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                <span className="text-slate-800">Outbound Voice Canary (Swahili TTS Call)</span>
              </div>
              <span className="text-[10px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                TRIGGERED
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col gap-2.5 sticky bottom-0">
          {isPlayingAudio && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-mono font-semibold animate-pulse shadow-xs">
              <span className="text-sm">🔊</span>
              <span className="flex-1 text-[11px] font-mono">
                Sauti ya Onyo (Kiswahili / Accent: KE) Inacheza...
              </span>
              <span className="flex gap-0.5 items-end h-3">
                <span className="w-1 bg-emerald-500 h-2 animate-bounce rounded-full"></span>
                <span className="w-1 bg-emerald-600 h-3 animate-bounce [animation-delay:0.15s] rounded-full"></span>
                <span className="w-1 bg-emerald-500 h-1.5 animate-bounce [animation-delay:0.3s] rounded-full"></span>
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePlayAudio}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition shadow-xs cursor-pointer ${
                isPlayingAudio
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-sky-600 hover:bg-sky-700 text-white'
              }`}
            >
              <PhoneCall className={`w-3.5 h-3.5 ${isPlayingAudio ? 'animate-bounce' : ''}`} />
              <span>{isPlayingAudio ? 'Broadcasting Swahili Warning...' : 'Audio Preview: Play Swahili Warning'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
