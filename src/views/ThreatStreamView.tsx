import React, { useState } from 'react';
import {
  MessageSquareWarning,
  Search,
  ShieldAlert,
  PhoneCall,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { ThreatLogItem } from '../types';

interface ThreatStreamViewProps {
  threats: ThreatLogItem[];
  onSelectThreat: (threat: ThreatLogItem) => void;
  onReplayVoiceWarning: (phone: string, paybill?: string) => void;
}

export const ThreatStreamView: React.FC<ThreatStreamViewProps> = ({
  threats,
  onSelectThreat,
  onReplayVoiceWarning,
}) => {
  const { t } = useLang();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredThreats = threats.filter((item) => {
    const matchesCategory =
      categoryFilter === 'ALL' || item.category === categoryFilter;
    const matchesSearch =
      item.raw_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sender_phone.includes(searchTerm) ||
      (item.extracted_details?.paybill && item.extracted_details.paybill.includes(searchTerm));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-5 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <MessageSquareWarning className="w-5 h-5 text-rose-600" />
            <span>{t.pageThreats}</span>
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            {t.pageThreatsHint}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-medium">
            AT Shortcode: <strong>20880</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white text-slate-700 border border-slate-200 shadow-xs">
            Total Flagged: <strong>{threats.length}</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search phone, paybill, keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-rose-500 focus:bg-white"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All Interceptions' },
            { id: 'SCHOOL_FEE', label: 'School Fee Scams' },
            { id: 'LOAN_SCAM', label: 'Predatory Loans' },
            { id: 'FAKE_REVERSAL', label: 'Fake Reversals' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer font-medium ${
                categoryFilter === cat.id
                  ? 'bg-rose-600 text-white font-bold shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Threat Cards Grid */}
      <div className="flex flex-col gap-3">
        {filteredThreats.length > 0 ? (
          filteredThreats.map((threat) => (
            <div
              key={threat.id}
              onClick={() => onSelectThreat(threat)}
              className="p-4.5 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Info */}
              <div className="flex items-start gap-3.5 flex-1">
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {threat.sender_phone}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {new Date(threat.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                      {threat.category.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-sans leading-relaxed group-hover:text-slate-900 transition">
                    &ldquo;{threat.raw_text}&rdquo;
                  </p>

                  {/* Extracted badges */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                    <span>
                      Paybill:{' '}
                      <strong className="text-rose-600 font-bold">
                        {threat.extracted_details?.paybill || threat.extracted_entity}
                      </strong>
                    </span>
                    {threat.extracted_details?.amount && (
                      <span>
                        Amount:{' '}
                        <strong className="text-emerald-700 font-bold">
                          KES {threat.extracted_details.amount.toLocaleString()}
                        </strong>
                      </span>
                    )}
                    {threat.extracted_details?.account && (
                      <span>
                        Ref: <strong className="text-sky-700 font-bold">{threat.extracted_details.account}</strong>
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                      UNVERIFIED REGISTRY
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Score & Actions */}
              <div className="flex md:flex-col items-center md:items-end justify-between gap-2.5 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Threat Score</span>
                  <span className="text-xl font-bold font-mono text-rose-600">
                    {threat.threat_score}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReplayVoiceWarning(
                        threat.sender_phone,
                        threat.extracted_details?.paybill || undefined
                      );
                    }}
                    className="p-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition cursor-pointer shadow-xs"
                    title="Play Swahili TTS Voice Canary Warning"
                  >
                    <PhoneCall className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectThreat(threat);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-900 border border-sky-200 hover:border-sky-300 text-xs font-bold font-mono transition flex items-center gap-1 shadow-xs cursor-pointer"
                    title="Inspect deep triage evidence & AT countermeasures"
                  >
                    <span>Inspect</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 rounded-xl bg-white border border-slate-200 text-center text-slate-500 text-xs shadow-xs">
            No threats match the current search or filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
