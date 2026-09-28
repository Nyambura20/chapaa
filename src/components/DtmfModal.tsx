import React, { useState } from 'react';
import { X, Volume2, ShieldCheck } from 'lucide-react';
import { playDtmfTone } from '../utils/audio';

interface DtmfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureDigit: (digit: string) => void;
  amount: number;
  phone: string;
  isCalling: boolean;
  capturedDigit: string | null;
  authToken: string | null;
}

export const DtmfModal: React.FC<DtmfModalProps> = ({
  isOpen,
  onClose,
  onCaptureDigit,
  amount,
  phone,
  isCalling,
  capturedDigit,
  authToken,
}) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const keypad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#'],
  ];

  const handleKeyPress = (digit: string) => {
    setActiveKey(digit);
    playDtmfTone(digit);
    setTimeout(() => setActiveKey(null), 180);
    onCaptureDigit(digit);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Customer DTMF Verification
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Call Status Card */}
        <div className="p-4 flex flex-col gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Customer Device:</span>
              <span className="font-bold text-slate-900 font-mono">{phone}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Payment Amount:</span>
              <span className="font-bold text-emerald-700 font-mono">KES {amount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 text-[11px]">
              <span className="text-slate-500">IVR Prompt:</span>
              <span className="text-sky-700 font-semibold font-sans">"Press 1 to confirm, 0 to cancel"</span>
            </div>
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-3 gap-2 py-1">
            {keypad.flat().map((k) => {
              const isSelected = activeKey === k || capturedDigit === k;
              const isConfirm = k === '1';
              const isCancel = k === '0';

              return (
                <button
                  key={k}
                  onClick={() => handleKeyPress(k)}
                  className={`h-12 rounded-xl text-base font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white scale-95 shadow-md shadow-emerald-500/30'
                      : isConfirm
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : isCancel
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'
                  }`}
                >
                  <span>{k}</span>
                  {isConfirm && <span className="text-[9px] text-emerald-700 font-normal">Confirm</span>}
                  {isCancel && <span className="text-[9px] text-rose-700 font-normal">Cancel</span>}
                </button>
              );
            })}
          </div>

          {/* Result Banner */}
          {authToken ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex flex-col gap-1.5 shadow-xs animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>AUTHENTICATED</span>
                </div>
                <strong className="text-white font-mono bg-emerald-600 px-2 py-0.5 rounded font-bold shadow-xs">
                  {authToken}
                </strong>
              </div>
              <span className="text-[10px] text-emerald-800 font-sans">
                Dual SMS receipts dispatched via Africa's Talking Shortcode 20880.
              </span>
            </div>
          ) : (
            <div className="text-[11px] text-center text-slate-500 py-1 font-sans">
              Press <span className="text-emerald-700 font-bold font-mono">'1'</span> on keypad to simulate customer approval
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[10px] font-sans">ITU-T Q.23 Tone Synthesis</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
