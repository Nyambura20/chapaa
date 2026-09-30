import React from 'react';
import { IdCard, MessageSquareWarning, Phone, ScanFace } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { speakAloud } from '../utils/audio';

interface HomeViewProps {
  onCheckMessage: () => void;
  onSimSwap: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onCheckMessage, onSimSwap }) => {
  const { lang, t } = useLang();

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-3xl overflow-hidden border-4 border-[#143028] shadow-sm">
        <div className="kanga-hem" />
        <div className="kanga-card px-6 py-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#9c2f2f]">{t.landingKicker}</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-[#143028]">{t.landingTitle}</h1>
          <button
            type="button"
            onClick={() => speakAloud(t.landingSpoken, lang)}
            className="mt-5 min-h-14 px-5 rounded-2xl bg-[#143028] text-[#f6efe4] text-lg font-bold"
          >
            {t.hear}
          </button>
        </div>
        <div className="kanga-hem" />
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onCheckMessage}
          className="min-h-40 rounded-3xl bg-[#9c2f2f] text-[#f6efe4] p-6 text-left flex items-center gap-4"
        >
          <MessageSquareWarning className="w-14 h-14 shrink-0" />
          <span>
            <span className="block text-2xl font-bold">{t.checkTitle}</span>
            <span className="block text-lg mt-1 text-[#f6efe4]/90">{t.checkHint}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onSimSwap}
          className="min-h-40 rounded-3xl bg-[#143028] text-[#f6efe4] p-6 text-left flex items-center gap-4"
        >
          <ScanFace className="w-14 h-14 shrink-0" />
          <span>
            <span className="block text-2xl font-bold">{t.swapTitle}</span>
            <span className="block text-lg mt-1 text-[#f6efe4]/90">{t.kycTitle}</span>
          </span>
        </button>
      </div>

      <section className="rounded-3xl bg-white border border-[#e0b15a] p-5">
        <h2 className="text-2xl font-bold text-[#143028]">{t.landingWhat}</h2>
        <ol className="mt-4 grid gap-3">
          <li className="flex items-center gap-4 min-h-16">
            <span className="w-12 h-12 rounded-2xl bg-[#9c2f2f] text-[#f6efe4] flex items-center justify-center shrink-0">
              <MessageSquareWarning className="w-6 h-6" />
            </span>
            <span className="text-xl">{t.step1}</span>
          </li>
          <li className="flex items-center gap-4 min-h-16">
            <span className="w-12 h-12 rounded-2xl bg-[#c45c26] text-[#f6efe4] flex items-center justify-center shrink-0">
              <Phone className="w-6 h-6" />
            </span>
            <span className="text-xl">{t.step2}</span>
          </li>
          <li className="flex items-center gap-4 min-h-16">
            <span className="w-12 h-12 rounded-2xl bg-[#143028] text-[#f6efe4] flex items-center justify-center shrink-0">
              <IdCard className="w-6 h-6" />
            </span>
            <span className="text-xl">{t.step3}</span>
          </li>
        </ol>
      </section>
    </div>
  );
};
