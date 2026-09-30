'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'en' | 'sw';

const STRINGS = {
  en: {
    navHome: 'Home',
    navMessage: 'Message',
    navSim: 'SIM',
    hear: 'Hear',
    hearAgain: 'Hear again',
    hearNumber: 'Hear the number',
    homeTitle: 'What do you need?',
    homeSpoken: 'What do you need? Check a message, or check a SIM.',
    checkTitle: 'Check a message',
    checkHint: 'Before you pay',
    swapTitle: 'Check a SIM',
    swapHint: 'With your face',
    staff: 'Staff',
    backHome: 'Back to start',
    pasteTitle: 'Paste the message',
    pasteSpoken: 'Paste the message, or press the button and read it aloud.',
    pastePlaceholder: 'Put the message here',
    trySample: 'Try an example',
    next: 'Continue',
    back: 'Back',
    channelTitle: 'How should we answer?',
    channelSpoken: 'Type your number. Choose a message, or a call.',
    yourNumber: 'Your number',
    messageBtn: 'Message',
    callBtn: 'Call',
    another: 'Another message',
    doNotPay: 'Do not pay',
    askThem: 'Ask them yourself',
    stillAsk: 'Still ask',
    phoneTitle: 'Phone number',
    phoneSpoken: 'Type your number. Then allow the camera.',
    consentOn: 'Camera allowed',
    consentOff: 'Allow the camera. Photos are not saved.',
    sendHow: 'How should we send the code?',
    whatsapp: 'WhatsApp',
    whatsappNote: 'WhatsApp is recorded here. It is not sent yet.',
    holdId: 'Hold your ID',
    lookCamera: 'Look at the camera',
    idSpoken: 'Hold your ID in front of the camera. Then take a photo.',
    selfieSpoken: 'Look at the camera. Take a photo of your face.',
    takePhoto: 'Take photo',
    retryCamera: 'Try the camera again',
    recentSwap: 'This SIM was changed recently.',
    typeNumber: 'Type the number',
    checking: 'Checking...',
    send: 'Send',
    finish: 'Finish',
    failed: 'Not accepted',
    startAgain: 'Start again',
    doneTitle: 'Finished',
    doneBody: 'The network did not change the SIM. This is only a record.',
    doneSpoken: 'Finished. The network did not change the SIM.',
    noFaceId: 'No face on the ID. Take the photo again.',
    noFaceSelfie: 'No face. Look at the camera and try again.',
    tryAgainSpoken: 'Not accepted. Start again.',
    codeTitle: 'Type the new number',
    sandboxNote: 'The phone was not called. Use this number.',
    wrongCode: 'That number is wrong.',
    serviceDown: 'The service is not available. Try again.',
    cameraBlocked: 'Open this page on localhost. The camera is blocked.',
    cameraDenied: 'Allow the camera, then try again.',
    cameraMissing: 'This device has no camera.',
    cameraBusy: 'The camera is in use. Close the other app, then try again.',
    cameraFailed: 'The camera did not open.',
    typeThese: 'Type these numbers.',
    landingKicker: 'For people in Kenya',
    landingTitle: 'Chapaa keeps your money and your line safe.',
    landingSpoken: 'Chapaa does two things. We check a message before you pay. And before a SIM change, we check that the face matches the ID.',
    landingWhat: 'What we do',
    step1: 'You paste the message.',
    step2: 'We answer by text or by a call.',
    step3: 'A SIM change needs an identity check.',
    kycTitle: 'Identity check',
    kycLead: 'A SIM change is allowed here only after this check. We compare your ID and your live face. Photos are not saved.',
    kycSpoken: 'This is the identity check. First your ID. Then your face. Then a number you hear.',
    kycId: 'A photo of your ID',
    kycFace: 'A photo of your face',
    kycNumber: 'A number you hear and type',
    kycStart: 'Start the identity check',
    badPhone: 'Use the full number, starting with +254.',
    badChallenge: 'That number does not match. Start again.',
    badFace: 'The faces do not match. Start again.',
    codeExpired: 'That code has expired. Start again.',
    needConsent: 'Allow the camera first.',
    needMessage: 'Paste the message first.',
    needCounty: 'Choose your county first.',
    countyLabel: 'Your county',
    fraudReports: 'scam reports',
    mapMany: '5 or more reports',
    mapSome: '2 to 4 reports',
    mapOne: '1 report',
    emptyMap: 'No county has a scam report yet. Check a message and choose a county.',
    navDash: 'Dashboard',
    navThreats: 'Threats',
    navQos: 'Network',
    navCanaries: 'Devices',
    navSettings: 'Settings',
    staffModules: 'Staff pages',
    headerLine: 'Fraud defense and network quality',
    dashSmishing: 'Dangerous messages',
    dashFees: 'School-fee scams stopped',
    dashProbes: 'Connected devices',
    dashStream: 'Messages we have checked',
    dashStreamHint: 'Saved after the check',
    pageThreats: 'Threat list',
    pageThreatsHint: 'Each message, the score, and why it was flagged',
    pageQos: 'Where scams are reported',
    pageQosHint: 'Counties with scam and suspicious messages people checked',
    pageCanaries: 'Field devices',
    pageCanariesHint: 'A device shows here after it sends a ping',
    pageSettings: 'Phone settings',
    pageSettingsHint: 'Africa\'s Talking keys and callback addresses',
    highPriority: 'High priority',
    devicesOnline: 'devices',
    sendPing: 'Send a ping',
    dashChecked: 'Messages people checked',
    dashLikely: 'Marked as a scam',
    dashIdentity: 'Identity checks',
    dashPassed: 'faces matched',
    dashSwaps: 'SIM checks from people',
    emptyChecks: 'No checks yet. Use Check a message on the home screen.',
    viewAll: 'View all',
    modelRead: 'A second reader also looked at this.',
    record: 'Read it aloud',
    recording: 'Listening',
    writingMessage: 'Writing the message',
    heardNothing: 'No words were heard. Read it again.',
    micDenied: 'Allow the microphone, then try again.',
    scenarioSafe: 'Safe line',
    scenarioAttack: 'SIM swap attack',
    authorize: 'Authorize',
    logChecking: 'Checking the line',
    logClear: 'No recent SIM swap',
    logFlag: 'Recent SIM swap found',
    logSmsSent: 'Warning text sent',
    logSmsSkipped: 'No warning text',
    logBlocked: 'Attempt blocked',
    logContinue: 'Continue to the identity check',
    blockedTitle: 'Blocked',
    blockedBody: 'A recent SIM swap was found. The network was not asked to swap the SIM.',
    recoverFace: 'Face check',
    ussdTitle: 'Recovery menu',
  },
  sw: {
    navHome: 'Nyumbani',
    navMessage: 'Ujumbe',
    navSim: 'Laini',
    hear: 'Sikia',
    hearAgain: 'Sikia tena',
    hearNumber: 'Sikia nambari',
    homeTitle: 'Unahitaji msaada gani?',
    homeSpoken: 'Unahitaji msaada gani? Angalia ujumbe, au badilisha laini.',
    checkTitle: 'Angalia ujumbe',
    checkHint: 'Kabla ya kulipa',
    swapTitle: 'Badilisha laini',
    swapHint: 'Kwa uso wako',
    staff: 'Ofisi',
    backHome: 'Rudi mwanzo',
    pasteTitle: 'Bandika ujumbe',
    pasteSpoken: 'Bandika ujumbe, au bonyeza kitufe na usome kwa sauti.',
    pastePlaceholder: 'Weka ujumbe hapa',
    trySample: 'Jaribu mfano',
    next: 'Endelea',
    back: 'Rudi',
    channelTitle: 'Utapata jibu vipi?',
    channelSpoken: 'Andika nambari yako. Chagua ujumbe, au simu.',
    yourNumber: 'Nambari yako',
    messageBtn: 'Ujumbe',
    callBtn: 'Simu',
    another: 'Ujumbe mwingine',
    doNotPay: 'Usitume pesa',
    askThem: 'Uliza wenyewe',
    stillAsk: 'Bado uliza',
    phoneTitle: 'Nambari ya simu',
    phoneSpoken: 'Andika nambari yako. Kisha kubali kamera.',
    consentOn: 'Umekubali kamera',
    consentOff: 'Kubali kamera. Picha hazihifadhiwi.',
    sendHow: 'Nambari itumwe vipi?',
    whatsapp: 'WhatsApp',
    whatsappNote: 'WhatsApp inarekodiwa hapa. Haitumwi bado.',
    holdId: 'Shikilia kitambulisho',
    lookCamera: 'Angalia kamera',
    idSpoken: 'Shikilia kitambulisho mbele ya kamera. Kisha piga picha.',
    selfieSpoken: 'Angalia kamera. Piga picha ya uso wako.',
    takePhoto: 'Piga picha',
    retryCamera: 'Jaribu kamera tena',
    recentSwap: 'Laini hii imebadilishwa hivi karibuni.',
    typeNumber: 'Andika nambari',
    checking: 'Inaangalia...',
    send: 'Tuma',
    finish: 'Maliza',
    failed: 'Haijafanikiwa',
    startAgain: 'Anza tena',
    doneTitle: 'Imemalizika',
    doneBody: 'Mtandao haujabadilisha laini. Hii ni kumbukumbu tu.',
    doneSpoken: 'Imemalizika. Mtandao haujabadilisha laini.',
    noFaceId: 'Hakuna uso kwenye kitambulisho. Piga picha tena.',
    noFaceSelfie: 'Hakuna uso. Angalia kamera na piga picha tena.',
    tryAgainSpoken: 'Haijafanikiwa. Anza tena.',
    codeTitle: 'Andika nambari mpya',
    sandboxNote: 'Simu haijapigwa. Tumia nambari hii.',
    wrongCode: 'Nambari si sahihi.',
    serviceDown: 'Huduma haipatikani. Jaribu tena.',
    cameraBlocked: 'Fungua ukurasa huu kwenye localhost. Kamera imezuiwa.',
    cameraDenied: 'Ruhusu kamera, kisha jaribu tena.',
    cameraMissing: 'Hakuna kamera kwenye kifaa hiki.',
    cameraBusy: 'Kamera inatumika. Funga programu nyingine, kisha jaribu tena.',
    cameraFailed: 'Kamera haikufunguka.',
    typeThese: 'Andika nambari hizi.',
    landingKicker: 'Kwa watu wa Kenya',
    landingTitle: 'Chapaa inalinda pesa yako na laini yako.',
    landingSpoken: 'Chapaa inafanya mambo mawili. Tunakagua ujumbe kabla hujalipa. Na kabla ya kubadili laini, tunalinganisha uso na kitambulisho.',
    landingWhat: 'Tunafanya nini',
    step1: 'Unabandika ujumbe.',
    step2: 'Tunajibu kwa ujumbe au kwa simu.',
    step3: 'Kubadili laini kunahitaji utambulisho.',
    kycTitle: 'Utambulisho',
    kycLead: 'Laini inabadilishwa hapa tu baada ya ukaguzi huu. Tunalinganisha kitambulisho na uso wako wa moja kwa moja. Picha hazihifadhiwi.',
    kycSpoken: 'Huu ni ukaguzi wa utambulisho. Kwanza kitambulisho. Kisha uso wako. Kisha nambari unayosikia.',
    kycId: 'Picha ya kitambulisho',
    kycFace: 'Picha ya uso wako',
    kycNumber: 'Nambari unayosikia na kuandika',
    kycStart: 'Anza utambulisho',
    badPhone: 'Tumia nambari kamili, ianze na +254.',
    badChallenge: 'Nambari hiyo hailingani. Anza tena.',
    badFace: 'Nyuso hazilingani. Anza tena.',
    codeExpired: 'Nambari imeisha muda. Anza tena.',
    needConsent: 'Kubali kamera kwanza.',
    needMessage: 'Bandika ujumbe kwanza.',
    needCounty: 'Chagua kaunti kwanza.',
    countyLabel: 'Kaunti yako',
    fraudReports: 'ripoti za utapeli',
    mapMany: 'Ripoti 5 au zaidi',
    mapSome: 'Ripoti 2 hadi 4',
    mapOne: 'Ripoti 1',
    emptyMap: 'Hakuna kaunti yenye ripoti ya utapeli bado. Angalia ujumbe na uchague kaunti.',
    navDash: 'Dashibodi',
    navThreats: 'Vitisho',
    navQos: 'Mtandao',
    navCanaries: 'Vifaa',
    navSettings: 'Mipangilio',
    staffModules: 'Kurasa za ofisi',
    headerLine: 'Ulinzi wa utapeli na ubora wa mtandao',
    dashSmishing: 'Ujumbe hatari',
    dashFees: 'Utapeli wa karo uliozuiwa',
    dashProbes: 'Vifaa vilivyounganishwa',
    dashStream: 'Ujumbe tuliokagua',
    dashStreamHint: 'Vimehifadhiwa baada ya ukaguzi',
    pageThreats: 'Orodha ya vitisho',
    pageThreatsHint: 'Kila ujumbe, alama, na sababu',
    pageQos: 'Sehemu za utapeli',
    pageQosHint: 'Kaunti zenye ujumbe wa utapeli na ule unaotiliwa shaka',
    pageCanaries: 'Vifaa vya uwandani',
    pageCanariesHint: 'Kifaa kinaonekana hapa baada ya kutuma ishara',
    pageSettings: 'Mipangilio ya simu',
    pageSettingsHint: 'Funguo za Africa\'s Talking na anwani za majibu',
    highPriority: 'Kipaumbele cha juu',
    devicesOnline: 'vifaa',
    sendPing: 'Tuma ishara',
    dashChecked: 'Ujumbe waliokagua',
    dashLikely: 'Yaliyoonekana utapeli',
    dashIdentity: 'Ukaguzi wa utambulisho',
    dashPassed: 'nyuso zilizolingana',
    dashSwaps: 'Ukaguzi wa laini kutoka kwa watu',
    emptyChecks: 'Hakuna ukaguzi bado. Tumia Angalia ujumbe mwanzo.',
    viewAll: 'Ona vyote',
    modelRead: 'Msomaji wa pili pia ameangalia hii.',
    record: 'Soma kwa sauti',
    recording: 'Tunasikiliza',
    writingMessage: 'Tunaandika ujumbe',
    heardNothing: 'Hatukusikia maneno. Soma tena.',
    micDenied: 'Ruhusu kipaza sauti, kisha jaribu tena.',
    scenarioSafe: 'Laini salama',
    scenarioAttack: 'Laini imebadilishwa',
    authorize: 'Ruhusu',
    logChecking: 'Inakagua laini',
    logClear: 'Laini haijabadilishwa hivi karibuni',
    logFlag: 'Laini imebadilishwa hivi karibuni',
    logSmsSent: 'Ujumbe wa onyo umetumwa',
    logSmsSkipped: 'Hakuna ujumbe wa onyo',
    logBlocked: 'Jaribio limezuiwa',
    logContinue: 'Endelea na utambulisho',
    blockedTitle: 'Imezuiwa',
    blockedBody: 'Laini imebadilishwa hivi karibuni. Mtandao haujaombwa kubadili SIM.',
    recoverFace: 'Ukaguzi wa uso',
    ussdTitle: 'Menyu ya kurejea',
  },
} as const;

