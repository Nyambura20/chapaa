import React from 'react';
import { LanguageSwitch, useLang } from '../lib/i18n';
import {
  Shield,
  Radio,
  MessageSquareWarning,
  Smartphone,
  Settings,
  ScanFace,
} from 'lucide-react';

export type NavView = 'dashboard' | 'qos' | 'threats' | 'canaries' | 'sim-swap' | 'settings';

interface SidebarNavProps {
  activeTab: NavView;
  onTabChange: (tab: NavView) => void;
  onGoHome: () => void;
  threatCount?: number;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onTabChange,
  onGoHome,
  threatCount = 0,
}) => {
  const { t } = useLang();
  const demoItems: Array<{
    id: NavView;
    icon: React.ElementType;
    label: string;
    badge?: string | number;
  }> = [
    { id: 'dashboard', icon: Shield, label: t.navDash },
    {
      id: 'threats',
      icon: MessageSquareWarning,
      label: t.navThreats,
      badge: threatCount > 0 ? threatCount : undefined,
    },
    { id: 'sim-swap', icon: ScanFace, label: t.swapTitle },
  ];
  const contextItems: Array<{
    id: NavView;
    icon: React.ElementType;
    label: string;
    badge?: string | number;
  }> = [
    { id: 'qos', icon: Radio, label: t.navQos },
    { id: 'canaries', icon: Smartphone, label: t.navCanaries },
    { id: 'settings', icon: Settings, label: t.navSettings },
  ];

  return (
    <aside className="w-56 shrink-0 bg-slate-800 text-slate-100 border-r border-slate-700 flex flex-col py-4 z-20 font-sans">
      <div className="px-4 mb-2">
        <LanguageSwitch />
        <button
          type="button"
          onClick={onGoHome}
          className="w-full text-left text-sm font-bold text-sky-200 underline mt-2"
        >
          {t.backHome}
        </button>
      </div>
      <div className="px-4 mb-2 text-[10px] uppercase font-bold text-slate-300 tracking-wider font-mono">
        {t.staffModules}
      </div>

      <nav className="flex flex-col gap-1 px-2.5">
        {[...demoItems, ...contextItems].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer text-xs group ${
                isActive
                  ? 'bg-sky-200 text-slate-900 font-semibold'
                  : 'text-slate-100 hover:bg-white/10 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition ${
                    isActive ? 'text-slate-900 scale-105' : 'text-slate-200 group-hover:text-white'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    isActive
                      ? 'bg-slate-900 text-sky-200'
                      : 'bg-white/10 text-slate-100'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Telecom Gateway Status */}
      <div className="mt-auto px-4 pt-3 border-t border-white/15 text-[11px] text-slate-200 flex flex-col gap-1 font-mono">
        <div className="flex items-center gap-1.5 text-slate-100 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>AT Gateway 20880</span>
        </div>
        <span className="text-[10px] text-slate-300">{t.headerLine}</span>
      </div>
    </aside>
  );
};
