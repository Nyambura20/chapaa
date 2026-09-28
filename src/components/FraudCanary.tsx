import React, { useState } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  Send,
  CheckCircle2,
  Clock,
  KeyRound,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { PosStatus } from '../types';
import { speakSwahiliWarning, playAlertChime } from '../utils/audio';

interface FraudCanaryProps {
  onTriggerAttack: (text: string, phone: string) => Promise<any>;
  onTriggerPosVerify: (amount: number, phone: string) => Promise<any>;
  onSimulateVoiceCall: (phone: string, paybill?: string) => Promise<any>;
  posStatus: PosStatus;
  authToken: string | null;
  posAmount: number;
  posPhone: string;
  onSetPosAmount: (val: number) => void;
  onSetPosPhone: (val: string) => void;
}

export const FraudCanary: React.FC<FraudCanaryProps> = ({
  onTriggerAttack,
  onTriggerPosVerify,
  onSimulateVoiceCall,
  posStatus,
  authToken,
  posAmount,
  posPhone,
  onSetPosAmount,
  onSetPosPhone,
}) => {
  // Pre-configured attack templates
  const templates = [
    {
      label: 'Maranda High Fee Scam',
      phone: '+254718392412',
      text: 'Dear Parent, pay KES 14,500 Term 3 fees to Paybill 522123 Acc 0178 MARANDA immediately to avoid student being sent home.',
    },
    {
      label: 'Predatory Loan Advance',
      phone: '+254722819200',
      text: 'CONGRATULATIONS! Your Hustler Fund loan of KES 50,000 is approved. Send KES 1,200 processing fee to Till 98821 to disburse now.',
    },
    {
      label: 'Fake M-Pesa Reversal',
      phone: '+254701988231',
      text: 'Confirmed. You have received Ksh 3,850 from MARY WANJIKU. Wait, I sent by mistake to wrong number, kindly reverse to 0701988231.',
    },
  ];

  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [customText, setCustomText] = useState(templates[0].text);
  const [customPhone, setCustomPhone] = useState(templates[0].phone);
  const [isAttacking, setIsAttacking] = useState(false);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [lastDispatchedSms, setLastDispatchedSms] = useState<string | null>(null);

  const handleSelectTemplate = (idx: number) => {
    setSelectedTemplateIndex(idx);
    setCustomText(templates[idx].text);
    setCustomPhone(templates[idx].phone);
  };

  const handleFireAttack = async () => {
    setIsAttacking(true);
    playAlertChime();
    try {
      const res = await onTriggerAttack(customText, customPhone);
      if (res?.sms_dispatched) {
        setLastDispatchedSms(res.sms_dispatched);
      }
    } finally {
      setIsAttacking(false);
    }
  };

  const handleVoiceCallClick = async () => {
    setIsVoicePlaying(true);
    // Voice call simulation with authentic spoken Swahili TTS
    speakSwahiliWarning(
      "Onyo la Utapeli kutoka Chapaa Guard. Ujumbe uliopokea kuhusu Paybill 522123 siyo rasmi na ni wa udanganyifu. Usitume fedha zozote.",
      () => setIsVoicePlaying(false)
    );
    await onSimulateVoiceCall(customPhone, '522123');
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Fraud Canary: Live SMS Attack Sandbox */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
              Fraud Canary: Live SMS Attack
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60">
            Sandbox
          </span>
        </div>

        {/* Template Buttons */}
        <div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span>Attack Template:</span>
            <span className="text-sky-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Chapaa-Scan Engine
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {templates.map((tpl, i) => (
              <button
                key={i}
                onClick={() => handleSelectTemplate(i)}
                className={`px-2 py-1 rounded text-[10px] font-mono font-medium truncate transition ${
                  selectedTemplateIndex === i
                    ? 'bg-rose-950 text-rose-200 border border-rose-600/80'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Editable SMS Text Area */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>Trigger test scam:</span>
            <span className="text-slate-500">{customPhone}</span>
          </label>
          <textarea
            rows={2}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            className="w-full text-xs font-mono p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-rose-500/80 transition resize-none"
            placeholder="Type or paste suspicious SMS..."
          />
        </div>

        {/* Trigger Button Row */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleFireAttack}
            disabled={isAttacking}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-mono text-xs font-bold transition shadow-lg shadow-rose-950/40 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isAttacking ? 'Intercepting...' : 'Trigger Attack Simulation'}</span>
          </button>
        </div>

        {/* Big Outbound Voice Call Button matching the highlighted mockup element */}
        <div className="rounded-xl p-1 bg-gradient-to-r from-blue-700 via-sky-600 to-indigo-700 shadow-lg shadow-sky-950/40">
          <button
            onClick={handleVoiceCallClick}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-lg bg-slate-950/90 hover:bg-slate-950 text-sky-200 hover:text-white font-mono text-xs font-bold transition cursor-pointer border border-sky-400/30 group"
          >
            <PhoneCall className={`w-4 h-4 text-sky-400 group-hover:scale-110 transition ${isVoicePlaying ? 'animate-bounce text-emerald-400' : ''}`} />
            <span>Simulate Outbound Voice Call (Swahili TTS)</span>
            <span className={`w-2 h-2 rounded-full ${isVoicePlaying ? 'bg-emerald-400 animate-ping' : 'bg-emerald-400'}`}></span>
          </button>
        </div>

        {/* Live Outbound Voice Status logs */}
        <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Outbound Voice IVR Status:</span>
          </div>
          <p className="text-slate-300 text-[10px] pl-5">
            {isVoicePlaying
              ? '▶ Playing Swahili TTS: "Onyo la Utapeli kutoka Chapaa Guard..."'
              : 'DTMF captured via AT Voice API &bull; Authorizing Transaction #AT-98214'}
          </p>
        </div>
      </div>

      {/* 2. Chapaa-Verify Merchant Terminal */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
              Chapaa-Verify Merchant Terminal
            </h3>
          </div>
          {/* Dynamic Status Pill matching mockup */}
          <div>
            {posStatus === 'AUTHENTICATED' ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500 font-bold flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                AUTHENTICATED {authToken || '#AT-98214'}
              </span>
            ) : posStatus === 'CALLING' ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500 font-bold flex items-center gap-1 animate-pulse">
                <Clock className="w-3 h-3 text-amber-400" />
                Awaiting DTMF (CALLING)
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Terminal Idle
              </span>
            )}
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">
              Transaction Amount
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-xs font-mono text-slate-400">KES</span>
              <input
                type="number"
                value={posAmount}
                onChange={(e) => onSetPosAmount(Number(e.target.value))}
                className="w-full pl-12 pr-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-slate-100 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">
              Customer Phone
            </label>
            <input
              type="text"
              value={posPhone}
              onChange={(e) => onSetPosPhone(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onTriggerPosVerify(posAmount, posPhone)}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-[11px] font-bold transition shadow cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Resend USSD Push</span>
          </button>
          <button
            onClick={() => onTriggerPosVerify(posAmount, posPhone)}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px] font-bold transition shadow cursor-pointer"
          >
            <PhoneCall className="w-3 h-3" />
            <span>Force Voice IVR Call</span>
          </button>
        </div>

        {/* Status indicator message */}
        <div className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between transition-all ${
          posStatus === 'AUTHENTICATED'
            ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-200'
            : posStatus === 'CALLING'
            ? 'bg-sky-950/60 border-sky-600 text-sky-200'
            : 'bg-slate-950 border-slate-800 text-slate-400'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              posStatus === 'AUTHENTICATED'
                ? 'bg-emerald-400'
                : posStatus === 'CALLING'
                ? 'bg-sky-400 animate-ping'
                : 'bg-slate-500'
            }`}></span>
            <span>
              {posStatus === 'AUTHENTICATED'
                ? `AUTHENTICATED ${authToken || '#AT-98214'} &bull; Receipt Sent via AT SMS`
                : posStatus === 'CALLING'
                ? 'Awaiting Customer DTMF Keypad Input (Press 1)...'
                : 'Awaiting Merchant or Customer Input'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
