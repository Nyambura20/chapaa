import React, { useEffect, useRef, useState } from 'react';
import { Hand, HelpCircle, MessageSquare, Mic, Phone } from 'lucide-react';
import { COUNTIES } from '../lib/counties';
import { localError, useLang } from '../lib/i18n';
import { speakAloud } from '../utils/audio';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const SAMPLE =
  'Dear Parent, pay KES 14,500 Term 3 fees to Paybill 522123 Acc 0178 MARANDA.';

type Verdict = 'LIKELY_SCAM' | 'SUSPICIOUS' | 'NO_RED_FLAGS_FOUND';
type Step = 'paste' | 'channel' | 'result';

interface CheckResult {
  verdict: Verdict;
  advice_sw: string;
  advice_en: string;
  reasons: Array<{ sw: string; en: string }>;
  dispatch_mode?: string;
  model_read?: boolean;
}

interface HeardEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

interface HeardSession {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: HeardEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function browserListener(): HeardSession | null {
  if (typeof window === 'undefined') return null;
  const host = window as Window & {
    SpeechRecognition?: new () => HeardSession;
    webkitSpeechRecognition?: new () => HeardSession;
  };
  const Maker = host.SpeechRecognition || host.webkitSpeechRecognition;
  return Maker ? new Maker() : null;
}

const LOOK: Record<Verdict, { bg: string; icon: React.ElementType; title: 'doNotPay' | 'askThem' | 'stillAsk' }> = {
  LIKELY_SCAM: { bg: 'bg-red-600 text-white', icon: Hand, title: 'doNotPay' },
  SUSPICIOUS: { bg: 'bg-amber-500 text-slate-950', icon: HelpCircle, title: 'askThem' },
  NO_RED_FLAGS_FOUND: { bg: 'bg-slate-700 text-white', icon: HelpCircle, title: 'stillAsk' },
};

export const SpamCheckView: React.FC = () => {
  const { lang, t } = useLang();
  const [step, setStep] = useState<Step>('paste');
  const [message, setMessage] = useState('');
  const [county, setCounty] = useState('');
  const [phone, setPhone] = useState('+2547');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [recording, setRecording] = useState(false);
  const [writing, setWriting] = useState(false);
  const listenerRef = useRef<HeardSession | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const heardRef = useRef('');
  const micErrorRef = useRef<string | null>(null);

  const readError = async (response: Response): Promise<string> => {
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') return localError(body.detail, t);
    } catch {
      // plain text
    }
    return t.serviceDown;
  };

  const transcribe = async (blob: Blob) => {
    setWriting(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', blob, 'message.webm');
      body.append('language', lang);
      const response = await fetch(`${API_BASE}/api/transcribe`, { method: 'POST', body });
      if (!response.ok) throw new Error(await readError(response));
      const payload = (await response.json()) as { text?: string };
      const heard = (payload.text || '').trim();
      if (!heard) throw new Error(t.heardNothing);
      setMessage(heard);
    } catch (err) {
      const detail = err instanceof Error ? err.message : t.heardNothing;
      setError(detail);
    } finally {
      setWriting(false);
    }
  };

  const finishHeard = (text: string) => {
    const heard = text.trim();
    if (!heard) {
      setError(t.heardNothing);
      return;
    }
    setMessage(heard);
    setError(null);
  };

