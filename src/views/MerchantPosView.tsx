import React, { useState } from 'react';
import {
  CreditCard,
  KeyRound,
  ShieldCheck,
  PhoneCall,
  Clock,
  CheckCircle2,
  Volume2,
} from 'lucide-react';
import { PosStatus } from '../types';

interface PosHistoryItem {
  id: string;
  time: string;
  phone: string;
  amount: number;
  token: string;
  status: string;
}

interface MerchantPosViewProps {
  posStatus: PosStatus;
  authToken: string | null;
  posAmount: number;
  posPhone: string;
  posHistory: PosHistoryItem[];
  onSetPosAmount: (val: number) => void;
  onSetPosPhone: (val: string) => void;
  onTriggerPosVerify: (amount: number, phone: string) => Promise<any>;
  onOpenDtmfModal: () => void;
}

export const MerchantPosView: React.FC<MerchantPosViewProps> = ({
  posStatus,
  authToken,
  posAmount,
  posPhone,
  posHistory,
  onSetPosAmount,
  onSetPosPhone,
  onTriggerPosVerify,
  onOpenDtmfModal,
}) => {
  const [merchantId, setMerchantId] = useState('MERCHANT-NAIROBI-HQ');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onTriggerPosVerify(posAmount, posPhone);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <span>Merchant POS (Chapaa-Verify Terminal)</span>
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            Zero-Trust out-of-band Point-of-Sale authorization via Africa's Talking Voice IVR &amp; USSD
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Cryptographic Tokens</span>
          </span>
        </div>
      </div>

      {/* Main Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (7 cols): Terminal Form & State Box */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Dynamic State Box: Intentional Hardware Terminal Screen */}
          <div
            className={`p-5 rounded-xl border-2 flex flex-col gap-3 transition shadow-xs ${
              posStatus === 'AUTHENTICATED'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-emerald-500/10'
                : posStatus === 'CALLING'
                ? 'bg-sky-50 border-sky-400 text-sky-950 shadow-sky-500/10'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-slate-500 font-semibold tracking-wider">
                Terminal Authorization Status
              </span>
              {posStatus === 'AUTHENTICATED' ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>AUTHENTICATED {authToken || '#AT-98214'}</span>
                </span>
              ) : posStatus === 'CALLING' ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-600 text-white flex items-center gap-1.5 animate-pulse shadow-xs">
                  <Clock className="w-3.5 h-3.5 text-white" />
                  <span>DIALING CUSTOMER {posPhone} VIA AT VOICE...</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs bg-slate-200 text-slate-700 font-medium">
                  IDLE / AWAITING TRANSACTION
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between pt-2">
              <div>
                <span className="text-3xl font-bold font-mono text-slate-900">
                  KES {posAmount.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 block mt-0.5 font-sans">
                  Target Customer: <strong className="text-slate-800 font-mono">{posPhone}</strong>
                </span>
              </div>

              {authToken && (
                <div className="text-right">
                  <span className="text-[10px] text-emerald-700 block uppercase font-bold">Auth Token</span>
                  <span className="text-xl font-bold font-mono text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-xs">
                    {authToken}
                  </span>
                </div>
              )}
            </div>

            {posStatus === 'CALLING' && (
              <div className="p-3 rounded-lg bg-sky-100/90 border border-sky-300 flex items-center justify-between text-xs text-sky-900 animate-pulse">
                <div className="flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-sky-600 animate-bounce" />
                  <span className="font-semibold font-sans">DIALING CUSTOMER {posPhone} VIA AT VOICE...</span>
                </div>
                <button
                  onClick={onOpenDtmfModal}
                  className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold transition cursor-pointer shadow-xs"
                >
                  Dial '1'
                </button>
              </div>
            )}

            {posStatus === 'AUTHENTICATED' && (
              <div className="p-3 rounded-lg bg-emerald-100/90 border border-emerald-300 flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-sans">Dual SMS receipts sent to customer ({posPhone}) &amp; merchant</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Zero-Trust Verified
                </span>
              </div>
            )}
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col gap-4"
          >
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Initiate New Handshake
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                  Merchant ID
                </label>
                <input
                  type="text"
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                  Amount (KES)
                </label>
                <input
                  type="number"
                  value={posAmount}
                  onChange={(e) => onSetPosAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                  Customer MSISDN (Phone)
                </label>
                <input
                  type="text"
                  value={posPhone}
                  onChange={(e) => onSetPosPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                  placeholder="+254712345678"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer uppercase tracking-wider"
              >
                <KeyRound className="w-4 h-4" />
                <span>Initiate Handshake</span>
              </button>

              <button
                type="button"
                onClick={onOpenDtmfModal}
                className="py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-sky-600" />
                <span>Test DTMF Keypad</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column (5 cols): Audit Ledger */}
        <div className="lg:col-span-5 rounded-xl bg-white border border-slate-200 shadow-xs p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Zero-Trust Audit Ledger
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Dual SMS Receipts</span>
          </div>

          <div className="flex flex-col gap-2">
            {posHistory.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/90 flex items-center justify-between text-xs transition hover:border-emerald-400 hover:bg-white hover:shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 font-mono">{item.phone}</span>
                    <span className="text-[10px] text-slate-500">{item.time}</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold block mt-0.5 font-mono">
                    KES {item.amount.toLocaleString()}
                  </span>
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold font-mono">
                    {item.token}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">Dual Receipts Sent</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
