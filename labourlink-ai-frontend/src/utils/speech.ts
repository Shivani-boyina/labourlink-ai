export function getSpeechLanguage(language?: string): string {
  const normalized = language?.toLowerCase() || 'en';
  if (normalized.startsWith('te')) return 'te-IN';
  if (normalized.startsWith('hi')) return 'hi-IN';
  return 'en-IN';
}

export function supportsSpeechSynthesis(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

export async function getSpeechVoice(language?: string): Promise<SpeechSynthesisVoice | undefined> {
  if (!supportsSpeechSynthesis()) return undefined;
  const target = getSpeechLanguage(language).toLowerCase();
  const find = () => {
    const voices = window.speechSynthesis.getVoices();
    return voices.find((voice) => voice.lang.toLowerCase() === target)
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(target.slice(0, 2) + '-'));
  };
  let voice = find();
  if (voice || window.speechSynthesis.getVoices().length) return voice;
  voice = await new Promise<SpeechSynthesisVoice | undefined>((resolve) => {
    const timer = window.setTimeout(() => resolve(find()), 1200);
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      window.clearTimeout(timer);
      resolve(find());
    }, { once: true });
  });
  return voice;
}
