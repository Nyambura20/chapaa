import React, { useState } from 'react';
import { Phone, Check, ShieldCheck, Volume2 } from 'lucide-react';
import { playDtmfTone } from '../utils/audio';

interface DtmfKeypadProps {
  onCaptureDigit: (digit: string) => void;
  isCalling: boolean;
  capturedDigit: string | null;
  authToken: string | null;
}

export const DtmfKeypad: React.FC<DtmfKeypadProps> = ({
  onCaptureDigit,
  isCalling,
  capturedDigit,
  authToken,
}) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#'],
  ];

  const handleKeyPress = (digit: string) => {
    setActiveKey(digit);
    playDtmfTone(digit);
    setTimeout(() => setActiveKey(null), 200);
    onCaptureDigit(digit);
  };

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 shadow-lg flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[11px] font-bold text-slate-200 font-mono">
            DTMF Capturing Status
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
          ITU-T Q.23 Ready
        </span>
      </div>

      {/* Captured Digit Pill */}
      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
        <span className="text-[11px] font-mono text-slate-400">Captured:</span>
        <span className="text-xs font-mono font-bold text-emerald-400">
          {capturedDigit ? `Digit '${capturedDigit}' captured` : isCalling ? 'Listening on IVR stream...' : 'Idle'}
        </span>
      </div>

      {/* 3x4 Telephone Keypad */}
      <div className="grid grid-cols-3 gap-1.5 my-0.5">
        {keys.flat().map((k) => {
          const isSelected = activeKey === k || capturedDigit === k;
          const isPrimaryConfirm = k === '1';

          return (
            <button
              key={k}
              onClick={() => handleKeyPress(k)}
              className={`h-9 rounded-lg font-mono text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                isSelected
                  ? 'bg-emerald-500 text-white scale-95 shadow-md shadow-emerald-500/30'
                  : isPrimaryConfirm && isCalling
                  ? 'bg-sky-600/80 hover:bg-sky-500 text-white border border-sky-400 animate-pulse'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
              }`}
            >
              {k}
            </button>
          );
        })}
      </div>

      {/* Token status banner if authenticated */}
      {authToken && (
        <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-between text-[10px] font-mono text-emerald-300">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero-Trust Token:</span>
          </div>
          <strong className="text-white bg-emerald-900 px-1.5 py-0.5 rounded">{authToken}</strong>
        </div>
      )}
    </div>
  );
};
