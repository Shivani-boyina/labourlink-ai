import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Square, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getSpeechLanguage, getSpeechVoice, supportsSpeechSynthesis } from '../utils/speech';

export default function ReadPageButton() {
  const { i18n, t } = useTranslation();
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [notice, setNotice] = useState('');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const chunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef(0);
  useEffect(() => () => { utteranceRef.current = null; window.speechSynthesis?.cancel(); }, []);

  function speakNext(language: string, voice?: SpeechSynthesisVoice) {
    const text = chunksRef.current[chunkIndexRef.current];
    if (!text) {
      utteranceRef.current = null;
      setActive(false);
      setPaused(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9;
    if (voice) utterance.voice = voice;
    utteranceRef.current = utterance;
    utterance.onstart = () => { if (utteranceRef.current === utterance) { setActive(true); setPaused(false); } };
    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return;
      chunkIndexRef.current += 1;
      speakNext(language, voice);
    };
    utterance.onerror = (event) => {
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null; chunksRef.current = []; setActive(false); setPaused(false);
      if (event.error !== 'canceled' && event.error !== 'interrupted') setNotice(t('readPage.failed'));
    };
    window.speechSynthesis.speak(utterance);
  }

  async function start() {
    const page = document.querySelector<HTMLElement>('main#main');
    const text = page?.innerText.replace(/\s+/g, ' ').trim();
    if (!text) { setNotice(t('readPage.noText')); return; }
    if (!supportsSpeechSynthesis()) { setNotice(t('chatbot.speechUnsupported')); return; }
    const language = getSpeechLanguage(i18n.resolvedLanguage);
    const voice = await getSpeechVoice(i18n.resolvedLanguage);
    if (language === 'te-IN' && !voice) { setNotice(t('chatbot.teluguVoiceUnavailable')); return; }
    setNotice('');
    window.speechSynthesis.cancel();
    // Browsers can truncate long speech utterances. Read sentence-sized pieces
    // sequentially and slightly slower so long pages remain understandable.
    chunksRef.current = text.match(/.{1,220}(?:\s|$)/gu)?.map((part) => part.trim()).filter(Boolean) ?? [text];
    chunkIndexRef.current = 0;
    speakNext(language, voice);
  }
  function stop() { utteranceRef.current = null; chunksRef.current = []; window.speechSynthesis?.cancel(); setActive(false); setPaused(false); }

  return <div className="fixed bottom-5 left-5 z-40 flex max-w-[calc(100vw-6rem)] items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur">
    <button type="button" onClick={start} aria-label={t('readPage.label')} title={t('readPage.label')} className="inline-flex h-11 items-center gap-2 rounded-full bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800"><Volume2 size={18} /><span className="hidden sm:inline">{t('readPage.button')}</span></button>
    {active && <>
      <button type="button" onClick={() => { window.speechSynthesis.pause(); setPaused(true); }} aria-label={t('readPage.pause')} disabled={paused} className="rounded-full p-2 text-blue-800 hover:bg-blue-50 disabled:opacity-40"><Pause size={17} /></button>
      <button type="button" onClick={() => { window.speechSynthesis.resume(); setPaused(false); }} aria-label={t('readPage.resume')} disabled={!paused} className="rounded-full p-2 text-blue-800 hover:bg-blue-50 disabled:opacity-40"><Play size={17} /></button>
      <button type="button" onClick={stop} aria-label={t('readPage.stop')} className="rounded-full p-2 text-blue-800 hover:bg-blue-50"><Square size={16} /></button>
    </>}
    {notice && <span role="status" className="px-2 text-xs text-amber-900">{notice}</span>}
  </div>;
}
