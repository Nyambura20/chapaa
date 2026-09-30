import { NextResponse } from 'next/server';
import { countyPoint } from '../../../src/lib/counties';
import { prisma } from '../../../src/lib/prisma';

function iso(value: string | null): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.includes('T')) return trimmed;
  return trimmed.replace(' ', 'T');
}

type ThreatRow = {
  id: string;
  sender_phone: string;
  raw_text: string;
  extracted_entity: string | null;
  category: string;
  threat_score: number;
  actions_taken: string;
  created_at: string;
};

type SpamRow = {
  id: string;
  phone: string;
  message_text: string;
  extracted: string;
  verdict: string;
  reasons: string;
  channel: string;
  county: string | null;
  created_at: string;
};

type SwapRow = {
  id: string;
  phone: string;
  channel: string;
  swap_check_status: string;
  risk_level: string;
  kyc_status: string;
  status: string;
  created_at: string;
  completed_at: string | null;
};

type PingRow = {
  id: string;
  device_model: string;
  ward_location: string;
  signal_dbm: number;
  ping_latency_ms: number;
  timestamp: string;
};

function asObject(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  try {
    const parsed = JSON.parse(typeof raw === 'string' ? raw : '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function asList(raw: unknown): Array<Record<string, string>> {
  if (Array.isArray(raw)) return raw as Array<Record<string, string>>;
  try {
    const parsed = JSON.parse(typeof raw === 'string' ? raw : '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function scoreFor(verdict: string): number {
  if (verdict === 'LIKELY_SCAM') return 92;
  if (verdict === 'SUSPICIOUS') return 58;
  return 12;
}

function categoryFor(text: string, verdict: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('school') || lower.includes('fee') || lower.includes('maranda') || lower.includes('karo')) {
    return 'SCHOOL_FEE';
  }
  if (lower.includes('loan') || lower.includes('processing')) return 'LOAN_SCAM';
  if (lower.includes('reverse') || lower.includes('wrong number')) return 'FAKE_REVERSAL';
  if (verdict === 'NO_RED_FLAGS_FOUND') return 'SAFE';
  return 'LOAN_SCAM';
}

async function loadSpamRows(): Promise<SpamRow[]> {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE spam_checks ADD COLUMN county VARCHAR(40)');
  } catch {
    // The column is already present.
  }
  try {
    return await prisma.$queryRawUnsafe<SpamRow[]>(`
      SELECT id, phone, message_text, extracted, verdict, reasons, channel, county,
             CAST(created_at AS TEXT) AS created_at
      FROM spam_checks
      ORDER BY created_at DESC
      LIMIT 200
    `);
  } catch {
    const rows = await prisma.$queryRawUnsafe<Omit<SpamRow, 'county'>[]>(`
      SELECT id, phone, message_text, extracted, verdict, reasons, channel,
             CAST(created_at AS TEXT) AS created_at
      FROM spam_checks
      ORDER BY created_at DESC
      LIMIT 200
    `);
    return rows.map((row) => ({ ...row, county: null }));
  }
}

export async function GET() {
  const spamRows = await loadSpamRows();
  const [swapRows, threats, threatCount, schoolFees, pings, telemetry] = await Promise.all([
    prisma.$queryRawUnsafe<SwapRow[]>(`
      SELECT id, phone, channel, swap_check_status, risk_level, kyc_status, status,
             CAST(created_at AS TEXT) AS created_at,
             CAST(completed_at AS TEXT) AS completed_at
      FROM sim_swap_requests
      ORDER BY created_at DESC
      LIMIT 30
    `),
    prisma.$queryRawUnsafe<ThreatRow[]>(`
      SELECT id, sender_phone, raw_text, extracted_entity, category, threat_score,
             actions_taken, CAST(created_at AS TEXT) AS created_at
      FROM threat_logs
      ORDER BY created_at DESC
      LIMIT 50
    `),
    prisma.threatLog.count(),
    prisma.threatLog.count({ where: { category: 'SCHOOL_FEE' } }),
    prisma.qosTelemetry.count(),
    prisma.$queryRawUnsafe<PingRow[]>(`
      SELECT id, device_model, ward_location, signal_dbm, ping_latency_ms,
             CAST(timestamp AS TEXT) AS timestamp
      FROM qos_telemetry
      ORDER BY timestamp DESC
      LIMIT 200
    `),
  ]);

  const latestByDevice = new Map<string, PingRow>();
  for (const row of telemetry) {
    if (!latestByDevice.has(row.device_model)) latestByDevice.set(row.device_model, row);
  }

  const probes = [...latestByDevice.values()].map((row) => ({
    id: row.id,
    model: row.device_model,
    ward: row.ward_location,
    signal_dbm: row.signal_dbm,
    ping_ms: row.ping_latency_ms,
    packet_loss: 0,
    status: 'Online' as const,
    carrier: '',
    battery: 0,
    lastPing: iso(row.timestamp),
  }));

  const peopleChecks = spamRows.map((row) => {
    const extracted = asObject(row.extracted);
    const paybills = Array.isArray(extracted.paybills) ? extracted.paybills : [];
    const amounts = Array.isArray(extracted.amounts) ? extracted.amounts : [];
    const paybill = typeof paybills[0] === 'string' ? paybills[0] : null;
    const amountStr = typeof amounts[0] === 'string' ? amounts[0] : null;
    const amount = amountStr ? Number(amountStr.replace(/,/g, '')) : null;
    const reasons = asList(row.reasons)
      .map((reason) => reason.sw || reason.en)
      .filter((reason): reason is string => Boolean(reason));
    return {
      id: row.id,
      sender_phone: row.phone,
      raw_text: row.message_text,
      extracted_entity: paybill || 'None',
      extracted_details: {
        paybill,
        amount: Number.isFinite(amount) ? amount : null,
        amount_str: amountStr,
      },
      category: categoryFor(row.message_text, row.verdict),
      verdict: row.verdict,
      channel: row.channel,
      threat_score: scoreFor(row.verdict),
      reasons,
      actions_taken: {
        timestamp: iso(row.created_at),
        warning_sms: row.channel === 'sms',
        voice_canary_call: row.channel === 'call',
        reasons,
      },
      created_at: iso(row.created_at),
      source: 'spam_check',
    };
  });

  const legacy = threats.map((row) => {
      let actions: {
        reasons?: string[];
        timestamp?: string;
        warning_sms?: boolean;
        voice_canary_call?: boolean;
      } = {};
      try {
        actions = JSON.parse(row.actions_taken || '{}');
      } catch {
        actions = {};
      }
      return {
        id: row.id,
        sender_phone: row.sender_phone,
        raw_text: row.raw_text,
        extracted_entity: row.extracted_entity || 'Unknown',
        extracted_details: {
          paybill: row.extracted_entity,
        },
        category: row.category,
        threat_score: row.threat_score,
        reasons: actions.reasons || [],
        actions_taken: {
          timestamp: actions.timestamp || iso(row.created_at),
          warning_sms: Boolean(actions.warning_sms),
          voice_canary_call: Boolean(actions.voice_canary_call),
          ...actions,
        },
        created_at: iso(row.created_at),
        source: 'threat_log',
      };
    });

  const seen = new Set(peopleChecks.map((row) => `${row.sender_phone}|${row.raw_text}`));
  const combined = [
    ...peopleChecks,
    ...legacy.filter((row) => !seen.has(`${row.sender_phone}|${row.raw_text}`)),
  ];

  const likely = spamRows.filter((row) => row.verdict === 'LIKELY_SCAM').length;
  const suspicious = spamRows.filter((row) => row.verdict === 'SUSPICIOUS').length;
  const clear = spamRows.filter((row) => row.verdict === 'NO_RED_FLAGS_FOUND').length;
  const kycPassed = swapRows.filter((row) => row.kyc_status === 'PASSED').length;
  const completed = swapRows.filter((row) => row.status === 'COMPLETED').length;

  const buckets = new Map<string, {
    county: string;
    lat: number;
    lng: number;
    count: number;
    likely: number;
    suspicious: number;
    latestPhone: string;
    latestPaybill: string | null;
    latestAt: string;
  }>();
  for (const row of [...spamRows].reverse()) {
    const place = countyPoint(row.county || '');
    if (!place) continue;
    if (row.verdict !== 'LIKELY_SCAM' && row.verdict !== 'SUSPICIOUS') continue;
    const extracted = asObject(row.extracted);
    const paybills = Array.isArray(extracted.paybills) ? extracted.paybills : [];
    const tills = Array.isArray(extracted.tills) ? extracted.tills : [];
    const paybill = typeof paybills[0] === 'string'
      ? paybills[0]
      : typeof tills[0] === 'string'
        ? tills[0]
        : null;
    const current = buckets.get(place.name) || {
      county: place.name,
      lat: place.lat,
      lng: place.lng,
      count: 0,
      likely: 0,
      suspicious: 0,
      latestPhone: row.phone,
      latestPaybill: paybill,
      latestAt: iso(row.created_at),
    };
    current.count += 1;
    if (row.verdict === 'LIKELY_SCAM') current.likely += 1;
    else current.suspicious += 1;
    current.latestPhone = row.phone;
    current.latestPaybill = paybill;
    current.latestAt = iso(row.created_at);
    buckets.set(place.name, current);
  }
  const hotspots = [...buckets.values()].sort((a, b) => b.count - a.count);

  return NextResponse.json({
    threats: combined,
    swaps: swapRows.map((row) => ({
      id: row.id,
      phone: row.phone,
      channel: row.channel,
      swap_check_status: row.swap_check_status,
      risk_level: row.risk_level,
      kyc_status: row.kyc_status,
      status: row.status,
      created_at: iso(row.created_at),
      completed_at: row.completed_at ? iso(row.completed_at) : null,
    })),
    probes,
    hotspots,
    metrics: {
      scamsIntercepted: spamRows.length || threatCount,
      scamsTrend: '',
      schoolFeeBlocked: peopleChecks.filter((row) => row.category === 'SCHOOL_FEE' && row.verdict === 'LIKELY_SCAM').length || schoolFees,
      devicePings: pings,
      liveCanaries: probes.length,
      messagesChecked: spamRows.length,
      likelyScams: likely,
      suspicious,
      clearChecks: clear,
      simChecks: swapRows.length,
      kycPassed,
      simCompleted: completed,
    },
  });
}
