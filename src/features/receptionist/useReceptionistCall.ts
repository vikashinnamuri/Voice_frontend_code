import { useCallback, useEffect, useRef, useState } from "react";
import { createCall, finishCall } from "../../api/calls";
import { errorMessage } from "../../api/client";
import { uploadBrowserRecording } from "../../api/recordings";
import { createVoiceToken, sendCallerTurn, startConversation } from "../../api/voice";
import { GeminiLive, type LiveLatency, type LiveTurn } from "../../hooks/geminiLive";
import type { RoomHandlers } from "./LiveKitSession";
import { useRecognizer, useSpeaker } from "../../hooks/useSpeech";
import type { CallDetail, CallSummary, DemoScript, TurnResponse, VoiceConfig, VoiceToken } from "../../types";
import type { TranscriptLine } from "../call-history/TranscriptView";

export type Phase = "idle" | "starting" | "active" | "finishing" | "ended" | "error";

export interface CallState {
  phase: Phase;
  call: CallSummary | null;
  finished: CallDetail | null;
  turns: TranscriptLine[];
  stepLabel: string;
  progress: { collected: number; total: number };
  complete: boolean;
  thinking: boolean;
  speaking: boolean;
  elapsed: number;
  error: string | null;
  token: VoiceToken | null;
  playing: boolean;
  latency: { last: number | null; average: number | null; turns: number } | null; // reply speed of the live voice call, in ms
}

const initial: CallState = { phase: "idle", call: null, finished: null, turns: [], stepLabel: "Waiting to start", progress: { collected: 0, total: 0 }, complete: false, thinking: false, speaking: false, elapsed: 0, error: null, token: null, playing: false, latency: null };
const MIC_CONSTRAINTS: MediaStreamConstraints = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lineId = 0;
const line = (speaker: TranscriptLine["speaker"], message: string, confidence?: number): TranscriptLine => ({ id: `live-${++lineId}`, speaker, message, timestamp: new Date().toISOString(), confidence });

