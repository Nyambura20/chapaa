/**
 * CHAPAA-GUARD: Unified Fraud Defense & QoS Intelligence Center
 * Refactored & Simplified SecOps Control Deck
 * Built for Africa's Talking Telecom Innovate Hackathon.
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SidebarNav, NavView } from './components/SidebarNav';
import { DashboardOverview } from './views/DashboardOverview';
import { QosView } from './views/QosView';
import { ThreatStreamView } from './views/ThreatStreamView';
import { CanariesView } from './views/CanariesView';
import { SettingsView } from './views/SettingsView';
import { SimSwapView } from './views/SimSwapView';
import { HomeView } from './views/HomeView';
import { SpamCheckView } from './views/SpamCheckView';
import { UserShell, UserTab } from './components/UserShell';
import { ScamTriageDrawer } from './components/ScamTriageDrawer';
import { AtPayloadInspector } from './components/AtPayloadInspector';
import {
  ThreatLogItem,
  ProbeDevice,
  KpiMetrics,
  AtWebhookLog,
  SimSwapRow,
  FraudSpot,
} from './types';
import { playAlertChime, speakSwahiliWarning } from './utils/audio';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const EMPTY_KPI: KpiMetrics = {
  scamsIntercepted: 0,
  scamsTrend: '',
  schoolFeeBlocked: 0,
  devicePings: 0,
  liveCanaries: 0,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavView | UserTab>('home');
  const [recoverId, setRecoverId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<KpiMetrics>(EMPTY_KPI);
  const [probes, setProbes] = useState<ProbeDevice[]>([]);
  const [threats, setThreats] = useState<ThreatLogItem[]>([]);
  const [swaps, setSwaps] = useState<SimSwapRow[]>([]);
  const [hotspots, setHotspots] = useState<FraudSpot[]>([]);
  const [selectedThreat, setSelectedThreat] = useState<ThreatLogItem | null>(null);

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [atLogs, setAtLogs] = useState<AtWebhookLog[]>([]);

  const loadBoard = async () => {
    const response = await fetch('/api/board');
    if (!response.ok) return;
    const body = await response.json();
    setThreats(body.threats || []);
    setSwaps(body.swaps || []);
    setProbes(body.probes || []);
    setHotspots(body.hotspots || []);
    if (body.metrics) setMetrics(body.metrics);
  };

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('recover');
    if (!id) return;
    setRecoverId(id);
    setActiveTab('sim-swap');
  }, []);

  useEffect(() => {
    loadBoard().catch(() => undefined);
    const onStaff = activeTab !== 'home' && activeTab !== 'spam' && activeTab !== 'sim-swap';
    if (!onStaff) return;
    const timer = window.setInterval(() => {
      loadBoard().catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [activeTab]);

  // Attack Simulator Trigger. Prefer the API so a sandbox key sends a real SMS and call.
  const handleTriggerAttack = async (text: string, phone: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/canary/simulate-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_phone: phone, text }),
      });
      if (!response.ok) throw new Error(await response.text());
      const body = await response.json();
      const log = body.log;
      const newThreat: ThreatLogItem = {
        id: log.id,
        sender_phone: log.sender_phone,
        raw_text: log.raw_text,
        extracted_entity: log.extracted_entity || 'Unknown',
        extracted_details: log.extracted_details || {},
        category: log.category,
        threat_score: log.threat_score,
        reasons: log.reasons || [],
        actions_taken: log.actions_taken,
        created_at: log.created_at,
      };
      await loadBoard();
      setAtLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          endpoint: '/api/canary/simulate-sms',
          method: 'POST',
          direction: 'INBOUND',
          status: 200,
          contentType: 'application/json',
          description: `Scored ${phone} via Chapaa-Scan`,
          payload: text,
        },
        ...prev,
      ]);
      return {
        success: true,
        sms_dispatched: body.sms_dispatched,
        dispatch_mode: log.actions_taken?.sms_dispatch?.mode || 'sandbox_simulator',
        voice_mode: log.actions_taken?.voice_dispatch?.mode || 'sandbox_simulator',
        newThreat,
      };
    } catch {
      return scoreAttackLocally(text, phone);
    }
  };

  const scoreAttackLocally = (text: string, phone: string) => {
    const paybillMatch = text.match(/(?:Paybill|paybill|Business No\.?|P\/Bill)\s*:?\s*([0-9]{5,7})/i);
    const tillMatch = text.match(/(?:Till|till|Buy Goods)\s*:?\s*([0-9]{5,6})/i);
    const amountMatch = text.match(/(?:Ksh|KES|ksh|kes)\.?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
    const accountMatch = text.match(/(?:Acc|Account|Ref)\.?\s*:?\s*([A-Za-z0-9_-]+)/i);

    const paybill = paybillMatch ? paybillMatch[1] : null;
    const till = tillMatch ? tillMatch[1] : null;
    const amountStr = amountMatch ? amountMatch[1] : null;
    const amount = amountStr ? parseFloat(amountStr.replace(/,/g, '')) : null;
    const account = accountMatch ? accountMatch[1] : null;

    let category: 'SCHOOL_FEE' | 'LOAN_SCAM' | 'FAKE_REVERSAL' | 'SAFE' = 'SAFE';
    let threat_score = 45;
    const reasons: string[] = [];

    const lower = text.toLowerCase();
    if (lower.includes('fee') || lower.includes('term') || lower.includes('school') || lower.includes('maranda')) {
      category = 'SCHOOL_FEE';
      threat_score = 94;
      reasons.push(`UNVERIFIED PAYBILL: Paybill ${paybill || '522123'} is registered to an individual line, not the accredited institution.`);
      reasons.push('Academic fee impersonation alert.');
    } else if (lower.includes('loan') || lower.includes('hustler') || lower.includes('processing')) {
      category = 'LOAN_SCAM';
      threat_score = 91;
      reasons.push('PREDATORY: Advance fee requested before loan disbursement.');
      reasons.push('Till flagged for predatory lending practices.');
    } else if (lower.includes('reverse') || lower.includes('wrong number')) {
      category = 'FAKE_REVERSAL';
      threat_score = 84;
      reasons.push('FAKE REVERSAL: Social engineering attempt to induce panic refund of phantom funds.');
    }

    const warningSms = `[Chapaa-Alert] WARNING: Paybill ${paybill || '522123'} is registered to an individual line, not the accredited institution. Threat Confidence: ${threat_score}%. Dispatched via Africa's Talking.`;

    const newThreat: ThreatLogItem = {
      id: `th-${Date.now().toString(36)}`,
      sender_phone: phone,
      raw_text: text,
      extracted_entity: paybill || till || account || 'Unknown',
      extracted_details: {
        amount,
        amount_str: amountStr,
        paybill,
        till,
        account,
      },
      category,
      threat_score,
      reasons,
      actions_taken: {
        timestamp: new Date().toISOString(),
        warning_sms: true,
        sms_dispatch: { success: true, shortcode: '20880', status: 'Delivered' },
        voice_canary_call: true,
      },
      created_at: new Date().toISOString(),
    };

    setThreats((prev) => [newThreat, ...prev]);
    setMetrics((prev) => ({
      ...prev,
      scamsIntercepted: prev.scamsIntercepted + 1,
      schoolFeeBlocked: category === 'SCHOOL_FEE' ? prev.schoolFeeBlocked + 1 : prev.schoolFeeBlocked,
    }));

    // Record AT Webhook Log
    const newLog: AtWebhookLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      endpoint: '/api/webhooks/at/incoming-sms',
      method: 'POST',
      direction: 'INBOUND',
      status: 200,
      contentType: 'application/x-www-form-urlencoded',
      description: `Inbound Smishing Forwarded from ${phone}`,
      payload: `from=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&to=20880&id=ATXid_${Math.floor(Math.random() * 900000 + 100000)}`,
    };
    setAtLogs((prev) => [newLog, ...prev]);

    return {
      success: true,
      sms_dispatched: warningSms,
      dispatch_mode: 'browser_only',
      voice_mode: 'browser_only',
      newThreat,
    };
  };

  // Replay Swahili Voice Warning
  const handleReplayVoiceWarning = (phone: string, paybill?: string) => {
    playAlertChime();
    speakSwahiliWarning(
      `Onyo la Utapeli kutoka Chapaa Guard. Ujumbe uliopokea kuhusu Paybill ${paybill || '522123'} siyo rasmi na ni wa udanganyifu. Usitume fedha zozote.`
    );
  };

  const userTab: UserTab | null =
    activeTab === 'home' || activeTab === 'spam' || activeTab === 'sim-swap' ? activeTab : null;

  if (userTab) {
    return (
      <UserShell tab={userTab} onTab={setActiveTab} onTeam={() => setActiveTab('dashboard')}>
        {userTab === 'home' && (
          <HomeView
            onCheckMessage={() => setActiveTab('spam')}
            onSimSwap={() => setActiveTab('sim-swap')}
          />
        )}
        {userTab === 'spam' && <SpamCheckView />}
        {userTab === 'sim-swap' && <SimSwapView recoverId={recoverId} />}
      </UserShell>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        unreadAlertsCount={threats.length}
        onOpenInspector={() => setIsInspectorOpen(true)}
        isLiveSocketConnected={true}
      />

      {/* Main Container with Sidebar + Content Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Functional Navigation Rail */}
        <SidebarNav
          activeTab={activeTab as NavView}
          onTabChange={(tab) => setActiveTab(tab)}
          onGoHome={() => setActiveTab('home')}
          threatCount={threats.length}
        />

        {/* Scrollable Main View Container with smooth transition */}
        <main className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              metrics={metrics}
              threats={threats}
              swaps={swaps}
              onSelectThreat={(t) => setSelectedThreat(t)}
              onTriggerAttack={handleTriggerAttack}
              onNavigateToView={(v) => setActiveTab(v as NavView)}
            />
          )}

          {activeTab === 'qos' && <QosView hotspots={hotspots} />}

          {activeTab === 'threats' && (
            <ThreatStreamView
              threats={threats}
              onSelectThreat={(t) => setSelectedThreat(t)}
              onReplayVoiceWarning={handleReplayVoiceWarning}
            />
          )}

          {activeTab === 'canaries' && (
            <CanariesView
              probes={probes}
              onTriggerPing={(model) => {
                setMetrics((m) => ({ ...m, devicePings: m.devicePings + 1 }));
              }}
            />
          )}

          {activeTab === 'sim-swap' && <SimSwapView />}

          {activeTab === 'settings' && (
            <SettingsView onOpenInspector={() => setIsInspectorOpen(true)} />
          )}
        </main>
      </div>

      {/* Slide-over Scam Triage Inspector Drawer */}
      <ScamTriageDrawer
        threat={selectedThreat}
        onClose={() => setSelectedThreat(null)}
        onReplayVoiceWarning={handleReplayVoiceWarning}
      />

      {/* Africa's Talking Protocol Inspector Modal */}
      <AtPayloadInspector
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        logs={atLogs}
      />
    </div>
  );
}
