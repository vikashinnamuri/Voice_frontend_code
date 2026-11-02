export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`logo${light ? " logo-light" : ""}`}>
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill={light ? "#fff" : "#0A1F3D"} /><path d="M7 15.5 16 8l9 7.5V25a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z" fill={light ? "#0A1F3D" : "#fff"} /><rect x="13" y="17" width="6" height="9" rx="1" fill="#2F6BDB" /></svg>
      <span className="logo-text">MyCitiPad<small>AI Receptionist</small></span>
    </span>
  );
}
