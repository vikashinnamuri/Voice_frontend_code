import { Route, Routes, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HistoryPage } from "./pages/HistoryPage";
import { LivePage } from "./pages/LivePage";
import { OverviewPage } from "./pages/OverviewPage";
import { ReviewQueuePage } from "./pages/ReviewQueuePage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OverviewPage />} />
        <Route path="live" element={<LivePage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="review" element={<ReviewQueuePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
