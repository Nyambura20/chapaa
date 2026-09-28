export type ThreatCategory = 'SCHOOL_FEE' | 'LOAN_SCAM' | 'FAKE_REVERSAL' | 'SAFE';

export type PosStatus = 'IDLE' | 'CALLING' | 'AUTHENTICATED' | 'REJECTED';

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
  category: ThreatCategory;
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

export interface PosTransactionItem {
  id: string;
  merchant_id: string;
  customer_phone: string;
  amount: number;
  auth_token?: string | null;
  status: PosStatus;
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
  posHandshakes: number;
  devicePings: number;
  liveCanaries: number;
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
