import { BarVisualizer, LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useRoomContext, useVoiceAssistant } from "@livekit/components-react";
import "@livekit/components-styles";
import { RoomEvent } from "livekit-client";
import { useEffect, useRef } from "react";
import type { LiveTurn } from "../../hooks/geminiLive";

export interface RoomHandlers {
  onTurn: (t: LiveTurn) => void;
  onHeard: (text: string) => void;
  onAgentState: (state: string) => void;
  onComplete: () => void;
  onConnection: (status: "connecting" | "connected" | "disconnected" | "error") => void;
  register: (api: { sendText: (text: string) => void; setMuted: (muted: boolean) => void } | null) => void;
}

const CAPTION: Record<string, string> = {
  disconnected: "Disconnected", connecting: "Connecting…", initializing: "Waiting for the receptionist to join…", listening: "Listening",
  thinking: "Thinking…", speaking: "Speaking", idle: "Ready",
};

/** Everything that needs the LiveKit room: the agent's audio, the bar visualiser, and the data-channel events from the agent. */
function RoomBridge({ h }: { h: RoomHandlers }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const { state, audioTrack } = useVoiceAssistant();
  const announced = useRef(false);

  useEffect(() => { h.onAgentState(state); }, [state, h]);

  // tell the agent we can hear it, so its opening line isn't spoken into the void
  useEffect(() => {
    if (audioTrack && !announced.current) {
      announced.current = true;
      void localParticipant.publishData(new TextEncoder().encode("1"), { reliable: true, topic: "client_ready" });
    }
  }, [audioTrack, localParticipant]);

  useEffect(() => {
    const onData = (payload: Uint8Array, _p: unknown, _k: unknown, topic?: string) => {
      let data: Record<string, unknown>;
      try { data = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (topic === "turn") h.onTurn(data as unknown as LiveTurn);
      else if (topic === "heard") h.onHeard(String(data.text ?? ""));
      else if (topic === "call_complete") h.onComplete();
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [room, h]);

  useEffect(() => {
    h.register({
      sendText: (text) => void localParticipant.publishData(new TextEncoder().encode(text), { reliable: true, topic: "text" }),
      setMuted: (muted) => void localParticipant.setMicrophoneEnabled(!muted),
    });
    return () => h.register(null);
  }, [localParticipant, h]);

  return (
    <div className={`lk-voice lk-voice-${state}`} role="status" aria-live="polite" aria-label={`Receptionist: ${CAPTION[state] ?? state}`}>
      <div className="lk-bars"><BarVisualizer state={state} trackRef={audioTrack} barCount={9} options={{ minHeight: 8, maxHeight: 100 }} /></div>
      <span className="orb-caption">{CAPTION[state] ?? state}</span>
    </div>
  );
}

/** Joins the LiveKit room with a server-issued token (the API secret never reaches the browser). Rendered only while a call is active. */
export function LiveKitSession({ token, url, handlers }: { token: string; url: string; handlers: RoomHandlers }) {
  return (
    <LiveKitRoom serverUrl={url} token={token} connect audio video={false}
      onConnected={() => handlers.onConnection("connected")} onDisconnected={() => handlers.onConnection("disconnected")} onError={() => handlers.onConnection("error")}>
      <RoomAudioRenderer />
      <RoomBridge h={handlers} />
    </LiveKitRoom>
  );
}
