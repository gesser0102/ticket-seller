export function Spinner({ label = "Carregando…" }: { label?: string }) {
  return (
    <div role="status" style={{ display: "flex", alignItems: "center", gap: 12, padding: 32, color: "var(--color-text-muted)" }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="8" stroke="var(--color-border)" strokeWidth="2.5" />
        <path d="M18 10a8 8 0 0 0-8-8" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 10 10"
            to="360 10 10"
            dur="0.8s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
      <span>{label}</span>
    </div>
  );
}
