// Browser side of the Gemini Live voice call: mic -> 16 kHz PCM over a WebSocket -> backend -> Gemini, and Gemini's 24 kHz speech back.
// The Google key never reaches the browser; the backend relays everything (see backend/services/live_voice_service.py).
import { apiUrl } from "../api/client";
import type { CallSummary } from "../types";

export interface LiveTurn {
  type: "turn"; heard: string; reply: string; step: string; step_label: string; complete: boolean; end_call: boolean;
  progress: { collected: number; total: number }; call: CallSummary;
}
/** How long the caller waited for one reply (ms): total = caller's last word heard -> first sound of the reply. */
export interface LiveLatency { turn: number; total_ms: number | null; engine_ms: number; model_ms: number; to_tool_ms: number | null }
export interface LiveHandlers {
  onTurn: (t: LiveTurn) => void;
  onLatency?: (l: LiveLatency) => void;
  onHeard: (text: string) => void;
  onSpeaking: (speaking: boolean) => void;
  onTurnComplete: () => void;
  onHangup: () => void;
  onError: (message: string) => void;
  onClosed: () => void;
}

const MIC_WORKLET = `class MicCapture extends AudioWorkletProcessor { process(inputs) { const ch = inputs[0] && inputs[0][0]; if (ch) this.port.postMessage(ch.slice(0)); return true; } }
registerProcessor("mic-capture", MicCapture);`;

const SEND_RATE = 16000, RECEIVE_RATE = 24000, FRAME_MS = 20; // 20 ms mic frames: the caller's speech reaches Gemini sooner

