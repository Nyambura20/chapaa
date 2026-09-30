import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { FraudSpot } from '../types';

const KenyaLeafletMap = dynamic(
  () => import('../components/KenyaLeafletMap').then((mod) => mod.KenyaLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full rounded-xl bg-slate-100 border border-slate-200 animate-pulse" style={{ height: '480px' }} />
    ),
  }
);

interface QosViewProps {
  hotspots: FraudSpot[];
}

export const QosView: React.FC<QosViewProps> = ({ hotspots }) => {
  const { t } = useLang();
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const total = hotspots.reduce((sum, spot) => sum + spot.count, 0);

  return (
    <div className="flex flex-col gap-5 font-mono">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-5 h-5 text-rose-600" />
            <span>{t.pageQos}</span>
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            {t.pageQosHint}
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium">
          {total} {t.fraudReports}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 flex flex-col gap-3">
          <KenyaLeafletMap
            hotspots={hotspots}
            selectedCounty={selectedCounty}
            onSelect={setSelectedCounty}
            title={t.pageQos}
            legendMany={t.mapMany}
            legendSome={t.mapSome}
            legendOne={t.mapOne}
            height="520px"
          />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {t.pageQos} ({hotspots.length})
          </div>

          {hotspots.map((spot) => (
            <button
              key={spot.county}
              type="button"
              onClick={() => setSelectedCounty(spot.county)}
              className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col gap-2 shadow-xs ${
                selectedCounty === spot.county
                  ? 'bg-rose-50 border-2 border-rose-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-900">{spot.county}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-semibold">
                  {spot.count}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-sans">
                {spot.likely} {t.dashLikely}
                {spot.suspicious ? ` · ${spot.suspicious} ${t.askThem}` : ''}
              </p>
              <p className="text-xs text-slate-800 font-sans">
                {spot.latestPaybill ? `Paybill ${spot.latestPaybill}` : spot.latestPhone}
              </p>
            </button>
          ))}

          {hotspots.length === 0 && (
            <p className="text-xs text-slate-500 font-sans">{t.emptyMap}</p>
          )}
        </div>
      </div>
    </div>
  );
};
