import type { ReactNode } from "react";

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      {hint && <p>{hint}</p>}
    </div>
  );
}