function wsUrl(path: string): string {
  const full = apiUrl(path);
  return full.startsWith("http") ? full.replace(/^http/, "ws") : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}${full}`;
}

export class GeminiLive {
  private ws: WebSocket | null = null;
  private inCtx: AudioContext | null = null;
  private outCtx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  private pending: Float32Array[] = [];
  private pendingLen = 0;
  private nextStart = 0;
  private playing = new Set<AudioBufferSourceNode>();
  private muted = false;
  private quietUntil = 0; // performance.now() until which the mic is treated as silent (the assistant's own voice is still fading in the room)
  private closed = false;

  constructor(private h: LiveHandlers, private rate = 1, private bargeIn = false) {}

  get connected(): boolean { return this.ws?.readyState === WebSocket.OPEN; }
  get idle(): boolean { return this.playing.size === 0; }

  async connect(callId: string, stream: MediaStream): Promise<void> {
    this.stream = stream;
    this.outCtx = new AudioContext({ sampleRate: RECEIVE_RATE });
    this.inCtx = new AudioContext();
    void this.outCtx.resume(); void this.inCtx.resume(); // never await: with no audio device these can stay pending forever

    // load the mic processor while the socket is opening: the two waits overlap
    const url = URL.createObjectURL(new Blob([MIC_WORKLET], { type: "application/javascript" }));
    const worklet = this.inCtx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));

    this.ws = new WebSocket(wsUrl(`/api/voice/live/${encodeURIComponent(callId)}`));
    this.ws.binaryType = "arraybuffer";
    // attach the message handler before the socket opens so the greeting audio is never missed
    this.ws.onmessage = (e) => (typeof e.data === "string" ? this.onEvent(JSON.parse(e.data)) : this.play(e.data as ArrayBuffer));
    await new Promise<void>((resolve, reject) => {
      this.ws!.onopen = () => resolve();
      this.ws!.onerror = () => reject(new Error("Couldn't open the voice connection to the server."));
    });
    this.ws.onclose = () => { if (!this.closed) this.h.onClosed(); };
    this.ws.onerror = () => this.h.onError("The voice connection dropped.");

    await worklet;
    const source = this.inCtx.createMediaStreamSource(stream);
    this.node = new AudioWorkletNode(this.inCtx, "mic-capture");
    this.node.port.onmessage = (e: MessageEvent<Float32Array>) => this.capture(e.data);
    const silent = this.inCtx.createGain();
    silent.gain.value = 0; // the worklet must be connected to run, but the mic must never play back
    source.connect(this.node).connect(silent).connect(this.inCtx.destination);
  }

  private onEvent(e: { type: string; [k: string]: unknown }) {
    switch (e.type) {
      case "turn": this.h.onTurn(e as unknown as LiveTurn); break;
      case "caller_text": this.h.onHeard(String(e.text ?? "")); break;
      case "interrupted": if (this.bargeIn) this.stopPlayback(); break; // only honoured when real interruptions are enabled
      case "latency": this.h.onLatency?.(e as unknown as LiveLatency); break;
      case "turn_complete": this.h.onTurnComplete(); break;
      case "hangup": this.h.onHangup(); break;
      case "error": this.h.onError(String(e.message ?? "Voice error")); break;
    }
  }

  // ---- microphone -> server
  private capture(chunk: Float32Array) {
    if (this.muted || !this.connected) return;
    this.pending.push(chunk); this.pendingLen += chunk.length;
    const rate = this.inCtx!.sampleRate;
    if (this.pendingLen < (rate * FRAME_MS) / 1000) return;
    const joined = new Float32Array(this.pendingLen);
    let o = 0; for (const p of this.pending) { joined.set(p, o); o += p.length; }
    this.pending = []; this.pendingLen = 0;
    const ratio = rate / SEND_RATE, n = Math.floor(joined.length / ratio), out = new Int16Array(n);
    for (let i = 0; i < n; i++) { // average each group of samples: a cheap low-pass before dropping to 16 kHz
      let sum = 0; const a = Math.floor(i * ratio), b = Math.max(a + 1, Math.floor((i + 1) * ratio));
      for (let j = a; j < b; j++) sum += joined[j]!;
      out[i] = Math.max(-1, Math.min(1, sum / (b - a))) * 0x7fff;
    }
    // Half-duplex by default: while the assistant is speaking (and a moment after) the mic sends silence, so the assistant never "hears itself" through
    // the speakers and mistakes it for an interruption, which is what cut its words off mid-sentence. Silence (not a pause) keeps the stream continuous.
    if (!this.bargeIn && (this.playing.size > 0 || performance.now() < this.quietUntil)) out.fill(0);
    this.ws!.send(out.buffer);
  }

  // ---- server -> speakers
  private play(buf: ArrayBuffer) {
    const ctx = this.outCtx;
    if (!ctx || buf.byteLength < 2) return;
    const pcm = new Int16Array(buf.slice(0, buf.byteLength - (buf.byteLength % 2)));
    const audio = ctx.createBuffer(1, pcm.length, RECEIVE_RATE);
    const ch = audio.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i]! / 0x8000;
    const src = ctx.createBufferSource();
    src.buffer = audio; src.playbackRate.value = this.rate; src.connect(ctx.destination); // rate > 1 = a faster-talking assistant
    if (this.nextStart < ctx.currentTime + 0.02) this.nextStart = ctx.currentTime + 0.06; // first chunk, or we ran dry: build a small cushion so a late chunk can't leave a gap
    const startAt = this.nextStart;
    src.start(startAt);
    this.nextStart = startAt + audio.duration / this.rate;
    if (this.playing.size === 0) this.h.onSpeaking(true);
    this.playing.add(src);
    src.onended = () => { this.playing.delete(src); if (this.playing.size === 0) { this.quietUntil = performance.now() + 350; this.h.onSpeaking(false); } };
  }

  private stopPlayback() { // the caller talked over the assistant
    this.playing.forEach((s) => { s.onended = null; try { s.stop(); } catch { /* already ended */ } });
    this.playing.clear(); this.nextStart = 0;
    this.h.onSpeaking(false);
  }

  sendText(text: string) { if (this.connected) this.ws!.send(JSON.stringify({ type: "text", text })); }
  setMuted(muted: boolean) { this.muted = muted; this.stream?.getAudioTracks().forEach((t) => { t.enabled = !muted; }); }
  get isMuted() { return this.muted; }

  close() {
    this.closed = true;
    try { if (this.connected) this.ws!.send(JSON.stringify({ type: "end" })); this.ws?.close(); } catch { /* closing anyway */ }
    this.stopPlayback();
    this.node?.disconnect();
    void this.inCtx?.close(); void this.outCtx?.close();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ws = null; this.node = null; this.inCtx = null; this.outCtx = null; this.stream = null;
  }
}