export type Copy = { [K in keyof (typeof STRINGS)['en']]: string };

interface LanguageValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Copy;
}

const LanguageContext = createContext<LanguageValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>('sw');

  useEffect(() => {
    const saved = window.localStorage.getItem('chapaa-lang');
    if (saved === 'en' || saved === 'sw') setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'sw';
  }, [lang]);

  const setLang = (next: Lang) => {
    setLangState(next);
    window.localStorage.setItem('chapaa-lang', next);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: STRINGS[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function localError(detail: string, t: Copy): string {
  const text = detail.toLowerCase();
  if (text.includes('phone') || text.includes('+254') || text.includes('kenyan')) return t.badPhone;
  if (text.includes('4-digit') || text.includes('challenge')) return t.badChallenge;
  if (text.includes('face match') || text.includes('below')) return t.badFace;
  if (text.includes('expired')) return t.codeExpired;
  if (text.includes('wrong') || text.includes('code is')) return t.wrongCode;
  if (text.includes('consent')) return t.needConsent;
  if (text.includes('paste') || text.includes('message first')) return t.needMessage;
  if (text.includes('county') || text.includes('kaunti')) return t.needCounty;
  if (text.includes('words were heard') || text.includes('microphone')) return t.heardNothing;
  if (text.includes('not available') || text.includes('could not')) return t.serviceDown;
  return detail;
}

export function useLang(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error('Language choice is missing.');
  }
  return value;
}

export const LanguageSwitch: React.FC = () => {
  const { lang, setLang } = useLang();
  return (
    <div className="flex flex-wrap rounded-2xl overflow-hidden border border-slate-300">
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`min-h-14 px-4 text-lg font-bold ${lang === 'en' ? 'bg-sky-200 text-slate-900' : 'bg-white text-slate-800'}`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => setLang('sw')}
        className={`min-h-14 px-4 text-lg font-bold ${lang === 'sw' ? 'bg-sky-200 text-slate-900' : 'bg-white text-slate-800'}`}
      >
        Kiswahili
      </button>
    </div>
  );
};
