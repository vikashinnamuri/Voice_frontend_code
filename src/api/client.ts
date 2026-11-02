// One small fetch wrapper: JSON in/out, and readable errors for every failure (network, validation, server).
// The hosted backend. Override with VITE_API_BASE_URL (set it to an empty value to use the same origin / the Vite dev proxy).
const HOSTED_API = "https://voice-agent-backend-245l.onrender.com";
const BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? HOSTED_API).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

/** Turn a FastAPI error body (string detail, or a list of validation errors) into one friendly sentence. */
function messageFrom(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: (string | number)[]; msg?: string }) => `${(d.loc ?? []).filter((p) => p !== "body" && p !== "query").join(".")}: ${d.msg ?? "invalid"}`)
      .join("; ");
  }
  return status >= 500 ? "The server hit a problem. Please try again." : `Request failed (${status}).`;
}

export const apiUrl = (path: string): string => (/^https?:\/\//.test(path) ? path : `${BASE}${path}`);

export async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...rest,
      headers: { Accept: "application/json", ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError("Can't reach the server. Is the backend running on port 8020?", 0);
  }
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(messageFrom(body, response.status), response.status);
  return body as T;
}

export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : "Something went wrong.");
