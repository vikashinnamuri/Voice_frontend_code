import { Link } from "react-router-dom";
import type { DashboardSummary } from "../../types";

export function StatCards({ s }: { s: DashboardSummary }) {
  const cards = [
    { label: "Total calls today", value: s.total_calls_today, tone: "navy", to: "/history" },
    { label: "Needs staff review", value: s.needs_staff_review, tone: "amber", to: "/review", hint: "Awaiting a team member" },
    { label: "Lettings enquiries", value: s.lettings_enquiries, tone: "blue", to: "/history?type=LETTINGS_ENQUIRY", hint: `Last ${s.period_days} days` },
    { label: "Maintenance requests", value: s.maintenance_requests, tone: "blue", to: "/history?type=MAINTENANCE_REQUEST", hint: `Last ${s.period_days} days` },
    { label: "Sales leads", value: s.sales_leads, tone: "blue", to: "/history?type=SALES_LEAD", hint: `Last ${s.period_days} days` },
  ];
  return (
    <ul className="stat-grid" aria-label="Key numbers">
      {cards.map((c) => (
        <li key={c.label}>
          <Link to={c.to} className={`stat stat-${c.tone}`}>
            <span className="stat-label">{c.label}</span>
            <span className="stat-value">{c.value}</span>
            <span className="stat-hint">{c.hint ?? " "}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
