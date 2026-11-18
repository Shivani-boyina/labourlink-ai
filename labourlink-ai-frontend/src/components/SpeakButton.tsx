import { useRef, useState } from 'react';
import { Pause, Play, Square, Volume2 } from 'lucide-react';
import { getSpeechLanguage, getSpeechVoice, supportsSpeechSynthesis } from '../utils/speech';

export default function SpeakButton({ text, label = 'Read aloud', language }: { text: string; label?: string; language?: string }) {
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  async function play() {
    if (!supportsSpeechSynthesis()) { setError('Read aloud is unavailable in this browser.'); return; }
    setError('');
    const speechLang = getSpeechLanguage(language);
    const voice = await getSpeechVoice(language);
    if (speechLang === 'te-IN' && !voice) { setError('No Telugu speech voice is installed in this browser/device. Add a Telugu voice in Windows speech settings, then try again.'); return; }
    utteranceRef.current = null;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    utterance.lang = speechLang;
    if (voice) utterance.voice = voice;
    utterance.onstart = () => { setActive(true); setPaused(false); };
    utterance.onend = () => { if (utteranceRef.current === utterance) { utteranceRef.current = null; setActive(false); setPaused(false); } };
    utterance.onerror = (event) => { if (utteranceRef.current === utterance) { utteranceRef.current = null; setActive(false); setPaused(false); if (event.error !== 'canceled' && event.error !== 'interrupted') setError(event.error === 'not-allowed' ? 'Speech permission was blocked by the browser.' : 'This device could not read the text aloud.'); } };
    window.speechSynthesis.speak(utterance);
  }
  return <span className="inline-flex flex-wrap items-center gap-0.5" role="group" aria-label={`${label} speech controls`}>
    <button type="button" onClick={play} title={label} aria-label={label} className="rounded-md p-1.5 text-blue-800 hover:bg-blue-50"><Volume2 size={17} /></button>
    <button type="button" onClick={() => { window.speechSynthesis.pause(); setPaused(true); }} disabled={!active || paused} title="Pause speech" aria-label="Pause speech" className="rounded-md p-1.5 text-blue-800 hover:bg-blue-50 disabled:opacity-40"><Pause size={16} /></button>
    <button type="button" onClick={() => { window.speechSynthesis.resume(); setPaused(false); }} disabled={!active || !paused} title="Resume speech" aria-label="Resume speech" className="rounded-md p-1.5 text-blue-800 hover:bg-blue-50 disabled:opacity-40"><Play size={16} /></button>
    <button type="button" onClick={() => { utteranceRef.current = null; window.speechSynthesis.cancel(); setActive(false); setPaused(false); }} disabled={!active} title="Stop speech" aria-label="Stop speech" className="rounded-md p-1.5 text-blue-800 hover:bg-blue-50 disabled:opacity-40"><Square size={15} /></button>
    {error && <span role="status" className="ml-1 text-xs text-amber-800">{error}</span>}
  </span>;
}
