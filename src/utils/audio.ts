import { SWAHILI_AUDIO_BASE64 } from './swahiliAudioBase64';

/**
 * Audio utilities for CHAPAA-GUARD:
 * - Kenyan Swahili voice / audio player
 * - Alert sound FX
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playAlertChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {
    // ignore
  }
}

export interface SwahiliAudioController {
  mode: 'native-sw-tts' | 'dedicated-audio' | 'base64-audio';
  stop: () => void;
}

export function playAuthenticSwahiliWarning(
  text = "Onyo la utapeli. Nambari ya Paybill uliyotumiwa sio ya shule husika. Usilipe pesa zozote.",
  onStart?: () => void,
  onEnd?: () => void
): SwahiliAudioController {
  // 1. Check for authentic native Swahili voice first
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    const voices = window.speechSynthesis.getVoices();
    const swahiliVoice = voices.find(
      (v) => v.lang === 'sw-KE' || v.lang.startsWith('sw') || v.name.includes('Swahili')
    );

    if (swahiliVoice) {
      try {
        window.speechSynthesis.cancel();
        playAlertChime();

        const utterance = new SpeechSynthesisUtterance(
          "Onyo la utapeli. Nambari ya Paybill uliyotumiwa sio ya shule husika. Usilipe pesa zozote."
        );
        utterance.voice = swahiliVoice;
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
          if (onStart) onStart();
        };
        utterance.onend = () => {
          if (onEnd) onEnd();
        };
        utterance.onerror = () => {
          if (onEnd) onEnd();
        };

        window.speechSynthesis.speak(utterance);
        return {
          mode: 'native-sw-tts',
          stop: () => {
            window.speechSynthesis.cancel();
            if (onEnd) onEnd();
          },
        };
      } catch (err) {
        console.warn('SpeechSynthesis error, falling back to dedicated audio:', err);
      }
    }
  }

  // 2. FALLBACK TO DEDICATED AUDIO ELEMENT:
  // If no native Swahili voice exists in browser, fallback to playing a base64 or hosted
  // realistic Kenyan Swahili audio clip (/audio/swahili_warning.mp3) using HTML5 Audio() API
  if (onStart) onStart();
  playAlertChime();

  let audio: HTMLAudioElement | null = null;
  let isCleanedUp = false;

  const handleFinish = () => {
    if (!isCleanedUp) {
      isCleanedUp = true;
      if (onEnd) onEnd();
    }
  };

  try {
    // Try hosted path first
    audio = new Audio('/audio/swahili_warning.mp3');
  } catch {
    audio = new Audio(SWAHILI_AUDIO_BASE64);
  }

  audio.onended = handleFinish;
  audio.onerror = () => {
    // Immediate fallback to self-contained Base64 audio URI
    try {
      const b64Audio = new Audio(SWAHILI_AUDIO_BASE64);
      audio = b64Audio;
      b64Audio.onended = handleFinish;
      b64Audio.onerror = handleFinish;
      b64Audio.play().catch(handleFinish);
    } catch {
      handleFinish();
    }
  };

  audio.play().catch((e) => {
    console.warn('Audio play restricted or autoplay policy:', e);
    // Auto-complete callback if browser blocks audio autoplay
    setTimeout(handleFinish, 4000);
  });

  return {
    mode: 'dedicated-audio',
    stop: () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      handleFinish();
    },
  };
}

const SWAHILI_DIGITS = ['sifuri', 'moja', 'mbili', 'tatu', 'nne', 'tano', 'sita', 'saba', 'nane', 'tisa'];
const ENGLISH_DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

let currentVoice: AudioBufferSourceNode | null = null;

function speakWithBrowser(text: string, lang: 'en' | 'sw') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  const prefix = lang === 'en' ? 'en' : 'sw';
  const chosen =
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ||
    voices[0];
  if (chosen) {
    utterance.voice = chosen;
    utterance.lang = chosen.lang;
  }
  utterance.rate = 0.82;
  utterance.volume = 1;
  synth.cancel();
  synth.speak(utterance);
}

/** Play a spoken recording of the page line. The computer's own voice stays as a backup. */
export function speakAloud(text: string, lang: 'en' | 'sw' = 'sw') {
  if (typeof window === 'undefined') return;
  const ctx = getAudioContext();
  if (ctx) void ctx.resume();
  if (currentVoice) {
    try {
      currentVoice.stop();
    } catch {
      // The previous line already finished.
    }
    currentVoice = null;
  }

  void fetch(`${API_BASE}/api/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language: lang }),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error('no voice');
      const bytes = await response.arrayBuffer();
      const audioCtx = getAudioContext();
      if (!audioCtx) throw new Error('no audio');
      await audioCtx.resume();
      const decoded = await audioCtx.decodeAudioData(bytes.slice(0));
      const source = audioCtx.createBufferSource();
      const gain = audioCtx.createGain();
      gain.gain.value = 1.4;
      source.buffer = decoded;
      source.connect(gain);
      gain.connect(audioCtx.destination);
      currentVoice = source;
      source.onended = () => {
        if (currentVoice === source) currentVoice = null;
      };
      source.start();
    })
    .catch(() => speakWithBrowser(text, lang));
}

export function speakDigits(code: string, lang: 'en' | 'sw' = 'sw') {
  const names = lang === 'en' ? ENGLISH_DIGITS : SWAHILI_DIGITS;
  const lead = lang === 'en' ? 'Type these numbers.' : 'Andika nambari hizi.';
  const words = code
    .split('')
    .map((digit) => names[Number(digit)] || digit)
    .join('. ');
  speakAloud(`${lead} ${words}.`, lang);
}

export function speakSwahiliWarning(
  text = "Onyo la utapeli. Nambari ya Paybill uliyotumiwa sio ya shule husika. Usilipe pesa zozote.",
  onEnd?: () => void
): boolean {
  playAuthenticSwahiliWarning(text, undefined, onEnd);
  return true;
}