  const startBrowserListener = () => {
    const listener = browserListener();
    if (!listener) return false;
    heardRef.current = '';
    micErrorRef.current = null;
    listener.lang = lang === 'en' ? 'en-KE' : 'sw-KE';
    listener.continuous = true;
    listener.interimResults = true;
    listener.onresult = (event) => {
      let spoken = '';
      for (let index = 0; index < event.results.length; index += 1) {
        spoken += event.results[index][0].transcript;
      }
      heardRef.current = spoken.trim();
      if (heardRef.current) setMessage(heardRef.current);
    };
    listener.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      const detail = event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture'
        ? t.micDenied
        : t.serviceDown;
      micErrorRef.current = detail;
      setError(detail);
      setRecording(false);
    };
    listener.onend = () => {
      setRecording(false);
      if (micErrorRef.current) return;
      finishHeard(heardRef.current);
    };
    listenerRef.current = listener;
    try {
      listener.start();
      setRecording(true);
      return true;
    } catch {
      return false;
    }
  };

  const startRecording = async () => {
    setError(null);
    if (startBrowserListener()) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(t.micDenied);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        void transcribe(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError(t.micDenied);
    }
  };

  useEffect(() => {
    return () => {
      const listener = listenerRef.current;
      if (!listener) return;
      listener.onend = null;
      listener.onerror = null;
      listener.onresult = null;
      try {
        listener.stop();
      } catch {
        // The listener had already stopped.
      }
    };
  }, []);

  const stopRecording = () => {
    const listener = listenerRef.current;
    if (listener) listener.stop();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    setRecording(false);
  };

  const submit = async (channel: 'sms' | 'call') => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/spam-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message, channel, language: lang, county }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const body = (await response.json()) as CheckResult;
      setResult(body);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.serviceDown);
    } finally {
      setBusy(false);
    }
  };

  if (step === 'result' && result) {
    const look = LOOK[result.verdict];
    const Icon = look.icon;
    const title = t[look.title];
    const advice = lang === 'en' ? result.advice_en : result.advice_sw;
    return (
      <div className={`rounded-3xl p-6 min-h-80 flex flex-col gap-4 ${look.bg}`}>
        <Icon className="w-20 h-20" />
        <h1 className="text-4xl font-bold">{title}</h1>
        <p className="text-2xl leading-snug">{advice}</p>
        {result.reasons.length > 0 && (
          <ul className="text-lg list-disc pl-5">
            {result.reasons.slice(0, 3).map((reason) => (
              <li key={`${reason.en}-${reason.sw}`}>{lang === 'en' ? reason.en : reason.sw}</li>
            ))}
          </ul>
        )}
        {result.model_read && <p className="text-lg">{t.modelRead}</p>}
        <div className="flex flex-wrap gap-3 mt-2">
          <button
            type="button"
            onClick={() => speakAloud(`${title}. ${advice}`, lang)}
            className="min-h-14 px-5 rounded-2xl bg-white/20 text-lg font-bold"
          >
            {t.hearAgain}
          </button>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setMessage('');
              setStep('paste');
            }}
            className="min-h-14 px-5 rounded-2xl bg-white text-slate-900 text-lg font-bold"
          >
            {t.another}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'channel') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">{t.channelTitle}</h1>
          <button
            type="button"
            onClick={() => speakAloud(t.channelSpoken, lang)}
            className="min-h-14 px-4 rounded-2xl bg-white border border-slate-300 text-lg font-bold"
          >
            {t.hear}
          </button>
        </div>
        {message.trim() && (
          <p className="rounded-3xl bg-white border border-slate-300 p-4 text-xl">{message}</p>
        )}
        {county && <p className="text-xl font-semibold">{county}</p>}
        <label className="text-xl font-semibold flex flex-col gap-2">
          {t.yourNumber}
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            className="min-h-16 px-4 rounded-2xl border border-slate-300 text-2xl"
          />
        </label>
        {error && <p className="text-xl text-red-700">{error}</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => submit('sms')}
            className="min-h-36 rounded-3xl bg-slate-900 text-white text-2xl font-bold flex flex-col items-center justify-center gap-2 disabled:opacity-50"
          >
            <MessageSquare className="w-12 h-12" />
            {t.messageBtn}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => submit('call')}
            className="min-h-36 rounded-3xl bg-sky-700 text-white text-2xl font-bold flex flex-col items-center justify-center gap-2 disabled:opacity-50"
          >
            <Phone className="w-12 h-12" />
            {t.callBtn}
          </button>
        </div>
        <button type="button" onClick={() => setStep('paste')} className="text-lg underline self-start">
          {t.back}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t.pasteTitle}</h1>
        <button
          type="button"
          onClick={() => speakAloud(t.pasteSpoken, lang)}
          className="min-h-14 px-4 rounded-2xl bg-white border border-slate-300 text-lg font-bold"
        >
          {t.hear}
        </button>
      </div>
      <button
        type="button"
        disabled={writing}
        onClick={() => (recording ? stopRecording() : void startRecording())}
        className={`min-h-36 rounded-3xl text-2xl font-bold flex flex-col items-center justify-center gap-2 ${
          recording ? 'bg-red-600 text-white' : 'bg-[#9c2f2f] text-[#f6efe4]'
        } disabled:opacity-50`}
      >
        <Mic className="w-14 h-14" />
        {writing ? t.writingMessage : recording ? t.recording : t.record}
      </button>
      {error && <p className="text-xl text-red-700">{error}</p>}
      <label className="text-xl font-semibold flex flex-col gap-2">
        {t.countyLabel}
        <select
          value={county}
          onChange={(event) => setCounty(event.target.value)}
          className="min-h-16 px-4 rounded-2xl border border-slate-300 text-2xl bg-white"
        >
          <option value="">{t.countyLabel}</option>
          {COUNTIES.map((place) => (
            <option key={place.name} value={place.name}>
              {place.name}
            </option>
          ))}
        </select>
      </label>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        className="min-h-48 w-full rounded-3xl border border-slate-300 p-4 text-xl"
        placeholder={t.pastePlaceholder}
      />
      <button type="button" onClick={() => setMessage(SAMPLE)} className="self-start text-lg underline">
        {t.trySample}
      </button>
      <button
        type="button"
        disabled={!message.trim() || !county}
        onClick={() => {
          if (!county) {
            setError(t.needCounty);
            return;
          }
          setError(null);
          setStep('channel');
        }}
        className="min-h-16 rounded-2xl bg-slate-900 text-white text-2xl font-bold disabled:opacity-40"
      >
        {t.next}
      </button>
    </div>
  );
};
