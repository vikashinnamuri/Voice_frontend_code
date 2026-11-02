import { useCallback, useEffect, useRef, useState } from "react";

// Browser speech APIs (Web Speech). Both are optional: the demo works with typed input and silent replies.
type RecognitionResult = { 0: { transcript: string; confidence: number }; isFinal: boolean };
interface RecognitionLike {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<RecognitionResult>; resultIndex: number }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type RecognitionCtor = new () => RecognitionLike;

const win = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
const RecognitionImpl: RecognitionCtor | undefined = win.SpeechRecognition ?? win.webkitSpeechRecognition;

export const speechRecognitionSupported = Boolean(RecognitionImpl);
export const speechSynthesisSupported = typeof window !== "undefined" && "speechSynthesis" in window;

const FEMALE = /female|woman|serena|kate|stephanie|martha|hazel|fiona|moira|tessa|karen|samantha|susan|zira|libby|sonia|amy|emma|victoria|allison|ava|nicky|joanna/i;
const MALE = /\bmale\b|daniel|oliver|arthur|george|ryan|thomas|james|alex|fred|rishi|aaron|gordon|reed/i;
let cachedVoice: SpeechSynthesisVoice | undefined;

/** A female English voice: British first, then any English female, then any non-male British voice. Voices load late, so this is re-run on `voiceschanged`. */
function pickFemaleVoice(): SpeechSynthesisVoice | undefined {
  const all = window.speechSynthesis.getVoices();
  const isGB = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace("_", "-") === "en-gb";
  const isEN = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith("en");
  const rank = (v: SpeechSynthesisVoice) => (/enhanced|premium|natural|google/i.test(v.name) ? 0 : 1);
  const best = (list: SpeechSynthesisVoice[]) => [...list].sort((x, y) => rank(x) - rank(y))[0];
  return best(all.filter((v) => isGB(v) && FEMALE.test(v.name) && !MALE.test(v.name)))
    ?? best(all.filter((v) => isEN(v) && FEMALE.test(v.name) && !MALE.test(v.name)))
    ?? best(all.filter((v) => isGB(v) && !MALE.test(v.name)))
    ?? best(all.filter((v) => isEN(v) && !MALE.test(v.name)));
}
if (speechSynthesisSupported) {
  const refresh = () => { cachedVoice = pickFemaleVoice(); };
  refresh();
  window.speechSynthesis.addEventListener?.("voiceschanged", refresh);
}

/** Speak a reply in a British voice. Resolves when finished. When muted/unsupported it waits roughly as long as speech would take. */
export function useSpeaker(enabled: boolean) {
  const timer = useRef<number | undefined>(undefined);
  const stop = useCallback(() => {
    window.clearTimeout(timer.current);
    if (speechSynthesisSupported) window.speechSynthesis.cancel();
  }, []);
  useEffect(() => stop, [stop]);

  const speak = useCallback((text: string) => new Promise<void>((resolve) => {
    stop();
    const estimate = Math.min(6500, Math.max(700, text.length * 45));
    if (!enabled || !speechSynthesisSupported) { timer.current = window.setTimeout(resolve, Math.min(estimate, 1600)); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    const voice = cachedVoice ?? pickFemaleVoice();
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    u.rate = 1.12;   // a touch faster than default: less dead air
    u.pitch = 1.08;  // slightly brighter, reads as a friendly female receptionist
    u.onend = () => resolve();
    u.onerror = () => resolve();
    timer.current = window.setTimeout(resolve, estimate + 4000); // safety net if the browser never fires onend
    window.speechSynthesis.speak(u);
  }), [enabled, stop]);

  return { speak, stop };
}

/** Silence after the last word before the phrase is sent. Short = snappy; raise it if callers get cut off mid-sentence. */
const END_OF_SPEECH_MS = 650;
const END_OF_SPEECH_FINAL_MS = 180; // the browser already marked the phrase final: send almost immediately

/** Microphone → text. Calls onFinal(text, confidence) once per spoken phrase, shortly after the caller stops talking. */
export function useRecognizer(onFinal: (text: string, confidence: number | undefined) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interim, setInterim] = useState("");
  const ref = useRef<RecognitionLike | null>(null);
  const wanted = useRef(false);
  const handler = useRef(onFinal);
  handler.current = onFinal;
  const endTimer = useRef<number | undefined>(undefined);

  const begin = useCallback(() => {
    if (!RecognitionImpl || ref.current) return;
    const r = new RecognitionImpl();
    r.lang = "en-GB";
    r.continuous = true;      // keep listening: no restart gap between phrases
    r.interimResults = true;  // see words as they are spoken, so we can end the turn on silence ourselves
    r.maxAlternatives = 1;
    let committed = 0;        // results before this index were already sent

    const commit = () => {
      window.clearTimeout(endTimer.current);
      const res = (r as unknown as { _last?: ArrayLike<RecognitionResult> })._last;
      if (!res) return;
      let text = "", conf: number | undefined;
      for (let i = committed; i < res.length; i++) { text += ` ${res[i]![0].transcript}`; conf = res[i]![0].confidence || conf; }
      committed = res.length;
      setInterim("");
      if (text.trim()) handler.current(text.trim(), conf);
    };

    r.onresult = (e) => {
      (r as unknown as { _last?: ArrayLike<RecognitionResult> })._last = e.results;
      let heard = "";
      for (let i = committed; i < e.results.length; i++) heard += ` ${e.results[i]![0].transcript}`;
      setInterim(heard.trim());
      const last = e.results[e.results.length - 1];
      window.clearTimeout(endTimer.current);
      endTimer.current = window.setTimeout(commit, last?.isFinal ? END_OF_SPEECH_FINAL_MS : END_OF_SPEECH_MS);
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      setError(e.error === "not-allowed" ? "Microphone permission was denied." : e.error === "network" ? "Speech recognition needs an internet connection in this browser (Chrome sends audio to Google to transcribe it)." : `Speech recognition error: ${e.error}`);
    };
    r.onend = () => {
      window.clearTimeout(endTimer.current);
      if (ref.current !== r) return;       // an older recogniser ending must not clobber a newer one
      ref.current = null; setListening(false); setInterim("");
      if (wanted.current) window.setTimeout(begin, 120);
    };
    ref.current = r;
    try { r.start(); setListening(true); } catch { ref.current = null; }
  }, []);

  const kill = useCallback(() => {
    window.clearTimeout(endTimer.current);
    const r = ref.current;
    ref.current = null;                  // detach first so its onend is ignored
    try { r?.abort(); } catch { /* already stopped */ }
    setListening(false); setInterim("");
  }, []);

  const start = useCallback(() => { setError(null); wanted.current = true; begin(); }, [begin]);
  const stop = useCallback(() => { wanted.current = false; kill(); }, [kill]);
  useEffect(() => stop, [stop]);

  /** Pause while the assistant talks or thinks so it doesn't hear itself; resume straight afterwards. */
  const pause = useCallback(() => kill(), [kill]);
  const resume = useCallback(() => { if (wanted.current) begin(); }, [begin]);

  return { listening, error, interim, start, stop, pause, resume, supported: speechRecognitionSupported };
}
