import { useState } from "react";
import { apiUrl } from "../api/client";
import type { Recording } from "../types";
import { formatBytes, formatDuration } from "../utils/format";
import { Badge } from "./Badges";
import { IconAudio } from "./Icons";

const SOURCE_LABEL: Record<Recording["source"], string> = { demo_placeholder: "Placeholder audio", browser_capture: "Browser recording (caller's microphone)", livekit_egress: "LiveKit Egress recording" };

export function AudioPlayer({ recording }: { recording: Recording }) {
  const [failed, setFailed] = useState(false);
  const url = recording.playback_url ? apiUrl(recording.playback_url) : null;
  const ready = recording.status === "AVAILABLE" && url && !failed;

  return (
    <div className="recording">
      <div className="recording-head">
        <IconAudio width={18} height={18} />
        <strong>{recording.filename}</strong>
        <Badge tone={recording.status === "AVAILABLE" ? "green" : recording.status === "PROCESSING" ? "amber" : "grey"}>{recording.status.toLowerCase()}</Badge>
      </div>
      {ready ? <audio controls preload="metadata" src={url} onError={() => setFailed(true)} aria-label={`Recording ${recording.filename}`} /> : (
        <p className="muted small" role="status">{recording.status === "PROCESSING" ? "This recording is still being processed." : "This recording can't be played right now."}</p>
      )}
      <p className="muted small">
        {SOURCE_LABEL[recording.source]} · {formatDuration(recording.duration_seconds)} · {formatBytes(recording.file_size_bytes)}
        {ready && <> · <a href={`${url}${url!.includes("?") ? "&" : "?"}download=true`}>Download</a></>}
      </p>
      {recording.is_placeholder && <p className="note">Synthetic tones generated locally so the player can be demonstrated. This is not audio from a real call.</p>}
    </div>
  );
}
