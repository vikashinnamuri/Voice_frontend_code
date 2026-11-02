import type { CallDetail, CallFilters, CallList, ReviewStatus } from "../types";
import { request } from "./client";

export function listCalls(filters: CallFilters): Promise<CallList> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) params.set(key, String(value));
  });
  return request(`/api/calls?${params}`);
}
export const getCall = (id: string): Promise<CallDetail> => request(`/api/calls/${encodeURIComponent(id)}`);
export const createCall = (isSimulated: boolean): Promise<CallDetail> => request("/api/calls", { method: "POST", json: { is_simulated: isSimulated } });
export const finishCall = (id: string, durationSeconds?: number): Promise<CallDetail> =>
  request(`/api/calls/${encodeURIComponent(id)}/finish`, { method: "POST", json: durationSeconds !== undefined ? { duration_seconds: durationSeconds } : {} });
export const updateReview = (id: string, status: ReviewStatus, staffNote: string, reviewedBy: string): Promise<CallDetail> =>
  request(`/api/calls/${encodeURIComponent(id)}/review`, { method: "PUT", json: { status, staff_note: staffNote.trim() || null, reviewed_by: reviewedBy.trim() || null } });
