import React, { useState } from 'react';
import { X, Terminal, Copy, Check, Radio, Send, PhoneCall } from 'lucide-react';
import { AtWebhookLog } from '../types';

interface AtPayloadInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AtWebhookLog[];
}

export const AtPayloadInspector: React.FC<AtPayloadInspectorProps> = ({
  isOpen,
  onClose,
  logs,
}) => {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(logs[0]?.id || null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentLog = logs.find((l) => l.id === selectedLogId) || logs[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[620px] rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Africa's Talking Protocol &amp; Webhook Inspector
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  LIVE TELEPHONY GATEWAY
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 font-sans">
                Inspect raw AT SMS, Voice XML &lt;GetDigits&gt;, and DTMF callback events
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content split pane */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Event Stream List */}
          <div className="w-72 border-r border-slate-200 bg-slate-50/60 overflow-y-auto p-2.5 flex flex-col gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1 tracking-wider">
              Gateway Telephony Log ({logs.length})
            </span>
            {logs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedLogId(log.id)}
                className={`p-2.5 rounded-xl cursor-pointer transition text-xs border ${
                  (selectedLogId === log.id || (!selectedLogId && log.id === currentLog?.id))
                    ? 'bg-white border-sky-400 text-slate-900 shadow-xs'
                    : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded ${
                      log.direction === 'INBOUND'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-sky-50 text-sky-700 border border-sky-200'
                    }`}
                  >
                    {log.direction} &bull; {log.method}
                  </span>
                  <span className="text-slate-400">{log.timestamp.slice(11, 19)}</span>
                </div>
                <div className="font-bold truncate text-[11px] text-slate-800">{log.endpoint}</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5 font-sans">{log.description}</div>
              </div>
            ))}
          </div>

          {/* Right: Payload Code & Headers Viewer */}
          <div className="flex-1 flex flex-col bg-white p-4 overflow-hidden">
            {currentLog ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-bold font-sans">Endpoint:</span>
                    <code className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                      {currentLog.endpoint}
                    </code>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500 font-sans">Content-Type:</span>
                    <code className="text-sky-700 text-[11px] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">{currentLog.contentType}</code>
                  </div>
                  <button
                    onClick={() => handleCopy(currentLog.payload)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer border border-slate-200 shadow-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copied ? 'Copied' : 'Copy Payload'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-600 mb-2 font-sans">
                  <strong className="text-slate-900 font-mono">Operation:</strong> {currentLog.description}
                </div>

                {/* Code container */}
                <div className="flex-1 overflow-auto rounded-xl bg-slate-900 text-sky-300 p-4 text-xs font-mono leading-relaxed whitespace-pre shadow-inner">
                  {currentLog.payload}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-sans">
                Select a telephony log on the left to inspect raw payloads.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-medium">Connected to Africa's Talking Gateway: Shortcode 20880</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-mono text-xs transition cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
