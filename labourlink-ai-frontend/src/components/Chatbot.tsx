import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Mic, Pause, Play, Send, StopCircle, Volume2, X, Trash2 } from 'lucide-react';
import { sendChatMessage } from '../services/chatService';
import { ApiError, errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { getSpeechLanguage, getSpeechVoice, supportsSpeechSynthesis } from '../utils/speech';

type Message = { id: number; role: 'assistant' | 'user'; text: string; action?: string | null; actionLabel?: string | null; workers?: Array<{ workerId: number; name: string; skill: string; location: string; experience: number; availability: boolean; expectedWagePerDay?: number | null }> };

type Recognition = { lang: string; onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: (event: { error: string }) => void; onend: () => void; start: () => void; stop: () => void; abort?: () => void };
type RecognitionWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

function offlineGuidance(question: string, role?: string, language = 'en'): { text: string; action?: string } {
  const q = question.toLowerCase();
  const telugu = language.startsWith('te');
  const skills = [
    { name: 'Plumber', aliases: ['plumber', 'plumbing', 'ప్లంబర్'], te: 'ప్లంబర్' },
    { name: 'Electrician', aliases: ['electrician', 'electrical', 'ఎలక్ట్రీషియన్'], te: 'ఎలక్ట్రీషియన్' },
    { name: 'Carpenter', aliases: ['carpenter', 'carpentry', 'కార్పెంటర్'], te: 'కార్పెంటర్' },
    { name: 'Mason', aliases: ['mason', 'masonry', 'మేస్త్రీ'], te: 'మేస్త్రీ' },
    { name: 'Painter', aliases: ['painter', 'painting', 'పెయింటర్'], te: 'పెయింటర్' },
    { name: 'Welder', aliases: ['welder', 'welding', 'వెల్డర్'], te: 'వెల్డర్' },
    { name: 'Helper', aliases: ['helper', 'labourer', 'laborer', 'హెల్పర్'], te: 'హెల్పర్' },
  ];
  const skill = skills.find((item) => item.aliases.some((alias) => q.includes(alias)));
  if (role === 'worker') {
    if (q.includes('profile') || q.includes('skill') || q.includes('availability') || q.includes('location'))
      return { text: telugu ? 'మీ కార్మిక ప్రొఫైల్ మరియు ప్రాంత భాగస్వామ్య ఎంపికలను ఇక్కడ చూడండి. సర్వర్ అందుబాటులో ఉన్నప్పుడు మీ వివరాలు నవీకరించవచ్చు.' : 'You can review your worker profile and location-sharing preferences here. Live profile updates require the backend to be connected.', action: '/worker/profile' };
    return { text: telugu ? 'పని కోసం తెరిచి ఉన్న ఉద్యోగాలను చూడండి. సర్వర్ అనుసంధానం లేకపోవడంతో ఇప్పుడు దరఖాస్తులను తనిఖీ చేయలేను.' : 'To look for work, browse open jobs. The server is offline, so I can’t check or submit applications right now.', action: '/jobs' };
  }
  if (skill && (role === 'contractor' || role === 'guest')) {
    const params = new URLSearchParams({ skill: skill.name });
    const place = question.match(/\b(?:in|around|at|near)\s+([\p{L}][\p{L} .'-]{1,35})/iu)?.[1]?.replace(/\b(near me|nearby|please|today)\b.*$/i, '').trim();
    if (place && !['me', 'my area', 'my location'].includes(place.toLowerCase())) params.set('location', place);
    const skillLabel = telugu ? skill.te : skill.name;
    return { text: telugu ? `ఇప్పుడు సర్వర్‌ను చేరుకోలేకపోతున్నాను; అందువల్ల నిజమైన కార్మికుల సరిపోలికలు లేదా అందుబాటును తనిఖీ చేయలేను. సర్వర్ అందుబాటులో ఉన్నప్పుడు ${skillLabel} కోసం కార్మికుల శోధనను ఉపయోగించండి${place ? ` (${place})` : ''}.` : `I can’t reach the worker directory right now, so I can’t verify matches or availability. When the server is available, use worker search${place ? ` for ${place}` : ''}.`, action: `/workers/search?${params.toString()}` };
  }
  if (q.includes('post') || q.includes('create job') || q.includes('పోస్ట్') || q.includes('పని పెట్ట')) return { text: telugu ? 'పని పోస్ట్ చేయడానికి ఈ పేజీని తెరవండి. సర్వర్ లేకుండా పనిని సేవ్ చేయలేను.' : 'I can show you where to post a job, but saving it needs the backend connection.', action: '/contractor/jobs/create' };
  if (q.includes('job') || q.includes('work') || q.includes('application') || q.includes('పని') || q.includes('ఉద్యోగ')) return { text: telugu ? 'తెరిచి ఉన్న పనులను ఇక్కడ చూడండి. సర్వర్ అనుసంధానం లేకపోవడంతో వివరాలు లేదా దరఖాస్తులు లోడ్ కాకపోవచ్చు.' : 'Browse jobs here. The backend is offline, so job details and application actions may not load.', action: '/jobs' };
  if (q.includes('profile') || q.includes('location') || q.includes('ప్రొఫైల్') || q.includes('ప్రాంతం')) return { text: telugu ? 'మీ ప్రొఫైల్‌ను ఇక్కడ తెరవండి. ప్రత్యక్ష వివరాల కోసం సర్వర్ అనుసంధానం అవసరం.' : 'You can open your profile here. Live profile data needs the backend connection.', action: role === 'worker' ? '/worker/profile' : '/contractor/profile' };
  return { text: telugu ? 'నేను లేబర్‌లింక్ AI సహాయకుడిని. సర్వర్ అనుసంధానం లేకపోవడంతో ప్రత్యక్ష కార్మికులు లేదా పనుల వివరాలు చూడలేను. పని వెతకడం, కార్మికుడిని వెతకడం లేదా పని పోస్ట్ చేయడం గురించి అడగండి.' : 'I’m the LabourLinkAI assistant. The server is offline, so I can provide navigation guidance but can’t check live workers, jobs, or account details. Try asking how to find work, find a worker, or post a job.' };
}

export default function Chatbot() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => [{ id: 0, role: 'assistant', text: t('chatbot.greeting') }]);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => () => { window.speechSynthesis?.cancel(); recognitionRef.current?.abort?.(); }, []);
  useEffect(() => {
    setMessages((current) => current.length === 1 && current[0].id === 0 ? [{ ...current[0], text: t('chatbot.greeting') }] : current);
  }, [i18n.resolvedLanguage, t]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const history = messages.slice(1).map(({ role, text: messageText }) => ({ role, text: messageText }));
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text }]);
    setInput(''); setBusy(true); setError('');
    try {
      const language = i18n.resolvedLanguage?.startsWith('te') ? 'te' : 'en';
      const result = await sendChatMessage(text, history, language);
      setMessages((current) => [...current, { id: Date.now() + 1, role: 'assistant', text: result.message, action: result.action, actionLabel: result.actionLabel, workers: result.workers }]);
    } catch (cause) {
      if (cause instanceof ApiError && (cause.status === 0 || cause.status >= 500)) {
        const language = i18n.resolvedLanguage?.startsWith('te') ? 'te' : 'en';
        const offline = offlineGuidance(text, session?.role, language);
        setMessages((current) => [...current, { id: Date.now() + 1, role: 'assistant', text: offline.text, action: offline.action, actionLabel: offline.action ? 'Open this page' : null }]);
        setError(t('chatbot.offlineNotice'));
      } else {
        const language = i18n.resolvedLanguage?.startsWith('te') ? 'te' : 'en';
        const fallback = offlineGuidance(text, session?.role, language);
        setMessages((current) => [...current, { id: Date.now() + 1, role: 'assistant', text: fallback.text, action: fallback.action, actionLabel: fallback.action ? t('chatbot.openPage') : null }]);
        setError(`${errorMessage(cause)} ${t('chatbot.retry')}`);
      }
    }
    finally { setBusy(false); }
  }

  async function speak(id: number, text: string) {
    if (!supportsSpeechSynthesis()) { setError(t('chatbot.speechUnsupported')); return; }
    const language = getSpeechLanguage(i18n.resolvedLanguage);
    const voice = await getSpeechVoice(i18n.resolvedLanguage);
    if (language === 'te-IN' && !voice) { setError(t('chatbot.teluguVoiceUnavailable')); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9;
    if (voice) utterance.voice = voice;
    utteranceRef.current = utterance;
    utterance.onstart = () => { if (utteranceRef.current === utterance) { setSpeaking(true); setPaused(false); setSpeakingId(id); setError(''); } };
    utterance.onend = () => { if (utteranceRef.current === utterance) { utteranceRef.current = null; setSpeaking(false); setPaused(false); setSpeakingId(null); } };
    utterance.onerror = (event) => { if (utteranceRef.current === utterance) { utteranceRef.current = null; setSpeaking(false); setPaused(false); setSpeakingId(null); setError(t(event.error === 'not-allowed' ? 'chatbot.speechBlocked' : 'readPage.failed')); } };
    window.speechSynthesis.speak(utterance);
  }
  function stopSpeech() { utteranceRef.current = null; window.speechSynthesis?.cancel(); setSpeaking(false); setPaused(false); setSpeakingId(null); }
  function dictate() {
    if (listening) { recognitionRef.current?.stop(); return; }
    const browser = window as RecognitionWindow;
    const SpeechRecognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!SpeechRecognition) { setError(t('chatbot.microphoneUnsupported')); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = getSpeechLanguage(i18n.resolvedLanguage);
    recognitionRef.current = recognition;
    recognition.onresult = (event) => { const transcript = event.results[0]?.[0]?.transcript; if (transcript) setInput(transcript); };
    recognition.onerror = (event) => setError(event.error === 'not-allowed' ? t('chatbot.microphoneDenied') : t('chatbot.recognitionFailed'));
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    try { recognition.start(); setListening(true); setError(''); }
    catch { recognitionRef.current = null; setListening(false); setError(t('chatbot.microphoneStartFailed')); }
  }

  return <>
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close LabourLinkAI assistant' : 'Open LabourLinkAI assistant'} aria-expanded={open}
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-700 text-white shadow-xl hover:bg-blue-800">
      {open ? <X size={24} /> : <Bot size={25} />}
    </button>
    {open && <section aria-label="LabourLinkAI assistant" className="fixed bottom-24 right-4 z-50 flex h-[min(34rem,calc(100dvh-8rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between bg-blue-800 px-4 py-3 text-white">
        <div><h2 className="text-lg font-bold text-white">{t('chatbot.title')}</h2><p className="text-xs text-blue-100">{t('chatbot.subtitle')}</p></div>
        <button type="button" className="rounded-lg p-2 hover:bg-blue-700" aria-label={t('chatbot.clear')} onClick={() => { stopSpeech(); setError(''); setMessages([{ id: Date.now(), role: 'assistant', text: t('chatbot.greeting') }]); }}><Trash2 size={18} /></button>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4" aria-live="polite">
        {messages.map((message) => <div key={message.id} className={`max-w-[90%] rounded-2xl px-3.5 py-3 text-sm ${message.role === 'user' ? 'ml-auto bg-blue-700 text-white' : 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'}`}>
          <p className="whitespace-pre-wrap">{message.text}</p>
          {message.workers?.map((worker) => <div key={worker.workerId} className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-800">
            <strong>{worker.name}</strong><p>{t(`workerRegister.skills.${worker.skill}`, worker.skill)} · {worker.experience} {t('chatbot.years')}</p><p>{worker.location} · {worker.availability ? t('chatbot.available') : t('chatbot.busy')}</p>
            {worker.expectedWagePerDay != null && <p>₹{worker.expectedWagePerDay} {t('chatbot.perDay')}</p>}
          </div>)}
          {message.action && <button type="button" onClick={() => { navigate(message.action!); setOpen(false); }} className="mt-2 font-semibold text-blue-700 underline">{message.actionLabel || t('chatbot.openPage')}</button>}
          {message.role === 'assistant' && <div className="mt-2 flex items-center gap-1 text-xs">
            <button type="button" onClick={() => void speak(message.id, message.text)} aria-label={t('chatbot.readReply')} className="rounded-md p-1.5 text-blue-800 hover:bg-blue-50"><Volume2 size={16} /></button>
            {speakingId === message.id && speaking && <><button type="button" aria-label={t('chatbot.pause')} onClick={() => { window.speechSynthesis.pause(); setPaused(true); }} className="rounded-md p-1.5 text-blue-800 hover:bg-blue-50"><Pause size={16} /></button><button type="button" aria-label={t('chatbot.resume')} onClick={() => { window.speechSynthesis.resume(); setPaused(false); }} disabled={!paused} className="rounded-md p-1.5 text-blue-800 hover:bg-blue-50 disabled:opacity-40"><Play size={16} /></button><button type="button" aria-label={t('chatbot.stop')} onClick={stopSpeech} className="rounded-md p-1.5 text-blue-800 hover:bg-blue-50"><StopCircle size={16} /></button></>}
          </div>}
        </div>)}
        {busy && <div role="status" className="w-fit rounded-xl bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">{t('chatbot.thinking')}</div>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-800">{error}</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex items-center gap-1.5 border-t border-slate-200 bg-white p-3">
        <label className="sr-only" htmlFor="assistant-message">{t('chatbot.inputPlaceholder')}</label>
        <input id="assistant-message" value={input} onChange={(event) => setInput(event.target.value)} maxLength={1000} placeholder={t('chatbot.inputPlaceholder')} className="input min-w-0 flex-1 !px-3 !py-2" />
        <button type="button" onClick={dictate} aria-label={listening ? t('chatbot.stopListening') : t('chatbot.speakQuestion')} aria-pressed={listening} className={`rounded-lg p-2.5 ${listening ? 'bg-red-100 text-red-800' : 'text-slate-600 hover:bg-slate-100'}`}><Mic size={19} /></button>
        <button type="submit" disabled={busy || !input.trim()} aria-label={t('chatbot.send')} className="rounded-lg bg-blue-700 p-2.5 text-white hover:bg-blue-800 disabled:opacity-50"><Send size={19} /></button>
      </form>
    </section>}
  </>;
}
