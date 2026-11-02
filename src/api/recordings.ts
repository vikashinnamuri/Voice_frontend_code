import type { Recording } from "../types";
import { request } from "./client";

/** Demo only: uploads audio captured in the caller's browser. Production recording belongs in a server-side LiveKit Egress workflow. */
export function uploadBrowserRecording(callId: string, blob: Blob, durationSeconds: number): Promise<Recording> {
  const form = new FormData();
  const extension = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm";
  form.append("file", blob, `browser-capture.${extension}`);
  form.append("duration_seconds", String(Math.round(durationSeconds * 10) / 10));
  return request(`/api/calls/${encodeURIComponent(callId)}/recordings/upload`, { method: "POST", body: form });
}
