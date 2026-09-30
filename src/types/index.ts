export type ThreatCategory = 'SCHOOL_FEE' | 'LOAN_SCAM' | 'FAKE_REVERSAL' | 'SAFE';

export interface ThreatLogItem {
  id: string;
  sender_phone: string;
  raw_text: string;
  extracted_entity: string;
  extracted_details: {
    amount?: number | null;
    amount_str?: string | null;
    paybill?: string | null;
    till?: string | null;
    account?: string | null;
    mpesa_code?: string | null;
  };
  category: ThreatCategory | string;
  verdict?: string;
  channel?: string;
  threat_score: number;
  reasons: string[];
  actions_taken: {
    timestamp: string;
    warning_sms: boolean;
    sms_dispatch?: any;
    voice_canary_call: boolean;
    voice_dispatch?: any;
    reasons?: string[];
  };
  created_at: string;
}

export interface ProbeDevice {
  id: string;
  model: string;
  ward: string;
  signal_dbm: number;
  ping_ms: number;
  packet_loss: number;
  status: 'Online' | 'Offline' | 'Warning';
  carrier: string;
  battery: number;
  lastPing: string;
}

export interface KpiMetrics {
  scamsIntercepted: number;
  scamsTrend: string;
  schoolFeeBlocked: number;
  devicePings: number;
  liveCanaries: number;
  messagesChecked?: number;
  likelyScams?: number;
  suspicious?: number;
  clearChecks?: number;
  simChecks?: number;
  kycPassed?: number;
  simCompleted?: number;
}

export interface FraudSpot {
  county: string;
  lat: number;
  lng: number;
  count: number;
  likely: number;
  suspicious: number;
  latestPhone: string;
  latestPaybill: string | null;
  latestAt: string;
}

export interface SimSwapRow {
  id: string;
  phone: string;
  channel: string;
  swap_check_status: string;
  risk_level: string;
  kyc_status: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface AtWebhookLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: 'POST' | 'GET';
  direction: 'INBOUND' | 'OUTBOUND';
  status: number;
  contentType: 'application/json' | 'application/xml' | 'application/x-www-form-urlencoded';
  payload: string;
  description: string;
}
