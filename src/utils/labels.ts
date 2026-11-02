import type { CallStatus, CallType, ReviewStatus } from "../types";

export const CALL_TYPE_LABEL: Record<CallType, string> = {
  LETTINGS_ENQUIRY: "Lettings enquiry",
  MAINTENANCE_REQUEST: "Maintenance request",
  SALES_LEAD: "Sales lead",
};
export const CALL_TYPE_SHORT: Record<CallType, string> = { LETTINGS_ENQUIRY: "Lettings", MAINTENANCE_REQUEST: "Maintenance", SALES_LEAD: "Sales" };

export const STATUS_LABEL: Record<CallStatus, string> = {
  IN_PROGRESS: "In progress",
  NEEDS_STAFF_REVIEW: "Needs staff review",
  REVIEWED: "Reviewed",
  CONTACT_CALLER: "Contact caller",
  VIEWING_TO_ARRANGE: "Viewing to arrange",
  CLOSED: "Closed",
};

export type Tone = "amber" | "green" | "blue" | "grey" | "navy";
export const STATUS_TONE: Record<CallStatus, Tone> = {
  IN_PROGRESS: "blue", NEEDS_STAFF_REVIEW: "amber", REVIEWED: "green", CONTACT_CALLER: "blue", VIEWING_TO_ARRANGE: "blue", CLOSED: "grey",
};
export const TYPE_COLOUR: Record<CallType, string> = { LETTINGS_ENQUIRY: "#2F6BDB", MAINTENANCE_REQUEST: "#0A1F3D", SALES_LEAD: "#4AA3A0" };

export const REVIEW_ACTIONS: { status: ReviewStatus; label: string; hint: string }[] = [
  { status: "REVIEWED", label: "Reviewed", hint: "Staff have read the details" },
  { status: "CONTACT_CALLER", label: "Contact caller", hint: "Someone should ring or email the caller" },
  { status: "VIEWING_TO_ARRANGE", label: "Viewing to arrange", hint: "A viewing still needs to be arranged by staff" },
  { status: "CLOSED", label: "Closed", hint: "Nothing further to do" },
];

export const EVENT_ICON: Record<string, string> = {
  CALL_STARTED: "●", CLASSIFIED: "◆", DETAILS_COLLECTED: "✓", CALL_COMPLETED: "✓", CALL_ENDED_EARLY: "!", SENT_TO_REVIEW: "→",
  RECORDING_SAVED: "♪", TRANSCRIPT_SAVED: "≡", STAFF_REVIEW_UPDATED: "★",
};
