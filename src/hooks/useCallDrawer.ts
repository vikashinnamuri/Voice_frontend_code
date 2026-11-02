import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/** The open call lives in the URL (?call=MCP-XXXXXX) so a record can be linked to and the back button closes it. */
export function useCallDrawer() {
  const [params, setParams] = useSearchParams();
  const open = useCallback((id: string) => setParams((p) => { const n = new URLSearchParams(p); n.set("call", id); return n; }), [setParams]);
  const close = useCallback(() => setParams((p) => { const n = new URLSearchParams(p); n.delete("call"); return n; }, { replace: true }), [setParams]);
  return { openId: params.get("call"), open, close };
}
