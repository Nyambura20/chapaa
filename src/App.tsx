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
import { ScamTriageDrawer } from './components/ScamTriageDrawer';
import { AtPayloadInspector } from './components/AtPayloadInspector';
import {
  ThreatLogItem,
  ProbeDevice,
  KpiMetrics,
  AtWebhookLog,
} from './types';
import { playAlertChime, speakSwahiliWarning } from './utils/audio';

const INITIAL_KPI: KpiMetrics = {
  scamsIntercepted: 39,
  scamsTrend: '+14%',
  schoolFeeBlocked: 112,
  devicePings: 1892,
  liveCanaries: 2,
};

const INITIAL_PROBES: ProbeDevice[] = [
  {
    id: 'probe-infinix',
    model: 'Infinix mobility X692-GL',
    ward: 'Changamwe, Mombasa',
    signal_dbm: -78,
    ping_ms: 22,
    packet_loss: 0.02,
    status: 'Online',
    carrier: 'Safaricom 4G/LTE',
    battery: 94,
    lastPing: 'Just now',
  },
  {
    id: 'probe-samsung',
    model: 'Samsung Galaxy A55x',
    ward: 'Westlands, Nairobi',
    signal_dbm: -74,
    ping_ms: 18,
    packet_loss: 0.01,
    status: 'Online',
    carrier: 'Airtel Kenya 4G',
    battery: 88,
    lastPing: '2s ago',
  },
];

const INITIAL_THREATS: ThreatLogItem[] = [
  {
    id: 'th-001',
    sender_phone: '+254718392412',
    raw_text:
      'Dear Parent, pay KES 14,500 Term 3 fees to Paybill 522123 Acc 0178 MARANDA immediately to avoid student being sent home.',
    extracted_entity: '522123',
    extracted_details: {
      amount: 14500,
      amount_str: '14,500',
      paybill: '522123',
      account: '0178 MARANDA',
    },
    category: 'SCHOOL_FEE',
    threat_score: 94,
    reasons: [
      "CRITICAL: Paybill '522123' is registered to an individual line, not Maranda High School.",
      'Urgency coercion detected ("immediately to avoid student being sent home").',
      'Entity flagged on CA/CBK Fraud Watchlist.',
    ],
    actions_taken: {
      timestamp: new Date().toISOString(),
      warning_sms: true,
      voice_canary_call: true,
    },
    created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  },
  {
    id: 'th-002',
    sender_phone: '+254722819200',
    raw_text:
      'CONGRATULATIONS! Your Hustler Fund loan of KES 50,000 is approved. Send KES 1,200 processing fee to Till 98821 to disburse now.',
    extracted_entity: '98821',
    extracted_details: {
      amount: 50000,
      amount_str: '50,000',
      till: '98821',
    },
    category: 'LOAN_SCAM',
    threat_score: 91,
    reasons: [
      'PREDATORY: Advance fee requested before loan disbursement (Violates CBK Act).',
      'Till 98821 reported in 29 smishing incidents across Nairobi & Kisumu.',
    ],
    actions_taken: {
      timestamp: new Date().toISOString(),
      warning_sms: true,
      voice_canary_call: true,
    },
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'th-003',
    sender_phone: '+254701988231',
    raw_text:
      'Confirmed. You have received Ksh 3,850 from MARY WANJIKU. Wait, I sent by mistake to wrong number, kindly reverse to 0701988231.',
    extracted_entity: '3850',
    extracted_details: {
      amount: 3850,
      amount_str: '3,850',
      account: '0701988231',
    },
    category: 'FAKE_REVERSAL',
    threat_score: 84,
    reasons: [
      'FAKE REVERSAL: Social engineering attempt to induce panic refund of phantom funds.',
      'Sender MSISDN mismatch with Safaricom MPESA official header.',
    ],
    actions_taken: {
      timestamp: new Date().toISOString(),
      warning_sms: true,
      voice_canary_call: false,
    },
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
];

const INITIAL_AT_LOGS: AtWebhookLog[] = [
  {
    id: 'log-1',
    timestamp: new Date().toISOString(),
    endpoint: '/api/webhooks/at/incoming-sms',
    method: 'POST',
    direction: 'INBOUND',
    status: 200,
    contentType: 'application/x-www-form-urlencoded',
    description: "Africa's Talking Inbound SMS Forwarding to Shortcode 20880",
    payload: `from=%2B254718392412&to=20880&text=Dear+Parent%2C+pay+KES+14%2C500+Term+3+fees+to+Paybill+522123+Acc+0178+MARANDA&date=2026-09-28+12%3A40%3A12&id=ATXid_982938174`,
  },
  {
    id: 'log-2',
    timestamp: new Date().toISOString(),
    endpoint: '/api/webhooks/at/voice-callback',
    method: 'POST',
    direction: 'OUTBOUND',
    status: 200,
    contentType: 'application/xml',
    description: "AT Voice XML <Play> for the Swahili scam warning",
    payload: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play url="https://raw.githubusercontent.com/africastalking/voice-samples/master/swahili_fraud_warning.mp3"/>
</Response>`,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavView>('dashboard');
  const [metrics, setMetrics] = useState<KpiMetrics>(INITIAL_KPI);
  const [probes, setProbes] = useState<ProbeDevice[]>(INITIAL_PROBES);
  const [threats, setThreats] = useState<ThreatLogItem[]>(INITIAL_THREATS);
  const [selectedThreat, setSelectedThreat] = useState<ThreatLogItem | null>(null);

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [atLogs, setAtLogs] = useState<AtWebhookLog[]>(INITIAL_AT_LOGS);

  // Periodic Telemetry Simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        devicePings: prev.devicePings + 1,
      }));
      setProbes((prev) =>
        prev.map((p) => ({
          ...p,
          ping_ms: Math.max(16, Math.min(36, p.ping_ms + (Math.random() > 0.5 ? 1 : -1))),
          signal_dbm: Math.max(-86, Math.min(-70, p.signal_dbm + (Math.random() > 0.5 ? 1 : -1))),
        }))
      );
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // Attack Simulator Trigger
  const handleTriggerAttack = async (text: string, phone: string) => {
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
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          threatCount={threats.length}
        />

        {/* Scrollable Main View Container with smooth transition */}
        <main className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              metrics={metrics}
              threats={threats}
              onSelectThreat={(t) => setSelectedThreat(t)}
              onTriggerAttack={handleTriggerAttack}
              onNavigateToView={(v) => setActiveTab(v as NavView)}
            />
          )}

          {activeTab === 'qos' && (
            <QosView
              probes={probes}
              onTriggerPing={(model) => {
                setMetrics((m) => ({ ...m, devicePings: m.devicePings + 1 }));
              }}
            />
          )}

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
