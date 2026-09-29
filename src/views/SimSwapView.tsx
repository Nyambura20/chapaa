import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, ShieldAlert, Smartphone } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type Step = 'details' | 'camera' | 'code' | 'done';
type Channel = 'sms' | 'call' | 'whatsapp';

interface StartResult {
  request_id: string;
  swap_check_status: string;
  risk_level: string;
  liveness_challenge: string;
  check_mode?: string;
  note: string;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === 'string') return body.detail;
  } catch {
    // The API sometimes returns plain text.
  }
  return 'The request failed. Check that the API on port 8000 is running.';
}

function captureFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Camera capture failed.');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export const SimSwapView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<Step>('details');
  const [consent, setConsent] = useState(false);
  const [phone, setPhone] = useState('+254712345678');
  const [channel, setChannel] = useState<Channel>('sms');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<StartResult | null>(null);
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [typedChallenge, setTypedChallenge] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [sandboxCode, setSandboxCode] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [doneMessage, setDoneMessage] = useState('');

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const openCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  };

  const startRequest = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/sim-swap/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, channel, consent }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const body = (await response.json()) as StartResult;
      setStarted(body);
      setStep('camera');
      await openCamera();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the request.');
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
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const body = await response.json();
      setScore(body.similarity_score);
      setSandboxCode(body.sandbox_code || null);
      setIdPhoto(null);
      setSelfie(null);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Face check failed.');
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
      if (!response.ok) throw new Error(await readError(response));
      const body = await response.json();
      setDoneMessage(body.message);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl flex flex-col gap-5">
      <div>
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-slate-700" />
          SIM Swap Check
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          A recent SIM change raises the risk. The webcam then checks that the face matches the ID photo.
          This demo records the result only. It does not ask Safaricom or Airtel to swap the SIM.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">{error}</div>
      )}

      {step === 'details' && (
        <div className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col gap-4">
          <label className="flex items-start gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              I agree to a one-time camera check. The photos are compared and then discarded. Only the score is saved.
            </span>
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs text-slate-600 flex flex-col gap-1">
              Phone number
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 font-mono text-slate-900"
              />
            </label>
            <label className="text-xs text-slate-600 flex flex-col gap-1">
              Send the code by
              <select
                value={channel}
                onChange={(event) => setChannel(event.target.value as Channel)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-900"
              >
                <option value="sms">SMS</option>
                <option value="call">Phone call</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </label>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            Sandbox tip: a number ending in 999 is treated as a recent SIM swap.
          </p>
          <button
            onClick={startRequest}
            disabled={!consent || busy}
            className="self-start px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-bold disabled:opacity-50"
          >
            {busy ? 'Checking SIM...' : 'Check SIM and open camera'}
          </button>
        </div>
      )}

      {step === 'camera' && started && (
        <div className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 text-[11px] font-mono">
            <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200">
              Network status: {started.swap_check_status}
            </span>
            <span
              className={`px-2 py-1 rounded border ${
                started.risk_level === 'HIGH'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              Risk: {started.risk_level}
            </span>
          </div>
          <p className="text-xs text-slate-600">{started.note}</p>
          <div className="rounded-xl overflow-hidden bg-slate-900 aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-sm">
            Read this number, then type it below: <strong className="font-mono text-lg">{started.liveness_challenge}</strong>
          </div>
          <input
            value={typedChallenge}
            onChange={(event) => setTypedChallenge(event.target.value)}
            inputMode="numeric"
            maxLength={4}
            placeholder="4-digit challenge"
            className="px-3 py-2 rounded-lg border border-slate-200 font-mono w-40"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => videoRef.current && setIdPhoto(captureFrame(videoRef.current))}
              className="px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              {idPhoto ? 'ID photo captured' : 'Capture ID photo'}
            </button>
            <button
              onClick={() => videoRef.current && setSelfie(captureFrame(videoRef.current))}
              className="px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              {selfie ? 'Selfie captured' : 'Capture live selfie'}
            </button>
            <button
              onClick={submitKyc}
              disabled={!idPhoto || !selfie || typedChallenge.length !== 4 || busy}
              className="px-3 py-2 rounded-lg bg-sky-600 text-white text-xs font-bold disabled:opacity-50"
            >
              {busy ? 'Comparing faces...' : 'Submit face check'}
            </button>
          </div>
        </div>
      )}

      {step === 'code' && (
        <div className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-emerald-800 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            Face check passed{score !== null ? ` (${score})` : ''}. Enter the code sent by {channel}.
          </div>
          {sandboxCode && (
            <p className="text-xs text-slate-600">
              Sandbox mode did not reach a real handset. Use code <strong className="font-mono">{sandboxCode}</strong>.
            </p>
          )}
          <input
            value={confirmCode}
            onChange={(event) => setConfirmCode(event.target.value)}
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            className="px-3 py-2 rounded-lg border border-slate-200 font-mono w-40"
          />
          <button
            onClick={confirm}
            disabled={confirmCode.length !== 6 || busy}
            className="self-start px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
          >
            {busy ? 'Checking code...' : 'Complete simulated swap'}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">Request marked COMPLETED</p>
            <p className="text-xs text-emerald-800 mt-1">{doneMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};
