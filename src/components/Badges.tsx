import type { CallStatus, CallType } from "../types";
import { CALL_TYPE_LABEL, STATUS_LABEL, STATUS_TONE, type Tone } from "../utils/labels";

export const Badge = ({ tone, children, title }: { tone: Tone; children: React.ReactNode; title?: string }) => <span className={`badge badge-${tone}`} title={title}>{children}</span>;

export const StatusBadge = ({ status }: { status: CallStatus }) => <Badge tone={STATUS_TONE[status]}>{status === "NEEDS_STAFF_REVIEW" && <span className="dot" aria-hidden="true" />}{STATUS_LABEL[status]}</Badge>;

export const TypeBadge = ({ type }: { type: CallType | null }) => (type ? <Badge tone="navy">{CALL_TYPE_LABEL[type]}</Badge> : <Badge tone="grey">Unclassified</Badge>);
