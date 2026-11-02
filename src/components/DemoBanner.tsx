import { IconInfo } from "./Icons";

export function DemoBanner({ children }: { children?: React.ReactNode }) {
  return (
    <div className="demo-banner" role="note">
      <IconInfo width={18} height={18} />
      <span>{children ?? "Nothing here is sent to callers: staff actions only update this system."}</span>
    </div>
  );
}
