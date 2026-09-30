import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Hand, IdCard, Phone, ScanFace } from 'lucide-react';
import { localError, useLang } from '../lib/i18n';
import { speakAloud, speakDigits } from '../utils/audio';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type Channel = 'sms' | 'call' | 'whatsapp';
type Scenario = 'safe' | 'attack';
type Step = 'phone' | 'channel' | 'kyc' | 'id' | 'selfie' | 'digits' | 'code' | 'done' | 'rejected' | 'blocked';

interface StepLog {
  at: number;
  code: 'checking' | 'clear' | 'flag' | 'sms_sent' | 'sms_skipped' | 'blocked' | 'continue';
}

interface StartResult {
  request_id: string;
  swap_check_status: string;
  risk_level: string;
  liveness_challenge?: string;
  note: string;
  blocked?: boolean;
  steps?: StepLog[];
  recovery_path?: string;
  ussd?: { text: string };
  phone?: string;
}

const LOG_KEY: Record<StepLog['code'], 'logChecking' | 'logClear' | 'logFlag' | 'logSmsSent' | 'logSmsSkipped' | 'logBlocked' | 'logContinue'> = {
  checking: 'logChecking',
  clear: 'logClear',
  flag: 'logFlag',
  sms_sent: 'logSmsSent',
  sms_skipped: 'logSmsSkipped',
  blocked: 'logBlocked',
  continue: 'logContinue',
};

interface SimSwapViewProps {
  recoverId?: string | null;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === 'string') return body.detail;
  } catch {
    // The API sometimes returns plain text.
  }
  return 'The service is not available. Try again.';
}

async function requestCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('blocked');
  }
  const attempts: MediaStreamConstraints[] = [
    { video: true, audio: false },
    { video: { facingMode: 'user' }, audio: false },
  ];
  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function cameraCode(err: unknown): 'blocked' | 'denied' | 'missing' | 'busy' | 'failed' {
  if (err instanceof Error && err.message === 'blocked') return 'blocked';
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError') return 'denied';
  if (name === 'NotFoundError') return 'missing';
  if (name === 'NotReadableError') return 'busy';
  return 'failed';
}

function captureFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Picha haikupatikana.');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export const SimSwapView: React.FC<SimSwapViewProps> = ({ recoverId = null }) => {
  const { lang, t } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<Step>('phone');
  const [consent, setConsent] = useState(false);
  const [phone, setPhone] = useState('+2547');
  const [channel, setChannel] = useState<Channel>('sms');
  const [scenario, setScenario] = useState<Scenario>('safe');
  const [steps, setSteps] = useState<StepLog[]>([]);
  const [ussdText, setUssdText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<StartResult | null>(null);
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [typedChallenge, setTypedChallenge] = useState('');
  const [sandboxCode, setSandboxCode] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [cameraAttempt, setCameraAttempt] = useState(0);

  const cameraOn = step === 'id' || step === 'selfie';

  useEffect(() => {
    if (!cameraOn) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await requestCamera();
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setError(null);
      } catch (err) {
        if (!cancelled) {
          const code = cameraCode(err);
          const text = {
            blocked: t.cameraBlocked,
            denied: t.cameraDenied,
            missing: t.cameraMissing,
            busy: t.cameraBusy,
            failed: t.cameraFailed,
          }[code];
          setError(text);
        }
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [cameraOn, cameraAttempt, t]);

  useEffect(() => {
    if (!recoverId) return;
    void recoverRequest(recoverId);
    // The link is read once. A later render must not open a second face check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoverId]);

  const applyStart = (body: StartResult) => {
    setStarted(body);
    if (body.steps) setSteps(body.steps);
    setUssdText(body.ussd?.text || '');
    if (body.phone) setPhone(body.phone);
    setStep(body.blocked ? 'blocked' : 'kyc');
  };

  const startRequest = async (nextChannel: Channel) => {
    setBusy(true);
    setError(null);
    setChannel(nextChannel);
    try {
      const response = await fetch(`${API_BASE}/api/sim-swap/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          channel: nextChannel,
          consent: true,
          scenario,
          language: lang,
        }),
      });
      if (!response.ok) throw new Error(localError(await readError(response), t));
      applyStart((await response.json()) as StartResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.serviceDown);
    } finally {
      setBusy(false);
    }
  };

  const recoverRequest = async (requestId: string) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/sim-swap/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId }),
      });
      if (!response.ok) throw new Error(localError(await readError(response), t));
      applyStart((await response.json()) as StartResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.serviceDown);
    } finally {
      setBusy(false);
    }
  };

  const submitKyc = async () => {
    if (!started || !idPhoto || !selfie) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/sim-swap/kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: started.request_id,
          id_photo: idPhoto,
          selfie,
          liveness_code: typedChallenge,
          language: lang,
        }),
      });
      if (!response.ok) {
        const message = localError(await readError(response), t);
        if (message.includes('ID photo')) {
          setError(t.noFaceId);
          setStep('id');
          return;
        }
        if (message.includes('selfie') || message.includes('same file')) {
          setError(t.noFaceSelfie);
          setStep('selfie');
          return;
        }
        setError(message);
        setStep('rejected');
        return;
      }
      const body = await response.json();
      setSandboxCode(body.sandbox_code || null);
      setIdPhoto(null);
      setSelfie(null);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.serviceDown);
      setStep('rejected');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!started) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/sim-swap/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: started.request_id, code: confirmCode }),
      });
      if (!response.ok) throw new Error(localError(await readError(response), t));
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.wrongCode);
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setStep('phone');
    setStarted(null);
    setIdPhoto(null);
    setSelfie(null);
    setTypedChallenge('');
    setConfirmCode('');
    setSandboxCode(null);
    setError(null);
  };

  const stepLog = steps.length > 0 && (
    <div className="rounded-3xl bg-[#143028] text-[#f6efe4] p-4 font-mono text-sm flex flex-col gap-1">
      {steps.map((entry) => (
        <p key={`${entry.code}-${entry.at}`}>
          [{entry.at.toFixed(1)}s] {t[LOG_KEY[entry.code]]}
        </p>
      ))}
    </div>
  );

  if (step === 'blocked' && started) {
    const link = `${window.location.origin}${started.recovery_path || ''}`;
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-3xl bg-red-600 text-white p-6 min-h-64 flex flex-col gap-4">
          <Hand className="w-20 h-20" />
          <h1 className="text-4xl font-bold">{t.blockedTitle}</h1>
          <p className="text-2xl">{t.blockedBody}</p>
          <button
            type="button"
            onClick={() => speakAloud(t.blockedBody, lang)}
            className="min-h-14 px-5 rounded-2xl bg-white/20 text-lg font-bold self-start"
          >
            {t.hear}
          </button>
        </div>
        {stepLog}
        {ussdText && (
          <div className="rounded-3xl bg-white border border-slate-300 p-4">
            <p className="text-lg font-bold">{t.ussdTitle}</p>
            <pre className="mt-2 text-xl whitespace-pre-wrap font-sans">{ussdText}</pre>
          </div>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void recoverRequest(started.request_id)}
          className="min-h-16 rounded-2xl bg-slate-900 text-white text-2xl font-bold disabled:opacity-50"
        >
          {t.recoverFace}
        </button>
        <p className="text-base break-all text-slate-600">{link}</p>
        <button type="button" onClick={restart} className="text-lg underline self-start">
          {t.startAgain}
        </button>
      </div>
    );
  }

  if (step === 'rejected') {
    return (
      <div className="rounded-3xl bg-red-600 text-white p-6 min-h-80 flex flex-col gap-4">
        <Hand className="w-20 h-20" />
        <h1 className="text-4xl font-bold">{t.failed}</h1>
        <p className="text-2xl">{t.startAgain}</p>
        {error && <p className="text-lg">{error}</p>}
        <button type="button" onClick={restart} className="min-h-16 rounded-2xl bg-white text-slate-900 text-2xl font-bold">
          {t.startAgain}
        </button>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="rounded-3xl bg-emerald-700 text-white p-6 min-h-80 flex flex-col gap-4">
        <CheckCircle2 className="w-20 h-20" />
        <h1 className="text-4xl font-bold">{t.doneTitle}</h1>
        <p className="text-2xl">{t.doneBody}</p>
        <button
          type="button"
          onClick={() => speakAloud(t.doneSpoken, lang)}
          className="min-h-14 px-5 rounded-2xl bg-white/20 text-lg font-bold self-start"
        >
          {t.hearAgain}
        </button>
      </div>
    );
  }

  if (step === 'phone') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">{t.phoneTitle}</h1>
          <button
            type="button"
            onClick={() => speakAloud(t.phoneSpoken, lang)}
            className="min-h-14 px-4 rounded-2xl bg-white border border-slate-300 text-lg font-bold"
          >
            {t.hear}
          </button>
        </div>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          inputMode="tel"
          className="min-h-16 px-4 rounded-2xl border border-slate-300 text-2xl"
        />
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setScenario('safe')}
            className={`min-h-20 rounded-2xl text-xl font-bold px-3 ${
              scenario === 'safe' ? 'bg-emerald-700 text-white' : 'bg-white border border-slate-300'
            }`}
          >
            {t.scenarioSafe}
          </button>
          <button
            type="button"
            onClick={() => setScenario('attack')}
            className={`min-h-20 rounded-2xl text-xl font-bold px-3 ${
              scenario === 'attack' ? 'bg-red-600 text-white' : 'bg-white border border-slate-300'
            }`}
          >
            {t.scenarioAttack}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setConsent((value) => !value)}
          className={`min-h-20 rounded-2xl text-xl font-bold px-4 text-left ${
            consent ? 'bg-emerald-700 text-white' : 'bg-white border border-slate-300'
          }`}
        >
          {consent ? t.consentOn : t.consentOff}
        </button>
        {error && <p className="text-xl text-red-700">{error}</p>}
        <button
          type="button"
          disabled={!consent || busy}
          onClick={() => void startRequest('sms')}
          className="min-h-16 rounded-2xl bg-slate-900 text-white text-2xl font-bold disabled:opacity-40"
        >
          {t.authorize}
        </button>
      </div>
    );
  }

  if (step === 'channel') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">{t.sendHow}</h1>
        {error && <p className="text-xl text-red-700">{error}</p>}
        <div className="grid gap-3">
          {([
            ['sms', t.messageBtn],
            ['call', t.callBtn],
            ['whatsapp', t.whatsapp],
          ] as Array<[Channel, string]>).map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={busy}
              onClick={() => startRequest(value)}
              className="min-h-20 rounded-3xl bg-slate-900 text-white text-2xl font-bold flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Phone className="w-8 h-8" />
              {label}
            </button>
          ))}
        </div>
        <p className="text-base text-slate-500">{t.whatsappNote}</p>
      </div>
    );
  }

  if (step === 'kyc') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">{t.kycTitle}</h1>
        {stepLog}
        <p className="text-xl leading-snug">{t.kycLead}</p>
        <button
          type="button"
          onClick={() => speakAloud(t.kycSpoken, lang)}
          className="self-start min-h-14 px-4 rounded-2xl bg-white border border-slate-300 text-lg font-bold"
        >
          {t.hear}
        </button>
        <div className="grid gap-3">
          <div className="min-h-20 rounded-3xl bg-[#143028] text-[#f6efe4] px-5 flex items-center gap-4 text-xl font-bold">
            <IdCard className="w-10 h-10 shrink-0" />
            {t.kycId}
          </div>
          <div className="min-h-20 rounded-3xl bg-[#9c2f2f] text-[#f6efe4] px-5 flex items-center gap-4 text-xl font-bold">
            <ScanFace className="w-10 h-10 shrink-0" />
            {t.kycFace}
          </div>
          <div className="min-h-20 rounded-3xl bg-[#c45c26] text-[#f6efe4] px-5 flex items-center gap-4 text-xl font-bold">
            <Phone className="w-10 h-10 shrink-0" />
            {t.kycNumber}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setStep('id')}
          className="min-h-16 rounded-2xl bg-slate-900 text-white text-2xl font-bold"
        >
          {t.kycStart}
        </button>
      </div>
    );
  }

  if (step === 'id' || step === 'selfie') {
    const title = step === 'id' ? t.holdId : t.lookCamera;
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">{title}</h1>
        {started?.risk_level === 'HIGH' && (
          <p className="text-xl text-red-700">{t.recentSwap}</p>
        )}
        {error && <p className="text-xl text-red-700">{error}</p>}
        <div className="rounded-3xl overflow-hidden bg-slate-900 aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
        </div>
        <button
          type="button"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            if (step === 'id') {
              setIdPhoto(captureFrame(video));
              setStep('selfie');
            } else {
              setSelfie(captureFrame(video));
              setStep('digits');
            }
          }}
          className="min-h-16 rounded-2xl bg-slate-900 text-white text-2xl font-bold flex items-center justify-center gap-3"
        >
          <Camera className="w-8 h-8" />
          {t.takePhoto}
        </button>
        <button
          type="button"
          onClick={() => setCameraAttempt((n) => n + 1)}
          className="text-lg underline self-start"
        >
          {t.retryCamera}
        </button>
      </div>
    );
  }

  if (step === 'digits' && started) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">{t.typeNumber}</h1>
        <p className="text-6xl font-bold tracking-widest">{started.liveness_challenge}</p>
        <button
          type="button"
          onClick={() => {
            if (started.liveness_challenge) speakDigits(started.liveness_challenge, lang);
          }}
          className="min-h-14 px-4 rounded-2xl bg-white border border-slate-300 text-lg font-bold self-start"
        >
          {t.hearNumber}
        </button>
        <input
          value={typedChallenge}
          onChange={(event) => setTypedChallenge(event.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          className="min-h-16 px-4 rounded-2xl border border-slate-300 text-3xl tracking-widest"
        />
        {error && <p className="text-xl text-red-700">{error}</p>}
        <button
          type="button"
          disabled={typedChallenge.length !== 4 || busy || !idPhoto || !selfie}
          onClick={submitKyc}
          className="min-h-16 rounded-2xl bg-slate-900 text-white text-2xl font-bold disabled:opacity-40"
        >
          {busy ? t.checking : t.send}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">{t.codeTitle}</h1>
      {sandboxCode && (
        <div className="rounded-3xl bg-amber-100 p-4">
          <p className="text-lg">{t.sandboxNote}</p>
          <p className="text-5xl font-bold tracking-widest mt-2">{sandboxCode}</p>
          <button type="button" onClick={() => speakDigits(sandboxCode, lang)} className="mt-3 text-lg font-bold underline">
            {t.hearNumber}
          </button>
        </div>
      )}
      <input
        value={confirmCode}
        onChange={(event) => setConfirmCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        className="min-h-16 px-4 rounded-2xl border border-slate-300 text-3xl tracking-widest"
      />
      {error && <p className="text-xl text-red-700">{error}</p>}
      <button
        type="button"
        disabled={confirmCode.length !== 6 || busy}
        onClick={confirm}
        className="min-h-16 rounded-2xl bg-emerald-700 text-white text-2xl font-bold disabled:opacity-40"
      >
        {busy ? t.checking : t.finish}
      </button>
    </div>
  );
};
