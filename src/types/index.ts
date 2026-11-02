// Mirrors the FastAPI Pydantic schemas (backend/schemas/*.py).
export type CallType = "LETTINGS_ENQUIRY" | "MAINTENANCE_REQUEST" | "SALES_LEAD";
export type CallStatus = "IN_PROGRESS" | "NEEDS_STAFF_REVIEW" | "REVIEWED" | "CONTACT_CALLER" | "VIEWING_TO_ARRANGE" | "CLOSED";
export type ReviewStatus = Exclude<CallStatus, "IN_PROGRESS">;
export type Speaker = "assistant" | "caller";

export interface CallSummary {
  public_id: string;
  caller_name: string | null;
  caller_email: string | null;
  caller_phone: string | null;
  current_address: string | null;
  property_interest: string | null;
  call_type: CallType | null;
  status: CallStatus;
  move_in_date: string | null;
  resident_count: number | null;
  enquiry_for_self: boolean | null;
  employment_status: string | null;
  annual_income_gbp: number | null;
  needs_uk_guarantor: boolean | null;
  viewing_availability: string | null;
  maintenance_issue: string | null;
  budget_gbp: number | null;
  requirement_notes: string | null;
  duration_seconds: number | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  intent_area: string | null;
  current_step: string | null;
  is_complete: boolean;
  is_simulated: boolean;
  is_demo_data: boolean;
  description: string;
  has_recording: boolean;
  has_transcript: boolean;
  turn_count: number;
}

export interface TranscriptTurn { id: number; speaker: Speaker; message: string; timestamp: string; confidence: number | null }
export interface Recording {
  id: string;
  filename: string;
  mime_type: string;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  status: "AVAILABLE" | "PROCESSING" | "FAILED";
  source: "demo_placeholder" | "browser_capture" | "livekit_egress";
  created_at: string;
  playback_url: string | null;
  is_placeholder: boolean;
}
export interface StaffReview { id: number; status: ReviewStatus; staff_note: string | null; reviewed_by: string | null; reviewed_at: string | null; created_at: string }
export interface CallEvent { id: number; event_type: string; label: string; timestamp: string }

export interface CallDetail extends CallSummary {
  discarded?: boolean;
  transcript: TranscriptTurn[];
  recordings: Recording[];
  reviews: StaffReview[];
  events: CallEvent[];
}

export interface CallList { items: CallSummary[]; total: number; page: number; page_size: number; total_pages: number }

export interface DashboardSummary {
  demo_mode: boolean;
  period_days: number;
  total_calls_today: number;
  needs_staff_review: number;
  lettings_enquiries: number;
  maintenance_requests: number;
  sales_leads: number;
  by_category: { call_type: CallType; label: string; count: number }[];
  status_counts: Record<string, number>;
  recent_calls: CallSummary[];
}

export interface TurnResponse {
  reply: string;
  step: string;
  step_label: string;
  complete: boolean;
  end_call: boolean;
  progress: { collected: number; total: number };
  call: CallSummary;
}

export interface VoiceConfig {
  voice_mode: "livekit" | "simulated";
  livekit_configured: boolean;
  llm_mode: "mock" | "gemini" | "anthropic" | "openai";
  gemini_live_model: string | null;
  gemini_live_ready: boolean;
  gemini_voice: string | null;
  voice_transport: "livekit" | "direct" | "browser";
  live_playback_rate: number;
  live_barge_in: boolean;
  environment: string;
  is_development: boolean;
  demo_mode: boolean;
}
export interface VoiceToken { mode: "livekit" | "simulated"; room: string; identity: string; token: string | null; url: string | null; notice: string }
export interface DemoScript { id: string; title: string; description: string; call_type: CallType; caller_lines: string[] }
export interface SeedResult { calls_created: number; recordings_created: number; message: string }

export interface CallFilters {
  search?: string;
  call_type?: CallType | "";
  status?: CallStatus | "";
  date_from?: string;
  date_to?: string;
  has_recording?: "" | "true" | "false";
  sort?: "started_at" | "duration_seconds" | "caller_name" | "status" | "call_type";
  order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}
