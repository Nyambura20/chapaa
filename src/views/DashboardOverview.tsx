import React, { useState } from 'react';
import {
  ShieldAlert,
  GraduationCap,
  Radio,
  TrendingUp,
  MessageSquareWarning,
  Sparkles,
  Send,
  CheckCircle2,
  ArrowRight,
  Volume2,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { ThreatLogItem, KpiMetrics, SimSwapRow } from '../types';
import { playAuthenticSwahiliWarning, playAlertChime } from '../utils/audio';

interface DashboardOverviewProps {
  metrics: KpiMetrics;
  threats: ThreatLogItem[];
  swaps: SimSwapRow[];
  onSelectThreat: (threat: ThreatLogItem) => void;
  onTriggerAttack: (text: string, phone: string) => Promise<any>;
  onNavigateToView: (view: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  metrics,
  threats,
  swaps,
  onSelectThreat,
  onTriggerAttack,
  onNavigateToView,
}) => {
  const { t } = useLang();
  // Attack Templates
  const templates = [
    {
      title: 'Maranda High School Fee Scam',
      badge: 'Paybill Impersonation',
      phone: '+254718392412',
      text: 'Dear Parent, pay KES 14,500 Term 3 fees to Paybill 522123 Acc 0178 MARANDA immediately to avoid student being sent home.',
    },
    {
      title: 'Predatory Loan Advance Trap',
      badge: 'Illegal Fee',
      phone: '+254722819200',
      text: 'CONGRATULATIONS! Your Hustler Fund loan of KES 50,000 is approved. Send KES 1,200 processing fee to Till 98821 to disburse now.',
    },
    {
      title: 'Fake M-Pesa Reversal',
      badge: 'Social Engineering',
      phone: '+254701988231',
      text: 'Confirmed. You have received Ksh 3,850 from MARY WANJIKU. Wait, I sent by mistake to wrong number, kindly reverse to 0701988231.',
    },
  ];

  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [customText, setCustomText] = useState(templates[0].text);
  const [customPhone, setCustomPhone] = useState(templates[0].phone);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSwahiliAlertPlaying, setIsSwahiliAlertPlaying] = useState(false);
  const [lastDispatchedAlert, setLastDispatchedAlert] = useState<{
    sms: string;
    dispatchMode: string;
  } | null>(null);

  const handleSelectTemplate = (idx: number) => {
    setSelectedTemplateIndex(idx);
    setCustomText(templates[idx].text);
    setCustomPhone(templates[idx].phone);
    setLastDispatchedAlert(null);
  };

  const handleRunSimulatedAttack = async () => {
    setIsSimulating(true);
    playAlertChime();
    try {
      const res = await onTriggerAttack(customText, customPhone);
      setLastDispatchedAlert({
        sms: res?.sms_dispatched || `[Chapaa-Alert] Paybill flagged. Two-way warning dispatched via AT Shortcode 20880.`,
        dispatchMode: res?.dispatch_mode || 'sandbox_simulator',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleTriggerSwahiliTTS = () => {
    setIsSwahiliAlertPlaying(true);
    playAuthenticSwahiliWarning(
      'Onyo la utapeli. Nambari ya Paybill uliyotumiwa sio ya shule husika. Usilipe pesa zozote.',
      () => setIsSwahiliAlertPlaying(true),
      () => setIsSwahiliAlertPlaying(false)
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-950">
        Demo path: score a scam SMS here, play the Swahili warning, then open SIM Swap.
        A number ending in 999 is a recent swap. Counts and the threat list come from the database.
      </div>
      {/* 1. TOP 4 HIGH-LEVEL KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* Card 1: Intercepted Smishing (Rose) */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm flex items-center justify-between group transition">
          <div>
            <span className="text-xs font-mono font-medium text-slate-500 block">
              {t.dashChecked}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {metrics.messagesChecked ?? metrics.scamsIntercepted}
              </span>
              {metrics.scamsTrend ? (
                <span className="text-xs font-mono font-semibold text-rose-600 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> {metrics.scamsTrend}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-1 block">
              Africa's Talking SMS Inbound
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: School Fee Scams Blocked (Amber) */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm flex items-center justify-between group transition">
          <div>
            <span className="text-xs font-mono font-medium text-slate-500 block">
              {t.dashLikely}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {metrics.likelyScams ?? metrics.schoolFeeBlocked}
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                {t.highPriority}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-1 block">
              Paybill Registry Cross-Check
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Telemetry Probes Online (Sky) */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm flex items-center justify-between group transition">
          <div>
            <span className="text-xs font-mono font-medium text-slate-500 block">
              {t.dashIdentity}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {metrics.simChecks ?? metrics.liveCanaries}
              </span>
              <span className="text-xs font-mono text-sky-600 font-medium">
                ({metrics.kycPassed ?? 0} {t.dashPassed})
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-1 block">
              Devices that have sent a ping
            </span>
          </div>
          <div className="p-3 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
            <Radio className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider">{t.dashSwaps}</h3>
        <p className="text-xs text-slate-500 mt-1">
          {metrics.simCompleted ?? 0} completed · {metrics.kycPassed ?? 0} {t.dashPassed}
          {metrics.suspicious ? ` · ${metrics.suspicious} ${t.askThem}` : ''}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {swaps.length === 0 && <p className="text-sm text-slate-500">{t.emptyChecks}</p>}
          {swaps.slice(0, 5).map((swap) => (
            <div key={swap.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
              <span className="font-mono font-bold">{swap.phone}</span>
              <span>{swap.kyc_status}</span>
              <span>{swap.status}</span>
              <span className="text-slate-500">{swap.channel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7 COLS): Live SMS Threat Stream */}
        <div className="lg:col-span-7 rounded-xl bg-white border border-slate-200/90 shadow-xs flex flex-col p-5">
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                <MessageSquareWarning className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
                  {t.dashStream}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {t.dashStreamHint}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateToView('threats')}
              className="text-xs font-mono font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition"
            >
              <span>{t.viewAll} ({threats.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Compact Threat List */}
          <div className="flex flex-col gap-2.5 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
            {threats.length === 0 && (
              <p className="text-xs text-slate-500 font-sans">
                {t.emptyChecks}
              </p>
            )}
            {threats.slice(0, 5).map((threat) => (
              <div
                key={threat.id}
                onClick={() => onSelectThreat(threat)}
                className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/90 hover:border-sky-300 hover:bg-white hover:shadow-xs transition cursor-pointer group flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {threat.sender_phone}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {new Date(threat.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      threat.verdict === 'NO_RED_FLAGS_FOUND'
                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                        : threat.threat_score >= 80
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {threat.verdict || `Risk: ${threat.threat_score}%`}
                  </span>
                </div>

                <p className="text-xs text-slate-700 font-sans line-clamp-2 group-hover:text-slate-900 transition leading-relaxed">
                  {threat.raw_text}
                </p>

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-[10px] font-mono text-slate-500">
                  <div className="flex items-center gap-3">
                    <span>
                      Paybill:{' '}
                      <strong className="text-rose-600 font-bold">
                        {threat.extracted_details?.paybill || threat.extracted_entity}
                      </strong>
                    </span>
                    {threat.extracted_details?.amount && (
                      <span>
                        Amount:{' '}
                        <strong className="text-emerald-700 font-bold">
                          KES {threat.extracted_details.amount.toLocaleString()}
                        </strong>
                      </span>
                    )}
                  </div>
                  <span className="text-sky-600 font-semibold group-hover:underline flex items-center gap-0.5">
                    Inspect Triage &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN (5 COLS): Quick Demo Simulator */}
        <div className="lg:col-span-5 rounded-xl bg-white border border-slate-200/90 shadow-xs p-5 pb-8 mb-4 flex flex-col gap-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
                Quick Demo Simulator
              </h3>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 font-mono">
              <div className="text-xs text-slate-600 font-sans">
                Select a simulated attack or enter customized scam SMS text:
              </div>

              {/* Template Buttons */}
              <div className="flex flex-col gap-1.5">
                {templates.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectTemplate(i)}
                    className={`p-2 rounded-lg text-left text-xs transition border flex items-center justify-between cursor-pointer ${
                      selectedTemplateIndex === i
                        ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{tpl.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 shrink-0 ml-2 font-mono">
                      {tpl.badge}
                    </span>
                  </button>
                ))}
              </div>

              {/* Text Area */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 uppercase font-semibold">
                  SMS Message Payload ({customPhone})
                </label>
                <textarea
                  rows={2}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="w-full text-xs font-mono p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-rose-500 focus:bg-white transition resize-none leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={handleRunSimulatedAttack}
                  disabled={isSimulating}
                  className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold font-mono transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSimulating ? 'Triage Running...' : 'Simulate Attack'}</span>
                </button>
                <button
                  onClick={handleTriggerSwahiliTTS}
                  className="py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  title="Play Swahili TTS Spoken Anti-Fraud Warning"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Swahili TTS Alert</span>
                </button>
              </div>

              {/* Visual Feedback: Sauti ya Onyo Inacheza Waveform */}
              {isSwahiliAlertPlaying && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-mono font-semibold animate-pulse shadow-xs">
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

              {/* Instant Alert Response Preview */}
              {lastDispatchedAlert && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col gap-1 text-xs mt-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Africa's Talking Response Dispatched</span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-sans mt-0.5 leading-relaxed">
                    {lastDispatchedAlert.sms}
                  </p>
                  <span className="text-[10px] text-sky-700 font-semibold mt-1">
                    {lastDispatchedAlert.dispatchMode === 'live'
                      ? 'SMS and the Swahili call were sent through Africa\'s Talking.'
                      : lastDispatchedAlert.dispatchMode === 'browser_only'
                        ? 'The API was unreachable, so this score stayed in the browser.'
                        : 'No API key is loaded, so the SMS and call were scored here and not sent.'}
                  </span>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};