/** Drives one demo call: create → greeting → caller turns → finish. The conversation logic lives on the server. */
export function useReceptionistCall(config: VoiceConfig | null) {
  const [state, setState] = useState<CallState>(initial);
  const [speakReplies, setSpeakReplies] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const patch = useCallback((p: Partial<CallState>) => setState((s) => ({ ...s, ...p })), []);

  const transport = config?.voice_transport ?? "browser"; // livekit: WebRTC room + voice agent | direct: WebSocket to Gemini Live | browser: speech fallback
  const liveMode = transport !== "browser";
  const lkApi = useRef<{ sendText: (t: string) => void; setMuted: (m: boolean) => void } | null>(null);
  const [agentState, setAgentState] = useState("connecting");
  const [roomStatus, setRoomStatus] = useState("connecting");
  const gl = useRef<GeminiLive | null>(null);
  const finishPending = useRef(false);
  const latencies = useRef<number[]>([]);
  const gotFirstTurn = useRef(false);
  const [liveHeard, setLiveHeard] = useState("");
  const live = useRef({ callId: "", active: false, busy: false, startedAt: 0, ending: false, stopScript: false });
  const recorder = useRef<{ rec: MediaRecorder; chunks: Blob[]; stream: MediaStream } | null>(null);
  const { speak, stop: stopSpeaking } = useSpeaker(speakReplies);
  const sendRef = useRef<(text: string, confidence?: number) => Promise<void>>(async () => {});
  const { start: micStart, stop: micStop, pause: micPause, resume: micResume, supported: micSupported, error: micError, interim: micInterim } = useRecognizer((text, confidence) => void sendRef.current(text, confidence));

  // timer
  useEffect(() => {
    if (state.phase !== "active") return;
    const t = setInterval(() => patch({ elapsed: Math.round((Date.now() - live.current.startedAt) / 1000) }), 1000);
    return () => clearInterval(t);
  }, [state.phase, patch]);

  const applyReply = useCallback(async (r: TurnResponse) => {
    setState((s) => ({ ...s, call: r.call, stepLabel: r.step_label, progress: r.progress, complete: r.complete, thinking: false, speaking: true, turns: [...s.turns, line("assistant", r.reply)] }));
    micPause();
    await speak(r.reply);
    patch({ speaking: false });
    micResume();
  }, [speak, patch, micPause, micResume]);

  const stopRecorder = useCallback(async (): Promise<Blob | null> => {
    const r = recorder.current;
    recorder.current = null;
    if (!r) return null;
    const done = new Promise<Blob>((resolve) => { r.rec.onstop = () => resolve(new Blob(r.chunks, { type: r.rec.mimeType || "audio/webm" })); });
    if (r.rec.state !== "inactive") r.rec.stop();
    r.stream.getTracks().forEach((t) => t.stop());
    return done;
  }, []);

  const end = useCallback(async () => {
    const l = live.current;
    if (!l.active || l.ending) return;
    l.ending = true; l.stopScript = true;
    patch({ phase: "finishing", playing: false });
    stopSpeaking(); micStop(); setMicOn(false);
    gl.current?.close(); gl.current = null; lkApi.current = null; setLiveHeard("");
    const seconds = (Date.now() - l.startedAt) / 1000;
    try {
      const blob = await stopRecorder();
      if (blob && blob.size > 2048) await uploadBrowserRecording(l.callId, blob, seconds).catch(() => undefined); // best effort: the call is still saved without it
      const finished = await finishCall(l.callId, seconds);
      l.active = false;
      patch({ phase: "ended", finished, call: finished, thinking: false, speaking: false, stepLabel: "Saved for staff review" });
    } catch (e) {
      l.ending = false;
      patch({ phase: "error", error: errorMessage(e) });
    }
  }, [patch, stopSpeaking, micStop, stopRecorder]);

  const send = useCallback(async (text: string, confidence?: number) => {
    const l = live.current;
    const clean = text.trim();
    if (!clean || !l.active || l.busy || l.ending) return;
    if (gl.current || lkApi.current) { l.busy = true; patch({ thinking: true, error: null }); (gl.current ?? lkApi.current)!.sendText(clean); return; } // typed answer: Gemini hears it as the caller and speaks the reply
    l.busy = true;
    setState((s) => ({ ...s, turns: [...s.turns, line("caller", clean, confidence)], thinking: true, error: null }));
    stopSpeaking(); micPause(); // don't listen while the reply is being worked out
    try {
      const reply = await sendCallerTurn(l.callId, clean, confidence);
      await applyReply(reply);
      if (reply.end_call) { await sleep(900); await end(); }
    } catch (e) {
      patch({ thinking: false, error: errorMessage(e) });
      micResume();
    } finally {
      l.busy = false;
    }
  }, [applyReply, end, patch, stopSpeaking, micPause, micResume]);
  sendRef.current = send;

  /** Real-time voice: open the mic, then stream audio to Gemini Live through the backend. */
  const startLive = useCallback(async (callId: string, micStream?: Promise<MediaStream>) => {
    const stream = await (micStream ?? navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS));
    if (typeof MediaRecorder !== "undefined") { // keep a demo recording of the caller's side
      const rec = new MediaRecorder(stream), chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.start(1000);
      recorder.current = { rec, chunks, stream };
    }
    const finishWhenQuiet = () => { // the closing line is still streaming in: wait for it to finish playing, then save the call
      const wait = () => { if (!gl.current) return; if (gl.current.idle) setTimeout(() => void end(), 900); else setTimeout(wait, 250); };
      setTimeout(wait, 600);
    };
    const g = new GeminiLive({
      onLatency: (l: LiveLatency) => {
        if (l.total_ms == null) return;
        latencies.current.push(l.total_ms);
        const all = latencies.current;
        patch({ latency: { last: l.total_ms, average: Math.round(all.reduce((a, b) => a + b, 0) / all.length), turns: all.length } });
      },
      onTurn: (t: LiveTurn) => {
        gotFirstTurn.current = true;
        live.current.busy = false;
        setLiveHeard("");
        setState((s) => ({ ...s, call: t.call, stepLabel: t.step_label, progress: t.progress, complete: t.complete, thinking: false, error: null,
          turns: [...s.turns, ...(t.heard ? [line("caller", t.heard)] : []), line("assistant", t.reply)] }));
        if (t.end_call) finishPending.current = true;
      },
      onHeard: (text) => setLiveHeard(text),
      onSpeaking: (speaking) => patch({ speaking }),
      onTurnComplete: () => { if (finishPending.current) finishWhenQuiet(); },
      onHangup: () => finishWhenQuiet(), // the caller went quiet and the goodbye has been spoken

      onError: (message) => { live.current.busy = false; patch({ thinking: false, error: message }); },
      onClosed: () => { if (live.current.active && !live.current.ending) patch({ error: "The voice connection closed. End the call to save it." }); },
    }, config?.live_playback_rate ?? 1, config?.live_barge_in ?? false);
    gl.current = g;
    gotFirstTurn.current = false; latencies.current = [];
    const watchdog = setTimeout(() => { // the socket can be open while the server is still reaching Gemini: say so instead of sitting on "Connecting voice…"
      if (live.current.active && !live.current.ending && !gotFirstTurn.current) patch({ error: "Still connecting to the voice service. Check that the backend is running (./run.sh backend) and your internet connection, then end the call and try again." });
    }, 15000);
    try { await g.connect(callId, stream); } finally { clearTimeout(watchdog); }
    setMicOn(true);
    setTimeout(() => { if (live.current.active && !live.current.ending && !gotFirstTurn.current) patch({ error: "Connected, but the receptionist hasn't started speaking. Check the backend terminal for errors, then end the call and try again." }); }, 15000);
  }, [end, patch, config]);

  // handlers for the LiveKit room (stable identity: the room component subscribes once)
  const endRef2 = useRef(end); endRef2.current = end;
  const roomHandlers = useRef<RoomHandlers>({
    onTurn: (t) => {
      live.current.busy = false; setLiveHeard("");
      setState((s) => ({ ...s, call: t.call, stepLabel: t.step_label, progress: t.progress, complete: t.complete, thinking: false, error: null,
        turns: [...s.turns, ...(t.heard ? [line("caller", t.heard)] : []), line("assistant", t.reply)] }));
    },
    onHeard: (text) => setLiveHeard(text),
    onAgentState: (s) => { setAgentState(s); setState((st) => ({ ...st, speaking: s === "speaking" })); },
    onComplete: () => { setTimeout(() => void endRef2.current(), 700); },
    onConnection: (s) => { setRoomStatus(s); if (s === "error") patch({ error: "Couldn't connect to LiveKit. Check the LiveKit settings in .env." }); },
    register: (api) => { lkApi.current = api; },
  }).current;

  const start = useCallback(async () => {
    live.current = { callId: "", active: false, busy: false, startedAt: Date.now(), ending: false, stopScript: false };
    setState({ ...initial, phase: "starting", stepLabel: "Connecting…" });
    try {
      finishPending.current = false;
      // direct voice: ask for the mic at the same moment the call is created, so the two waits overlap instead of adding up
      const micStream = transport === "direct" ? navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS) : undefined;
      micStream?.catch(() => undefined); // handled where it is awaited; avoid an unhandled rejection if createCall fails first
      const call = await createCall(!liveMode);
      live.current.callId = call.public_id; live.current.active = true; live.current.startedAt = Date.now();
      if (transport === "livekit") {
        const token = await createVoiceToken(call.public_id);
        if (token.mode !== "livekit" || !token.token || !token.url) throw new Error("LiveKit isn't available. Check the LiveKit settings in .env.");
        setAgentState("connecting"); setRoomStatus("connecting"); setMicOn(true);
        patch({ phase: "active", call, token, stepLabel: "Connecting voice…", elapsed: 0 });
        return;
      }
      if (transport === "direct") {
        patch({ phase: "active", call, token: null, stepLabel: "Connecting voice…", elapsed: 0 });
        await startLive(call.public_id, micStream);
        return;
      }
      const token = config?.voice_mode === "livekit" ? await createVoiceToken(call.public_id).catch(() => null) : null;
      patch({ phase: "active", call, token, stepLabel: "Greeting", elapsed: 0 });
      void autoMicRef.current(); // the click on "Start" is the user gesture the browser needs for the microphone
      await applyReply(await startConversation(call.public_id));
    } catch (e) {
      live.current.active = false; gl.current?.close(); gl.current = null;
      patch({ phase: "error", error: e instanceof DOMException && e.name === "NotAllowedError" ? "Microphone access was blocked. Allow the microphone for this site and try again." : errorMessage(e) });
    }
  }, [applyReply, transport, liveMode, patch, startLive]);

  const playScript = useCallback(async (script: DemoScript) => {
    const l = live.current;
    if (!l.active) return;
    l.stopScript = false;
    patch({ playing: true });
    for (const text of script.caller_lines) {
      if (l.stopScript || !l.active) break;
      await sleep(700);
      while (l.busy && !l.stopScript) await sleep(150); // wait for the assistant to finish its turn
      if (l.stopScript || !l.active) break;
      await sendRef.current(text);
    }
    patch({ playing: false });
  }, [patch]);

  const stopScript = useCallback(() => { live.current.stopScript = true; patch({ playing: false }); }, [patch]);

  const autoMicRef = useRef<() => Promise<void>>(async () => {});
  const toggleMic = useCallback(async () => {
    if (gl.current) { const mute = !gl.current.isMuted; gl.current.setMuted(mute); setMicOn(!mute); return; }
    if (lkApi.current) { lkApi.current.setMuted(micOn); setMicOn(!micOn); return; }
    if (micOn) { micStop(); setMicOn(false); return; }
    try {
      if (!recorder.current && typeof MediaRecorder !== "undefined") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        rec.start(1000);
        recorder.current = { rec, chunks, stream };
      }
      micStart();
      setMicOn(true);
    } catch {
      patch({ error: "Microphone access was blocked. You can still type what the caller says." });
    }
  }, [micOn, patch, micStart, micStop]);
  autoMicRef.current = async () => { if (!micOn && micSupported) await toggleMic(); };

  const reset = useCallback(() => { gl.current?.close(); gl.current = null; lkApi.current = null; setLiveHeard(""); stopSpeaking(); micStop(); setMicOn(false); void stopRecorder(); live.current.active = false; setState(initial); }, [micStop, stopRecorder, stopSpeaking]);

  // leaving the page mid-call: stop audio/mic and save what was captured
  const endRef = useRef(end);
  endRef.current = end;
  useEffect(() => () => { if (live.current.active && !live.current.ending) void endRef.current(); }, []);

  return { state, start, end, send, playScript, stopScript, toggleMic, reset, micOn, micSupported, micError, micInterim, liveMode, transport, liveHeard, agentState, roomStatus, roomHandlers, speakReplies, setSpeakReplies };
}
