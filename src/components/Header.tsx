import React from 'react';
import { Shield, Bell, Terminal, Wifi, Activity } from 'lucide-react';
import { useLang } from '../lib/i18n';

interface HeaderProps {
  unreadAlertsCount: number;
  onOpenInspector: () => void;
  isLiveSocketConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  unreadAlertsCount,
  onOpenInspector,
  isLiveSocketConnected,
}) => {
  const { t } = useLang();
  return (
    <header className="w-full bg-slate-800 text-slate-100 sticky top-0 z-30">
      <div className="px-5 py-2.5 flex items-center justify-between">
      {/* Left: Shield icon & Brand with subtitle */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-sky-200 shrink-0">
          <Shield className="w-4.5 h-4.5 text-slate-900" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </div>
        <div>
          <h1 className="text-sm font-extrabold tracking-wider text-slate-100 font-mono leading-none">
            CHAPAA
          </h1>
          <p className="text-[11px] text-slate-200 font-sans font-medium mt-1 leading-none">
            {t.headerLine}
          </p>
        </div>
      </div>

      {/* Right: Operational indicators & action tools */}
      <div className="flex items-center gap-2.5">
        {/* AT Gateway Live status badge */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-mono shadow-xs">
          <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span className="text-emerald-700 font-medium">Gateway:</span>
          <span className="text-emerald-800 font-bold">20880 LIVE</span>
        </div>

        {/* WebSocket live link indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-mono shadow-xs">
          <Activity className={`w-3.5 h-3.5 ${isLiveSocketConnected ? 'text-emerald-600' : 'text-amber-500'}`} />
          <span className="text-slate-700 font-medium">WebSocket</span>
        </div>

        {/* AT Protocol Inspector action button */}
        <button
          onClick={onOpenInspector}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-mono font-semibold transition cursor-pointer shadow-xs"
          title="Inspect Africa's Talking Webhooks, XML & JSON Payloads"
        >
          <Terminal className="w-3.5 h-3.5 text-sky-600" />
          <span className="hidden sm:inline">AT Inspector</span>
        </button>

        {/* Alert notification bell */}
        <div
          onClick={onOpenInspector}
          className="relative cursor-pointer p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-100 border border-white/20 transition"
          title={`${unreadAlertsCount} active alert notifications`}
        >
          <Bell className="w-4 h-4" />
          {unreadAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full border-2 border-white shadow-xs">
              {unreadAlertsCount}
            </span>
          )}
        </div>
      </div>
      </div>
      <div className="kanga-hem" />
    </header>
  );
};
