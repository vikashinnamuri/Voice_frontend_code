import type { DemoScript, TurnResponse, VoiceConfig, VoiceToken } from "../types";
import { request } from "./client";

export const getVoiceConfig = (): Promise<VoiceConfig> => request("/api/voice/config");
export const getDemoScripts = (): Promise<DemoScript[]> => request("/api/voice/demo-scripts");
export const createVoiceToken = (callId: string): Promise<VoiceToken> => request("/api/voice/token", { method: "POST", json: { call_id: callId } });
export const startConversation = (callId: string): Promise<TurnResponse> => request(`/api/voice/calls/${encodeURIComponent(callId)}/greeting`, { method: "POST" });
export const sendCallerTurn = (callId: string, text: string, confidence?: number): Promise<TurnResponse> =>
  request(`/api/voice/calls/${encodeURIComponent(callId)}/turn`, { method: "POST", json: { text, confidence } });
