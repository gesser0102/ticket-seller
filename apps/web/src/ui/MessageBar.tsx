export function MessageBar({ tone, children }: { tone: "danger" | "success"; children: React.ReactNode }) {
  return (
    <div className={`message-bar message-bar-${tone}`} role="alert">
      {children}
    </div>
  );
}
