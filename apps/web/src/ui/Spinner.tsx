import "./spinner.css";

export function Spinner({
  label = "Carregando…",
  variant = "page",
}: {
  label?: string;
  variant?: "page" | "inline";
}) {
  return (
    <div role="status" className={`spinner spinner-${variant}`}>
      <span className="spinner-ring-wrap">
        <span className="spinner-glow" aria-hidden="true" />
        <svg className="spinner-ring" width="100%" height="100%" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="8" stroke="var(--color-border)" strokeWidth="2.5" />
          <path d="M18 10a8 8 0 0 0-8-8" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </span>
      <span className="spinner-label">{label}</span>
    </div>
  );
}
