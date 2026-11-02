import { getVoiceConfig } from "../api/voice";
import { ErrorState } from "../components/States";
import { useAsync } from "../hooks/useAsync";
import { ReceptionistPanel } from "../features/receptionist/ReceptionistPanel";

export function LivePage() {
  const { data, error, reload } = useAsync(getVoiceConfig, []);
  return (
    <div className="page">
      <header className="page-head">
        <div><p className="eyebrow">Voice assistant</p><h1>Live receptionist</h1></div>
      </header>
      {error && !data ? <ErrorState message={error} onRetry={reload} /> : <ReceptionistPanel config={data} />}
    </div>
  );
}
