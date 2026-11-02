import type { DashboardSummary } from "../../types";
import { TYPE_COLOUR } from "../../utils/labels";

/** Simple donut + legend. Plain SVG: no chart library needed. */
export function CategoryChart({ s }: { s: DashboardSummary }) {
  const total = s.by_category.reduce((n, c) => n + c.count, 0);
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="chart">
      <figure className="donut" aria-label={`Calls by category, last ${s.period_days} days`}>
        <svg viewBox="0 0 140 140" role="img" aria-label={s.by_category.map((c) => `${c.label}: ${c.count}`).join(", ")}>
          <circle cx="70" cy="70" r={R} fill="none" stroke="#E8EDF5" strokeWidth="18" />
          {total > 0 && s.by_category.map((c) => {
            const len = (c.count / total) * C;
            const el = <circle key={c.call_type} cx="70" cy="70" r={R} fill="none" stroke={TYPE_COLOUR[c.call_type]} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />;
            offset += len;
            return el;
          })}
          <text x="70" y="68" textAnchor="middle" className="donut-num">{total}</text>
          <text x="70" y="86" textAnchor="middle" className="donut-cap">calls</text>
        </svg>
      </figure>
      <ul className="legend">
        {s.by_category.map((c) => (
          <li key={c.call_type}>
            <span className="legend-row"><i style={{ background: TYPE_COLOUR[c.call_type] }} aria-hidden="true" />{c.label}<strong>{c.count}</strong></span>
            <span className="bar" aria-hidden="true"><span style={{ width: `${total ? (c.count / total) * 100 : 0}%`, background: TYPE_COLOUR[c.call_type] }} /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
