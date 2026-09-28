import React, { useState } from 'react';
import {
  Settings,
  Server,
  Key,
  Radio,
  CheckCircle2,
  Terminal,
  ExternalLink,
  Shield,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

interface SettingsViewProps {
  onOpenInspector: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenInspector }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [ngrokBaseUrl, setNgrokBaseUrl] = useState<string>('https://chapaa-guard-tunnel.ngrok-free.app');

  const endpoints = [
    {
      id: 'sms',
      name: 'Inbound SMS Webhook',
      method: 'POST',
      url: '/api/webhooks/at/incoming-sms',
      status: 'Live & Active (200 OK)',
      type: 'AT Shortcode 20880',
    },
    {
      id: 'voice-callback',
      name: 'Voice Callback (<GetDigits>)',
      method: 'POST',
      url: '/api/webhooks/at/voice-callback',
      status: 'Live & Active (200 OK)',
      type: 'AT Voice XML',
    },
    {
      id: 'voice-dtmf',
      name: 'DTMF Keypad Capture',
      method: 'POST',
      url: '/api/webhooks/at/voice-dtmf',
      status: 'Live & Active (200 OK)',
      type: 'Keypad Digits 1/0',
    },
    {
      id: 'telemetry',
      name: 'Sentinel QoS Telemetry',
      method: 'POST',
      url: '/api/telemetry/ping',
      status: 'Live & Active (200 OK)',
      type: 'Android Hardware Telemetry',
    },
  ];

  const handleCopy = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="flex flex-col gap-5 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-700" />
            <span>Gateway Telephony &amp; API Configuration</span>
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            Africa's Talking credentials, webhook endpoints, and SecOps integration parameters
          </p>
        </div>

        <button
          onClick={onOpenInspector}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <Terminal className="w-4 h-4" />
          <span>Open AT Protocol Inspector</span>
        </button>
      </div>

      {/* Ngrok / Public Tunnel URL Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Radio className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>Public Tunnel (Ngrok Base URL) for AT Callbacks</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                HTTPS Tunnel Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans">
              Configure Africa's Talking dashboard callback URLs targeting your live tunnel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={ngrokBaseUrl}
            onChange={(e) => setNgrokBaseUrl(e.target.value)}
            className="w-full md:w-80 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
            placeholder="https://your-tunnel.ngrok-free.app"
          />
          <button
            onClick={() => handleCopy('ngrok-base', ngrokBaseUrl)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer border border-slate-200 shadow-xs"
          >
            {copiedKey === 'ngrok-base' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Base</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid of Credentials & Endpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Credentials Card (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-white border border-slate-200 flex flex-col gap-4 shadow-xs text-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-600" />
              <span>Africa's Talking Credentials</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
              Connected
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Username</span>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 mt-1">
                <span className="text-slate-900 font-bold">sandbox</span>
                <span className="text-[10px] text-slate-500 font-sans">Live Simulator Ready</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">AT API Key</span>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 mt-1">
                <span className="text-slate-700 font-mono">atsk_live_********************412</span>
                <button
                  onClick={() => handleCopy('apikey', 'atsk_live_29910294819284019283412')}
                  className="text-slate-500 hover:text-slate-900 transition flex items-center gap-1 text-[10px] cursor-pointer"
                >
                  {copiedKey === 'apikey' ? (
                    <span className="text-emerald-600 font-bold">Copied</span>
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">SMS Sender ID / Shortcode</span>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 mt-1">
                <span className="text-slate-900 font-bold">20880</span>
                <button
                  onClick={() => handleCopy('shortcode', '20880')}
                  className="text-slate-500 hover:text-slate-900 transition flex items-center gap-1 text-[10px] cursor-pointer"
                >
                  {copiedKey === 'shortcode' ? (
                    <span className="text-emerald-600 font-bold">Copied</span>
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Voice Caller DID</span>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 mt-1">
                <span className="text-slate-900 font-bold">+254 711 082 000</span>
                <button
                  onClick={() => handleCopy('voice-did', '+254711082000')}
                  className="text-slate-500 hover:text-slate-900 transition flex items-center gap-1 text-[10px] cursor-pointer"
                >
                  {copiedKey === 'voice-did' ? (
                    <span className="text-emerald-600 font-bold">Copied</span>
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Endpoints Card (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-white border border-slate-200 flex flex-col gap-3 shadow-xs text-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-600" />
              <span>Africa's Talking Webhook Endpoints</span>
            </span>
            <span className="text-[10px] text-slate-500 font-sans">HTTP POST / Form-Data</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {endpoints.map((ep) => {
              const fullUrl = `${ngrokBaseUrl.replace(/\/$/, '')}${ep.url}`;
              const isCopied = copiedKey === `ep-${ep.id}`;

              return (
                <div
                  key={ep.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-300 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-bold text-[10px] border border-sky-200">
                        {ep.method}
                      </span>
                      <span className="font-bold text-slate-900">{ep.name}</span>
                    </div>
                    <code className="text-[11px] text-slate-600 mt-1 block font-mono">
                      {ep.url}
                    </code>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">
                      {ep.type}
                    </span>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                    <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {ep.status}
                    </span>
                    <button
                      onClick={() => handleCopy(`ep-${ep.id}`, fullUrl)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300'
                      }`}
                      title={`Copy full URL: ${fullUrl}`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-sky-600" />
                          <span>Copy Webhook URL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
