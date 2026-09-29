import React from 'react';
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
  threatCount?: number;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onTabChange,
  threatCount = 0,
}) => {
  const navItems: Array<{
    id: NavView;
    icon: React.ElementType;
    label: string;
    badge?: string | number;
  }> = [
    {
      id: 'dashboard',
      icon: Shield,
      label: 'Dashboard',
    },
    {
      id: 'qos',
      icon: Radio,
      label: 'QoS & Dead-Zones',
    },
    {
      id: 'threats',
      icon: MessageSquareWarning,
      label: 'Threat Stream',
      badge: threatCount > 0 ? threatCount : undefined,
    },
    {
      id: 'canaries',
      icon: Smartphone,
      label: 'Live Canaries',
      badge: '2 Active',
    },
    {
      id: 'sim-swap',
      icon: ScanFace,
      label: 'SIM Swap',
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Settings & AT',
    },
  ];

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col py-4 z-20 font-sans">
      <div className="px-4 mb-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">
        SecOps Modules
      </div>

      <nav className="flex flex-col gap-1 px-2.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer text-xs group ${
                isActive
                  ? 'bg-sky-50 text-sky-700 font-semibold border-r-2 border-sky-600 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition ${
                    isActive ? 'text-sky-600 scale-105' : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    isActive
                      ? 'bg-sky-100 text-sky-800 border border-sky-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
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
      <div className="mt-auto px-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex flex-col gap-1 font-mono">
        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>AT Gateway 20880</span>
        </div>
        <span className="text-[10px] text-slate-400">SMS &amp; Voice &middot; 4G/LTE Canaries</span>
      </div>
    </aside>
  );
};
