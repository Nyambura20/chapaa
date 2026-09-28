import React from 'react';
import { ShieldAlert, GraduationCap, CreditCard, Smartphone, Hourglass, TrendingUp } from 'lucide-react';
import { KpiMetrics } from '../types';

interface KpiBarProps {
  metrics: KpiMetrics;
}

export const KpiBar: React.FC<KpiBarProps> = ({ metrics }) => {
  return (
    <div className="w-full">
      <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 px-0.5">
        Operational Metrics
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Scams Intercepted (Rose) */}
        <div className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 p-3.5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-slate-600">Scams Intercepted</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono text-slate-900">{metrics.scamsIntercepted}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-700 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
            <span>▲ {metrics.scamsTrend} this week</span>
          </div>
        </div>

        {/* 2. School Fee Fraud Blocked (Orange/Amber) */}
        <div className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 p-3.5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-slate-600">Fee Fraud Blocked</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono text-slate-900">{metrics.schoolFeeBlocked}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>High Priority &middot; Academic</span>
          </div>
        </div>

        {/* 3. POS Handshakes (Emerald) */}
        <div className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 p-3.5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-slate-600">POS Handshakes</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono text-slate-900">{metrics.posHandshakes}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>100% Zero-Trust Verified</span>
          </div>
        </div>

        {/* 4. Device Pings (Sky/Blue) */}
        <div className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 p-3.5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-slate-600">Device Pings</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono text-slate-900">{metrics.devicePings.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-sky-700 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            <span>CA QoS Telemetry Logs</span>
          </div>
        </div>

        {/* 5. Live Canaries (Amber/Yellow) */}
        <div className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 p-3.5 shadow-xs hover:shadow-sm transition col-span-2 md:col-span-1">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                <Hourglass className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-slate-600">Live Canaries</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono text-slate-900">{metrics.liveCanaries}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-600 font-medium flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Infinix &amp; Samsung Field Units</span>
          </div>
        </div>
      </div>
    </div>
  );
};
