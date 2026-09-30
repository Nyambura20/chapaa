import React from 'react';
import { Home, MessageSquareWarning, ScanFace } from 'lucide-react';
import { LanguageSwitch, useLang } from '../lib/i18n';

export type UserTab = 'home' | 'spam' | 'sim-swap';

interface UserShellProps {
  tab: UserTab;
  onTab: (tab: UserTab) => void;
  onTeam: () => void;
  children: React.ReactNode;
}

export const UserShell: React.FC<UserShellProps> = ({ tab, onTab, onTeam, children }) => {
  const { t } = useLang();
  const tabs: Array<{ id: UserTab; label: string; icon: React.ElementType }> = [
    { id: 'home', label: t.navHome, icon: Home },
    { id: 'spam', label: t.navMessage, icon: MessageSquareWarning },
    { id: 'sim-swap', label: t.navSim, icon: ScanFace },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="px-4 py-3 flex flex-wrap items-center gap-3 bg-slate-800 text-slate-100">
        <p className="text-2xl font-bold tracking-tight">Chapaa</p>
        <nav className="flex flex-1 flex-wrap gap-2">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTab(item.id)}
                className={`min-h-14 px-4 rounded-2xl text-lg font-bold flex items-center gap-2 ${
                  active ? 'bg-sky-200 text-slate-900' : 'bg-white/10 text-slate-100'
                }`}
              >
                <Icon className="w-6 h-6" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <LanguageSwitch />
        <button
          type="button"
          onClick={onTeam}
          className="min-h-14 px-3 text-lg font-bold underline text-slate-100"
        >
          {t.staff}
        </button>
      </header>
      <div className="kanga-hem" />
      <main className="max-w-3xl mx-auto p-4 pb-16">{children}</main>
    </div>
  );
};
