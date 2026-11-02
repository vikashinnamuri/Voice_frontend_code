import type { DashboardSummary, SeedResult } from "../types";
import { request } from "./client";

export const getSummary = (): Promise<DashboardSummary> => request("/api/dashboard/summary");
export const resetDemoData = (): Promise<SeedResult> => request("/api/dev/reset", { method: "POST" });
