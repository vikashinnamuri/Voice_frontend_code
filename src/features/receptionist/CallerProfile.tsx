import { TypeBadge } from "../../components/Badges";
import type { CallSummary, CallType } from "../../types";
import { formatBool, formatGBP, formatMoveIn } from "../../utils/format";

interface Field { label: string; value: (c: CallSummary) => string | null }
const NAME: Field = { label: "Full name", value: (c) => c.caller_name };
const EMAIL: Field = { label: "Email address", value: (c) => c.caller_email };
const PHONE: Field = { label: "Contact number", value: (c) => c.caller_phone };
const ADDRESS: Field = { label: "Current address", value: (c) => c.current_address };

const FIELDS: Record<CallType, Field[]> = {
  LETTINGS_ENQUIRY: [NAME, EMAIL,
    { label: "Property of interest", value: (c) => c.property_interest }, { label: "Intended move-in", value: (c) => (c.move_in_date ? formatMoveIn(c.move_in_date) : null) },
    { label: "Residents", value: (c) => c.resident_count?.toString() ?? null }, { label: "Enquiry is for the caller", value: (c) => (c.enquiry_for_self == null ? null : formatBool(c.enquiry_for_self)) },
    { label: "Employment status", value: (c) => c.employment_status }, { label: "Annual income", value: (c) => (c.annual_income_gbp == null ? null : formatGBP(c.annual_income_gbp)) },
    { label: "Needs a UK guarantor", value: (c) => (c.needs_uk_guarantor == null ? null : formatBool(c.needs_uk_guarantor)) }, { label: "Viewing availability", value: (c) => c.viewing_availability }],
  MAINTENANCE_REQUEST: [NAME, EMAIL, ADDRESS, { label: "Property reference / name", value: (c) => c.property_interest }, PHONE, { label: "Issue", value: (c) => c.maintenance_issue }],
  SALES_LEAD: [NAME, EMAIL, ADDRESS, { label: "Property of interest", value: (c) => c.property_interest }, PHONE, { label: "Budget", value: (c) => (c.budget_gbp == null ? null : formatGBP(c.budget_gbp)) }],
};

export function CallerProfile({ call }: { call: CallSummary | null }) {
  const fields = call?.call_type ? FIELDS[call.call_type] : [NAME, EMAIL];
  return (
    <section className="card profile" aria-label="Caller profile">
      <div className="card-head"><h3>Caller profile</h3>{call?.call_type ? <TypeBadge type={call.call_type} /> : <span className="badge badge-grey">Identifying enquiry…</span>}</div>
      <dl className="details">
        {fields.map((f) => {
          const v = call ? f.value(call) : null;
          return <div key={f.label} className={v ? "filled" : ""}><dt>{f.label}</dt><dd>{v ?? <span className="muted">Waiting…</span>}</dd></div>;
        })}
      </dl>
    </section>
  );
}
