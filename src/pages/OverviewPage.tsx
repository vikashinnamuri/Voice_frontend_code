import { Link } from "react-router-dom";
import { getSummary } from "../api/dashboard";
import { DemoBanner } from "../components/DemoBanner";
import { ErrorState, Skeleton } from "../components/States";
import { useAsync } from "../hooks/useAsync";
import { useCallDrawer } from "../hooks/useCallDrawer";
import { CallDetailDrawer } from "../features/call-history/CallDetailDrawer";
import { CallCard } from "../features/call-history/CallCard";
import { CategoryChart } from "../features/dashboard/CategoryChart";
import { StatCards } from "../features/dashboard/StatCards";
import { formatLongDateUK } from "../utils/format";

const STEPS = [
  { n: 1, title: "The assistant takes the call", text: "It asks one question at a time and collects the caller's details for lettings, maintenance or sales." },
  { n: 2, title: "Everything is saved", text: "The structured details, a full transcript and the audio recording are stored against the call." },
  { n: 3, title: "Staff review it", text: "Each call lands in the Needs staff review queue. A team member decides what happens next." },
  { n: 4, title: "Staff follow up", text: "For lettings enquiries, staff use the caller's own viewing availability to arrange a time themselves. Nothing is sent to the caller automatically." },
];

export function OverviewPage() {
  const { data, error, reload } = useAsync(getSummary, []);
  const drawer = useCallDrawer();
  return (
    <div className="page">
      <header className="page-head">
        <div><p className="eyebrow">{formatLongDateUK(new Date().toISOString())}</p><h1>Overview</h1></div>
      </header>
      <DemoBanner>Real calls only. Every call is saved with its transcript and sent to staff review; nothing is sent to callers automatically.</DemoBanner>

      {error && !data ? <ErrorState message={error} onRetry={reload} /> : !data ? <div className="card"><Skeleton lines={4} /></div> : (
        <>
          <StatCards s={data} />
          <div className="two-col">
            <section className="card"><div className="card-head"><h2>Calls by category</h2><span className="muted small">Last {data.period_days} days</span></div><CategoryChart s={data} /></section>
            <section className="card how"><div className="card-head"><h2>How it works</h2></div>
              <ol>{STEPS.map((s) => <li key={s.n}><span className="how-n">{s.n}</span><div><strong>{s.title}</strong><p>{s.text}</p></div></li>)}</ol>
            </section>
          </div>
          <section className="card">
            <div className="card-head"><h2>Recent calls</h2><Link to="/history" className="link">View all calls</Link></div>
            {data.recent_calls.length === 0 ? <p className="muted">No calls yet. Try the Live receptionist.</p> : <ul className="call-list">{data.recent_calls.map((c) => <CallCard key={c.public_id} call={c} onOpen={drawer.open} />)}</ul>}
          </section>
        </>
      )}
      <CallDetailDrawer publicId={drawer.openId} onClose={drawer.close} onChanged={reload} />
    </div>
  );
}
